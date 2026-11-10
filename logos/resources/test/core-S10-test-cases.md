## S10 投稿前预检 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` core 段 S10 行、`deltas/prd/1-product-requirements/core-01-requirements.md` S10 节、`deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` S10 节、`deltas/prd/3-technical-plan/2-scenario-implementation/core-S10-preflight.md`、`deltas/api/core-01-backend-port.md`、`deltas/database/core-01-local-stores.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（BackendPort v7 / Tauri IPC）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S10-01 | `backend_protocol_info()` 返回 v7 契约版本与 12 项能力清单，且清单已排序唯一并含 `collab` | API delta §2.1、§2.2（`packages/backend-port/src/index.ts:17-20`；`src-tauri/src/protocol.rs:26-55`） | 应用已启动 | 调用 `backend_protocol_info()` | 返回 `{ protocol_version: 7, capabilities: string[] }`；清单满足一致性约束 |
| UT-S10-02 | `getProjectEngine(projectId)` 返回 `DocumentEngineDescriptor`，供预检确认引擎支持的检查面 | API delta §2.4；场景实现 §三 Step 5、§五 | 项目已声明引擎 | 合法 `projectId` | 返回引擎描述符；检查面判定基于该描述符 |
| UT-S10-03 | `project_engine` 命令与 `getProjectEngine` 一致 | API delta §4.9 | 项目已声明引擎 | 调用 `project_engine` | 返回同一引擎描述符，不出现两处口径分歧 |
| UT-S10-04 | `latex_engine::has_tagging_engine` 判定 LaTeX tagged preparation 是否可行 | API delta §4.9；场景实现 §三 Step 10 | LaTeX 项目 | 调用该命令 | 返回布尔；不可行时预检不得假称能执行 tagged preparation |
| UT-S10-05 | `readBuildArtifact(projectId, name)` 对缺失的当前 PDF / 编译日志返回 `null` | API delta §2.4 | 项目未编译或产物缺失 | 读取不存在的产物 | 返回 `null`（对应输入缺失 → 结果 partial，不报错终止） |
| UT-S10-06 | `readCompiledPdf(projectId)` 返回 `ArrayBuffer`，不返回 base64 JSON | API delta §2.3、§2.4 | 存在当前 PDF | 读取 PDF | 返回 `ArrayBuffer`；PDF 以文件 / artifact 通道提供 |
| UT-S10-07 | `list_files` / `read_project_sources` 提供源侧检查所需输入 | API delta §4.5；场景实现 §三 Step 3 | 项目源已保存 | 列出并读取源文件 | 返回源文件内容与清单；读取范围限于项目目录内 |
| UT-S10-08 | `read_app_log` / `append_app_log` 可读取预检所需的编译日志类内容 | API delta §4.11（`read_app_log`、`read_app_log_chunked`、`append_app_log`） | 应用已产生日志 | 读取应用日志 | 返回日志内容；供预检收集编译日志输入 |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| — | 本场景无 DB UNIQUE / CHECK 约束落点 | DB delta §一、§七；场景实现 §二（文件系统 = 源文件、编译日志、当前 PDF） | — | — | **未覆盖，原因**：预检是**只读消费**三类输入（源、编译日志、当前 PDF）的计算过程，发现集合为进程内结果，不落桌面五库任一 SQLite 库（DB delta §一、§七）；可访问性导出变体也是普通文件（场景实现 §三 Step 10）。因此无 UNIQUE / CHECK 约束可测 |

