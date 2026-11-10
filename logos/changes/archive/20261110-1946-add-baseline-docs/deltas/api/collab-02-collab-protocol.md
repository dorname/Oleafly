## ADDED — 协作 wire 协议 v1 契约（现状快照）

> module: collab | 协议版本: `PROTOCOL_VERSION = 1`（协作协议自己的版本，与 BackendPort v7 无关）
> 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `oleafly-server 0.1.1`
> 事实来源：提案 `logos/changes/add-baseline-docs/inventory.md`「API 资产」段（collab protocol v1，min/max 协商）、collab 段（S29-S42：版本不兼容停止同步、S33 角色权限边界、S30/S31 实时与重连）；并以实现定位符佐证（`crates/oleafly-collab-protocol/src/*`）。
> **本文档是现状契约快照，非新增 API 设计**：不新增帧类型、不新增版本字段、不改语义。本次为只读静态盘点，**未执行任何测试**，动态行为在 verify 阶段单独取证。

## 一、协议定位与独立性声明

- 协作协议 v1 是**桌面客户端 / 浏览器客户端 ↔ 协作 Server** 之间的跨进程 wire 协议，定义在独立 crate `oleafly-collab-protocol`。
- **它与 BackendPort v7 相互独立**：
  - BackendPort v7 是**桌面 renderer ↔ 本机 Rust 后端**的进程内 typed IPC 契约（见 `core-01-backend-port.md`）；
  - 协作协议 v1 是**跨设备、跨进程**的网络协议；
  - 两者的版本号**不共享、不继承、不互相协商**：`PROTOCOL_VERSION = 7`（BackendPort）与 `PROTOCOL_VERSION = 1`（协作协议）是两个不同常量，位于两个不同 crate；
  - 因此「BackendPort 升到 v8」不蕴含协作协议变化，反之亦然；任何把两者版本号绑定的表述都是错误的。
- 协作协议的传输载体是 WebSocket（`/ws`、`/web/ws`）与长轮询（`/api/v1/projects/{project}/poll` + `/frames`），端点定义见 `collab-01-server-api.md`。

## 二、版本与能力声明

### 2.1 常量与范围类型

| 项 | 值 / 结构 | 证据 |
|---|---|---|
| 协议版本 | `PROTOCOL_VERSION: u32 = 1` | `crates/oleafly-collab-protocol/src/capabilities.rs:4` |
| 协议区间 | `ProtocolRange { min: u32, max: u32 }` | 同文件 `:7-11` |
| 能力发现路径 | `WELL_KNOWN_PATH = "/.well-known/oleafly-server"` | 同文件 `:5` |
| 能力清单 | `CapabilityManifest { server_id, name, icon_url, version, protocol, needs_setup, providers, features, limits }` | 同文件 `:63-74` |

**协议区间以 min/max 形式声明**（而非单点版本）：客户端与服务端各自声明 `[min, max]`，服务端在能力清单中给出自己的区间。

### 2.2 协商算法

```rust
pub fn negotiate(client: ProtocolRange, server: ProtocolRange) -> Result<u32, VersionMismatch> {
    let low = client.min.max(server.min);
    let high = client.max.min(server.max);
    if low <= high {
        Ok(high)
    } else if client.max < server.min {
        Err(VersionMismatch::ClientTooOld)
    } else {
        Err(VersionMismatch::ServerTooOld)
    }
}
```

证据：`crates/oleafly-collab-protocol/src/capabilities.rs:83-93`。

| 步骤 | 规则 |
|---|---|
| 1 | 取交集下界 `low = max(client.min, server.min)` |
| 2 | 取交集上界 `high = min(client.max, server.max)` |
| 3 | 若 `low <= high`，**协商成功**，选定版本为 `high`（交集的高端） |
| 4 | 否则若 `client.max < server.min`，**客户端过旧** → `ClientTooOld` |
| 5 | 否则判定为**服务端过旧** → `ServerTooOld` |

### 2.3 不兼容结果

| 枚举值 | 序列化形式 | 触发条件 | 证据 |
|---|---|---|---|
| `ClientTooOld` | `"client_too_old"` | 客户端区间上界低于服务端区间下界 | `capabilities.rs:76-81`，`:89` |
| `ServerTooOld` | `"server_too_old"` | 区间无交集且不满足上一条 | `capabilities.rs:76-81`，`:91` |

