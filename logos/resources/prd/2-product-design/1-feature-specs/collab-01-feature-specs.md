## Oleafly 实时协作（collab）功能规格（现状基线）

> module: collab ｜ 基线口径：桌面 0.4.11，绑定提交 `9c307bf3c`（HEAD，领先 v0.4.11 标签 3 个提交），Server crate 0.1.1
> 本文档为存量产品现状基线：只描述已实现能力，事实仅来自提案 `inventory.md`（collab 段 S29-S42）与需求文档 `collab-01-requirements.md`，不新增任何功能或交互。
> **加密边界**：项目内容不是端到端加密——Server capability 明确 `encryption=None`，宿主、磁盘与备份运营者可读取项目内容，不得宣传为 E2E 加密。
> **权限边界**：权限在服务端逐 change 校验，客户端 UI 不是安全边界；协作协议为 collab protocol v1（min/max 协商），协议不兼容停止同步。
> **未验证声明**：本基线为静态盘点，上文行为均有实现与测试证据，但本次未执行任何测试；协作 crowd/soak、浏览器 harness、部署 installer E2E 等动态行为在 verify 阶段单独取证。

### 四条同步路径区分（本模块只覆盖路径①）

Oleafly 存在四条数据同步路径，能力与语义完全不同，不得混称：

| 路径 | 归属模块 | 本质 | 本模块是否覆盖 |
|---|---|---|---|
| ① 实时协作 | **collab（本模块）** | 自建 Oleafly Server + Loro change log + WS 实时收敛，多端共同编辑同一项目 | 覆盖（S29-S42 全部） |
| ② 云同步 | sync | Dropbox/Google Drive/S3 挂载的多设备文件同步，非实时、非共同编辑 | 不覆盖 |
| ③ 在线 LaTeX 服务桥 | sync | 与在线 LaTeX 服务的 Git 桥双向同步与项目导入，非实时 | 不覆盖 |
| ④ 普通 Git hosting | core | GitHub/GitLab/Gitea/Forgejo/Codeberg 或自建 remote 的 push/pull | 不覆盖 |

以下场景全部属于路径①；与其余三条路径互不替代，需求与宣传中不得混为一谈。

---

### S29: 服务器接入与项目共享

**优先级**：P0 ｜ **触发**：团队启用实时协作，接入一台自建 Oleafly Collaboration Server

#### 功能入口与表面
- 桌面端「添加 Server」入口：填写自建 Server 地址 → GitHub/OIDC 登录 → 设备登记。
- 项目分享表面：分享项目、生成邀请链接并指定角色。
- Server 首次初始化：第一个 admin 初始化入口（需 setup code）。

#### 关键交互
1. 用户在桌面端添加自建 Server 地址，经 GitHub/OIDC 登录。
2. 完成设备登记，设备获得同步资格。
3. Owner 分享项目或生成邀请链接并指定角色。
4. 协作者经邀请加入项目，按所授角色进入协作。

#### 能力与限制
- 全新 Server 的第一个 admin 初始化必须提供 setup code 才能完成。
- 客户端与 Server 协作协议版本不兼容时，停止同步并明确报告，不产生半同步状态。
- 设备被 suspended 或已撤销时，登录/同步返回明确错误，不授予访问。
- README 离线冲突概括（原偏差 D12，README 已由 fix-doc-deviations 对齐）：实际重叠文本是 Loro 自动合并 + 只读 Merge Review，并非一切变更都先询问（见 S32）。

#### 关联需求
- `collab-01-requirements.md` §S29（用户价值：一键接入 Server 并把项目按角色分享给协作者）；痛点 P01。
- 证据（inventory 节选）：docs/collaboration-server.md L1-28、L641-765；routes/auth.rs L43-85；e2e/109-live-collaboration-peer.spec.ts L201-297。

### S30: 实时共同编辑

**优先级**：P0 ｜ **触发**：多个协作者打开同一项目并发编辑

#### 功能入口与表面
- 共享项目的协作编辑器：文本与文件树并发编辑。
- presence 表面：协作者光标与在线状态实时显示。

#### 关键交互
1. 多个协作者打开同一项目。
2. 并发编辑文本与文件树。
3. 编辑、光标与在线状态（presence）经 Server 实时同步。
4. 各端内容经 Loro change log 收敛一致。

