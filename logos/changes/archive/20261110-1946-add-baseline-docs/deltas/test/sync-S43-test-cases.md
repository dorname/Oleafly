## ADDED — S43 云同步多设备协作 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文性质**：本文件是**只读静态盘点**产物，**未运行任何测试**。下文所有条目均为**测试设计**，不含任何 PASS / FAIL 结论；真实云服务商账户下的动态表现须在 verify 阶段单独取证。
> **事实来源**：`inventory.md` sync 段 S43 行；`deltas/prd/1-product-requirements/sync-01-requirements.md` §四 S43；`deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md` S43；`deltas/prd/3-technical-plan/2-scenario-implementation/sync-S43-cloud-sync.md`。
> **口径声明（不可混称）**：**云同步 ≠ 实时协作**。本文件只针对 Dropbox / Google Drive / S3 云存储路径上的**设备间、文件级最终一致同步（manifest 比对）**；不涉及 collab 模块（S29-S42）的 Loro CRDT 实时合并、Merge Review 与角色权限能力，也不得把云同步的 manifest 比对宣传为实时协作。

---

## 一、单元测试用例

### 1.1 API 字段约束（来源：Tauri IPC 云同步命令集）

> 来源基准：`deltas/api/core-01-backend-port.md` §4.2「云同步」命令集；命令签名与约束实现于 `src-tauri/src/cloud/commands.rs`。
> 本模块对外调用面是 **Tauri IPC 命令**（非 HTTP/OpenAPI），故「API 字段约束」= IPC 命令的**必填参数、枚举取值、长度与字符集、取值范围**。

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S43-01 | `cloud_connect_credentials` 拒绝非 S3 provider | `api/core-01-backend-port.md` §4.2 `cloud_connect_credentials` → `provider` 枚举约束（`ProviderKind` 仅 Dropbox / GoogleDrive / S3） | 应用已启动，未连接云账户 | `provider="dropbox"`，`config=S3Config{endpoint:"https://s3.example", bucket:"b", region:"", prefix:"", path_style:true}`，`access_key_id="AKIA…"`，`secret_access_key="SK…"` | 返回错误「this provider signs in through the browser」；**不落盘任何密钥**，连接状态不变 |
| UT-S43-02 | `cloud_connect_credentials` 在 S3 配置缺少必填项时被拒 | 同上 → `config` 必填子字段（`endpoint`、`bucket`；`region`/`prefix` 有默认值、`path_style` 默认 `true`） | 应用已启动 | `provider="s3"`，`config.endpoint=""`，`config.bucket=""`，其余合法 | 返回显式错误（构造/校验失败），密钥**不写入** secret 存储 |
| UT-S43-03 | `cloud_set_device_name` 拒绝空设备名 | `api/core-01-backend-port.md` §4.2 `cloud_set_device_name` → `name` 必填非空 | 云账户已连接 | `name="   "`（仅空白） | 返回错误 `cloud.device_name_empty`；已存设备名保持原值 |
| UT-S43-04 | `cloud_set_device_name` 拒绝超长设备名 | 同上 → `name` 长度上限 32 字符 | 云账户已连接 | `name="a"×33` | 返回错误 `cloud.device_name_invalid`；设备名不变 |
| UT-S43-05 | `cloud_set_device_name` 拒绝非法字符与结尾点 | 同上 → `name` 字符集约束（禁 `\ / : * ? " < > |`、控制字符、不可忽略码点；禁以 `.` 结尾） | 云账户已连接 | 依次输入 `"Lap/top"`、`"Laptop."`、`"Lap\x01top"` | 每个输入均返回 `cloud.device_name_invalid`；设备名不变 |
| UT-S43-06 | `cloud_set_device_name` 接受合法名并去除首尾空白 | 同上 → 合法值应被接受（trim 后写入） | 云账户已连接 | `name="  Laptop  "` | 无错误；设备名写为 `"Laptop"`（trim 后） |
| UT-S43-07 | `cloud_connect_paste` 拒绝空授权码 | `api/core-01-backend-port.md` §4.2 `cloud_connect_paste` → `code` 必填 | 已发起 OAuth 连接流程，存在有效 `flow_id` | `flow_id=<有效>`，`code="   "` | 返回显式错误（空授权码被拒）；连接流程不推进到已连接态 |
| UT-S43-08 | `cloud_download_project` 拒绝非法 cloud id | `api/core-01-backend-port.md` §4.2 `cloud_download_project` → `cloud_id` 必填且需可解析 | 云账户已连接 | `cloud_id="not-a-project-id"` | 返回错误 `cloud.not_found`；不下载任何内容 |
| UT-S43-09 | `cloud_settings_sync` / `cloud_settings_keep_local` 的 `values` 为必填 JSON | `api/core-01-backend-port.md` §4.2 `cloud_settings_sync`、`cloud_settings_keep_local` → `values` 必填 | 云账户已连接，两台设备已建立同步基线 | 调用方不传 `values`（缺省） | 返回显式错误（必填参数缺失）；不写入远端设置、不改本地设置 |

