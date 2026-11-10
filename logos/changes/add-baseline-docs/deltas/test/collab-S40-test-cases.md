## ADDED — S40 浏览器实时协作 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S40 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S40 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S40 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S40-browser-collab.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：浏览器端协作是实时协作路径①的一个客户端；sync 模块的 Dropbox/Drive/S3 云同步、冲突副本与三方合并是**另一套正交机制**，浏览器端**不具备**云同步能力，本场景不涉及、不得混称。
> - 浏览器端（`web/`）与桌面端（`src/` + `src-tauri/`）是**同一协作协议的两个客户端**，但**路径语义不得混写**：浏览器走 `/web/ws` 与 `/web/api/*`、**会话 cookie** 认证；桌面走 `/ws` 与 `/api/v1/*`、**Bearer token** 认证。
> - **浏览器端只有 WS 重连，没有桌面端的 `/frames` + `/poll` long-poll 回退**。
> - **浏览器端没有离线编辑能力**：离线时的新编辑被拒；`sessionStorage` 约 2M 字符 / 7 天是**本标签页的未确认输入缓冲，不是跨设备离线队列**。
> - 浏览器端角色映射（`abilitiesFor` / `effectiveMode`）**只是 UI 呈现**，裁决仍在服务端逐 change 校验。
> - 生产浏览器**没有编译引擎**；fake engine 仅用于开发与测试环境。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（浏览器族端点 / 帧 / 客户端常量）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S40-01 | 浏览器实时通道端点为 `GET /web/ws`（Upgrade），**不是**桌面的 `/ws` | API delta §七、§八（`web/mod.rs:36`）；场景实现 §一 | Server 开启 `features.web` | 建立浏览器 WS | 连接升级成功并完成鉴权；不混用桌面 `/ws` |
| UT-S40-02 | 浏览器族 API 端点集合：`/web/api/me`、`/web/api/projects`、`/web/api/projects/{project}`、`/web/api/projects/{project}/texts`、`/web/api/projects/{project}/blobs/{hash}`、`/web/api/projects/{project}/output`、`/web/api/sign-out` | API delta §八（`web/mod.rs:37-49`） | 浏览器已登录 | 逐一访问 | 端点可达；与桌面 `/api/v1/*`（Bearer）分属不同路由族与认证方式 |
| UT-S40-03 | 浏览器族使用**会话 cookie** 认证，桌面 / API 族使用 `Authorization: Bearer`；二者不可混用 | API delta §3.2、§十二 | 浏览器已登录 | 浏览器族请求不带 Bearer；桌面族请求不带 cookie | 浏览器族凭 cookie 通过；桌面族凭 Bearer 通过；交叉使用均不被接受 |
| UT-S40-04 | 浏览器客户端帧族以 `t` 字段做内部标签，帧类型含 `open` / `change` / `close` / `mode` / `presence` / `comment` / `suggestion` / `chat` | 场景实现 §一、§三（`web/src/protocol.ts`） | 浏览器端已编译 | 构造各浏览器客户端帧 | `t` 字段取值合法；帧体字段齐备（`open.fileId`、`change.fileId/rev/op`、`mode.mode`、`presence.fileId/anchor/head`） |
| UT-S40-05 | 浏览器服务端帧族含 `hello`（`role` / `features` / `files` / `people` / `compile`）、`opened`、`ack`（`fileId` / `rev` / `length`）、`remote`（`fileId` / `rev` / `op` / `length`）、`reset`、`tree`、`presence`、`threads`、`suggestions`、`chat`、`output`、`access`、`done`、`error` | 场景实现 §三（`web/src/protocol.ts`） | 浏览器端已编译 | 反序列化各服务端帧 | 各帧字段可解析；`error.code` / `error.message` 可读；`reqId` 可为 `null` |
| UT-S40-06 | `WebFeatures` 只含 `comments` / `suggestions` / `chat` 三项（浏览器族功能开关子集） | 场景实现 §三 Step 3；`web/src/protocol.ts` | 收到 `hello` 帧 | 读取 `features` | 三项开关可读；浏览器端据此决定入口可用性 |
| UT-S40-07 | 浏览器 `hello` 帧回带当前角色 `role` 与在线人员 `people`，供前端做能力映射 | 场景实现 §三 Step 3 | 浏览器连接建立 | 读取 `hello` | `role` 为五档之一；`people` 列表可渲染在线成员 |
| UT-S40-08 | 浏览器 `ack` 帧含 `rev` 与 `length`；`length` 可为 `null`（长度未知时以 inflight 目标长度补齐） | 场景实现 §三 Step 6；`web/src/gateway.ts`（`routeDoc`） | 已提交一次编辑 | 读取 `ack` | 收到 `ack` 后清空 inflight；`length` 缺省时不影响收敛 |
| UT-S40-09 | 浏览器 `remote` 帧含 `fileId` / `rev` / `op` / `length`，用于携带并发变化 | 场景实现 §三 Step 9；`web/src/gateway.ts` | 其他端提交了变更 | 读取 `remote` | 远端变更被合并到本地编辑器 |
| UT-S40-10 | 浏览器 `access` 帧回带新的 `role` | 协议 delta §4.3（`access_changed` 对应语义）；`web/src/protocol.ts` | 角色被变更 | 读取 `access` | 前端据以更新角色能力映射 |
| UT-S40-11 | 浏览器重连退避常量：`RECONNECT_BASE_MS = 500`、`RECONNECT_MAX_MS = 15_000` | 场景实现 §四；`web/src/gateway.ts:73-74` | 浏览器网关可用 | 连续失败 N 次后计算延迟 | 延迟为指数退避（基准 500ms，上限 15s）并带抖动 |
| UT-S40-12 | 浏览器探测阈值 `PROBE_AFTER_FAILURES = 2` | 场景实现 §三 Step 7；`web/src/gateway.ts:75` | 浏览器网关可用 | 失败次数达到 2 | 触发探测（**不是** long-poll 回退） |
| UT-S40-13 | 浏览器单次变更上限 `MAX_CHANGE_BYTES = 10 * 1024 * 1024` | 场景实现 §四「单次变更过大」；`web/src/gateway.ts:76` | 浏览器网关可用 | 构造超过上限的变更 | 判为过大并提示；丢弃 inflight 后重新打开该文件（不静默失败） |
| UT-S40-14 | 浏览器会话失效错误码集合 `SIGNED_OUT_CODES = { unauthorized, signed_out, session_expired }` | 场景实现 §四「会话失效」；`web/src/gateway.ts:78` | 浏览器端 | 收到对应 `error.code` | 结束会话（视为登出） |
| UT-S40-15 | 浏览器访问终止错误码集合 `NO_ACCESS_CODES = { forbidden, not_found, removed, project_not_shared, archived }` | 场景实现 §四「会话失效」；`web/src/gateway.ts:79` | 浏览器端 | 收到对应 `error.code` | 结束当前访问（与 S41 的错误码口径一致） |
| UT-S40-16 | 浏览器端 `abilitiesFor(role, features)` 的能力映射：`edit` / `chooseMode` / `alwaysSuggest` / `comment` / `resolve` / `chat` / `clearChat` / `share` | 协议 delta §3.2；`web/src/roles.ts` | 浏览器端已登录 | 逐角色 × 开关组合调用 | Owner / Editor 可编辑并可选模式；Reviewer 恒 Suggesting；Commenter 仅评论与聊天；Viewer 只读；`clearChat` 仅 Owner |
| UT-S40-17 | 浏览器端 `effectiveMode(role, chosen, features)`：Reviewer 恒为 `suggesting`；Owner / Editor 在 `features.suggestions` 开启时才可自由选模式，否则恒为 `editing` | `web/src/roles.ts` | 浏览器端已登录 | 逐角色 × 选定模式调用 | 结果与映射一致；Reviewer 无「切换到直接编辑」的路径 |
| UT-S40-18 | `sessionStorage` 未确认输入缓冲上限 `MAX_UNSENT_CHARS = 2_000_000` | 场景实现 §一、§四；`web/src/unsent.ts:13` | 浏览器端可用 | 写入超过上限的未确认输入 | 超出部分不被保留（写入被截断 / 拒绝），不无限增长 |
| UT-S40-19 | 未确认输入缓冲的有效期上限 `MAX_UNSENT_AGE_MS = 7 * 24 * 60 * 60 * 1000`（7 天） | 场景实现 §一；`web/src/unsent.ts:14` | 浏览器端可用 | 读取超过 7 天的条目 | 过期条目被丢弃，不被当作待恢复输入 |
| UT-S40-20 | 未确认输入的存储键带前缀 `oleafly.web.unsent.v1.` 且按项目分区 | `web/src/unsent.ts:12` | 浏览器端可用 | 检查写入键 | 键按前缀 + 项目标识组织；不同项目互不串用 |
| UT-S40-21 | 浏览器端**不存在** long-poll 回退端点调用：`/api/v1/projects/{project}/frames` 与 `/poll` 属 Bearer 认证的桌面族，浏览器不调用 | API delta §7.3、§八；场景实现 §四 | 浏览器端 WS 断开 | 观察网络请求 | 不出现 `/frames` / `/poll` 请求；只有 WS 重连 |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S40-22 | `web_sessions.token_hash` 为主键：同一会话令牌只有一行，且**只存哈希不存明文令牌** | DB delta §三 F 组（0018）；`0018_web_sessions.sql` | 浏览器已登录 | 检查 `web_sessions` 内容 | 只有哈希列；无明文令牌列或值；重复令牌被主键约束拒绝 |
| UT-S40-23 | `web_sessions.device_id` 为 UNIQUE 且外键指向 `devices(id)`：一台设备只保留一个浏览器会话 | DB delta §二（0018）；`0018_web_sessions.sql` | 已有会话 | 为同一 `device_id` 再插一行 | 被 UNIQUE 拒绝；设备删除时会话行级联清理 |
| UT-S40-24 | `web_sessions.account_id` 外键指向 `accounts(id)` 且 `ON DELETE CASCADE` | DB delta §三 F 组（0018） | 已有会话 | 删除账号 | 会话行随之删除；无悬挂会话 |
| UT-S40-25 | `web_sessions.mode` 的 CHECK 只允许 `'editing'` / `'suggesting'` | DB delta §二（0018）；`0018_web_sessions.sql` | 已有会话 | 写入 `'suggesting'` / 写入 `'viewing'` | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S40-26 | `web_sessions.expires_at` 记录到期时刻；`web_sessions_expires` 索引支持按到期时间清理 | DB delta §三 F 组（0018） | 已有会话 | 读取到期时间与索引 | 到期时间可查；过期会话可被清理路径命中 |
| UT-S40-27 | `project_updates` UNIQUE `(project_id, batch_id)`：浏览器端提交的变更同样幂等 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 重发同一批次 | 被 UNIQUE 拒绝；不重复存储 |
| UT-S40-28 | `project_updates` PK `(project_id, seq)` 与 `envelope` NOT NULL | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 插入空 envelope / 重复 seq | 分别被 NOT NULL 与主键约束拒绝 |
| UT-S40-29 | `projects.comments_enabled` 的 CHECK 只允许 `0` / `1`：浏览器端评论入口受项目级开关约束 | DB delta §二（0004 / 0015） | 项目已建立 | 写入 `0` / 写入 `2` | 合法值成功；非法值被 CHECK 拒绝 |

