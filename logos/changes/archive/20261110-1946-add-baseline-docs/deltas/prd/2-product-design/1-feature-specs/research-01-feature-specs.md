## ADDED — Oleafly 研究与文献（research）功能规格（现状基线）

> module: research | 基线口径：桌面 0.4.11，绑定提交 `9c307bf3c`（HEAD，领先 v0.4.11 标签 3 个提交）
> 事实来源：仅限提案 `inventory.md`（research 段 S16-S20）与需求文档 `deltas/prd/1-product-requirements/research-01-requirements.md`。本文档为存量产品现状基线的功能规格：只固化已实现行为，不新增任何功能或交互；文档/实现偏差按实现记录（如 D4），文档回补另立变更。本基线为静态盘点，未执行任何测试，动态行为在 verify 阶段单独取证。

模块定位：research 覆盖写作之外的「研究与文献」半径——文献检索与引用写入（Citation Search）→ Zotero 文献库集成 → 草稿文献发现与 AI 评审 → 图像/扫描件 OCR 转换 → 研究规划与本地统计工具。本模块的**权威数据源是项目本地的 BibTeX/Hayagriva 引用文件**；检索结果、Zotero 条目、AI 评审与远程 OCR 都只是向它供给的外部来源，外部元数据不得取代本地 `.bib` 的权威性。网络能力（多源检索、zotero.org、AI 评审、hosted/Mathpix OCR）均为显式操作且失败必须显式呈现；离线降级路径为本地 `.bib`、Zotero 缓存、启发式评审与本机 Ollama。内置 Copilot / agent 等通用 AI 能力分属 ai 模块，本模块只在 S18/S19 记录其作为研究工具的现状边界。

### S16: 文献检索与引用写入

**功能入口与表面**

- 文献检索与引用写入能力（Citation Search）：以 DOI、arXiv、URL、标题等标识发起单条或多来源检索；检索结果合并呈现。
- 引用写入表面：将选中条目插入文稿并追加到项目引用文件；引用 key 补全、校验与诊断随写入流程提供。
- 依据：`docs/Citations.md`（L6-25、L98-135）、`citation.test.ts`（L480-605）。

**关键交互（主路径步骤化）**

1. 用户按 DOI/arXiv/URL/标题发起单条或多来源检索（多来源结果来自多个 provider）。
2. 多来源检索结果经合并查重去重后呈现。
3. 用户插入引用：引用写入文稿，对应条目追加至项目 `.bib`。
4. 引用 key 缺失时执行补全、校验与诊断。

**能力与限制**

- 批量写入保守：批量流程中 `.bib` 写失败即先停止，不静默跳过继续执行。
- provider 不可用时显式呈现，不静默吞掉。
- 未配置 Serper key 时不列 Google Scholar。
- 无网络时引用工作不中断：仍可继续使用本地 `.bib` 完成引用写入。
- 参考文献 RIS/EndNote XML 导入为偏差 D4：文档未列出，E2E 经 devtools hook 可导入，记为「实现支持、UI 入口待确认」，不作为已确认 UI 入口描述。
- 外部检索元数据只作供给，引用权威源始终是项目本地 BibTeX/Hayagriva 文件。

**关联需求**

- S16 ← P05「文献检索与引用整理碎片化」；优先级 P0。
- 正常/异常/边界验收条件见 `research-01-requirements.md` §S16（多源检索与引用写入、provider 不可用或无 Serper key、无网络、批量写入失败即停、D4 边界）。

### S17: Zotero 文献库集成

**功能入口与表面**

- Zotero 连接表面：连接本机 Zotero 7+（含 BBS）或 zotero.org 文献库。
- 编辑器 `@` 联合检索：在编辑器中以 `@` 同时检索 Zotero 条目。
- 条目更新审阅表面：Zotero 侧条目变更经审阅确认后才更新。
- 依据：`docs/Citations.md`（L27-71）、`zotero-cite.test.ts`（L197-361）、`zotero-actions.test.ts`（L151-236）。

**关键交互（主路径步骤化）**

1. 用户连接本机 Zotero 7+/BBS 或 zotero.org 文献库。
2. 在编辑器中以 `@` 对 Zotero 库做联合检索。
3. 插入条目时只追加该条目到项目引用文件，防止重复导入。
4. 对缺失 key 的条目批量补全。
5. Zotero 侧条目变更经审阅确认后才更新到项目。

**能力与限制**

- 本机 Zotero 未运行时使用缓存，并明确标注缓存状态。
- 手改条目须用户确认后才覆盖，不静默合并。
- 任何条目不被自动删除。
- 同步写失败与条目缺失 key 均明确报告。
- 插入防重：仅追加所选条目，不重复导入。
- 外部来源（Zotero）不得取代项目本地引用文件的权威性。

**关联需求**

- S17 ← P06「Zotero 文献库与写作脱节」；优先级 P1。
- 正常/异常验收条件见 `research-01-requirements.md` §S17（联合检索与防重插入、Zotero 关闭或写失败）。

### S18: 草稿文献发现与 AI 评审

**功能入口与表面**

- 文档扫描表面（DocumentCitationScanPanel）：From document 扫描草稿，发现候选文献，结果过滤已引用条目并附分数与理由。
- Review 入口：对相关工作获取流式评审反馈。
- 依据：`docs/Citations.md`（L73-135）、`DocumentCitationScanPanel.test.tsx`（L152-190）、`.states.test.tsx`（L203-485）。

