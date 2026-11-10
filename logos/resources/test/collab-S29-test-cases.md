## S29 服务器接入与项目共享 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S29 行与该段引言、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S29 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S29 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S29-server-onboarding.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：本场景是自建 Server + Loro change log 的实时协作接入（路径①）；sync 模块的 Dropbox/Drive/S3 云同步、冲突副本与三方合并是**另一套正交机制**，本场景不涉及、不得混称。
> - 协作协议 v1 采用 **min/max 区间协商**：交集非空取交集**高端**；客户端过旧 → `ClientTooOld`；服务端过旧 → `ServerTooOld`。
> - 项目内容**不是端到端加密**：Server 能力清单 `encryption = none`，宿主 / 磁盘 / 备份运营者可读。
> - 本场景是**桌面路径**（设备凭据 + `/api/v1/*`）；浏览器路径的会话 / token 语义属 S40 / S41，不得混写。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（Server 能力清单 / 认证族 / 项目族）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S29-01 | `CapabilityManifest` 必含 `server_id`、`name`、`version`、`protocol`、`needs_setup`、`providers`、`features`、`limits`；`icon_url` 可空 | API delta §九（`capabilities.rs:63-74`） | Server 已启动 | 反序列化一份完整能力清单 JSON | 全部必填字段被填充；`icon_url` 缺省时为 `None` 而非缺键 |
| UT-S29-02 | `ProtocolRange` 只含 `min` 与 `max` 两个 u32 字段，序列化为区间而非单点版本 | API delta §2.1；协议 delta §2.1（`capabilities.rs:7-11`） | 构造协议区间 | `{min: 1, max: 1}` | 序列化为 `{"min":1,"max":1}`；不存在「固定版本号」字段 |
| UT-S29-03 | `negotiate` 在区间交集非空时取**交集高端** | 协议 delta §2.2（`capabilities.rs:83-93`） | 协议协商函数可用 | client `{min:1,max:3}`、server `{min:2,max:4}` | 返回 `Ok(2)`（= `min(client.max, server.max)`），不是低端、也不是客户端自身上限 |
| UT-S29-04 | `negotiate` 在 client `{1,1}` / server `{1,2}` 时仍取交集高端 | 同上 | 同上 | client `{min:1,max:1}`、server `{min:1,max:2}` | 返回 `Ok(1)`；协商成功而非报错 |
| UT-S29-05 | 客户端过旧：client.max < server.min → `ClientTooOld` | 协议 delta §2.2、§2.3 | 同上 | client `{min:1,max:1}`、server `{min:2,max:3}` | 返回 `Err(ClientTooOld)`；序列化线上字面量为 `client_too_old` |
| UT-S29-06 | 服务端过旧：区间无交集且 client.max ≥ server.min → `ServerTooOld` | 协议 delta §2.2、§2.3 | 同上 | client `{min:1,max:5}`、server `{min:1,max:1}` 且交集不成立的情形（如 server `{min:0,max:0}`） | 返回 `Err(ServerTooOld)`；序列化线上字面量为 `server_too_old`；两个方向可区分 |
| UT-S29-07 | `VersionMismatch` 使用 `snake_case` 小写下划线序列化 | 协议 delta §2.3 | 协议 crate 已编译 | 序列化两个不匹配枚举值 | 线上分别为 `client_too_old` / `server_too_old`，非驼峰、非大写 |
| UT-S29-08 | `ProviderKind` 取值集合为 `github` / `oidc` / `email_link`，未知值落 `Unknown` 兜底 | API delta §九（`capabilities.rs:13-28`） | 能力清单含未知 provider | `"provider_login"` 等未知值 | 反序列化为 `Unknown`，不导致整份能力清单解析失败 |
| UT-S29-09 | `EncryptionSupport` 取值集合为 `none` / `allowed` / `required` / `unknown`；当前能力声明为 `none` | API delta §九（`capabilities.rs:30-37`）；inventory collab 段引言 | Server 能力清单 | 读取 `features.encryption` | 取值为 `none`；**不得**据此推断已启用端到端加密 |
| UT-S29-10 | `Features` 九个开关字段：`email`、`guests`、`link_sharing`、`access_logs`、`comments`、`encryption`、`suggestions`、`chat`、`web`；后三者带 `#[serde(default)]` | API delta §九（`capabilities.rs:40-54`） | Server 能力清单 | 反序列化缺失 `suggestions` / `chat` / `web` 的清单 | 缺失项取默认值 `false`，解析不失败；已有值被保留 |
| UT-S29-11 | `Limits` 含 `max_project_mb`、`max_file_mb`、`max_members_per_project` | API delta §九（`capabilities.rs:56-61`） | Server 能力清单 | 读取限额 | 三项限额均可读取；客户端据此预判而非硬编码 |
| UT-S29-12 | 能力发现路径固定为 `/.well-known/oleafly-server` | 协议 delta §2.1（`capabilities.rs:5`）；API delta §九 | Server 已启动 | GET 该路径 | 返回能力清单；`/healthz`（仅存活）与 `/readyz`（可接流量）语义不同，不被当作能力清单 |
| UT-S29-13 | setup claim 端点 `POST /auth/setup-claim`；**缺少或错误的 setup code 不得授予管理员身份** | API delta §三（`routes/auth.rs:46`）；场景实现 §四 | 全新 Server（`needs_setup = true`） | 无 setup code / 错误 setup code 的 setup claim | 请求被拒；`accounts` 中不出现管理员账号 |
| UT-S29-14 | 登录链路端点齐全：`/auth/start`、`/auth/callback/{provider}`、`/auth/challenge`、`/auth/token`、`/auth/refresh`、`/auth/sign-out` | API delta §三；场景实现 §三 Step 5 | Server 已启动且已有 provider | 依次调用各端点 | 链路可走通并换回会话凭据；客户端把 Server 条目写入本地 Server 注册表 |
| UT-S29-15 | 桌面 / API 族使用 `Authorization: Bearer <token>`；scheme 大小写不敏感、token 不得为空 | API delta §3.2（`routes/mod.rs:132-138`） | 已有有效令牌 | `bearer` / `BEARER` / 空 token 三种 | 两种大小写均通过解析；空 token 被拒 |
| UT-S29-16 | 令牌解析链：`bearer_token` → `tokens::resolve_access_token` → 查 `accounts.status`；`status != 'active'` 返回 `Unauthorized` 或 `SessionEnded` | API delta §3.2（`routes/mod.rs:90-125`） | 账号被 suspended / removed | 用该账号的令牌请求受保护端点 | 请求被拒且错误可区分；不授予访问 |
| UT-S29-17 | 设备登记后可由 `GET /api/v1/devices` 与 `GET /api/v1/projects/{project}/devices` 列出 | API delta §四；场景实现 §三 Step 6 | 已完成设备登记 | 调用两个设备列表端点 | 本次登录设备出现在列表中 |
| UT-S29-18 | 分享端点：`PUT/DELETE /api/v1/projects/{project}/members/{account}` 授予 / 移除成员；`GET /api/v1/projects/{project}/members` 列成员 | API delta §四（`routes/projects.rs:67-73`） | 项目已存在且当前用户为 Owner | 授予成员角色 | `project_grants` 写入对应成员与角色 |
| UT-S29-19 | 项目分享设置 `link_sharing` / `link_role` 由 `PATCH /api/v1/projects/{project}` 更新 | API delta §四（`routes/projects.rs:52`）；场景实现 §三 Step 8 | 项目已存在 | 开启链接分享并指定链接角色 | `projects` 行上 `link_sharing` / `link_role` 被更新 |
| UT-S29-20 | 链接加入：`GET /api/v1/projects/{project}/join` 预览、`POST` 加入 | API delta §四（`routes/projects.rs:55-58`）；场景实现 §三 Step 9 | 链接分享已开启 | 先 GET 预览再 POST 加入 | 先预览后加入；加入后按所授角色获得访问 |
| UT-S29-21 | 项目标题上限 `MAX_TITLE_CHARS = 200` | API delta §四（`routes/projects.rs:46`） | 项目已创建 | 标题恰好 200 字符 / 201 字符 | 200 接受；201 被拒（`BadRequest`） |
| UT-S29-22 | 目录端点 `GET /api/v1/directory` 的可见范围按角色收敛 | API delta §四（`routes/projects.rs:74`） | 不同 Server 角色的账号各一 | 各自调用目录端点 | Guest / Unknown 不可见目录（`SeeDirectory` 权限矩阵）；Member 及以上可见 |
| UT-S29-23 | 落地页端点 `GET /p/{project}` 匿名可达 | API delta §十（`routes/landing.rs:18`） | 项目已分享且开启链接分享 | 无凭据访问 | 返回分享落地页；与其他需认证端点区分 |
| UT-S29-24 | Server 角色与动作矩阵：`server_role_allows` 对 11 个 `ServerAction` 给出允许 / 拒绝 | 协议 delta §3.1（`roles.rs:41-70`） | 协议 crate 已编译 | 逐角色 × 逐动作枚举 | 与协议 delta 矩阵一致：Admin 全允许；Maintainer 允许 5 项管理类 + ShareProjects / SeeDirectory；Member 仅 ShareProjects / SeeDirectory；Guest / Unknown 全拒 |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S29-25 | `accounts.status` 的 CHECK 约束只允许 `'active'` / `'suspended'` / `'removed'` | DB delta §二（0001）；`0001_core.sql` | Server 数据库已迁移到 schema 18 | 写入 `status = 'suspended'` / 写入 `status = 'deleted'` | 前者成功；后者被 CHECK 拒绝（`SQLITE_CONSTRAINT`） |
| UT-S29-26 | `accounts.server_role` 的 CHECK 约束只允许 `'admin'` / `'maintainer'` / `'member'` / `'guest'` | DB delta §二（0001） | 同上 | 写入合法值 / 非法值 `'superuser'` | 合法值成功；非法值被拒 |
| UT-S29-27 | `devices.public_key` 的 UNIQUE 约束：同一公钥不得登记两台设备 | DB delta §二（0001） | 已登记设备 D1 | 再次插入相同 `public_key` | 第二次插入被 UNIQUE 拒绝 |
| UT-S29-28 | `devices.account_id` 外键指向 `accounts(id)`，设备随账号级联删除 | DB delta §二、§三 A 组 | 已有账号与设备 | 删除账号 | 设备行随之删除；无悬挂设备行 |
| UT-S29-29 | `devices.revoked_at` 记录撤销时刻；撤销后该设备的令牌家族被拒 | DB delta §二（0001）；场景实现 §四 | 已登记设备 | 撤销该设备 | `revoked_at` 落库；该设备后续登录 / 刷新 / 同步被拒并返回明确错误 |
| UT-S29-30 | `access_tokens.token_hash` / `refresh_tokens.token_hash` 为主键，**只存哈希不存明文令牌** | DB delta §三 A 组；场景实现 §四 | 已完成登录 | 检查令牌表内容 | 表内只有哈希列；无明文 token 列或值 |
| UT-S29-31 | `projects.status` 的 CHECK 约束只允许 `'pending'` / `'active'` / `'archived'` | DB delta §二（0002 / 0015） | 项目已创建 | 写入合法 / 非法状态 | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S29-32 | `projects.link_role` 的 CHECK 约束只允许 `'editor'` / `'reviewer'` / `'commenter'` / `'viewer'`（0015 重建后口径） | DB delta §二（0015）；`0015_review_roles.sql` | 项目已存在 | 写入 `'viewer'` / 写入 `'owner'` | 合法值成功；`'owner'` 被拒（Owner 不可作为链接角色） |
| UT-S29-33 | `project_grants` 主键为 `(project_id, account_id)`：同一项目同一成员不可重复授权 | DB delta §三 B 组；`0002_projects.sql` | 已授权成员 M | 再次插入同一 `(project_id, account_id)` | 被主键约束拒绝，不产生重复授权行 |
| UT-S29-34 | `project_grants.role` 的 CHECK 约束只允许 `'owner'` / `'editor'` / `'reviewer'` / `'commenter'` / `'viewer'` | DB delta §二（0015） | 项目已存在 | 写入合法角色 / 非法角色 `'guest'` | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S29-35 | `projects.owner_account` 与 `project_grants.account_id` 的外键指向 `accounts(id)` | DB delta §二、§三 A/B 组 | 项目已创建 | 写入指向不存在 account 的外键 | 被外键约束拒绝；不出现悬挂授权 |
| UT-S29-36 | `guest_invitations` 的部分唯一索引 `guest_invitations_open (project_id, email) WHERE status IN ('awaiting_approval','invited')` | DB delta §二（0015） | 已有一条 `awaiting_approval` 邀请 | 为同一 `(project_id, email)` 再插一条待审批 / 已邀请邀请 | 被唯一索引拒绝；同邮箱不同项目不受限；已 `revoked` / `expired` 的旧行不占用该唯一约束 |

