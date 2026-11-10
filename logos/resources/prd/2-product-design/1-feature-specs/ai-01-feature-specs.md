## Oleafly AI 与 Agent（ai）功能规格（现状基线）

> module: ai | 基线口径：桌面 0.4.11，绑定提交 `9c307bf3c`（HEAD，领先 v0.4.11 标签 3 个提交）
> 事实来源：仅限提案 `inventory.md`（ai 段 S21-S28 及偏差清单 D7-D10）与需求文档 `ai-01-requirements.md`。本文为存量产品现状基线的功能规格：只固化已实现能力，不新增任何功能或交互。本次为只读静态盘点，未执行任何动态验证。

### 前置口径：五条 AI 执行路径（不可混称）

Oleafly 中存在五条相互独立的 AI 执行路径，运行主体、凭据来源与隔离机制各不相同。任何后续设计、实现与对外表述不得将其统一为一种"AI 模式"或"AI 沙箱"；本文各场景小节均标注其所属执行路径。

| # | 执行路径 | 运行主体与要点 | 隔离机制 |
|---|---------|--------------|---------|
| ① | 内置 Copilot | 由 Oleafly 自身运行 agent loop，工具变更经 diff 审批 | turn 快照 |
| ② | 交互式 ACP CLI agent | 外部 CLI agent（内置目录 15 个，偏差 D7），使用用户各自的外部账号 | ACP turn copy |
| ③ | Research Task | 自主长时任务，worktree/snapshot + 预算 + 选择性 apply | worktree+manifest（非 Git 项目 staged snapshot） |
| ④ | 无头 CLI | `oleafly ask` / `agent run`，默认只读，write 走 review copy | review copy |
| ⑤ | 外部 MCP client | 经 localhost+bearer 接入，写操作经审批 | 无副本 |

五条路径的隔离机制（turn 快照 / ACP turn copy / worktree+manifest / review copy / 无副本）彼此不能互相替代，也不能混称为同一机制。

### S21: 内置 Copilot 修复与逐轮审阅

#### 功能入口与表面

写作工作区内的内置 Copilot 会话（执行路径①）：任务交办与对话界面、逐步工具变更的 diff 审批卡（ToolConfirm）、turn Review 逐文件审阅界面。审批模式为用户配置项。

#### 关键交互

1. 配置 provider、模型与审批模式；
2. 交办任务，可先以 Plan 模式做只读规划，再进入执行；
3. loop 由 Oleafly 自身运行，每步工具变更经 diff 审批后才落盘；
4. 编译报错可在同一会话中继续修复（编译续修）；
5. 某 turn 产生多文件变更后，在 turn Review 中逐文件执行 Undo/Redo。

#### 能力与限制

- Plan 模式的"只读"不等于离线：仍包含文献检索等网络读取，不得宣传为离线模式。
- Undo 只处理未提交、未与其他变更重叠、且事后未被再次编辑的文件。
- turn 快照上限：20000 文件 / 单文件 25MiB / 单 turn 512MiB / 总量 1GiB；保留 100 turns / 14 天。
- 切换项目后，旧项目的进行中调用不再执行。
- run 启动时审批规则读取失败则终止该 run，不得在缺失审批规则约束下继续执行。
- 证据（inventory 节选）：ToolConfirm.tsx L268-338；ChatCore.tsx L2241-3094；approval-risk.ts L64-129；agent_turns.rs L143-177, L1501-1557。

#### 关联需求

- 需求：ai-01-requirements.md S21（内置 Copilot 修复与逐轮审阅），优先级 P0。
- 痛点：P01（重复性研究与写作劳动密集）、P02（AI 修改失控与不可回退的顾虑）。
- 执行路径：①。

### S22: 研究 Skills 调用

#### 功能入口与表面

内置助手中的技能体系（隶属执行路径①）：bundled/shelf/user 三类技能的管理入口，`/skill-id` 斜杠显式调用与助手自动选择两种触发方式。

#### 关键交互

1. 管理三类来源的技能：bundled（随产品内置）、shelf（目录分发）、user（用户自建）；
2. 以 `/skill-id` 显式调用，或由助手自动选择合适技能；
3. 技能按声明式步骤执行检索、DOI 核验、成稿；
4. 产出的 .bib 变更经用户审批后写入并触发编译，新增引用进入本地引用流。

#### 能力与限制

- 新技能默认开启；shelf 目录每日缓存，离线时以缓存副本回退。
- catalog 限 8MiB、archive 限 64MiB 并带 checksum 校验；但 checksum 不替代对技能脚本内容的人工信任，用户仍须自行审阅脚本后再启用。
- 文献搜索与 DOI 核验需网络；离线时这些环节明确不可用，不假装修复成功。
- 证据（inventory 节选）：src/lib/skills.ts L65-518；docs/Skills.md L175-205；skills_catalog.rs L17-30。

