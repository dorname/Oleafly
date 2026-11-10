## S12 检查点恢复与加密迁移 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` core 段 S12 行、「架构与测试要点 → 数据资产」行、`deltas/prd/1-product-requirements/core-01-requirements.md` S12 节、`deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` S12 节、`deltas/prd/3-technical-plan/2-scenario-implementation/core-S12-checkpoints.md`、`deltas/api/core-01-backend-port.md`、`deltas/database/core-01-local-stores.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**未创建任何真实数据库文件、未执行任何迁移**，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增表 / 字段 / 索引；只登记已实现能力的测试设计。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（BackendPort `checkpoints` capability / Tauri IPC）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S12-01 | `checkpoint_list` 返回检查点列表，含版本、引擎、主文档与文件列表 | API delta §4.12（检查点族）；场景实现 §三 Step 4 | 项目已有至少一个检查点 | 调用 `checkpoint_list` | 返回检查点元信息集合，字段与时间线呈现所需一致 |
| UT-S12-02 | `checkpoint_set_label` 为检查点写入标签 | API delta §4.12；场景实现 §三 Step 5 | 项目已有检查点 | 目标 `checkpoint` 标识 + 标签文本 | 标签被写入并可在 `checkpoint_list` 中读回 |
| UT-S12-03 | `checkpoint_stats` / `checkpoint_files` / `checkpoint_inspect` 提供统计、文件清单与明细检查 | API delta §4.12 | 项目已有检查点 | 逐一调用 | 返回对应统计 / 清单 / 明细；不修改检查点内容 |
| UT-S12-04 | `checkpoint_restore` 触发指定版本恢复 | API delta §4.12；场景实现 §三 Step 6 | 项目已有检查点 | 目标检查点标识 | 触发恢复事务（详见 1.3 业务规则） |
| UT-S12-05 | `checkpoint_verify` 校验检查点完整性 | API delta §4.12；场景实现 §三 Step 3 | 项目已有检查点 | 调用 `checkpoint_verify` | 返回可判定完整 / 不完整的校验结果 |
| UT-S12-06 | `checkpoint_export` / `checkpoint_import` 处理加密 archive 的导出与导入 | API delta §4.12；场景实现 §三 Step 8→10 | 项目已有检查点历史 | 口令 + archive 路径 | 导出产出加密 archive 文件；导入执行版本校验后再改历史 |
| UT-S12-07 | `checkpoint_keep_latest` / `checkpoint_reset` 执行历史清理 | API delta §4.12；场景实现 §三 Step 10 | 项目已有多个检查点 | 分别调用两种清理 | Keep latest 保留最新并清理其余；Reset 清空历史；两者语义可区分 |
| UT-S12-08 | `checkpoint_delete` / `checkpoint_reveal_store` / `checkpoint_save_file` 的可达性 | API delta §4.12 | 应用已启动 | 核对注册表并调用 | 命令存在且返回可识别结果；`checkpoint_reveal_store` 给出检查点存储位置 |
| UT-S12-09 | `checkpoints` 能力出现在 BackendPort 能力清单中 | API delta §2.2 第 4 项、`§2.1` 一致性约束 | 应用已启动 | 调用 `backend_protocol_info()` | `capabilities` 含 `checkpoints`；清单已排序且唯一 |
| UT-S12-10 | `compileProject` 成功后触发后台检查点捕获（编译成功信号路径） | API delta §2.4；场景实现 §三 Step 1 | 项目已存在且源已保存 | 调用 `compileProject` 并等待成功 | 编译成功后进入后台捕获调度（详见 1.3 业务规则） |

### 1.2 来源分组：DB 约束（`catalog.sqlite3`，checkpoint catalog format 2）

