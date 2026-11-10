## Oleafly 桌面端本地存储规格（现状快照）

> **基线口径**：桌面 `0.4.11`，Server crate `0.1.1`，CLI crate `0.1.0`；绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **口径引用块（强制）**：
> - 本文件是**只读静态盘点**产物，描述的是**现状 schema 快照，非新增设计**。文中不引入任何新表、新字段、新索引、不改变任何现有库的行为。
> - 本次基线**未运行任何测试、未创建任何真实数据库文件、未执行任何迁移**，所有结论均来自对仓库内 Rust 存储代码与 SQL DDL 的静态阅读。verify 阶段取证时，测试结果只能声明「未执行 / 环境未装依赖」，不得预填 PASS。
> - **事实来源**：提案 `logos/changes/add-baseline-docs/inventory.md` 的「架构与测试要点 → 数据资产」行（本地五库及其版本号）；collab 场景段（S29-S42）、core 场景段（S01-S15）、ai 场景段（S21-S28）、research 场景段（S16-S20）与 sync 场景段（S43-S49）。文中括注的仓库路径为盘点时的证据指针。
> - **本文性质**：存量本地存储现状基线。只记录已存在的五个 SQLite 库的用途、版本号与关键表，供后续 requirements / feature-specs / scenario-implementation / test-cases 全链引用。

---

### 一、总览

桌面端共有**五个互相独立的 SQLite 库**，各自承担不同职责，彼此不共享 schema、不做跨库 join：

| # | 库文件 | 版本标识 | 职责域 | 证据 |
|---|---|---|---|---|
| 1 | `library.db` | schema **3** | 内置 Copilot 的聊天、线程、检索索引与用量/预算 | `src-tauri/src/library_db.rs:11, 8` |
| 2 | `catalog.sqlite3` | checkpoint catalog format **2** | 检查点（快照历史）的分块存储目录与清单 | `crates/oleafly-history/src/lib.rs:15, 1541` |
| 3 | `tasks.sqlite3` | research schema **5** | Research Task 的任务、依赖、事件、运行、审批与世代 | `crates/oleafly-research/src/store/mod.rs:2792, 167` |
| 4 | `literature-cache.sqlite3` | 无显式版本号 | 文献检索结果缓存（TTL 过期） | `src-tauri/src/literature.rs:75` |
| 5 | `sessions.sqlite` | 无显式版本号 | ACP 外部 agent 的会话、事件、agent 定义/程序/偏好/运行时与项目设置 | `src-tauri/src/acp/store.rs:54` |

**总体分工**：桌面端把「**会话与对话**」（库 1、库 5）、「**检查点历史**」（库 2）、「**后台研究任务**」（库 3）、「**外部检索缓存**」（库 4）分库存放，任一库的损坏或重置不波及其余四库。

**与 Server 库的关系**：Server 端另有一个独立的协作数据库（schema 18），规格见同目录 `collab-01-server-schema.md`。**桌面端这五个库不参与实时协作协议的数据面**，协作状态不落在其中任何一个库里。

---

### 二、`library.db` — 会话、线程与用量（schema 3）

**位置**：Oleafly 数据根目录（`paths::oleafly_root()`）下的 `library.db`（`src-tauri/src/library_db.rs:7-16`）。
**版本标识**：`SCHEMA_VERSION = 3`，写入 `PRAGMA user_version`；打开时读 `user_version`，低于当前版本则升级（`src-tauri/src/library_db.rs:11, 22-27`）。

#### 关键表

| 表 | 类型 | 用途 |
|---|---|---|
| `chats` | 普通表 | 聊天会话正文。主键 `(project_id, chat_id)`，字段含 `title`、`json`（会话内容）、`updated_at_ms` |
| `session_index` | **FTS5 虚拟表** | 会话全文检索。列：`project_id`/`chat_id`（UNINDEXED）、`title`、`content` |
| `usage` | 普通表 | 旧版用量记录：provider、model、input/output tokens、`cost_usd`，含 `usage_project` 索引 |
| `usage_records` | 普通表 | 新版用量明细：`record_key` 主键，区分 `input_semantics`（inclusive/exclusive/unknown）、`counter_semantics`（delta/cumulative）、`measurement`、`billing_mode`、`status`、`aggregation_scope` 等，六个时间维度索引 + `usage_records_task` 索引 |
| `library_migrations` | 普通表 | 库内迁移记录（`name` + `applied_at_ms`），是 `usage` → `usage_records` 的一次性回填的幂等标记 |
| `budgets` | 普通表 | 项目预算，主键 `project_id`，字段 `budget_usd` |
| `threads` | 普通表 | 线程（多轮任务）元数据：`turn_count`、`input_tokens`、`output_tokens`、`archived` 等，含 `threads_project` 索引 |
| `thread_index` | **FTS5 虚拟表** | 线程内容全文检索。列：`thread_id`（UNINDEXED）、`content` |

