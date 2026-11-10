## ADDED — MCP localhost 端点与 CLI JSON 契约（现状快照）

> module: ai（CLI 独立发布线同时归属 delivery） | 契约版本：CLI JSON `SCHEMA_VERSION = 1`（**1.0 前不稳定**）
> 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；CLI crate `oleafly-cli 0.1.0`
> 事实来源：提案 `logos/changes/add-baseline-docs/inventory.md`「API 资产」段（MCP localhost、CLI JSON 1.0 前不稳定）、ai 段（S27 MCP 双向集成、S23 无头 CLI、S24 模型目录）、delivery 段（S52 CLI 独立发布）；并以实现定位符佐证（`src-tauri/src/mcp/*`、`src/store/mcp-approvals.ts`、`crates/oleafly-cli/src/*`、`docs/development.md`）。
> **本文档是现状契约快照，非新增 API 设计**：不新增端点、不改字段、不改退出码。本次为只读静态盘点，**未执行任何测试**，动态行为在 verify 阶段单独取证。

## 一、性质声明

- 本节的三个对外接触面与桌面内部 typed IPC（见 `core-01-backend-port.md`）**不是同一层**：
  - **MCP localhost 端点**：桌面应用在本机开启的 HTTP 端点，供外部 MCP client 接入；绑定 `127.0.0.1`，需 bearer token。
  - **CLI JSON 输出**：独立进程 `oleafly` 的机器可读输出契约；**1.0 前明确不稳定**。
  - **CLI MCP stdio 服务端**：`oleafly mcp` 以 stdio 承载 MCP，供外部 client 在**没有桌面应用**时使用。
- 三者互不替代：MCP 走本机 HTTP + bearer，CLI 走 stdout/stdout 契约，CLI MCP 走 stdio JSON-RPC。

## 二、MCP（桌面应用侧，localhost）

### 2.1 端点与发现

| 项 | 现状 | 证据 |
|---|---|---|
| 监听地址 | `http://127.0.0.1:{port}/mcp`（仅回环） | `src-tauri/src/mcp/server_discovery.rs:31-34` |
| 默认端口 | `5323` | `src-tauri/src/config.rs:247-249` |
| 端口可配 | `mcp_port` 配置项 | `src-tauri/src/config.rs:283` |
| 发现文件 | `~/.oleafly/mcp.json`，内容 `{"url": "...", "token": "..."}`，以私有权限写入 | `src-tauri/src/mcp/server_discovery.rs:21-37` |
| 默认开关 | **默认关闭**（`mcp_enabled: false`） | `src-tauri/src/config.rs:282` |
| 默认只读模式 | `mcp_read_only: false`（默认允许写，但写仍需审批） | `src-tauri/src/config.rs:284` |
| 默认审批策略 | `"ask"`（每次询问） | `src-tauri/src/config.rs:251-253`、`:285` |
| 鉴权 | `Authorization: Bearer <token>`，**常量时间比较** | `src-tauri/src/mcp/server.rs:478`（`constant_time_eq`） |
| 外部 MCP server 接入限制 | 仅允许回环目标（`127.0.0.1` / `::1` / `localhost`，端口须为合法 u16） | `src-tauri/src/mcp/server_request.rs:60-85` |

> 信任边界口径（inventory「信任边界」段）：MCP 一律绑定 `127.0.0.1` + bearer；token 不进日志、不进 argv。

### 2.2 超时与租约

| 参数 | 值 | 证据 |
|---|---|---|
| 工具调用超时 | `CALL_TIMEOUT = 300s` | `src-tauri/src/mcp/server.rs:20` |
| 请求体读取超时 | `REQUEST_BODY_TIMEOUT = 30s` | `src-tauri/src/mcp/server.rs:21` |
| renderer 租约 TTL | `RENDERER_LEASE_TTL = 45s` | `src-tauri/src/mcp/server.rs:26` |

含义：工具调用最长阻塞 5 分钟；renderer 侧会话租约 45 秒内未被续租即视为不再新鲜。

### 2.3 工具路由与降级

工具路由由 `tool_route(name, policy, renderer_is_fresh)` 决定（`src-tauri/src/mcp/server_request.rs:108-115`）：

