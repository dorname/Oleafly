## S30 实时共同编辑 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S30 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S30 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S30 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S30-live-coediting.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：本场景是自建 Server + Loro change log 的多端实时收敛（路径①），与 sync 模块的 Dropbox/Drive/S3 文件同步、冲突副本、三方合并是两套正交机制，不得混称。
> - 权限裁决在**服务端逐 change 校验**，客户端 UI 不是安全边界。
> - 项目内容**不是端到端加密**：Server 能力清单 `encryption = none`。
> - 传输回退（WS→`/frames`+`/poll`）是**桌面端专属**，浏览器端无（见 S31 / S40）。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（协作 wire 协议 v1 / 实时通道端点）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S30-01 | 帧统一用 `#[serde(tag = "type", rename_all = "snake_case")]` 内部标签编码，帧体字段平铺在同一 JSON 对象 | 协议 delta §4.1（`frames.rs:12-13`） | 协议 crate 已编译 | 序列化任一客户端帧 | 顶层出现 `"type"` 字段且值为 snake_case；其余字段与帧体平铺，无嵌套 `payload` 包装 |
| UT-S30-02 | `ClientFrame::Update` 必含 `project_id` 与 `envelope` | 协议 delta §4.2（`frames.rs:40-44`） | 已建立会话 | 构造 `update` 帧 | 两字段均被写出；缺任一字段的构造被拒 |
| UT-S30-03 | `Envelope` 字段集合：`v`、`project_id`、`batch_id`、`device_id`、`mode`、`key_epoch`、`payload`、`signature` | 协议 delta §五（`envelope.rs:17-27`） | 构造信封 | 完整信封 | 全部字段存在；`key_epoch` 可为 `None` |
| UT-S30-04 | `Envelope.mode` 取值为 `plain` / `e2ee` / 兜底未知；`e2ee` 时 `key_epoch` 才有意义 | 协议 delta §五（`envelope.rs:8-14`） | 构造信封 | `mode = plain` / `mode = e2ee` | 两者都被接受；`mode = plain` 时 `key_epoch` 不参与判定。**注意**：Server 当前声明 `encryption = none`，不得据此推断已启用端到端加密 |
| UT-S30-05 | `payload` 与 `signature` 为 base64url 字节序列 | 协议 delta §五 | 构造信封 | 含非 base64url 字符的字节 | 编码为合法 base64url；解码可还原原字节 |
| UT-S30-06 | 信封签名域常量 `SIGNING_DOMAIN = b"oleafly-envelope/v1\0"`（信封层版本化域，与 `PROTOCOL_VERSION` 无关） | 协议 delta §五（`envelope.rs:5`） | 签名模块可用 | 签名后再验签 | 验签通过；换用协议版本号作为签名域不通过 |
| UT-S30-07 | `ClientFrame::Subscribe` 必含 `project_id` 与 `since_seq`（增量起点） | 协议 delta §4.2（`frames.rs:31-35`） | 客户端重连 | 构造 `subscribe` 帧 | 两字段均被写出；`since_seq` 用于定位缺口 |
| UT-S30-08 | `ClientFrame::Presence` 必含 `project_id` 与 `state`；`PresenceState` 含可选 `file_id` / `cursor` / `anchor` | 协议 delta §4.2、§4.5（`frames.rs:45-49`、`projects.rs:102-106`） | 客户端在线 | 构造 presence 帧 | 三个可选字段均可缺省为 `None`；`file_id` / `cursor` / `anchor` 有值时被正确写出 |
| UT-S30-09 | `ClientFrame::PresenceLeave` 必含 `project_id` | 协议 delta §4.2（`frames.rs:50-53`） | 客户端离开 | 构造 `presence_leave` 帧 | 字段被写出 |
| UT-S30-10 | `ServerFrame::Ack` 必含 `project_id`、`batch_id`、`seq`（`batch_id` 为幂等依据） | 协议 delta §4.3（`frames.rs:144-149`） | 服务端已接受一批 | 读取 ack 帧 | 三字段齐备；客户端据此清除该批待发内容 |
| UT-S30-11 | `ServerFrame::Subscribed` 必含 `project_id`、`role`、`head_seq`，`since_batch` 可选 | 协议 delta §4.3（`frames.rs:128-136`） | 订阅成功 | 读取 subscribed 帧 | 角色与队头序号随订阅确认回传；`since_batch` 缺省时为 `None` |
| UT-S30-12 | `ServerFrame::Update` 必含 `project_id`、`seq`、`envelope`，`account_id` 可选 | 协议 delta §4.3（`frames.rs:137-143`） | 广播增量 | 读取 update 帧 | 变更与来源账号可解析；`account_id` 缺省不导致解析失败 |
| UT-S30-13 | `ServerFrame::Presence` / `PresenceLeft` 必含 `project_id` 与 `device_id`；`PresenceLeft` 无 `account_id` | 协议 delta §4.3（`frames.rs:154-166`） | 在线状态变化 | 读取两类帧 | 在线名单可更新；离线广播只带设备标识 |
| UT-S30-14 | 帧枚举两端均带 `#[serde(other)] Unknown` 兜底：未知帧类型不导致反序列化失败 | 协议 delta §4.1（`frames.rs:35-37`、`:164-166`） | 收到未知帧类型 | 反序列化未知 `type` | 落 `Unknown` 兜底变体；不抛解析异常 |
| UT-S30-15 | `FrameErrorCode` 集合含 `unauthorized` / `protocol_mismatch` / `rate_limited` / `bad_frame` / `internal` / `forbidden` / `not_found` / `too_large` / `comments_off` / `project_too_large` | 协议 delta §4.4（`frames.rs:196-210`） | 收到错误帧 | 逐个错误码序列化 | 线上字面量为 snake_case 下划线形式；`too_large` 与 `bad_frame` 可区分 |
| UT-S30-16 | WS 帧有最大尺寸限制，超限按 `TooLarge` 处理 | API delta §7.2（`routes/ws.rs:86`、`:114-124`） | WS 已连接 | 发送超尺寸帧 | 返回 `too_large`；连接不因单帧超限而中断整体会话 |
| UT-S30-17 | 二进制帧按 `BadFrame` 处理，损坏帧不阻断后续帧 | API delta §7.2（`routes/ws.rs:114-124`）；inventory S30 行 | WS 已连接 | 发送畸形 / 二进制帧后紧接合法帧 | 返回 `bad_frame`；其后的合法帧仍被处理 |
| UT-S30-18 | `/ws` 受**每账号连接数上限**约束，超限返回 `RateLimited` | API delta §7.2（`routes/ws.rs:80-89`） | 同一账号已连满上限 | 再建一条 WS | 返回 `rate_limited`；不静默接受 |
| UT-S30-19 | 实时通道端点：`/ws`（Upgrade）、`/api/v1/projects/{project}/poll`（GET 长轮询）、`/api/v1/projects/{project}/frames`（POST 批量补帧） | API delta §7.1（`routes/ws.rs:60`、`routes/poll.rs:37-38`） | Server 已启动 | 逐一访问三个端点 | 端点存在且语义分别为升级 / 长轮询 / 批量提交 |
| UT-S30-20 | `/ws` 与 `/poll` 均要求 `Authorization: Bearer` | API delta §7.2（`routes/ws.rs:98`、`routes/poll.rs:139`） | 无凭据 | 无 Bearer 访问两端点 | 两者均被拒（`Unauthorized`） |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S30-21 | `project_updates` 主键为 `(project_id, seq)`：同一项目的序号唯一 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 两次插入相同 `(project_id, seq)` | 第二次被主键约束拒绝；序号不回退 |
| UT-S30-22 | `project_updates` 的 `UNIQUE (project_id, batch_id)`：**同一批次不得重复存储**（幂等的落库依据） | DB delta §二、§三 B 组；`0002_projects.sql`；场景实现 §五 | 已存批次 B | 再次插入相同 `(project_id, batch_id)`（不同 seq） | 被 UNIQUE 拒绝；`project_updates` 行数不增加——这是 S31「重启后幂等」的落库保证 |
| UT-S30-23 | `project_updates.envelope` 为 `BLOB NOT NULL`，`batch_id` / `device_id` / `account_id` / `created_at` 均 NOT NULL | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 插入缺字段 / 空 envelope 的行 | 被 NOT NULL 约束拒绝；不留半条记录 |
| UT-S30-24 | `project_updates.project_id` 外键指向 `projects(id)` 且 `ON DELETE CASCADE` | DB delta §二、§三 B 组；`0002_projects.sql` | 项目已存在 | 删除该项目 | 其 `project_updates` 行随之删除；无悬挂变更日志 |
| UT-S30-25 | `project_snapshots` 主键为 `(project_id, seq)` | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 重复插入相同 `(project_id, seq)` | 被主键约束拒绝 |
| UT-S30-26 | `project_blobs` 主键为 `(project_id, hash)`（内容寻址去重） | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 重复插入相同 `(project_id, hash)` | 被主键约束拒绝；同 hash 不重复占位 |
| UT-S30-27 | `projects.head_seq` 记录队头序号，默认 0，随变更递增 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 写入若干批变更后读取 | `head_seq` 与 `project_updates` 最大 `seq` 一致 |
| UT-S30-28 | `project_updates_counted` / `project_updates_uncounted` 触发器在写入 / 删除时维护 `projects.log_bytes` 累计值 | DB delta §二（0013 / 0015 触发器重建） | 项目已建立 | 插入含 N 字节 envelope 的行，再删除 | `log_bytes` 相应增减且不出现负值（删除路径取 `MAX(..., 0)`） |
| UT-S30-29 | `projects.comments_enabled` 的 CHECK 约束只允许 `0` / `1`（0015 重建后口径） | DB delta §二（0015）；`0015_review_roles.sql` | 项目已建立 | 写入 `1` / 写入 `2` | 合法值成功；非法值被 CHECK 拒绝 |

