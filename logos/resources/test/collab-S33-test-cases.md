## S33 协作角色权限边界 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S33 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S33 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S33 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S33-role-permissions.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：本场景的角色权限是实时协作路径①（自建 Server + Loro change log）内的授权模型；sync 模块的云同步文件授权、冲突副本与三方合并是**另一套正交机制**，本场景不涉及、不得混称。
> - 协作角色**五档**：`owner` / `editor` / `reviewer` / `commenter` / `viewer`；可授予的只有后四档中的 `editor` / `reviewer` / `commenter` / `viewer`。
> - 权限在**服务端逐 change 校验**；客户端 UI 的隐藏 / 禁用**不是安全边界**，绕过客户端直接构造帧同样被拒。
> - **Reviewer 固定 Suggesting 模式**；Owner 独占成员管理 / 链接管理 / 停止分享。
> - 拒绝语义分两类且不得混称：Viewer's forbidden 拒绝**丢弃该批**（保留每条 change 与本地内容，后续可再发）；comments off 拒绝**只摘掉评论**、文本继续。
> - 浏览器端角色映射只是 UI 呈现（`abilitiesFor` / `effectiveMode`），裁决仍在服务端。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（角色模型 / 动作矩阵 / 授权端点）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S33-01 | `ProjectRole` 取值为 `owner` / `editor` / `reviewer` / `commenter` / `viewer`，未知值落 `#[serde(other)] Unknown` 兜底 | 协议 delta §3.2（`roles.rs:14-22`） | 协议 crate 已编译 | 逐个角色序列化 / 反序列化 | 五个合法值按 snake_case 写出；未知值落 `Unknown` 且不导致解析失败 |
| UT-S33-02 | `GRANTABLE_ROLES` 只含 Editor / Reviewer / Commenter / Viewer 四种；`grantable(role)` 对 `Owner` 返回 false | 协议 delta §3.2（`roles.rs:24-30`）；场景实现 §二 | 协议 crate 已编译 | 逐个 `ProjectRole` 调用 `grantable` | 四种可授予角色为 true；`Owner` 为 false（Owner 由项目归属决定） |
| UT-S33-03 | `project_role_allows` 对 `Read` 允许全部五角色 | 协议 delta §3.2（`projects.rs:109-145`） | 协议 crate 已编译 | 五角色 × `ProjectAction::Read` | 全部为 true |
| UT-S33-04 | `project_role_allows` 对 `Edit` / `UploadSnapshot` / `Resolve` 只允许 Owner 与 Editor | 协议 delta §3.2 | 同上 | 五角色 × 三动作 | Owner / Editor 为 true；Reviewer / Commenter / Viewer 为 false |
| UT-S33-05 | `project_role_allows` 对 `Suggest` 允许 Owner / Editor / Reviewer | 协议 delta §3.2 | 同上 | 五角色 × `Suggest` | Owner / Editor / Reviewer 为 true；Commenter / Viewer 为 false |
| UT-S33-06 | `project_role_allows` 对 `Comment` / `Chat` 允许 Owner / Editor / Reviewer / Commenter | 协议 delta §3.2 | 同上 | 五角色 × 两动作 | 前四者为 true；Viewer 为 false |
| UT-S33-07 | `project_role_allows` 对 `ManageMembers` / `ChangeLinkSharing` / `StopSharing` **只允许 Owner** | 协议 delta §3.2；场景实现 §三 Step 3 | 同上 | 五角色 × 三动作 | 仅 Owner 为 true；其余四角色全部为 false |
| UT-S33-08 | `ServerRole` 取值为 `admin` / `maintainer` / `member` / `guest` + `Unknown` 兜底 | 协议 delta §3.1（`roles.rs:5-12`） | 协议 crate 已编译 | 逐个角色序列化 | 四个合法值按 snake_case 写出；未知值落 `Unknown` |
| UT-S33-09 | `server_role_allows` 对 11 个 `ServerAction` 的允许矩阵：Admin 全允许；Maintainer 允许 5 项管理类 + `ShareProjects` / `SeeDirectory`；Member 仅 `ShareProjects` / `SeeDirectory`；Guest / Unknown 全拒 | 协议 delta §3.1（`roles.rs:41-70`） | 协议 crate 已编译 | 四角色 × 11 动作穷举 | 结果与协议 delta 矩阵逐格一致（`ManageStaff` / `ChangeSettings` / `ViewStorage` / `DeleteProjectForStorage` 仅 Admin） |
| UT-S33-10 | `ProjectStatus` 取值为 `pending` / `active` / `archived` + 兜底未知 | 协议 delta §3.3（`projects.rs:5-15`） | 协议 crate 已编译 | 逐个状态序列化 | 三个合法值按 snake_case 写出；未知值落兜底 |
| UT-S33-11 | `MemberGrant` 结构只含 `role` 字段 | 协议 delta §3.3（`projects.rs:95-99`） | 构造授权 | 序列化 | 仅含 `role` 键 |
| UT-S33-12 | `access_changed` 帧含 `project_id`，`role` / `change`（`MemberChange`）/ `comments`（`CommentSwitches`）可选 | 协议 delta §4.3（`frames.rs:167-177`） | 成员或评论开关变更 | 读取该帧 | 可选字段缺省为 `None` 不导致解析失败；可解析角色变更与评论开关变更 |
| UT-S33-13 | `MemberChange` 含 `account_id`、`by`、`kind`（`added` / `removed` / `role_changed` + 兜底） | 协议 delta §4.5（`frames.rs:179-194`） | 成员变更 | 读取 `change` | 三字段可解析；`kind` 为兜底值时不失败 |
| UT-S33-14 | `FrameErrorCode` 含 `forbidden` 与 `not_found`：越权与不存在可区分 | 协议 delta §4.4 | 提交越权 change | 读取错误帧 | 错误码为 `forbidden`；越权与「资源不存在」不被混为一类 |
| UT-S33-15 | `project_archived` 帧含 `project_id`，到达后同步终止 | 协议 delta §4.3（`frames.rs:178-181`） | 项目被归档 | 读取该帧 | 客户端据以终止同步 |
| UT-S33-16 | 成员授权端点：`PUT /api/v1/projects/{project}/members/{account}`（授予）、`DELETE` 同路径（移除）、`GET /api/v1/projects/{project}/members`（列表） | API delta §四（`routes/projects.rs:67-73`） | 项目已存在且操作者为 Owner | 依次调用三端点 | 授予 / 移除 / 列举均生效；非 Owner 调用按角色校验被拒 |
| UT-S33-17 | 链接分享设置经 `PATCH /api/v1/projects/{project}` 更新 `link_sharing` / `link_role` | API delta §四（`routes/projects.rs:52`） | 项目已存在 | 开启 / 关闭链接分享并改链接角色 | `projects` 行上对应列被更新；`ChangeLinkSharing` 仅 Owner 可执行 |
| UT-S33-18 | 目录端点 `GET /api/v1/directory` 的可见范围按 Server 角色收敛（`SeeDirectory` 动作） | API delta §四（`routes/projects.rs:74`） | 不同 Server 角色账号各一 | 各自调用 | Guest / Unknown 不可见；Member 及以上可见 |
| UT-S33-19 | 浏览器端 `abilitiesFor(role, features)` 只产出 UI 能力（`edit` / `chooseMode` / `alwaysSuggest` / `comment` / `resolve` / `chat` / `clearChat` / `share`），**不构成服务端授权** | 协议 delta §3.2；`web/src/roles.ts` | 浏览器端已登录 | 逐角色调用 | 结果符合前端映射；测试同时断言绕过 UI 直接构造帧仍被服务端拒绝 |
| UT-S33-20 | 浏览器端 `effectiveMode(role, chosen, features)` 强制 Reviewer 为 `suggesting`；Owner / Editor 在 `features.suggestions` 开启时才可自由选模式 | `web/src/roles.ts`（`effectiveMode`） | 浏览器端已登录 | 逐角色 × 选定模式调用 | Reviewer 恒为 `suggesting`；Viewer / Commenter 恒为 `editing` |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S33-21 | `project_grants.role` 的 CHECK 约束允许五档角色 `'owner'` / `'editor'` / `'reviewer'` / `'commenter'` / `'viewer'`（0015 重建后口径） | DB delta §二（0015）；`0015_review_roles.sql` | 项目已建立 | 逐个写入五档角色 / 写入非法值 `'guest'` | 五档均成功；`'guest'` 被 CHECK 拒绝（Guest 是 Server 级角色，不是项目级角色） |
| UT-S33-22 | `project_grants` 主键 `(project_id, account_id)`：同一成员在同一项目只授权一次（改角色走 UPDATE） | DB delta §三 B 组；`0002_projects.sql` | 已授权成员 M | 再次 INSERT 同 `(project_id, account_id)` | 被主键约束拒绝；不产生重复授权行 |
| UT-S33-23 | `project_grants.project_id` / `account_id` 外键指向 `projects(id)` / `accounts(id)`，项目删除时级联清理 | DB delta §二、§三 B 组；`0002_projects.sql` | 已授权成员 | 删除项目 | 授权行随之删除；无悬挂授权 |
| UT-S33-24 | `projects.link_role` 的 CHECK 只允许 `'editor'` / `'reviewer'` / `'commenter'` / `'viewer'`（不含 `'owner'`） | DB delta §二（0015） | 项目已建立 | 写入四档合法值 / 写入 `'owner'` | 合法值成功；`'owner'` 被 CHECK 拒绝——链接不能以 Owner 身份分享 |
| UT-S33-25 | `projects.status` 的 CHECK 只允许 `'pending'` / `'active'` / `'archived'`（归档态即同步终止态） | DB delta §二（0002 / 0015） | 项目 active | 写入 `'archived'` / 写入 `'deleted'` | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S33-26 | `accounts.status` 的 CHECK 只允许 `'active'` / `'suspended'` / `'removed'`（`'removed'` 对应账号被移除） | DB delta §二（0001） | 账号 active | 写入 `'removed'` | 成功；该状态后续不再获得访问 |
| UT-S33-27 | `accounts.server_role` 的 CHECK 只允许 `'admin'` / `'maintainer'` / `'member'` / `'guest'` | DB delta §二（0001） | Server 已初始化 | 写入合法值 / 非法值 `'owner'` | 合法值成功；`'owner'` 被 CHECK 拒绝（Owner 是项目级概念，不存在于 Server 角色集） |
| UT-S33-28 | `project_removals` 主键 `(project_id, account_id)`：同一成员在同一项目的移除记录不重复 | DB delta §三 C 组（0007） | 已移除成员 | 重复插入同一条 | 被主键约束拒绝 |
| UT-S33-29 | `guest_invitations.role` 的 CHECK 只允许 `'editor'` / `'reviewer'` / `'commenter'` / `'viewer'`（不含 `'owner'`） | DB delta §二（0015） | 已建项目 | 写入四档合法值 / 写入 `'owner'` | 合法值成功；`'owner'` 被 CHECK 拒绝 |
| UT-S33-30 | `guest_invitations_open` 部分唯一索引 `(project_id, email) WHERE status IN ('awaiting_approval','invited')` | DB delta §二（0015） | 已有一条待审批邀请 | 同项目同邮箱再插一条待审批邀请 | 被唯一索引拒绝；已 `revoked` / `expired` 的旧行不占用唯一约束 |