#### 能力与限制
- 大文本分批发送。
- 过大单批被判 Unsendable 时该批暂不发送，但不阻断其他内容的同步。
- 慢上传不被 quiet timeout 误判。
- 个别损坏 frame 不阻断后续 frame 的处理。

#### 关联需求
- `collab-01-requirements.md` §S30（用户价值：编辑内容、结构与在线状态实时收敛，无需互传文件）；痛点 P01。
- 证据（inventory 节选）：collab/sync/tests/editing.rs L3-59；big_files.rs L6-317；transport.rs L297-366。

### S31: 断线重连与增量补发

**优先级**：P0 ｜ **触发**：网络中断、Server 暂时不可用或客户端重启

#### 功能入口与表面
- 同步引擎传输层自动处理，无独立用户操作入口；行为体现为断线后编辑不丢、恢复后自动补齐。

#### 关键交互
1. 断网期间继续编辑，本地变更保留。
2. 网络恢复后客户端重连 Server。
3. 本地未同步变更增量补发并与服务端合并，无丢失。
4. 桌面端 WS 连续两次失败时回退 `/frames`+`/poll` 传输，并每分钟重探 WS 可用性（该回退仅桌面端有，浏览器端无，见 S40）。

#### 能力与限制
- 重连退避含 jitter。
- 重连请求收到 429/503 busy 时进入长等待而非高频冲击。
- 客户端重启后重发已确认的 batch，服务端幂等处理，不重复存储。

#### 关联需求
- `collab-01-requirements.md` §S31（用户价值：断网期间的工作在恢复后自动补齐，不丢失）；痛点 P04。
- 证据（inventory 节选）：sync/mod.rs L191-207；reconnect.rs L49-309；transport.rs L3-54、L170-256；editing.rs L130-275。

### S32: 离线冲突合并与审查

**优先级**：P0 ｜ **触发**：离线/断线期间产生重叠编辑或外部磁盘变化

#### 功能入口与表面
- Merge Review 只读对话框：按作者与 diff 审查合并结果。
- 同步暂停横幅（SyncPauseBanner）：大批量外部磁盘变化时的 Send / Keep local 选择。
- 冲突副本保留通知。

#### 关键交互
1. 离线期间两端对同一文本产生重叠编辑。
2. 恢复同步后，文本由 Loro/OT 自动合并。
3. 用户在只读 Merge Review 中按作者与 diff 审查合并结果。
4. 二进制文件或路径冲突无法自动合并时，保留双方副本并通知用户，不静默覆盖。
5. 项目目录发生大批量外部磁盘变化时进入同步暂停，由用户选择 Send / Keep local。

#### 能力与限制
- 并非所有重叠文本都要求人工二选一：实际行为是自动合并 + 只读审查（原偏差 D12，README 已对齐）。
- 写盘失败时退避并通知。
- 暂停、副本与通知均有明确行为，不静默丢弃任何一方修改。

#### 关联需求
- `collab-01-requirements.md` §S32（用户价值：文本冲突自动合并、可审查；无法合并的保留副本不丢数据）；痛点 P04。
- 证据（inventory 节选）：merge.rs L402-498；MergeReviewDialog.tsx L25-216；kept.rs L148-322；sync_hold.rs L26-310；SyncPauseBanner.tsx L24-75。

### S33: 协作角色权限边界

**优先级**：P0 ｜ **触发**：项目内存在 Owner/Editor/Reviewer/Commenter/Viewer 多角色协作

#### 功能入口与表面
- Owner 成员管理入口：邀请成员并授予五角色之一、管理成员、管理邀请链接、停止分享。
- Reviewer 客户端固定处于 Suggesting 模式。

#### 关键交互
1. Owner 邀请成员并授予 Owner/Editor/Reviewer/Commenter/Viewer 五角色之一。
2. 各角色按角色定义执行各自允许的操作（Reviewer 固定 Suggesting）。
3. 客户端发出超出角色权限的 change 时，服务端逐 change 校验并拒绝。
4. Owner 管理成员、邀请链接与停止分享。

#### 能力与限制
- 权限在服务端逐 change 校验，不依赖客户端 UI 的自我约束；客户端 UI 不是安全边界。
- 用户被移出项目或项目被归档后，同步结束。
- Viewer 在受限期间的本地编辑保留为 pending，权限恢复后可发出。

