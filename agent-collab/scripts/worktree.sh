#!/usr/bin/env bash
# MALP（malp/v1）隔离工作区：并行任务防撞（R4/R8）。
# 用法：worktree.sh create|enter|remove <条目号>-<slug> [--force]
# create：开 peer/<条目号>-<slug> 分支 worktree（主树外目录）；隔离区保留 checkout 出的
#         实体 agent-collab/（ARCHIVE.md、scripts/ 为 tracked 天然可用），在其内为五个
#         运行态条目（TASKS/OWNERS/NOTIFY/questions/answers）分别建指向主树的绝对路径软链
#         （建链前 mkdir -p 主树 questions/answers 防悬空）。
# enter ：幂等校验五个软链，断裂/缺失即重建（断链自愈），打印进入路径（脚本无法改父 shell 的 cwd）。
# remove：peer 分支存在主树未含 commit 即拒绝（防「已归档、未合并、被误清」）；--force 显式越过；
#         已合并则清理 worktree 并删除分支。
# 主树主权：主树 HEAD 已在 peer/* 分支时拒绝操作并提示（主树只属一个任务）。
set -euo pipefail

usage() { echo "用法：worktree.sh create|enter|remove <条目号>-<slug> [--force]" >&2; exit 2; }

CMD="${1:-}"; ID="${2:-}"; FORCE=0
[ "${3:-}" = "--force" ] && FORCE=1
case "$CMD" in create|enter|remove) ;; *) usage ;; esac
[ -n "$ID" ] || usage
[[ "$ID" =~ ^[0-9]+-[a-z0-9-]+$ ]] || { echo "worktree.sh: <id> 格式应为 <条目号>-<slug>，如 7-fix-login-timeout" >&2; exit 2; }
BRANCH="peer/$ID"

# 定位主树根（.git 为目录即主树；为文件则解析 gitdir: <main>/.git/worktrees/<x>）
DIR="$PWD"; MAINROOT=""
while [ "$DIR" != "/" ]; do
  if [ -d "$DIR/.git" ]; then MAINROOT="$DIR"; break; fi
  if [ -f "$DIR/.git" ]; then
    GITDIR=$(sed -n 's/^gitdir: //p' "$DIR/.git")
    MAINROOT=$(dirname "$(dirname "$GITDIR")")
    break
  fi
  DIR="$(dirname "$DIR")"
done
[ -n "$MAINROOT" ] || { echo "worktree.sh: 未找到 git 仓库根" >&2; exit 2; }
COLLAB="$MAINROOT/agent-collab"
[ -d "$COLLAB" ] || { echo "worktree.sh: 主树缺 agent-collab/（先跑 skill init 铺设）" >&2; exit 2; }
WTROOT="$(dirname "$MAINROOT")/.$(basename "$MAINROOT")-worktrees"
WTDIRECT="$WTROOT/$ID"

# 主树主权检查
CUR_BRANCH=$(git -C "$MAINROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
case "$CUR_BRANCH" in peer/*)
  echo "worktree.sh: 主树 HEAD 已在 $CUR_BRANCH——主树只属一个任务（R4b），请先回主分支或另开隔离区" >&2; exit 1 ;; esac

link_five() {  # 为隔离区内实体 agent-collab/ 建五个运行态条目的软链（幂等）
  local WT="$1"
  mkdir -p "$COLLAB/questions" "$COLLAB/answers"
  mkdir -p "$WT/agent-collab"
  for NAME in TASKS.md OWNERS.md NOTIFY.md questions answers; do
    ln -sfn "$COLLAB/$NAME" "$WT/agent-collab/$NAME"
  done
}

check_links() {  # 校验五个软链存在且指向主树；断裂/缺失返回 1
  local WT="$1" NAME
  for NAME in TASKS.md OWNERS.md NOTIFY.md questions answers; do
    [ -L "$WT/agent-collab/$NAME" ] && [ -e "$WT/agent-collab/$NAME" ] || return 1
  done
  return 0
}

case "$CMD" in
  create)
    git -C "$MAINROOT" rev-parse --verify --quiet "refs/heads/$BRANCH" >/dev/null \
      && { echo "worktree.sh: 分支 $BRANCH 已存在（重复 create？）" >&2; exit 1; }
    mkdir -p "$WTROOT"
    git -C "$MAINROOT" worktree add -b "$BRANCH" "$WTDIRECT" >/dev/null
    link_five "$WTDIRECT"
    echo "[worktree] 已创建：$WTDIRECT（分支 $BRANCH）"
    echo "[worktree] 运行态五件套已软链至主树唯一清单；commit 请只 add 自己文件；完成经 lint.py ack 落回执"
    ;;
  enter)
    [ -d "$WTDIRECT" ] || { echo "worktree.sh: $WTDIRECT 不存在（先 create）" >&2; exit 1; }
    if ! check_links "$WTDIRECT"; then
      echo "[worktree] 软链缺失/断裂，幂等重建……"
      link_five "$WTDIRECT"
    fi
    echo "[worktree] 进入（请在你的 shell 执行）：cd $WTDIRECT"
    ;;
  remove)
    [ -d "$WTDIRECT" ] || { echo "worktree.sh: $WTDIRECT 不存在" >&2; exit 1; }
    MAINBR=$(git -C "$MAINROOT" rev-parse --abbrev-ref HEAD)
    UNMERGED=$(git -C "$MAINROOT" log --oneline "$MAINBR..$BRANCH" 2>/dev/null || true)
    if [ -n "$UNMERGED" ] && [ "$FORCE" -ne 1 ]; then
      echo "worktree.sh: $BRANCH 存在未合并 commit（防已归档未合并被误清）：" >&2
      echo "$UNMERGED" >&2
      echo "先合并（operator 授权、监督 agent 执行），或显式 --force 越过。" >&2
      exit 1
    fi
    if [ "$FORCE" -eq 1 ]; then
      git -C "$MAINROOT" worktree remove --force "$WTDIRECT"
      git -C "$MAINROOT" branch -D "$BRANCH" >/dev/null 2>&1 || true
    else
      git -C "$MAINROOT" worktree remove "$WTDIRECT"
      git -C "$MAINROOT" branch -d "$BRANCH" >/dev/null 2>&1 || true
    fi
    echo "[worktree] 已清理：$WTDIRECT（分支 $BRANCH）"
    ;;
esac
