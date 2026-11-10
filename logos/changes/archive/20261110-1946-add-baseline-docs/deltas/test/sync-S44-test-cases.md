## ADDED — S44 冲突副本与三方合并 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文性质**：本文件是**只读静态盘点**产物，**未运行任何测试**。下文所有条目均为**测试设计**，不含任何 PASS / FAIL 结论；真实双设备环境下的冲突文件名日期格式等动态细节须在 verify 阶段单独取证。
> **事实来源**：`inventory.md` sync 段 S44 行；`deltas/prd/1-product-requirements/sync-01-requirements.md` §四 S44；`deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md` S44；`deltas/prd/3-technical-plan/2-scenario-implementation/sync-S44-conflict-copies.md`。
> **口径声明（不可混称）**：**云同步 ≠ 实时协作**。本场景在云同步路径上，**普通文件双侧修改不做文本合并**，而是保留冲突副本（两个版本都留）；`project.json` 与设置类走 **merge3 三方合并**。这与 collab 模块（S29-S42）的 Loro CRDT 自动合并 / Merge Review 是**两套正交机制**，不得把 CRDT 自动合并能力宣传到云同步路径上。

---

## 一、单元测试用例

### 1.1 API 字段约束（来源：Tauri IPC 云同步命令集）

> 来源基准：`deltas/api/core-01-backend-port.md` §4.2「云同步」命令集；命令签名与约束实现于 `src-tauri/src/cloud/commands.rs`。

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S44-01 | `cloud_project_dismiss_conflicts` 接受已存在的项目并清零冲突 | `api/core-01-backend-port.md` §4.2 `cloud_project_dismiss_conflicts` → `local_id` 必填 | 该项目存在冲突副本（`conflict_copies` 非空且 `conflicts > 0`） | `local_id="<已冲突项目>"` | 无错误；该项目的 `conflict_copies` 清空、`conflicts` 归 0；**其他项目的冲突状态不受影响** |
| UT-S44-02 | `cloud_project_dismiss_conflicts` 对未在状态中的项目不产生副作用 | 同上 → `local_id` 必填但需幂等 | 状态中不存在该 `local_id` | `local_id="<未知项目>"` | 无错误返回；状态不变（不新建项目条目、不影响他人冲突计数） |
| UT-S44-03 | `cloud_project_replace_remote` 必填 `local_id` | `api/core-01-backend-port.md` §4.2 `cloud_project_replace_remote` → `local_id` 必填 | 已连接云账户，Library 中有该项目 | 调用方不传 `local_id` | 返回参数错误；不触发任何远端替换动作 |
| UT-S44-04 | `cloud_project_remove` 必填 `local_id` | `api/core-01-backend-port.md` §4.2 `cloud_project_remove` → `local_id` 必填 | 已连接云账户 | 调用方不传 `local_id` | 返回参数错误；不写 tombstone、不改项目状态 |
| UT-S44-05 | `cloud_settings_sync` 的 `values` 为必填 JSON（设置走 merge3 的同一入口） | `api/core-01-backend-port.md` §4.2 `cloud_settings_sync` → `values` 必填 | 已连接云账户，设备 A/B 已建立同步基线 | 调用方不传 `values` | 返回显式错误；不写远端设置、不改本地设置 |

### 1.2 DB 约束

**本组不适用（非遗漏）**：S44 在基线中**没有任何数据库表**。冲突副本清单、冲突计数与项目基线均持久化在云同步引擎的 JSON 状态文件 `state.json`（`src-tauri/src/cloud/state.rs` L251-292，`ProjectState.conflict_copies` / `conflicts` 字段见 L97-130）；基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）**不含 sync 模块表**。因此 S44 **无 UNIQUE / CHECK / NOT NULL / FOREIGN KEY 约束可提取**，本组不设计用例。