### 1.3 来源分组：业务规则（setup code、协议协商、设备准入、分享语义）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S29-37 | 全新 Server 的**首个管理员初始化必须提供 setup code** | 需求 §四 S29「边界：首次 admin 初始化」；场景实现 §四 | `needs_setup = true` | 缺 setup code 的 setup claim | 不授予管理员身份，返回明确错误 |
| UT-S29-38 | 协议不兼容时**停止同步并明确报告，不产生半同步状态** | 需求 §四 S29「异常：协议不兼容」；场景实现 §四、§五 | 客户端与 Server 区间无交集 | 发起同步 | 同步停止；错误可区分客户端过旧 / 服务端过旧；不写入任何变更、不进入降级编辑 |
| UT-S29-39 | 设备被 **suspended** 时登录 / 同步被明确拒绝，不授予访问 | 需求 §四 S29「异常：suspended 或已撤销设备」；inventory S29 行 | 账号 `status = 'suspended'` | 尝试登录 / 同步 | 返回明确错误（准入 suspended → not admitted）；不授予访问 |
| UT-S29-40 | 设备**已被撤销**（令牌家族被 revoke）时登录 / 刷新 / 同步被拒绝 | 需求 §四 S29；场景实现 §四 | 设备已撤销 | 用其令牌请求 | 返回明确错误；不授予访问 |
| UT-S29-41 | 可授予角色只有 Editor / Reviewer / Commenter / Viewer 四种，`Owner` 不可被授予（`grantable`） | 协议 delta §3.2（`roles.rs:24-30`）；场景实现 §二 | 项目已存在 | 逐个 `ProjectRole` 调用 `grantable` | 四种可授予角色返回 true；`Owner` 返回 false（Owner 由项目归属决定） |
| UT-S29-42 | 分享语义按实现口径：重叠文本是 **Loro 自动合并 + 只读 Merge Review**，不是「一切变更都先询问」 | 需求 §四 S32 与 §5.1（偏差 D12）；inventory 偏差清单 | 用户阅读分享说明文案 | 核对文案与实现一致性 | 文案不得声称「asks before it applies anything」式过宽承诺；测试断言以「自动合并 + 只读审查」为准 |
| UT-S29-43 | Server 能力清单中 `encryption = none`，产品不得宣传为端到端加密 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；宿主 / 磁盘 / 备份运营者可读项目内容这一事实被如实呈现 |
| UT-S29-44 | 登录相关端点受专门限流中间件约束 | API delta §十一（`lib.rs:84-86`） | Server 已启动 | 高频请求登录端点 | 超限被拒（`RateLimited`），不拖垮 Server |
| UT-S29-45 | 客户端读取 Server 注册表：添加 Server 后本地保存 Server 条目 | 场景实现 §三 Step 5；参与者表 | 登录成功 | 读取本地 Server 注册表 | Server 条目存在，含地址与协议协商结果 |

