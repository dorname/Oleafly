## S01 从模板或外部资料创建研究项目 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`（package.json / src-tauri/Cargo.toml / tauri.conf.json 一致），绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` core 段 S01 行、`deltas/prd/1-product-requirements/core-01-requirements.md` S01 节、`deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` S01 节、`deltas/prd/3-technical-plan/2-scenario-implementation/core-S01-project-create-import.md`、`deltas/api/core-01-backend-port.md`、`deltas/database/core-01-local-stores.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证（基线环境 `npm test` 与 pnpm workspace 不符，见 `inventory.md`「verify 阶段注意」）。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（BackendPort v7 / Tauri IPC）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S01-01 | `backend_protocol_info()` 返回的 `protocol_version` 与 `capabilities` 形态符合 v7 契约 | API delta §2.1（`packages/backend-port/src/index.ts:17-20`；`src-tauri/src/protocol.rs:26-31`） | 应用已启动，BackendPort 已装配 | 调用 `backend_protocol_info()` | 返回 `{ protocol_version: 7, capabilities: string[] }`；`capabilities` 为 12 项 |
| UT-S01-02 | 能力清单的「已排序且唯一、且必须包含 `collab`」一致性约束成立 | API delta §2.1 一致性约束（`src-tauri/src/protocol.rs:38-55`） | 已取得能力清单 | 含重复项 / 乱序 / 缺 `collab` 的能力清单 | 一致性校验拒绝该清单并返回错误，不放行非法能力集 |
| UT-S01-03 | `getProjectEngine(projectId)` 返回 `DocumentEngineDescriptor`，含引擎、文档类型与主文件 | API delta §2.4（`packages/backend-port/src/index.ts:1419-1470`）；场景实现 §三 Step 6 | 项目已创建且 `project.json` 已写入 | 合法 `projectId` | 返回引擎描述符；字段可被 UI 渲染为确认页的「引擎 / 文档类型 / 主文件」 |
| UT-S01-04 | `getProjectEngine(projectId)` 对未知 `projectId` 不返回伪造描述符 | API delta §2.4；场景实现 §三 Step 9 | 项目库为空 | 不存在的 `projectId` | 返回错误或空态，不返回默认引擎描述符 |
| UT-S01-05 | `project_engine` / `has_pandoc` 可用于导入前的引擎与 Pandoc 可用性判定 | API delta §4.9（`project_engine`、`has_pandoc`、`download_pandoc`） | 应用已启动 | 调用两个命令 | `project_engine` 返回引擎描述符；`has_pandoc` 返回布尔可用性；两者均为纯查询无副作用 |
| UT-S01-06 | `list_files` / `list_file_tree` 在导入完成后返回新项目目录的内容，且不含导入源路径 | API delta §4.5；场景实现 §三 Step 8 | 导入已完成 | 新项目 `projectId` | 返回项目目录内文件列表；不把源材料目录当作文档树节点暴露 |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| — | 本场景无 DB UNIQUE / CHECK 约束落点 | DB delta §一、§七；场景实现 §二（文件系统 = 本地源材料目录 / 目标项目目录） | — | — | **未覆盖，原因**：本场景的产物是**普通文件目录 + `project.json`**，不写 `library.db` / `catalog.sqlite3` / `tasks.sqlite3` / `literature-cache.sqlite3` / `sessions.sqlite` 任一 SQLite 库；桌面五库互不迁移且不承载项目源数据（DB delta §七）。因此无 UNIQUE / CHECK 约束可测，相关约束改由 1.3 业务规则（ZIP 上限、跳过条目、shell escape 强制关闭）覆盖 |

