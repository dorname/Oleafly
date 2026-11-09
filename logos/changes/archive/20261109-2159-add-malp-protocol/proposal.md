# 变更提案：铺设 MALP 多智能体循环协议

## 变更原因

项目已接入 OpenLogos，但单一会话的执行能力在面对复杂、跨模块任务时存在瓶颈。引入 MALP（Multi-Agent Loop Protocol，malp/v1）协议资产，可使多个 CLI agent（Claude Code / Codex / Gemini 等）在同一仓库内按「架构师-监督-执行」角色协作，实现任务拆分解耦、并行防撞、独立复验与闭环归档，提升大规模变更的交付质量与可追溯性。

## 变更类型

代码级变更（基础设施铺设，不涉及业务需求/设计/接口/部署变更）

## 变更范围

- 新增目录：`agent-collab/`（协议账本、脚本、问答信箱、通知心跳）
- 新增文件：
  - `agent-collab/TASKS.md` — 进行中任务清单
  - `agent-collab/ARCHIVE.md` — 归档历史
  - `agent-collab/OWNERS.md` — 主审登记
  - `agent-collab/NOTIFY.md` — 通知与心跳
  - `agent-collab/GOAL.md` — operator 目标
  - `agent-collab/result.md` — 执行 agent 交付结果模板
  - `agent-collab/scripts/{lint.py,team.sh,watch.sh,ask.sh,worktree.sh}` — 协议工具脚本
  - `agent-collab/questions/`、`agent-collab/answers/` — 问询信箱
- 修改 `.gitignore` — 忽略 `agent-collab/*`，但重新纳入 `ARCHIVE.md` 与 `scripts/`
- 修改 `AGENTS.md`、`CLAUDE.md` — 注入 MALP 上岗指令段

## 部署影响

- 是否需要部署：否
- 部署原因：本次仅铺设协作协议资产与脚本，不修改业务代码、配置或服务
- 影响环境：无
- 是否涉及数据迁移：否
- 是否需要回滚预案：否
- 是否需要 smoke：否

## 变更概述

将 MALP 协议模板从 skill 分发到项目内部，建立 `agent-collab/` 协作基础设施，并把通用上岗指令注入 `AGENTS.md` 与 `CLAUDE.md`，使后续任意 CLI agent 启动即可读取协议并按角色上岗。铺设完成后，operator 可通过 `agent-collab/scripts/team.sh start --goal "..."` 拉起完整开发团队，或轻量直派单条任务。