`VersionMismatch` 使用 `#[serde(rename_all = "snake_case")]`，因此线上字面量是 snake_case 小写下划线形式。

### 2.4 不兼容时的产品行为

- **协议不兼容即停止同步**，不进入降级编辑（inventory S29：「协议不兼容停止同步」）。
- WS 侧对应帧错误码 `ProtocolMismatch`（`frames.rs:196-210`）。
- 客户端在握手帧中携带自身 `protocol` 版本（见 §四 `hello`），因此协商在**连接建立阶段**就能判定。

## 三、角色与动作（授权模型 wire 语义）

### 3.1 Server 角色（Server 级）

| 枚举值 | 序列化 | 证据 |
|---|---|---|
| `Admin` | `admin` | `roles.rs:5-12` |
| `Maintainer` | `maintainer` | 同上 |
| `Member` | `member` | 同上 |
| `Guest` | `guest` | 同上 |
| `Unknown` | 未知值兜底（`#[serde(other)]`） | 同上 |

Server 级动作（`ServerAction`，共 11 项）与允许矩阵（`roles.rs:41-70`）：

| ServerAction | Admin | Maintainer | Member | Guest/Unknown |
|---|---|---|---|---|
| `ManageMembers` | ✔ | ✔ | ✘ | ✘ |
| `ManageDomainRules` | ✔ | ✔ | ✘ | ✘ |
| `ApproveGuests` | ✔ | ✔ | ✘ | ✘ |
| `ReadSecurityLog` | ✔ | ✔ | ✘ | ✘ |
| `SignOutAnyDevice` | ✔ | ✔ | ✘ | ✘ |
| `ManageStaff` | ✔ | ✘ | ✘ | ✘ |
| `ChangeSettings` | ✔ | ✘ | ✘ | ✘ |
| `ViewStorage` | ✔ | ✘ | ✘ | ✘ |
| `DeleteProjectForStorage` | ✔ | ✘ | ✘ | ✘ |
| `ShareProjects` | ✔ | ✔ | ✔ | ✘ |
| `SeeDirectory` | ✔ | ✔ | ✔ | ✘ |

### 3.2 项目角色（Project 级）

| 枚举值 | 序列化 | 备注 | 证据 |
|---|---|---|---|
| `Owner` | `owner` | 项目所有者 | `roles.rs:14-22` |
| `Editor` | `editor` | — | 同上 |
| `Reviewer` | `reviewer` | **固定为 Suggesting 模式**（inventory S33） | 同上 + inventory S33 |
| `Commenter` | `commenter` | — | 同上 |
| `Viewer` | `viewer` | — | 同上 |
| `Unknown` | 兜底 | `#[serde(other)]` | 同上 |

**可授予角色**只有 4 种（`Owner` 不可被授予）：`Editor`、`Reviewer`、`Commenter`、`Viewer`（`roles.rs:24-30`）。

项目动作（`ProjectAction`，共 10 项）与允许矩阵（`projects.rs:109-145`）：

| ProjectAction | Owner | Editor | Reviewer | Commenter | Viewer |
|---|---|---|---|---|---|
| `Read` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `Edit` | ✔ | ✔ | ✘ | ✘ | ✘ |
| `UploadSnapshot` | ✔ | ✔ | ✘ | ✘ | ✘ |
| `Resolve` | ✔ | ✔ | ✘ | ✘ | ✘ |
| `Suggest` | ✔ | ✔ | ✔ | ✘ | ✘ |
| `Comment` | ✔ | ✔ | ✔ | ✔ | ✘ |
| `Chat` | ✔ | ✔ | ✔ | ✔ | ✘ |
| `ManageMembers` | ✔ | ✘ | ✘ | ✘ | ✘ |
| `ChangeLinkSharing` | ✔ | ✘ | ✘ | ✘ | ✘ |
| `StopSharing` | ✔ | ✘ | ✘ | ✘ | ✘ |

关键边界（inventory S33 / S34）：

- **服务端逐 change 校验**，不只靠 UI 隐藏入口。
- Reviewer 不能接受包含自己内容的建议；Commenter 不能改文本 / 建议 / 清空他人内容。
- 评论关闭后：新评论与旧评论的 resolve 被拒绝，但**文本变更继续**。
- Viewer 期间的本地编辑保留为 pending，恢复后可发送。