### 1.3 来源分组：业务规则（分批、Unsendable、超时保护、损坏帧隔离、逐 change 校验）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S30-30 | 大文本**分批**发送，最终内容仍完整收敛 | 需求 §四 S30；场景实现 §四「大文本分批」 | 存在大文本文件 | 触发同步 | 文本按多批发送；各端最终内容与源一致，无截断 |
| UT-S30-31 | 某单批过大被判 **Unsendable** 时该批暂不发送，发出 `Unsendable` 事件提示用户，**不阻断其他内容的同步** | 需求 §四 S30「异常：过大单批不阻断其他」；场景实现 §四 | 构造一个超尺寸批次 | 触发同步 | 该批被标记 Unsendable 且给出提示；其余批次正常发送并被对端接收 |
| UT-S30-32 | 慢上传**不被 quiet timeout 误判**为掉线 | 需求 §四 S30「边界：慢上传与损坏 frame」；inventory S30 行 | 传输选项 `quiet_for = 30s`、`ping_every = 20s` | 让上传持续慢于静默窗口 | 不被判为掉线；静默超时按 `quiet_for` 判定并有上传时限补偿 |
| UT-S30-33 | 传输选项默认值：`fallback_after = 2`、`retry_socket_every = 60s`、`ping_every = 20s`、`quiet_for = 30s` | 场景实现 §一（`sync/mod.rs:191-207`） | 读取默认传输选项 | 读取四项默认值 | 取值与上表一致（回退阈值、重探周期、心跳、静默超时） |
| UT-S30-34 | 个别 **损坏 frame 不阻断后续 frame** 的处理 | 需求 §四 S30「边界：慢上传与损坏 frame」；inventory S30 行；`transport.rs:297-366` | WS 已连接 | 注入一个损坏帧后继续发送正常帧 | 损坏帧被隔离（`bad_frame`）；其后的帧按序正常处理 |
| UT-S30-35 | 服务端**逐 change 校验角色**并拒绝越权 change，不依赖客户端 UI 自我约束 | 需求 §四 S33「异常：越权 change 服务端拒绝」；场景实现 §三 Step 4 | 已建立会话 | 构造超出角色的 change | 服务端拒绝（`RoleVerdict::Refused`）；不写入 `project_updates`，不广播 |
| UT-S30-36 | `RoleVerdict` 三态判定：`Allowed` / `ChangesComments` / `Refused`，其中评论开关导致的差异判为 `ChangesComments` 而非直接拒绝 | 场景实现 §三 Step 6；`role_guard.rs:34-37` | 已有角色与项目状态 | 逐类 change 提交 | 判定结果与角色 / 开关矩阵一致 |
| UT-S30-37 | 发送端收到 `ack` 后清除该批待发内容；`ack` 丢失场景由 S31 的补发与幂等兜底 | 场景实现 §三 Step 9 | 已发送一批 | 收到 ack | 该批从待发队列移除；未收到 ack 的批次仍保留 |
| UT-S30-38 | presence 帧同步光标位置与在线状态，各端显示其他协作者的位置与在线名单 | 场景实现 §三 Step 8 | 两端在线 | A 移动光标 / B 离开 | B 端收到 presence 更新光标；A 端收到 `presence_left` 并更新在线名单 |
| UT-S30-39 | 项目归档时服务端下发 `project_archived` 帧，同步终止 | 协议 delta §4.3（`frames.rs:178-181`） | 项目处于 active | 项目被归档 | 客户端收到 `project_archived` 后停止同步 |
| UT-S30-40 | 权限 / 成员 / 评论开关变更时下发 `access_changed` 帧（含 `role` / `change` / `comments` 可选字段） | 协议 delta §4.3（`frames.rs:167-177`） | 成员被变更 | 观察其他端收到的帧 | 客户端据 `access_changed` 更新本地角色与评论开关状态 |
| UT-S30-41 | 项目内容**不是端到端加密**：Server 能力 `encryption = none`，宿主 / 磁盘 / 备份运营者可读 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；测试与文档均不宣称 E2E 加密 |
| UT-S30-42 | 各端内容经 Loro change log **收敛一致**（不承诺所有重叠都人工二选一） | 需求 §四 S30；场景实现 §五 | 两端并发编辑同一文件 | 观察两端最终内容 | 两端内容一致；收敛由 Loro 自动完成，Merge Review 只读审查由 S32 承接 |