### 1.3 来源分组：业务规则（服务端逐 change 校验、Reviewer 固定 Suggesting、Viewer pending、成员与分享管理）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S33-31 | 服务端**逐 change** 判定角色：越权的文本 / 建议 / 评论 / 清空他人内容被**拒绝**（`RoleVerdict::Refused`） | 需求 §四 S33「异常：越权 change 服务端拒绝」；场景实现 §三 Step 6 | 已建立会话 | 提交超出角色的 change | 被拒绝；不写入 `project_updates`、不广播 |
| UT-S33-32 | 客户端 UI 的隐藏 / 禁用**不是安全边界**：绕过客户端直接构造帧同样被服务端拒绝 | 场景实现 §五「安全边界」；inventory S33 行 | 已建立会话 | 直接构造越权帧 | 同样被拒绝；服务端不信任客户端自述的角色 |
| UT-S33-33 | `RoleVerdict` 三态：`Allowed` / `ChangesComments` / `Refused`；评论开关导致的差异判为 `ChangesComments`（只摘评论、文本继续） | 场景实现 §三 Step 6；`role_guard.rs:34-37` | 项目评论关闭 | 提交含文本 + 评论的 change | 文本部分通过、评论部分被摘除；判为 `ChangesComments` 而非整体 `Refused` |
| UT-S33-34 | Reviewer **固定处于 Suggesting 模式**，不能切回直接编辑；其编辑以建议形式提交 | 需求 §四 S33「正常：五角色各司其职」；场景实现 §四 | 成员角色为 Reviewer | 在客户端切换到直接编辑模式 | 切换不生效，恒为 Suggesting；正文不被直接改写 |
| UT-S33-35 | Reviewer **不能接受建议**（含自己提出的建议）——只提建议，不裁决建议 | 需求 §四 S34「异常：角色限制」；inventory S33/S34 行 | Reviewer 尝试接受建议 | 提交接受建议操作 | 被拒绝；建议状态不变 |
| UT-S33-36 | Commenter 仅可评论与聊天：**不能改文本 / 改建议 / 清空他人内容** | 需求 §四 S33 / S34；inventory S33 行 | 成员角色为 Commenter | 分别提交改文本 / 改建议 / 清空他人内容 | 三者均被拒绝；他人内容不被清空 |
| UT-S33-37 | 被移出项目后**同步结束**，不再获得项目访问，不产生半同步状态 | 需求 §四 S33「边界：移除/归档与 Viewer pending」；场景实现 §四 | 成员被 Owner 移除 | 该成员继续同步 | 同步终止；后续请求被拒（无权限） |
| UT-S33-38 | 项目被归档后**同步结束**；归档后项目在 Server 侧保留只读一段时间后删除 | 需求 §四 S33；场景实现 §四 | 项目进入 Archived | 客户端继续同步 | 收到 `project_archived` 后同步终止；项目保持只读 |
| UT-S33-39 | **Viewer 期间的本地编辑保留为 pending**，权限恢复后可发出 | 需求 §四 S33；inventory S33 行 | Viewer 在受限期间本地编辑 | 提交被拒后检查本地状态 | 该批被拒并丢弃，但每条 change 与本地内容被保留，可在权限恢复后再次发出 |
| UT-S33-40 | **拒绝语义区分**：Viewer's forbidden 拒绝**丢弃该批**（保留每条 change 与本地内容）；comments off 拒绝**只摘掉评论**、文本继续 | 场景实现 §五「拒绝与保留的区分」 | 分别触发两类拒绝 | 观察本地处理 | 两类拒绝行为不同，不混称 |
| UT-S33-41 | Owner 可管理成员、生成 / 撤销邀请链接、开启或停止分享；停止分享后项目转入只读保留 | 需求 §四 S33「正常」；场景实现 §三 Step 3 | 操作者为 Owner | 依次执行成员管理 / 链接管理 / 停止分享 | 三项均生效；停止分享后项目只读，Owner 可继续撤销链接与成员授权 |
| UT-S33-42 | `ManageMembers` / `ChangeLinkSharing` / `StopSharing` 仅 Owner 可执行，Editor 也不行 | 协议 delta §3.2；场景实现 §四 | 操作者为 Editor | 尝试成员管理与分享管理 | 均被拒绝（`forbidden`） |
| UT-S33-43 | 项目内容**不是端到端加密**：Server 能力 `encryption = none`，宿主 / 磁盘 / 备份运营者可读 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；不宣称 E2E 加密 |
| UT-S33-44 | 权限裁决**只在服务端逐 change 执行**；客户端本地禁用与隐藏不构成安全边界 | 场景实现 §五「安全边界」 | — | 审查客户端与服务端职责划分 | 裁决点唯一位于服务端逐 change 校验 |