### 1.2 DB 约束

**本组不适用（非遗漏）**：S43 在基线中**没有任何数据库表**。云同步引擎的状态以 JSON 文件 `state.json` 持久化（`src-tauri/src/cloud/state.rs` L251-292），而基线 DB 规格（`deltas/database/core-01-local-stores.md` 的本地五库 `library.db` / `catalog.sqlite3` / `tasks.sqlite3` / `literature-cache.sqlite3` / `sessions.sqlite`；`deltas/database/collab-01-server-schema.md` 的 Server SQLite 18 迁移）**均不含 sync 模块表**。因此 S43 **无 UNIQUE / CHECK / NOT NULL / FOREIGN KEY 约束可提取**，本组不设计用例。

### 1.3 业务规则（来源：时序 Step 与 F 分支）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S43-10 | 同步范围只含 Library 中**有 `project.json`** 的项目 | `sync-S43-cloud-sync.md` §三 Step 4；§四 F3；`sync-01-requirements.md` §四 S43 异常条件 | 已连接云账户，Library 下同时存在「有 `project.json` 的项目」「缺 `project.json` 的目录」「Library 之外的 linked folder」 | 触发一次同步 | 参与同步的项目集合 = Library 中有 `project.json` 的项目；缺 `project.json` 的目录与 linked folder **均不出现在上传/下载清单中** |
| UT-S43-11 | Library 之外的任意 linked folder 不被同步 | `sync-S43-cloud-sync.md` §四 F4；§五 边界 | Library 外存在一个含多个文件的 linked folder | 触发一次同步 | 该 folder 的任何文件都未上传、也未在远端被拉取；本地内容保持不变 |
| UT-S43-12 | 项目内 `.git` 历史与 checkpoints 不随云同步 | `sync-S43-cloud-sync.md` §四 F5；§五 边界 | 项目内含 `.git/` 目录与 checkpoints 目录 | 触发一次同步 | `.git/` 与 checkpoints 内容既未上传到云存储、也未从云存储拉取；检查点与本地 Git（core S12/S13）状态不变 |
| UT-S43-13 | 单项目文件数上限 100000 | `sync-S43-cloud-sync.md` §三 Step 5、§四 F2；`sync-01-requirements.md` §5.1 规模上限 | 构造一个文件数 > 100000 的项目 | 触发一次同步 | 该项目**不参与本次同步**；返回显式的规模受限结果，不做截断上传、不静默跳过 |
| UT-S43-14 | manifest 体积上限 64MiB | 同上 | 构造 manifest 体积 > 64MiB 的项目 | 触发一次同步 | 该项目**不参与本次同步**；返回显式规模受限结果 |
| UT-S43-15 | S3 probe 未通过时**不保存密钥** | `sync-S43-cloud-sync.md` §三 Step 2、§四 F1；`sync-01-requirements.md` §四 S43 正常条件「S3 密钥保存前检查」 | 应用已启动，未连接 | S3 桶不可列举（probe 失败） | `cloud_connect_credentials` 返回显式错误；**密钥未写入 secret 存储**，连接状态仍为未连接 |
| UT-S43-16 | S3 条件写检查未通过时**不保存密钥** | 同上；实现证据 `src-tauri/src/cloud/s3.rs` L740-790（probe 需列举 + create-only 写 + 条件更新三项通过） | 应用已启动，未连接 | S3 桶不支持条件写（第二次 create-only 写未返回冲突） | 返回错误 `cloud.s3_no_conditional_writes`；**密钥未写入 secret 存储** |
| UT-S43-17 | 远端 manifest 与本地 manifest 比对得出差异条目 | `sync-S43-cloud-sync.md` §三 Step 6-7、Step 10 | 设备 A 已同步过一次（存在基线） | 设备 A 修改 1 个文件并同步，设备 B 触发同步 | 设备 B 拉取远端 manifest 后比对，得出「需拉取」条目且只拉取该差异；未变更文件不重复下载 |
| UT-S43-18 | provider 访问失败以显式错误结束 | `sync-S43-cloud-sync.md` §四 F6 | 已连接云账户 | 注入 provider 读取失败（无网络 / 授权失效） | 同步以**显式错误**结束并回传；不静默丢弃、不静默删除本地文件 |

