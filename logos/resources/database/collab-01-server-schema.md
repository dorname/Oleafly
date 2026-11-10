## Oleafly Server 数据库规格（现状快照）

> **基线口径**：桌面 `0.4.11`，Server crate `0.1.1`，CLI crate `0.1.0`；绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **口径引用块（强制）**：
> - 本文件是**只读静态盘点**产物，描述的是**现状 schema 快照，非新增设计**。文中不引入任何新表、新字段、新索引、新流程，也不承诺任何尚未实现的行为。
> - 本次基线**未运行任何测试、未执行任何 migration、未连接任何真实数据库**，所有结论均来自对仓库内 SQL 迁移脚本与 Rust 存储代码的静态阅读。verify 阶段取证时，测试结果只能声明「未执行 / 环境未装依赖」，不得预填 PASS。
> - **事实来源**：提案 `logos/changes/add-baseline-docs/inventory.md` 的「架构与测试要点 → 数据资产」行、collab 场景段（S29-S42）与 S51 交付行；同目录 `deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md` 的 Server 运维与升级章节。文中括注的仓库路径为盘点时的证据指针。
> - **本文性质**：存量数据库现状基线。只记录已存在的 schema 版本、迁移演进链、数据对象分组、并发参数与升级/回滚约束，供后续 requirements / feature-specs / scenario-implementation / test-cases 全链引用。

---

### 一、总览

Oleafly Server 使用**单个 SQLite 数据库**承载全部服务端状态，**当前 schema 版本为 18**。

| 项 | 值 | 证据 |
|---|---|---|
| Schema 版本常量 | `SCHEMA_VERSION = 18` | `crates/oleafly-server/src/db.rs:14` |
| 迁移脚本数量 | 18（`0001_core.sql` … `0018_web_sessions.sql`） | `crates/oleafly-server/migrations/` |
| 迁移加载方式 | 编译期 `include_str!` 编入二进制，运行时逐个执行 | `crates/oleafly-server/src/db.rs:17-37` |
| 版本记录位置 | SQLite `PRAGMA user_version` | `crates/oleafly-server/src/db.rs:273` |
| 引擎 | SQLite（rusqlite） | `crates/oleafly-server/src/db.rs:10` |
| 日志模式 | WAL（强制，保留 WAL 失败即报错） | `crates/oleafly-server/src/db.rs:113-119` |
| 读写分离 | 4 个只读连接池 + 1 个写入连接 | `crates/oleafly-server/src/db.rs:40, 121` |
| 写入批处理上限 | grouped write 每组 64 条 | `crates/oleafly-server/src/db.rs:40` |
| 大对象存储 | 数据库之外，blob 落文件系统或 S3 | `crates/oleafly-server/src/blobs.rs:177-247` |

**边界**：Server 数据库内只存**结构化元数据与引用**（哈希、字节数、路径、权限、时间戳），**不存文件内容**。项目文件与快照的字节载荷走 blob 存储（见第六节）。

---

### 二、迁移演进链（0001 → 0018）

迁移链**只增不改历史**：每个迁移脚本是一次性、顺序执行、不可逆的演进步骤；已经落库的历史脚本不会被后续脚本改写。