---

## 二、场景测试用例

### 2.1 主路径：实时共同编辑

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S30-01 | 同项目并发编辑文本与文件树，各端实时收敛 | Step 1→4、Step 6→7 | 两端已按 S29 加入同一项目并具备角色；实时通道已建立 | ① 协作者 A 编辑文本 / 操作文件树 → ② 客户端把编辑组装为批次（带 `batch_id`）→ ③ 经 WS 发送 `ClientFrame::Update` → ④ 服务端逐 change 校验角色 → ⑤ 写入 `project_updates`（记 `batch_id` 与 `seq`）并广播 → ⑥ 对端收到 `ServerFrame::Update` → ⑦ 合并进本地 Loro 文档 | 两端内容**收敛一致**；变更落库带 `batch_id` 与递增 `seq`；`ack` 回传 `batch_id` / `seq` 后发送端清除该批 |
| ST-S30-02 | 光标与在线状态（presence）实时同步 | Step 8 | 两端在线同一项目 | ① A 移动光标到文件某位置 → ② B 端观察 → ③ B 关闭文档或离开项目 → ④ A 端观察在线名单 | B 端显示 A 的光标位置；A 端在 B 离开后从在线名单移除 B（`presence_left`） |
| ST-S30-03 | 大文本分批发送并完整收敛 | Step 2（分批） | 项目内存在大文本文件 | ① 对大文件执行编辑 → ② 观察发送批次 → ③ 对端读取内容 | 文本按多批发送；对端最终内容与发送端一致，无截断、无重复 |