**关键交互（主路径步骤化）**

1. 用户对草稿运行 From document 扫描。
2. 扫描结果过滤已被引用的条目。
3. 用户查看候选文献的分数与推荐理由。
4. 将选中条目加入书目；或改用 Review 获取流式反馈。

**能力与限制**

- 未配置 AI 时退化为启发式扫描，且不显示理由。
- 离线时禁用扫描。
- 扫描结果缓存约一天。
- 隐私边界：只发送短查询，不发送整个项目。
- 需要 AI 配置与网络可用才能获得分数与理由（正常路径前提）。

**关联需求**

- S18 ← P07「草稿『该引而未引』发现靠人工」；优先级 P2。
- 正常/边界验收条件见 `research-01-requirements.md` §S18（文档扫描发现、降级与隐私）。
- 边界声明：AI 能力本身（provider 配置、审批等）分属 ai 模块，此处只记录其作为研究工具的现状边界。

### S19: 图像与扫描件 OCR 转换

**功能入口与表面**

- OCR 转换器入口：Image（图像）、Equation（公式）、PDF 扫描三类转换器（ad-hoc converters，见 `docs/Tools.md` L63-129）。
- 运行前透明展示表面：数据去向、页数与成本在运行前呈现。
- 依据：`docs/Tools.md`（L63-129）、`ad-hoc-converters.test.ts`（L485-509）、`image-input.ts`（L37-39）。

**关键交互（主路径步骤化）**

1. 用户选择 Image / Equation / PDF 扫描转换器。
2. 选择执行模型：默认本机 Ollama，或显式选择远程模型（hosted/Mathpix）。
3. 运行前查看数据去向、页数与成本。
4. 运行转换，检查并保存结果。

**能力与限制**

- 离线时拒绝 hosted/Mathpix 等远程转换；本机 Ollama 转换仍可用。
- 扫描一次最多 50 页；超过 5 页需用户确认。
- 尺寸限制：托管图长边上限 2000px；CLI agent 图上限 760KB。
- 只读 agent 仍可读取图像。
- 本地优先：默认执行模型是本机 Ollama，远程模型为显式选择项。

**关联需求**

- S19 ← P08「扫描件与图像内容不可用」；优先级 P1。
- 正常/异常/边界验收条件见 `research-01-requirements.md` §S19（本机 Ollama 转换、离线时远程转换被拒、页数与尺寸限制）。

### S20: 研究规划与本地统计工具

**功能入口与表面**

- 规划工具入口：Lab Search（实验室检索）、Conference Deadlines（会议截止日期）。
- 统计速算工具入口：p 值、样本量、置信区间（统计工具视图 StatsToolView）。
- 各工具结果在其自身面板内呈现，支持复制与外链。
- 依据：`docs/Tools.md`（L137-166）、`StatsToolView.test.tsx`（L83-121）。

**关键交互（主路径步骤化）**

1. 用户打开 Lab Search / Conference Deadlines / p 值 / 样本量 / 置信区间等工具面板。
2. 输入条件并运行。
3. 在面板内查看结果，可复制结果或跳转外链。

**能力与限制**

- 会议截止数据以 CS（计算机科学）为主，非全学科覆盖。
- 非法输入在面板内说明原因，并恢复到可运行状态，不锁死面板。
- 需要网络的工具在其自身面板内声明该依赖。
- 统计速算在本地面板内完成，不要求联网（需网络者除外，由面板自身声明）。

**关联需求**

- S20 ← P09「研究规划与统计速算工具分散」；优先级 P2。
- 正常/边界验收条件见 `research-01-requirements.md` §S20（统计与规划工具、数据范围与非法输入）。

### UI 表面清单（research 模块）

| 场景 | UI 表面 | 表面职责 | 证据 |
|---|---|---|---|
| S16 | Citation Search 检索与引用写入表面 | DOI/arXiv/URL/标题检索、多来源合并查重、插入引用与 `.bib` 追加、key 补全/校验/诊断 | `docs/Citations.md` L6-25, L98-135；`citation.test.ts` L480-605 |
| S17 | Zotero 连接配置 + 编辑器 `@` 联合检索 + 条目更新审阅 | 连接本机 Zotero 7+/BBS 或 zotero.org；`@` 检索；防重插入；批量补 key；审阅后更新 | `docs/Citations.md` L27-71；`zotero-cite.test.ts` L197-361；`zotero-actions.test.ts` L151-236 |
| S18 | DocumentCitationScanPanel（From document 扫描）+ Review 流式反馈 | 扫描草稿发现候选文献、过滤已引用、分数与理由、加入书目；流式评审 | `docs/Citations.md` L73-135；`DocumentCitationScanPanel.test.tsx` L152-190；`.states.test.tsx` L203-485 |
| S19 | Image/Equation/PDF 扫描转换器（ad-hoc converters）+ 运行前数据去向/页数/成本展示 | 本地优先 OCR 转换、远程模型显式选择、运行前透明展示、结果检查保存 | `docs/Tools.md` L63-129；`ad-hoc-converters.test.ts` L485-509；`image-input.ts` L37-39 |
| S20 | Lab Search / Conference Deadlines / p 值 / 样本量 / 置信区间工具面板（StatsToolView） | 规划查询与统计速算、结果查看/复制/外链、非法输入说明与恢复 | `docs/Tools.md` L137-166；`StatsToolView.test.tsx` L83-121 |