### 1.3 业务规则（来源：时序 Step 与 F 分支）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S44-06 | 普通文件双侧修改判定为冲突，**不做文本合并** | `sync-S44-conflict-copies.md` §三 Step 4、§四 F1 | base 中有 `main.tex`，local 与 remote 的 hash 均与 base 不同 | `decide_action(local, remote, base, is_meta=false)` | 动作为 `Conflict`（非 `MetaMerge`、非 `Download`）；**不产出任何合并文本** |
| UT-S44-07 | `project.json` / 设置类双侧修改判定为 `MetaMerge` | `sync-S44-conflict-copies.md` §三 Step 4、§四 F2 | base 中有 `project.json`，local 与 remote 的 hash 均与 base 不同 | `decide_action(..., is_meta=true)` | 动作为 `MetaMerge`；**不生成冲突副本** |
| UT-S44-08 | merge3 标量/同字段冲突时 **local 获胜** | `sync-S44-conflict-copies.md` §四 F2；`sync-01-requirements.md` §四 S44 正常条件；实现证据 `src-tauri/src/cloud/merge.rs` L14-45 | base/local/remote 三方 JSON 均含同一字段 `theme` | `base={"theme":"light"}`，`local={"theme":"dark"}`，`remote={"theme":"blue"}` | 合并结果 `theme == "dark"`（local 值）；非 remote 值 |
| UT-S44-09 | merge3 单侧未改时取另一侧 | 同上；实现证据 `merge.rs` L16-21 | base 与 local 相同 | `base=local={"theme":"dark"}`，`remote={"theme":"blue"}` | 合并结果为 `{"theme":"blue"}`（取 remote） |
| UT-S44-10 | merge3 对象按键合并、双方各自改动都保留 | 同上；实现证据 `merge.rs` L26-40、测试 `objects_merge_per_key_and_both_sides_keep_their_own_changes` | base/local/remote 三个对象 | `base={"theme":"light","font":14}`，`local={"theme":"dark","font":14}`，`remote={"theme":"light","font":16}` | 合并结果同时含 `theme=="dark"` 与 `font==16` |
| UT-S44-11 | merge3 数组按元素 `id` 合并 | 同上；实现证据 `merge.rs` L47-70 | 三方数组元素均带 `id` | local 与 remote 各改一个不同 `id` 的元素 | 合并结果含双方各自的新值，不丢项、不重复 |
| UT-S44-12 | merge3 无 base 时取双方并集 | 同上；实现证据 `merge.rs` L34-45 | `base=None`，local 与 remote 各含独有键 | `local={"x":1}`，`remote={"y":2}` | 合并结果同时含 `x` 与 `y` |
| UT-S44-13 | 设备专属元数据字段保持本地值，不被远端覆盖 | `sync-01-feature-specs.md` S44 能力与限制（metadata 冲突 local 获胜的延伸）；实现证据 `merge.rs` L197-207 与 `DEVICE_META_FIELDS`（`exports`/`hidden`/`tex`/`checkpoints`/`forked_from`/`allow_shell_escape`） | local 与 remote 的 `project.json` 含 `exports` 等设备字段且取值不同 | `merge3` 后再 `with_device_fields(incoming, local)` | `exports` 等设备字段取**本地**值；远端值不生效 |
| UT-S44-14 | dirty 缓冲下 `Download` / `LocalDelete` / `MetaMerge` 改为 `Carry` | `sync-S44-conflict-copies.md` §四 F3；`sync-01-requirements.md` §四 S44 异常条件；实现证据 `src-tauri/src/cloud/engine.rs` L1176-1186 | `options.dirty` 含目标键 | `dirty={key:"main.tex"}`，动作为 `Download` / `LocalDelete` / `MetaMerge` | 三种动作均改为 `Carry`；**未保存缓冲不被覆盖** |
| UT-S44-15 | dirty 保护只作用于 dirty 集合内的键 | 同上（实现证据 `engine.rs` L1176-1186） | `options.dirty` 只含 `main.tex` | 另一键 `notes.tex` 的动作为 `Download` | `notes.tex` 仍为 `Download`（不被误改 Carry）；`main.tex` 为 `Carry` |
| UT-S44-16 | 冲突副本命名格式为 `<stem> (<设备名> YYYY-MM-DD)<ext>` | `sync-S44-conflict-copies.md` §三 Step 4、§五 边界；`sync-01-feature-specs.md` S44；实现证据 `src-tauri/src/cloud/engine.rs` L959-996、L2132-2137 | 本地路径 `main.tex`，远端记录带作者设备名 `Laptop`，本地日期 `2026-11-10` | `conflict_path("main.tex", "Laptop", "2026-11-10", slot)` | 结果为 `main (Laptop 2026-11-10).tex`；**先到的版本不被覆盖** |
| UT-S44-17 | 冲突副本同名已被占用时追加序号 | 同上（实现证据 `engine.rs` L983-995） | 目标名 `main (Laptop 2026-11-10).tex` 已被占用 | 第 2 次尝试 | 结果为 `main (Laptop 2026-11-10 2).tex`；不覆盖既有同名文件 |
| UT-S44-18 | 冲突副本设备名做字符清洗 | 同上（实现证据 `engine.rs` L942-950） | 远端记录的作者名含路径分隔符等非法字符 | 作者名 `"Lap/top"` | 清洗后的标签可用；清洗结果为空或不可用时回落为 `"conflict"` |
| UT-S44-19 | 冲突副本数量上限 100，超出后最早条目被淘汰 | 实现证据 `src-tauri/src/cloud/engine.rs` L3216-3222（`MAX_CONFLICT_COPIES = 100`） | 已有 100 个冲突副本后再产生新副本 | 触发一次产生冲突副本的同步 | 冲突副本清单长度不超过 100；最早的条目被淘汰，新条目保留 |
| UT-S44-20 | 冲突副本上传成功前不覆盖当前编辑 | `sync-S44-conflict-copies.md` §四 F4；`sync-01-requirements.md` §四 S44 异常条件；实现证据 `engine.rs` L1850-1891 对应测试 `an_edit_waits_for_its_conflict_copy_to_reach_dropbox` | 冲突副本已生成本地但**尚未上传成功**；用户正在当前文件上继续编辑 | 触发上传失败或上传未完成的同步轮次 | 当前编辑内容**不被冲突副本处理覆盖**；待上传成功后才允许覆盖 |