### 3.3 项目状态

| 枚举值 | 序列化 | 证据 |
|---|---|---|
| `Pending` | `pending` | `projects.rs:5-15` |
| `Active` | `active` | 同上 |
| `Archived` | `archived` | 同上 |
| `Unknown` | 兜底 | 同上 |

## 四、帧 wire 类型

### 4.1 编码约定

- 所有帧用 **`#[serde(tag = "type", rename_all = "snake_case")]`** 编码，即以 `type` 字段做内部标签，帧体其余字段平铺在同一 JSON 对象中（`frames.rs:12-13`、`:104-105`）。
- 帧类型名一律 snake_case：`hello`、`ping`、`subscribe`、`unsubscribe`、`update`、`presence`、`presence_leave`；服务端侧 `challenge`、`welcome`、`pong`、`error`、`session_revoked`、`subscribed`、`update`、`ack`、`snapshot_required`、`presence`、`presence_left`、`access_changed`、`project_archived`。
- 两端枚举都带 `#[serde(other)] Unknown` 兜底变体：未知帧类型不会导致反序列化失败（`frames.rs:35-37`、`:164-166`）。

### 4.2 客户端帧（ClientFrame）

| `type` | 字段 | 语义 | 证据 |
|---|---|---|---|
| `hello` | `protocol`、`device_id`、`access_token`、`nonce`、`signature`、`understands`（可选，声明客户端能识别的错误码） | 握手：提交协议版本、设备、访问令牌与签名 | `frames.rs:14-27` |
| `ping` | `id` | 心跳 | `frames.rs:28-30` |
| `subscribe` | `project_id`、`since_seq` | 订阅项目并声明增量起点 | `frames.rs:31-35` |
| `unsubscribe` | `project_id` | 取消订阅 | `frames.rs:36-39` |
| `update` | `project_id`、`envelope` | 提交一批变更 | `frames.rs:40-44` |
| `presence` | `project_id`、`state` | 上报在线状态 | `frames.rs:45-49` |
| `presence_leave` | `project_id` | 离开在线状态 | `frames.rs:50-53` |

握手语序：服务端先发 `challenge`（含 `nonce` 与 `server_id`），客户端再回 `hello`（含 `nonce`、`signature`）；服务端回 `welcome`（含 `protocol` 与 `account_id`）。

### 4.3 服务端帧（ServerFrame）

| `type` | 字段 | 语义 | 证据 |
|---|---|---|---|
| `challenge` | `nonce`、`server_id` | 挑战下发 | `frames.rs:106-110` |
| `welcome` | `protocol`、`account_id` | 握手成功，回带协商后的协议版本 | `frames.rs:111-115` |
| `pong` | `id` | 心跳应答 | `frames.rs:116-118` |
| `error` | `code`（`FrameErrorCode`）、`message` | 帧级错误 | `frames.rs:119-123` |
| `session_revoked` | `reason`（可选 `SessionEndReason`） | 会话被撤销 | `frames.rs:124-127` |
| `subscribed` | `project_id`、`role`、`head_seq`、`since_batch`（可选） | 订阅确认，附当前角色与队头序号 | `frames.rs:128-136` |
| `update` | `project_id`、`seq`、`account_id`（可选）、`envelope` | 增量变更推送 | `frames.rs:137-143` |
| `ack` | `project_id`、`batch_id`、`seq` | 批次确认（幂等依据） | `frames.rs:144-149` |
| `snapshot_required` | `project_id` | 要求客户端走快照路径 | `frames.rs:150-153` |
| `presence` | `project_id`、`device_id`、`account_id`、`state` | 在线状态广播 | `frames.rs:154-161` |
| `presence_left` | `project_id`、`device_id` | 离线广播 | `frames.rs:162-166` |
| `access_changed` | `project_id`、`role`（可选）、`change`（可选 `MemberChange`）、`comments`（可选 `CommentSwitches`） | 权限 / 成员 / 评论开关变更 | `frames.rs:167-177` |
| `project_archived` | `project_id` | 项目归档，同步终止 | `frames.rs:178-181` |

### 4.4 错误码