### 1.3 来源分组：业务规则（角色能力、断线恢复、ack 丢失、离线拒绝、边界声明）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S40-30 | 浏览器端按角色映射能力：Owner / Editor 可编辑并可切换模式，Reviewer 固定 Suggesting，Commenter 仅评论与聊天，Viewer 只读 | 需求 §四 S40「正常」；场景实现 §三 Step 3 | 浏览器已登录 | 逐角色调用 `abilitiesFor` / `effectiveMode` | 与角色定义一致；Reviewer 无直接编辑路径 |
| UT-S40-31 | 浏览器端角色映射**只是 UI 呈现**：绕过前端直接构造越权请求仍被服务端逐 change 校验拒绝 | 场景实现 §五「安全边界」；inventory S33/S40 行 | 已建立浏览器会话 | 直接构造越权帧 | 服务端拒绝；客户端 UI 隐藏按钮不构成安全边界 |
| UT-S40-32 | 浏览器端编辑后记录 **inflight**（未确认变更），收到 `ack` 后清空 | 场景实现 §三 Step 4、Step 6 | 已提交一次编辑 | 观察 inflight 状态 | 编辑后 inflight 非空；收到 `ack` 后被清空 |
| UT-S40-33 | 断线重连按 `reconnectDelay`（指数退避 + 抖动，基准 500ms、上限 15s）执行 | 场景实现 §三 Step 7、§四 | 浏览器 WS 断开 | 连续失败 | 延迟按指数退避增长且不超过 15s；不同客户端不同频 |
| UT-S40-34 | 浏览器端**没有 long-poll 回退**：WS 断线只做 WS 重连 | 需求 §四 S40「边界：无 long-poll 回退」；场景实现 §四 | 浏览器 WS 断开 | 观察网络行为 | 不出现 `/frames` / `/poll`；与桌面端回退明确区分 |
| UT-S40-35 | 浏览器端**没有离线编辑能力**：离线时的新编辑被拒（`OfflineError`）；文档通道未打开、正在恢复或不在线时同样拒绝 | 需求 §四 S40「异常：离线新编辑被拒」；场景实现 §四 | 浏览器离线 / 通道未就绪 | 发起新编辑 | 抛出 `OfflineError` 并被拒绝；不产生待发离线队列 |
| UT-S40-36 | 未确认输入保留在 `sessionStorage`（约 2M 字符 / 7 天上限），重连成功后恢复 inflight 通道与这些未确认输入 | 场景实现 §三 Step 8；§四 | 断线期间有未确认输入 | 重连成功 | inflight 通道恢复；未确认输入被恢复并可继续提交 |
| UT-S40-37 | `sessionStorage` 缓冲**是本标签页的未确认输入缓冲，不是跨设备离线队列** | 场景实现 §一、§四 | 另一设备登录同一账号 | 检查另一设备 | 另一设备看不到本标签页的未确认输入；不提供跨设备补发承诺 |
| UT-S40-38 | **ack 丢失**场景：服务端以 `remote` 帧带回并发变化，浏览器端对 inflight 操作执行 `transform` 后重发 | 场景实现 §三 Step 9；§四 | 断线期间服务端已接受变更但 ack 未送达 | 重连后接收 `remote` 帧 | 对 inflight 与远端操作执行 `TextOperation.transform` 后重发；不产生重复内容 |
| UT-S40-39 | **transform 失败**则丢弃 inflight 并重新打开该文件 | 场景实现 §三 Step 9；§四 | transform 不可行 | 触发该分支 | inflight 被丢弃；该文件被重新打开；不静默失败 |
| UT-S40-40 | 单次变更过大时判为过大并提示，丢弃 inflight 后重新打开该文件 | 场景实现 §四「单次变更过大」 | 变更超过 `MAX_CHANGE_BYTES` | 提交过大变更 | 提示过大；inflight 被丢弃；文件重新打开 |
| UT-S40-41 | 浏览器端会话失效或权限终止时按错误码结束访问（`SIGNED_OUT_CODES` / `NO_ACCESS_CODES`） | 场景实现 §四「会话失效」；需求 §四 S41 | 会话过期或权限终止 | 收到对应错误码 | 结束当前访问 / 视为登出；浏览器端据此清理状态 |
| UT-S40-42 | **生产浏览器没有编译引擎**：浏览器只读取 Owner / Editor 上传的输出；fake engine 仅用于开发与测试环境 | 需求 §四 S42；场景实现 §五「生产与测试边界」 | 生产环境浏览器 | 尝试触发编译 | 无编译能力；仅可读取已上传输出；测试用 fake engine 不被当作生产能力 |
| UT-S40-43 | 项目内容**不是端到端加密**：Server 能力 `encryption = none` | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；不宣称 E2E 加密 |
| UT-S40-44 | 浏览器与桌面是**同一协作协议的两个客户端**：会话按 min/max 协商确定，协议不兼容即停止同步 | 场景实现 §五「协议边界」；需求 §四 S29 | 两端分别连接 | 协议区间无交集 | 双方均停止同步并明确报告；不回退到更旧协议 |