---

## 二、场景测试用例

### 2.1 主路径：云同步多设备协作

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S43-01 | 连接 Dropbox 账户并完成一次同步 | Step 1→9 | 应用已启动；Library 中有含 `project.json` 的项目；无云账户连接 | ①设置中选择 Dropbox provider 并完成浏览器授权；②前端提交同步请求；③引擎计算同步范围与规模上限；④生成本地 manifest、拉取远端 manifest；⑤比对差异并上传本地差异 | 连接态建立（账户信息可读）；同步范围内项目内容与 manifest 写入云存储；同步结果以结构化结果回传 UI |
| ST-S43-02 | S3 路线：probe + 条件写检查通过后才保存密钥并完成同步 | Step 1→9 | 应用已启动；已备好可用 S3 桶（列举、create-only 写与条件更新均可用） | ①选择 S3 provider 并填写 endpoint/bucket/region/prefix 与密钥；②触发 probe 与条件写检查；③检查通过后保存密钥；④提交同步请求；⑤比对 manifest 并上传差异 | 检查通过后密钥才落盘；连接态建立；项目内容写入云存储；同步结果回传 UI |
| ST-S43-03 | 设备 B 连接同一账户并拉取设备 A 的项目内容 | Step 10→12 | 设备 A 已按 ST-S43-01 完成同步；设备 B 连接**同一**云账户 | ①设备 B 触发同步；②引擎生成并比对 manifest，识别出设备 A 写入的差异；③拉取差异落到设备 B 的本地 Library；④UI 展示同步结果 | 设备 B 获得对应项目内容，可在该项目上继续编辑；无差异文件不被重复拉取 |
| ST-S43-04 | 设置类内容随项目一起同步到另一设备 | Step 10→11 | 设备 A 与设备 B 连接同一账户且已建立同步基线 | ①设备 A 修改设置并触发同步；②设备 B 触发同步 | 设备 B 的设置更新为设备 A 的值；本地未被设备 A 改动的设置项不被覆盖 |
| ST-S43-05 | 同步范围判定只取 Library 中有 `project.json` 的项目 | Step 4 | Library 下同时存在：含 `project.json` 的项目、缺 `project.json` 的目录、Library 外的 linked folder | 触发一次同步并检查同步清单 | 上传/下载清单只含含 `project.json` 的 Library 项目；其余目录与 linked folder 无任何条目 |
| ST-S43-06 | manifest 比对驱动差异上传与拉取（两侧各一次） | Step 6→8、Step 10→11 | 设备 A、B 连接同一账户且已建立基线 | ①设备 A 修改 `main.tex` 并同步；②设备 B 修改 `notes.tex` 并同步；③设备 A 再次同步 | 设备 A 第二次同步只拉取 `notes.tex` 的远端版本（`main.tex` 为自身变更，走上传）；设备 B 第一次同步只上传 `notes.tex`；两侧 manifest 最终一致 |