#### 关联需求
- `collab-01-requirements.md` §S33（用户价值：权限边界清晰且在服务端强制，不怕客户端被绕过）；痛点 P01。
- 证据（inventory 节选）：collab-protocol/projects.rs L108-143；server/tests/review_roles.rs L148-409；refusals.rs L17-118；e2e L331-350。

### S34: 评论建议与项目聊天

**优先级**：P0 ｜ **触发**：协作者需要审阅、讨论与沟通

#### 功能入口与表面
- 评论表面：评论 / 回复 / mention / resolve。
- 建议表面：提出建议、接受 / 拒绝 / 撤回。
- 项目聊天表面。
- 离线排队：断网期间操作排队，恢复后发出。

#### 关键交互
1. 协作者发表评论 / 回复 / mention / resolve。
2. 提出建议并接受 / 拒绝 / 撤回。
3. 在项目聊天中沟通。
4. 断网期间的评论等操作排队，恢复连接后发出。

#### 能力与限制
- 项目关闭评论功能（comments off）时，新评论与既有评论的 resolve 均被拒绝，但文本编辑继续不受影响。
- Reviewer 不能接受建议（包括自己提出的）。
- Commenter 不能改文本、不能提建议、不能清空他人内容。

#### 关联需求
- `collab-01-requirements.md` §S34（用户价值：评论、建议与聊天都在项目内完成且与权限一致）；痛点 P01。
- 证据（inventory 节选）：server/tests/comment_switch.rs L171-366；offline_comments.rs L29-420；docs L862-876。

### S35: 共享历史与版本恢复

**优先级**：P0 ｜ **触发**：团队需要回溯或恢复共同编辑的某个版本

#### 功能入口与表面
- 共享历史面板（SharedHistory）：只读打开 / 比较 / 命名 / 恢复版本。

#### 关键交互
1. 打开共享历史；历史由本地完整 Loro change log 构建。
2. 选择某版本只读查看、比较并命名。
3. 恢复选定版本，以新 change 形式追加，旧历史不被抹除。

#### 能力与限制
- 本地 change log 不含目标版本时返回 `history_unavailable`，不凭空构造内容。
- Reviewer 可查看历史但不能恢复。
- 恢复以新 change 追加，不抹除旧历史。
- 空名称 / 超长名称被拒绝。

#### 关联需求
- `collab-01-requirements.md` §S35（用户价值：完整历史可查可恢复，恢复不破坏历史）；痛点 P04。
- 证据（inventory 节选）：collab/history.rs L16-395；SharedHistory.test.tsx L88-187；docs L878-882。

### S36: Guest 外部协作者

**优先级**：P1 ｜ **触发**：Owner 需要邀请项目外人员临时参与

#### 功能入口与表面
- Owner 邀请入口：发起 Guest 邀请。
- 审批环节（默认开启）。
- 未配置 SMTP 时的手工 Add link 入口。

#### 关键交互
1. Owner 发起 Guest 邀请。
2. 邀请经审批通过。
3. Guest 以已验证邮箱登录。
4. Guest 只能访问被邀请的项目，不触及其他内容。

#### 能力与限制
- Guest 功能默认关闭，审批默认开启。
- 邀请链接 14 天过期，每小时最多 20 个。
- 未配置 SMTP 时提供手工 Add link。
- Guest 登录后不能查看 directory / 分享 / 邀请，越界访问被拒绝。
- Guest 被移出最后一个项目后，admission 终止。

#### 关联需求
- `collab-01-requirements.md` §S36（用户价值：外部协作者受控、限时、只访问受邀项目）；痛点 P01。
- 证据（inventory 节选）：docs L812-844；routes/guests.rs L27-66；server/tests/guests.rs L230-1501。

### S37: 访问日志与管理控制台

**优先级**：P1 ｜ **触发**：Owner 需要审计项目访问，Admin 需要运维 Server

#### 功能入口与表面
- 项目级访问日志（Owner）：开启开关与加入 / 下载 / 打开事件查看。
- Server 管理控制台（Admin）：成员 / 设备 / 域名 / 安全日志 / 归档管理。

