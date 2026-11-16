# 变更提案：fix-doc-deviations

> module: core | created: 2026-11-15

## 变更原因

`add-baseline-docs` 基线盘点（已归档，`logos/changes/archive/20261110-1946-add-baseline-docs/`）确认了 12 处用户文档与实现不一致的偏差（D1–D12，登记于该提案 `inventory.md`「文档/实现偏差清单」）。基线规格一律按实现记录并标注「文档回补另立变更」；`verify-exception.md` 将 D1–D12 的文档回补列为遗留事项。本提案执行该回补：把用户文档对齐实现，并同步更新基线规格中的偏差标注状态。

## 最小实现论证

> S35/S09：本段**不进 canonical 必填章节**——缺段、未填、占位残留三者均不触发任何检查。
> 它是自律提示，作用在设计发生**之前**；事后的规模信号由 change-lint 的观测 warning 承担。

- 先检索既有机制：偏差清单本身就是 `add-baseline-docs` 的 inventory 产出，12 条逐条给出文档位置、实现位置与证据；回补动作不存在「另建机制」问题，只是把文档改成清单里已核实的实现口径。基线规格中的标注（「文档待回补」「见偏差 Dx」）也是现成索引，grep 可全量定位。
- 为什么不能更小：D1–D12 每条都是独立的文档语义错误（数量、语义、行为概括），单独回补任何子集都会让基线标注出现「部分回补」的混合状态，反而增加第二批变更的核对成本；一次闭环后基线标注可统一转为终态。也无法更大：不修复任何行为（基线以实现为准的原则不变），不触碰代码逻辑，仅文档与规格标注。
- 本提案主动砍掉的：
  - 不改任何源代码行为（含 D4 的 UI——入口已存在，无需新增）；
  - 不处理 269 处 Rust 证据指针的路径前缀规范化（风格问题，另行评估）；
  - 不处理 S41 app marker 称谓差异（`X-Oleafly-Requested-With` vs `x-requested-with`，属 API 文档措辞，非 D1–D12 范围）；
  - 不更新 `verify/acceptance-report.md`（verify 历史产物，记录当期状态，不回写）。

## 变更类型

代码级修复（纯文档对齐：修改 `docs/` 用户文档与 `README.md`，不产出行为变更；基线规格标注以 delta 更新）

## 变更范围

**用户文档（[code] 段直接修改，11 份文件 / 12 条偏差）**：

| 文档 | 偏差 | 回补内容 |
|---|---|---|
| `docs/ProjectLibrary.md` | D1 | 引擎筛选补 Quarto/Calepin（五种） |
| `docs/Export.md` | D2 | 导出目标语义改为「绝对路径、父目录必须存在，目标文件可不存在」 |
| `docs/PDFPreview.md` | D3 | 失败编译的 PDF 保留区分两种路径（无新 PDF 保留旧文件 / 指纹验证的 best-effort PDF 显示新文件且保持 error） |
| `docs/Citations.md` | D4 | 补 EndNote XML / RIS / BibTeX 文件导入说明（UI 入口已确认：`FileReferencesDialog.tsx` + `references.json` i18n 文案） |
| `docs/Editor.md` | D5 | 补非英语校对行为（仅 Hunspell，grammar-only 返回 unsupported） |
| `docs/Editor.md` | D6 | 核对 "Deferred, not planned for 0.4.1" 条目（调查结论：通用 toast 静音确认未实现，文档表述准确，预期无需改动；如有措辞失准按现状微调） |
| `docs/AICopilot.md` | D7, D10 | 内置 agent 数量 14 → 15；blocked 拆两类语义 |
| `docs/ai-model-catalog.md` | D10 | blocked 拆两类：catalog blocked 一律拒绝；probe blocked 可无工具 plain chat（有 Check again 出口） |
| `docs/mcp.md` | D8 | renderer 断开后仅保留 6 个只读工具，写能力不可用 |
| `docs/Skills.md` | D9 | Research 单 run 默认时长 30 分钟 → 60 分钟 |
| `docs/development.md` | D11 | 移除 "no standalone package yet"，改为 `release-cli.yml` 现状 |
| `README.md` | D12 | 离线冲突语义改为「重叠文本 Loro 自动合并 + 只读 Merge Review，并非一切变更先询问」 |

**基线规格（[delta] 段，19 份标注更新）**：

- 影响的需求文档：`core-01-requirements.md`（D1/D3/D5）、`research-01-requirements.md`（D4）、`ai-01-requirements.md`（D7/D8/D9/D10）、`collab-01-requirements.md`（D12）、`delivery-01-requirements.md`（D11）
- 影响的功能规格：`core-01-feature-specs.md`（D1/D3/D5）、`research-01-feature-specs.md`（D4）、`ai-01-feature-specs.md`（D7/D8/D9/D10）、`collab-01-feature-specs.md`（D12）、`delivery-01-feature-specs.md`（D11）
- 影响的 UI 清单：`core-00-ui-surface-map.md`（D5/D6/D7/D8/D9/D10）
- 影响的架构总纲：`core-01-architecture-overview.md`（D8/D10）
- 影响的时序文档：`core-S09-pdf-preview-synctex.md`（D3）、`research-S16-citation-search.md`（D4）、`collab-S29-server-onboarding.md`（D12）、`collab-S32-offline-merge-review.md`（D12）
- 影响的测试用例：`research-S16-test-cases.md`（D4，ST-S16-11 前提更新为「UI 入口已确认」）、`collab-S29-test-cases.md`（D12）、`collab-S32-test-cases.md`（D12）
- 不更新：`core-S11-export.md`、`core-S09-test-cases.md`、`core-S11-test-cases.md`（仅文件头「事实来源：inventory（含偏差 Dx）」溯源引用，不指向待办，保留）；`verify/acceptance-report.md`（历史验收产物，不回写）

