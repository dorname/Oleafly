## Oleafly AI 与 Agent（ai）需求文档（现状基线）

> module: ai | 基线口径：桌面 0.4.11，绑定提交 `9c307bf3c`（HEAD，领先 v0.4.11 标签 3 个提交）
> 本文档为存量产品现状基线：只描述已实现能力，验收条件以实现与测试证据为准（见提案 `inventory.md`）。未经动态验证的行为均在边界中声明。

# Oleafly AI 与 Agent 需求文档

> 最后更新：2026-11-09

## 一、产品背景与目标

### 1.1 产品定位（本模块范围内）

ai 模块承载 Oleafly 的全部 AI 与 agent 能力：内置 Copilot、研究 Skills、无头 CLI、模型目录、外部 CLI agent（ACP）接入、Research Task、MCP 双向集成与 Computer Use。所有能力均服务于同一个写作工作区，但**执行路径彼此独立，不可混称**。

### 1.2 五条 AI 执行路径（不可混称）

产品背景必须明确：Oleafly 中存在五条 AI 执行路径，每条的运行主体、凭据来源与隔离机制各不相同，任何文档与宣传不得将其统一表述为一种"AI 模式"。

| # | 执行路径 | 运行主体与要点 | 隔离机制 |
|---|---------|--------------|---------|
| ① | 内置 Copilot | 由 Oleafly 自身运行 agent loop，工具变更经 diff 审批 | turn 快照 |
| ② | 交互式 ACP CLI agent | 外部 CLI agent（内置目录 15 个，D7），使用用户各自的外部账号 | ACP turn copy |
| ③ | Research Task | 自主长时任务，worktree/snapshot + 预算 + 选择性 apply | worktree+manifest（非 Git 项目 staged snapshot） |
| ④ | 无头 CLI | `oleafly ask` / `agent run`，默认只读，write 走 review copy | review copy |
| ⑤ | 外部 MCP client | 经 localhost+bearer 接入，写操作经审批 | 无副本 |

### 1.3 核心目标

- AI 辅助不改变"本地优先"属性：模型调用、文献检索等网络访问均为显式配置或显式动作，离线时按各场景声明的降级行为处理；
- 一切 AI 产生落盘写入的路径（①②③④）都有各自的隔离与回退机制，写前可审、写后可回退，五条路径的隔离机制不能互相替代或混称；
- 外部接入（MCP、ACP）默认关闭、写操作默认逐次审批，越界访问 fail closed。

### 1.4 目标用户画像

研究者与研究生：希望把文献检索、格式核验、批量修复等重复劳动交给 AI，但要求每一次落盘修改可审阅、可回退；部分用户自带外部 CLI agent（自有账号）或通过 MCP 将 Oleafly 接入自有工具链。

## 二、用户痛点分析（本模块相关）

### P01: 重复性研究与写作劳动密集
因为文献检索、DOI 核验、批量修复、格式转换等重复劳动占据研究时间 → 导致核心创作时间被挤压 → 造成研究产出效率低下。

### P02: AI 修改失控与不可回退的顾虑
因为通用 AI 工具的修改直接落在稿件上、缺少逐轮审查与回退 → 导致用户不敢把真实任务交给 AI → 造成 AI 能力利用率低、回到手工操作。

### P03: 外部 AI 工具与项目上下文割裂
因为外部 CLI agent、外部 MCP client 无法安全接入本地项目 → 导致用户在多个工具间手工搬运上下文 → 造成工作流断裂与转录错误。

### P04: 数据越界与安全风险
因为 AI/agent 可能触网、越权读写文件或执行命令 → 导致敏感数据外泄或项目被意外破坏 → 造成信任危机与稿件损失。

## 三、场景总览

| 编号 | 场景名称 | 触发条件 | 关联痛点 | 优先级 |
|------|---------|---------|---------|--------|
| S21 | 内置 Copilot 修复与逐轮审阅 | 需要修复/改写稿件 | P01、P02 | P0 |
| S22 | 研究 Skills 调用 | 文献检索、核验与成稿 | P01 | P0 |
| S23 | 无头 CLI 只读分析与受控写入 | 脚本化/自动化分析 | P01、P02 | P1 |
| S24 | 模型目录与信任状态管理 | 配置或更换模型 | P04 | P1 |
| S25 | 外部 CLI agent（ACP）接入 | 使用自带 CLI agent | P03 | P1 |
| S26 | Research Task 隔离执行 | 长时自主研究任务 | P01、P02 | P1 |
| S27 | MCP 双向集成 | 外部工具互操作 | P03、P04 | P1 |
| S28 | Computer Use 白名单操作 | GUI 自动化操作 | P01、P04 | P2 |

## 四、核心场景详述

### S21: 内置 Copilot 修复与逐轮审阅

