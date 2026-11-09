# 实现任务

## [code] 铺设 MALP 协议资产

- [x] 创建 `agent-collab/` 目录结构（`scripts/`、`questions/`、`answers/`）
- [x] 复制 MALP 模板文件到 `agent-collab/`（TASKS.md、ARCHIVE.md、OWNERS.md、NOTIFY.md、GOAL.md、result.md）
- [x] 复制 MALP 脚本到 `agent-collab/scripts/`（lint.py、team.sh、watch.sh、ask.sh、worktree.sh）并设置可执行权限
- [x] 修改 `.gitignore`，追加反向规则以跟踪 `ARCHIVE.md` 与 `scripts/`，忽略其他运行时文件
- [x] 向 `AGENTS.md` 注入 MALP 上岗指令段
- [x] 向 `CLAUDE.md` 注入 MALP 上岗指令段
- [x] 自验：确认 `git check-ignore` 行为符合预期，脚本可执行