### 1.3 来源分组：业务规则（导入约束 / 模板与转换规则）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S01-07 | ZIP 条目数上限 5000，超限即拒绝导入 | inventory.md S01 行；场景实现 §四 F1 | 构造 ZIP | 条目数 5001 的 ZIP | 导入失败并明确报错；**不留下半成品项目** |
| UT-S01-08 | ZIP 解压总量上限 2 GiB，超限即拒绝导入 | inventory.md S01 行；场景实现 §四 F1 | 构造 ZIP | 解压总量 > 2 GiB 的 ZIP | 同上：明确报错，无半成品残留 |
| UT-S01-09 | 目录深度上限 16，超限即拒绝导入 | inventory.md S01 行；场景实现 §四 F1 | 构造 ZIP | 深度 17 的条目 | 同上：明确报错，无半成品残留 |
| UT-S01-10 | 归档内的 `.git` / `.oleafly` / `__MACOSX` 条目被跳过 | inventory.md S01 行；场景实现 §四 F3 | 构造含上述目录的 ZIP | 含 `.git/`、`.oleafly/`、`__MACOSX/` 的 ZIP | 这些条目**不写入**新项目目录；其余条目正常导入 |
| UT-S01-11 | 归档内的路径穿越条目被跳过 | inventory.md S01 行；场景实现 §四 F3 | 构造含 `../` 穿越条目的 ZIP | 含路径穿越条目的 ZIP | 穿越条目不落地到项目目录之外，也不写入项目目录 |
| UT-S01-12 | Pandoc 不可用时返回 `tools.pandoc_missing` 且不创建项目 | 需求 §四 S01「异常：Pandoc 缺失」；场景实现 §四 F4 | 环境中无 Pandoc；准备 DOCX / Markdown / HTML / Typst 源 | 确认导入上述任一格式 | 返回明确错误码 `tools.pandoc_missing`；**不创建项目目录** |
| UT-S01-13 | Pandoc 转换失败时保留输入（原件与 staging 输入不丢），允许重试 | 场景实现 §四 F5；inventory.md S01 行「转换失败保留输入可重试」 | Pandoc 存在但转换报错 | 可重试的失败转换 | 原件保留、staging 输入保留；错误显式返回，不静默成功 |
| UT-S01-14 | 导入项目强制关闭 shell escape | inventory.md S01 行；场景实现 §三 Step 7、§五 | 导入完成 | 读取新项目 `project.json` | shell escape 为**关闭态**（无论源侧曾开启） |
| UT-S01-15 | 单根目录 ZIP 自动展开并推断主文档 | inventory.md S01 行；场景实现 §三 Step 6、§五 | 构造单根目录 ZIP | 仅含一个顶层目录的 ZIP | 顶层目录被展开；主文档被推断并写入 `project.json` |
| UT-S01-16 | 导入为复制语义，原件不被修改 | 需求 §四 S01「正常：ZIP/目录导入」；场景实现 §三 Step 8、§五 | 准备可读源材料 | 导入前的源文件内容与修改时间 | 导入后源文件内容与修改时间**不变**；内容被复制进新项目 |
| UT-S01-17 | 导入失败不留下半成品项目目录 | 场景实现 §四 F1 / F2、§五（失败通则） | 构造超限或不可读来源 | 触发 F1 / F2 | 目标位置**无**新建的项目目录残留 |
| UT-S01-18 | 删除模板不影响已建项目 | inventory.md S01 行「删模板不影响已建项目」；场景实现 §四 F6 | 已用某模板创建项目 | 删除该模板后打开原项目 | 原项目仍可正常打开与编辑，源文件完好 |
| UT-S01-19 | 导入项目迁移到新位置后 shell escape 仍为关闭态 | 场景实现 §四 F7；S07 边界「shell escape 信任」 | 已完成导入并迁移目录 | 迁移后读取 `project.json` | shell escape 仍关闭；信任需在新位置重新授予 |
| UT-S01-20 | 模板创建后主文件可编辑且编译按声明引擎执行 | 需求 §四 S01「正常：模板创建」；S07 承接编译 | 已用模板创建项目 | 打开主文件并触发编译 | 主文件可编辑；编译按 `project.json` 声明的引擎执行 |

---

## 二、场景测试用例