| # | 脚本 | 主题 | 引入 / 变更的数据对象 |
|---|---|---|---|
| 0001 | `0001_core.sql` | 身份认证族 | `server_meta`、`accounts`、`identities`、`account_emails`、`allowlist`、`domain_rules`、`devices`、`pending_auth`、`auth_codes`、`nonces`、`access_tokens`、`refresh_tokens`、`settings`、`security_log` |
| 0002 | `0002_projects.sql` | 项目与协作表 | `projects`、`project_grants`、`project_updates`、`project_snapshots`、`project_blobs` |
| 0003 | `0003_email.sql` | 邮件偏好 | `email_preferences` |
| 0004 | `0004_comments.sql` | 评论开关 | `projects` 增加 `comments_enabled` 列（ALTER） |
| 0005 | `0005_snapshot_blobs.sql` | 快照 blob 关联 | `project_snapshots` 增加 `hash` 列（ALTER） |
| 0006 | `0006_access_log.sql` | 访问日志 | `project_access_log` |
| 0007 | `0007_guests.sql` | Guest 邀请与移除 | `guest_invitations`、`project_removals` |
| 0008 | `0008_sign_in_links.sql` | 登录链接与设备登记 | `email_link_tokens`、`device_authorizations`、`sign_in_throttle` |
| 0009 | `0009_peer_bindings.sql` | peer binding 与清理辅助 | 新增 `project_peers`；`project_snapshots` 增 `signed_by`/`signature`；`projects` 增 `peers_known`；`project_blobs` 增 `used_at` 并建 `project_blobs_used` 索引 |
| 0010 | `0010_storage_cleanup.sql` | 存储清理队列 | `pending_removals` |
| 0011 | `0011_mention_emails.sql` | 提及邮件 | `mention_scans`、`mention_emails` |
| 0012 | `0012_device_code_network.sql` | 设备码与网络信息 | `device_authorizations` 增 `requested_from`、`grace_reply`（ALTER） |
| 0013 | `0013_project_sizes.sql` | 项目大小统计 | `projects` 增 `log_bytes`、`file_bytes`；用 5 个触发器在写入时维护累计值 |
| 0014 | `0014_comment_rechecks.sql` | 评论复核队列 | `comment_rechecks` |
| 0015 | `0015_review_roles.sql` | reviewer/commenter 角色与统计 | 重建 `projects`、`project_grants`、`guest_invitations` 三表以纳入 `reviewer`/`commenter` 角色枚举，并重建 5 个大小统计触发器 |
| 0016 | `0016_public_service.sql` | 公开服务配额 | `account_uploads`；`projects` 增加 `projects_owner` 索引 |
| 0017 | `0017_project_outputs.sql` | 每项目最新 PDF / SyncTeX | `project_outputs`（`kind` ∈ `pdf`/`synctex`，主键 `project_id + kind`） |
| 0018 | `0018_web_sessions.sql` | 浏览器 session token hash | `web_sessions`（主键 `token_hash`，关联 `devices`/`accounts`，`mode` ∈ `editing`/`suggesting`，含 `expires_at`） |

**演进链的三条结构性主线**：

1. **权限模型扩展**：0002 的角色枚举止于 `owner/editor/viewer`，0007 的 Guest 角色止于 `editor/viewer`，0015 统一扩为 `owner/editor/reviewer/commenter/viewer`——这是 S33「协作角色权限边界」五角色模型的 schema 落点。
2. **统计从「查询时现算」改为「写入时累计」**：0013 用触发器维护 `log_bytes`/`file_bytes`，避免每次配额检查都全表 SUM 变更日志；0015 在重建表后把同样的 5 个触发器重新种回。
3. **数据库职责边界外移**：0005 起快照与文件只留哈希引用，0009 起加签名与 `used_at`，0017 再把「每项目最新 PDF/SyncTeX」登记为可查询行——字节载荷始终不在库内。

---

### 三、数据对象分组

按职责把 18 个迁移引入的表归为六组，便于后续场景与测试用例定位：

| 组 | 语义 | 表 |
|---|---|---|
| **A. 身份与凭据** | 账号、身份源、邮箱、白名单、域名规则、设备、待认证、授权码、nonce、访问/刷新令牌 | `accounts`、`identities`、`account_emails`、`allowlist`、`domain_rules`、`devices`、`pending_auth`、`auth_codes`、`nonces`、`access_tokens`、`refresh_tokens` |
| **B. 项目与协作** | 项目本体、成员授权、变更日志、快照索引、文件索引、peer 绑定 | `projects`、`project_grants`、`project_updates`、`project_snapshots`、`project_blobs`、`project_peers` |
| **C. 访客与移除** | Guest 邀请、项目移除记录、待清理队列 | `guest_invitations`、`project_removals`、`pending_removals` |
| **D. 审计与日志** | 项目级访问日志、服务端安全日志、邮件偏好、提及扫描与提及邮件 | `project_access_log`、`security_log`、`email_preferences`、`mention_scans`、`mention_emails` |
| **E. 登录链接与节流** | 邮箱登录链接、设备登记授权、登录节流 | `email_link_tokens`、`device_authorizations`、`sign_in_throttle` |
| **F. 配额与输出** | 账号级上传配额、每项目最新输出、浏览器会话、评论复核、实例级元数据与全局设置 | `account_uploads`、`project_outputs`、`web_sessions`、`comment_rechecks`、`server_meta`、`settings` |

