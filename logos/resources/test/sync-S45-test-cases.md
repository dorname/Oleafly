## S45 批量删除保护与回收站 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文性质**：本文件是**只读静态盘点**产物，**未运行任何测试**。下文所有条目均为**测试设计**，不含任何 PASS / FAIL 结论；真实多设备环境下的删除判定动态表现须在 verify 阶段单独取证。
> **事实来源**：`inventory.md` sync 段 S45 行；`deltas/prd/1-product-requirements/sync-01-requirements.md` §四 S45；`deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md` S45；`deltas/prd/3-technical-plan/2-scenario-implementation/sync-S45-mass-delete-guard.md`。
> **口径声明（不可混称）**：本场景的 **hold（删除保护）** 与 **Trash（回收站）** 属**云同步路径**的最终一致语义。它与 collab 模块（S29-S42）的**实时协作同步暂停（Send / Keep local）**是**两套正交机制**，两者不可混称；collab 侧的 `collab_trash_list` / `collab_trash_restore` 亦属协作模块，与本场景的云同步 Trash **不是同一个回收站**，本文件不涉及、也不得引用。

---

## 一、单元测试用例

### 1.1 API 字段约束（来源：Tauri IPC 云同步命令集）

> 来源基准：`deltas/api/core-01-backend-port.md` §4.2「云同步」命令集；命令签名与约束实现于 `src-tauri/src/cloud/commands.rs`。

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S45-01 | `cloud_project_resolve_hold` 拒绝非法 `choice` | `api/core-01-backend-port.md` §4.2 `cloud_project_resolve_hold` → `choice` 枚举约束（仅 `restore` / `delete`） | 项目处于 hold 状态 | `local_id="<项目>"`，`choice="keep"` | 返回错误「unknown choice」；**不执行任何裁决动作**（不恢复、不删除、不解除 hold） |
| UT-S45-02 | `cloud_project_resolve_hold` 的 `choice="restore"` 走恢复分支 | 同上 → `restore` 语义 | 项目处于 hold 状态；远端仍保留被删文件 | `local_id="<项目>"`，`choice="restore"` | 执行**恢复**（重新拉取远端仍存在的被删文件）；**不放行大规模删除**；返回项目同步报告 |
| UT-S45-03 | `cloud_project_resolve_hold` 的 `choice="delete"` 走确认删除分支 | 同上 → `delete` 语义 | 项目处于 hold 状态 | `local_id="<项目>"`，`choice="delete"` | 放行该次删除并继续传播；**不触发恢复**；返回项目同步报告 |
| UT-S45-04 | `cloud_project_resolve_hold` 必填 `local_id` | 同上 → `local_id` 必填 | 项目处于 hold 状态 | 调用方不传 `local_id` | 返回参数错误；hold 状态不变 |
| UT-S45-05 | `cloud_project_set_mode` 拒绝非法 `mode` | `api/core-01-backend-port.md` §4.2 `cloud_project_set_mode` → `mode` 枚举约束（仅 `sync` / `pause`） | 项目已绑定云账户 | `local_id="<项目>"`，`mode="off"` | 返回错误「unknown sync mode」；项目模式不变 |
| UT-S45-06 | `cloud_project_set_mode` 的 `mode="pause"` 暂停该项目 | 同上 → `pause` 语义 | 项目已绑定云账户 | `local_id="<项目>"`，`mode="pause"` | 项目状态置为 `paused=true`；对应 sweep 被停止；该项目的删除/上传不再推进 |
| UT-S45-07 | `cloud_project_set_mode` 的 `mode="sync"` 恢复该项目 | 同上 → `sync` 语义 | 项目处于 `paused=true` | `local_id="<项目>"`，`mode="sync"` | `paused=false`；清除 `remove_pending` / `removed_by` 标记；置 `remote_dirty=true` 以重新比对远端差异 |
| UT-S45-08 | `cloud_project_remove` 必填 `local_id` | `api/core-01-backend-port.md` §4.2 `cloud_project_remove` → `local_id` 必填 | 已连接云账户 | 调用方不传 `local_id` | 返回参数错误；不写 tombstone、不改项目状态 |

### 1.2 DB 约束

