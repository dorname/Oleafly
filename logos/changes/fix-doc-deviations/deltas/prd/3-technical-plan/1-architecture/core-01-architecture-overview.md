<!-- fix-doc-deviations: D8/D10 标注转终态 -->

## MODIFIED — 4.5 MCP 工具流与 renderer 降级

- MCP server **只绑回环地址（127.0.0.1）并要求 bearer 令牌**，bearer 用常量时间比较（`constant_time_eq`），工具调用超时 300 s，renderer 租约 TTL 45 s（`src-tauri/src/mcp/server.rs` L20、L26、L458）。
- 路由规则：`tool_route()` 先看 `crate::mcp::native::handles(name, policy)`（native 能处理就本地跑），否则若 renderer 会话新鲜则**转发给 renderer**，两条路都不通才报错；native 侧按 `READ_ONLY`（6 个只读工具：`read_file`、`list_files`、`search_project`、`list_skills`、`load_skill`、`read_skill_file`）与 `MUTATING`（14 个）分表，`is_mutating` 决定是否走审批（`src-tauri/src/mcp/native.rs` L10-33；`src-tauri/src/mcp/server_request.rs` L108-111、L395-404）。
- **renderer 断开后的降级**：Rust 侧只保留上表 6 个只读工具，写工具不再可用（原偏差 D8，docs/mcp.md 已由 fix-doc-deviations 对齐）。
- 请求侧限流：请求体上限 20 MiB、请求体超时 30 s、已认证并发上限 8、待转发调用上限 16。

## MODIFIED — 5.6 模型信任状态

- 模型目录（`src-tauri/resources/ai-models.json`，列目录时从 CDN 刷新）把每个模型标为 **verified / blocked（带原因）/ untested**；**不再过滤掉任何模型**，目录尚未覆盖的模型仍出现在选择器里。
- `agent_run` 在发出第一个请求前**拒绝 blocked 模型**；对 untested 模型，仅当该次 run 声明了工具且其元数据表明不支持工具时才拒绝（chat-only 模式不发工具，放行）。每个模型另标 `trustSource`（`catalog` 或 `probe`），以区分目录判定与用户自己探针的判定。
- `blocked` 必须区分两类：**catalog blocked 一律永拒；probe blocked 可退化为无工具 plain chat**（原偏差 D10，docs/AICopilot.md 与 docs/ai-model-catalog.md 已对齐）。
- 刷新有节流（30 s）与 24 h 自动刷新；失败保留旧列表；hosted probe 30 s / 自托管 120 s；**localhost 与私网一律按自托管策略**（inventory.md S24 行）。

## MODIFIED — 6.4 基线已知边界（架构层，需在后续变更中显式处理）

- **文档与实现曾存在至少 12 处语义偏差（D1-D12）**，本文件按实现记录；其中与架构相关的有 D8（MCP native 写能力）、D10（blocked 模型文案）、D11（CLI 独立包已存在）、D12（README 离线冲突概括），相关文档已由 fix-doc-deviations 对齐。偏差明细见 inventory.md「文档/实现偏差清单」。
- **E2E 明确的人工区域**：OS 原生拖放、auto-updater、真实 AI 端到端；三者不在自动化 E2E 内验证。
- **生产浏览器无编译引擎**；fake engine 仅开发测试可用。
- **Linux 大文档编译**是 CI 中记录的开放问题。
- **外部 `Oleafly` / `oleafly-server` 仓库状态不可推断**。
- 本基线为**静态盘点**：`npm test` 失败根因是 node_modules 未装（vitest 已声明于 devDependencies），正确流程为 `corepack enable && pnpm install --frozen-lockfile && pnpm test`；`logos.config.json` 的 `verify.pre_run_command` 仍为 `npm test`，与本仓 pnpm workspace 不符，需在 verify 前修正（另立小变更或人工修正）。
