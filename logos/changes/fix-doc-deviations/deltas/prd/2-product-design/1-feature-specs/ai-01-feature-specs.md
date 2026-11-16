<!-- fix-doc-deviations: D7/D8/D9/D10 标注转终态 -->

## MODIFIED — 前置口径：五条 AI 执行路径（不可混称）

Oleafly 中存在五条相互独立的 AI 执行路径，运行主体、凭据来源与隔离机制各不相同。任何后续设计、实现与对外表述不得将其统一为一种"AI 模式"或"AI 沙箱"；本文各场景小节均标注其所属执行路径。

| # | 执行路径 | 运行主体与要点 | 隔离机制 |
|---|---------|--------------|---------|
| ① | 内置 Copilot | 由 Oleafly 自身运行 agent loop，工具变更经 diff 审批 | turn 快照 |
| ② | 交互式 ACP CLI agent | 外部 CLI agent（内置目录 15 个，原偏差 D7，docs/AICopilot.md 已对齐），使用用户各自的外部账号 | ACP turn copy |
| ③ | Research Task | 自主长时任务，worktree/snapshot + 预算 + 选择性 apply | worktree+manifest（非 Git 项目 staged snapshot） |
| ④ | 无头 CLI | `oleafly ask` / `agent run`，默认只读，write 走 review copy | review copy |
| ⑤ | 外部 MCP client | 经 localhost+bearer 接入，写操作经审批 | 无副本 |

五条路径的隔离机制（turn 快照 / ACP turn copy / worktree+manifest / review copy / 无副本）彼此不能互相替代，也不能混称为同一机制。

## MODIFIED — S24: 模型目录与信任状态管理

#### 功能入口与表面

模型配置与目录界面：provider key、custom endpoint、本地 Ollama 的配置入口；模型列表及其 Verified/Untested/Blocked 三态信任状态展示。为使用模型的各执行路径提供配置与信任判定基础。

#### 关键交互

1. 配置 provider key / custom endpoint / 本地 Ollama；
2. 刷新模型列表，查看每个模型的 Verified/Untested/Blocked 状态；
3. Untested 模型首次使用前跑真实 probe（hosted 30s / 自托管 120s 超时）；
4. 离线或刷新失败时按规则降级，保留既有旧列表继续可用。

#### 能力与限制

- 刷新有 30s 节流、24h 自动刷新；刷新失败保留旧列表，不出现空白或以错误状态冒充成功。
- blocked 两类语义（原偏差 D10，docs/AICopilot.md 与 docs/ai-model-catalog.md 已对齐）：catalog blocked 一律拒绝；probe blocked 允许在无工具 plain chat 场景使用。
- localhost 与私网地址的 provider 一律按自托管策略处理（如 probe 超时规则），不套用 hosted 规则。
- 证据（inventory 节选）：providers.ts L16-216；ai-model-state.ts L13-78；ai_model_registry.rs L185-207；agent.rs L1556-1712；provider.rs L159-193。

## MODIFIED — S25: 外部 CLI agent（ACP）接入

#### 功能入口与表面

内置 CLI agent 目录（15 个，原偏差 D7，docs/AICopilot.md 已对齐）与 ACP 交互式会话（执行路径②）：目录选择/安装入口、各 CLI 自身账号登录、会话任务下发、越权审批卡（权限 diff 审阅）、turn 变更审阅。

#### 关键交互

1. 从内置目录（15 个）选择并安装外部 CLI agent，各自完成其自身账号登录；
2. 新建会话并下发任务，agent 以交互式 ACP 会话运行；
3. 越权请求触发拒绝，或弹出审批卡供用户审阅权限 diff；
4. 审阅该 turn 产生的变更（进入 turn copy）。

#### 能力与限制

- 项目外读取被拒绝；未知路径按 fail closed 处理，不得默认放行。
- turn copy 仅适用于非 task、非子会话、非 remote 场景。
- 权限 diff 上限 96KiB；审批卡一次最多 16 个。
- Research 场景使用临时 HOME 时，凭据文件权限为 0700/0600。
- 内置 agent 数量为 15 个（原偏差 D7，docs/AICopilot.md 已对齐）。
- 证据（inventory 节选）：builtin_agents.rs L23-196；acp/runtime.rs L187-216, L2899-3210；permission_view.rs L8-99；acp/review.rs L49-55。

## MODIFIED — S26: Research Task 隔离执行

#### 功能入口与表面

Research Tasks 功能（执行路径③，默认关闭）：Experimentation 开关、brief 撰写界面（目标/成功标准/预算/权限）、plan.md 审阅、执行环境选择（本机/SSH/Slurm/Cua）、run 后台运行与进度查看、选择性 apply。

#### 关键交互

1. 在 Experimentation 中开启 Research Tasks；
2. 撰写 brief：目标、成功标准、预算、权限；
3. plan-first：审阅 plan.md 后放行执行；
4. 选择执行环境（本机/SSH/Slurm/Cua），后台运行并查看 run 进度；
5. run 完成后校验文件前后 hash，用户选择性 apply 合入。

#### 能力与限制

- 默认关闭，须在 Experimentation 显式开启。
- 默认预算 120 分钟、单 run 60 分钟（原偏差 D9，docs/Skills.md 已对齐）。
- Git 项目使用 worktree 隔离，覆盖 manifest 包含未提交修改；非 Git 项目使用 staged snapshot。
- apply 校验文件前后 hash；hash 不符时经 journal 回滚，不留下半套用的结果；证据检查只产生警告，不是 apply 门禁。
- 本机 run 无 sandbox 时拒绝启动并明确说明，不退化为无隔离执行；Windows sandbox 默认关闭。
- 证据（inventory 节选）：research-tasks-flag.ts L10-27；research/model.rs L131-215, L917-924；isolation.rs L110-268；apply.rs L478-583；runs/local.rs L191-198。

## MODIFIED — S27: MCP 双向集成

#### 功能入口与表面

MCP 双向集成（执行路径⑤，双向均默认关闭）：对外方向为 MCP server 开关与 localhost URL+bearer 复制入口；对内方向为外部 MCP server 的添加配置与逐调用确认。

#### 关键交互

1. 开启 MCP server，复制 localhost URL+bearer 到外部 client；
2. 外部 client 调用读工具（renderer 断开后仍可用），写操作经审批；
3. 反向添加外部 MCP server；
4. 内置助手调用外部 server 工具时每次调用需确认（默认 ask），传出的参数经脱敏与截断处理。

#### 能力与限制

- renderer 断开后 native 仅保留 6 个只读工具，写能力不可用（原偏差 D8，docs/mcp.md 已对齐）。
- bearer 采用常量时间比较，不泄露时序信息。
- tool call 超时 300s；renderer lease 45s。
- auto-approve 规则不含 delete 类操作。
- 无副本隔离是本路径与 Copilot/ACP/Research 的本质差异，不得混称。
- 证据（inventory 节选）：config.rs L282-285；mcp/server_request.rs L41-265；mcp/native.rs L8-191；mcp/server.rs L20-27；mcp-approvals.ts L4-62；mcp-agent-tools.ts L21-229。