**本组不适用（非遗漏）**：S45 在基线中**没有任何数据库表**。项目级 hold 状态（`Hold::MassDelete` / `Hold::RemoteDelete`）与删除标记持久化在云同步引擎的 JSON 状态文件 `state.json`（`src-tauri/src/cloud/state.rs` L97-130、`engine.rs` L1237-1258）；基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）**不含 sync 模块表**。因此 S45 **无 UNIQUE / CHECK / NOT NULL / FOREIGN KEY 约束可提取**，本组不设计用例。

### 1.3 业务规则（来源：时序 Step 与 F 分支）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S45-09 | 删除**全部**项目文件 → 必 hold | `sync-S45-mass-delete-guard.md` §三 Step 2、§四 F1；`sync-01-requirements.md` §四 S45 异常条件；实现证据 `src-tauri/src/cloud/engine.rs` L1237-1246 | 项目基线含 N 个文件（N ≥ 1） | 本地删除集合 = 全部 N 个文件 | hold 成立，类型为**大批量删除**（记录 count=N、total=N）；同步**暂停等待用户裁决** |
| UT-S45-10 | 删除数量 **> 20 且过半**项目文件 → hold | 同上（实现证据 `engine.rs` L1238-1240、L1246） | 项目基线含 40 个文件 | 本地删除 21 个文件（> 20 且 21×2 > 40） | hold 成立（count=21、total=40）；同步暂停等待裁决 |
| UT-S45-11 | 删除数量 **> 20 但不过半** → 不 hold | 同上（实现证据 `engine.rs` L1238-1240） | 项目基线含 100 个文件 | 本地删除 21 个文件（> 20 但 21×2 ≤ 100） | **不 hold**；删除正常传播，无拦截 |
| UT-S45-12 | 删除数量 **恰为 20** 且占比高 → 不 hold（`> 20` 为严格大于） | 同上（实现证据 `engine.rs` L1239 `count > MASS_DELETE_MIN`，`MASS_DELETE_MIN = 20`） | 项目基线含 25 个文件 | 本地删除 20 个文件（占比 80% 但数量不 > 20） | **不 hold**；删除正常传播，无拦截 |
| UT-S45-13 | 删除集合为空 → 不 hold | 同上（实现证据 `engine.rs` L1238 `count > 0 && count >= total`） | 项目基线含 10 个文件 | 本地删除集合为空（count=0） | **不 hold**；无删除事件传播 |
| UT-S45-14 | 本地删除与远端 tombstone **分别判定** | `sync-S45-mass-delete-guard.md` §一 前置条件、§四 F1/F4；`sync-01-requirements.md` §四 S45 异常条件 | 同一项目，本地删除集合与远端删除集合大小不同 | 本地删除 3 个 / 远端 tombstone 覆盖 30 个（> 20 且过半） | 两条路径**各自独立判定**：本地删除不 hold，远端 tombstone 触发 hold；互不借用结论 |
| UT-S45-15 | 远端 tombstone 判定为异常大规模删除 → 暂停执行、**不删除本地文件** | `sync-S45-mass-delete-guard.md` §三 Step 7、§四 F4；`sync-01-requirements.md` §四 S45 异常条件；实现证据 `engine.rs` L1248-1258 | 远端 tombstone 传播的删除在本机判定为异常大规模删除 | 触发同步 | 触发**远端删除 hold**（记录 count 与 total）；**本地文件不被删除**；同步暂停等待裁决 |
| UT-S45-16 | 远端删除被接受 → 文件进入回收站而非直接消失 | `sync-S45-mass-delete-guard.md` §三 Step 6、§四 F5；`sync-01-requirements.md` §四 S45 正常条件；实现证据 `engine.rs` L1345-1355、L1750 | 远端删除规模未命中 hold | 触发同步 | 被删文件进入**回收站**（优先操作系统回收站；不可用时回落云同步 Trash 目录下的 `{now_ms}-{8位十六进制}` 桶），**不直接消失** |
| UT-S45-17 | Trash 保留 30 天，超期条目被清理 | `sync-S45-mass-delete-guard.md` §三 Step 6、§四 F7、§五 边界；实现证据 `engine.rs` L1259-1278（`TRASH_KEEP = 30×24×60×60` 秒） | Trash 目录中存在条目，其修改时间已超过 30 天 | 触发一次 sweep | 超期条目被删除；**未超期条目保留** |
| UT-S45-18 | hold 状态下用户未裁决 → 同步保持暂停 | `sync-S45-mass-delete-guard.md` §三 Step 3、§四 F6 | 项目处于 hold 状态 | 再次触发同步但不调用 `cloud_project_resolve_hold` | 同步**仍处于暂停**；**不自动恢复、也不自动确认删除**；hold 记录不变 |
| UT-S45-19 | `project.json` 不计入「项目文件数」分母 | 实现证据 `engine.rs` L1248（远端判定的文件总数排除 `PROJECT_META`） | 项目基线含 `project.json` + 30 个普通文件 | 远端 tombstone 覆盖 30 个普通文件 | 判定分母为 **30**（不含 `project.json`）；30×2 > 30 成立 → 远端 hold 成立 |
| UT-S45-20 | `cloud_project_remove` 写 tombstone 并标记待删除 | `api/core-01-backend-port.md` §4.2 `cloud_project_remove`；实现证据 `cloud/commands.rs` L1951-2000 | 已连接云账户，Library 中有该项目 | 调用 `cloud_project_remove(local_id)` | 向远端写入 tombstone（记录删除发起设备名与时间）；项目状态标记 `removed_by` / `remove_pending` 并置 `paused=true` |