> 依据：`deltas/database/core-01-local-stores.md` §三。该库位于检查点存储根目录 `oleafly_root()/checkpoints/<project_id>/catalog.sqlite3`，`FORMAT_VERSION = 2` 记录于 `PRAGMA user_version`。

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S12-11 | `packs.file_name` 唯一约束：重复 `file_name` 被拒绝 | DB delta §三「`packs`：主键 `pack_id`；`file_name` 唯一」 | 已建 catalog 库 | 插入两条相同 `file_name` 的 pack 记录 | 第二条插入被唯一约束拒绝，不产生重复行 |
| UT-S12-12 | `packs.encoded_size` 非负约束：负值被拒绝 | DB delta §三「`encoded_size` 非负约束」 | 已建 catalog 库 | `encoded_size = -1` | 写入被 CHECK 约束拒绝 |
| UT-S12-13 | `chunks.chunk_hash` 主键 + 指向 `packs(pack_id)` 的外键 | DB delta §三「`chunks`：主键 `chunk_hash`，外键指向 `packs(pack_id)`」 | 已建 catalog 库 | 写入指向不存在 `pack_id` 的 chunk | 写入被外键约束拒绝 |
| UT-S12-14 | `chunks.encoding` 取值限于 0 / 1 | DB delta §三「`encoding`（0/1 枚举）」 | 已建 catalog 库 | `encoding = 2`（或其他越界值） | 写入被 CHECK 约束拒绝 |
| UT-S12-15 | `checkpoints.snapshot_root` 唯一约束 | DB delta §三「`checkpoints`：自增 `sequence` 主键，`snapshot_root` 唯一」 | 已建 catalog 库 | 两条相同 `snapshot_root` 的检查点记录 | 第二条被唯一约束拒绝 |
| UT-S12-16 | `store_identity` 单例约束：`singleton = 1` CHECK | DB delta §三「`store_identity`：单例表（`singleton = 1` CHECK），`lineage` 唯一」 | 已建 catalog 库 | 插入 `singleton = 2` 的行 | 写入被 CHECK 约束拒绝；表内至多一行 |
| UT-S12-17 | `store_identity.lineage` 唯一约束 | DB delta §三 | 已建 catalog 库 | 两条相同 `lineage` | 第二条被唯一约束拒绝 |
| UT-S12-18 | 打开 `catalog.sqlite3` 时 `user_version` 高于 2 → 返回 `UnsupportedFormat` 错误 | DB delta §三「打开时若库中版本**高于**当前支持的 2，返回 `UnsupportedFormat` 错误」 | 构造 `user_version = 3` 的库 | 打开该库 | 打开失败并返回 `UnsupportedFormat`；**不尝试读写数据** |
| UT-S12-19 | `user_version` 低于 2 时走 `upgrade_existing_format` 升级 | DB delta §三「低于当前版本则走 `upgrade_existing_format` 升级」 | 构造 `user_version = 1` 的库 | 打开该库 | 打开后版本升级到 2；数据可正常读写 |
| UT-S12-20 | 全部 DDL 在单事务内完成（`BEGIN IMMEDIATE` … `COMMIT`） | DB delta §三「建库在单事务内完成」 | 空目录 | 首次创建 catalog 库 | 建库成功且版本为 2；无半建库状态 |
| UT-S12-21 | 检查点记录带可复现身份字段：`engine`、`toolchain_identity`、`main_document`、`output_hash` | DB delta §三「检查点带可复现身份」；场景实现 §三 Step 4 | 存在一个检查点 | 读取该检查点记录 | 上述字段非空且与产出该检查点的编译一致 |

