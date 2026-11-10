## ADDED — 协作 Server HTTP / WS 接口契约（现状快照）

> module: collab | 服务形态：独立 Rust crate `oleafly-server`（`0.1.1`），HTTP 服务器（axum）
> 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）
> 事实来源：提案 `logos/changes/add-baseline-docs/inventory.md`「API 资产」段（Server HTTP/WS 路由全集）、collab 段（S29-S42）与 delivery 段（S51）；并以实现定位符佐证（`crates/oleafly-server/src/routes/*`、`crates/oleafly-server/src/web/*`）。
> **本文档是现状契约快照，非新增 API 设计**：不新增端点、不改路径与语义。本次为只读静态盘点，**未执行任何测试**，动态行为在 verify 阶段单独取证。

## 一、性质与边界声明

- 本 Server 是**跨进程、跨设备的公开网络面**，与桌面端的进程内 typed IPC（见 `core-01-backend-port.md`）是两套完全不同的东西。
- 桌面端与浏览器端共用同一个 Server 协议，但**走不同的路由族与认证方式**（桌面/API 族用 Bearer token；浏览器族用会话 cookie）。
- **项目内容不是端到端加密**：宿主、磁盘与备份运营者可读取（inventory collab 段首行口径，`encryption` 能力声明为 `none`）。
- 本文档只记录**当前实现**，不构成对外版本承诺；Server 的能力由下文「能力声明端点」在运行时给出。

## 二、路由族总览

| 路由族 | 前缀 | 主要用途 | 认证 |
|---|---|---|---|
| 认证族 | `/auth/*` | OIDC / GitHub / 邮箱链接 / 设备码登录、令牌刷新、登出 | 登录端点匿名；`/auth/token`、`/auth/refresh` 依令牌 |
| 设备与账号族 | `/api/v1/me`、`/api/v1/devices*` | 当前账号、设备列举与登出 | Bearer |
| 项目族 | `/api/v1/projects*`、`/api/v1/directory` | 项目 CRUD、成员、快照、blob、提交、归档 | Bearer |
| 协作治理族 | `/api/v1/projects/{project}/invitations*`、`/api/v1/admin/guest-invitations*` | 邀请、审批、撤销 | Bearer + 角色校验 |
| Admin 族 | `/api/v1/admin/*` | 成员、设备、域名规则、允许名单、设置、安全日志 | Bearer + Server 角色校验 |
| 控制台族 | `/api/v1/admin/overview`、`/api/v1/admin/projects*` | 管理台概览与项目归档 | Bearer + Server 角色校验 |
| 访问日志族 | `/api/v1/projects/{project}/access-log` | 项目访问日志分页 | Bearer + 项目 Owner |
| 输出族 | `/api/v1/projects/{project}/output*` | PDF / SyncTeX 产物列举与读写 | Bearer + 项目角色 |
| 实时通道 | `/ws`、`/api/v1/projects/{project}/poll`、`/api/v1/projects/{project}/frames` | WebSocket 主通道、长轮询回退、批量补帧 | Bearer |
| 浏览器族 | `/web/*`、`/web/api/*` | 浏览器协作前端与其 API | 会话 cookie |
| 健康与能力族 | `/.well-known/oleafly-server`、`/healthz`、`/readyz` | 能力清单、存活、就绪 | 匿名 |
| 落地页族 | `/p/{project}` | 分享落地页 | 匿名可达 |

装配位置：`crates/oleafly-server/src/routes/mod.rs:35-55`（`api_routes()` 合并各子路由）；可选路径前缀嵌套见 `crates/oleafly-server/src/lib.rs:75-80`；全局 fallback 404、登录限流中间件与请求体上限见同文件 `:81-90`。

## 三、认证族