**分组说明**：

- 组 B 是**协作主干**：`project_updates` 存 Loro 变更信封（`envelope` BLOB），`project_snapshots` / `project_blobs` 只存引用与字节数，`project_peers` 记录 peer 绑定与计数终点。
- 组 D 支撑 S37「访问日志与管理控制台」：只有项目 Owner 可读项目日志，服务端可全局禁用。
- 组 E 支撑 S29 的登录流程与 S36 的 Guest 登录链接；`sign_in_throttle` 是限流状态而非业务数据。
- 组 F 的 `account_uploads` 是 S38「通知邮件与配额限制」中「上传限制」的实现点；`web_sessions` 是 S40/S41「浏览器实时协作 / 浏览器会话安全」的落点——**只存 token 的哈希，不存明文令牌**。

---

### 四、WAL 与并发参数

| 参数 | 取值 | 位置 | 说明 |
|---|---|---|---|
| `PRAGMA journal_mode` | `WAL` | `src/db.rs:113` | 写入后**校验返回值**，若引擎保留为其他模式则直接返回错误，不静默降级 |
| `PRAGMA foreign_keys` | `ON` | `src/db.rs:136, 87` | 读写连接均开启外键约束 |
| `PRAGMA query_only` | `ON`（只读连接） | `src/db.rs:92` | reader 连接额外设为只读 |
| 只读连接标志 | `SQLITE_OPEN_READ_ONLY \| SQLITE_OPEN_NO_MUTEX` | `src/db.rs:89-91` | reader 池单连接由外部 `Mutex` 串行化 |
| `busy_timeout` | 5 秒（读写连接一致） | `src/db.rs:95, 111` | 锁竞争时最多等待 5 秒 |
| Reader 池容量 | **4** | `src/db.rs:40` (`READERS`) | 轮转取用（`next_reader` 原子计数），池空时回落到主连接 |
| Grouped write 上限 | **64** | `src/db.rs:40` (`GROUP_LIMIT`) | 等待队列中一批最多合入 64 个写操作 |
| 写入串行化 | 单写连接 + 队列 drain | `src/db.rs:181-210` | 写请求先进等待队列，由一个后台任务批量 drain 后统一提交 |

**并发语义要点**：

- **读写不互斥**：读走 4 个独立的只读连接，写走单一连接，二者在 WAL 下并行。
- **写是串行的**：所有写请求经 `write_grouped` 进入同一个队列，由单个 drain 协程批量执行，因此写吞吐受限于单连接提交次数，而非并发度。
- **每组写内部独立**：drain 时每个写操作跑在自己的 savepoint 中（`in_savepoint`），单条失败只回滚该条，不污染同批其他写。
- **批次提交是原子的**：一个批次整体 commit，commit 失败整批不落库（`src/db.rs:193-205`）。

---

### 五、升级、拒绝打开与回滚约束

#### 5.1 迁移逐个事务 + 外键自检

每次启动时比较 `PRAGMA user_version` 与已知的 18 个迁移：

- **逐个迁移独立事务**：每个迁移脚本在**自己的事务**内执行 `execute_batch`，随后在**同一事务内**执行 `PRAGMA foreign_key_check`；发现任何一行外键指向不存在的父行即返回错误，**该迁移不提交**。通过检查后写 `PRAGMA user_version = N` 并 `commit`。
  （`src/db.rs:293-308`）
