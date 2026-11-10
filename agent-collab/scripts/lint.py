#!/usr/bin/env python3
"""MALP（malp/v1）任务清单与交付物校验器 + 回执/归档/答复/回收代落工具 + 全局视图。

用法：
  lint.py [TASKS.md 路径] [result.md 路径]              校验（缺省向上查找 agent-collab/TASKS.md）
  lint.py ack <条目号> 'ACK(done): 说明' --as <名字>    代落 ACK 回执（自动补署名；--tasks 可指定路径）
  lint.py claim <条目号> --as <名字>                    代落 CLAIM 认领（校验依赖已归档）
  lint.py archive <条目号>                              终态归档（ARCHIVE.md + 移除条目 + malp-archive commit）
  lint.py status [--stale-after 秒]                     全局视图（CLAIM 时效/stale 判定/信箱/归档汇总）
  lint.py answer <条目号> <SEQ> "答复" --as <名> [--role 监督|operator]
                                                        受控代落问询答复（带签名，防伪造）
  lint.py reclaim <条目号> --as <新名> --by 监督(x)     作废旧 CLAIM 并留痕 + 落新 CLAIM（监督/operator 专属）

校验规则（行号级报错，退出码 0 通过 / 1 违规 / 2 用法或自检失败）：
  - 文件头含 malp/v1；存在「## 进行中」区
  - 条目编号唯一且递增；头部必含 派单（监督(x)/operator(名字)）/ 任务书 / 验收
  - 监督派单必含预算档 S/M/L；operator 直派可省（缺省 S）但必含「复验」承担者
  - 可选字段：- 优先级: P0-P3（缺省 P2）；- 依赖: #N[, #M]（必须指向更小编号）；- 里程碑: M<N>（架构师编排分组）
  - CLAIM 一条目至多一行；有 ACK 必有 CLAIM；「作废CLAIM」行须带监督/operator 署名留痕
  - ACK 定式：ACK(done|wontdo|blocked): 非空说明 —— 署名；blocked 说明必含「解除条件」
  - 审查结论(通过|打回|接受wontdo) 为终态：落有终态结论的条目不得残留进行中区（必须归档）
  - result.md 六字段：slug/outcome(done|wontdo|blocked)/updated_unix/turn/verified 三级/protocol=malp/v1
并发安全（issue #2）：claim/ack/archive/reclaim 的「读-改-写-复验」整段在 TASKS.md.lock（flock）
  临界区内执行；临时文件进程唯一（TASKS.md.tmp.<pid>）。无 fcntl 平台退化并警告。
启动自检：TASKS.md 为软链时校验目标存在；当前目录位于 worktree 内而 TASKS.md 为实体文件时报「疑似私建副本」。
"""
import argparse
import contextlib
import os
import re
import subprocess
import sys
import time

try:
    import fcntl
except ImportError:  # 平台无 flock（如 Windows 原生）——写路径退化为无锁并警告
    fcntl = None

PROTOCOL = "malp/v1"
ENTRY_RE = re.compile(r"^### (\d+)\. (.+)$")
SECTION_RE = re.compile(r"^## .+$")
DISPATCH_RE = re.compile(r"^- 派单: (监督|operator)\([\w .-]+\)( .*)?$")
BUDGET_RE = re.compile(r"^- 预算档: ([SML])$")
BRIEF_RE = re.compile(r"^- 任务书: .+")
ACCEPT_RE = re.compile(r"^- 验收: .+")
REVIEWER_RE = re.compile(r"^- 复验: (operator 自担|监督\([\w .-]+\))$")
CLAIM_RE = re.compile(r"^CLAIM\(执行\([\w .-]+\)\): \d+$")
ACK_RE = re.compile(r"^ACK\((done|wontdo|blocked)\): .+ —— (监督|执行|operator)\([\w .-]+\)( [\d:TZ+-]+)?$")
VERDICT_RE = re.compile(r"^审查结论\((通过|打回|接受wontdo)\): .+ —— (监督|执行|operator)\([\w .-]+\)( [\d:TZ+-]+)?$")
PRIORITY_RE = re.compile(r"^- 优先级: (P0|P1|P2|P3)$")
DEPS_RE = re.compile(r"^- 依赖: (#\d+)(, ?#\d+)*$")
MILESTONE_RE = re.compile(r"^- 里程碑: M([1-9]\d*)$")
RECLAIM_RE = re.compile(r"^作废CLAIM\(执行\([\w .-]+\)\): \d+ —— (监督|operator)\([\w .-]+\)( \d+)?$")
ANSWER_SIGNATURE_RE = re.compile(r"^答复\((监督|operator)\([\w .-]+\)\): .+ —— (监督|operator)\([\w .-]+\)", re.M)
DEFAULT_STALE_AFTER = 4 * 3600  # CLAIM 租约缺省 4 小时（--stale-after 可调）
RESULT_FIELDS = {
    "slug": re.compile(r"^.+$"),
    "outcome": re.compile(r"^(done|wontdo|blocked)$"),
    "updated_unix": re.compile(r"^\d+$"),
    "turn": re.compile(r"^\d+$"),
    "verified": re.compile(r"^(verified|partially-verified|unverified)$"),
    "protocol": re.compile(r"^malp/v1$"),
}