---

## 二、场景测试用例

### 2.1 主路径：协作角色权限边界

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S33-01 | Owner 授予五角色并管理成员、链接与停止分享 | Step 1→3 | 项目已存在且操作者为 Owner | ① 分别授予 Editor / Reviewer / Commenter / Viewer 成员 → ② 检查 `project_grants` → ③ 生成 / 撤销邀请链接、设置 `link_role` → ④ 执行停止分享 | 授权落库且角色值合法；链接分享设置生效；停止分享后项目转入只读保留，Owner 可继续撤销链接与成员授权 |
| ST-S33-02 | 各角色按定义执行各自允许的操作 | Step 4→7 | 项目含五角色成员各一 | ① Editor 直接编辑正文 → ② Reviewer 编辑（应进入 Suggesting）→ ③ Commenter 评论与聊天 → ④ Viewer 只读浏览 → ⑤ Owner 管理成员 | Editor 直接改写正文；**Reviewer 恒为 Suggesting 模式**，编辑以建议形式提交；Commenter 只能评论 / 聊天；Viewer 无编辑入口；Owner 可管理成员 |
| ST-S33-03 | 服务端逐 change 校验并广播合法变更 | Step 5→7 | 已建立会话 | ① 合法 change 提交 → ② 服务端逐 change 校验 → ③ 写入 `project_updates` 并广播 → ④ 对端收到并刷新 | 合法变更落库并广播；各端内容一致 |