---

## 二、场景测试用例

### 2.1 主路径：批量删除保护与回收站

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S45-01 | 本地删除一小批文件（未命中 hold）→ 正常传播删除 | Step 1→2、Step 9 分支 | 已连接云账户；项目含 40 个文件 | ①用户本地删除 3 个文件；②同步引擎执行 hold 判定 | 判定**不命中 hold**；删除正常传播到云存储；被删文件不进入 Trash（属本地直接删除） |
| ST-S45-02 | 删除全部文件 → 必 hold → 用户选择 restore → 恢复被删文件 | Step 1→4 | 已连接云账户；项目含 10 个文件 | ①用户删除全部 10 个文件；②同步引擎判定为 hold 并暂停；③用户选择 **restore** | 引擎进入 **hold 状态**并暂停；restore 后被删文件被恢复（远端仍存在的文件重新落地）；**删除未被传播** |
| ST-S45-03 | 删除全部文件 → 必 hold → 用户确认 delete → 继续传播删除 | Step 1→4 | 已连接云账户；项目含 10 个文件 | ①用户删除全部 10 个文件；②引擎判定为 hold 并暂停；③用户**确认 delete** | hold 解除；删除**继续传播**；远端对应内容被删除 |
| ST-S45-04 | 删除 > 20 且过半 → hold 并等待用户裁决 | Step 1→3 | 已连接云账户；项目含 40 个文件 | ①用户删除 21 个文件；②触发同步 | 判定命中 hold（> 20 且过半）；引擎**暂停等待用户裁决**，不继续传播删除；UI 展示 hold 提示与裁决入口 |
| ST-S45-05 | 远端删除传播到本机 → 被删文件进入回收站 | Step 5→6 | 设备 A 已删除 2 个文件并同步；设备 B 已连接同一账户 | ①设备 B 触发同步；②引擎读取远端 tombstone 并独立判定（未命中 hold）；③处理该删除 | 被删文件在设备 B 上进入**回收站**（而非直接消失）；删除规模未命中 hold 时不暂停 |
| ST-S45-06 | 回收站条目在 30 天内可恢复 | Step 6→8 | 设备 B 上存在 ST-S45-05 产生的回收站条目 | ①用户在回收站查看条目；②执行恢复 | 条目被恢复到项目原路径；内容与删除前一致；恢复后再次同步两端一致 |
| ST-S45-07 | hold 裁决为 restore 后再次同步，两端趋于一致 | Step 4、Step 9 | ST-S45-02 状态 | ①restore 完成；②再次触发同步 | 被删文件在本地与云端一致；无残留 hold 状态 |