| 路由 | 条件 | 行为 |
|---|---|---|
| `Native` | 工具属于 native 只读集 | 由 Rust 侧直接执行，不依赖 renderer |
| `Renderer` | 非 native 工具且 renderer 会话新鲜 | 转发给渲染进程执行 |
| `RejectNoRenderer` | 非 native 工具且 renderer 不新鲜 | **拒绝该次调用** |

**native 只读集恰为 6 个工具**（`src-tauri/src/mcp/native.rs:8-15`）：

`read_file`、`list_files`、`search_project`、`list_skills`、`load_skill`、`read_skill_file`

其中 3 个技能类工具（`list_skills` / `load_skill` / `read_skill_file`）只对外部 agent 侧关闭（`handles_for_agent`，同文件 `:39-41`）。

> **重要偏差（inventory D8）**：文档曾称 renderer 断开后仍可写，**实现只保留 6 个只读工具**。因此「renderer 断开后 MCP 仍可写」的说法与实现不符，不得沿用。

### 2.4 变更类工具与只读模式

变更类工具共 14 个（`src-tauri/src/mcp/native.rs:17-32`）：

`write_file`、`replace_in_file`、`create_file`、`rename_file`、`delete_file`、`set_main_doc`、`insert_figure`、`toggle_theme`、`open_project`、`update_todos`、`remember_note`、`forget_note`、`run_command`、`research_task_create`

- **只读模式会禁用全部变更类工具**：`tool_disabled_by_read_only`（`src-tauri/src/mcp/server_request.rs:96-98`）。
- 变更类工具的 renderer 侧清单与 native 侧一致（`src/lib/mcp-bridge.ts:55-71`）。

### 2.5 审批模式与自动放行边界

| 规则 | 现状 | 证据 |
|---|---|---|
| 默认模式 | 每次询问（`ask`） | `src-tauri/src/mcp/server.rs` `effective_policy`（`server_request.rs:90-92`，缺省 `("ask", true)`） |
| 会话级自动放行范围 | **仅 4 个工具**：`write_file`、`replace_in_file`、`create_file`、`rename_file` | `src/store/mcp-approvals.ts:3-9` |
| `delete_file` | **不在自动放行集内**，始终需逐次确认 | 同上（清单中无 `delete_file`） |
| 始终强制询问 | `run_command`、`research_task_create` | `src/lib/mcp-bridge.ts:73` |
| 项目级规则 | 可在 `approvals.toml` 中按项目拒绝工具；规则**不可读**时拒绝该工具 | `src/lib/mcp-bridge.ts:74-75` |

### 2.6 工具族总览

MCP 暴露给外部 client 的工具按族划分（renderer 注册入口 `src/lib/mcp-bridge.ts:143-151` 的 `mcpRegisterTools`）：

| 工具族 | 代表工具 | 证据 |
|---|---|---|
| 项目文件读写 | `read_file`、`write_file`、`replace_in_file`、`create_file`、`rename_file`、`delete_file`、`set_main_doc`、`list_files`、`search_project`、`project_map` | `packages/ai-tools/src/tools.ts`（`createOleaflyTools` 返回对象） |
| 编译与日志 | `compile`、`get_log`、`get_pdf_text`、`verify_pdf_pages`、`show_location` | 同上 |
| 会话与记忆 | `update_todos`、`get_todos`、`remember_note`、`forget_note`、`list_notes`、`toggle_theme` | 同上 |
| 子 agent 编排 | `spawn_agent`、`send_message`、`followup_task`、`wait_agent`、`interrupt_agent`、`list_agents`、`close_agent` | 同上 |
| 技能 | `list_skills`、`load_skill`、`read_skill_file` | `src/lib/mcp-bridge.ts:268-348` |
| 图表 | `preview_figure`、`insert_figure`、`load_image` | `packages/ai-tools/src/tools.ts`（`createFigureTools`）；LaTeX / Typst 项目可用，`load_image` 任意项目可用 |
| 项目状态 | `get_status`、`list_projects`、`open_project` | `src/lib/mcp-bridge.ts:349-386` |
| 研究任务 | `research_task_create` 等 | `src/lib/research-tools.ts` |

