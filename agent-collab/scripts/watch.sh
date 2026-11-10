#!/usr/bin/env bash
# MALP（malp/v1）监督 agent 后台监控：事件驱动检测任务清单新回执 + 反向唤醒（issue #4）。
# 用法：watch.sh start [--notify-cmd <命令模板>] | stop
# 生命周期：监督 agent 上岗时 start（nohup 后台，pid 落 agent-collab/watch.pid，
#           输出追加 agent-collab/watch.log），收工时 stop。
# 反向唤醒：检测到新回执/问询时执行 --notify-cmd 模板（bash -c 环境，回执行内容经
# 环境变量 $MALP_LINE 提供，模板中写作 `"$MALP_LINE"`——不替换文本，杜绝括号/空格解析问题）；
#           未传模板时自动探测 tmux `malp-sup-*` 会话并 send-keys（监督会话自行 read log）；
#           信道均不可用则维持纯日志（现状兼容）。
# 判定配方（fix-watch-scan-and-status-mailbox 实测定型）：全量回执行快照 diff。
# 每轮 grep -F 提取 TASKS.md 全部回执行与本轮快照 grep -Fxvf 求新增集，
# 逐条通知；轮末以本轮快照覆盖上轮。回执经 lint.py 落在条目块内（文件中部）而非
# 文件尾，行数窗口配方会读到尾部位移的旧内容而漏报（实测教训），故弃用行号假设；
# 归档导致文件缩短亦无影响。完全相同文本行的重复出现不重复告警（CLAIM 含秒级
# 时间戳，实际概率趋零）。
set -euo pipefail

DIR="$PWD"
while [ ! -d "$DIR/agent-collab" ]; do
  [ "$DIR" = "/" ] && { echo "watch.sh: 未找到 agent-collab/（请在协议项目内运行）" >&2; exit 2; }
  DIR="$(dirname "$DIR")"
done
COLLAB="$DIR/agent-collab"
TASKS="$COLLAB/TASKS.md"
PIDFILE="$COLLAB/watch.pid"
LOGFILE="$COLLAB/watch.log"

is_running() {
  [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

case "${1:-}" in
  start)
    shift || true
    NOTIFY_CMD=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --notify-cmd) NOTIFY_CMD="${2:-}"; [ -n "$NOTIFY_CMD" ] || { echo "watch.sh: --notify-cmd 需要命令模板" >&2; exit 2; }; shift 2 ;;
        *) echo "用法：watch.sh start [--notify-cmd <模板>] | stop" >&2; exit 2 ;;
      esac
    done
    is_running && { echo "[watch] 已在运行（pid $(cat "$PIDFILE")）"; exit 0; }
    [ -f "$TASKS" ] || { echo "watch.sh: 缺 $TASKS.md" >&2; exit 2; }
    # 反向唤醒信道解析：显式模板 > tmux malp-sup-* 会话 > 纯日志（issue #4）
    TMUX_TARGET=""
    if [ -z "$NOTIFY_CMD" ] && command -v tmux >/dev/null 2>&1; then
      TMUX_TARGET=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^malp-sup-' | head -1 || true)
    fi
    if [ -n "$NOTIFY_CMD" ]; then
      CHANNEL="notify-cmd"
    elif [ -n "$TMUX_TARGET" ]; then
      CHANNEL="tmux:$TMUX_TARGET"
    else
      CHANNEL="log-only"
    fi
    nohup bash -c '
      TASKS="$1"; LOGFILE="$2"; CHANNEL="$3"; NOTIFY_CMD="$4"; TMUX_TARGET="$5"; COLLAB="$6"
      SNAP="$COLLAB/.watch-snapshot"; CUR="$COLLAB/.watch-cur.tmp"
      scan() { grep -F -e "ACK(" -e "CLAIM(" -e "审查结论(" -e "作废CLAIM(" "$TASKS" 2>/dev/null || true; }
      scan > "$SNAP"   # 基线 = 启动时现状（存量回执不通知）
      while true; do
        sleep 2
        scan > "$CUR"
        # 新回执 = 本轮快照中上轮没有的行（整行精确匹配；快照为空时输出全部行）
        NEW=$(grep -Fxvf "$SNAP" "$CUR" 2>/dev/null || true)
        if [ -n "$NEW" ]; then
          printf "%s\n" "$NEW" | while IFS= read -r L; do
            [ -z "$L" ] && continue
            echo "[$(date +%FT%TZ)] 新回执：$L" >> "$LOGFILE"
            case "$CHANNEL" in
              notify-cmd)
                # 回执行经环境变量 MALP_LINE 传入模板（无文本替换 → 无解析/注入面）；失败不中断监控
                MALP_LINE="$L" bash -c "$NOTIFY_CMD" >/dev/null 2>&1 || true ;;
              tmux:*)
                tmux send-keys -t "$TMUX_TARGET" "" 2>/dev/null || true ;;
            esac
          done
        fi
        cp "$CUR" "$SNAP"
      done
    ' _ "$TASKS" "$LOGFILE" "$CHANNEL" "$NOTIFY_CMD" "$TMUX_TARGET" "$COLLAB" >/dev/null 2>&1 &
    echo $! > "$PIDFILE"
    echo "[watch] 已启动（pid $(cat "$PIDFILE")，日志 $LOGFILE，唤醒信道 $CHANNEL）。新回执将追加到日志。"
    ;;
  stop)
    if is_running; then
      kill "$(cat "$PIDFILE")" && rm -f "$PIDFILE" "$COLLAB/.watch-snapshot" "$COLLAB/.watch-cur.tmp"
      echo "[watch] 已停止。"
    else
      rm -f "$PIDFILE" "$COLLAB/.watch-snapshot" "$COLLAB/.watch-cur.tmp"
      echo "[watch] 未在运行。"
    fi
    ;;
  *)
    echo "用法：watch.sh start [--notify-cmd <模板>] | stop" >&2; exit 2 ;;
esac
