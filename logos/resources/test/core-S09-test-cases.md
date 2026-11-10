## S09 PDF 预览与源文核对演示 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` core 段 S09 行（含偏差 D3）与「编译主链路」段、`deltas/prd/1-product-requirements/core-01-requirements.md` S09 节、`deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` S09 节、`deltas/prd/3-technical-plan/2-scenario-implementation/core-S09-pdf-preview-synctex.md`、`deltas/api/core-01-backend-port.md`、`deltas/database/core-01-local-stores.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（CompilePort.syncTex / SyncTeX IPC / PDF 读取）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S09-01 | `SyncTexIndex.forward(file, line)` 返回源码行对应的 PDF 位置 | API delta §3.3（`packages/compile-port/src/port.ts:11-31`） | 已建立 SyncTeX 索引 | `(file, line)` | 返回该源码位置对应的 PDF 位置；无映射时返回空态而非抛错 |
| UT-S09-02 | `SyncTexIndex.inverse(page, x, y)` 返回 PDF 位置对应的源码位置 | API delta §3.3 | 已建立 SyncTeX 索引 | `(page, x, y)` | 返回对应源码位置；无映射时返回空态 |
| UT-S09-03 | `SyncTexIndex.dispose()` 释放索引资源 | API delta §3.3 | 索引已建立 | 调用 `dispose()` | 资源被释放；释放后再次使用索引不再返回有效映射 |
| UT-S09-04 | `CompilePort.syncTex(output)` 在无法建立索引时返回 `null` | API delta §3.2 | 编译输出中无 SyncTeX 数据 | 调用 `syncTex(output)` | 返回 `null`；调用方据此隐藏同步控件而非报错 |
| UT-S09-05 | `synctex_forward` / `synctex_inverse` / `synctex_map_line`（LaTeX 引擎）三个 IPC 命令可用 | API delta §4.4 | LaTeX 项目已编译且 SyncTeX 可用 | 逐一调用 | 命令存在并返回可识别的映射 / 空态结果 |
| UT-S09-06 | `typst_sync_forward` / `typst_sync_inverse` / `typst_sync_stop`（Typst 引擎）三个 IPC 命令可用 | API delta §4.4 | Typst 0.13+ 项目已编译 | 逐一调用 | 命令存在并返回可识别的映射 / 空态结果 |
| UT-S09-07 | `readCompiledPdf(projectId)` 返回 `ArrayBuffer`（PDF 不走 base64 JSON） | API delta §2.3、§2.4；inventory.md「编译主链路」 | 存在 PDF artifact | 读取 PDF | 返回 `ArrayBuffer`；不是 base64 JSON 字符串 |
| UT-S09-08 | `validateCompileFingerprint(projectId, mainDoc)` 能识别源码已变化的过期编译结果 | API delta §2.4；inventory.md S09 行「旧 revision 结果拒绝（stale）」 | 已有编译结果 | 源码修改后再调用 | 指纹校验判为不匹配，供 stale 判定使用 |
| UT-S09-09 | `readBuildArtifact(projectId, name)` 对不存在的产物返回 `null` | API delta §2.4 | 项目已编译 | 不存在的产物名 | 返回 `null` |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| — | 本场景无 DB UNIQUE / CHECK 约束落点 | DB delta §一、§七；场景实现 §二（文件系统 = PDF 文件、SyncTeX 索引文件） | — | — | **未覆盖，原因**：预览状态、stale 判定与 best-effort 指纹验证均为**进程内状态**，PDF 与 SyncTeX 索引以**普通文件**形式存在；桌面五库（`library.db` / `catalog.sqlite3` / `tasks.sqlite3` / `literature-cache.sqlite3` / `sessions.sqlite`）均不承载预览状态或 PDF 索引（DB delta §一、§七）。与检查点相关的 `catalog.sqlite3` 落点在 **S12**，不在本场景范围 |