MCP 服务端对外部 client 发布的指令文本明确要求：**先 `get_status` 看当前项目与文档引擎，再用 `list_files` / `project_map` 定位，然后读写与 `compile`**；破坏性编辑可能在 Oleafly 内挂起等待用户批准（`src-tauri/src/mcp/server.rs:30`）。

### 2.7 反向集成（Oleafly 作为 MCP client）

- 桌面应用可配置外部 MCP server（`mcp_servers`），**每次调用需确认**（inventory S27）。
- 内置助手调用外部 MCP 时，对**参数做脱敏与截断**（inventory S27）。
- 外部 server 目标仅允许回环地址（见 §2.1）。

## 三、CLI（`oleafly` 独立二进制）

### 3.1 人读输出与机器输出

| 形态 | 现状 | 证据 |
|---|---|---|
| 默认 | 人读文本输出到 **stdout**；面向人的备注、进度与警告走 **stderr** | `docs/cli.md`（`--events` 段） |
| `--json` | **一个** JSON 结果对象写到 stdout | `crates/oleafly-cli/src/contract.rs:356-357`、`:283-293` |
| `--events` | 蕴含 `--json`；在结果之前以 **JSON Lines（NDJSON）** 流式输出进度事件 | `crates/oleafly-cli/src/contract.rs:358-361`、`:564-576` |
| `--quiet` | 只打印结果 | `crates/oleafly-cli/src/contract.rs:362-363` |
| `--log none\|tail\|full` | 编译日志量；`--json` 下默认 `tail`，否则默认 `full` | `crates/oleafly-cli/src/contract.rs:364-370`、`:439` |
| `--no-input` | 永不提问，需要交互时直接失败 | `crates/oleafly-cli/src/contract.rs:378-380` |

### 3.2 JSON 结果结构

```json
{
  "schema_version": 1,
  "type": "result",
  "ok": true,
  "command": "build",
  "error": null,
  "warnings": []
}
```

证据：`crates/oleafly-cli/src/contract.rs:283-293`（`schema_version` 常量 `SCHEMA_VERSION = 1`，同文件 `:10`）。

- 事件行的形状：`{"schema_version": 1, "type": "event", "command": ..., "event": <名称>, "ok": <bool>}`（`contract.rs:564-576`）。
- 事件 `ok` 语义：构建结果挂在 `build_finished`；`build_error` 与 `watch_error` 为 `false`；其余为 `true`；`lock_wait` 只表示正在等待同一项目的另一次构建；`watching` 与 `build_finished` 另带构建的 `warnings`（`docs/cli.md` `--events` 段）。

### 3.3 watch 的 NDJSON 语义

- `oleafly watch --json` **只输出事件**（不输出最终结果对象），事件以 NDJSON 逐行写出（`docs/cli.md`；`crates/oleafly-cli/src/commands/build.rs:196-243` 的 watch 循环）。
- watch 事件名包含 `watching`、`build_finished`、`build_error`、`watch_error`、`lock_wait`。
- `oleafly watch` 与 `oleafly daemon run` **一直运行直到被停止**，因此 Ctrl+C 以 `0` 结束（`docs/cli.md` 退出码段）。

### 3.4 退出码语义

| 码 | 含义 | 证据 |
|---|---|---|
| 0 | 成功 | `crates/oleafly-cli/src/contract.rs:14-27`（`Exit` 枚举）；`docs/cli.md` 退出码表 |
| 1 | 内部错误（Oleafly 自身的问题） | 同上 |
| 2 | 命令用法错误，或缺少 `--yes` 之类的前置确认 | 同上 |
| 3 | 项目缺失 / 非法，或路径越界 | 同上 |
| 4 | 缺少工具或所需应用，或项目外的文件读写失败 | 同上 |
| 5 | 构建失败 | 同上 |
| 6 | 需要登录 | 同上 |
| 7 | 网络失败 | 同上 |
| 8 | 项目被其他执行体占用（冲突） | 同上；inventory S23：「apply 冲突退出码 8」 |
| 9 | 检查发现问题 | 同上 |
| 10 | agent 达到步数或时间上限（结果仍会打印） | 同上 |
| 130 | 用户按下 Ctrl+C | 同上 |