---

## 二、场景测试用例

### 2.1 主路径：服务器接入与项目共享

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S29-01 | 添加 Server 并完成能力发现与协议协商 | Step 1→3 | 已获得自建 Server 地址；Server 已部署可访问 | ① 在 Settings › Collaboration 添加 Server 地址 → ② 客户端请求 `/.well-known/oleafly-server` → ③ 客户端以自身协议区间与 Server 区间做 min/max 协商 | 取得 `protocol {min,max}`、`needs_setup`、provider 列表与功能开关；协商取交集高端；本地 Server 注册表写入该条目 |
| ST-S29-02 | 经 GitHub / OIDC 登录并完成设备登记 | Step 5→6 | Server 已有 provider 且已完成 setup（`needs_setup = false`） | ① 客户端按 Server 公布的 provider 发起登录（`/auth/start` → 回调 → `/auth/challenge` → `/auth/token`）→ ② 设备登记落库 → ③ 查询设备列表 | 换回会话凭据；设备出现在 `/api/v1/devices` 与项目维度设备列表；无重复登记 |
| ST-S29-03 | 分享项目、授予成员角色并经邀请链接加入 | Step 7→10 | 当前用户为项目 Owner；已开启链接分享 | ① 授予成员角色（`/api/v1/projects/{project}/members/{account}`）→ ② 开启链接分享并指定链接角色 → ③ 协作者经邀请链接先 GET 预览再 POST 加入 | `project_grants` 与 `projects.link_sharing/link_role` 落库；协作者加入后**按所授角色**获得项目访问，后续编辑经实时同步通道进行（S30） |