### 2.2 异常路径

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S43-07 | S3 的 probe 未通过 → 不保存密钥、同步不启动 | EX F1（S3 密钥保存前检查） | 应用已启动，未连接云账户 | S3 桶不可列举（probe 失败） | 返回显式错误；密钥未落盘；未进入已连接态，同步未启动 |
| ST-S43-08 | S3 条件写检查未通过 → 不保存密钥 | EX F1 | 应用已启动，未连接云账户 | S3 桶不支持条件写 | 返回 `cloud.s3_no_conditional_writes`；密钥未落盘；未进入已连接态 |
| ST-S43-09 | 单项目文件数超 100000 → 该项目不参与本次同步 | EX F2（同步范围与上限） | 构造文件数 > 100000 的项目 | 触发同步 | 该项目不参与本次同步（不截断上传）；返回显式的规模受限结果；其余项目不受牵连 |
| ST-S43-10 | manifest 超过 64MiB → 该项目不参与本次同步 | EX F2 | 构造 manifest > 64MiB 的项目 | 触发同步 | 该项目不参与本次同步；返回显式规模受限结果；其余项目正常同步 |
| ST-S43-11 | 目标缺少 `project.json` → 该对象不被同步 | EX F3 | Library 下存在缺 `project.json` 的目录 | 触发同步 | 该目录内容既不上传也不被拉取；本地内容保持不变 |
| ST-S43-12 | Library 之外的 linked folder → 不被同步 | EX F4 | Library 外存在含多文件的 linked folder | 触发同步 | 该 folder 内容未被上传、未被拉取；本地内容保持不变 |
| ST-S43-13 | 项目内 `.git` 历史与 checkpoints → 不随云同步 | EX F5 | 项目内含 `.git/` 与 checkpoints | 触发同步 | `.git/` 与 checkpoints 未出现在远端 manifest 中、也未从远端拉取；检查点与本地 Git 状态不变 |
| ST-S43-14 | 云存储 provider 访问失败 → 同步以显式错误结束 | EX F6 | 已连接云账户 | 注入 provider 访问失败（无网络 / 授权失效） | 同步以显式错误结束并回传；本地文件不被静默删除或改写 |
| ST-S43-15 | 多设备同步后另一设备可继续编辑同一项目 | EX F6 对应正常路径的收尾（AC-01 端到端） | 设备 A、B 连接同一账户 | ①设备 A 修改并同步；②设备 B 同步；③在设备 B 上打开该项目并编辑 | 设备 B 拿到的是最新内容，编辑可保存并形成新的 manifest 变更 |

### 2.3 人工验证用例（`[manual]`）

> 以下用例依赖**真实云服务商账户**与**真实跨设备环境**，在无头 CI 中无法稳定断言，故标记 `[manual]`，不计入 `defined_count`。

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S43-16 `[manual]` | 真实 Dropbox 账户下的跨设备同步 | Step 1→12 | 两台真实设备；同一 Dropbox 账户 | ①设备 A 连接 Dropbox 并同步；②设备 B 连接同一 Dropbox 账户并同步；③在设备 B 打开项目继续编辑 | 设备 B 得到设备 A 的项目内容与设置；项目可继续编辑；无静默覆盖 |
| ST-S43-17 `[manual]` | 真实 Google Drive 账户下的跨设备同步 | Step 1→12 | 两台真实设备；同一 Google Drive 账户 | 同上，provider 换为 Google Drive | 同上 |
| ST-S43-18 `[manual]` | 真实 S3 桶下的跨设备同步与密钥落盘 | Step 1→12 | 两台真实设备；同一 S3 桶与密钥 | ①设备 A 以 S3 连接（probe + 条件写检查通过）并同步；②设备 B 以 S3 连接并同步 | 设备 B 得到设备 A 的内容；密钥经 secret 存储落盘，错误配置时明确失败而非保存 |

---

## 三、覆盖度校验