### 2.2 异常路径

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S45-08 | 远端 tombstone 判定为异常大规模删除 → 暂停执行、不删本地文件 | EX F4（tombstone 异地暂停） | 设备 B 已连接账户；远端 tombstone 覆盖 30 个文件（> 20 且过半） | 设备 B 触发同步 | 引擎独立判定为异常大规模删除；**暂停执行，本地文件不被删除**；UI 提示用户裁决 |
| ST-S45-09 | 删除未命中 hold 条件 → 正常传播、不额外拦截 | EX F3 | 已连接云账户；项目含 100 个文件 | 用户删除 21 个文件（> 20 但不过半）并触发同步 | **不进入 hold**；删除正常传播；无裁决提示 |
| ST-S45-10 | hold 状态下用户未裁决 → 同步保持暂停 | EX F6 | 项目处于 hold 状态 | 再次触发同步但不做任何裁决 | 同步**保持暂停等待**；**不自动恢复也不自动确认删除**；hold 记录不变 |
| ST-S45-11 | Trash 条目超过 30 天 → 不再保证保留 | EX F7 | Trash 目录中存在修改时间超过 30 天的条目 | 触发一次回收站清理 | 超期条目被删除（**不再保证保留**）；未超期条目保留 |
| ST-S45-12 | 删除数量恰为 20（占比高但不 > 20）→ 不 hold | EX F3 边界 | 项目含 25 个文件 | 用户删除 20 个文件并触发同步 | **不进入 hold**；删除正常传播；无裁决提示 |
| ST-S45-13 | 单文件项目的「删除全部」→ 仍必 hold | EX F1 边界 | 项目仅含 1 个文件 | 用户删除该唯一文件并触发同步 | 判定命中 hold（删除全部必 hold）；同步暂停等待裁决 |

### 2.3 人工验证用例（`[manual]`）

> 以下用例依赖**真实多设备环境**与**操作系统回收站的可见性**，在无头 CI 中无法稳定断言，故标记 `[manual]`，不计入 `defined_count`。

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S45-14 `[manual]` | 真实多设备环境下远端删除传播进回收站并可恢复 | Step 5→6、Step 8 | 两台真实设备；同一云账户；设备 A 删除若干文件并同步 | ①设备 B 触发同步；②在设备 B 的回收站中查看条目；③执行恢复 | 条目出现在设备 B 的回收站中而非直接消失；30 天内可恢复，恢复后内容一致 |
| ST-S45-15 `[manual]` | 系统回收站中的可见性（Trash 落在系统文件管理器可见位置） | Step 6 | 设备 B 上一轮同步产生了被删条目；操作系统回收站可用 | ①打开操作系统文件管理器的回收站；②查找被同步删除的文件 | 被删文件出现在系统回收站中（可人工看到）；未直接消失 |

---

## 三、覆盖度校验

### 3.1 Phase 1 正常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 正常：远端删除进回收站（GIVEN 文件在设备 A 被删除且删除经同步传播；WHEN 设备 B 同步该删除；THEN 被删文件进入 Trash 而非直接消失，30 天内可恢复） | UT-S45-16、UT-S45-17、ST-S45-05、ST-S45-06、ST-S45-11、ST-S45-14 `[manual]`、ST-S45-15 `[manual]` | ✅ 已覆盖 |

### 3.2 Phase 1 异常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 异常：本地批量删除 hold（GIVEN 本地一次删除超过 20 个且过半项目文件，或删除全部文件；WHEN 同步引擎处理该删除；THEN 进入 hold 状态，等待用户 restore 或确认 delete；本地与远端分别判定） | UT-S45-09 ~ UT-S45-15、UT-S45-18 ~ UT-S45-20、ST-S45-02 ~ ST-S45-04、ST-S45-07 ~ ST-S45-13 | ✅ 已覆盖（含「本地与远端分别判定」与「删全部必 hold」两项子约束） |
| 异常：tombstone 异地暂停（GIVEN 远端 tombstone 传播的删除在本机判定为异常大规模删除；WHEN 处理该删除；THEN 暂停执行，不删除本地文件） | UT-S45-15、UT-S45-19、ST-S45-08 | ✅ 已覆盖 |

### 3.3 EX 异常用例（时序文件 §四 失败与降级分支）

| EX | 覆盖用例 | 结论 |
|---|---|---|
| F1 删除全部项目文件 → 必进入 hold，同步暂停等待裁决 | UT-S45-09、ST-S45-02、ST-S45-03、ST-S45-13 | ✅ 已覆盖 |
| F2 删除数量 > 20 且过半 → 进入 hold | UT-S45-10、ST-S45-04 | ✅ 已覆盖 |
| F3 删除未命中 hold 条件 → 正常传播，不额外拦截 | UT-S45-11、UT-S45-12、UT-S45-13、ST-S45-01、ST-S45-09、ST-S45-12 | ✅ 已覆盖 |
| F4 远端 tombstone 判定为异常大规模删除 → 暂停执行，不删本地 | UT-S45-15、UT-S45-19、ST-S45-08 | ✅ 已覆盖 |
| F5 远端传播的删除被接受 → 进入 Trash 而非直接消失，保留 30 天 | UT-S45-16、UT-S45-17、ST-S45-05 | ✅ 已覆盖 |
| F6 hold 状态下用户未裁决 → 保持暂停，不自动恢复也不自动确认删除 | UT-S45-18、ST-S45-10 | ✅ 已覆盖 |
| F7 Trash 条目超过 30 天 → 不再保证保留 | UT-S45-17、ST-S45-11、ST-S45-14 `[manual]` | ✅ 已覆盖 |