### 1.3 来源分组：业务规则（输入齐备性、分级与能力声明）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S10-09 | 所需输入缺失时结果标记为 **partial**，不得报告完全成功 | 需求 §四 S10「异常：输入缺失」；场景实现 §三 Step 4、§四 F1 | source-only 模式且当前 PDF 缺失 | 运行预检 | 状态为 partial；不出现「全部通过 / 完全成功」的结论 |
| UT-S10-10 | 发现按**严重度**与**确定性**分级，每条附规则 ID、源 / PDF 位置与标准条款 | 需求 §四 S10「正常：完整预检」；场景实现 §三 Step 8 | 源、日志与 PDF 均可用 | 运行全部选中检查 | 每条发现含严重度、确定性、规则 ID、位置（源或 PDF）与标准条款 |
| UT-S10-11 | 不兼容 document class **拒绝** accessible preparation 并说明原因 | 需求 §四 S10「异常：输入缺失」；场景实现 §四 F2 | 使用不兼容 document class | 发起 accessible preparation | preparation 被拒绝并给出不兼容原因；不产出变体文件，也不假称成功 |
| UT-S10-12 | 源中出现未知 package 时只给 **caution**，不判为错误 | 需求 §四 S10「异常：输入缺失」；场景实现 §四 F3 | 源引用未知 package | 运行规范 / 源侧检查 | 该发现为 caution 级；不升级为 error |
| UT-S10-13 | PDF/UA 机器规则共 106 条，是**子集**；未读取的证据不计通过，不构成正式 conformance 声明 | 需求 §四 S10「边界：能力声明」；场景实现 §四 F4 | 运行可访问性检查 | 检查输出与结果摘要 | 未读取 / 未覆盖的证据项**不标记为通过**；输出不含正式 conformance 结论 |
| UT-S10-14 | Markdown 项目不做源规则检查，但 PDF / ATS 等输出检查仍可运行 | 需求 §四 S10「边界：能力声明」；场景实现 §四 F5 | Markdown 项目 | 运行预检 | 源规则类检查不产出源侧发现（且不伪装为通过）；PDF / ATS 输出检查仍执行并产出结果 |
| UT-S10-15 | 未勾选的检查类别不运行，且不补报为通过 | 场景实现 §四 F6 | 只勾选部分检查类别 | 运行预检 | 仅运行所选类别；结果按实际运行类别呈现；未运行类别不以「通过」计入 |
| UT-S10-16 | 六类检查（编译 / 规范 / 可访问性 / 引用 / 隐私 / ATS）可独立或一起运行 | 场景实现 §三 Step 1、§五；需求 §四 S10 主路径 | 项目已存在且源已保存 | 分别只勾选一类 / 全部勾选 | 单类运行只产出该类结果；一起运行产出合并结果集 |
| UT-S10-17 | 投稿 profile 在 arXiv / IEEE / ACM / 期刊 / 学位论文之中，且被传入预检请求 | 场景实现 §三 Step 1、§五 | 项目已存在 | 依次选择五个 profile 运行 | 五个 profile 均可被选择并影响规则判定；不出现无法选择的 profile |
| UT-S10-18 | 预检**不重新拉起**编译引擎，只读取当前编译日志与当前 PDF | 场景实现 §二（引擎进程行）、§三 Step 3 | 项目已编译 | 运行预检 | 不发生新的编译进程；使用当前产物与日志 |

---

## 二、场景测试用例

### 2.1 主路径：投稿前预检

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S10-01 | 完整预检主路径（profile + 六类检查一起运行） | Step 1→9 | 项目源已保存；编译日志与当前 PDF 均可用 | ① 选择投稿 profile（arXiv / IEEE / ACM / 期刊 / 学位论文） → ② 勾选六类检查 → ③ 提交预检 → ④ 阅读结果 | 状态为 complete；发现按严重度与确定性分级呈现，含规则 ID、源 / PDF 位置与标准条款；预检不重新编译 |
| ST-S10-02 | 单类检查独立运行 | Step 1→9 | 同上 | ① 只勾选「引用」类 → ② 运行 → ③ 查看结果 | 只运行所选类别；其余类别不补报为通过 |
| ST-S10-03 | 发现定位与逐条修复 | Step 9→10 | 预检已产出发现 | ① 点击一条含源位置的发现 → ② 修复该问题 → ③ 重新运行预检 | 发现定位到对应源 / PDF 位置；修复后重新运行时该发现消失 |
| ST-S10-04 | compatible 时执行 accessible preparation 并产出变体 | Step 10 | 引擎支持且 document class 兼容 | ① 发起 accessible preparation（LaTeX tagged / Typst PDF/A 与 PDF/UA） → ② 查看产物 | 变体产物落盘并返回 preparation 结果；alt 文本质量、阅读顺序与对比度转人工 / 外部复核，不由机器检查代劳 |

### 2.2 异常路径