#### 关键交互
1. 项目 Owner 开启访问日志。
2. 协作者加入 / 下载 / 打开项目产生事件，Owner 查看对应记录。
3. Admin 经管理控制台执行成员 / 设备 / 域名 / 安全日志 / 归档的管理操作。

#### 能力与限制
- 项目访问日志只有项目 Owner 可读；Admin 的项目管理不等于项目内容授权。
- Server 可全局禁用访问日志。
- 客户端反复重连不产生重复日志记录。

#### 关联需求
- `collab-01-requirements.md` §S37（用户价值：加入/下载/打开有记录，成员/设备/域名可管理）；痛点 P03。
- 证据（inventory 节选）：routes/access_log.rs L18-58；server/tests/access_log.rs L126-490；console.rs L33-42。

### S38: 通知邮件与配额限制

**优先级**：P1 ｜ **触发**：开放注册的 Server 运营中，需要通知与配额控制

#### 功能入口与表面
- 服务端运营行为，无独立用户操作表面：邮件异步发送（mention / 邀请 / 分享触发）与配额限制（Server 配置项：存储 / 项目数 / 上传限制）。

#### 关键交互
1. 用户触发 mention / 邀请 / 分享，对应邮件异步发送。
2. 开放注册 Server 配置存储 / 项目数 / 上传限制。
3. 配额内的操作正常完成。

#### 能力与限制
- 邮件内存队列按 30s→2m→10m→30m→2h 间隔重试后丢弃。
- Server 重启会丢失未发送的普通邮件（明确边界）。
- 存储配额满返回 413，但文本 change 仍可通过；请求频率超限返回 429。

#### 关联需求
- `collab-01-requirements.md` §S38（用户价值：mention/邀请/分享有邮件通知，资源滥用有上限）；痛点 P03。
- 证据（inventory 节选）：docs L767-860；routes/email.rs L19-100。

### S39: 服务端备份与恢复

**优先级**：P1 ｜ **触发**：灾备演练或事故后恢复 Server 数据

#### 功能入口与表面
- Server 运维行为：fs / S3 两种备份模式、恢复流程、可选 Litestream。

#### 关键交互
1. 备份：fs 模式备份整个 data 目录；S3 模式 DB 与 bucket 一起备份。
2. 从备份恢复旧库。
3. 客户端重连后补发服务端缺失的 changes，项目内容收敛。

#### 能力与限制
- 某更新依赖的 change 在备份间隙丢失且原作者当前不在线时，相关更新须等原作者上线后补发，不能凭空收敛。
- Litestream 只复制 SQLite，不替代 S3 对象备份。

#### 关联需求
- `collab-01-requirements.md` §S39（用户价值：备份-恢复后协作可继续，靠客户端补发收敛）；痛点 P02。
- 证据（inventory 节选）：docs L933-1000；sync/tests/restore.rs L87-258；litestream.yml。

### S40: 浏览器实时协作

**优先级**：P0 ｜ **触发**：协作者无桌面端，经浏览器访问 Server 参与协作

#### 功能入口与表面
- 浏览器端协作界面：登录后按角色编辑 / 建议 / 评论 / 聊天 / 查看 presence。
- 断线恢复：恢复 inflight 请求与 sessionStorage 中的未确认输入。

#### 关键交互
1. 用户在浏览器登录 Server。
2. 按所授角色编辑 / 建议 / 评论 / 聊天 / 查看在线状态（presence）。
3. 断线恢复时，inflight 请求与 sessionStorage 中的未确认输入被恢复；ack 丢失场景经 transform 处理。

#### 能力与限制
- 浏览器只有 WS 重连，没有桌面端的 `/frames`+`/poll` long-poll 回退。
- 浏览器没有离线编辑能力：离线状态下发起新编辑被拒绝。
- sessionStorage 约 2M 字符 / 7 天上限，不是跨设备离线队列。

#### 关联需求
- `collab-01-requirements.md` §S40（用户价值：浏览器按角色完成编辑/建议/评论/聊天/presence）；痛点 P01。
- 证据（inventory 节选）：web/mod.rs L30-50；web/src/roles.ts L14-38；gateway.ts L73-98、L280-649；unsent.ts L12-75；gateway.test.ts L316-462。

### S41: 浏览器会话安全

**优先级**：P0 ｜ **触发**：浏览器客户端访问 Server 的所有会话