### 3.4 API required 字段

| 命令 | 必填字段 | 覆盖用例 | 结论 |
|---|---|---|---|
| `cloud_project_resolve_hold` | `local_id`（必填）、`choice`（枚举 `restore`/`delete`）、`dirty`（可选） | UT-S45-01 ~ UT-S45-04 | ✅ 已覆盖 |
| `cloud_project_set_mode` | `local_id`（必填）、`mode`（枚举 `sync`/`pause`） | UT-S45-05 ~ UT-S45-07 | ✅ 已覆盖 |
| `cloud_project_remove` | `local_id`（必填） | UT-S45-08、UT-S45-20 | ✅ 已覆盖 |
| `cloud_project_dismiss_conflicts` | `local_id`（必填） | — | ➖ 归入 S44 场景（冲突副本清空），本文件不重复登记 |
| `cloud_project_replace_remote` | `local_id`（必填） | — | ➖ 归入 S44 场景（远端替换），本文件不重复登记 |
| `cloud_sync_now` | 无必填参数（`dirty` 可选） | — | ✅ 不适用：无必填参数 |
| `cloud_state` / `cloud_details` / `cloud_providers` / `cloud_disconnect` / `cloud_set_enabled` / `cloud_set_device_name` / `cloud_download_project` / `cloud_settings_*` / `cloud_wait_for_changes` | 见 S43 文件 §3.4 登记 | — | ➖ 与 S43 同命令集，已在 S43 文件统一登记，本文件不重复 |

### 3.5 DB UNIQUE · CHECK 约束

| 约束清单 | 覆盖用例 | 结论 |
|---|---|---|
| S45 相关表的 UNIQUE / CHECK / NOT NULL / FOREIGN KEY | — | ➖ **不适用**：S45 无数据库表。hold 状态与删除标记持久化于 JSON 状态文件 `state.json`（`src-tauri/src/cloud/state.rs` L97-130、`engine.rs` L1237-1278）；基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）不含 sync 模块表，故本场景**无 DB 约束可提取**，不存在未覆盖项 |

### 3.6 覆盖度小结

- 正常验收条件 1 条、异常验收条件 2 条（含「本地/远端分别判定」「删全部必 hold」子约束）、EX 分支 7 条：**全部覆盖**。
- API required 字段：3 条有独立 UT 覆盖；2 条归入 S44 场景；其余与 S43 同命令集、已在 S43 文件统一登记。
- DB 约束：本场景无 DB 表，登记为不适用并写明原因，**无空勾**。
- **未决口**：真实多设备环境下的删除传播、回收站可见性与 30 天保留期以 `[manual]` 用例登记，不预填结论。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S45-AC-01 | **正常：远端删除进回收站** — GIVEN 文件在设备 A 被删除且删除经同步传播；WHEN 设备 B 同步该删除；THEN 被删文件进入 Trash 而非直接消失，30 天内可恢复 | UT-S45-16、UT-S45-17、ST-S45-05、ST-S45-06、ST-S45-11、ST-S45-14 `[manual]`、ST-S45-15 `[manual]` |
| S45-AC-02 | **异常：本地批量删除 hold** — GIVEN 本地一次删除超过 20 个且过半项目文件，或删除全部文件；WHEN 同步引擎处理该删除；THEN 进入 hold 状态，等待用户 restore 或确认 delete；本地与远端分别判定 | UT-S45-01 ~ UT-S45-09、UT-S45-10、UT-S45-11、UT-S45-12、UT-S45-13、UT-S45-14、UT-S45-18、UT-S45-19、UT-S45-20、ST-S45-02、ST-S45-03、ST-S45-04、ST-S45-07、ST-S45-09、ST-S45-10、ST-S45-12、ST-S45-13 |
| S45-AC-03 | **异常：tombstone 异地暂停** — GIVEN 远端 tombstone 传播的删除在本机判定为异常大规模删除；WHEN 处理该删除；THEN 暂停执行，不删除本地文件 | UT-S45-15、UT-S45-19、ST-S45-08 |