> EX 编号与 `core-S10-preflight.md` §四「失败与降级分支」表中的 F 分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-F1 | F1 | 所需输入缺失（如 source-only 模式且当前 PDF 缺失） | S10-AC-02 |
| EX-F2 | F2 | document class 与 accessible preparation 不兼容 | S10-AC-02 |
| EX-F3 | F3 | 源中出现未知 package | S10-AC-02 |
| EX-F4 | F4 | PDF/UA 机器规则共 106 条（子集） | S10-AC-03 |
| EX-F5 | F5 | 项目为 Markdown | S10-AC-03 |
| EX-F6 | F6 | 部分检查类别被单独勾选 | S10-AC-01（结果按实际运行类别呈现） |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S10-05 | 输入缺失时结果标 partial 而非完全成功 | EX-F1 | source-only 模式且当前 PDF 缺失 | 运行预检 | 状态为 partial；界面不显示完全成功；缺失输入被明确指出 |
| ST-S10-06 | 不兼容 document class 拒绝 accessible preparation | EX-F2 | 使用不兼容 document class | 发起 accessible preparation | 被拒绝并说明不兼容原因；不产出变体文件 |
| ST-S10-07 | 未知 package 只给 caution | EX-F3 | 源引用未知 package | 运行规范 / 源侧检查 | 该发现为 caution 级，不判为 error |
| ST-S10-08 | PDF/UA 规则集作为子集，不产生正式 conformance 声明 | EX-F4 | 引擎支持可访问性检查 | 运行可访问性检查并查看结论 | 未读取的证据不计通过；结果中无正式 conformance 声明 |
| ST-S10-09 | Markdown 项目不做源规则检查但输出检查仍可运行 | EX-F5 | Markdown 项目 | 运行预检 | 无源规则发现（且不标记为通过）；PDF / ATS 检查仍执行并产出结果 |
| ST-S10-10 | 仅运行被勾选的检查类别 | EX-F6 | 只勾选部分类别 | 运行预检 | 结果只覆盖被勾选类别；未运行类别不以「通过」呈现 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S10-11 [manual] | alt 文本质量、阅读顺序与对比度的人工 / 外部复核 | Step 11 | 已有带图与表格的 PDF 及其可访问性变体 | 人工（或外部工具）逐项检查 alt 文本、阅读顺序、对比度 | 人工复核并记录结论：机器可查项之外的语义质量不由预检代劳判定（需人工视觉判断，CI 无头环境不可稳定断言） |
| ST-S10-12 [manual] | 预检结果审阅视图的呈现正确性 | Step 9 | 预检已产出多条发现 | 查看严重度、确定性、规则 ID、位置与条款的呈现 | 人工确认分级与信息呈现正确、可定位（视觉核对） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S10-AC-01（正常：完整预检）→ ST-S10-01、ST-S10-02、ST-S10-03、ST-S10-10、UT-S10-10、UT-S10-15、UT-S10-16、UT-S10-17、UT-S10-18
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S10-AC-02（异常：输入缺失）→ ST-S10-05、ST-S10-06、ST-S10-07、UT-S10-09、UT-S10-11、UT-S10-12
  - S10-AC-03（边界：能力声明）→ ST-S10-08、ST-S10-09、UT-S10-13、UT-S10-14
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-F1→ST-S10-05、EX-F2→ST-S10-06、EX-F3→ST-S10-07、EX-F4→ST-S10-08、EX-F5→ST-S10-09、EX-F6→ST-S10-10（6/6 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/core-01-backend-port.md` 是**桌面内部 typed IPC 契约快照**，非 OpenAPI 文档，全文**未使用 `required` 关键字标注字段**；本项按「契约中不可省略的入参 / 返回字段」等价覆盖：`backend_protocol_info`（UT-S10-01）、`getProjectEngine`（UT-S10-02）、`project_engine`（UT-S10-03）、`latex_engine::has_tagging_engine`（UT-S10-04）、`readBuildArtifact`（UT-S10-05）、`readCompiledPdf`（UT-S10-06）、`list_files` / `read_project_sources`（UT-S10-07）、`read_app_log` 系列（UT-S10-08）。
  - **未覆盖（说明原因）**：API delta 未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增字段时须同步补充本节。
- [ ] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - **未覆盖，原因**：预检为只读计算过程，发现集合不落桌面五库任一 SQLite 库（DB delta §一、§七）；本场景无 UNIQUE / CHECK 约束可测。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景为**桌面本地预检功能**（读源 / 日志 / PDF，输出发现与变体文件），不涉及部署产物或服务端；部署与 smoke 方案归属 `delivery` 模块，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S10-AC-01 | **正常：完整预检** — GIVEN 源、日志与当前 PDF 均可用 / WHEN 运行所选检查 / THEN 发现按严重度与确定性分级呈现，含规则 ID 与源/PDF 位置 | ST-S10-01, ST-S10-02, ST-S10-03, ST-S10-10, UT-S10-10, UT-S10-15, UT-S10-16, UT-S10-17, UT-S10-18 |
| S10-AC-02 | **异常：输入缺失** — GIVEN 所需输入缺失（如 source-only 模式且当前 PDF 缺失）/ WHEN 运行 / THEN 结果标 partial，不得报告完全成功；不兼容 document class 拒绝 accessible preparation，未知 package 只给 caution | ST-S10-05, ST-S10-06, ST-S10-07, UT-S10-09, UT-S10-11, UT-S10-12 |
| S10-AC-03 | **边界：能力声明** — 106 条 PDF/UA 机器规则是子集，未读取的证据不计通过，不构成正式 conformance 声明；Markdown 项目不做源规则检查，但 PDF/ATS 等输出检查仍可运行 | ST-S10-08, ST-S10-09, UT-S10-13, UT-S10-14 |

> 追溯说明：`S10-AC-01` ~ `S10-AC-03` 按 `deltas/prd/1-product-requirements/core-01-requirements.md` §四 S10 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
