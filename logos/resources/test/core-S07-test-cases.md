## S07 编译引擎选择与工具链修复 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` core 段 S07 行与「编译主链路」段、`deltas/prd/1-product-requirements/core-01-requirements.md` S07 节、`deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` S07 节、`deltas/prd/3-technical-plan/2-scenario-implementation/core-S07-compile-engines.md`、`deltas/api/core-01-backend-port.md`、`deltas/database/core-01-local-stores.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（CompilePort / BackendPort v7 / Tauri IPC）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S07-01 | `CompilePort.supports(target)` 为纯查询，无副作用 | API delta §3.2（`packages/compile-port/src/port.ts:33-45`） | 编译端口已装配 | 任一 `CompileTarget` | 返回布尔；不启动引擎进程、不产生产物 |
| UT-S07-02 | `CompileTarget` 三元组的字段约束：`mainDocument`、`engine` 必填，`texFlavor` 可空 | API delta §3.3（`packages/compile-port/src/port.ts:11-31`） | 构造编译目标 | `texFlavor = null` 与 `texFlavor = "..."` 两种输入 | 两种输入都被接受并按字段语义处理；缺 `mainDocument` / `engine` 时不被接受 |
| UT-S07-03 | `CompileOutput` 结构完整：`target`、`ok`、`pdf`、`synctex`、`log`、`diagnostics`、`timeMs` | API delta §3.3（`packages/compile-port/src/port.ts:11-31`） | 一次编译已完成 | 读取编译输出 | 返回结构含上述全部字段；`pdf` / `synctex` 可为 `null` 而不缺失键 |
| UT-S07-04 | `CompilePort.compile(target)` 被中断时抛 `CompileStopped` | API delta §3.2（`packages/compile-port/src/port.ts:40-45`） | 编译进行中 | 调用 `stop()` 后等待 `compile` 结束 | `compile` 以 `CompileStopped` 结束；不返回「成功的半成品输出」 |
| UT-S07-05 | `CompilePort.syncTex(output)` 无法建立索引时返回 `null` | API delta §3.2（`packages/compile-port/src/port.ts:33-38`） | 一次编译输出中无 SyncTeX 数据 | 调用 `syncTex(output)` | 返回 `null`；不抛未处理异常 |
| UT-S07-06 | `compileProject(projectId, mainDoc, offline?, fast?, haltOnError?, typstVariant?)` 的可选参数均可省略 | API delta §2.4（`packages/backend-port/src/index.ts:1419-1470`） | 项目已存在且源已保存 | 仅传 `projectId` 与 `mainDoc` | 编译按默认行为执行；可选参数缺省不报错 |
| UT-S07-07 | `cancelCompile()` 返回布尔表示是否取消成功 | API delta §2.4 | 编译进行中 | 调用 `cancelCompile()` | 返回布尔；取消后编译以停止态结束，不静默产出半成品结果 |
| UT-S07-08 | `readCompiledPdf(projectId)` / `readIsolatedPdf(projectId)` 返回 `ArrayBuffer`，**不走 base64 JSON** | API delta §2.3、§2.4；inventory.md「编译主链路」 | 已有编译产物 | 读取 PDF | 返回 `ArrayBuffer`；传输形态不是 base64 JSON 字符串 |
| UT-S07-09 | `readBuildArtifact(projectId, name)` 对不存在的产物返回 `null` | API delta §2.4 | 项目已编译 | 不存在的产物名 | 返回 `null`；不抛错 |
| UT-S07-10 | `validateCompileFingerprint(projectId, mainDoc)` 能区分当前与过期编译指纹 | API delta §2.4；inventory.md「编译主链路」 | 项目已编译 | 源已修改后再调用 | 过期指纹被判定为不匹配（供 S09 的 stale 判定复用） |
| UT-S07-11 | `getProjectEngine(projectId)` 返回的 `DocumentEngineDescriptor` 是引擎能力的唯一事实源 | API delta §2.4；需求 §5.1；场景实现 §五 | 项目已声明引擎 | 调用 `getProjectEngine` | 返回描述符；UI 呈现的可用引擎集合由该描述符决定，而非硬编码全集 |
| UT-S07-12 | `project_engine` / `latex_engine_info` 返回引擎与工具链信息 | API delta §4.9（`project_engine`、`latex_engine_info`、`latex_engine::tinytex_install_state`） | 应用已启动 | 调用两个命令 | 返回引擎描述符与工具链信息；纯查询无副作用 |
| UT-S07-13 | `latex_engine::has_tagging_engine` 判定 LaTeX 侧是否具备 tagging 能力 | API delta §4.9 | 应用已启动 | 调用该命令 | 返回布尔；用于决定 LaTeX tagged preparation 可行性（S10 承接） |
| UT-S07-14 | 工具链修复类命令的可达性：`tex_distributions`、`set_tex_distribution`、`set_custom_tex_folder`、`latex_engine::install_tinytex`、`latex_engine::packages::tlmgr_search/tlmgr_install_missing/tlmgr_installed` | API delta §4.9 | 应用已启动 | 逐一调用 / 核对注册表 | 命令在 IPC 注册表中存在且可调用；安装类命令返回可识别的进行中 / 成功 / 失败状态 |
| UT-S07-15 | `has_pandoc` / `download_pandoc` 提供 Pandoc 可用性与获取通道 | API delta §4.9 | 应用已启动 | 调用两个命令 | `has_pandoc` 返回布尔；`download_pandoc` 走受管下载通道（下载 pin + SHA-256 + 原子安装，inventory.md 信任边界） |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| — | 本场景无 DB UNIQUE / CHECK 约束落点 | DB delta §一、§七；场景实现 §二（文件系统 = `project.json`、PDF artifact、构建缓存 / 输出目录、shell escape 信任记录） | — | — | **未覆盖，原因**：编译设置持久化在**普通文件 `project.json`**，产物是 PDF 文件与构建目录；桌面五库（`library.db` / `catalog.sqlite3` / `tasks.sqlite3` / `literature-cache.sqlite3` / `sessions.sqlite`）均不承载编译设置、产物索引或信任记录（DB delta §一、§七）。唯一与编译相关的库是 `catalog.sqlite3`，但其落点是 **S12 的检查点**，不在本场景范围 |