- **触发条件**：用户需要 AI 修复编译错误、改写段落或批量调整稿件。
- **用户价值**：任务由 Oleafly 自身运行 loop 完成，每一步落盘变更可审、可逐轮回退（← P01、P02）。
- **优先级**：P0
- **主路径**：配置 provider/模型/审批模式 → 交办任务（可先以 Plan 模式做只读规划）→ 对每步工具变更做 diff 审批 → 编译后继续修复 → 在 turn Review 中逐文件 Undo/Redo。

#### 验收条件

##### 正常：任务执行与 diff 审批
- **GIVEN** 用户已配置 provider、模型与审批模式
- **WHEN** 内置 Copilot 执行交办任务
- **THEN** loop 由 Oleafly 运行，每步工具变更经 diff 审批后才落盘；编译报错可在同一会话中继续修复

##### 正常：turn Review 逐文件回退
- **GIVEN** 某个 turn 已产生多文件变更
- **WHEN** 用户在 turn Review 中逐文件执行 Undo/Redo
- **THEN** 变更可按文件回退或恢复；Undo 只处理未提交、未与其他变更重叠、且事后未被再次编辑的文件

##### 异常：审批规则读取失败
- **GIVEN** run 启动时审批规则无法读取
- **WHEN** 用户交办任务
- **THEN** 该 run 被终止，不得在缺失审批规则约束的情况下继续执行

##### 边界：只读语义与快照上限
- Plan 模式的"只读"**不等于离线**：仍包含文献检索等网络读取，不得宣传为离线模式
- turn 快照有上限（20000 文件 / 单文件 25MiB / 单 turn 512MiB / 总量 1GiB），保留 100 turns / 14 天
- 切换项目后，旧项目的进行中调用不再执行

### S22: 研究 Skills 调用

- **触发条件**：用户需要按既有研究流程检索文献、核验 DOI 并成稿。
- **用户价值**：可复用的研究技能以声明式步骤执行，.bib 变更经审批后编译（← P01）。
- **优先级**：P0
- **主路径**：管理 bundled/shelf/user 三类技能 → 以 `/skill-id` 显式调用或由助手自动选择 → 执行检索、核验、成稿 → 审批 .bib 变更后触发编译。

#### 验收条件

##### 正常：技能调用与 .bib 审批
- **GIVEN** 用户调用一个可用技能（bundled/shelf/user 任一来源）
- **WHEN** 技能完成检索、核验并产出稿件与 .bib 变更
- **THEN** .bib 变更经用户审批后写入并触发编译，新增引用进入本地引用流

##### 异常：离线降级
- **GIVEN** 无网络
- **WHEN** 技能需要文献搜索或 DOI 核验
- **THEN** 这些网络环节明确不可用；shelf 技能以每日缓存的目录副本离线回退，不假装修复成功

##### 边界：目录与信任
- 新技能默认开启；shelf 目录每日缓存
- catalog 限 8MiB、archive 限 64MiB 并带 checksum 校验，但**校验不替代对技能脚本内容的人工信任**——用户仍须自行审阅脚本后再启用

### S23: 无头 CLI 只读分析与受控写入

- **触发条件**：用户在终端/脚本中以 `oleafly ask`、`agent run` 驱动无头 agent。
- **用户价值**：默认只读安全分析，写入必须经 review copy、dry-run 预演后 apply（← P01、P02）。
- **优先级**：P1
- **主路径**：默认只读运行分析 → 需要写入时以 `--allow write` 运行，变更落在 review copy → 查看变更清单 → dry-run 预演 → apply 到项目。

#### 验收条件

##### 正常：默认只读
- **GIVEN** 以默认参数运行 `oleafly ask` / `agent run`
- **WHEN** agent 完成任务
- **THEN** write、commands、network 权限全部为 false，仅产出分析结果，项目文件无任何改动

##### 正常：受控写入与 apply
- **GIVEN** 以 `--allow write` 运行
- **WHEN** agent 修改项目文件
- **THEN** 变更写入 `.oleafly` 内的 review copy（review 目录必须在 `.oleafly` 内）；用户查看变更清单并 dry-run 预演后才 apply 到项目

##### 异常：workspace 越界
- **GIVEN** agent 试图访问 workspace 之外的路径
- **WHEN** 出现绝对路径、`..`、`.git`、`.oleafly`、`.private`、NTFS 短名等越界目标，或超过 20000 文件 / 2GiB 上限
- **THEN** 一律拒绝；`--unsandboxed-commands` 是显式高风险逃生口，仅由用户主动给出时生效

##### 异常：apply 冲突
- **GIVEN** review copy 生成后项目文件又发生了变化
- **WHEN** 执行 apply
- **THEN** 检测到冲突即退出，退出码 8，不做部分合入

