#!/usr/bin/env bash
# MALP（malp/v1）团队编排：operator 确定目标后一键拉起含架构师的完整开发团队（add-architect-team-orchestration）。
# 用法：team.sh start --goal "<目标文本>" [--exec N] [--architect <名>] [--cli claude|codex|gemini]
#                [--cmd-template <模板>] | stop
# 拉起信道降级链（与 init 信道探测一致）：L1 herdr（command -v herdr 且 server running，
#   专用 workspace malp-<项目名> 隔离，agent start + prompt 注入上岗词）→ L2 tmux（会话
#   malp-arch / malp-exec-<i>，启动命令经 --cmd-template 模板）→ L3 手动清单（逐 agent
#   一行可复制命令）。--cmd-template 仅作用于 L2/L3；herdr 信道用 --kind 启动、prompt 注入。
# 行为：
#   start —— ① 目标写入 agent-collab/GOAL.md（架构师规划唯一输入）② 按降级链拉起团队
#   stop  —— 关闭 herdr malp-<项目名> 工作区 / tmux 会话 + watch.sh stop
# 纪律：不自动 push、不做权限动作——operator 终审点不变；执行 agent 的 R1-R9 不变。
set -euo pipefail

DIR="$PWD"
while [ ! -d "$DIR/agent-collab" ]; do
  [ "$DIR" = "/" ] && { echo "team.sh: 未找到 agent-collab/（请在协议项目内运行）" >&2; exit 2; }
  DIR="$(dirname "$DIR")"
done
COLLAB="$DIR/agent-collab"
SKILL_TPL="${MALP_TEMPLATES:-}"   # 模板目录（team.sh 随脚本分发后与 templates/ 分离，优先环境变量，其次探测）

find_templates() {
  if [ -n "$SKILL_TPL" ] && [ -d "$SKILL_TPL" ]; then echo "$SKILL_TPL"; return; fi
  local d="$COLLAB"
  for _ in 1 2 3 4 5 6; do
    d="$(dirname "$d")"
    [ -d "$d/templates" ] && [ -f "$d/templates/onboarding.md" ] && { echo "$d/templates"; return; }
  done
  echo ""
}