#### 关联需求

- 需求：ai-01-requirements.md S22（研究 Skills 调用），优先级 P0。
- 痛点：P01。
- 执行路径：①（内置助手内的技能调用）。

### S23: 无头 CLI 只读分析与受控写入

#### 功能入口与表面

终端中的无头 CLI（执行路径④）：`oleafly ask` 与 `agent run` 命令，无独立 GUI 表面；写入路径产出 review copy 变更清单与 dry-run 预演。

#### 关键交互

1. 以默认参数运行 `oleafly ask` / `agent run` 做只读分析（write、commands、network 全为 false），项目文件无任何改动；
2. 需要写入时以 `--allow write` 运行，变更落在 `.oleafly` 内的 review copy；
3. 查看 review copy 变更清单，并 dry-run 预演；
4. 预演确认后 apply 到项目。

#### 能力与限制

- review 目录必须在 `.oleafly` 内。
- workspace 越界一律拒绝：绝对路径、`..`、`.git`、`.oleafly`、`.private`、NTFS 短名等目标，上限 20000 文件 / 2GiB。
- `--unsandboxed-commands` 是显式高风险逃生口，仅由用户主动给出时生效。
- apply 时若 review copy 生成后项目文件又发生变化，检测到冲突即退出（退出码 8），不做部分合入。
- 证据（inventory 节选）：docs/cli.md L518-684；policy.rs L13-222；workspace.rs L40-246。

#### 关联需求

- 需求：ai-01-requirements.md S23（无头 CLI 只读分析与受控写入），优先级 P1。
- 痛点：P01、P02。
- 执行路径：④。

### S24: 模型目录与信任状态管理

#### 功能入口与表面

模型配置与目录界面：provider key、custom endpoint、本地 Ollama 的配置入口；模型列表及其 Verified/Untested/Blocked 三态信任状态展示。为使用模型的各执行路径提供配置与信任判定基础。

#### 关键交互

1. 配置 provider key / custom endpoint / 本地 Ollama；
2. 刷新模型列表，查看每个模型的 Verified/Untested/Blocked 状态；
3. Untested 模型首次使用前跑真实 probe（hosted 30s / 自托管 120s 超时）；
4. 离线或刷新失败时按规则降级，保留既有旧列表继续可用。

#### 能力与限制

- 刷新有 30s 节流、24h 自动刷新；刷新失败保留旧列表，不出现空白或以错误状态冒充成功。
- blocked 两类语义（偏差 D10）：catalog blocked 一律拒绝；probe blocked 允许在无工具 plain chat 场景使用（实现现状，纠正文档概括）。
- localhost 与私网地址的 provider 一律按自托管策略处理（如 probe 超时规则），不套用 hosted 规则。
- 证据（inventory 节选）：providers.ts L16-216；ai-model-state.ts L13-78；ai_model_registry.rs L185-207；agent.rs L1556-1712；provider.rs L159-193。

#### 关联需求

- 需求：ai-01-requirements.md S24（模型目录与信任状态管理），优先级 P1。
- 痛点：P04（数据越界与安全风险）。
- 执行路径：支撑性场景（模型配置与信任判定），不绑定单一执行路径。

### S25: 外部 CLI agent（ACP）接入

#### 功能入口与表面

内置 CLI agent 目录（15 个，偏差 D7）与 ACP 交互式会话（执行路径②）：目录选择/安装入口、各 CLI 自身账号登录、会话任务下发、越权审批卡（权限 diff 审阅）、turn 变更审阅。

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
- 内置 agent 数量为 15 个（文档写 14，偏差 D7，按实现记录）。
- 证据（inventory 节选）：builtin_agents.rs L23-196；acp/runtime.rs L187-216, L2899-3210；permission_view.rs L8-99；acp/review.rs L49-55。

#### 关联需求

- 需求：ai-01-requirements.md S25（外部 CLI agent（ACP）接入），优先级 P1。
- 痛点：P03（外部 AI 工具与项目上下文割裂）。
- 执行路径：②。

### S26: Research Task 隔离执行

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
- 默认预算 120 分钟、单 run 60 分钟（文档写 30 分钟，偏差 D9，按实现记录）。
- Git 项目使用 worktree 隔离，覆盖 manifest 包含未提交修改；非 Git 项目使用 staged snapshot。
- apply 校验文件前后 hash；hash 不符时经 journal 回滚，不留下半套用的结果；证据检查只产生警告，不是 apply 门禁。
- 本机 run 无 sandbox 时拒绝启动并明确说明，不退化为无隔离执行；Windows sandbox 默认关闭。
- 证据（inventory 节选）：research-tasks-flag.ts L10-27；research/model.rs L131-215, L917-924；isolation.rs L110-268；apply.rs L478-583；runs/local.rs L191-198。