### 1.3 来源分组：业务规则（捕获时机、完整性、恢复事务、加密迁移）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S12-22 | 仅在**成功编译且项目目录有变化**时才后台生成独立检查点 | 需求 §四 S12「正常：检查点与恢复」；场景实现 §一 前置条件、§三 Step 2、§五 | 项目已成功编译过一次 | ① 目录无变化时再次编译 → ② 修改一个文件后再次编译 | 无变化时不产生新检查点；有变化时产生一个新的独立检查点 |
| UT-S12-23 | 部分文件无法完整捕获时**不发布不完整快照** | 需求 §四 S12「异常：不完整捕获」；场景实现 §三 Step 3、§四 F1 | 制造无法完整捕获的文件 | 触发捕获 | 不发布快照；检查点列表中不出现该不完整版本 |
| UT-S12-24 | 捕获不完整**不把成功编译改为失败** | 场景实现 §三 Step 3、§四 F1 | 同上 | 触发捕获后查看编译状态 | 编译状态仍为成功；失败只体现在快照未发布，不产生虚假编译失败 |
| UT-S12-25 | 新编译开始时**取消旧捕获**且不误报 | 场景实现 §三 Step 3、§四 F2 | 旧捕获进行中 | 立即触发新编译 | 旧捕获被取消；不产生虚假失败或虚假检查点 |
| UT-S12-26 | 恢复是**事务**：中断则回滚到恢复前状态 | 需求 §四 S12「正常：检查点与恢复」；场景实现 §三 Step 6、§四 F3 | 项目已有检查点 | 恢复过程中断（模拟失败） | 项目回到恢复前状态；不出现半恢复状态 |
| UT-S12-27 | 恢复之后新增的文件与 `.git` / `.oleafly` **保留** | 需求 §四 S12「正常：检查点与恢复」；场景实现 §三 Step 6、§四 F7 | 恢复到某版本，且恢复点之后用户新增过文件 | 执行恢复 | 新增文件仍在；`.git` / `.oleafly` 仍在；目标版本内容被还原 |
| UT-S12-28 | 恢复后触发重新编译 | 场景实现 §三 Step 7 | 恢复成功 | 观察编译 | 编译被重新触发一次（承接 S07） |
| UT-S12-29 | 导入由**更新版本**创建的加密 archive 时，在**改历史前拒绝** | 需求 §四 S12「异常：加密历史」；场景实现 §三 Step 10、§四 F4 | archive 由更高版本 Oleafly 产生 | 导入该 archive | 导入被拒绝并说明版本不兼容；**本地历史未被改动** |
| UT-S12-30 | archive 版本不受支持时拒绝导入且不改动本地历史 | 场景实现 §四 F5 | archive 版本不受支持 | 导入该 archive | 拒绝导入；本地历史不变 |
| UT-S12-31 | 忘记导出口令**不可恢复** | 需求 §四 S12「异常：加密历史」；场景实现 §四 F6 | 已导出加密 archive | 用错误口令导入 | 导入失败；无后门、无部分写入；既有历史不受影响 |
| UT-S12-32 | 检查点存储与本地 Git **完全独立**，互不替代 | 需求 §四 S12；inventory.md S12 行；场景实现 §五 | 项目同时使用 Git 与检查点 | 分别创建提交与检查点 | 两条历史互不影响；删除 Git 仓库不删除检查点，反之亦然 |
| UT-S12-33 | 失败编译的 best-effort PDF **不更新**最后成功检查点 | 场景实现 §四 F6、§五；S09 边界 | 存在最后成功检查点 | 一次失败编译产出 best-effort PDF | 最后成功检查点仍指向上一次成功编译的版本 |

---

## 二、场景测试用例

### 2.1 主路径：检查点恢复与加密迁移

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S12-01 | 成功编译后后台生成独立检查点 | Step 1→3 | 项目已成功编译过一次；此后项目目录有变化 | ① 修改一个源文件 → ② 触发编译并成功 → ③ 等待后台捕获完成 → ④ 查询检查点列表 | 产生一个新的独立检查点；列表中可见该版本及其引擎、主文档与文件列表；编译状态仍为成功 |
| ST-S12-02 | 时间线查看、标注标签与恢复后重新编译 | Step 4→7 | 项目已有至少一个检查点 | ① 打开 Versioning 时间线并查看版本 / 引擎 / 主文档 / 文件 → ② 为某版本加标签 → ③ 选择某版本恢复 → ④ 观察重新编译 | 时间线信息完整；标签写入并可见；恢复后项目回到该版本；恢复后重新编译被触发 |
| ST-S12-03 | 恢复保留恢复之后新增的文件与 `.git` / `.oleafly` | Step 6 | 恢复到版本 V，且 V 之后用户新增过文件 `extra.tex` | 执行恢复到 V 并检查项目目录 | V 的内容被还原；`extra.tex`、`.git`、`.oleafly` 均保留 |
| ST-S12-04 | 加密历史导出与同版本导入 | Step 8→10 | 项目已有检查点历史 | ① 设置口令导出加密 archive → ② 在另一台机器 / 另一目录导入 → ③ 查看历史 | 导出产出加密 archive 文件；导入后历史完整呈现；口令错误时导入失败且不改动本地历史 |
| ST-S12-05 | Keep latest / Reset 清理 | Step 10 | 项目已有多个检查点 | ① 执行 Keep latest → ② 再次执行 Reset | Keep latest 后仅保留最新版本；Reset 后历史清空；两者语义不混淆 |