---

## 二、场景测试用例

### 2.1 主路径：浏览器实时协作

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S40-01 | 浏览器登录并按角色协作（编辑 / 建议 / 评论 / 聊天 / presence） | Step 1→6 | Server 开启 `features.web`；浏览器已登录并具备相应项目角色 | ① 浏览器打开共享项目 → ② 经 `/web/ws` 建立 WS 并完成鉴权 → ③ 前端按角色映射能力（Reviewer 固定 Suggesting）→ ④ 用户编辑文本并记录 inflight → ⑤ 服务端逐 change 校验并落库 → ⑥ 收到 `ack` 清空 inflight，其他端收到 `remote` 帧合并内容，presence 同步在线状态与光标 | 各类操作**按角色边界**执行；编辑被 ack 确认；远端变更与 presence 实时同步；内容在各端收敛 |
| ST-S40-02 | 浏览器端断线恢复：恢复 inflight 与 sessionStorage 未确认输入 | Step 7→8 | 浏览器在线协作且有未确认输入 | ① 断开网络 → ② 观察重连退避（500ms 基准 / 15s 上限）→ ③ 恢复网络并重连成功 → ④ 观察 inflight 通道与未确认输入 | 重连成功；inflight 通道恢复；`sessionStorage` 中的未确认输入被恢复并可继续提交；未确认输入受 2M 字符 / 7 天上限约束 |
| ST-S40-03 | ack 丢失场景经 transform 处理后重发 | Step 9 | 断线期间服务端已接受变更但 ack 未送达 | ① 重连 → ② 服务端以 `remote` 帧带回并发变化 → ③ 浏览器对 inflight 执行 transform → ④ 重发 | inflight 经 transform 后重发成功；**不产生重复内容**；transform 失败时按失败分支处理 |