def die(msg, code=2):
    print(f"[lint] {msg}", file=sys.stderr)
    sys.exit(code)


@contextlib.contextmanager
def tasks_lock(tasks_path):
    """写路径互斥：flock 保护「读-改-写-复验」临界区，防并发丢失更新（issue #2）。

    锁文件 TASKS.md.lock 为 agent-collab/ 运行态（被反向 ignore 忽略）。
    无 fcntl 平台退化为无锁并警告——协议假定单机 unix 环境。"""
    lock_path = tasks_path + ".lock"
    fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o644)
    try:
        if fcntl is not None:
            fcntl.flock(fd, fcntl.LOCK_EX)
        else:
            print("[lint] 警告：当前平台无 fcntl，本次写入未加互斥锁——并发 agent 场景请用 unix 环境或串行执行",
                  file=sys.stderr)
        yield
    finally:
        if fcntl is not None:
            fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def find_tasks_path(explicit=None):
    """显式路径优先；否则从 cwd 向上查找 agent-collab/TASKS.md。"""
    if explicit:
        if not os.path.exists(explicit):
            die(f"文件不存在：{explicit}")
        return os.path.abspath(explicit)
    d = os.getcwd()
    while True:
        cand = os.path.join(d, "agent-collab", "TASKS.md")
        if os.path.exists(cand):
            return cand
        parent = os.path.dirname(d)
        if parent == d:
            die("自检失败：从当前目录向上未找到 agent-collab/TASKS.md（请在协议项目内运行或显式传路径）")
        d = parent


def in_worktree():
    """当前目录向上遇到 .git 为文件（非目录）即认为在 git worktree 内。"""
    d = os.getcwd()
    while True:
        g = os.path.join(d, ".git")
        if os.path.isfile(g):
            return True
        if os.path.isdir(g):
            return False
        parent = os.path.dirname(d)
        if parent == d:
            return False
        d = parent


def self_check(path):
    if os.path.islink(path) and not os.path.exists(path):
        die(f"自检失败：{path} 为断裂软链（目标不存在）——先修软链或经 worktree.sh enter 重建")
    if in_worktree() and not os.path.islink(path):
        die(f"自检失败：当前位于 worktree 内而 {path} 为实体文件——疑似私建副本。"
            "运行态五件套必须经 agent-collab/ 软链访问主树唯一清单（R4），请删除副本改用软链")


def parse_entries(text):
    """解析「## 进行中」区内的条目。返回 [(num, start_line, block_lines)]，行号 1 基。"""
    lines = text.splitlines()
    entries, section_start = [], None
    for i, ln in enumerate(lines):
        if ln.strip() == "## 进行中":
            section_start = i
            break
    if section_start is None:
        return None
    cur = None
    for i in range(section_start + 1, len(lines)):
        ln = lines[i]
        m = ENTRY_RE.match(ln)
        if m:
            cur = {"num": int(m.group(1)), "start": i, "lines": []}
            entries.append(cur)
        elif SECTION_RE.match(ln):
            cur = None
        elif cur is not None:
            cur["lines"].append((i + 1, ln))
    return entries