#### 现状要点

- **两套检索索引并存**：`session_index` 与 `thread_index` 均为 FTS5 虚拟表，前者服务会话检索，后者服务线程检索；二者都不存储主数据，主数据仍在普通表里。
- **两套用量表并存**：`usage` 是旧路径的轻量表（`usage_records` 由 `usage` 回填生成），`usage_records` 是当前语义化明细表。二者通过 `usage_legacy_mirror` 触发器保持同步：向 `usage` 插入时自动写一条 `source_id = 'legacy-frontend'` 的 `usage_records` 记录。
- **回填幂等由 `library_migrations` 保证**：迁移名 `usage-records-v1` / `usage-records-v2` 记录在 `library_migrations` 表中，重复执行时由 `NOT EXISTS` 判定跳过，因此重复打开库不会重复回填。
- **计费口径是显式建模的**：`usage_records` 用 CHECK 约束把 token 计数语义、计数语义、测量来源、计费模式、状态、聚合范围固定为受控枚举，避免下游把「累计值」和「增量值」混算。
- **`observation_sequence` 列是增量追加的**：该列不在建表语句里，而是打开时检测缺失后用 `ALTER TABLE ... ADD COLUMN` 补齐（`src-tauri/src/library_db.rs` 尾部），补列失败会直接返回错误而非静默继续。

---

### 三、`catalog.sqlite3` — 检查点目录（checkpoint catalog format 2）

**位置**：检查点存储根目录下的 `catalog.sqlite3`（桌面端该根目录为 `oleafly_root()?.join("checkpoints").join(<project_id>)`，按项目划分；`crates/oleafly-history/src/lib.rs:1541`、`src-tauri/src/paths.rs:126-136`）。
**版本标识**：`FORMAT_VERSION = 2`，同样记录在 `PRAGMA user_version`。打开时若库中版本**高于**当前支持的 2，返回 `UnsupportedFormat` 错误；低于当前版本则走 `upgrade_existing_format` 升级（`crates/oleafly-history/src/lib.rs:15, 2565-2571`）。

#### 关键表

| 表 | 用途 |
|---|---|
| `packs` | 分块打包文件索引。主键 `pack_id`；`file_name` 唯一；`encoded_size` 非负约束 |
| `chunks` | 内容寻址分块。主键 `chunk_hash`，外键指向 `packs(pack_id)`；记录 `payload_offset`、`stored_len`、`raw_len`、`encoding`（0/1 枚举） |
| `manifests` | 快照清单。主键 `snapshot_root`，清单本体存 `manifest_json` BLOB |
| `manifest_chunks` | 清单与分块的多对多关联，外键分别指向 `manifests` 与 `chunks` |
| `checkpoints` | 检查点记录。自增 `sequence` 主键，`snapshot_root` 唯一；记录 `completed_at_unix_ms`、`engine`、`toolchain_identity`、`main_document`、`output_hash`、`file_count`、`logical_bytes`、`portable_metadata_bytes`、`chunk_references`、`label` |
| `store_identity` | 存储谱系标识。单例表（`singleton = 1` CHECK），`lineage` 唯一 |

#### 现状要点

- **目录与数据分离**：`catalog.sqlite3` 只存索引与元数据，实际的打包文件（`{pack_id}.pack`）以普通文件形式存放在同一根目录，由 `packs.file_name` 指向。
- **内容寻址**：`chunks.chunk_hash` 是主键，`manifest_chunks` 把快照根映射到它引用的所有分块，因此去重与完整性校验都基于哈希而非文件名。
- **建库在单事务内完成**：`BEGIN IMMEDIATE` … `COMMIT` 包裹全部 DDL，随后执行 `migrate_catalog_to_current_version`。
- **检查点带可复现身份**：`engine` 与 `toolchain_identity` 记录产出该检查点的编译引擎与工具链标识，`main_document` 与 `output_hash` 记录主文档与产物哈希。
- **与 S12 检查点恢复对应**：该库是 S12「检查点恢复与加密迁移」的数据落点；恢复语义、时间线查看与密码导出/导入的行为约束见 `core-S12-checkpoints.md` 的场景实现文档，本文件只负责记录其 schema 现状。

---

### 四、`tasks.sqlite3` — Research Task 存储（research schema 5）

**位置**：研究任务存储根目录下的 `tasks.sqlite3`；桌面端该根目录为 `oleafly_root()?.join("research-tasks")`（`crates/oleafly-research/src/store/mod.rs:167`、`src-tauri/src/research_tasks/mod.rs:38`）。
**版本标识**：`SCHEMA_VERSION = 5`，记录在 `PRAGMA user_version`。打开时若 `schema_version < SCHEMA_VERSION` 则执行初始化与升级（`crates/oleafly-research/src/store/mod.rs:178, 2795`）。