### 1.3 来源分组：业务规则（引擎选择、依赖预检、镜像回退与信任边界）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S07-16 | 可移植编译设置写入 `project.json`，保证可复现 | 需求 §四 S07「正常：引擎编译」；场景实现 §三 Step 2、§五 | 项目已打开 | 修改引擎 / 编译设置 | `project.json` 更新且含该设置；同一设置在新位置重新编译行为一致 |
| UT-S07-17 | latexmk 路线缺 TeX / latexmk / Biber 时**启动前停止**并给具体修复指引 | 需求 §四 S07「异常：latexmk 依赖缺失」；场景实现 §四 F1 | 环境中缺 TeX / latexmk / Biber 之一 | 触发 latexmk 编译 | 引擎进程**未被拉起**；返回具体修复指引；不伪装成一般编译失败 |
| UT-S07-18 | Tectonic 配置镜像不可用时改试上游并记录 | 需求 §四 S07「异常：Tectonic 镜像失败」；场景实现 §四 F2 | 配置镜像不可用 | 触发需要下载包的 Tectonic 编译 | 改走上游并留下记录（不静默失败，也不静默换源不记录） |
| UT-S07-19 | Tectonic 离线且缺缓存文件时给出具体消息（指明缺哪个缓存文件） | 场景实现 §四 F3 | 离线且本地缓存缺失 | 触发 Tectonic 编译 | 消息具体到缺失的缓存文件；不显示通用失败文案 |
| UT-S07-20 | shell escape 信任按**目录 + 机器**授予，不随 `project.json` 迁移 | 需求 §四 S07「边界：shell escape 信任」；场景实现 §四 F4、§五 | 已在目录 D 授予信任 | 把 `project.json` 复制到新目录 D' | D' 处信任为**未授予**；需重新授予 |
| UT-S07-21 | shell escape 信任不随 ZIP / Git 迁移 | 场景实现 §四 F4 | 已在目录 D 授予信任 | 通过 ZIP 或 Git 把项目移到 D' | D' 处信任为未授予 |
| UT-S07-22 | 编译产物 PDF 记录输出身份与本地构建 provenance | 场景实现 §三 Step 10、§五 | 编译成功 | 检查产物元数据 | PDF 附带可识别的输出身份与构建 provenance |
| UT-S07-23 | 规范化日志与源位置诊断同时产出 | 需求 §四 S07「正常：引擎编译」；场景实现 §三 Step 10 | 源中存在可定位错误 | 触发编译 | 返回规范化日志 + 带源位置的诊断（而非原始引擎输出直出） |
| UT-S07-24 | 编译只针对**已保存的源** | 场景实现 §一 前置条件 | 编辑器有未保存改动 | 触发编译 | 编译使用磁盘上已保存的版本，不编译未落盘的缓冲内容 |
| UT-S07-25 | 编译被用户中止时不静默产出半成品结果 | 场景实现 §四 F5 | 编译进行中 | 调用 `stop()` | 结果为停止态；不出现「成功但产物不完整」的返回 |