`Exit` 枚举的 wire 名为 snake_case（`invalid_input`、`not_initialized`、`invalid_manifest`、`unsafe_path`、`io`、`missing_tool`、`system`、`build`、`usage`、`internal`、`auth`、`network`、`conflict`、`findings`、`limit`、`interrupted`，`contract.rs:29-44`），并在 JSON 的 `error` 中与退出码一一对应（`docs/cli.md` 错误码表）。

### 3.5 稳定性声明（1.0 前不稳定）

> 「The interface is not stable before 1.0.0. Any release may add, rename or remove JSON fields and change exit codes. `--help` says this too, since the people who depend on the output are usually scripting against it.」
> —— `docs/development.md:150-153`

因此：

- **CLI 的 JSON 字段与退出码在 1.0.0 之前不承诺稳定**，任何一次发布都可能新增、改名或删除 JSON 字段，或改变退出码。
- 依赖 CLI 输出的脚本必须自行固定版本并做兼容处理；文档与宣传**不得**称 CLI JSON 契约稳定。
- 该声明同时出现在 `--help` 中（供脚本使用者直接看到）。

### 3.6 CLI 作为 MCP client 接入桌面应用

- CLI 可读取桌面应用的 MCP 发现文件（`~/.oleafly/mcp.json`），仅接受 `http://127.0.0.1:<port>/mcp` 形式的回环目标，其它形态被拒（`crates/oleafly-cli/src/mcp/bridge.rs:16-44`、`:360-364`）。
- token **只作为 `Authorization: Bearer` 头发送**，不进入 URL 或查询串（同文件 `:74`、`:428-438`）。
- CLI 另有 `oleafly auth login server` 路径用于登录协作 Server；`--setup-code-stdin` 让 setup code 不进 shell 历史（`docs/cli.md:369-372`）。

## 四、CLI MCP stdio 服务端（`oleafly mcp`）

| 项 | 现状 | 证据 |
|---|---|---|
| 传输 | stdio，**每行一个 JSON-RPC 消息** | `crates/oleafly-cli/src/mcp/server.rs:1-4` |
| 输出分流 | stdout **只承载协议消息**；面向人的内容走 stderr | 同文件 `:1-4` |
| 单行上限 | `MAX_LINE_BYTES = 4 MiB` | 同文件 `:15` |
| 并发上限 | `MAX_CONCURRENT_CALLS = 4` | 同文件 `:16` |
| 工具集 | `get_status`、`project_map`、`context`、`compile`、`get_log`、`list_files`、`read_file`、`search_project`、`cite_lookup`、`doctor` | `crates/oleafly-cli/src/mcp/tools.rs:155-215` 起的工具定义块 |
| 工具提示元数据 | 每个工具带 `read_only` / `destructive` / `idempotent` / `open_world` 提示 | 同文件 `:86-89` |
| 只读边界 | 该服务端**只读并构建**：编辑需外部工具自行完成 | 同文件 `compile` 工具描述 |

## 五、边界与不可推断事项

- **不得**宣称 MCP 端点可从网络访问：它绑定 `127.0.0.1` 且要求 bearer。
- **不得**宣称 renderer 断开后 MCP 仍可写：实现只保留 6 个只读工具（inventory D8）。
- **不得**把 `delete_file` 归入自动放行范围：会话级自动放行只覆盖 4 个写类工具，`delete_file` 必须逐次确认。
- **不得**宣称 CLI JSON 契约稳定：1.0.0 前明确不保证（`docs/development.md:150-153`）。
- **不得**把 CLI 的 `Exit` 码当作跨工具统一语义之外的稳定 ABI：它们虽由单一枚举定义，但 1.0 前仍可能变动。
- **不得**把 MCP 工具族与 BackendPort 命令族一一对应：MCP 是外部 client 的**受审批**工具面，BackendPort 是内部 typed IPC，二者数量与边界都不同。
- 本次盘点**未运行测试**，以上端点、字段、退出码与工具名均为静态阅读实现得出。