**升级链是分段式的**（`crates/oleafly-research/src/store/mod.rs:2788-2792`）：

| 阶段版本 | 内容 |
|---|---|
| `OWNER_SCHEMA_VERSION = 1` | owner 归属 |
| `BRIEF_SCHEMA_VERSION = 2` | 任务 brief |
| `HANDOFF_SCHEMA_VERSION = 3` | 交接（handoff）信息 |
| `EVENT_KIND_SCHEMA_VERSION = 4` | 事件 kind 列 |
| `SCHEMA_VERSION = 5` | 当前版本（generations 表） |

#### 关键表

| 表 | 用途 |
|---|---|
| `research_tasks` | 任务本体。主键 `id`；含 `project_id`、`runtime_id`、`agent_id`、`model_id`、`skill_ids_json`、`status`、`execution_generation`、`apply_state` / `apply_selection_json` / `apply_expected_generation`（apply 阶段状态）、`isolation_json`、`error` / `result_json` / `review_json`、起止时间戳 |
| `research_task_dependencies` | 任务依赖边。`task_id` 与 `dependency_id` 双外键指向 `research_tasks(id)`，依赖侧 `ON DELETE RESTRICT`、自身侧 `ON DELETE CASCADE`；CHECK 约束禁止自依赖 |
| `research_task_events` | 任务事件流。主键 `(task_id, execution_generation, sequence)`；`event_json` 存事件本体，`kind` 是由 `json_extract(event_json, '$.kind')` 生成的 VIRTUAL 列 |
| `research_task_runs` | 执行记录。主键 `(task_id, run_id)`；含 `executor`、`command`、`cwd_rel`（相对工作目录）、`state`、`exit_code`、`run_dir`、`handle_json` / `metrics_json`；含 `research_task_runs_live` 索引用于活跃运行查询 |
| `research_task_approvals` | 审批记录。主键 `id`；含 `kind`、`summary`、`detail`、`status`、`expires_at`、`decided_at`；含 `research_task_approvals_pending` 索引 |
| `research_task_generations` | 执行世代。主键 `(task_id, execution_generation)`；含 `resumed_from`（从哪一代恢复）与 `trimmed_through`（被裁剪到的工具调用序号） |

#### 现状要点

- **世代（generation）是这一版 schema 的核心**：任务、执行、审批、事件都带 `execution_generation`，因此同一任务的重新执行不会覆盖上一代的运行与事件记录；`research_task_generations` 记录恢复来源与裁剪位置。
- **依赖图受数据库约束保护**：`research_task_dependencies` 用外键 + CHECK 保证「不自依赖」「被依赖方存在」，删除任务时依赖侧级联、依赖方受限。
- **事件 kind 是生成列**：`kind` 由 `event_json` 的 `$.kind` 抽出，索引与筛选不依赖应用层写对字段。
- **执行记录只存相对路径**：`cwd_rel` 存相对工作目录而非绝对路径，避免把本机路径固化进任务状态。
- **对应 S26**：这是 S26「Research Task 隔离执行」的状态落点；隔离（worktree / snapshot）、apply 校验与回滚的行为约束见 ai 场景实现文档，本文件只记录 schema 现状。

---

### 五、`literature-cache.sqlite3` — 文献检索缓存

**位置**：Oleafly 数据根目录（`paths::oleafly_root()`）下的 `literature-cache.sqlite3`（`src-tauri/src/literature.rs:71-76`）。

| 表 | 字段 | 用途 |
|---|---|---|
| `entries` | `key`（主键）、`created_at`、`body` | 缓存条目。`key` 是查询参数与选项的哈希，`body` 是序列化响应 |

#### 现状要点

- **单表最小结构**：整个库只有一张 `entries` 表——缓存库不需要关系、不需要索引，靠主键直接命中。
- **TTL 为 24 小时**：读取条件为 `created_at > now - TTL_MS`，其中 `TTL_MS = 24 * 60 * 60 * 1000`；过期条目视为未命中。这与 S18「缓存约一天」的约束一致。
- **单条体积上限 2 MiB**：`MAX_BODY_BYTES = 2 * 1024 * 1024`，写入时超过该上限的响应直接丢弃，不落库。
- **条数上限 2000 条**：超过 `MAX_ROWS = 2_000` 时按 `created_at` 升序淘汰最旧的 10%（`rows / 10` 条），因此**过期数据不靠 TTL 主动清理，而是靠容量淘汰**。
- **失败是静默降级**：缓存库打开失败、写入失败、条数统计失败都不抛出，调用方继续走网络路径。
- **对应 S18 / S16**：这是 S18「草稿文献发现与 AI 评审」中「缓存约一天」这一约束的实现点，也是 S16 文献检索在 provider 不可用时的本地回退基础。