### 2.2 异常路径

> EX 编号与 `collab-S33-role-permissions.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S33-01 | 越权 change | 客户端发出超出角色权限的 change | S33-AC-02 |
| EX-S33-02 | Reviewer 固定 Suggesting | Reviewer 尝试直接编辑 | S33-AC-01 |
| EX-S33-03 | 被移出项目 | 用户被移除成员授权 | S33-AC-03 |
| EX-S33-04 | 项目被归档 | 项目进入 Archived 状态 | S33-AC-03 |
| EX-S33-05 | Viewer 期间的本地编辑 | Viewer 在受限期间做了本地编辑 | S33-AC-03 |
| EX-S33-06 | Commenter 越界 | Commenter 尝试改文本 / 改建议 / 清空他人内容 | S33-AC-02 |
| EX-S33-07 | Owner 停止分享 | Owner 停止分享项目 | S33-AC-01 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S33-04 | 越权 change 被服务端逐 change 拒绝（绕过 UI 亦然） | EX-S33-01 | 已建立会话 | 构造超出角色权限的 change（可绕过客户端 UI 直接构造帧） | 服务端拒绝（`RoleVerdict::Refused` / `forbidden`）；变更不落库、不广播；**不依赖客户端 UI 的自我约束** |
| ST-S33-05 | Reviewer 尝试直接编辑时被固定在 Suggesting | EX-S33-02 | 成员角色为 Reviewer | 在编辑器切换到直接编辑模式 | 切换不生效；其编辑以建议形式提交，正文不被直接改写 |
| ST-S33-06 | 成员被移出项目后同步结束 | EX-S33-03 | 成员已被 Owner 移除授权 | 该成员继续同步 / 发起请求 | 同步结束；后续请求被拒；不产生半同步状态 |
| ST-S33-07 | 项目归档后同步结束 | EX-S33-04 | 项目已归档 | 客户端继续同步 | 收到 `project_archived` 后同步终止；项目在 Server 侧转为只读保留 |
| ST-S33-08 | Viewer 期间的本地编辑保留为 pending | EX-S33-05 | Viewer 在受限期间本地编辑 | 提交该批 change | 该批被拒并丢弃，但**每条 change 与本地内容被保留**；权限恢复后可再次发出（与 comments off 只摘评论的语义不同） |
| ST-S33-09 | Commenter 改文本 / 改建议 / 清空他人内容均被拒 | EX-S33-06 | 成员角色为 Commenter | 分别提交三类越权操作 | 三者均被拒绝；他人内容不被清空；Commenter 仍可评论与聊天 |
| ST-S33-10 | Owner 停止分享后项目转入只读保留 | EX-S33-07 | 操作者为 Owner | 执行停止分享 | 项目不再对外共享；Owner 可撤销链接与成员授权；其他成员不再获得访问 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S33-11 [manual] | 真实双端的角色边界观感 | Step 1→8 | 两个真实桌面实例分别以不同角色登录同一项目 | 分别以 Reviewer / Commenter / Viewer 操作，观察另一端收到的变更形态与界面 | 人工确认 Reviewer 变更以建议形态出现、Commenter 无编辑入口、Viewer 完全只读（角色 UI 呈现与真实双端行为需人工核对） |
| ST-S33-12 [manual] | Owner 成员与分享管理界面的可操作性 | Step 1→3 | 项目已存在 | 打开成员管理，增删成员并切换链接角色、撤销链接 | 人工确认界面反馈与 Server 实际授权一致（管理界面交互需人工确认） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S33-AC-01（正常：五角色各司其职）→ ST-S33-01、ST-S33-02、ST-S33-03、ST-S33-05、ST-S33-10、UT-S33-01 ~ UT-S33-13、UT-S33-19、UT-S33-20、UT-S33-34、UT-S33-41、UT-S33-42
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S33-AC-02（异常：越权 change 服务端拒绝）→ ST-S33-04、ST-S33-09、UT-S33-03 ~ UT-S33-09、UT-S33-14、UT-S33-31、UT-S33-32、UT-S33-33、UT-S33-36
  - S33-AC-03（边界：移除/归档与 Viewer pending）→ ST-S33-06、ST-S33-07、ST-S33-08、UT-S33-22、UT-S33-23、UT-S33-25、UT-S33-26、UT-S33-28、UT-S33-37、UT-S33-38、UT-S33-39、UT-S33-40
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S33-01→ST-S33-04、EX-S33-02→ST-S33-05、EX-S33-03→ST-S33-06、EX-S33-04→ST-S33-07、EX-S33-05→ST-S33-08、EX-S33-06→ST-S33-09、EX-S33-07→ST-S33-10（7/7 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「角色模型、帧与端点中不可省略的字段 / 不可省略的矩阵项」等价覆盖：`ProjectRole`（UT-S33-01）、`GRANTABLE_ROLES` / `grantable`（UT-S33-02）、`project_role_allows` 全部 10 个 `ProjectAction`（UT-S33-03 ~ UT-S33-07）、`ServerRole`（UT-S33-08）、`server_role_allows` 全部 11 个 `ServerAction`（UT-S33-09）、`ProjectStatus`（UT-S33-10）、`MemberGrant`（UT-S33-11）、`access_changed`（UT-S33-12）、`MemberChange`（UT-S33-13）、`FrameErrorCode`（UT-S33-14）、`project_archived`（UT-S33-15）、成员与分享端点（UT-S33-16、UT-S33-17）、目录端点（UT-S33-18）、浏览器端角色映射（UT-S33-19、UT-S33-20）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增角色 / 动作 / 端点时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `project_grants.role` CHECK（UT-S33-21）、`project_grants` PK（UT-S33-22）、`project_grants` FK（UT-S33-23）、`projects.link_role` CHECK（UT-S33-24）、`projects.status` CHECK（UT-S33-25）、`accounts.status` CHECK（UT-S33-26）、`accounts.server_role` CHECK（UT-S33-27）、`project_removals` PK（UT-S33-28）、`guest_invitations.role` CHECK（UT-S33-29）、`guest_invitations_open` 唯一索引（UT-S33-30）。
  - **未覆盖（说明原因）**：Server 数据库其余 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S31 / S32 / S40 / S41 的 DB 分组登记，本文件不重复登记以免越界。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景是**桌面端协作角色行为**，Server 部署形态、健康检查与升级迁移属 `delivery` 模块 S51；本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S33-AC-01 | **正常：五角色各司其职** — GIVEN 项目含 Owner/Editor/Reviewer/Commenter/Viewer 五角色成员 / WHEN 各角色执行各自允许的操作 / THEN Reviewer 固定处于 Suggesting 模式；Owner 管理成员、邀请链接与停止分享；各角色操作边界与角色定义一致 | ST-S33-01, ST-S33-02, ST-S33-03, ST-S33-05, ST-S33-10, UT-S33-01, UT-S33-02, UT-S33-03, UT-S33-04, UT-S33-05, UT-S33-06, UT-S33-07, UT-S33-08, UT-S33-09, UT-S33-10, UT-S33-11, UT-S33-12, UT-S33-13, UT-S33-16, UT-S33-17, UT-S33-18, UT-S33-19, UT-S33-20, UT-S33-34, UT-S33-41, UT-S33-42 |
| S33-AC-02 | **异常：越权 change 服务端拒绝** — GIVEN 客户端发出超出角色权限的 change / WHEN 到达服务端 / THEN 服务端逐 change 校验并拒绝，不依赖客户端 UI 的自我约束 | ST-S33-04, ST-S33-09, UT-S33-14, UT-S33-31, UT-S33-32, UT-S33-33, UT-S33-35, UT-S33-36, UT-S33-44 |
| S33-AC-03 | **边界：移除/归档与 Viewer pending** — GIVEN 用户被移出项目或项目被归档，或 Viewer 在受限期间进行了本地编辑 / WHEN 同步发生 / THEN 被移除/归档后同步结束；Viewer 期间的本地编辑保留为 pending，权限恢复后可发出 | ST-S33-06, ST-S33-07, ST-S33-08, UT-S33-22, UT-S33-23, UT-S33-25, UT-S33-26, UT-S33-28, UT-S33-37, UT-S33-38, UT-S33-39, UT-S33-40 |

> 追溯说明：`S33-AC-01` ~ `S33-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S33 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