### 2.1 主路径：从模板或外部资料创建研究项目

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S01-01 | 模板创建项目主路径（空白 / 内置 / 自定义模板） | Step 1→10 | 应用已启动；项目库可用；模板条目存在且可读；目标位置可写 | ① 项目库进入新建流程 → ② 选择模板（空白 / 内置 / 自定义） → ③ 确认页核对引擎、文档类型、主文件与首页预览 → ④ 确认创建 → ⑤ 打开主文件 | 生成**独立项目目录**；`project.json` 记录引擎、文档类型与主文件；主文件在编辑器中可编辑；导入/创建路线下 shell escape 为关闭态、本地 Git 已初始化；结果返回项目路径、主文件与引擎 |
| ST-S01-02 | ZIP / 目录导入主路径 | Step 1→10 | 源 ZIP 或目录在本地可读；目标位置可写 | ① 进入导入流程并选择 ZIP / 目录来源 → ② 确认页核对引擎、文档类型、主文件与首页预览 → ③ 确认导入 → ④ 打开项目 | 内容**复制**进新项目目录，原件未被修改；单根目录 ZIP 自动展开并推断主文档；`.git` / `.oleafly` / `__MACOSX` 与路径穿越条目被跳过；shell escape 强制关闭；本地 Git 初始化；导入不拉起引擎进程（编译由 S07 承接） |
| ST-S01-03 | DOCX / Markdown / HTML / Typst 经 Pandoc staging 导入主路径 | Step 1→10 | 本机 Pandoc 可用；源文件可读 | ① 选择 DOCX / Markdown / HTML / Typst 来源 → ② 确认页预览 → ③ 确认导入 → ④ 打开生成项目 | Pandoc 在 staging 区完成转换并产出可编辑项目；主文档被推断并写入 `project.json`；原件未被修改 |

### 2.2 异常路径