---

### 六、`sessions.sqlite` — ACP 外部 agent 会话存储

**位置**：Oleafly 数据根目录下 `acp/` 子目录中的 `sessions.sqlite`（根目录由 `paths::oleafly_root()?.join("acp")` 给出，库文件由 `Store::open` 在该根下创建；见 `src-tauri/src/acp/mod.rs:82-83`、`src-tauri/src/acp/store.rs:52-54`）。

#### 关键表

| 表 | 用途 |
|---|---|
| `sessions` | 会话记录。主键 `id`，含 `project_id`、`updated_at`、`record`（序列化会话体）；含 `acp_sessions_project` 索引（`project_id, updated_at DESC`） |
| `events` | 会话事件。主键 `(session_id, sequence)`，`event` 存事件体，外键指向 `sessions(id)` |
| `agents` | 内置/已安装 agent 的定义。主键 `id`，`definition` 存定义正文 |
| `agent_programs` | agent 可执行程序路径。主键 `id`，`path` 存路径 |
| `preferences` | 全局偏好键值对。主键 `key`，`value` 存值 |
| `agent_preferences` | 按 agent 的偏好。主键 `agent_id`，`prefs` 存偏好体 |
| `project_agent_settings` | 按项目 + agent 的设置。主键 `(project_id, agent_id)` |
| `agent_runtime` | agent 运行时状态。主键 `agent_id`，`info` 存状态体 |
| `session_counters` | 会话序号计数。主键 `session_id`，`last_sequence` 存已用的最大序号 |
| `session_search` | 会话检索索引。主键 `session_id`，含 `title`、`agent_id` |

#### 现状要点

- **会话与事件分离**：`sessions` 存会话快照，`events` 按 `sequence` 追加事件流，`session_counters` 单独记录每个会话已分配到的序号，用于续写时避免序号冲突。
- **agent 元数据分层**：`agents`（定义）、`agent_programs`（程序路径）、`agent_runtime`（运行时状态）三张表分离，**程序路径与运行时信息不是定义的一部分**，可各自独立更新。
- **偏好分三个作用域**：全局 `preferences`、按 agent 的 `agent_preferences`、按项目+agent 的 `project_agent_settings`，最细粒度覆盖最粗粒度。
- **检索用独立索引表**：`session_search` 是专门的检索投影（含 `title` 与 `agent_id`），与 `sessions` 主表分离。
- **并发参数**：打开时设 `busy_timeout = 5s`，`journal_mode = WAL`，`synchronous = NORMAL`（`src-tauri/src/acp/store.rs:53-58`）。
- **无 schema 版本号，但有一次性遗留列处理**：该库不用 `PRAGMA user_version` 做版本管理；打开时检查 `sessions` 表是否残留旧的 `last_sequence` 列，存在则执行一次性处理（`src-tauri/src/acp/store.rs:69-78`）。
- **对应 S25**：这是 S25「外部 CLI agent（ACP）接入」的会话状态落点；越权拒绝、审批卡与 turn 变更审阅的行为约束见 ai 场景实现文档，本文件只记录 schema 现状。

---

### 七、跨库的现状约束

| 约束 | 说明 |
|---|---|
| **五库互不迁移** | 没有任何一张库持有指向另一张库的外键或跨库引用；各库的 schema 版本各自独立演进。 |
| **版本号互不通用** | `library.db` 用 schema 3、`catalog.sqlite3` 用 format 2、`tasks.sqlite3` 用 schema 5，另两库无显式版本号——**三套版本语义不可互相比较**。 |
| **目录边界不同** | `library.db`、`literature-cache.sqlite3` 位于 Oleafly 数据根目录；`catalog.sqlite3` 位于 `checkpoints/<project_id>/`；`tasks.sqlite3` 位于 `research-tasks/`；`sessions.sqlite` 位于 `acp/`——**备份与迁移时须按各自路径分别处理**。 |
| **云同步不覆盖本地库** | S43 云同步只同步带 `project.json` 的 Library 项目与设置，**`.git` 历史与检查点不随云同步**；检查点相关数据（`catalog.sqlite3`）因此不在云同步覆盖范围内。 |
| **凭据不落这些库** | 长期凭据走独立的加密存储（AES-256-GCM），不写进上述任一库。 |

---

### 八、本文的范围声明

- 本文件**只描述桌面端五个本地库**。Server 端协作数据库（schema 18）的规格见同目录 `collab-01-server-schema.md`。
- 本文件**不含**任何新增设计：表结构、版本号、字段语义均为现状记录。
- 涉及具体行为的测试用例（如 FTS 检索命中、用量回填幂等、检查点格式升级拒绝、任务依赖约束）应在后续 `logos/resources/test/` 阶段按本文档的约束编写，**本文档不声称这些行为已被动态验证**。