### 2.2 异常路径

> EX 编号与 `core-S12-checkpoints.md` §四「失败与降级分支」表中的 F 分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-F1 | F1 | 部分文件无法完整捕获 | S12-AC-02 |
| EX-F2 | F2 | 新编译开始，旧捕获尚未完成 | S12-AC-02 |
| EX-F3 | F3 | 恢复过程被中断 | S12-AC-01 |
| EX-F4 | F4 | 导入由更新版本 Oleafly 创建的加密 archive | S12-AC-03 |
| EX-F5 | F5 | archive 版本不受支持 | S12-AC-03 |
| EX-F6 | F6 | 用户忘记导出口令 | S12-AC-03 |
| EX-F7 | F7 | 恢复到的版本之后用户新增过文件 | S12-AC-01 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S12-06 | 捕获不完整时不发布快照且不改编译状态 | EX-F1 | 存在无法完整捕获的文件 | 触发捕获 | 不发布不完整快照；编译状态仍为成功；时间线中无该版本 |
| ST-S12-07 | 新编译取消旧捕获且不误报 | EX-F2 | 旧捕获进行中 | 立即触发新编译 | 旧捕获被取消；无虚假失败、无虚假检查点；最终只产生有效检查点 |
| ST-S12-08 | 恢复中断时整体回滚 | EX-F3 | 项目已有检查点 | 恢复过程中断 | 项目回到恢复前状态；无半恢复状态残留 |
| ST-S12-09 | 导入高版本创建的 archive 时在改历史前拒绝 | EX-F4 | archive 由更高版本 Oleafly 产生 | 导入该 archive | 明确拒绝并说明版本不兼容；**本地历史未被改动** |
| ST-S12-10 | archive 版本不受支持时拒绝导入 | EX-F5 | archive 版本不受支持 | 导入该 archive | 拒绝导入；本地历史不变 |
| ST-S12-11 | 忘记口令不可恢复 | EX-F6 | 已导出加密 archive | 用错误口令导入 | 导入失败；无部分写入；既有历史不受影响 |
| ST-S12-12 | 恢复保留恢复后新增的文件与 `.git` / `.oleafly` | EX-F7 | 恢复到版本 V，V 之后新增过文件 | 执行恢复到 V | 新增文件与 `.git` / `.oleafly` 保留；V 内容被还原 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S12-13 [manual] | Versioning 时间线的版本 / 引擎 / 主文档 / 文件列表呈现 | Step 4 | 项目已有多个检查点 | 打开时间线并逐个版本查看元信息 | 人工确认元信息与文件列表与实际项目一致（视觉核对，CI 无头环境不可稳定断言） |
| ST-S12-14 [manual] | 跨机导入加密历史后的历史可用性 | Step 9→10 | 已在另一目录导出加密 archive | 在另一目录导入并浏览时间线 | 人工确认导入后的历史可浏览、可恢复（跨环境人工验证，CI 无头环境不可稳定断言） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S12-AC-01（正常：检查点与恢复）→ ST-S12-01、ST-S12-02、ST-S12-03、ST-S12-08、ST-S12-12、UT-S12-22、UT-S12-26、UT-S12-27、UT-S12-28
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S12-AC-02（异常：不完整捕获）→ ST-S12-06、ST-S12-07、UT-S12-23、UT-S12-24、UT-S12-25
  - S12-AC-03（异常：加密历史）→ ST-S12-04、ST-S12-09、ST-S12-10、ST-S12-11、UT-S12-29、UT-S12-30、UT-S12-31
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-F1→ST-S12-06、EX-F2→ST-S12-07、EX-F3→ST-S12-08、EX-F4→ST-S12-09、EX-F5→ST-S12-10、EX-F6→ST-S12-11、EX-F7→ST-S12-12（7/7 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/core-01-backend-port.md` 是**桌面内部 typed IPC 契约快照**，非 OpenAPI 文档，全文**未使用 `required` 关键字标注字段**；本项按「契约中不可省略的入参」等价覆盖：`checkpoint_list`（UT-S12-01）、`checkpoint_set_label`（UT-S12-02）、`checkpoint_stats` / `checkpoint_files` / `checkpoint_inspect`（UT-S12-03）、`checkpoint_restore`（UT-S12-04）、`checkpoint_verify`（UT-S12-05）、`checkpoint_export` / `checkpoint_import`（UT-S12-06）、`checkpoint_keep_latest` / `checkpoint_reset`（UT-S12-07）、`checkpoint_delete` / `checkpoint_reveal_store` / `checkpoint_save_file`（UT-S12-08）、能力清单含 `checkpoints`（UT-S12-09）、编译成功信号路径（UT-S12-10）。
  - **未覆盖（说明原因）**：API delta 未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增字段时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `packs.file_name` UNIQUE → UT-S12-11
  - `packs.encoded_size` 非负 CHECK → UT-S12-12
  - `chunks.encoding` 0/1 CHECK → UT-S12-14
  - `checkpoints.snapshot_root` UNIQUE → UT-S12-15
  - `store_identity.singleton = 1` CHECK → UT-S12-16
  - `store_identity.lineage` UNIQUE → UT-S12-17
  - 附加（外键与版本约束）：`chunks.pack_id` → `packs(pack_id)` 外键 → UT-S12-13；`user_version > 2` → `UnsupportedFormat` → UT-S12-18；`user_version < 2` → 升级 → UT-S12-19。
  - **未覆盖（说明原因）**：其余四库（`library.db` schema 3、`tasks.sqlite3` research schema 5、`literature-cache.sqlite3`、`sessions.sqlite`）不承载检查点数据（DB delta §一、§七），本场景无对应 UNIQUE / CHECK 约束可测。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景为**桌面本地功能**（检查点存储与加密 archive 均在本地），不涉及部署产物或服务端；部署与 smoke 方案归属 `delivery` 模块，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S12-AC-01 | **正常：检查点与恢复** — GIVEN 编译成功且项目文件有变化 / WHEN 稍后在时间线选择某版本恢复 / THEN 项目回到该版本且恢复之后新增的文件与 `.git`/`.oleafly` 保留；恢复本身是事务，中断回滚 | ST-S12-01, ST-S12-02, ST-S12-03, ST-S12-08, ST-S12-12, UT-S12-01, UT-S12-04, UT-S12-21, UT-S12-22, UT-S12-26, UT-S12-27, UT-S12-28 |
| S12-AC-02 | **异常：不完整捕获** — GIVEN 部分文件无法完整捕获 / WHEN 检查点生成 / THEN 不发布不完整快照，也不把成功编译改为失败；新编译取消旧捕获且不误报 | ST-S12-06, ST-S12-07, UT-S12-05, UT-S12-23, UT-S12-24, UT-S12-25 |
| S12-AC-03 | **异常：加密历史** — GIVEN 导出的加密 archive 由更新版本的 Oleafly 创建 / WHEN 旧版本导入 / THEN 在改历史前拒绝；忘记密码不可恢复（明确边界） | ST-S12-04, ST-S12-09, ST-S12-10, ST-S12-11, UT-S12-06, UT-S12-29, UT-S12-30, UT-S12-31 |

> 追溯说明：`S12-AC-01` ~ `S12-AC-03` 按 `deltas/prd/1-product-requirements/core-01-requirements.md` §四 S12 节中「正常 / 异常」验收条件的出现顺序连续编号，正常与异常统一编号。