> EX 编号与 `core-S01-project-create-import.md` §四「失败与降级分支」表中的 F 分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-F1 | F1 | ZIP 超 5000 entries / 2 GiB / 深度 16 | S01-AC-03 |
| EX-F2 | F2 | ZIP 或目录不可读 | S01-AC-03 |
| EX-F3 | F3 | 归档含 `.git` / `.oleafly` / `__MACOSX` / 路径穿越条目 | S01-AC-03 |
| EX-F4 | F4 | Pandoc 不可用 | S01-AC-04 |
| EX-F5 | F5 | Pandoc 转换失败 | S01-AC-04（相邻分支，输入保留） |
| EX-F6 | F6 | 用户删除所用模板 | S01-AC-01（已建项目不受影响） |
| EX-F7 | F7 | 导入项目迁移到新位置 | S01-AC-02（shell escape 信任边界） |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S01-04 | ZIP 超出 entries / 解压总量 / 深度上限时导入失败 | EX-F1 | 目标位置可写 | 导入 5001 entries / >2 GiB / 深度 17 的 ZIP | 导入失败并明确报错；**不留下半成品项目**；原件不受影响 |
| ST-S01-05 | 来源不可读时导入失败 | EX-F2 | 目标位置可写 | 导入一个不可读的 ZIP 或目录 | 明确报错；无半成品项目残留；失败不以「创建空项目」方式降级 |
| ST-S01-06 | 归档中的跳过条目与路径穿越条目被正确排除 | EX-F3 | 构造含上述条目的 ZIP | 导入该 ZIP | `.git` / `.oleafly` / `__MACOSX` / 路径穿越条目不写入项目目录；其余内容正常导入 |
| ST-S01-07 | Pandoc 缺失时导入被明确拒绝 | EX-F4 | 环境中无 Pandoc | 导入 DOCX / Markdown / HTML / Typst | 返回 `tools.pandoc_missing` 明确错误；**不创建项目**；已有项目不受影响 |
| ST-S01-08 | Pandoc 转换失败时输入保留且可重试 | EX-F5 | Pandoc 存在但转换报错 | 导入一个会转换失败的文件 | 原件与 staging 输入保留；错误显式返回；修正后可再次提交重试 |
| ST-S01-09 | 删除模板后已建项目不受影响 | EX-F6 | 已用模板 T 创建项目 | 删除模板 T 后打开该项目 | 项目仍可打开与编辑，源文件完好，不因模板消失而损坏 |
| ST-S01-10 | 导入项目迁移后 shell escape 信任边界 | EX-F7 | 已完成导入 | 把项目目录移到新位置并打开 | shell escape 仍为关闭态；信任须在新位置重新授予 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S01-11 [manual] | 确认页「引擎 / 文档类型 / 主文件 / 首页预览」四项的渲染与视觉正确性 | Step 2 | 已进入新建 / 导入流程并选定来源 | 查看确认页并与所选模板或源材料首页逐项比对 | 人工在真实桌面应用确认信息与首页预览渲染正确、无截断或错位（视觉核对，CI 无头环境不可稳定断言） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S01-AC-01（正常：模板创建）→ ST-S01-01、UT-S01-03、UT-S01-20
  - S01-AC-02（正常：ZIP/目录导入）→ ST-S01-02、ST-S01-03、UT-S01-15、UT-S01-16
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S01-AC-03（异常：ZIP 超限或不可读）→ ST-S01-04、ST-S01-05、ST-S01-06、UT-S01-07、UT-S01-08、UT-S01-09、UT-S01-17
  - S01-AC-04（异常：Pandoc 缺失）→ ST-S01-07、ST-S01-08、UT-S01-12、UT-S01-13
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-F1→ST-S01-04、EX-F2→ST-S01-05、EX-F3→ST-S01-06、EX-F4→ST-S01-07、EX-F5→ST-S01-08、EX-F6→ST-S01-09、EX-F7→ST-S01-10（7/7 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/core-01-backend-port.md` 是**桌面内部 typed IPC 契约快照**，不是 OpenAPI 文档，全文**未使用 `required` 关键字标注字段**；因此本项按「契约中不可省略的入参」等价覆盖：`backend_protocol_info()`（UT-S01-01）、能力清单一致性（UT-S01-02）、`getProjectEngine(projectId)`（UT-S01-03/04）、`project_engine` / `has_pandoc`（UT-S01-05）、`list_files` / `list_file_tree`（UT-S01-06）。
  - **未覆盖（说明原因）**：API delta 未标注任何 `required` 字段，故不存在「按 OpenAPI required 字段枚举」的剩余清单项；契约新增字段时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**：**不适用**——本场景无 SQLite 落点。项目产物为普通目录 + `project.json`；桌面五库（`library.db` / `catalog.sqlite3` / `tasks.sqlite3` / `literature-cache.sqlite3` / `sessions.sqlite`）均不承载项目源数据与导入元数据（DB delta §一、§七）。因此本场景无 UNIQUE / CHECK 约束可测；等价约束以业务规则形式落在 UT-S01-07 ~ UT-S01-19。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景为**桌面本地功能**（项目创建 / 导入），不涉及部署产物或服务端；基线的部署与 smoke 方案归属 `delivery` 模块与 `deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md`，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S01-AC-01 | **正常：模板创建** — GIVEN 用户在项目库新建流程中 / WHEN 选择一个模板并确认引擎、主文件与预览 / THEN 生成独立项目目录，打开后主文件可编辑，编译按声明引擎执行 | ST-S01-01, ST-S01-09, UT-S01-03, UT-S01-20 |
| S01-AC-02 | **正常：ZIP/目录导入** — GIVEN 用户选择本地 ZIP 或目录导入 / WHEN 导入完成 / THEN 内容复制到新项目，原文件未被修改；单根目录 ZIP 自动展开，推断主文档；导入项目强制关闭 shell escape，本地 Git 初始化 | ST-S01-02, ST-S01-03, ST-S01-10, UT-S01-14, UT-S01-15, UT-S01-16, UT-S01-19 |
| S01-AC-03 | **异常：ZIP 超限或不可读** — GIVEN ZIP 超过 5000 entries / 2 GiB 解压总量 / 深度 16，或不可读 / WHEN 用户尝试导入 / THEN 导入失败并明确报错，不留下半成品项目；跳过 `.git`/`.oleafly`/`__MACOSX` 与路径穿越条目 | ST-S01-04, ST-S01-05, ST-S01-06, UT-S01-07, UT-S01-08, UT-S01-09, UT-S01-10, UT-S01-11, UT-S01-17 |
| S01-AC-04 | **异常：Pandoc 缺失** — GIVEN 用户导入 DOCX/Markdown/HTML/Typst 且 Pandoc 不可用 / WHEN 确认导入 / THEN 返回 `tools.pandoc_missing` 明确错误，不创建项目 | ST-S01-07, ST-S01-08, UT-S01-12, UT-S01-13 |

> 追溯说明：`S01-AC-01` ~ `S01-AC-04` 按 `deltas/prd/1-product-requirements/core-01-requirements.md` §四 S01 节中「正常 / 异常」验收条件的出现顺序连续编号，正常与异常统一编号。