#### 功能入口与表面
- 浏览器会话链路（cookie）与写请求防护，属横切安全机制，无独立功能页面。

#### 关键交互
1. 登录成功后建立 30 天会话，cookie 为 HttpOnly / Secure / Lax。
2. 写请求校验精确 Origin 与 `X-Oleafly-Requested-With` 头。
3. 严格 CSP 禁止 framing。

#### 能力与限制
- 会话过期视为登出。
- 服务端判定 forbidden / not_found / removed / archived 时结束当前访问。
- 写请求 Origin 错误按 cross_site 拒绝。
- 项目过大 / 服务繁忙返回 `project_too_large` / `server_busy` 明确错误。

#### 关联需求
- `collab-01-requirements.md` §S41（用户价值：会话与写请求有明确防护，风险如实呈现）；痛点 P02。
- 证据（inventory 节选）：docs L921-931；web/mod.rs L145-188；web_api.rs L197-244、L454-542。

### S42: 浏览器输出查看

**优先级**：P1 ｜ **触发**：浏览器协作者需要查看编译产物并与源文核对

#### 功能入口与表面
- 浏览器输出视图：最新上传 PDF / SyncTeX 的读取与源 / PDF 双向跳转。
- 输出上传入口（仅 Owner/Editor，桌面端侧）。

#### 关键交互
1. Owner/Editor 上传 PDF 与 SyncTeX。
2. 浏览器协作者打开输出视图，读取最新上传的 PDF / SyncTeX。
3. 源与 PDF 双向跳转核对。

#### 能力与限制
- 非 Owner/Editor 的上传被拒绝。
- 文件 magic / 大小 / main-hash 校验失败的上传被拒绝。
- 生产浏览器没有编译引擎，不能编译；fake engine 仅用于开发与测试环境，不等同生产。

#### 关联需求
- `collab-01-requirements.md` §S42（用户价值：浏览器可读最新 PDF 并做源/PDF 跳转，但不虚构编译能力）；痛点 P01。
- 证据（inventory 节选）：web/src/compile/engines.ts L3-9；routes/outputs.rs L26-100；web_api.rs L113-195、L400-542。

---

## UI 表面清单（collab 模块，现状盘点，非原型）

### 桌面端（共享项目内）

| 表面 | 关联场景 | 说明 |
|---|---|---|
| 服务器接入（添加 Server / GitHub·OIDC 登录 / 设备登记） | S29 | 自建 Server 地址接入与登录 |
| 项目分享与邀请链接（角色指定） | S29、S33 | Owner 分享项目并指定五角色 |
| 协作编辑器（文本 / 文件树 / presence） | S30 | 并发编辑与在线状态 |
| Merge Review 只读对话框 | S32 | 按作者 / diff 审查自动合并结果 |
| 同步暂停横幅（Send / Keep local） | S32 | 大批量外部磁盘变化的选择 |
| 评论 / 建议 / 项目聊天 | S34 | 审阅与讨论，含离线排队 |
| 共享历史面板（打开 / 比较 / 命名 / 恢复） | S35 | 基于 Loro change log 的版本回溯 |
| 项目访问日志开关与事件查看（Owner） | S37 | 加入 / 下载 / 打开事件 |

### 浏览器端

| 表面 | 关联场景 | 说明 |
|---|---|---|
| 登录与 30 天会话 | S41 | HttpOnly / Secure / Lax cookie，严格 CSP |
| 按角色协作编辑器（Reviewer 固定 Suggesting） | S40、S33 | 编辑 / 建议 / 评论 / 聊天 / presence |
| 断线恢复（inflight + sessionStorage 未确认输入） | S40 | 仅 WS 重连，无 long-poll 回退，无离线编辑 |
| 输出查看（PDF / SyncTeX 源-PDF 双向跳转） | S42 | 只读 Owner/Editor 上传的最新输出 |

### Server 管理控制台（Admin）

| 表面 | 关联场景 | 说明 |
|---|---|---|
| setup code 初始化（首个 admin） | S29 | 全新 Server 初始化 |
| 成员 / 设备 / 域名 / 安全日志 / 归档管理 | S37 | Admin 运维入口 |
| Guest 邀请审批（审批默认开启）与手工 Add link | S36 | 无 SMTP 时的手工邀请链接 |
| 访问日志全局开关 | S37 | Server 可全局禁用 |