### 2.2 异常路径

> EX 编号与 `collab-S30-live-coediting.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S30-01 | 单批过大 | 某单批数据过大被判 Unsendable | S30-AC-02 |
| EX-S30-02 | 慢上传被误判 | 客户端上传缓慢 | S30-AC-03 |
| EX-S30-03 | 损坏 frame | 个别 frame 解析失败 | S30-AC-03 |
| EX-S30-04 | 越权变更 | 客户端发出超出角色权限的 change | S30-AC-01（服务端逐 change 校验） |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S30-04 | 单批过大被判 Unsendable 但不阻断其他同步 | EX-S30-01 | 构造一个超尺寸批次，其余内容正常 | 触发同步 | 超尺寸批次暂不发送并给出 `Unsendable` 提示；**其余批次正常发送并被对端接收**，同步不整体中断 |
| ST-S30-05 | 慢上传不被 quiet timeout 误判为掉线 | EX-S30-02 | 传输选项 `quiet_for = 30s`、`ping_every = 20s` | 让上行持续慢于静默窗口 | 客户端不被判为掉线；连接保持，心跳照常；不触发无谓重连或丢批 |
| ST-S30-06 | 损坏 frame 不阻断后续 frame 处理 | EX-S30-03 | WS 已连接 | 先发送一个损坏 / 二进制帧，再发送正常帧 | 损坏帧返回 `bad_frame` 并被隔离；其后的正常帧按序处理，内容照常收敛 |
| ST-S30-07 | 服务端逐 change 拒绝越权变更 | EX-S30-04 | 客户端以越权角色构造 change | 提交超出角色权限的 change | 服务端拒绝并给出明确结果；变更不落库、不广播；客户端 UI 隐藏按钮不构成安全边界（被绕过同样被拒） |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S30-08 [manual] | 多端并发编辑的实时收敛观感 | Step 1→9 | 三个以上真实客户端连同一 Server | 三端同时编辑同一文件的同一区域并观察彼此光标与内容 | 人工确认内容收敛一致、光标与在线名单更新及时（并发收敛细节由 `collab/sync/tests/editing.rs` 覆盖，真实多端观感需人工确认） |
| ST-S30-09 [manual] | 协作 crowd / soak 的长时稳定性 | Step 1→9 | 可承受长时运行的 Server 与多客户端 | 持续多端协作运行，观察内存 / 连接数 / 序号连续性 | 人工确认长时运行无序号跳变、无连接泄漏（crowd/soak 属动态取证范围，基线盘点未执行） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S30-AC-01（正常：并发编辑实时收敛）→ ST-S30-01、ST-S30-02、ST-S30-03、UT-S30-01 ~ UT-S30-14、UT-S30-35、UT-S30-36、UT-S30-42
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S30-AC-02（异常：过大单批不阻断其他）→ ST-S30-04、UT-S30-16、UT-S30-31
  - S30-AC-03（边界：慢上传与损坏 frame）→ ST-S30-05、ST-S30-06、UT-S30-17、UT-S30-32、UT-S30-33、UT-S30-34
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S30-01→ST-S30-04、EX-S30-02→ST-S30-05、EX-S30-03→ST-S30-06、EX-S30-04→ST-S30-07（4/4 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-02-collab-protocol.md` 是**wire 协议现状快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「帧类型中不可省略的字段」等价覆盖：帧编码约定（UT-S30-01）、`update`（UT-S30-02）、`Envelope` 全字段（UT-S30-03 ~ UT-S30-06）、`subscribe`（UT-S30-07）、`presence` / `presence_leave`（UT-S30-08、UT-S30-09）、`ack`（UT-S30-10）、`subscribed`（UT-S30-11）、`update` 服务端帧（UT-S30-12）、`presence` / `presence_left`（UT-S30-13）、未知帧兜底（UT-S30-14）、错误码集合（UT-S30-15）、WS 帧尺寸与二进制帧（UT-S30-16、UT-S30-17）、连接数上限（UT-S30-18）、三个实时端点（UT-S30-19）、Bearer 要求（UT-S30-20）。
  - **未覆盖（说明原因）**：协议契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；协议新增帧字段时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `project_updates` PK `(project_id, seq)`（UT-S30-21）、`project_updates` UNIQUE `(project_id, batch_id)`（UT-S30-22）、`project_updates` NOT NULL 约束（UT-S30-23）、`project_updates.project_id` FK + CASCADE（UT-S30-24）、`project_snapshots` PK（UT-S30-25）、`project_blobs` PK（UT-S30-26）、`projects.head_seq`（UT-S30-27）、`log_bytes` 触发器（UT-S30-28）、`projects.comments_enabled` CHECK（UT-S30-29）。
  - **未覆盖（说明原因）**：Server 数据库其余 `UNIQUE` / `CHECK` 约束落在其他 collab 场景的 DB 分组（S29 身份与准入、S31 幂等补发、S33 角色授权、S40 / S41 浏览器会话与输出），本文件不重复登记以免越界。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景是**桌面端实时协作行为**，Server 的部署形态、安装器、健康检查与升级迁移属 `delivery` 模块 S51；本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S30-AC-01 | **正常：并发编辑实时收敛** — GIVEN 多个协作者打开同一项目 / WHEN 并发编辑文本与文件树 / THEN 编辑、光标与在线状态经 Server 实时收敛，各端内容一致 | ST-S30-01, ST-S30-02, ST-S30-03, ST-S30-07, UT-S30-02, UT-S30-07, UT-S30-08, UT-S30-10, UT-S30-11, UT-S30-12, UT-S30-13, UT-S30-35, UT-S30-36, UT-S30-37, UT-S30-38, UT-S30-42 |
| S30-AC-02 | **异常：过大单批不阻断其他** — GIVEN 某单批数据过大被判 Unsendable / WHEN 同步继续 / THEN 该批暂不发送，但不阻断其他内容的同步 | ST-S30-04, UT-S30-16, UT-S30-30, UT-S30-31 |
| S30-AC-03 | **边界：慢上传与损坏 frame** — GIVEN 客户端上传缓慢或个别 frame 损坏 / WHEN 同步传输 / THEN 慢上传不被 quiet timeout 误判；损坏 frame 不阻断后续 frame 的处理 | ST-S30-05, ST-S30-06, UT-S30-17, UT-S30-32, UT-S30-33, UT-S30-34 |

> 追溯说明：`S30-AC-01` ~ `S30-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S30 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