---

## 二、场景测试用例

### 2.1 主路径：冲突副本与三方合并

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S44-01 | 普通文件双侧修改 → 保留冲突副本、后到者保留双方 | Step 1→6 | 设备 A、B 连接同一云账户且已同步过一次（存在共同基线）；`main.tex` 存在于基线 | ①设备 A 修改 `main.tex` 并完成同步；②设备 B 修改**同一路径** `main.tex` 但尚未同步；③设备 B 触发同步 | 设备 B 侧生成冲突副本（形如 `main (Laptop YYYY-MM-DD).tex`）；**设备 A 的版本不被覆盖，两个版本都保留**；同步结果回传冲突副本信息 |
| ST-S44-02 | 用户在文件树比对两个版本并收敛 | Step 7 | ST-S44-01 的两个版本并存于设备 B 的 Library | ①在文件树查看原文件与冲突副本；②比对内容；③删除多余副本或保留其一；④再次触发同步 | 收敛结果写回并同步；双方最终一致；**同步不做自动取舍** |
| ST-S44-03 | `project.json` 双侧修改走 merge3 三方合并 | Step 4、Step 8 | 设备 A、B 已建立同步基线；`project.json` 存在于基线 | ①设备 A 修改 `project.json` 的一个字段并同步；②设备 B 修改**另一个**字段并同步；③设备 B 触发同步 | 走 merge3 三方合并，**不产生冲突副本**；合并结果同时保留设备 A 与设备 B 的改动并回写云存储 |
| ST-S44-04 | 设置类双侧修改走 merge3，同字段冲突 local 获胜 | Step 4、Step 8 | 设备 A、B 已建立同步基线 | ①设备 A 修改设置项 `theme` 并同步；②设备 B 修改**同一**设置项 `theme` 并同步；③设备 B 触发同步 | 走 merge3 而非冲突副本；合并结果中该字段取 **local（设备 B）**的值；UI 展示合并结果 |
| ST-S44-05 | 冲突副本上传成功后覆盖当前编辑 | Step 6→7 | ST-S44-01 状态；冲突副本尚未上传 | ①冲突副本在本地生成；②上传成功；③用户继续在当前文件上编辑 | 上传成功后当前编辑可被正常同步流程接管；上传**之前**的内容保护见 ST-S44-08 |
| ST-S44-06 | 后到者保留双方、双方最终收敛 | Step 5→7 | 设备 A、B 已建立同步基线 | ①设备 A 与设备 B 先后修改不同文件并各自同步；②后到一侧触发同步；③用户收敛冲突副本 | 后到一侧**同时保留双方版本**；用户收敛后再次同步，两侧 manifest 最终一致 |