### 3.1 端点清单

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/auth/start` | GET | 发起登录流程 | `routes/auth.rs:45` |
| `/auth/setup-claim` | POST | 首个管理员凭 setup code 认领（`needs_setup`） | `routes/auth.rs:46` |
| `/auth/callback/{provider}` | GET | OIDC / GitHub 回调 | `routes/auth.rs:47` |
| `/auth/challenge` | POST | 发起设备码挑战 | `routes/auth.rs:48` |
| `/auth/token` | POST | 换取访问令牌 | `routes/auth.rs:49` |
| `/auth/refresh` | POST | 刷新会话 | `routes/auth.rs:50` |
| `/auth/sign-out` | POST | 登出 | `routes/auth.rs:51` |
| `/auth/device/code` | POST | 签发设备码 | `routes/code_sign_in.rs:48` |
| `/auth/device/token` | POST | 用设备码换令牌 | `routes/code_sign_in.rs:49` |
| `/auth/device` | GET / POST | 设备码入口页与状态检查 | `routes/code_sign_in.rs:50` |
| `/auth/device/continue` | POST | 设备码继续授权 | `routes/code_sign_in.rs:51` |
| `/auth/device/deny` | POST | 设备码拒绝授权 | `routes/code_sign_in.rs:52` |
| `/auth/email-link` | POST | 请求邮箱登录链接 | `routes/email_sign_in.rs:35` |
| `/auth/email-link/verify` | GET / POST | 校验并使用登录链接 | `routes/email_sign_in.rs:36` |

### 3.2 认证方式

- **桌面 / API 族**：`Authorization: Bearer <token>`。解析实现两处一致：`routes/mod.rs:132-138`（`bearer_token`）与 `routes/ws.rs:63-68`；scheme 大小写不敏感，token 不得为空。
- **鉴权链**：`bearer_token` → `tokens::resolve_access_token` → 查 `accounts` 的 `server_role` 与 `status`；仅 `status == "active"` 通过，否则返回 `Unauthorized` 或 `SessionEnded`（`routes/mod.rs:90-125`）。
- **授权链**：认证通过后仍需按 `ServerRole` 校验动作（`ServerAction`），见 `collab-02-collab-protocol.md` 角色章节；越权返回 `Forbidden`（`routes/mod.rs:72-80`）。
- **浏览器族**：30 天 HttpOnly / Secure / Lax cookie；写请求必须同时满足**精确 Origin** 与 `X-Oleafly-Requested-With` 标记（`web/mod.rs:166-180`）；Origin 不匹配视为跨站请求被拒。
- **代理 IP**：只采信可信代理的 `X-Forwarded-For`（inventory「信任边界」段）。

## 四、项目族

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/api/v1/projects` | GET / POST | 列出 / 创建项目 | `routes/projects.rs:51` |
| `/api/v1/projects/{project}` | GET / PATCH | 查看 / 更新项目 | `routes/projects.rs:52` |
| `/api/v1/projects/{project}/commit` | POST | 提交一次变更 | `routes/projects.rs:53` |
| `/api/v1/projects/{project}/archive` | POST | 归档项目 | `routes/projects.rs:54` |
| `/api/v1/projects/{project}/join` | GET / POST | 链接预览 / 按链接加入 | `routes/projects.rs:55-58` |
| `/api/v1/projects/{project}/blobs/{hash}` | PUT / GET | 内容寻址 blob 上传 / 下载 | `routes/projects.rs:59-62` |
| `/api/v1/projects/{project}/snapshot` | PUT / GET / HEAD | 快照上传 / 下载 / 存在性探测 | `routes/projects.rs:63-66` |
| `/api/v1/projects/{project}/members` | GET | 成员列表 | `routes/projects.rs:67` |
| `/api/v1/projects/{project}/devices` | GET | 项目维度设备列表 | `routes/projects.rs:68` |
| `/api/v1/projects/{project}/peers` | GET | 在线同伴列表 | `routes/projects.rs:69` |
| `/api/v1/projects/{project}/members/{account}` | PUT / DELETE | 授予 / 移除成员 | `routes/projects.rs:70-73` |
| `/api/v1/directory` | GET | 目录（可见范围按角色收敛） | `routes/projects.rs:74` |
| `/api/v1/projects/{project}/access-log` | GET | 访问日志分页 | `routes/access_log.rs:19` |
| `/api/v1/projects/{project}/output` | GET | 输出产物列表 | `routes/outputs.rs:28` |
| `/api/v1/projects/{project}/output/{kind}` | GET / PUT | 产物读取 / 上传（kind 仅 `pdf` 或 `synctex`） | `routes/outputs.rs:29-32`；取值校验 `outputs.rs:37-46` |

补充事实：

- 快照序列号通过 **`x-oleafly-snapshot-seq`** 头传递（`routes/projects.rs:43`）。
- 项目族与输出族都挂 `transfers::retry_soon` 响应中间件（`routes/projects.rs:75`、`routes/outputs.rs:33`），用于在 429 / 503 busy 场景给出 `Retry-Soon` 语义（对应 inventory S31「429/503 busy 长等待」）。
- 项目标题上限 `MAX_TITLE_CHARS = 200`（`routes/projects.rs:46`）。
- 输出产物读取需校验 magic / 大小 / main-hash，校验失败拒绝（inventory S42）。