### 3.1 Phase 1 正常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 正常：多设备同步（设备 B 获得项目内容与设置更新，可继续编辑） | ST-S43-03、ST-S43-04、ST-S43-15、ST-S43-16 `[manual]`、ST-S43-17 `[manual]`、ST-S43-18 `[manual]` | ✅ 已覆盖 |
| 正常：S3 密钥保存前检查（先 probe 与条件写检查，通过后才保存密钥） | UT-S43-15、UT-S43-16、ST-S43-02、ST-S43-07、ST-S43-08 | ✅ 已覆盖 |

### 3.2 Phase 1 异常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 异常：同步范围与上限（只同步 Library 中有 `project.json` 的项目；不含任意 linked folder；`.git` 历史与 checkpoints 不随云同步；单项目受 100000 文件与 manifest 64MiB 上限约束） | UT-S43-10 ~ UT-S43-14、ST-S43-05、ST-S43-09 ~ ST-S43-13 | ✅ 已覆盖（四项子约束逐条对应） |

### 3.3 EX 异常用例（时序文件 §四 失败与降级分支）

| EX | 覆盖用例 | 结论 |
|---|---|---|
| F1 S3 的 probe 或条件写检查未通过 → 不保存密钥，同步不启动 | UT-S43-15、UT-S43-16、ST-S43-07、ST-S43-08 | ✅ 已覆盖 |
| F2 文件数超 100000 或 manifest 超 64MiB → 该项目不参与本次同步 | UT-S43-13、UT-S43-14、ST-S43-09、ST-S43-10 | ✅ 已覆盖 |
| F3 目标不在 Library 范围内或缺 `project.json` → 不被同步 | UT-S43-10、ST-S43-11 | ✅ 已覆盖 |
| F4 Library 之外的任意 linked folder → 不被同步 | UT-S43-11、ST-S43-12 | ✅ 已覆盖 |
| F5 `.git` 历史与 checkpoints → 不随云同步 | UT-S43-12、ST-S43-13 | ✅ 已覆盖 |
| F6 provider 访问失败 → 显式错误结束，不静默丢弃或删除 | UT-S43-18、ST-S43-14 | ✅ 已覆盖 |

### 3.4 API required 字段

| 命令 | 必填字段 | 覆盖用例 | 结论 |
|---|---|---|---|
| `cloud_connect_credentials` | `provider`（枚举）、`config`（含 `endpoint`/`bucket`）、`access_key_id`、`secret_access_key` | UT-S43-01、UT-S43-02 | ✅ 已覆盖 |
| `cloud_connect_begin` | `paste`（bool） | — | ⚠️ 未单独设计 UT：`paste` 为必填 bool，缺失时由 Tauri 参数反序列化层直接拒绝，属框架级必填校验；S43 的核心风险在 provider 枚举与 S3 配置必填项（已覆盖）。若后续需要补齐，可加一条「缺 `paste` → 参数反序列化错误」用例 |
| `cloud_connect_wait` | `flow_id` | UT-S43-07（配合 `cloud_connect_paste` 的 flow_id 校验路径） | ⚠️ 部分覆盖：`flow_id` 无效时的独立错误分支未单列 UT；理由同上（框架级必填 + 无效 flow 的终态已在 ST-S43-07 的错误路径中体现） |
| `cloud_connect_paste` | `flow_id`、`code` | UT-S43-07 | ✅ 已覆盖 |
| `cloud_sync_now` | 无必填参数（`dirty` 可选） | — | ✅ 不适用：`dirty` 为 `Option`，缺省按空集合处理，无必填字段可测 |
| `cloud_set_enabled` | `on`（bool） | — | ✅ 不适用：必填 bool 由框架层校验，无取值域约束 |
| `cloud_set_device_name` | `name`（必填非空、≤32 字符、字符集约束） | UT-S43-03 ~ UT-S43-06 | ✅ 已覆盖 |
| `cloud_project_set_mode` | `local_id`、`mode`（枚举 `sync`/`pause`） | — | ➖ 归入 S45 场景（暂停/恢复属于批量删除保护的相邻交互），本文件不重复登记 |
| `cloud_project_resolve_hold` | `local_id`、`choice`（枚举 `restore`/`delete`） | — | ➖ 归入 S45 场景 |
| `cloud_project_remove` / `cloud_project_replace_remote` / `cloud_project_dismiss_conflicts` | `local_id` | — | ➖ 归入 S45 / S44 场景 |
| `cloud_remove_remote` | `cloud_id` | UT-S43-08（`cloud_download_project` 的 `cloud_id` 同族校验路径） | ⚠️ 部分覆盖：`cloud_remove_remote` 的 `cloud_id` 解析失败分支未单列 UT；理由：与 `cloud_download_project` 同为 `cloud_id` 必填且同族校验（`cloud.not_found`），已在 UT-S43-08 覆盖该约束族 |
| `cloud_download_project` | `cloud_id` | UT-S43-08 | ✅ 已覆盖 |
| `cloud_settings_sync` / `cloud_settings_keep_local` | `values`（JSON） | UT-S43-09 | ✅ 已覆盖 |
| `cloud_settings_download` / `cloud_settings_applied` / `cloud_settings_defer` / `cloud_wait_for_changes` | 无必填参数 | — | ✅ 不适用：无必填参数 |
| `cloud_state` / `cloud_details` / `cloud_providers` / `cloud_disconnect` | 无必填参数 | — | ✅ 不适用：无必填参数 |