### 2.2 异常路径

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S44-07 | 编辑器存在 dirty 缓冲，同步带来 Download / LocalDelete / MetaMerge | EX F3（未保存缓冲保护） | 打开 `main.tex` 且有未保存修改（dirty 缓冲） | 远端该文件有更新，同步触发 Download 类动作 | 动作改为 **Carry**；**未保存缓冲不被覆盖**；远端版本不落盘覆盖 |
| ST-S44-08 | 冲突副本尚未上传成功，用户继续当前编辑 | EX F4（冲突副本上传前保护） | 冲突副本已生成但上传未成功 | 用户在当前文件上继续输入并保存 | 当前编辑**不被冲突副本处理覆盖**；未保存内容不丢失 |
| ST-S44-09 | 同字段 metadata 冲突时 local 获胜 | EX F2（对应正常条件） | 设备 A、B 已建立同步基线；`project.json` 含设备字段 `exports` 等 | ①设备 A 与设备 B 各自修改 `exports` 等同一字段；②后到一侧同步 | 合并结果该字段取 **local** 值；设备字段保持本地值不被远端覆盖 |
| ST-S44-10 | 冲突副本数量累积到上限 | EX F1（冲突副本累积） | 已累积 100 个未 dismiss 的冲突副本 | 再产生一个冲突副本 | 冲突副本清单长度保持 ≤ 100；最早的条目被淘汰；`conflicts` 计数与实际清单一致 |
| ST-S44-11 | 上传失败后重启复用同一冲突副本名 | EX F4（上传成功前保护） | 冲突副本已落本地但上传失败；进程重启 | 重启后再次同步同一冲突 | 复用**同名**冲突副本（`reuse=true`），不产生 `main (Laptop 日期 2).tex` 之类的重复副本 |

### 2.3 人工验证用例（`[manual]`）

> 以下用例依赖**真实双设备环境**与**人工比对文件内容**，在无头 CI 中无法稳定断言，故标记 `[manual]`，不计入 `defined_count`。

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S44-12 `[manual]` | 两台真实设备上普通文件冲突副本的可见性与命名 | Step 1→7 | 两台真实设备；同一云账户；同一 `main.tex` | ①设备 A 修改并同步 `main.tex`；②设备 B 修改同一文件并同步；③在设备 B 的文件树查看 | 文件树出现冲突副本，命名含设备名与日期（如 `main (Laptop 2026-11-10).tex`）；两个版本均可打开比对；设备 A 的版本未被静默覆盖 |
| ST-S44-13 `[manual]` | 人工比对并收敛两个冲突版本 | Step 7 | ST-S44-12 的两个版本并存 | ①人工比对两版本内容；②保留其一、删除另一副本；③再次同步 | 收敛结果同步到另一设备；两侧最终一致，无残留冲突副本 |

---

## 三、覆盖度校验

### 3.1 Phase 1 正常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 正常：普通文件冲突副本（两个版本都保留，含设备与日期命名，后到者保留双方，可比对后收敛） | UT-S44-06、UT-S44-16、UT-S44-17、UT-S44-18、ST-S44-01、ST-S44-02、ST-S44-06、ST-S44-12 `[manual]`、ST-S44-13 `[manual]` | ✅ 已覆盖 |
| 正常：元数据三方合并（`project.json` / 设置走 merge3 而非冲突副本；同字段 metadata 冲突 local 获胜） | UT-S44-07、UT-S44-08 ~ UT-S44-13、ST-S44-03、ST-S44-04、ST-S44-09 | ✅ 已覆盖 |

### 3.2 Phase 1 异常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 异常：未保存缓冲保护（编辑器 dirty 时 Download / LocalDelete / MetaMerge 改为 Carry，不覆盖未保存缓冲） | UT-S44-14、UT-S44-15、ST-S44-07 | ✅ 已覆盖 |
| 异常：冲突副本上传前保护（冲突副本尚未上传成功时，当前编辑不被覆盖） | UT-S44-20、ST-S44-05、ST-S44-08、ST-S44-11 | ✅ 已覆盖 |

### 3.3 EX 异常用例（时序文件 §四 失败与降级分支）

| EX | 覆盖用例 | 结论 |
|---|---|---|
| F1 普通文件双侧修改 → 保留两个版本（冲突副本），不自动合并正文 | UT-S44-06、ST-S44-01 | ✅ 已覆盖 |
| F2 `project.json` / 设置双侧修改 → 走 merge3 而非冲突副本；同字段冲突 local 获胜 | UT-S44-07 ~ UT-S44-13、ST-S44-03、ST-S44-04、ST-S44-09 | ✅ 已覆盖 |
| F3 编辑器 dirty 且同步带来 Download / LocalDelete / MetaMerge → 改为 Carry，不覆盖未保存缓冲 | UT-S44-14、UT-S44-15、ST-S44-07 | ✅ 已覆盖 |
| F4 冲突副本尚未上传成功 → 当前编辑不被覆盖 | UT-S44-20、ST-S44-05、ST-S44-08、ST-S44-11 | ✅ 已覆盖 |
| F5 用户尚未做出收敛选择 → 两版本并存于 Library，同步不做自动取舍 | ST-S44-01、ST-S44-02、ST-S44-12 `[manual]`、ST-S44-13 `[manual]` | ✅ 已覆盖 |

### 3.4 API required 字段