## 五、协作治理族（Guest 与邀请）

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/api/v1/projects/{project}/invitations` | GET / POST | 邀请列表 / 发起邀请 | `routes/guests.rs:29-32` |
| `/api/v1/projects/{project}/invitations/{invitation}` | DELETE | Owner 撤销邀请 | `routes/guests.rs:33-36` |
| `/api/v1/admin/guest-invitations` | GET | 待审批邀请列表 | `routes/guests.rs:37` |
| `/api/v1/admin/guest-invitations/{invitation}` | DELETE | 管理员撤销 | `routes/guests.rs:38-41` |
| `/api/v1/admin/guest-invitations/{invitation}/approve` | POST | 批准 | `routes/guests.rs:42-45` |
| `/api/v1/admin/guest-invitations/{invitation}/decline` | POST | 拒绝 | `routes/guests.rs:46-49` |

Guest 侧既有约束（inventory S36）：Guest 默认关闭、审批默认开启、邀请 14 天过期、每账号 20 个/小时、无 SMTP 时可手工 Add link、Guest 不能查看 directory / 分享 / 邀请、移除其最后一个项目即终止其准入。

## 六、Admin 族与控制台族

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/api/v1/admin/members` | GET | 成员列表 | `routes/admin.rs:33` |
| `/api/v1/admin/members/{account_id}` | PATCH / DELETE | 改 / 删成员 | `routes/admin.rs:34-37` |
| `/api/v1/admin/members/{account_id}/devices` | GET | 成员设备列表 | `routes/admin.rs:38-41` |
| `/api/v1/admin/devices/{device_id}` | DELETE | 登出任意设备 | `routes/admin.rs:42` |
| `/api/v1/admin/allowlist` | GET / POST | 允许名单 | `routes/admin.rs:43-46` |
| `/api/v1/admin/allowlist/{entry_id}` | DELETE | 移除允许名单项 | `routes/admin.rs:47-50` |
| `/api/v1/admin/domains` | GET / POST | 域名规则 | `routes/admin.rs:51` |
| `/api/v1/admin/domains/{rule_id}` | DELETE | 移除域名规则 | `routes/admin.rs:52` |
| `/api/v1/admin/settings` | GET / PATCH | 服务端设置 | `routes/admin.rs:53-56` |
| `/api/v1/admin/security-log` | GET | 安全日志分页 | `routes/admin.rs:57` |
| `/api/v1/admin/email` | GET | 邮件配置状态 | `routes/email.rs:24` |
| `/api/v1/admin/email/test` | POST | 发送测试邮件 | `routes/email.rs:25` |
| `/api/v1/admin/email/preferences` | GET / PATCH | 邮件偏好 | `routes/email.rs:26-29` |
| `/api/v1/admin/overview` | GET | 管理台概览 | `routes/console.rs:35` |
| `/api/v1/admin/projects` | GET | 管理台项目列表 | `routes/console.rs:36` |
| `/api/v1/admin/projects/{project}/archive` | POST | 管理台归档项目 | `routes/console.rs:37` |
| `/api/v1/admin/projects/{project}/unarchive` | POST | 管理台取消归档 | `routes/console.rs:38-41` |

重要边界（inventory S37）：**Admin 的项目管理 ≠ 项目内容授权**；Admin 项目管理能力与项目级角色权限是两条独立链路；只有项目 Owner 可读项目访问日志；server 可全局禁用访问日志。

## 七、实时通道（WS 与长轮询）

### 7.1 端点

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/ws` | GET（Upgrade） | 桌面 / API 客户端主实时通道 | `routes/ws.rs:60` |
| `/api/v1/projects/{project}/poll` | GET | 长轮询取增量 | `routes/poll.rs:37` |
| `/api/v1/projects/{project}/frames` | POST | 批量提交帧 | `routes/poll.rs:38` |
| `/web/ws` | GET（Upgrade） | 浏览器实时通道 | `web/mod.rs:36` |

### 7.2 连接与鉴权

- `/ws` 与 `/poll` 均要求 `Authorization: Bearer`（`routes/ws.rs:98`、`routes/poll.rs:139`）。
- `/ws` 受**每账号连接数上限**约束，超限返回 `RateLimited`（`routes/ws.rs:80-89`）。
- WS 帧有最大尺寸限制，超限按 `TooLarge` 处理（`routes/ws.rs:86`、`ws.rs:114-124`）；二进制帧按 `BadFrame` 处理，损坏帧不阻断后续帧。
- 帧的 wire 类型、版本协商与错误码见 `collab-02-collab-protocol.md`。

### 7.3 桌面与浏览器的差异（重要）

- **桌面端**：WS 两次失败后**回退到 `/frames` + `/poll`**，每分钟重新探测（inventory S31）。
- **浏览器端**：**只有 WS 重连，没有 long-poll 回退**（inventory S40 明确偏差）；离线状态下的新编辑会被 reject。
- 浏览器端未确认输入保存在 sessionStorage（约 2M 字符 / 7 天），**不是跨设备离线队列**（inventory S40）。

## 八、浏览器族（Web 前端与其 API）

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/web` | GET | 浏览器协作首页 | `web/mod.rs:32` |
| `/web/` | GET | 首页 | `web/mod.rs:33` |
| `/web/{*path}` | GET | 静态资源 | `web/mod.rs:34` |
| `/web/sign-in` | GET | 浏览器登录页 | `web/mod.rs:35` |
| `/web/ws` | GET（Upgrade） | 浏览器实时通道 | `web/mod.rs:36` |
| `/web/api/me` | GET | 当前浏览器账号 | `web/mod.rs:37` |
| `/web/api/projects` | GET | 可访问项目列表 | `web/mod.rs:38` |
| `/web/api/projects/{project}` | GET | 项目详情 | `web/mod.rs:39` |
| `/web/api/projects/{project}/blobs/{hash}` | GET | blob 读取 | `web/mod.rs:40` |
| `/web/api/projects/{project}/texts` | GET | 文本内容 | `web/mod.rs:41` |
| `/web/api/projects/{project}/output` | GET | 产物读取 | `web/mod.rs:42` |
| `/web/api/projects/{project}/...` | — | 其余项目相关操作 | `web/mod.rs:43-48` |
| `/web/api/sign-out` | POST | 登出 | `web/mod.rs:49` |
| `/web/api/{*rest}` | ANY | 未知路径兜底 | `web/mod.rs:50` |