### 2.2 异常路径

> EX 编号与 `collab-S40-browser-collab.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S40-01 | WS 断线 | 浏览器端 WebSocket 断线 | S40-AC-03 |
| EX-S40-02 | 离线新编辑 | 浏览器处于离线状态 | S40-AC-02 |
| EX-S40-03 | sessionStorage 上限 | 未确认输入积压 | S40-AC-02 |
| EX-S40-04 | ack 丢失 | 断线期间服务端已接受变更但 ack 未送达 | S40-AC-01 |
| EX-S40-05 | 单次变更过大 | 变更帧超过浏览器端单次上限 | S40-AC-01 |
| EX-S40-06 | 会话失效 | 浏览器会话过期或权限终止 | S40-AC-01 |
| EX-S40-07 | 越权操作 | 浏览器端构造超出角色的请求 | S40-AC-01 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S40-04 | WS 断线只有重连、无 long-poll 回退 | EX-S40-01 | 浏览器在线协作 | 断开浏览器 WS | 客户端按指数退避 + 抖动（500ms 基准 / 15s 上限）重连；**不发起** `/frames` / `/poll`；与桌面端回退行为明确区分 |
| ST-S40-05 | 离线时的新编辑被拒绝 | EX-S40-02 | 浏览器离线（或通道未打开 / 正在恢复 / 不在线） | 发起新编辑 | 抛出 `OfflineError` 并拒绝；**不产生离线编辑队列**；界面给出明确反馈 |
| ST-S40-06 | sessionStorage 未确认输入受 2M 字符 / 7 天上限约束 | EX-S40-03 | 未确认输入持续积压 | 写入超限 / 超期输入 | 超出上限或超过 7 天的部分不被保留；**不承诺跨设备离线队列** |
| ST-S40-07 | ack 丢失后经 transform 重发 | EX-S40-04 | 断线期间服务端已接受变更但 ack 未送达 | 重连并接收 `remote` 帧 | 对 inflight 执行 transform 后重发，内容不重复；transform 失败则丢弃 inflight 并重新打开该文件 |
| ST-S40-08 | 单次变更过大被提示并重新打开文件 | EX-S40-05 | 变更超过 `MAX_CHANGE_BYTES` | 提交过大变更 | 判为过大并提示；inflight 被丢弃；文件重新打开；不静默失败 |
| ST-S40-09 | 会话失效或权限终止时结束访问 | EX-S40-06 | 会话过期 / 权限终止 | 收到 `unauthorized` / `signed_out` / `session_expired` / `forbidden` / `not_found` / `removed` / `archived` 等错误码 | 结束当前访问（登出或无权限）；浏览器端清理相应状态 |
| ST-S40-10 | 绕过前端构造的越权请求仍被服务端拒绝 | EX-S40-07 | 已建立浏览器会话 | 直接构造超出角色的帧 | 服务端逐 change 校验并拒绝；浏览器端角色映射只是 UI 呈现，不是安全边界 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S40-11 [manual] | 浏览器端按角色的协作呈现 | Step 1→6 | 真实浏览器 + 真实 Server，分别以 Owner / Reviewer / Commenter / Viewer 登录 | 分别操作并观察入口可见性与变更形态 | 人工确认 Reviewer 恒为 Suggesting、Commenter 无编辑入口、Viewer 完全只读（视觉与交互需人工确认） |
| ST-S40-12 [manual] | 浏览器断线恢复的真实体验 | Step 7→9 | 可断网的真实浏览器环境 | 断网编辑 → 恢复网络 → 观察重连与未确认输入恢复 | 人工确认恢复过程无重复内容、无静默丢失（真实网络时序不可在 CI 稳定断言） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S40-AC-01（正常：浏览器按角色协作）→ ST-S40-01、ST-S40-02、ST-S40-03、ST-S40-07、ST-S40-08、ST-S40-09、ST-S40-10、UT-S40-01 ~ UT-S40-10、UT-S40-16、UT-S40-17、UT-S40-27、UT-S40-28、UT-S40-30 ~ UT-S40-34、UT-S40-38、UT-S40-39、UT-S40-40、UT-S40-41、UT-S40-44
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S40-AC-02（异常：离线新编辑被拒）→ ST-S40-05、ST-S40-06、UT-S40-18、UT-S40-19、UT-S40-20、UT-S40-35、UT-S40-37
  - S40-AC-03（边界：无 long-poll 回退）→ ST-S40-04、UT-S40-11、UT-S40-12、UT-S40-21、UT-S40-33、UT-S40-34
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S40-01→ST-S40-04、EX-S40-02→ST-S40-05、EX-S40-03→ST-S40-06、EX-S40-04→ST-S40-07、EX-S40-05→ST-S40-08、EX-S40-06→ST-S40-09、EX-S40-07→ST-S40-10（7/7 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「浏览器族端点与帧中不可省略的字段」等价覆盖：`/web/ws`（UT-S40-01）、浏览器族 API 端点集（UT-S40-02）、cookie 与 Bearer 分族（UT-S40-03）、浏览器客户端帧族（UT-S40-04）、浏览器服务端帧族（UT-S40-05）、`WebFeatures`（UT-S40-06）、`hello.role` / `people`（UT-S40-07）、`ack.rev` / `length`（UT-S40-08）、`remote` 字段（UT-S40-09）、`access.role`（UT-S40-10）、退避与探测常量（UT-S40-11、UT-S40-12）、变更上限（UT-S40-13）、错误码集合（UT-S40-14、UT-S40-15）、角色能力映射（UT-S40-16、UT-S40-17）、`sessionStorage` 上限与键（UT-S40-18 ~ UT-S40-20）、浏览器不调用桌面 long-poll 端点（UT-S40-21）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；浏览器族新增帧字段或端点时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `web_sessions.token_hash` PK 与只存哈希（UT-S40-22）、`web_sessions.device_id` UNIQUE 与 FK（UT-S40-23）、`web_sessions.account_id` FK（UT-S40-24）、`web_sessions.mode` CHECK（UT-S40-25）、`web_sessions.expires_at` 与到期索引（UT-S40-26）、`project_updates` UNIQUE `(project_id, batch_id)`（UT-S40-27）、`project_updates` PK 与 NOT NULL（UT-S40-28）、`projects.comments_enabled` CHECK（UT-S40-29）。
  - **未覆盖（说明原因）**：Server 数据库其余 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S31 / S32 / S33 / S34 / S35 / S41 的 DB 分组登记，本文件不重复登记以免越界。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景是**浏览器端协作行为**；Server 部署形态、安装器、健康检查与升级迁移属 `delivery` 模块 S51，浏览器 E2E 使用 fake engine 且**不等同生产**（属 S42 口径），本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S40-AC-01 | **正常：浏览器按角色协作** — GIVEN 用户在浏览器登录 Server / WHEN 按所授角色编辑/建议/评论/聊天/查看 presence / THEN 操作按角色边界执行；断线恢复时 inflight 请求与 sessionStorage 未确认输入被恢复（ack 丢失场景经 transform 处理） | ST-S40-01, ST-S40-02, ST-S40-03, ST-S40-07, ST-S40-08, ST-S40-09, ST-S40-10, UT-S40-01, UT-S40-02, UT-S40-03, UT-S40-04, UT-S40-05, UT-S40-06, UT-S40-07, UT-S40-08, UT-S40-09, UT-S40-10, UT-S40-13, UT-S40-14, UT-S40-15, UT-S40-16, UT-S40-17, UT-S40-27, UT-S40-28, UT-S40-30, UT-S40-31, UT-S40-32, UT-S40-36, UT-S40-38, UT-S40-39, UT-S40-40, UT-S40-41, UT-S40-44 |
| S40-AC-02 | **异常：离线新编辑被拒** — GIVEN 浏览器处于离线状态 / WHEN 发起新编辑 / THEN 被拒绝——浏览器没有离线编辑能力；sessionStorage 约 2M 字符/7 天上限，不是跨设备离线队列 | ST-S40-05, ST-S40-06, UT-S40-18, UT-S40-19, UT-S40-20, UT-S40-29, UT-S40-35, UT-S40-37 |
| S40-AC-03 | **边界：无 long-poll 回退** — GIVEN 浏览器端 WS 断线 / WHEN 重连 / THEN 只有 WS 重连，没有桌面端的 `/frames`+`/poll` long-poll 回退 | ST-S40-04, UT-S40-11, UT-S40-12, UT-S40-21, UT-S40-33, UT-S40-34 |

> 追溯说明：`S40-AC-01` ~ `S40-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S40 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