def validate_tasks(text):
    v = []
    if PROTOCOL not in text:
        v.append((0, f"文件头缺少协议版本标识 {PROTOCOL}"))
    entries = parse_entries(text)
    if entries is None:
        v.append((0, "缺少「## 进行中」区"))
        return v
    prev = 0
    for e in entries:
        n = e["num"]
        if n <= prev:
            v.append((e["start"] + 1, f"条目 #{n} 编号未递增（前一编号 #{prev}）"))
        prev = max(prev, n)
        headers = [ln for _, ln in e["lines"] if ln.startswith("- ")]
        dispatch = [ln for ln in headers if ln.startswith("- 派单:")]
        if not dispatch:
            v.append((e["start"] + 1, f"条目 #{n} 缺少「- 派单:」行"))
        elif not DISPATCH_RE.match(dispatch[0]):
            v.append((e["start"] + 2, f"条目 #{n} 派单署名非法（应为 监督(x)/operator(名字)）：{dispatch[0]}"))
        else:
            by_op = dispatch[0].startswith("- 派单: operator(")
            budgets = [ln for ln in headers if ln.startswith("- 预算档:")]
            if by_op:
                if budgets and not BUDGET_RE.match(budgets[0]):
                    v.append((e["start"] + 2, f"条目 #{n} 预算档取值非法（S/M/L）：{budgets[0]}"))
                if not any(REVIEWER_RE.match(ln) for ln in headers):
                    v.append((e["start"] + 2, f"条目 #{n} operator 直派缺「- 复验:」承担者（operator 自担 / 监督(x)）"))
            else:
                if not budgets:
                    v.append((e["start"] + 2, f"条目 #{n} 监督派单缺「- 预算档:」（S/M/L）"))
                elif not BUDGET_RE.match(budgets[0]):
                    v.append((e["start"] + 2, f"条目 #{n} 预算档取值非法（S/M/L）：{budgets[0]}"))
        if not any(BRIEF_RE.match(ln) for ln in headers):
            v.append((e["start"] + 2, f"条目 #{n} 缺「- 任务书:」"))
        if not any(ACCEPT_RE.match(ln) for ln in headers):
            v.append((e["start"] + 2, f"条目 #{n} 缺「- 验收:」断言"))
        priorities = [ln for ln in headers if ln.startswith("- 优先级:")]
        if priorities and not PRIORITY_RE.match(priorities[0]):
            v.append((e["start"] + 2, f"条目 #{n} 优先级取值非法（P0/P1/P2/P3，缺省 P2）：{priorities[0]}"))
        deps = [ln for ln in headers if ln.startswith("- 依赖:")]
        if deps:
            if not DEPS_RE.match(deps[0]):
                v.append((e["start"] + 2, f"条目 #{n} 依赖语法非法（- 依赖: #N[, #M]，须指向更小编号）：{deps[0]}"))
            else:
                for dep in re.findall(r"#(\d+)", deps[0]):
                    if int(dep) >= n:
                        v.append((e["start"] + 2,
                                  f"条目 #{n} 依赖 #{dep} 非法——依赖必须指向更小编号（编号递增特性天然防环）"))
        milestones = [ln for ln in headers if ln.startswith("- 里程碑:")]
        if milestones and not MILESTONE_RE.match(milestones[0]):
            v.append((e["start"] + 2, f"条目 #{n} 里程碑语法非法（- 里程碑: M<N>，N 为正整数）：{milestones[0]}"))
        claims = [(no, ln) for no, ln in e["lines"] if ln.startswith("CLAIM(")]
        acks = [(no, ln) for no, ln in e["lines"] if ln.startswith("ACK(")]
        verdicts = [(no, ln) for no, ln in e["lines"] if ln.startswith("审查结论(")]
        if len(claims) > 1:
            v.append((claims[1][0], f"条目 #{n} 存在多个 CLAIM（换人须由监督作废旧 CLAIM 并留痕）"))
        for no, ln in claims:
            if not CLAIM_RE.match(ln):
                v.append((no, f"条目 #{n} CLAIM 语法非法（CLAIM(执行(名字)): unix）：{ln}"))
        for no, ln in acks:
            m = ACK_RE.match(ln)
            if not m:
                v.append((no, f"条目 #{n} ACK 语法非法（ACK(done|wontdo|blocked): 说明 —— 署名）：{ln}"))
            elif m.group(1) == "blocked" and "解除条件" not in ln:
                v.append((no, f"条目 #{n} ACK(blocked) 说明缺少「解除条件」"))
        if acks and not claims:
            v.append((acks[0][0], f"条目 #{n} 有 ACK 但无 CLAIM（先认领再动手，R8）"))
        for no, ln in verdicts:
            if not VERDICT_RE.match(ln):
                v.append((no, f"条目 #{n} 审查结论语法非法（审查结论(通过|打回|接受wontdo): 说明 —— 署名）：{ln}"))
            else:
                v.append((no, f"条目 #{n} 已落终态审查结论，必须归档（lint.py archive {n}），不得残留进行中区"))
        voids = [(no, ln) for no, ln in e["lines"] if ln.startswith("作废CLAIM(")]
        for no, ln in voids:
            if not RECLAIM_RE.match(ln):
                v.append((no, f"条目 #{n} 作废CLAIM 留痕语法非法（作废CLAIM(执行(名)): 原unix —— 监督/operator(x) [unix]）：{ln}"))
    for no, ln in _stray_receipts(text):
        v.append((no, f"游离回执行（不属于任何条目或格式非法）：{ln}"))
    return v