- **迁移期间临时关闭外键**：迁移前记录 `PRAGMA foreign_keys` 的原值，迁移过程中置 `OFF`（因为迁移要重建表并搬运数据），迁移结束后按原值恢复。
  （`src/db.rs:284-291`）
- **部分失败即停**：迁移链按序执行，`skip(applied)` 跳过已应用部分；任一迁移失败即整体返回错误，**已提交的前序迁移保留**（版本号已推进），下次启动从断点继续。

#### 5.2 数据库比程序新 → 拒绝打开

若 `PRAGMA user_version` **大于**当前二进制认识的迁移数（18），Server **拒绝打开该数据库**并给出明确错误：

> the database schema version {current} is newer than this Oleafly Server understands ({known}). Install a newer Oleafly Server or restore a backup.

（`src/db.rs:273-280`）

这意味着：**用旧二进制打开已被新版本升级过的数据库不会被"降级兼容"，而是直接失败**。

#### 5.3 旧二进制不能简单回滚新 DB

由于 5.2 的拒绝打开机制，**不能把旧版 Server 二进制直接指向新版升级过的数据库**。回滚路径必须是「**用旧版二进制 + 旧版数据库**」或「**恢复备份**」，不存在"旧程序读新库"的中间态。部署与升级流程必须遵守此约束：**先备份、后升级**（见第六节与 `delivery-01-deployment.md` 的 Server 运维章节）。

#### 5.4 实例标识持久化

`server_id` 存放在 `server_meta` 表（键 `server_id`），首次需要时生成 UUIDv7 并落库；进程重启后读回同一标识。（`src/db.rs:15, 315-322`）这与 S51「重启后 server_id 持久」一致。

---

### 六、blob 存储的两条路径与备份边界

**Server 数据库不存文件字节**。文件与快照的载荷通过 `BlobStore` 抽象落到两处之一（`src/blobs.rs:177-247`）：

| 路径 | 配置 | 载荷位置 |
|---|---|---|
| **文件系统** | `BlobStoreConfig::Filesystem` | 数据目录下的 `blobs/` 子目录（`data_dir.join("blobs")`） |
| **S3 兼容对象存储** | `BlobStoreConfig::S3(S3Config)` | 配置的 bucket |

数据库中只保留**哈希引用与字节数**（`project_blobs.hash/size`、`project_snapshots.hash`、`project_outputs.blob_hash`），供后续校验与取回。

**备份边界（必须写清，不可含糊）**：

- **备份 SQLite 数据库 ≠ 备份 blob**。数据库的备份/复制只覆盖元数据与引用；被引用的文件与快照字节在文件系统路径下或对象存储 bucket 里，需要**单独**纳入备份范围。
- **Litestream 只复制 SQLite**。可选的 Litestream 服务把数据库的每次变更增量复制到 S3 兼容 bucket，**它不复制文件系统模式下 `blobs/` 目录里的文件与快照**。因此：文件系统模式下，卷归档仍是必需的；对象存储模式下，bucket 与数据库副本要一起恢复。
- **恢复顺序有依赖**：若磁盘丢失且文件在磁盘上，应恢复**最新的卷归档**；**不要**把来自 Litestream 的更新数据库盖在旧归档之上——那样数据库会指向归档中不存在的文件与快照，那些项目将无法打开。

（口径对应 inventory.md 的 S39「服务端备份与恢复」与 delivery 部署 delta 的 Server 运维章节。）

---

### 七、本文的范围声明

- 本文件**只描述 Server 数据库**。桌面端五个本地库的规格见同目录 `core-01-local-stores.md`。
- 本文件**不含**任何新增设计：表结构、迁移内容、并发参数均为现状记录。
- 涉及具体行为的测试用例（如迁移失败回滚、版本拒绝打开、配额计数）在后续 `logos/resources/test/` 阶段按本文档的约束编写，**本文档不声称这些行为已被动态验证**。