| `FrameErrorCode` | 序列化 | 证据 |
|---|---|---|
| `Unauthorized` | `unauthorized` | `frames.rs:196-210` |
| `ProtocolMismatch` | `protocol_mismatch` | 同上 |
| `RateLimited` | `rate_limited` | 同上 |
| `BadFrame` | `bad_frame` | 同上 |
| `Internal` | `internal` | 同上 |
| `Forbidden` | `forbidden` | 同上 |
| `NotFound` | `not_found` | 同上 |
| `TooLarge` | `too_large` | 同上 |
| `CommentsOff` | `comments_off` | 同上 |
| `ProjectTooLarge` | `project_too_large` | 同上 |
| `Unknown` | 兜底 | 同上 |

### 4.5 辅助 wire 类型

| 类型 | 字段 | 证据 |
|---|---|---|
| `PresenceState` | `file_id`（可选）、`cursor`（可选）、`anchor`（可选） | `projects.rs:102-106` |
| `MemberChange` | `account_id`、`by`、`kind`（`MemberChangeKind`：`added` / `removed` / `role_changed` / 兜底） | `frames.rs:179-194` |
| `CommentSwitches` | `server`、`project` | `frames.rs:173-177` |

## 五、信封（Envelope）wire 结构

| 字段 | 类型 | 语义 | 证据 |
|---|---|---|---|
| `v` | u32 | 信封版本 | `envelope.rs:17-27` |
| `project_id` | `SharedProjectId` | 目标项目 | 同上 |
| `batch_id` | `BatchId` | 批次标识（`ack` 与幂等依据） | 同上 |
| `device_id` | `DeviceId` | 提交设备 | 同上 |
| `mode` | `EnvelopeMode`：`plain` / `e2ee` / 兜底 | 加密模式 | 同上；枚举 `envelope.rs:8-14` |
| `key_epoch` | `Option<u32>` | 密钥世代（`e2ee` 时有意义） | `envelope.rs:17-27` |
| `payload` | base64url 字节 | 载荷 | 同上 |
| `signature` | base64url 字节 | 签名 | 同上 |

签名域常量 `SIGNING_DOMAIN = b"oleafly-envelope/v1\0"`（`envelope.rs:5`）——这是**信封层**的版本化域，与协议版本号 `PROTOCOL_VERSION` 是两回事。

**加密口径**：wire 层保留了 `e2ee` 模式与 `key_epoch` 字段，但**当前 Server 的能力声明 `encryption = none`**，项目内容不是端到端加密（inventory collab 段口径；`capabilities.rs:30-37` 明确区分 `none` / `allowed` / `required`）。不得据此宣传端到端加密。

## 六、可靠性语义（协议层已承诺的部分）

| 语义 | 现状 | 证据 |
|---|---|---|
| 批次幂等 | `ack` 回传 `batch_id` 与 `seq`；已确认批次重启后幂等，不重复存储 | inventory S31 |
| 断线补发 | `subscribe` 的 `since_seq` 指定增量起点 | `frames.rs:31-35` |
| 大文本分批 | 大文本分批发送；**单批过大返回 `too_large`（Unsendable），不阻断其他批次** | inventory S30；错误码 `too_large` |
| 慢上传不被误判 | 慢上传不触发 quiet timeout 误判 | inventory S30 |
| 损坏帧不阻断 | 损坏 frame 不阻断后续帧 | inventory S30 |
| 重连节奏 | 有 jitter 退避；429 / 503 busy 长等待；每分钟重探长轮询 | inventory S31 |
| 冲突处理 | 文本走 Loro / OT 自动合并，Merge Review 为**只读**审查 | inventory S32 |
| 会话撤销 | `session_revoked` 帧携带可选 `reason` | `frames.rs:124-127` |

## 七、不可推断事项

- **不得**把 `PROTOCOL_VERSION = 1` 与 `PROTOCOL_VERSION = 7` 混为一谈；后者是 BackendPort 内部契约版本。
- **不得**由 `EnvelopeMode::E2ee` 推断当前已启用端到端加密——Server 声明的是 `encryption = none`。
- **不得**把浏览器端能力等同于桌面端：浏览器**无 long-poll 回退**、**无编译引擎**（inventory S40、S42）。
- **不得**声称协议稳定或向后兼容已获承诺：`min/max` 协商与 `ClientTooOld` / `ServerTooOld` 恰恰说明存在不兼容路径。
- 本次盘点**未运行测试**，上述 wire 形状均为静态阅读实现得出。
