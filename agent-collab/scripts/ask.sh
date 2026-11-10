#!/usr/bin/env bash
# MALP（malp/v1）执行 agent 问询信箱：turn 内同步问监督 agent，90s 超时降级。
# 用法：ask.sh --task <条目号> "问题" --tried "已试方案" [--timeout 90]
# 纪律：--task 与 --tried 必填（防思考外包）；每任务限 3 次（按 questions/ 下该条目号前缀计数），
#       超次拒绝执行、退出非零并提示转 ACK(blocked)。
set -euo pipefail

TASK="" QUESTION="" TRIED="" TIMEOUT=90
while [ $# -gt 0 ]; do
  case "$1" in
    --task) TASK="$2"; shift 2 ;;
    --tried) TRIED="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    -*) echo "ask.sh: 未知参数 $1" >&2; exit 2 ;;
    *) QUESTION="$1"; shift ;;
  esac
done
[ -n "$TASK" ] && [ -n "$QUESTION" ] && [ -n "$TRIED" ] || {
  echo "用法：ask.sh --task <条目号> \"问题\" --tried \"已试方案\" [--timeout 90]" >&2; exit 2; }
[[ "$TASK" =~ ^[0-9]+$ ]] || { echo "ask.sh: --task 必须是条目号（整数）" >&2; exit 2; }

# 向上定位 agent-collab/
DIR="$PWD"
while [ ! -d "$DIR/agent-collab" ]; do
  [ "$DIR" = "/" ] && { echo "ask.sh: 未找到 agent-collab/（请在协议项目内运行）" >&2; exit 2; }
  DIR="$(dirname "$DIR")"
done
COLLAB="$DIR/agent-collab"
TASKS="$COLLAB/TASKS.md"

# 校验条目在进行中区（grep 级判定）
grep -qE "^### ${TASK}\." "$TASKS" || {
  echo "ask.sh: 条目 #${TASK} 不在 TASKS.md 进行中区" >&2; exit 1; }

# 限次：按 questions/ 下该条目号前缀计数，每任务限 3 次
mkdir -p "$COLLAB/questions" "$COLLAB/answers"
COUNT=$(ls "$COLLAB/questions" 2>/dev/null | grep -cE "^${TASK}-[0-9]+\.md$" || true)
[ "$COUNT" -ge 3 ] && {
  echo "ask.sh: 条目 #${TASK} 问询已达上限（3 次）。请转 ACK(blocked) 上报阻塞（含阻塞原因与解除条件）。" >&2; exit 1; }
SEQ=$((COUNT + 1))
QFILE="$COLLAB/questions/${TASK}-${SEQ}.md"
AFILE="$COLLAB/answers/${TASK}-${SEQ}.md"

cat > "$QFILE" <<EOF
时间: $(date -u +%FT%TZ)
条目: ${TASK}
提问: 执行 agent
问题: ${QUESTION}
已试: ${TRIED}
EOF
echo "[ask] 问题已落盘：${QFILE}（等待答复，最长 ${TIMEOUT}s）"

# 轮询答复，1s 间隔；答复须带签名（issue #5 信任模型）：
#   答复(监督(<名字>)): ... —— 监督(<名字>)   或   答复(operator(<名字>)): ...
# 无签名/签名非法的 answers 文件视为伪造或半成品，忽略并继续等待。
WAITED=0
while [ "$WAITED" -lt "$TIMEOUT" ]; do
  if [ -f "$AFILE" ]; then
    if grep -qE '^答复\((监督|operator)\([^)]*\)\): .+ —— (监督|operator)\([^)]*\)' "$AFILE"; then
      echo "[ask] 收到答复（签名校验通过）："
      cat "$AFILE"
      exit 0
    fi
    echo "[ask] 发现未签名的 answers/${TASK}-${SEQ}.md——视为无效（伪造或半成品），继续等待监督经 lint.py answer 落署名答复（监督可用 lint.py answer ${TASK} ${SEQ} --force 覆盖此无效占坑文件）" >&2
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

cat >&2 <<EOF
[ask] 超时（${TIMEOUT}s）无有效答复。降级指引：
  1) 按已知信息自决继续，并在 ACK 说明中记录「已问询 #${TASK}-${SEQ} 未获答复」；或
  2) 确实无法推进时，经 lint.py ack ${TASK} 'ACK(blocked): 等待问询答复 ${TASK}-${SEQ}；解除条件：监督 agent 答复 questions/ 对应问题' --as <名字>
EOF
exit 1