- 影响的业务场景：S03（D1）、S11（D2）、S09（D3）、S16（D4）、S05（D5）、S25（D7）、S27（D8）、S26（D9）、S24（D10）、S52（D11）、S29/S32（D12）
- 影响的 API：无（不改任何接口行为与描述语义）
- 影响的 DB 表：无
- 影响的编排测试：无（`logos/resources/scenario/` 不受影响）

## 部署影响

- 是否需要部署：否
- 部署原因：纯文档与规格标注变更，无运行时行为、无构建产物变化
- 影响环境：无
- 是否涉及数据迁移：否
- 是否需要回滚预案：否（git revert 即可整体回退）
- 是否需要 smoke：否

## UI/UX 变更声明

```yaml
ui_impact: false            # 本次是否触及界面（GUI 项目才有意义）
design_system_mode: generated   # generated | fallback（fallback 时须填 design_system_fallback_reason）
design_system_fallback_reason: ""
pages: []                   # 每项 {id, prototype: core-NN-<slug>.html, description}
```

## 决策澄清

```yaml
schema: openlogos/clarification@1
mode: adaptive
status: resolved
impacts:
  data:
    status: none
    reason: 不触及任何数据存储、schema 与迁移；仅文档文本
  compatibility:
    status: none
    reason: 不改任何 API/协议/契约语义；文档对齐的是既有实现，不引入新承诺
  security_privacy:
    status: none
    reason: 不触及安全边界；D8（MCP 只读降级）回补方向是收紧而非放宽文档承诺
  public_release:
    status: none
    reason: D11/D12 涉及 README 与 development.md 的发布相关表述，但均为事实纠正（工作流已存在 / 冲突语义如实描述），不改变发布流程本身
  external_commitment:
    status: none
    reason: D12 回补反而收窄外部承诺（从「一切先询问」到「自动合并+只读审查」），消除过宽承诺风险
decisions:
  - id: DD-1
    question: D4 的「UI 入口待确认」如何落地？
    decision: 已在提案阶段核实 UI 入口存在（src/i18n/locales/en/references.json:36-39 的 EndNote/RIS/BibTeX 导入文案 + src/components/files/FileReferencesDialog.tsx），基线口径从「待确认」升级为「已确认」；[code] 段执行时再核对入口的具体渲染位置（面板/按钮）以保证文档描述准确
    source: 仓库证据（grep 核实）
  - id: DD-2
    question: D6「状态无法确认」如何落地？
    decision: 已在提案阶段调查：全库无通用 toast 静音实现（src/ 仅 sonner.tsx 封装，无 mute 相关代码），Editor.md "Deferred, not planned for 0.4.1" 表述准确；回补动作预期为「无需改动文档，基线标注更新为已确认未实现」
    source: 仓库证据（grep 核实）
  - id: DD-3
    question: 基线规格标注更新到什么程度？
    decision: 两类标注区别处理——「待办指向型」（文档待回补 / 回补另立变更 / 文档写 X / 概括过宽）更新为终态（指向本提案完成）；「溯源引用型」（文件头「事实来源：inventory（含偏差 Dx）」）保留不动，因为它们引用的是 inventory 偏差清单这一历史事实
    source: grep 全量定位后归类
unresolved: []
defaults: []
```

## 变更概述

本提案执行基线遗留的 D1–D12 文档偏差回补，分两部分。第一部分是 [code] 段：将 11 份用户文档（10 份 `docs/*.md` + `README.md`）中 12 处与实现不一致的表述改为实现口径——包括数量纠正（D7 agent 15 个、D9 run 60 分钟）、语义纠正（D2 导出目标、D3 PDF 保留两路径、D8 MCP 只读降级、D10 blocked 两类、D11 CLI 独立包、D12 冲突合并语义）、能力补写（D1 引擎五种、D4 文件导入、D5 非英语校对）与 D6 核对（调查结论：文档准确，无需改动）。

第二部分是 [delta] 段：19 份基线规格中的偏差标注同步转为终态——「文档待回补」「文档回补另立变更」等待办指向改为「已由 fix-doc-deviations 回补（对应文档文件）」；D4 相关用例前提从「UI 入口待确认」升级为「已确认」；D6 标注从「状态无法确认」升级为「已确认未实现，文档表述准确」。规格的验收条件与用例断言本身不变（基线始终按实现记录，回补不改变实现语义）。