### S24: 模型目录与信任状态管理

- **触发条件**：用户配置 provider key、custom endpoint 或本地 Ollama，并需要判断模型可信状态。
- **用户价值**：每个模型都有明确的 Verified/Untested/Blocked 状态与真实探针依据（← P04）。
- **优先级**：P1
- **主路径**：配置 provider key / custom endpoint / Ollama → 刷新模型列表查看 Verified/Untested/Blocked → Untested 模型首次使用前跑真实 probe → 离线时按规则降级。

#### 验收条件

##### 正常：配置、刷新与 probe
- **GIVEN** 用户配置了 provider 或本地 Ollama
- **WHEN** 刷新列表并对 Untested 模型首次使用
- **THEN** 列表呈现三态信任状态；刷新有 30s 节流、24h 自动刷新；Untested 模型跑真实 probe（hosted 30s / 自托管 120s 超时）

##### 正常：离线与失败保留
- **GIVEN** 刷新失败或处于离线状态
- **WHEN** 查看模型列表
- **THEN** 保留既有旧列表继续可用，不出现空白或错误状态冒充成功

##### 异常：blocked 两类语义
- **GIVEN** 模型处于 blocked 状态
- **WHEN** 尝试使用
- **THEN** 区分两类：catalog blocked 一律拒绝；probe blocked 允许在**无工具 plain chat** 场景使用（实现现状，纠正文档概括，见偏差 D10）

##### 边界：自托管判定
- localhost 与私网地址的 provider 一律按自托管策略处理（probe 超时等），不套用 hosted 规则

### S25: 外部 CLI agent（ACP）接入

- **触发条件**：用户希望使用自带的外部 CLI agent（使用各自的外部账号）处理项目任务。
- **用户价值**：外部 agent 经 ACP 接入项目，越权即拒、turn 变更可审阅（← P03）。
- **优先级**：P1
- **主路径**：从内置目录（15 个，D7）选择/安装 CLI 并各自登录 → 新建会话下发任务 → 越权触发被拒绝或弹出审批卡 → 审阅 turn 变更。

#### 验收条件

##### 正常：接入与会话
- **GIVEN** 用户从内置目录选择并安装某个 CLI agent，完成其自身账号登录
- **WHEN** 新建会话并下发任务
- **THEN** agent 以交互式 ACP 会话运行，turn 产生的变更进入 turn copy 供审阅；内置 agent 数量为 15 个（文档写 14，见偏差 D7）

##### 异常：越权读取与 fail closed
- **GIVEN** agent 试图读取项目之外的文件，或访问未知路径
- **WHEN** 该请求到达
- **THEN** 项目外读取被拒绝；未知路径按 fail closed 处理，不得默认放行

##### 边界：turn copy 与权限卡
- turn copy 仅适用于非 task、非子会话、非 remote 场景
- 权限 diff 上限 96KiB、审批卡一次最多 16 个
- Research 场景使用临时 HOME 时，凭据文件权限为 0700/0600

### S26: Research Task 隔离执行

- **触发条件**：用户需要交给 AI 一个带目标、预算与权限约束的长时自主研究任务。
- **用户价值**：任务在 worktree/snapshot 隔离中后台运行，结果经校验后选择性 apply（← P01、P02）。
- **优先级**：P1
- **主路径**：在 Experimentation 中开启 Research Tasks → 撰写 brief（目标/成功标准/预算/权限）→ plan-first：审阅 plan.md 后放行 → 选择执行环境（本机/SSH/Slurm/Cua）→ 后台运行并查看 run 进度 → 选择性 apply。

#### 验收条件

##### 正常：隔离运行与 apply
- **GIVEN** Git 项目已写好 brief 且 plan 已审阅
- **WHEN** 启动 run 并在完成后 apply
- **THEN** run 在 worktree 中执行，覆盖 manifest 包含未提交修改；apply 前校验文件前后 hash，用户可选择性合入

##### 异常：apply 校验失败与回滚
- **GIVEN** apply 过程中发现文件 hash 与预期不符
- **WHEN** 应用变更
- **THEN** 经 journal 回滚，不留下半套用的结果

##### 异常：无 sandbox 拒绝启动
- **GIVEN** 本机 run 且环境不具备 sandbox
- **WHEN** 启动 run
- **THEN** 拒绝启动并明确说明，不得退化为无隔离执行

##### 边界：预算与快照
- 非 Git 项目使用 staged snapshot 而非 worktree
- 默认预算 120 分钟、单 run 60 分钟（文档写 30 分钟，见偏差 D9）
- Windows sandbox 默认关闭；证据检查只产生警告，不是 apply 门禁

### S27: MCP 双向集成