---

## 二、场景测试用例

### 2.1 主路径：编译引擎选择与工具链修复

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S07-01 | 引擎选择与设置持久化 | Step 1→3 | 项目已存在且声明引擎；源已保存 | ① 在编译入口选择引擎（Tectonic / latexmk / Typst / Markdown(Pandoc)）与编译设置 → ② 设置被写入 `project.json` → ③ 查询 `supports` 能力并核对 UI 呈现的可选引擎 | 可移植设置持久化于 `project.json`；引擎列表与引擎描述符一致；能力查询为纯查询无副作用 |
| ST-S07-02 | 完整编译主路径（PDF + 规范化日志 + 源位置诊断） | Step 4→12 | 工具链齐备；源已保存 | ① 触发编译 → ② Rust 读取 engine descriptor 并建立项目索引 → ③ 沙箱拉起引擎进程 → ④ 引擎写出 PDF 与原始日志 → ⑤ 规范化日志并生成源位置诊断 → ⑥ 查看结果 | 产出 PDF、规范化日志与源位置诊断三件套；PDF 带输出身份 / provenance；PDF 以文件 / artifact 通道返回，**不走 base64 JSON**；UI 呈现日志与诊断 |
| ST-S07-03 | 依赖缺失时按提示修复并重试 | Step 12 | 环境缺依赖 | ① 触发编译得到修复指引 → ② 按指引安装 / 切换 TeX 发行版、TinyTeX、Typst 或依赖 → ③ 重新触发编译 | 修复指引具体可执行；修复后编译成功并产出三件套；修复过程可观测（安装状态可查） |

### 2.2 异常路径