# 上岗词提取：从 onboarding.md 取标题含指定关键字的章节代码块（如 "## 4. 架构师上岗词"）
section_prompt() {
  local tpl="$1" sec="$2"
  awk -v sec="$2" '
    /^## / && index($0, sec) { f=1; next }
    f && /^## / { exit }
    f && /^```/ { if (incode) exit; incode=1; next }
    incode { print }
  ' "$tpl/onboarding.md"
}

CLI="claude"; EXEC_N=1; GOAL=""
usage() { echo "用法：team.sh start --goal \"<目标>\" [--exec N] [--architect <名>] [--cli claude|codex|gemini] [--cmd-template <模板>] | stop" >&2; exit 2; }

# —— L1 herdr：专用 workspace 隔离 + agent start + prompt 注入。单步失败清理 workspace 后返回 1 由调用方降级。
json_get() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$2" <<<"$1"; }

_herdr_fail() {
  [ -n "${ws_id:-}" ] && herdr workspace close "$ws_id" >/dev/null 2>&1
  echo "[team] herdr 拉起失败，降级下一信道" >&2
  return 1
}

# 等待 herdr agent 就绪（interactive_ready 且 idle）：容忍 CLI 冷启动慢与首次 trust 确认屏
# （read 到 "trust this folder" 时自动 send-keys Down+Enter 选择信任），上限约 6 分钟
wait_herdr_ready() {
  local name="$1" out ready trust i=0
  while [ "$i" -lt 72 ]; do                    # 72×5s ≈ 6 分钟上限；纯 bash 计数，不依赖 seq
    i=$((i + 1))
    out=$(herdr agent get "$name" 2>/dev/null) || { sleep 5; continue; }
    ready=$(python3 -c 'import json,sys
d=json.load(sys.stdin)
a=d.get("result",{}).get("agent",{})
print("yes" if a.get("interactive_ready") and a.get("agent_status") == "idle" else "no")' <<<"$out" 2>/dev/null) || ready=no
    [ "$ready" = "yes" ] && return 0
    trust=$(herdr agent read "$name" 2>/dev/null || true)
    case "$trust" in
      *"trust this folder"*) herdr agent send-keys "$name" Down Enter >/dev/null 2>&1 ;;
    esac
    sleep 5
  done
  echo "[team] herdr agent $name 启动超时（6 分钟未就绪）" >&2
  return 1
}

start_herdr_agent() {  # $1=name  $2=prompt  $3=pane(可选；空则复用已注册 agent)
  local name="$1" prompt="$2"
  herdr agent start "$name" --kind "$CLI" --pane "${3:-}" --timeout 120000 >/dev/null 2>&1 || true   # 慢启动/trust 屏报 not_ready，agent 可能已注册，由 wait 兜底
  wait_herdr_ready "$name" || { _herdr_fail; return 1; }
  herdr agent prompt "$name" "$prompt" >/dev/null 2>&1 \
    || { echo "[team] herdr prompt 注入失败（$name）" >&2; _herdr_fail; return 1; }
  echo "[team] $name 就绪并已注入上岗词。"
}

launch_herdr() {
  local ws_json ws_id="" root_pane tab_json pane_id i
  ws_json=$(herdr workspace create --label "malp-${DIR##*/}" --cwd "$DIR" --no-focus 2>/dev/null) || { echo "[team] herdr workspace 创建失败" >&2; return 1; }
  ws_id=$(json_get "$ws_json" 'd["result"]["workspace"]["workspace_id"]') || { _herdr_fail; return 1; }
  root_pane=$(json_get "$ws_json" 'd["result"]["root_pane"]["pane_id"]') || { _herdr_fail; return 1; }
  echo "[team] herdr 工作区已建：$ws_id（label malp-${DIR##*/}，隔离于现有工作区）"
  start_herdr_agent malp-arch "$ARCH_PROMPT" "$root_pane" || return 1
  i=1
  while [ "$i" -le "$EXEC_N" ]; do
    tab_json=$(herdr tab create --workspace "$ws_id" --cwd "$DIR" --label "malp-exec-$i" 2>/dev/null) || { echo "[team] herdr tab 创建失败（执行 #$i）" >&2; _herdr_fail; return 1; }
    pane_id=$(json_get "$tab_json" 'd["result"]["root_pane"]["pane_id"]') || { _herdr_fail; return 1; }
    start_herdr_agent "malp-exec-$i" "$EXEC_PROMPT" "$pane_id" || return 1
    i=$((i + 1))
  done
  echo "[team] 团队就绪（herdr 工作区 $ws_id）：架构师读 GOAL.md 规划依赖图 → 拆单派单；执行按 R8 自动取任务。收工 team.sh stop。"
}

launch_tmux() {
  command -v tmux >/dev/null 2>&1 || return 1
  local i
  tmux new-session -d -s malp-arch -c "$DIR" 2>/dev/null || true
  tmux send-keys -t malp-arch "$(printf "$CMD_TEMPLATE" "${ARCH_PROMPT//\"/\\\"}")" C-m
  echo "[team] 架构师已拉起：tmux 会话 malp-arch（上岗词已注入）"
  i=1
  while [ "$i" -le "$EXEC_N" ]; do
    tmux new-session -d -s "malp-exec-$i" -c "$DIR" 2>/dev/null || true
    tmux send-keys -t "malp-exec-$i" "$(printf "$CMD_TEMPLATE" "${EXEC_PROMPT//\"/\\\"}")" C-m
    echo "[team] 执行 agent #$i 已拉起：tmux 会话 malp-exec-$i"
    i=$((i + 1))
  done
  echo "[team] 团队就绪：架构师读 GOAL.md 规划依赖图 → 拆单派单；执行按 R8 自动取任务。收工 team.sh stop。"
}

launch_manual() {
  local i
  echo "[team] tmux 不可用——以下为手动启动命令清单（逐条执行）："
  echo "  1) 架构师："
  echo "     cd $DIR && $(printf "$CMD_TEMPLATE" "${ARCH_PROMPT//\"/\\\"}")"
  i=1
  while [ "$i" -le "$EXEC_N" ]; do
    echo "  $((i + 1))) 执行 agent #$i："
    echo "     cd $DIR && $(printf "$CMD_TEMPLATE" "${EXEC_PROMPT//\"/\\\"}")"
    i=$((i + 1))
  done
  echo "[team] 清单即交付（架构师规划 → 拆单派单 → 执行按 R8 自动取任务 → 复验归档 → 交付汇报）。"
}

case "${1:-}" in
  start)
    shift || true
    CMD_TEMPLATE=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --goal) GOAL="${2:-}"; [ -n "$GOAL" ] || usage; shift 2 ;;
        --exec) EXEC_N="${2:-}"; case "$EXEC_N" in ''|*[!0-9]*|0) usage;; esac; shift 2 ;;
        --architect) [ -n "${2:-}" ] || usage; shift 2 ;;   # 保留参数兼容，仅展示用
        --cli) CLI="${2:-}"; case "$CLI" in claude|codex|gemini) ;; *) usage;; esac; shift 2 ;;
        --cmd-template) CMD_TEMPLATE="${2:-}"; [ -n "$CMD_TEMPLATE" ] || usage; shift 2 ;;
        *) usage ;;
      esac
    done
    [ -n "$GOAL" ] || usage
    TPL="$(find_templates)"
    [ -n "$TPL" ] || { echo "team.sh: 未找到 templates/onboarding.md（设 MALP_TEMPLATES 环境变量指定模板目录）" >&2; exit 2; }
    ARCH_PROMPT="$(section_prompt "$TPL" "架构")"
    EXEC_PROMPT="$(section_prompt "$TPL" "执行")"
    [ -n "$ARCH_PROMPT" ] && [ -n "$EXEC_PROMPT" ] || { echo "team.sh: onboarding.md 缺架构/执行上岗词小节" >&2; exit 2; }

    # ① 目标落盘（幂等覆盖——同一团队同一次 start 的唯一目标）
    printf '# 目标\n\n%s\n\n# 约束\n\n无\n\n（%s 由 team.sh 写入）\n' "$GOAL" "$(date -u +%FT%TZ)" > "$COLLAB/GOAL.md"
    echo "[team] 目标已落盘：$COLLAB/GOAL.md"

    # ② L2/L3 的 CLI 启动命令模板（缺省按 --cli 预置；{prompt} 占位）
    [ -n "$CMD_TEMPLATE" ] || CMD_TEMPLATE="$CLI \"{prompt}\""

    # ③ 拉起信道降级链：L1 herdr（server running）→ L2 tmux → L3 手动清单
    if command -v herdr >/dev/null 2>&1 && herdr status server 2>/dev/null | grep -q "^status: running" && launch_herdr; then
      :
    elif launch_tmux; then
      :
    else
      launch_manual
    fi
    ;;
  stop)
    if command -v herdr >/dev/null 2>&1 && herdr status server 2>/dev/null | grep -q "^status: running"; then
      WS_ID=$(herdr workspace list 2>/dev/null | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
    for w in d["result"].get("workspaces", []):
        if str(w.get("label","")) == "malp-" + sys.argv[1]:
            print(w["workspace_id"]); break
except Exception:
    pass' "${DIR##*/}") || WS_ID=""
      if [ -n "${WS_ID:-}" ]; then
        herdr workspace close "$WS_ID" >/dev/null 2>&1 && echo "[team] herdr 工作区 $WS_ID 已关闭。"
      fi
    fi
    if command -v tmux >/dev/null 2>&1; then
      tmux kill-session -t malp-arch 2>/dev/null || true
      for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^malp-exec-' || true); do
        tmux kill-session -t "$s" 2>/dev/null || true
      done
    fi
    bash "$COLLAB/scripts/watch.sh" stop >/dev/null 2>&1 || true
    echo "[team] 已停止（工作区/会话与 watch 已清理）。"
    ;;
  *) usage ;;
esac