### 1.3 来源分组：业务规则（stale 判定、失败编译 PDF 保留、同步控件可见性）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S09-10 | 旧 revision 的编译结果被拒绝接受并标为 stale | 需求 §四 S09「异常：过期编译结果」；场景实现 §三 Step 3、§四 F1 | 已有 revision R 的结果，源码已变更为 R' | 请求 R 的结果 | 返回 stale 标记；**不被当作当前输出**；不覆盖当前 PDF |
| UT-S09-11 | 失败编译且**无新 PDF** 时保留旧文件 | 需求 §四 S09「边界：失败编译的 PDF 保留」；场景实现 §四 F2 路径① | 此前有一次成功编译的 PDF | 一次失败编译后刷新预览 | 预览仍显示**旧文件**；状态与「最后成功检查点」一致 |
| UT-S09-12 | 失败编译但存在**经指纹验证的 best-effort PDF** 时显示新文件、保持 error 状态 | 场景实现 §三 Step 4、§四 F2 路径② | 失败编译产出 best-effort PDF 且指纹验证通过 | 刷新预览 | 显示**新文件**；编译状态**保持 error**；不伪装成成功 |
| UT-S09-13 | best-effort PDF **不更新最后成功检查点** | 场景实现 §四 F6、§五；需求 §四 S09 边界 | 存在最后成功检查点 | 失败编译产出 best-effort PDF 后查看检查点时间线 | 最后成功检查点仍指向上一次成功编译的版本；不被 best-effort 结果推进 |
| UT-S09-14 | Typst 版本过旧（< 0.13）时隐藏同步控件 | 需求 §四 S09「边界：引擎/文档限制」；场景实现 §四 F3 | 使用 Typst < 0.13 | 打开预览 | 同步控件**隐藏**；不展示不可用的跳转入口 |
| UT-S09-15 | Markdown 项目隐藏同步控件 | 需求 §四 S09「边界：引擎/文档限制」；场景实现 §四 F3 | Markdown 项目 | 打开预览 | 同步控件隐藏 |
| UT-S09-16 | 仅**选择 PDF 文本**不触发跳转 | 场景实现 §四 F4 | PDF 已打开 | 选中文本（不做位置点击） | 不发起 syncTex 请求；不发生位置跳转 |
| UT-S09-17 | 加密 PDF 要求输入密码后才能打开 | 场景实现 §四 F5；需求 §四 S09 边界 | PDF 已加密 | 打开预览 | 先要求密码；未提供密码不渲染内容 |
| UT-S09-18 | PDF 以文件形式提供，不走 base64 JSON | inventory.md「编译主链路」；场景实现 §二、§五 | 存在 PDF | 走 artifact 读取通道 | 传输形态为文件 / `ArrayBuffer`，不是 base64 JSON 字符串 |

---

## 二、场景测试用例

### 2.1 主路径：PDF 预览与源文核对演示

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S09-01 | 并排 / 独立 PDF 预览与浏览操作 | Step 1、5→6 | 项目已至少成功编译过一次，存在 PDF artifact | ① 打开并排或独立 PDF 预览 → ② 读取当前编译结果（含 revision、产物路径、状态） → ③ 翻页、缩放、搜索、目录、旋转 / 反色 | 页面与文本层正常渲染；浏览操作生效；PDF 以文件形式提供（不走 base64 JSON）；当前结果 revision 与源码状态一致 |
| ST-S09-02 | PDF → 源码正向定位（LaTeX SyncTeX） | Step 7 | LaTeX 项目编译成功且 SyncTeX 可用 | ① 在 PDF 上点击某处 → ② 发起 syncTex 正向请求 → ③ 查看源码 | 光标跳转到对应源码行；映射由 SyncTeX 引擎提供 |
| ST-S09-03 | 源码 → PDF 反向定位（LaTeX SyncTeX） | Step 8 | LaTeX 项目编译成功且 SyncTeX 可用 | ① 在源码某行触发反向定位 → ② 查看 PDF | PDF 跳转到对应位置 |
| ST-S09-04 | Typst 0.13+ 经 Tinymist 的等价双向定位 | Step 7→8 | Typst ≥ 0.13 项目编译成功 | ① PDF 点击某处 → ② 源码某行反向触发 | 正反向定位均成立，行为与 SyncTeX 路线等价 |
| ST-S09-05 | 演示模式与 PDF 下载 | Step 9→10 | PDF 已打开 | ① 进入演示模式并选择从头 / 当前页开始 → ② 查看演讲者信息 → ③ 下载当前 PDF | 演示按所选起点开始；演讲者信息可见；下载得到当前 PDF 文件 |

### 2.2 异常路径