### 2.2 异常路径

> EX 编号与 `collab-S29-server-onboarding.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S29-01 | 协议不兼容 | 客户端与 Server 协议区间无交集 | S29-AC-03 |
| EX-S29-02 | 首次 admin 初始化 | 全新 Server 尚无管理员，setup code 缺失或错误 | S29-AC-04 |
| EX-S29-03 | 设备被 suspended | 该设备所属账号被 Server 暂停 | S29-AC-02 |
| EX-S29-04 | 设备已撤销 | 设备被签出撤销（令牌家族被 revoke） | S29-AC-02 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S29-04 | 协议区间无交集时停止同步并明确报告 | EX-S29-01 | 客户端协议区间与服务端区间无交集 | 发起同步 / 建立 WS 握手 | 同步停止且明确报告；错误可区分「客户端过旧」与「服务端过旧」；**不产生半同步状态**，不写入任何变更 |
| ST-S29-05 | 首个管理员缺 setup code 时不授予管理员身份 | EX-S29-02 | 全新 Server（`needs_setup = true`） | 提交 setup claim 但 setup code 缺失 / 错误 | 认领失败；`accounts` 中无管理员账号；不进入后续登录与分享步骤 |
| ST-S29-06 | 账号被 suspended 时登录 / 同步被拒 | EX-S29-03 | 账号 `status = 'suspended'` | 该设备尝试登录 / 同步 | 返回明确错误（准入 suspended → not admitted）；不授予访问 |
| ST-S29-07 | 设备被撤销后令牌家族失效 | EX-S29-04 | 设备已被撤销 | 该设备尝试登录 / 刷新 / 同步 | 返回明确错误；不授予访问；不产生任何项目变更写入 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S29-08 [manual] | 真实双端协作 peer 的接入与加入链路 | Step 1→10 | 两台真实机器 / 两个真实桌面实例，指向同一自建 Server | ① 端 A 添加 Server 并登录 → ② 端 A 分享项目并生成邀请链接 → ③ 端 B 经链接加入 → ④ 两端同时编辑 | 人工确认双端能建立实时通道并收敛（`e2e/109-live-collaboration-peer.spec.ts` 覆盖此路径；真实网络与真实浏览器跳转在无头 CI 中不稳定） |
| ST-S29-09 [manual] | 第三方登录 provider（GitHub / OIDC）的真实跳转与回调 | Step 5 | 配置了真实 OAuth provider 的 Server | ① 点击登录 → ② 在真实浏览器完成授权 → ③ 回到应用 | 人工确认回调可携带凭据返回并完成设备登记（跨进程 OAuth 跳转不可在无头 CI 稳定断言） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S29-AC-01（正常：接入与分享）→ ST-S29-01、ST-S29-02、ST-S29-03、UT-S29-01、UT-S29-12、UT-S29-17、UT-S29-18
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S29-AC-02（异常：suspended 或已撤销设备）→ ST-S29-06、ST-S29-07、UT-S29-16、UT-S29-25、UT-S29-29、UT-S29-39、UT-S29-40
  - S29-AC-03（异常：协议不兼容）→ ST-S29-04、UT-S29-02、UT-S29-03、UT-S29-05、UT-S29-06、UT-S29-07、UT-S29-38
  - S29-AC-04（边界：首次 admin 初始化）→ ST-S29-05、UT-S29-13、UT-S29-37
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S29-01→ST-S29-04、EX-S29-02→ST-S29-05、EX-S29-03→ST-S29-06、EX-S29-04→ST-S29-07（4/4 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `deltas/api/collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「契约中不可省略的入参 / 不可省略的返回字段」等价覆盖：`CapabilityManifest` 必填字段（UT-S29-01）、`ProtocolRange.min/max`（UT-S29-02）、`ProviderKind` / `EncryptionSupport` / `Features` / `Limits`（UT-S29-08 ~ UT-S29-11）、能力发现路径（UT-S29-12）、setup claim 端点（UT-S29-13）、登录链路端点（UT-S29-14）、Bearer 认证（UT-S29-15、UT-S29-16）、设备列表端点（UT-S29-17）、成员与分享端点（UT-S29-18、UT-S29-19）、join 预览与加入（UT-S29-20）、标题上限（UT-S29-21）、目录端点（UT-S29-22）、落地页（UT-S29-23）、Server 角色动作矩阵（UT-S29-24）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增字段时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `accounts.status` CHECK（UT-S29-25）、`accounts.server_role` CHECK（UT-S29-26）、`devices.public_key` UNIQUE（UT-S29-27）、`devices.account_id` FK（UT-S29-28）、`access_tokens.token_hash` PK（UT-S29-30）、`projects.status` CHECK（UT-S29-31）、`projects.link_role` CHECK（UT-S29-32）、`project_grants` PK（UT-S29-33）、`project_grants.role` CHECK（UT-S29-34）、`project_grants.account_id` FK（UT-S29-35）、`guest_invitations_open` 部分唯一索引（UT-S29-36）。
  - **未覆盖（说明原因）**：Server 数据库的 `UNIQUE` / `CHECK` 约束中，其余条目（`identities` 主键、`account_emails` 主键、`allowlist` UNIQUE 与 CHECK、`domain_rules.domain` UNIQUE、`devices.id` PK、`nonces` PK、`refresh_tokens.token_hash` PK、`settings.value` CHECK、`project_updates` 主键与 UNIQUE、`project_snapshots` 主键、`project_blobs` 主键、`project_peers` 主键、`project_outputs` 主键与 CHECK、`web_sessions` 主键与 UNIQUE）分别落在其他 collab 场景（S30 / S31 / S32 / S40 / S41）的 DB 分组中登记，本文件不重复登记以免越界。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景是**桌面端接入自建 Server 的客户端流程**，Server 部署形态、安装器、Compose/systemd、健康检查与升级迁移属 `delivery` 模块 S51 的部署与 smoke 方案，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S29-AC-01 | **正常：接入与分享** — GIVEN 用户拿到自建 Server 地址 / WHEN 添加 Server、经 GitHub/OIDC 登录并完成设备登记后分享项目 / THEN 协作者经邀请加入并进入共享项目，按所授角色参与协作 | ST-S29-01, ST-S29-02, ST-S29-03, UT-S29-01, UT-S29-12, UT-S29-14, UT-S29-17, UT-S29-18, UT-S29-19, UT-S29-20, UT-S29-45 |
| S29-AC-02 | **异常：suspended 或已撤销设备** — GIVEN 设备被 Server 暂停（suspended）或已被撤销 / WHEN 该设备尝试登录/同步 / THEN 返回明确错误，不授予访问 | ST-S29-06, ST-S29-07, UT-S29-16, UT-S29-25, UT-S29-29, UT-S29-39, UT-S29-40 |
| S29-AC-03 | **异常：协议不兼容** — GIVEN 客户端与 Server 的协作协议版本不兼容 / WHEN 建立同步 / THEN 停止同步并明确报告，不产生半同步状态 | ST-S29-04, UT-S29-02, UT-S29-03, UT-S29-04, UT-S29-05, UT-S29-06, UT-S29-07, UT-S29-38 |
| S29-AC-04 | **边界：首次 admin 初始化** — GIVEN 全新 Server 尚无管理员 / WHEN 第一个管理员初始化 / THEN 必须提供 setup code 才能完成初始化 | ST-S29-05, UT-S29-13, UT-S29-37 |

> 追溯说明：`S29-AC-01` ~ `S29-AC-04` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S29 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