#### 关联需求

- 需求：ai-01-requirements.md S26（Research Task 隔离执行），优先级 P1。
- 痛点：P01、P02。
- 执行路径：③。

### S27: MCP 双向集成

#### 功能入口与表面

MCP 双向集成（执行路径⑤，双向均默认关闭）：对外方向为 MCP server 开关与 localhost URL+bearer 复制入口；对内方向为外部 MCP server 的添加配置与逐调用确认。

#### 关键交互

1. 开启 MCP server，复制 localhost URL+bearer 到外部 client；
2. 外部 client 调用读工具（renderer 断开后仍可用），写操作经审批；
3. 反向添加外部 MCP server；
4. 内置助手调用外部 server 工具时每次调用需确认（默认 ask），传出的参数经脱敏与截断处理。

#### 能力与限制

- renderer 断开后 native 仅保留 6 个只读工具，写能力不可用（文档写可写，偏差 D8，按实现记录）。
- bearer 采用常量时间比较，不泄露时序信息。
- tool call 超时 300s；renderer lease 45s。
- auto-approve 规则不含 delete 类操作。
- 无副本隔离是本路径与 Copilot/ACP/Research 的本质差异，不得混称。
- 证据（inventory 节选）：config.rs L282-285；mcp/server_request.rs L41-265；mcp/native.rs L8-191；mcp/server.rs L20-27；mcp-approvals.ts L4-62；mcp-agent-tools.ts L21-229。

#### 关联需求

- 需求：ai-01-requirements.md S27（MCP 双向集成），优先级 P1。
- 痛点：P03、P04。
- 执行路径：⑤。

### S28: Computer Use 白名单操作

#### 功能入口与表面

Computer Use（Cua）能力：Cua Driver 安装入口、功能开关与 app/site 白名单配置、bounded manifest 操作执行、关键动作审批、撤销/停止入口。S26 执行环境选项中的 Cua 即依赖本场景能力。

#### 关键交互

1. 安装 Cua Driver；
2. 开启功能并配置至少一个 app/site 白名单条目（enabled + 白名单非空才 ready）；
3. agent 以 bounded manifest 在白名单范围内执行 GUI 操作；
4. 关键动作逐次审批；已登录浏览器会话中的操作每次询问；
5. 操作可撤销、可停止。

#### 能力与限制

- 默认全关：功能开关与白名单均须显式开启/配置才 ready。
- 旧配置迁移可能继承 `askBeforeActions=true`（不是新装默认）。
- Cua Space 是真实计算机，不是本地沙箱，不得以沙箱口径宣传。
- 证据（inventory 节选）：cua_driver/config.rs L16-109；gate.rs L19-22；docs/desktop-apps.md L62-77；docs/Skills.md L303-320。

#### 关联需求

- 需求：ai-01-requirements.md S28（Computer Use 白名单操作），优先级 P2。
- 痛点：P01、P04。
- 执行路径：支撑性能力（GUI 自动化），供 S26 等场景选作执行环境。

### UI 表面清单（ai 模块）

> 现状清单，非原型。仅列上文各场景可由事实来源确认的表面。

| 表面 | 所属场景 | 说明 |
|---|---|---|
| Copilot 会话界面 | S21 | 任务交办、Plan/执行模式 |
| diff 审批卡（ToolConfirm） | S21 | 逐步工具变更审批 |
| turn Review | S21 | 逐文件 Undo/Redo |
| Skills 管理（bundled/shelf/user） | S22 | 技能管理与 `/skill-id` 调用 |
| 终端 CLI | S23 | `oleafly ask` / `agent run`，无独立 GUI 表面 |
| 模型目录与 provider 配置 | S24 | provider key/custom endpoint/Ollama、三态列表、probe |
| 内置 CLI agent 目录 | S25 | 15 个内置 agent 的选择/安装 |
| ACP 会话与权限审批卡 | S25 | 任务下发、权限 diff 审阅、turn 变更审阅 |
| Research Tasks 界面 | S26 | brief、plan.md 审阅、执行环境选择、run 进度、apply |
| MCP server 开关与连接信息 | S27 | localhost URL+bearer 复制 |
| 外部 MCP server 配置 | S27 | 添加外部 server、逐调用确认 |
| Cua Driver 与白名单配置 | S28 | 功能开关、app/site 白名单、审批与停止 |