| 命令 | 必填字段 | 覆盖用例 | 结论 |
|---|---|---|---|
| `cloud_project_dismiss_conflicts` | `local_id` | UT-S44-01、UT-S44-02 | ✅ 已覆盖 |
| `cloud_project_replace_remote` | `local_id` | UT-S44-03 | ✅ 已覆盖 |
| `cloud_project_remove` | `local_id` | UT-S44-04 | ✅ 已覆盖 |
| `cloud_settings_sync` | `values`（JSON，merge3 入口） | UT-S44-05 | ✅ 已覆盖 |
| `cloud_settings_keep_local` | `values`（JSON） | — | ⚠️ 未单独设计 UT：`values` 必填 JSON 约束与 `cloud_settings_sync` 同族，已在 UT-S44-05 覆盖该约束族；差异仅在语义分支（keep local 语义属 S43 设置同步范围），不重复登记 |
| `cloud_project_resolve_hold` | `local_id`、`choice`（枚举 `restore`/`delete`） | — | ➖ 归入 S45 场景（hold 裁决），本文件不重复登记 |
| `cloud_project_set_mode` | `local_id`、`mode`（枚举 `sync`/`pause`） | — | ➖ 归入 S45 场景 |
| `cloud_sync_now` | 无必填参数（`dirty` 可选） | — | ✅ 不适用：无必填参数 |
| `cloud_state` / `cloud_details` / `cloud_providers` / `cloud_disconnect` / `cloud_set_enabled` / `cloud_set_device_name` / `cloud_download_project` / `cloud_settings_download` / `cloud_settings_applied` / `cloud_settings_defer` / `cloud_wait_for_changes` | 见 S43 文件 §3.4 登记 | — | ➖ 与 S43 同命令集，已在 S43 文件统一登记，本文件不重复 |

### 3.5 DB UNIQUE · CHECK 约束

| 约束清单 | 覆盖用例 | 结论 |
|---|---|---|
| S44 相关表的 UNIQUE / CHECK / NOT NULL / FOREIGN KEY | — | ➖ **不适用**：S44 无数据库表。冲突副本清单与冲突计数持久化于 JSON 状态文件 `state.json`（`src-tauri/src/cloud/state.rs` L97-130、L251-292）；基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）不含 sync 模块表，故本场景**无 DB 约束可提取**，不存在未覆盖项 |

### 3.6 覆盖度小结

- 正常验收条件 2 条、异常验收条件 2 条、EX 分支 5 条：**全部覆盖**。
- API required 字段：4 条有独立 UT 覆盖；1 条为「同族约束已覆盖」的部分覆盖并写明原因；2 条归入 S45 场景；其余命令与 S43 同集、已在 S43 文件统一登记。
- DB 约束：本场景无 DB 表，登记为不适用并写明原因，**无空勾**。
- **未决口**：真实双设备环境下的冲突副本文件名日期格式与人工比对收敛流程以 `[manual]` 用例登记，不预填结论。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S44-AC-01 | **正常：普通文件冲突副本** — GIVEN 设备 A 与设备 B 均修改了同一普通文件，先后完成同步；WHEN 后到的一侧同步；THEN 不覆盖先到的版本：两个版本都保留（冲突副本含设备与日期命名），后到者保留双方，可比对后收敛 | UT-S44-01、UT-S44-06、UT-S44-16、UT-S44-17、UT-S44-18、UT-S44-19、ST-S44-01、ST-S44-02、ST-S44-06、ST-S44-11、ST-S44-12 `[manual]`、ST-S44-13 `[manual]` |
| S44-AC-02 | **正常：元数据三方合并** — GIVEN `project.json` 或设置在双侧被修改；WHEN 同步；THEN 走 merge3 三方合并而非冲突副本；同字段 metadata 冲突时 local 获胜 | UT-S44-05、UT-S44-07 ~ UT-S44-13、ST-S44-03、ST-S44-04、ST-S44-09 |
| S44-AC-03 | **异常：未保存缓冲保护** — GIVEN 编辑器存在未保存（dirty）缓冲；WHEN Download / LocalDelete / MetaMerge 类同步操作到来；THEN 改为 Carry 处理，不覆盖未保存缓冲 | UT-S44-14、UT-S44-15、ST-S44-07 |
| S44-AC-04 | **异常：冲突副本上传前保护** — GIVEN 冲突副本尚未上传成功；WHEN 用户继续当前编辑；THEN 当前编辑不被冲突副本处理覆盖 | UT-S44-20、ST-S44-05、ST-S44-08、ST-S44-11 |