def _stray_receipts(text):
    """游离回执行：顶格以回执定式开头、但不属于任何条目的行（缩进行如注释示例不算）。"""
    lines = text.splitlines()
    entries = parse_entries(text)
    owned = set()
    for e in entries or []:
        for no, ln in e["lines"]:
            owned.add(no)
    out = []
    for i, ln in enumerate(lines, 1):
        if ln.startswith(("ACK(", "CLAIM(", "审查结论(")) and i not in owned:
            out.append((i, ln))
    return out


def validate_result(text):
    v = []
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return [(0, "缺少 YAML frontmatter")]
    meta = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*(?:#.*)?$", line)
        if kv:
            meta[kv.group(1)] = kv.group(2)
    for field, pat in RESULT_FIELDS.items():
        if field not in meta:
            v.append((0, f"缺字段 {field}"))
        elif not pat.match(meta[field]):
            v.append((0, f"字段 {field} 取值非法：{meta[field]}"))
    return v


def run_validators(tasks_path, result_path):
    violations = []
    tasks_label = os.path.basename(tasks_path)
    text = open(tasks_path, encoding="utf-8").read()
    violations += [(tasks_label, no, msg) for no, msg in validate_tasks(text)]
    if result_path:
        result_label = os.path.basename(result_path)
        violations += [(result_label, no, msg)
                       for no, msg in validate_result(open(result_path, encoding="utf-8").read())]
    if violations:
        for label, no, msg in violations:
            loc = f"{label} 第 {no} 行：" if no else f"{label}："
            print(f"[违规] {loc}{msg}")
        print(f"[lint] 未通过：{len(violations)} 项违规")
        sys.exit(1)
    print("[lint] 通过：0 项违规")


def _atomic_write(path, lines):
    tmp = f"{path}.tmp.{os.getpid()}"  # 进程唯一：并发进程互不消费对方临时文件（issue #2）
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        os.replace(tmp, path)
    except OSError as e:
        die(f"写 {os.path.basename(path)} 失败（{e}）——请重试；反复失败请检查磁盘与权限")
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def _entry_block(lines, num):
    """返回 (start_idx, end_idx)（0 基，含头含尾）与条目文本行。end 为插入点（该条目最后一行之后）。"""
    start = None
    for i, ln in enumerate(lines):
        m = ENTRY_RE.match(ln)
        if m:
            if start is not None:
                return start, i
            if int(m.group(1)) == num:
                start = i
    if start is not None:
        return start, len(lines)
    return None, None


def _archived_nums(tasks_path):
    """ARCHIVE.md 中已归档条目编号集合（依赖满足判定用，issue #6）。"""
    archive = os.path.join(os.path.dirname(os.path.abspath(tasks_path)), "ARCHIVE.md")
    nums = set()
    if os.path.exists(archive):
        for ln in open(archive, encoding="utf-8"):
            m = ENTRY_RE.match(ln)
            if m:
                nums.add(int(m.group(1)))
    return nums


def _notify_beats(path):
    """NOTIFY.md 中每个执行名字的最后心跳/上岗 unix——stale 判定用（issue #3）。"""
    beats = {}
    if os.path.exists(path):
        for ln in open(path, encoding="utf-8"):
            m = re.match(r"^执行\(([\w .-]+)\) (?:上岗|心跳) (\d+)", ln)
            if m:
                beats[m.group(1)] = max(beats.get(m.group(1), 0), int(m.group(2)))
    return beats


def _owner_registered(collab, name):
    """OWNERS.md 是否登记了主审(name)（issue #5：answer 监督答复的主审绑定）。"""
    owners = os.path.join(collab, "OWNERS.md")
    if not os.path.exists(owners):
        return False
    return any(re.match(rf"^主审\({re.escape(name)}\):", ln) for ln in open(owners, encoding="utf-8"))


def insert_receipt(tasks_path, num, line):
    """受控单行插入：仅在条目块末尾插入一行回执，其余字节不动，写后复验。"""
    lines = open(tasks_path, encoding="utf-8").read().splitlines()
    start, end = _entry_block(lines, num)
    if start is None:
        die(f"条目 #{num} 不在进行中区（lint.py 校验查看现有条目）")
    lines.insert(end, line)
    _atomic_write(tasks_path, lines)


def cmd_ack(args):
    body = args.ack_line.strip()
    m = re.match(r"^ACK\((done|wontdo|blocked)\): (.+)$", body)
    if not m or not m.group(2).strip():
        die("ACK 定式非法，应为：ACK(done|wontdo|blocked): 非空说明（署名自动追加）")
    if m.group(1) == "blocked" and "解除条件" not in body:
        die("ACK(blocked) 说明必须包含「解除条件」")
    line = f"{body} —— 执行({args.as_name})"
    insert_receipt(args.tasks, args.entry, line)
    print(f"[ack] 已落回执（条目 #{args.entry}）：{line}")
    run_validators(args.tasks, None)


def cmd_claim(args):
    text = open(args.tasks, encoding="utf-8").read()
    archived = _archived_nums(args.tasks)
    for e in parse_entries(text) or []:
        if e["num"] != args.entry:
            continue
        deps = [ln for _, ln in e["lines"] if ln.startswith("- 依赖:")]
        if deps:
            unsat = [int(x) for x in re.findall(r"#(\d+)", deps[0]) if int(x) not in archived]
            if unsat:
                die(f"条目 #{args.entry} 依赖未满足：#{'、#'.join(str(d) for d in unsat)} 尚未归档——"
                    "R8 取任务规则：先完成依赖条目（status 查看依赖状态）")
        valid = [ln for _, ln in e["lines"] if CLAIM_RE.match(ln)]
        illegal = [ln for _, ln in e["lines"] if ln.startswith("CLAIM(") and not CLAIM_RE.match(ln)]
        if valid:
            die(f"条目 #{args.entry} 已有 CLAIM（一时刻一条目一生效；换人由监督 reclaim 作废旧 CLAIM 并留痕）")
        if illegal:
            die(f"条目 #{args.entry} 存在语法非法的 CLAIM 行（{illegal[0]}）——"
                "占位判定只认合法定式，请监督 agent 按 R9 清理该行后重试 claim")
    line = f"CLAIM(执行({args.as_name})): {int(time.time())}"
    insert_receipt(args.tasks, args.entry, line)
    print(f"[claim] 已认领（条目 #{args.entry}）：{line}")
    run_validators(args.tasks, None)


def cmd_archive(args):
    tasks = args.tasks
    text = open(tasks, encoding="utf-8").read()
    lines = text.splitlines()
    start, end = _entry_block(lines, args.entry)
    if start is None:
        die(f"条目 #{args.entry} 不在进行中区")
    block = lines[start:end]
    if not any(VERDICT_RE.match(ln) for ln in block):
        die(f"条目 #{args.entry} 未落终态审查结论（通过/打回/接受wontdo），拒绝归档——先复验落结论")
    collab = os.path.dirname(os.path.abspath(tasks))
    archive = os.path.join(collab, "ARCHIVE.md")
    if not os.path.exists(archive):
        die(f"未找到 {archive}（init 应铺设；缺文件请从 skill 模板补建后再归档）")
    with open(archive, "a", encoding="utf-8") as f:
        f.write("\n" + "\n".join(block) + "\n")
    del lines[start:end]
    _atomic_write(tasks, lines)
    repo = os.path.dirname(collab)
    try:
        rel = os.path.relpath(archive, repo)
        subprocess.run(["git", "-C", repo, "add", rel], check=True, capture_output=True)
        subprocess.run(["git", "-C", repo, "commit", "-m", f"malp-archive: {args.entry}", "--", rel],
                       check=True, capture_output=True)
        print(f"[archive] 条目 #{args.entry} 已归档并 commit（不 push）：malp-archive: {args.entry}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"[archive] 条目 #{args.entry} 已归档到 ARCHIVE.md（当前目录非 git 仓库或 git 不可用，跳过 commit——请手工提交）")
    run_validators(tasks, None)


def cmd_status(args):
    """全局视图（issue #3/#4）：进行中条目、CLAIM 时效与 stale、信箱、归档汇总。只读，退出码恒 0。"""
    tasks = args.tasks
    text = open(tasks, encoding="utf-8").read()
    now = int(time.time())
    stale_after = args.stale_after
    collab = os.path.dirname(os.path.abspath(tasks))
    beats = _notify_beats(os.path.join(collab, "NOTIFY.md"))
    archived = _archived_nums(tasks)
    entries = parse_entries(text) or []
    print(f"[status] 协议 {PROTOCOL} ｜ 进行中 {len(entries)} 条 ｜ 已归档 {len(archived)} 条 ｜ stale 阈值 {stale_after}s")
    for e in entries:
        title_m = ENTRY_RE.match(text.splitlines()[e["start"]])
        title = title_m.group(2) if title_m else "?"
        headers = [ln for _, ln in e["lines"] if ln.startswith("- ")]
        budget = next((ln.split(":", 1)[1].strip() for ln in headers if ln.startswith("- 预算档:")), "-")
        priority = next((ln.split(":", 1)[1].strip() for ln in headers if ln.startswith("- 优先级:")), "P2")
        milestone = next((ln.split(":", 1)[1].strip() for ln in headers if ln.startswith("- 里程碑:")), "")
        ms_txt = f"[{milestone}] " if milestone else ""
        dep_txt = ""
        deps = next((ln for ln in headers if ln.startswith("- 依赖:")), "")
        if deps:
            dep_nums = [int(x) for x in re.findall(r"#(\d+)", deps)]
            unsat = [d for d in dep_nums if d not in archived]
            dep_txt = f" 依赖{dep_nums}" + (f"（未满足:{unsat}）" if unsat else "（已满足）")
        claims = [(no, ln) for no, ln in e["lines"] if CLAIM_RE.match(ln)]
        acks = [(no, ln) for no, ln in e["lines"] if ln.startswith("ACK(")]
        verdicts = [(no, ln) for no, ln in e["lines"] if VERDICT_RE.match(ln)]
        if claims:
            m = re.match(r"^CLAIM\(执行\(([\w .-]+)\)\): (\d+)$", claims[0][1])
            who, ts = m.group(1), int(m.group(2))
            age = now - ts
            beat = beats.get(who)
            alive = beat is not None and beat > ts and now - beat <= stale_after
            flag = " ⚠STALE(疑似失联，监督可 reclaim)" if (age > stale_after and not alive) else ""
            claim_txt = f"CLAIM 执行({who}) {age}s{flag}"
        else:
            claim_txt = "无 CLAIM（可认领）"
        ack_txt = f"ACK×{len(acks)}" if acks else "无 ACK"
        tail = f" ｜ 终态结论待归档" if verdicts else ""
        print(f"  #{e['num']} {ms_txt}[{priority}] 预算{budget} {title}{dep_txt}")
        print(f"      {claim_txt} ｜ {ack_txt}{tail}")
    # 全图完成度（架构师编排视角）：进行中 + 已归档条目按里程碑汇总（仅当存在里程碑字段条目时输出）
    # ARCHIVE.md 无「## 进行中」锚（parse_entries 不适用），独立轻量扫描 ### N. 头与其后首个里程碑行
    archive_path = os.path.join(collab, "ARCHIVE.md")
    arch_ms = {}
    if os.path.exists(archive_path):
        cur_num = None
        for ln in open(archive_path, encoding="utf-8").read().splitlines():
            m = ENTRY_RE.match(ln)
            if m:
                cur_num = int(m.group(1))
            elif cur_num is not None and cur_num not in arch_ms and ln.startswith("- 里程碑:"):
                arch_ms[cur_num] = ln.split(":", 1)[1].strip()
    cur_ms = {}
    for e in entries:
        eh = [ln for _, ln in e["lines"] if ln.startswith("- ")]
        cm = next((ln.split(":", 1)[1].strip() for ln in eh if ln.startswith("- 里程碑:")), "")
        if cm:
            cur_ms[e["num"]] = cm
    if cur_ms or arch_ms:
        all_ms = {}
        for num, ms in list(cur_ms.items()) + list(arch_ms.items()):
            all_ms.setdefault(ms, {"done": 0, "total": 0})
            all_ms[ms]["total"] += 1
            if num in arch_ms:
                all_ms[ms]["done"] += 1
        ms_sum = " ｜ ".join(f"{m} {d['done']}/{d['total']}" for m, d in sorted(all_ms.items()))
        done_total = sum(d["done"] for d in all_ms.values())
        sum_total = sum(d["total"] for d in all_ms.values())
        print(f"[status] 全图完成度：{done_total}/{sum_total} ｜ " + ms_sum)
    qdir, adir = os.path.join(collab, "questions"), os.path.join(collab, "answers")
    qs = sorted(os.listdir(qdir)) if os.path.isdir(qdir) else []
    answered = set(os.listdir(adir)) if os.path.isdir(adir) else []
    pending = [q for q in qs if q not in answered]
    unsigned = []
    for a in sorted(answered):
        txt = open(os.path.join(adir, a), encoding="utf-8").read()
        if not ANSWER_SIGNATURE_RE.search(txt):
            unsigned.append(a)
    print(f"[status] 问询信箱：待答复 {len(pending)}（{', '.join(pending) or '-'}）｜ "
          f"未签名答复 {len(unsigned)}（{', '.join(unsigned) or '-'}）")
    sys.exit(0)


def cmd_answer(args):
    """受控代落问询答复（issue #5）：带签名，监督角色校验 OWNERS.md 主审登记。"""
    collab = os.path.dirname(os.path.abspath(args.tasks))
    adir = os.path.join(collab, "answers")
    os.makedirs(adir, exist_ok=True)
    afile = os.path.join(adir, f"{args.entry}-{args.seq}.md")
    if os.path.exists(afile):
        existing = open(afile, encoding="utf-8").read()
        if ANSWER_SIGNATURE_RE.search(existing):
            die(f"answers/{args.entry}-{args.seq}.md 已存在且含合法签名——一问一答，不重复落"
                "（即便 --force 也拒绝覆盖合法答复）")
        if not args.force:
            die(f"answers/{args.entry}-{args.seq}.md 已存在但无签名（伪造或半成品占坑）——"
                "监督确认后用 --force 覆盖（同号覆盖，不消耗问询额度）")
    if args.role == "监督" and not _owner_registered(collab, args.as_name):
        die(f"OWNERS.md 未登记主审({args.as_name})——先按 R7 登记主审域（单行追加），"
            "或使用 --role operator（operator 答复免主审登记）")
    line = f"答复({args.role}({args.as_name})): {args.message} —— {args.role}({args.as_name})"
    with open(afile, "w", encoding="utf-8") as f:
        f.write(f"时间: {int(time.time())}\n{line}\n")
    print(f"[answer] 已落答复：answers/{args.entry}-{args.seq}.md")
    print(f"[answer] 执行 agent 的 ask.sh 将校验签名后消费本答复")


def cmd_reclaim(args):
    """作废旧 CLAIM 并留痕 + 落新 CLAIM（issue #3）：仅监督/operator，已有 ACK 时拒绝。
    注意：临界区由 main 分发处统一加锁（flock 同进程不同 fd 会自死锁），此处不得重复加锁。"""
    tasks = args.tasks
    by = args.by_name.strip()
    if not re.fullmatch(r"(监督|operator)\([\w .-]+\)", by):
        die("reclaim 仅监督/operator 可调用：--by 须为 监督(x) 或 operator(x)")
    lines = open(tasks, encoding="utf-8").read().splitlines()
    start, end = _entry_block(lines, args.entry)
    if start is None:
        die(f"条目 #{args.entry} 不在进行中区")
    block = lines[start:end]
    claims = [(i, ln) for i, ln in enumerate(block) if CLAIM_RE.match(ln)]
    if not claims:
        die(f"条目 #{args.entry} 无生效 CLAIM，无需 reclaim")
    if any(ln.startswith("ACK(") for ln in block):
        die(f"条目 #{args.entry} 已有 ACK（工作可能已交付）——reclaim 拒绝，请监督人工裁决后按 R9 手工处理")
    old_line = claims[0][1]
    m = re.match(r"^CLAIM\(执行\(([\w .-]+)\)\): (\d+)$", old_line)
    old_name, old_ts = m.group(1), m.group(2)
    now = int(time.time())
    void_line = f"作废CLAIM(执行({old_name})): {old_ts} —— {by} {now}"
    new_line = f"CLAIM(执行({args.as_name})): {now}"
    idx = start + claims[0][0]
    lines[idx] = void_line           # 原 CLAIM 位置替换为作废留痕（R5：改判显式作废旧条目）
    lines.insert(idx + 1, new_line)
    _atomic_write(tasks, lines)
    print(f"[reclaim] 条目 #{args.entry}：{old_line} → 已作废并留痕；新认领 {new_line}")
    run_validators(tasks, None)


def main():
    argv = sys.argv[1:]
    if argv and argv[0] in ("ack", "claim", "archive", "status", "answer", "reclaim"):
        cmd = argv[0]
        ap = argparse.ArgumentParser(prog=f"lint.py {cmd}")
        if cmd == "status":
            ap.add_argument("--stale-after", type=int, default=DEFAULT_STALE_AFTER,
                            help=f"CLAIM stale 阈值秒数（缺省 {DEFAULT_STALE_AFTER}，即 4 小时）")
            ap.add_argument("--tasks", help="TASKS.md 路径（缺省向上查找）")
            args = ap.parse_args(argv[1:])
            args.cmd = cmd
            args.tasks = find_tasks_path(args.tasks)
            self_check(args.tasks)
            cmd_status(args)
            return
        if cmd == "answer":
            ap.add_argument("entry", type=int)
            ap.add_argument("seq", type=int, help="问询序号（questions/<entry>-<seq>.md 的 seq）")
            ap.add_argument("message", help="答复内容")
            ap.add_argument("--as", dest="as_name", required=True, help="监督/operator 名字")
            ap.add_argument("--role", choices=("监督", "operator"), default="监督",
                            help="答复角色（缺省监督，须 OWNERS.md 主审登记）")
            ap.add_argument("--force", action="store_true",
                            help="覆盖已存在但无签名的占坑文件（合法签名文件即便 --force 也拒绝）")
            ap.add_argument("--tasks", help="TASKS.md 路径（缺省向上查找）")
            args = ap.parse_args(argv[1:])
            args.cmd = cmd
            args.tasks = find_tasks_path(args.tasks)
            self_check(args.tasks)
            cmd_answer(args)
            return
        ap.add_argument("entry", type=int)
        if cmd == "ack":
            ap.add_argument("ack_line")
        if cmd == "reclaim":
            ap.add_argument("--as", dest="as_name", required=True, help="新认领执行者名字")
            ap.add_argument("--by", dest="by_name", required=True, help="作废署名：监督(x) 或 operator(x)")
        else:
            ap.add_argument("--as", dest="as_name", required=(cmd != "archive"),
                            help="署名名字（archive 不需要）")
        ap.add_argument("--tasks", help="TASKS.md 路径（缺省向上查找）")
        args = ap.parse_args(argv[1:])
        args.cmd = cmd
        args.tasks = find_tasks_path(args.tasks)
        self_check(args.tasks)
        with tasks_lock(args.tasks):
            {"ack": cmd_ack, "claim": cmd_claim, "archive": cmd_archive, "reclaim": cmd_reclaim}[cmd](args)
        return
    ap = argparse.ArgumentParser(description="MALP lint / 回执代落 / 归档收口 / 全局视图 / 问询答复 / 认领回收")
    ap.add_argument("tasks", nargs="?", help="TASKS.md 路径（缺省向上查找）")
    ap.add_argument("result", nargs="?", help="result.md 路径（可选）")
    args = ap.parse_args(argv)
    tasks = find_tasks_path(args.tasks)
    self_check(tasks)
    run_validators(tasks, args.result)


if __name__ == "__main__":
    main()