> EX 编号与 `core-S07-compile-engines.md` §四「失败与降级分支」表中的 F 分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-F1 | F1 | latexmk 但 TeX / latexmk / Biber 缺失 | S07-AC-02 |
| EX-F2 | F2 | Tectonic 配置镜像不可用 | S07-AC-03 |
| EX-F3 | F3 | Tectonic 离线且缺缓存文件 | S07-AC-03 |
| EX-F4 | F4 | 项目经 `project.json` / ZIP / Git 迁移到新位置 | S07-AC-04 |
| EX-F5 | F5 | 编译被用户中止 | S07-AC-01（不静默产出半成品结果） |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S07-04 | latexmk 依赖缺失时启动前停止并给出修复指引 | EX-F1 | 环境缺 TeX / latexmk / Biber 之一 | 选择 latexmk 并触发编译 | 引擎进程未被拉起；返回具体修复指引（指明缺哪个依赖、如何安装 / 切换）；不显示为一般编译失败 |
| ST-S07-05 | Tectonic 镜像不可用时改试上游并记录 | EX-F2 | 配置镜像不可用 | 触发需要下载包的 Tectonic 编译 | 编译改走上游完成或给出上游结果；改试行为被记录，可在日志 / 诊断中看到 |
| ST-S07-06 | Tectonic 离线且缺缓存时给出具体消息 | EX-F3 | 离线且缓存缺失 | 触发 Tectonic 编译 | 消息具体到缺失的缓存文件；不伪装成普通失败 |
| ST-S07-07 | 项目迁移后 shell escape 信任不随行 | EX-F4 | 已在原目录授予 shell escape 信任 | 把项目（含 `project.json`）迁到新位置并编译 | 新位置信任为未授予，需重新授予；不自动继承旧位置的信任 |
| ST-S07-08 | 编译中止后不产出半成品结果 | EX-F5 | 编译进行中 | 用户中止编译 | 编译以停止态结束；不出现「成功」状态与不完整产物 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S07-09 [manual] | 规范化日志与源位置诊断在编辑器中的呈现效果 | Step 12 | 源中存在可定位错误 | 编译后查看日志与诊断并点击诊断定位 | 人工确认诊断定位到正确源位置、日志可读（视觉核对，CI 无头环境不可稳定断言） |
| ST-S07-10 [manual] | 依赖安装 / 切换指引在实际机器上的可执行性 | Step 12 | 缺 TeX 或 TinyTeX | 按界面指引执行安装 / 切换 | 人工确认真实机器上指引可照做并使编译恢复（跨进程安装流程，CI 无头环境不可稳定断言） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S07-AC-01（正常：引擎编译）→ ST-S07-01、ST-S07-02、ST-S07-08、UT-S07-03、UT-S07-06、UT-S07-16、UT-S07-23
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S07-AC-02（异常：latexmk 依赖缺失）→ ST-S07-04、UT-S07-17
  - S07-AC-03（异常：Tectonic 镜像失败）→ ST-S07-05、ST-S07-06、UT-S07-18、UT-S07-19
  - S07-AC-04（边界：shell escape 信任）→ ST-S07-07、UT-S07-20、UT-S07-21
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-F1→ST-S07-04、EX-F2→ST-S07-05、EX-F3→ST-S07-06、EX-F4→ST-S07-07、EX-F5→ST-S07-08（5/5 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/core-01-backend-port.md` 是**桌面内部 typed IPC 契约快照**，非 OpenAPI 文档，全文**未使用 `required` 关键字标注字段**；本项按「契约中不可省略的入参 / 不可省略的返回字段」等价覆盖：`supports` / `compile` / `stop` / `syncTex`（UT-S07-01、UT-S07-04、UT-S07-05）、`CompileTarget` 三元组（UT-S07-02）、`CompileOutput` 全部字段（UT-S07-03）、`compileProject` / `cancelCompile`（UT-S07-06、UT-S07-07）、`readCompiledPdf` / `readIsolatedPdf` / `readBuildArtifact`（UT-S07-08、UT-S07-09）、`validateCompileFingerprint`（UT-S07-10）、`getProjectEngine`（UT-S07-11）、引擎与工具链命令群（UT-S07-12 ~ UT-S07-15）。
  - **未覆盖（说明原因）**：API delta 未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增字段时须同步补充本节。
- [ ] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - **未覆盖，原因**：编译设置落 `project.json`（普通文件），产物落 PDF 文件与构建目录；桌面五库均不承载编译数据（DB delta §一、§七）。唯一与编译相关的 `catalog.sqlite3`（`checkpoints` 表记录 `engine` / `toolchain_identity` / `output_hash`）落点是 **S12 检查点**，已在 `core-S12-test-cases.md` 登记，本文件不重复登记以免越界。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景为**桌面本地编译功能**，引擎与工具链是用户机器上的第三方依赖，不涉及本项目的部署产物或服务端；部署与 smoke 方案归属 `delivery` 模块，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S07-AC-01 | **正常：引擎编译** — GIVEN 项目声明引擎且工具链可用 / WHEN 触发编译 / THEN 产出 PDF、规范化日志与源位置诊断；编译设置持久化于 `project.json` 保证可复现 | ST-S07-01, ST-S07-02, ST-S07-08, UT-S07-03, UT-S07-06, UT-S07-16, UT-S07-22, UT-S07-23, UT-S07-24 |
| S07-AC-02 | **异常：latexmk 依赖缺失** — GIVEN 选择 latexmk 但 TeX/latexmk/Biber 缺失 / WHEN 编译 / THEN 启动前停止并给出具体修复指引，不伪装成一般编译失败 | ST-S07-04, UT-S07-17 |
| S07-AC-03 | **异常：Tectonic 镜像失败** — GIVEN 配置镜像不可用 / WHEN 编译需要下载包 / THEN 改试上游并记录；离线且缺缓存文件时给出具体消息 | ST-S07-05, ST-S07-06, UT-S07-18, UT-S07-19 |
| S07-AC-04 | **边界：shell escape 信任** — GIVEN 项目在某目录/机器上被授予 shell escape 信任 / WHEN 项目经 `project.json`、ZIP 或 Git 迁移到新位置 / THEN 信任不随迁移，需在新位置重新授予 | ST-S07-07, UT-S07-20, UT-S07-21 |

> 追溯说明：`S07-AC-01` ~ `S07-AC-04` 按 `deltas/prd/1-product-requirements/core-01-requirements.md` §四 S07 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