- **触发条件**：用户要把 Oleafly 能力暴露给外部 MCP client，或把外部 MCP server 接入 Oleafly。
- **用户价值**：双向互操作且默认收紧——server 默认关、外部调用默认逐次确认（← P03、P04）。
- **优先级**：P1
- **主路径**：开启 MCP server → 复制 localhost URL+bearer 到外部 client → 读工具在 renderer 断开后仍可用，写操作经审批 → 反向添加外部 MCP server，每次调用确认。

#### 验收条件

##### 正常：对外提供工具
- **GIVEN** MCP server 已开启，外部 client 持 localhost URL+bearer 接入
- **WHEN** 外部 client 调用读工具
- **THEN** 读工具可用；bearer 采用常量时间比较，不泄露时序信息

##### 正常：反向接入外部 server
- **GIVEN** 用户添加一个外部 MCP server
- **WHEN** 内置助手调用其工具
- **THEN** 每次调用需确认（默认 ask）；传给外部 server 的参数经脱敏与截断处理

##### 异常：renderer 断开降级
- **GIVEN** renderer 已断开
- **WHEN** 外部 client 继续调用 native 工具
- **THEN** 仅保留 6 个只读工具，写能力不可用（实现现状，文档写可写，见偏差 D8）

##### 边界：超时与审批
- tool call 超时 300s、renderer lease 45s
- auto-approve 规则不含 delete 类操作；无副本隔离是本路径与 Copilot/ACP/Research 的本质差异，不得混称

### S28: Computer Use 白名单操作（简要）

- **触发条件**：用户需要 agent 操作白名单内的桌面应用或网站（GUI 自动化）。
- **用户价值**：仅白名单内可操作，关键动作逐次审批、可撤销可停止（← P01、P04）。
- **优先级**：P2
- **主路径**：安装 Cua Driver → 开启功能并配置 app/site 白名单 → 以 bounded manifest 执行操作 → 关键动作逐次审批 → 可撤销/停止。

#### 验收条件

##### 正常：白名单内操作
- **GIVEN** 已安装 Cua Driver、功能开启且至少配置一个白名单条目（ready 前提）
- **WHEN** agent 执行白名单内的 GUI 操作
- **THEN** 操作限定在 bounded manifest 范围内，关键动作先经审批；已登录浏览器会话中的操作每次询问

##### 边界：默认与安全表述
- 默认全关：功能开关与白名单均须显式开启才 ready；旧配置迁移可能继承 `askBeforeActions=true`（不是新装默认）
- Cua Space 是**真实计算机**，不是本地沙箱，不得以沙箱口径宣传

## 五、约束与边界

### 5.1 技术约束

- **五条执行路径不可混称**（见 1.2）：隔离机制分别为 turn 快照 / ACP turn copy / worktree+manifest / review copy / 无副本，任何对外表述不得统一为一种"AI 沙箱"或"AI 模式"。
- **默认开关矩阵**（inventory 可查证口径）：
  - 内置 Copilot：审批模式默认 `approve-for-me`（实现证据 `packages/ai-tools/src/approval-risk.ts:10` DEFAULT_APPROVAL_MODE），write/shell 询问、Ask 另问 network、deny 始终优先，所有工具变更必须经 diff 审批落盘（S21）；
  - Skills：新技能默认开启，但 checksum 校验不替代对脚本内容的人工信任（S22）；
  - 无头 CLI：默认 write/commands/network 全为 false（S23）；
  - Research Task：默认关闭，须在 Experimentation 显式开启（S26）；
  - MCP：双向均默认关闭；对外工具写操作经审批，对外部 server 的调用默认逐次 ask，auto-approve 不含 delete（S27）；
  - Computer Use：默认全关，功能开启且白名单非空才 ready（S28）。
- 网络访问均为显式配置或显式动作：Plan 模式只读≠离线（S21）；文献搜索/DOI 核验需网络（S22）；无头 CLI 默认无网络（S23）。
- 偏差 D7/D8/D9/D10（ACP agent 数量 15、native 断开后 6 个只读工具、run 60 分钟、blocked 两类语义）按实现现状记录，文档回补另立变更。

### 5.2 现状声明（未验证项）

- 本基线为静态盘点：上文行为均有实现与测试证据（见 `inventory.md` ai 段证据列），但**未在本次执行任何测试**；真实模型调用、长时 Research run、Cua 实机操作等动态行为在 verify 阶段单独取证。

### 5.3 "不做"清单（本基线范围）

- 不新增任何功能或交互；只固化现状。
- 不在本模块内描述协作、云同步与交付链路（分属 collab/sync/delivery 模块）；终端 containment 与 Research 级 OS sandbox 的区别归 core（S15）表述。
- 不修复文档偏差本身（D7-D10 的文档回补另立变更），基线一律以实现为准。