浏览器族能力边界（inventory S40-S42）：

- 浏览器端**没有编译引擎**：生产环境只读 Owner / Editor 上传的 PDF / SyncTeX；fake engine 仅用于开发测试。
- 非 Owner / Editor 上传产物被拒绝；magic / 大小 / main-hash 校验失败即拒绝。
- 会话安全：30 天 HttpOnly / Secure / Lax cookie、严格 CSP 禁 framing、过期视为登出；`forbidden` / `not_found` / `removed` / `archived` 结束访问；`project_too_large` / `server_busy` 为独立错误分类。

## 九、健康与能力端点

| 端点 | 方法 | 语义 | 证据 |
|---|---|---|---|
| `/.well-known/oleafly-server` | GET | **能力清单**（`CapabilityManifest`） | `routes/meta.rs:105`；清单类型 `crates/oleafly-collab-protocol/src/capabilities.rs:63-74` |
| `/healthz` | GET | **仅表示进程存活** | `routes/meta.rs:106` |
| `/readyz` | GET | **才表示可接流量** | `routes/meta.rs:107-110` |

能力清单字段（`capabilities.rs:63-74`）：

| 字段 | 含义 |
|---|---|
| `server_id` | Server 标识（重启后持久，inventory S51） |
| `name` / `icon_url` / `version` | 展示信息与 Server 版本 |
| `protocol` | `{ min, max }` 协议版本区间（协商用，见 `collab-02-collab-protocol.md`） |
| `needs_setup` | 是否尚未完成首个管理员 setup code 认领 |
| `providers` | 登录方式列表（`github` / `oidc` / `email_link` / `unknown`，`capabilities.rs:13-28`） |
| `features` | 能力开关：`email`、`guests`、`link_sharing`、`access_logs`、`comments`、`encryption`、`suggestions`、`chat`、`web`（`capabilities.rs:40-54`） |
| `limits` | 限额：`max_project_mb`、`max_file_mb`、`max_members_per_project`（`capabilities.rs:56-61`） |

`encryption` 取值为 `none` / `allowed` / `required` / `unknown`（`capabilities.rs:30-37`）；当前实现的能力声明为 **`none`**——**项目内容不是端到端加密**。

## 十、落地页

| 端点 | 方法 | 用途 | 证据 |
|---|---|---|---|
| `/p/{project}` | GET | 分享落地页 | `routes/landing.rs:18` |

## 十一、跨端通用约定

- 错误以结构化响应返回，客户端需区分：`Unauthorized`、`Forbidden`、`NotFound`、`BadRequest`、`RateLimited`、`SessionEnded`、`Internal`（`crates/oleafly-server/src/error.rs` 家族，`routes/mod.rs:69-70` 使用）。
- 限流与请求体上限在路由层统一施加：登录相关端点有专门限流中间件（`lib.rs:84-86`），请求体上限 `MAX_BODY_BYTES`（`lib.rs:88`）。
- 可选路径前缀：Server 支持 `path_prefix` 嵌套（`lib.rs:75-80`），因此对外暴露的完整路径可能带前缀。
- 依赖已丢失 change 的更新**不能凭空收敛**：必须等原作者重新上线（inventory S39）。

## 十二、不可推断事项

- **不得**由本路由表推断存在「公共 REST 开放 API」——Server 的对外暴露面受认证、角色与部署配置约束；Server 的发布与部署另有专门契约（见 delivery 模块部署文档）。
- **不得**把浏览器族的 cookie 认证与 API 族的 Bearer 认证混用：二者是不同会话模型，浏览器写请求还有 Origin + 标记头约束。
- **不得**推断 Web 端具备编译能力或 long-poll 回退。
- 本次盘点**未运行测试**，上述端点清单与语义均为静态阅读实现得出。