> EX 编号与 `core-S09-pdf-preview-synctex.md` §四「失败与降级分支」表中的 F 分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-F1 | F1 | 源码已变化，旧 revision 的 PDF 结果返回 | S09-AC-02 |
| EX-F2 | F2 | 编译失败后刷新预览（两种子路径） | S09-AC-03 |
| EX-F3 | F3 | Typst 版本过旧（<0.13）或项目为 Markdown | S09-AC-04 |
| EX-F4 | F4 | 用户只是选择 PDF 文本 | S09-AC-04 |
| EX-F5 | F5 | PDF 已加密 | S09-AC-04 |
| EX-F6 | F6 | 编译处于 error 状态且存在 best-effort PDF | S09-AC-03 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S09-06 | 过期 revision 的 PDF 结果被拒绝并显示 stale | EX-F1 | 已有 revision R 的结果；源码已变更 | 请求 R 的结果 | 显示 stale；不把旧结果当作当前输出；当前视图不被旧 PDF 覆盖 |
| ST-S09-07 | 失败编译且无新 PDF 时预览保留旧文件 | EX-F2 路径① | 此前有成功编译的 PDF | 一次失败编译后刷新预览 | 仍显示旧 PDF；不显示半成品新文件；状态与最后成功检查点一致 |
| ST-S09-08 | 失败编译但有经指纹验证的 best-effort PDF 时显示新文件并保持 error | EX-F2 路径② / EX-F6 | 失败编译产出 best-effort PDF 且指纹验证通过 | 刷新预览 | 显示新文件；状态保持 error；**最后成功检查点不被更新** |
| ST-S09-09 | Typst 过旧或 Markdown 项目隐藏同步控件 | EX-F3 | Typst < 0.13 或 Markdown 项目 | 打开预览 | 同步控件隐藏；不提供不可用的跳转入口 |
| ST-S09-10 | 选择 PDF 文本不触发跳转 | EX-F4 | PDF 已打开 | 仅选中文本 | 不发起定位请求；不发生跳转 |
| ST-S09-11 | 加密 PDF 要求密码 | EX-F5 | PDF 已加密 | 打开预览 | 先要求输入密码；未提供密码不渲染内容 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S09-12 [manual] | PDF 渲染质量与双向跳转的视觉正确性 | Step 5→8 | LaTeX 项目编译成功且 SyncTeX 可用 | 打开预览并在 PDF 上点击某处，观察源码光标位置；再在源码某行反向触发，观察 PDF 位置 | 人工确认跳转落点与页面渲染正确（视觉核对，CI 无头环境不可稳定断言） |
| ST-S09-13 [manual] | 演示模式全屏呈现与演讲者信息显示 | Step 9 | PDF 已打开且项目含演示信息 | 进入演示模式并从头开始 | 人工确认全屏演示呈现、演讲者信息可见（视觉核对） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S09-AC-01（正常：双向跳转）→ ST-S09-01、ST-S09-02、ST-S09-03、ST-S09-04、ST-S09-05、UT-S09-01、UT-S09-02、UT-S09-04
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S09-AC-02（异常：过期编译结果）→ ST-S09-06、UT-S09-08、UT-S09-10
  - S09-AC-03（边界：失败编译的 PDF 保留）→ ST-S09-07、ST-S09-08、UT-S09-11、UT-S09-12、UT-S09-13
  - S09-AC-04（边界：引擎 / 文档限制）→ ST-S09-09、ST-S09-10、ST-S09-11、UT-S09-14、UT-S09-15、UT-S09-16、UT-S09-17
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-F1→ST-S09-06、EX-F2→ST-S09-07 / ST-S09-08、EX-F3→ST-S09-09、EX-F4→ST-S09-10、EX-F5→ST-S09-11、EX-F6→ST-S09-08（6/6 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/core-01-backend-port.md` 是**桌面内部 typed IPC 契约快照**，非 OpenAPI 文档，全文**未使用 `required` 关键字标注字段**；本项按「契约中不可省略的入参 / 返回字段」等价覆盖：`SyncTexIndex.forward/inverse/dispose`（UT-S09-01 ~ UT-S09-03）、`CompilePort.syncTex`（UT-S09-04）、`synctex_*` 三个命令（UT-S09-05）、`typst_sync_*` 三个命令（UT-S09-06）、`readCompiledPdf`（UT-S09-07）、`validateCompileFingerprint`（UT-S09-08）、`readBuildArtifact`（UT-S09-09）。
  - **未覆盖（说明原因）**：API delta 未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增字段时须同步补充本节。
- [ ] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - **未覆盖，原因**：预览状态与 stale 判定是**进程内状态**，PDF 与 SyncTeX 索引是**普通文件**；桌面五库均不承载本场景数据（DB delta §一、§七）。检查点相关的 `catalog.sqlite3` 落点在 **S12**，已在 `core-S12-test-cases.md` 登记。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景为**桌面本地预览功能**（PDF.js 渲染 + SyncTeX/Tinymist），不涉及部署产物或服务端；部署与 smoke 方案归属 `delivery` 模块，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S09-AC-01 | **正常：双向跳转** — GIVEN LaTeX 项目编译成功（SyncTeX 可用）/ WHEN 在 PDF 点击某处 / 在源码某行触发反向 / THEN 分别跳转到对应源码行 / PDF 位置；Typst 0.13+ 经 Tinymist 等价支持 | ST-S09-01, ST-S09-02, ST-S09-03, ST-S09-04, ST-S09-05, UT-S09-01, UT-S09-02, UT-S09-04, UT-S09-05, UT-S09-06 |
| S09-AC-02 | **异常：过期编译结果** — GIVEN 源码已变化，旧 revision 的 PDF 结果返回 / WHEN 预览请求该结果 / THEN 拒绝接受并显示 stale，不把旧结果当作当前输出 | ST-S09-06, UT-S09-08, UT-S09-10 |
| S09-AC-03 | **边界：失败编译的 PDF 保留** — GIVEN 编译失败 / WHEN 预览刷新 / THEN 区分两种情况：无新 PDF 时保留旧文件；有经指纹验证的 best-effort PDF 时显示新文件、保持 error 状态且不更新最后成功检查点 | ST-S09-07, ST-S09-08, UT-S09-11, UT-S09-12, UT-S09-13 |
| S09-AC-04 | **边界：引擎 / 文档限制** — Typst 过旧或 Markdown 项目隐藏同步控件；选择 PDF 文本不触发跳转；加密 PDF 要求密码 | ST-S09-09, ST-S09-10, ST-S09-11, UT-S09-14, UT-S09-15, UT-S09-16, UT-S09-17 |

> 追溯说明：`S09-AC-01` ~ `S09-AC-04` 按 `deltas/prd/1-product-requirements/core-01-requirements.md` §四 S09 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