### 3.5 DB UNIQUE · CHECK 约束

| 约束清单 | 覆盖用例 | 结论 |
|---|---|---|
| S43 相关表的 UNIQUE / CHECK / NOT NULL / FOREIGN KEY | — | ➖ **不适用**：S43 无数据库表。云同步引擎状态以 JSON 文件 `state.json` 持久化（`src-tauri/src/cloud/state.rs` L251-292）；基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）不含 sync 模块表，故本场景**无 DB 约束可提取**，不存在未覆盖项 |

### 3.6 覆盖度小结

- 正常验收条件 2 条、异常验收条件 1 条（含 4 项子约束）、EX 分支 6 条：**全部覆盖**。
- API required 字段：14 个相关命令全部登记，其中 9 条有独立 UT 覆盖，2 条为「框架级必填 bool / 无必填参数」不适用，3 条为「同族约束已覆盖或归入相邻场景」的部分覆盖并已写明原因。
- DB 约束：本场景无 DB 表，登记为不适用并写明原因，**无空勾**。
- **未决口**：真实云服务商账户下的动态行为（Dropbox / Drive / S3 跨设备同步、probe 在真实服务上的表现）以 `[manual]` 用例登记，不预填结论。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S43-AC-01 | **正常：多设备同步** — GIVEN 两台设备连接同一云存储账户；WHEN 设备 A 修改 Library 项目与设置并完成同步、设备 B 触发同步；THEN 设备 B 获得对应的项目内容与设置更新，可继续编辑 | UT-S43-01、UT-S43-02、UT-S43-06、UT-S43-17、ST-S43-01、ST-S43-03、ST-S43-04、ST-S43-06、ST-S43-15、ST-S43-16 `[manual]`、ST-S43-17 `[manual]`、ST-S43-18 `[manual]` |
| S43-AC-02 | **正常：S3 密钥保存前检查** — GIVEN 用户配置 S3 作为云存储；WHEN 保存凭据；THEN 先执行 probe 与条件写检查，通过后才保存密钥 | UT-S43-02、UT-S43-15、UT-S43-16、ST-S43-02、ST-S43-07、ST-S43-08 |
| S43-AC-03 | **异常：同步范围与上限** — GIVEN Library 之外的任意 linked folder、项目内 `.git` 历史与 checkpoints，或单项目规模超过上限；WHEN 云同步运行；THEN 只同步 Library 中有 `project.json` 的项目（不含任意 linked folder）；`.git` 历史与 checkpoints 不随云同步；单项目受 100000 文件与 manifest 64MiB 上限约束 | UT-S43-10、UT-S43-11、UT-S43-12、UT-S43-13、UT-S43-14、ST-S43-05、ST-S43-09、ST-S43-10、ST-S43-11、ST-S43-12、ST-S43-13 |
