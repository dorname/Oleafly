<!-- protocol: malp/v1 -->
<!-- MALP 归档历史：进 git（反向 ignore 的显式豁免项），append-only。
     只由 `lint.py archive <条目号>` 写入：条目全文（任务书+CLAIM+ACK+审查结论）追加到文件末尾，
     同时从 TASKS.md 移除该条目并做 `malp-archive: <条目号>` 小 commit（不 push）。
     禁止手改：历史事实一经归档永不重写；发现错误归档 → 新条目纠正，不回改本文件。 -->

# 归档历史

<!-- 归档条目按时间追加在文件末尾，格式与 TASKS.md 条目一致（含 CLAIM/ACK/审查结论全文）。 -->

### 1. 产出 research 模块需求 delta（S16-S20）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 logos/changes/add-baseline-docs/inventory.md 的 research 段与 deltas/prd/1-product-requirements/core-01-requirements.md 格式模板 ② 按 ADDED 标记产出 deltas/prd/1-product-requirements/research-01-requirements.md（中文；S16 P0 与 S17/S19 P1 给完整 GWT，S18/S20 P2 简要+验收；含痛点映射、场景总览表、约束边界、静态盘点声明）③ 不要发挥 inventory 之外的事实
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/research-01-requirements.md && grep -q S16 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/research-01-requirements.md && grep -q S20 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/research-01-requirements.md && test $(grep -c WHEN logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/research-01-requirements.md) -ge 6
- 优先级: P0
- 里程碑: M1
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(doc-research)): 1794235940
ACK(done): 已产出 research-01-requirements.md（S16-S20），验收命令通过 —— 执行(doc-research) —— 执行(doc-research)
审查结论(通过): 独立复验：磁盘读回文件结构符合模板（ADDED 标记/五个章节），S16-S20 五场景齐备，14 个验收块，WHEN=10≥6；git status 确认未越界 —— 监督(malp-architect)

### 2. 产出 ai 模块需求 delta（S21-S28）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md 的 ai 段与 core-01-requirements.md 格式模板 ② 产出 deltas/prd/1-product-requirements/ai-01-requirements.md（中文；S21/S22 P0 与 S23-S27 P1 给完整 GWT，S28 P2 简要；产品背景必须写明五条 AI 执行路径不可混称；约束含默认开关矩阵要点）③ 不要发挥 inventory 之外的事实
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/ai-01-requirements.md && grep -q S21 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/ai-01-requirements.md && grep -q S28 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/ai-01-requirements.md && grep -q 五条 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/ai-01-requirements.md && test $(grep -c WHEN logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/ai-01-requirements.md) -ge 10
- 优先级: P0
- 里程碑: M1
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(doc-ai)): 1794235953
ACK(done): 已产出 ai-01-requirements.md（S21-S28），验收命令通过 —— 执行(doc-ai) —— 执行(doc-ai)
审查结论(通过): 独立复验：磁盘读回确认 1.2 节五条执行路径不可混称表格、场景总览 S21-S28 与模板结构齐备，验收命令通过 —— 监督(malp-architect)

### 5. 产出 delivery 模块需求 delta（S50-S52）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: S
- 任务书: runbook：① 读 inventory.md 的 delivery 段与架构段、core-01-requirements.md 格式模板 ② 产出 deltas/prd/1-product-requirements/delivery-01-requirements.md（中文；S50/S51 P1 给完整 GWT，S52 P2 简要；约束含 draft 门禁、updater 失败不改现有安装、OS 签名与 updater minisign 两条链、/healthz 与 /readyz 语义、CLI Windows 签名未接线）③ 不要发挥 inventory 之外的事实
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/delivery-01-requirements.md && grep -q S50 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/delivery-01-requirements.md && grep -q readyz logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/delivery-01-requirements.md && test $(grep -c WHEN logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/delivery-01-requirements.md) -ge 4
- 优先级: P1
- 里程碑: M1
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内
CLAIM(执行(doc-delivery)): 1794236042
ACK(done): 已产出 delivery-01-requirements.md（S50-S52），验收命令通过 —— 执行(doc-delivery) —— 执行(doc-delivery)
审查结论(通过): 独立复验：机械验收 PASS，S50/S51/S52 三场景与五、约束章节在磁盘齐备 —— 监督(malp-architect)

### 3. 产出 collab 模块需求 delta（S29-S42）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md 的 collab 段与 core-01-requirements.md 格式模板 ② 产出 deltas/prd/1-product-requirements/collab-01-requirements.md（中文；S29-S35、S40、S41 P0 与 S36-S39、S42 P1 给完整 GWT；背景写明四条同步路径区分；约束含项目非端到端加密、浏览器无 long-poll 回退、生产浏览器无编译引擎）③ 不要发挥 inventory 之外的事实
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/collab-01-requirements.md && grep -q S29 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/collab-01-requirements.md && grep -q S42 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/collab-01-requirements.md && grep -q 端到端加密 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/collab-01-requirements.md && test $(grep -c WHEN logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/collab-01-requirements.md) -ge 14
- 优先级: P0
- 里程碑: M1
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(doc-collab)): 1794235975
ACK(done): 已产出 collab-01-requirements.md（S29-S42），验收命令通过 —— 执行(doc-collab) —— 执行(doc-collab)
审查结论(通过): 独立复验：机械验收 PASS，S29-S42 十四场景齐备（44 个 WHEN），四条同步路径与非端到端加密等边界落点确认 —— 监督(malp-architect)

### 4. 产出 sync 模块需求 delta（S43-S49）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md 的 sync 段与 core-01-requirements.md 格式模板 ② 产出 deltas/prd/1-product-requirements/sync-01-requirements.md（中文；S43-S45、S48 P0 与 S46/S47/S49 P1 给完整 GWT；背景写明云同步≠实时协作；约束含只同步 Library 项目、.git 历史/检查点不随云同步、在线 ZIP 导入取消未确认）③ 不要发挥 inventory 之外的事实
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/sync-01-requirements.md && grep -q S43 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/sync-01-requirements.md && grep -q S49 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/sync-01-requirements.md && grep -q 不随云同步 logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/sync-01-requirements.md && test $(grep -c WHEN logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/sync-01-requirements.md) -ge 7
- 优先级: P0
- 里程碑: M1
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(doc-sync)): 1794236016
ACK(done): 已产出 sync-01-requirements.md（S43-S49），验收命令通过 —— 执行(doc-sync) —— 执行(doc-sync)
审查结论(通过): 独立复验：机械验收 PASS，S43-S49 七场景齐备（27 个 WHEN），云同步≠实时协作与不随云同步边界落点确认 —— 监督(malp-architect)

### 6. 产出 core 模块功能规格 delta（S01-S15）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md core 段与 deltas/prd/1-product-requirements/core-01-requirements.md ② 产出 deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md：开头 `## ADDED — …`，每场景一节（### SXX），含「功能入口与表面 / 关键交互（主路径步骤化 3+ 步）/ 能力与限制（inventory 异常边界逐条）/ 关联需求（SXX + 痛点）」；中文；不发明新交互 ③ 末尾给本模块 UI 表面清单小节
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md && grep -q S01 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md && grep -q S15 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md && test $(grep -c '^### S' logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md) -ge 15
- 优先级: P0
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-core)): 1794236560
ACK(done): 已产出 core-01-feature-specs.md，监督复验通过（场景节/表格行=15，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-core) —— 执行(spec-core)
审查结论(通过): 独立复验：磁盘读回确认 15 个场景节（S01-S15）+ 末尾 UI 表面表完整，验收断言全过，文件无截断 —— 监督(malp-architect)

### 7. 产出 research 模块功能规格 delta（S16-S20）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: S
- 任务书: runbook：同条目 6 结构，输入改为 inventory.md research 段与 research-01-requirements.md；输出 deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md（S16-S20）
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md && grep -q S16 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md && grep -q S20 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md && test $(grep -c '^### S' logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md) -ge 5
- 优先级: P0
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-research)): 1794236576
ACK(done): 已产出 research-01-feature-specs.md，监督复验通过（场景节/表格行=5，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-research) —— 执行(spec-research)
审查结论(通过): 独立复验：磁盘读回确认 S16-S20 五场景节 + UI 表面表完整，验收断言全过 —— 监督(malp-architect)

### 8. 产出 ai 模块功能规格 delta（S21-S28）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：同条目 6 结构，输入改为 inventory.md ai 段与 ai-01-requirements.md；输出 deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md（S21-S28）；开头重申五条执行路径不可混称
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md && grep -q S21 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md && grep -q S28 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md && grep -q 五条 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md && test $(grep -c '^### S' logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md) -ge 8
- 优先级: P0
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-ai)): 1794236625
ACK(done): 已产出 ai-01-feature-specs.md，监督复验通过（场景节/表格行=8，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-ai) —— 执行(spec-ai)
审查结论(通过): 独立复验：磁盘读回确认五条执行路径前置口径 + S21-S28 八场景节完整，验收断言全过 —— 监督(malp-architect)

### 9. 产出 collab 模块功能规格 delta（S29-S42）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：同条目 6 结构，输入改为 inventory.md collab 段与 collab-01-requirements.md；输出 deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md（S29-S42）
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md && grep -q S29 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md && grep -q S42 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md && test $(grep -c '^### S' logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md) -ge 14
- 优先级: P0
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-collab)): 1794236651
ACK(done): 已产出 collab-01-feature-specs.md，监督复验通过（场景节/表格行=15，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-collab) —— 执行(spec-collab)
审查结论(通过): 独立复验：磁盘读回确认加密/权限边界引用块 + S29-S42 场景节完整（15 节），验收断言全过 —— 监督(malp-architect)

### 10. 产出 sync 模块功能规格 delta（S43-S49）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: S
- 任务书: runbook：同条目 6 结构，输入改为 inventory.md sync 段与 sync-01-requirements.md；输出 deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md（S43-S49）
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md && grep -q S43 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md && grep -q S49 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md && test $(grep -c '^### S' logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md) -ge 7
- 优先级: P0
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-sync)): 1794236677
ACK(done): 已产出 sync-01-feature-specs.md，监督复验通过（场景节/表格行=7，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-sync) —— 执行(spec-sync)
审查结论(通过): 独立复验：磁盘读回确认「云同步≠实时协作」声明 + S43-S49 七场景节完整，验收断言全过 —— 监督(malp-architect)

### 11. 产出 delivery 模块功能规格 delta（S50-S52）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: S
- 任务书: runbook：同条目 6 结构，输入改为 inventory.md delivery 段与 delivery-01-requirements.md；输出 deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md（S50-S52）
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md && grep -q S50 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md && grep -q S52 logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md && test $(grep -c '^### S' logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md) -ge 3
- 优先级: P1
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-delivery)): 1794236680
ACK(done): 已产出 delivery-01-feature-specs.md，监督复验通过（场景节/表格行=3，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-delivery) —— 执行(spec-delivery)
审查结论(通过): 独立复验：磁盘读回确认三条发布线声明 + S50-S52 三场景节完整，验收断言全过 —— 监督(malp-architect)

### 12. 产出全局 UI 表面清单 delta
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md 全文与六份 deltas/prd/1-product-requirements/*-01-requirements.md 的场景总览表 ② 产出 deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md：全局 UI 表面清单表（表面 / 所属模块 / 关联场景 / 主要入口），覆盖桌面主窗口（项目库、编辑器、PDF 预览、Source Control、Versioning、终端、AI 面板、Settings、Tools gallery、分享与历史）、浏览器端、Server 管理控制台；中文；标注「现状清单，非原型」 ③ 末尾列各模块设置入口汇总
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md && grep -q S01 logos/changes/add-baseline-docs/deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md && grep -q S52 logos/changes/add-baseline-docs/deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md && grep -q 管理控制台 logos/changes/add-baseline-docs/deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md
- 优先级: P1
- 里程碑: M2
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(spec-uimap)): 1794236718
ACK(done): 已产出 core-00-ui-surface-map.md，监督复验通过（场景节/表格行=81，验收断言全过）；执行者被 operator 硬停后由监督代记回执 —— 执行(spec-uimap) —— 执行(spec-uimap)
审查结论(通过): 独立复验：磁盘读回确认全局表面总表 81 行且含管理控制台/浏览器端/安装器，验收断言全过 —— 监督(malp-architect)

### 16. 产出 research/ai P0 场景时序 delta（3 份）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：同条目 15 体裁，产出 research-S16-citation-search.md、ai-S21-copilot-review.md、ai-S22-research-skills.md 到 deltas/prd/3-technical-plan/2-scenario-implementation/；输入改用 inventory.md research/ai 段与对应需求文档；每份含 Mermaid sequenceDiagram
- 验收: for f in research-S16-citation-search ai-S21-copilot-review ai-S22-research-skills; do p=logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/$f.md; test -f $p && grep -q sequenceDiagram $p || exit 1; done
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(seq-ra)): 1794297673
ACK(done): 已产出 research/ai 3 份 P0 场景时序 delta，验收命令通过 —— 执行(seq-ra) —— 执行(seq-ra)
审查结论(通过): 独立复验：磁盘读回确认 3 份时序文件体裁一致（触发与前置/参与者/主时序+sequenceDiagram/失败降级/边界证据），S21 的 approve-for-me 勘误与五条路径不混称声明均落位 —— 监督(malp-architect)

### 15. 产出 core P0 场景时序 delta（7 份）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: L
- 任务书: runbook：① 读 inventory.md core 段与 deltas/prd/1-product-requirements/core-01-requirements.md ② 产出 7 个文件到 deltas/prd/3-technical-plan/2-scenario-implementation/：core-S01-project-create-import.md、core-S04-multifile-authoring.md、core-S07-compile-engines.md、core-S09-pdf-preview-synctex.md、core-S10-preflight.md、core-S11-export.md、core-S12-checkpoints.md。每个文件开头 `## ADDED — SXX <场景名> 场景实现（现状基线）` + 口径引用块；含：触发与前置、参与者（前端/Rust/引擎/外部）表、主时序（编号步骤，每步标注调用面：UI / typed IPC / Rust 模块 / 引擎进程 / 文件系统）、失败与降级分支（逐条对应需求文档异常）、边界与证据（引用 inventory 证据路径）；用 Mermaid sequenceDiagram 表达主时序；中文；不发明实现细节
- 验收: for s in S01 S04 S07 S09 S10 S11 S12; do f=$(ls logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-$s-*.md); test -n "$f" && grep -q "sequenceDiagram" "$f" || exit 1; done
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(seq-core)): 1794297640
ACK(done): 已产出 core 7 份 P0 场景时序 delta（S01/S04/S07/S09/S10/S11/S12，766 行），条目 15 验收命令通过（7 文件均含 sequenceDiagram），lint 0 项违规 —— 执行(seq-core) —— 执行(seq-core)
审查结论(通过): 独立复验：磁盘读回确认 7 份 core 时序体裁一致（触发与前置/参与者/主时序+sequenceDiagram/失败降级/边界证据），S11 按实现记录偏差 D2（绝对路径+父目录存在、目标文件可不存在） —— 监督(malp-architect)

### 18. 产出 sync P0 场景时序 delta（4 份）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：同条目 15 体裁，产出 sync-S43-cloud-sync.md、sync-S44-conflict-copies.md、sync-S45-mass-delete-guard.md、sync-S48-online-git-bridge.md 到 deltas/prd/3-technical-plan/2-scenario-implementation/；输入改用 inventory.md sync 段与 sync-01-requirements.md；每份含 Mermaid sequenceDiagram；须体现 manifest 比对、冲突副本、删除 hold 判定、Git bridge auto 触发条件
- 验收: for f in sync-S43-cloud-sync sync-S44-conflict-copies sync-S45-mass-delete-guard sync-S48-online-git-bridge; do p=logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/$f.md; test -f $p && grep -q sequenceDiagram $p || exit 1; done
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(seq-sync)): 1794297722
ACK(done): 已产出 sync 4 份 P0 场景时序 delta，验收命令通过 —— 执行(seq-sync) —— 执行(seq-sync)
审查结论(通过): 独立复验：磁盘读回确认 4 份 sync 时序均含 sequenceDiagram，四份口径声明逐份区分「云同步≠实时协作」并显式标注不涉及协作通道 —— 监督(malp-architect)

### 14. 产出 52 场景总览与编号注册 delta
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md 全表与六份 deltas/prd/1-product-requirements/*-01-requirements.md 的场景总览表 ② 产出 deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md：开头 `## ADDED — Oleafly 场景总览（现状基线，编号注册表）` + 口径引用块；一张全场景表（编号/名称/模块/优先级/P0-P1-P2 标记/关联痛点/对应需求文档章节/对应功能规格章节/对应时序文件）；一节「编号规则」（全局唯一、next_id=53、严禁各模块从 S01 重开）；一节「场景到时序文档映射」（S01/S04/S07/S09/S10/S11/S12/S16/S21/S22/S29/S30/S31/S32/S33/S34/S35/S40/S41/S43/S44/S45/S48 各对应文件名）；中文
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md && grep -q S52 logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md && grep -q next_id logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md && test $(grep -c '^| S[0-9]' logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md) -ge 52
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(scene-overview)): 1794297658
ACK(done): 已产出 core-00-scenario-overview.md（52 场景注册表），验收命令通过 —— 执行(scene-overview) —— 执行(scene-overview)
审查结论(通过): 独立复验：磁盘读回确认 52 行全场景表齐备且 next_id=53 已声明；痛点编号跨模块消歧处理正确（模块内局部编号，以「模块/Pxx」书写） —— 监督(malp-architect)

### 21. 产出部署方案 delta
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md「部署资产清单」与 delivery 段 ② 产出 deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md：开头 `## ADDED — Oleafly 部署方案（现状基线）` + 口径引用块；含：三条发布线（桌面 draft 门禁与资产清单、Server server-v 独立发布、CLI 七 target 与签名缺口）、Server 部署拓扑（Dockerfile distroless/10001/8080/healthcheck、Compose+Caddy、Litestream 可选、systemd 硬化、Render 模板）、安装器与校验（install.sh 下载与 SHA256）、运维 smoke 覆盖项、升级与回滚约束（DB 比程序新拒绝打开、旧二进制不能简单回滚新 DB、/healthz 与 /readyz 语义、restart 后 server_id 持久）、外部仓库边界（Oleafly/oleafly-server 仅作发布分发 adapter）；中文
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md && grep -q readyz logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md && grep -q Litestream logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内
CLAIM(执行(deploy-doc)): 1794297814
ACK(done): 已产出 delivery-01-deployment.md，验收命令通过 —— 执行(deploy-doc) —— 执行(deploy-doc)
审查结论(通过): 独立复验：磁盘读回确认部署方案含三条发布线、Server 拓扑、/healthz 与 /readyz 语义、Litestream 与升级回滚约束，共 195 行 —— 监督(malp-architect)

### 20. 产出 DB 规格 delta（2 份）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md「数据资产」段 ② 产出 2 份到 deltas/database/：collab-01-server-schema.md（Server SQLite schema 18、migration 0001-0018 演进链、数据对象分组、WAL 与并发参数、升级/拒绝打开/回滚约束、blob fs 与 S3 两条路径）、core-01-local-stores.md（library.db schema3 / catalog.sqlite3 checkpoint catalog format2 / tasks.sqlite3 research schema5 / literature-cache.sqlite3 / sessions.sqlite，各库用途与关键表）；中文；事实只来自 inventory.md；注明「现状 schema 快照」
- 验收: for f in collab-01-server-schema core-01-local-stores; do p=logos/changes/add-baseline-docs/deltas/database/$f.md; test -f $p || exit 1; done && grep -q 0018 logos/changes/add-baseline-docs/deltas/database/collab-01-server-schema.md && grep -q library.db logos/changes/add-baseline-docs/deltas/database/core-01-local-stores.md
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(db-doc)): 1794297786
ACK(done): 已产出 deltas/database/collab-01-server-schema.md（166 行）与 core-01-local-stores.md（184 行）；schema 18 迁移链 0001-0018 文件名逐条对上 crates/oleafly-server/migrations/ 实际清单；WAL 强制校验已回源核对 crates/oleafly-server/src/db.rs:112-119；本地 5 库行号抽查全部命中（library_db.rs:8/11、acp/store.rs:54、literature.rs:75、oleafly-history/src/lib.rs:15/1541）；事实只取自 inventory.md，未新增需求 —— 执行(db-doc)
审查结论(通过): 独立复验：磁盘读回确认 166/184 行；迁移链 0001-0018 与 migrations/ 目录实际清单逐条一致；WAL 强制校验回源核对 db.rs:112-119 命中；本地 5 库行号抽查全部命中；三套版本语义互不可比的边界声明成立 —— 监督(malp-architect)

### 13. 产出全局架构总纲 delta
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: M
- 任务书: runbook：① 读 inventory.md 的「架构与测试要点」段与「模块划分」表 ② 产出 deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md：开头 `## ADDED — Oleafly 全局架构总纲（现状基线）` + 口径引用块；章节含：技术栈与工具链（pnpm workspace/Rust workspace/Node/pnpm/Rust 版本、profile）、组件清单（Rust 组件分组 + 17 个 TS 包分组，含证据路径）、进程与仓库边界（桌面/CLI/引擎子进程/Server/Browser/WASM/仓库外）、关键数据流（编译主链路、增量项目读取、统计与 RAG、协作同步、MCP 工具流）、本地与网络信任边界（路径与进程、窗口能力、秘密、MCP、下载供应链、模型信任、Server 保密性、代理边界、更新与 OS 签名两条链）、模块依赖主线；中文；事实只来自 inventory.md ②
- 验收: test -f logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md && grep -q 信任边界 logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md && grep -q BackendPort logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md && grep -q 编译主链路 logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(arch-doc)): 1794297599
ACK(done): 已产出 core-01-architecture-overview.md，验收命令通过 —— 执行(arch-doc) —— 执行(arch-doc)
审查结论(通过): 独立复验：磁盘读回确认 335 行，七章节齐全；技术栈事实逐条回源命中（Node >=22.13 <25、pnpm 11.9.0、rust-toolchain channel 1.98.1、MSRV 1.87、release opt-level=s / server-release opt-level=3 / wasm-release panic=abort）；口径块明确「未运行任何测试，不代表动态验证通过」 —— 监督(malp-architect)

### 17. 产出 collab P0 场景时序 delta（7 份）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: L
- 任务书: runbook：同条目 15 体裁，产出 collab-S29-server-onboarding.md、collab-S30-live-coediting.md、collab-S31-reconnect-resync.md、collab-S32-offline-merge-review.md、collab-S33-role-permissions.md、collab-S34-comments-suggestions.md、collab-S35-shared-history.md、collab-S40-browser-collab.md、collab-S41-browser-session.md（该组共 9 份，可拆两次交付）；输入改用 inventory.md collab 段与 collab-01-requirements.md；每份含 Mermaid sequenceDiagram；须体现协议 v1 协商、WS→long-poll 回退、角色服务端逐 change 校验
- 验收: for f in collab-S29-server-onboarding collab-S30-live-coediting collab-S31-reconnect-resync collab-S32-offline-merge-review collab-S33-role-permissions collab-S34-comments-suggestions collab-S35-shared-history collab-S40-browser-collab collab-S41-browser-session; do p=logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/$f.md; test -f $p && grep -q sequenceDiagram $p || exit 1; done
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(seq-collab)): 1794297701
ACK(done): 已产出 collab 9 份 P0 场景时序 delta，验收命令通过 —— 执行(seq-collab) —— 执行(seq-collab)
审查结论(通过): 独立复验：磁盘读回确认 9 份文件体裁与 core/sync 组一致（五个带序号章节 + sequenceDiagram）；事实抽查命中（SESSION_DAYS=30、web_sessions token_hash 主键与 mode CHECK、协议 negotiate 算法 low/high 与 ClientTooOld/ServerTooOld 逐行一致）；初版章节标题缺序号，已回退执行者修正并复验通过 —— 监督(malp-architect)

### 19. 产出 API 契约 delta（4 份）
- 派单: 监督(malp-architect) 2026-11-09
- 预算档: L
- 任务书: runbook：① 读 inventory.md「API 资产」与 collab/ai 段 ② 产出 4 份到 deltas/api/：core-01-backend-port.md（BackendPort v7 capabilities 清单、CompilePort 方法与输出、Tauri IPC 分类清单，明确「内部 typed IPC 非稳定公共 HTTP API」）、collab-01-server-api.md（Server HTTP 路由族与 WS/长轮询端点、认证族、项目族、浏览器族、健康与能力端点）、collab-02-collab-protocol.md（协议 v1、min/max 协商、客户端过旧/服务端过旧、角色与项目动作 wire 类型）、ai-01-mcp-cli-api.md（MCP localhost 端点与工具族、审批与降级、CLI --json 输出与退出码、1.0 前不稳定声明）；中文；事实只来自 inventory.md；每份注明「现状契约快照，非新增 API 设计」
- 验收: for f in core-01-backend-port collab-01-server-api collab-02-collab-protocol ai-01-mcp-cli-api; do p=logos/changes/add-baseline-docs/deltas/api/$f.md; test -f $p || exit 1; done && grep -q 'v7' logos/changes/add-baseline-docs/deltas/api/core-01-backend-port.md && grep -q 'v1' logos/changes/add-baseline-docs/deltas/api/collab-02-collab-protocol.md
- 优先级: P0
- 里程碑: M3
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(api-doc)): 1794297879

ACK(done): 已产出 4 份 API 契约 delta（core-01-backend-port / collab-01-server-api / collab-02-collab-protocol / ai-01-mcp-cli-api，共 865 行），条目 19 验收命令通过，lint 0 违规 —— 执行(api-doc) —— 执行(api-doc)
审查结论(通过): 独立复验：磁盘读回确认 4 份 API 契约（208/216/244/197 行）；BackendPort 12 capabilities 名称与顺序、PROTOCOL_VERSION=7 回源 src-tauri/src/protocol.rs 逐项命中；协商算法回源 crates/oleafly-collab-protocol/src/capabilities.rs:83-93 逐行一致；均声明「现状契约快照，非新增 API 设计」 —— 监督(malp-architect)

### 25. 产出部署后冒烟测试用例 delta（1 份）
- 派单: 监督(malp-architect) 2026-11-10
- 预算档: S
- 任务书: runbook：① 输入只读 inventory.md + 该场景的时序 delta（deltas/prd/3-technical-plan/2-scenario-implementation/）+ 需求 delta（deltas/prd/1-product-requirements/）+ 功能规格 delta（deltas/prd/2-product-design/1-feature-specs/）+ 已就绪的 deltas/api/ 与 deltas/database/；② 产出到 deltas/test/，文件名 `<模块>-S<编号>-test-cases.md`；③ 每份文件开头写 `## ADDED — S<编号> <场景名> 测试用例（现状基线）` 并附口径块（基线 桌面 0.4.11 绑定提交 9c307bf3c；静态盘点，未运行任何测试，不得预填 PASS）；④ 四段固定结构：一、单元测试用例（按来源分组：API 字段约束 / DB 约束 / 业务规则）；二、场景测试用例（2.1 主路径 / 2.2 异常路径 / 2.3 人工验证 [manual]）；三、覆盖度校验（逐项勾选并注明未覆盖原因）；四、验收条件追溯表（AC ID 格式 S<编号>-AC-<两位序号>，从需求文档 §四 该场景验收条件逐条取，按出现顺序连续编号，映射到覆盖用例 ID）；⑤ 用例 ID 严格为 UT-S<编号>-<两位序号> / ST-S<编号>-<两位序号>，需要人工视觉或真实终端的用例加 [manual] 后缀；⑥ 事实只来自上述输入，不得发明新需求或新 API；⑦ 全中文
- 产出 logos/changes/add-baseline-docs/deltas/test/delivery-01-smoke-test-cases.md：模块 delivery 的部署后冒烟用例（ID 格式 SMOKE-delivery-<两位序号>），内容取自 deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md 的部署后检查项（桌面/Server/CLI 三条发布线、健康与就绪探针、迁移与存储就绪、配置与密钥、核心链路最小路径、日志无阻断错误）；含冒烟范围表、用例表、覆盖度校验三段
- 验收: test -f logos/changes/add-baseline-docs/deltas/test/delivery-01-smoke-test-cases.md && grep -q 'SMOKE-delivery-01' logos/changes/add-baseline-docs/deltas/test/delivery-01-smoke-test-cases.md && grep -q '## 三、覆盖度校验' logos/changes/add-baseline-docs/deltas/test/delivery-01-smoke-test-cases.md
- 优先级: P0
- 里程碑: M4
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(test-smoke)): 1794298486
ACK(done): 产出 logos/changes/add-baseline-docs/deltas/test/delivery-01-smoke-test-cases.md（delivery 模块部署后冒烟测试用例 delta，只读静态盘点，未运行任何测试/部署，预期结果全为设计值、未预填 PASS）。共 49 条用例 SMOKE-delivery-01-01~49（连续、不跳号、不重复）。分布：健康检查 10（01-10，含 /healthz 存活语义、/readyz 就绪语义、双探针不可混用、容器 HEALTHCHECK、Server --version、CLI version/--json version/--json doctor/help、桌面首启、更新入口）、核心入口 6（11-16）、数据库迁移与版本 8（17-24，含 Server schema 18、关键表存在、migration 事务化+FK check、DB 比程序新拒绝打开、旧二进制不接管新 DB、本地 library.db schema 3 / catalog format 2 / tasks schema 5）、存储就绪 4（25-28，blob fs/S3、/data 权限 10001:10001 0700、Litestream 默认不启）、配置与密钥 7（29-35，必填变量、OLEAFLY_DOMAIN 缺失即失败、无占位值、登录方式齐备、无登录方式退出码 2、.env 0600、SHA256 校验）、核心链路 7（36-42，setup code 初始化→登录→建项目→写 blob→回读一致、setup code 生命周期、server_id 重启持久）、日志与发布后置 7（43-49，Setup code 日志行、无阻断性错误、进程 UID、镜像静态属性复核、desktop-latest 隔离、Server 人工恢复路径、桌面 updater 失败语义）。环境分档 local/staging/production。覆盖度校验：健康检查/核心入口/数据库迁移/静态资源/配置与密钥/关键链路/日志与监控 全部已覆盖；未覆盖并写明原因 6 项（auto-updater 真实升级成功路径属 manual-only、Windows Authenticode 未接线、macOS 签名公证依赖运维凭据、Litestream 复制与恢复演练未定义断言、外部仓库超出本仓库可证范围、S3 对象删除恢复属破坏性动作） —— 执行(test-smoke)
审查结论(通过): 独立复验：磁盘读回确认 49 条 SMOKE-delivery-01-NN 用例、三档环境范围表、覆盖度校验逐项对应用例编号；口径块明确「预期结果为设计值、不得预填 PASS」；部署资产路径抽查全部命中（deploy/server/ 下 docker-compose.yml、Caddyfile、litestream.yml、install.sh、smoke-test.sh 均存在）；未覆盖监控项的理由声明成立（部署方案未定义监控点，不发明新检查项） —— 监督(malp-architect)

### 22. 产出 core P0 场景测试用例 delta（7 份）
- 派单: 监督(malp-architect) 2026-11-10
- 预算档: L
- 任务书: runbook：① 输入只读 inventory.md + 该场景的时序 delta（deltas/prd/3-technical-plan/2-scenario-implementation/）+ 需求 delta（deltas/prd/1-product-requirements/）+ 功能规格 delta（deltas/prd/2-product-design/1-feature-specs/）+ 已就绪的 deltas/api/ 与 deltas/database/；② 产出到 deltas/test/，文件名 `<模块>-S<编号>-test-cases.md`；③ 每份文件开头写 `## ADDED — S<编号> <场景名> 测试用例（现状基线）` 并附口径块（基线 桌面 0.4.11 绑定提交 9c307bf3c；静态盘点，未运行任何测试，不得预填 PASS）；④ 四段固定结构：一、单元测试用例（按来源分组：API 字段约束 / DB 约束 / 业务规则）；二、场景测试用例（2.1 主路径 / 2.2 异常路径 / 2.3 人工验证 [manual]）；三、覆盖度校验（逐项勾选并注明未覆盖原因）；四、验收条件追溯表（AC ID 格式 S<编号>-AC-<两位序号>，从需求文档 §四 该场景验收条件逐条取，按出现顺序连续编号，映射到覆盖用例 ID）；⑤ 用例 ID 严格为 UT-S<编号>-<两位序号> / ST-S<编号>-<两位序号>，需要人工视觉或真实终端的用例加 [manual] 后缀；⑥ 事实只来自上述输入，不得发明新需求或新 API；⑦ 全中文
- 场景: S01/S04/S07/S09/S10/S11/S12，产出 logos/changes/add-baseline-docs/deltas/test/core-S01-test-cases.md … core-S12-test-cases.md 共 7 份
- 验收: for f in core-S01 core-S04 core-S07 core-S09 core-S10 core-S11 core-S12; do p=logos/changes/add-baseline-docs/deltas/test/$f-test-cases.md; test -f $p || exit 1; grep -q '## 四、验收条件追溯' $p || exit 1; grep -q 'UT-S' $p || exit 1; grep -q 'ST-S' $p || exit 1; done
- 优先级: P0
- 里程碑: M4
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(test-core)): 1794298456
ACK(done): 产出 core P0 场景测试用例 delta 7 份到 logos/changes/add-baseline-docs/deltas/test/ —— core-S01（UT 20 / ST 11 / AC 4）、core-S04（UT 15 / ST 11 / AC 4）、core-S07（UT 25 / ST 10 / AC 4）、core-S09（UT 18 / ST 13 / AC 4）、core-S10（UT 18 / ST 12 / AC 3）、core-S11（UT 18 / ST 12 / AC 3）、core-S12（UT 33 / ST 14 / AC 3），合计 UT 147 / ST 83 / AC 25；每份均含口径块（桌面 0.4.11、提交 9c307bf3c、只读静态盘点、未运行任何测试、不预填 PASS）、一、单元测试用例（按 API 字段约束 / DB 约束 / 业务规则三组分组）、二、场景测试用例（2.1 主路径 / 2.2 异常路径含 EX↔F 分支↔AC 对照表 / 2.3 人工验证用例）、三、覆盖度校验（逐项勾选并写明未覆盖原因）、四、验收条件追溯（AC→用例双向可查）。覆盖度校验结论：正常验收条件、异常验收条件、EX 异常用例三项 7/7 场景全覆盖且每条 AC 至少映射 1 个用例；API required 字段项按契约中不可省略入参等价覆盖（API delta 为 typed IPC 契约快照，全文未使用 required 关键字，已在文中注明）；DB UNIQUE/CHECK 项仅 S12 有落点（catalog.sqlite3 format 2 的 packs.file_name、packs.encoded_size、chunks.encoding、checkpoints.snapshot_root、store_identity.singleton、store_identity.lineage 六个约束各 1 个 UT，另加 chunks.pack_id 外键与 user_version 版本约束），其余 6 个场景无 SQLite 落点（数据落普通文件与 project.json，桌面五库互不迁移），已逐份写明未覆盖原因；smoke 项因本批 7 个场景均为桌面本地功能、不涉及部署产物而写明未覆盖原因。自检已过：team-lead 指定的 7 文件存在性 + 四节标题 + UT/ST 标识校验全部通过，另经脚本校验 UT/ST ID 单文件内无重复、无跳号，AC 编号连续唯一，AC 引用与用例引用无悬空。仅新增 deltas/test/ 下 7 个新文件，未改动 logos/resources/、未改动 agent-collab/TASKS.md（回执经 lint.py ack 落盘）、未执行 git add/commit/push。 —— 执行(test-core)
审查结论(通过): 独立复验：磁盘读回确认 7 份齐备；core-S01 逐段抽查通过（UT 20 条来源精确到 API delta 章节与源码行号、追溯表 S01-AC-01~04 映射完整、覆盖度校验对「DB UNIQUE/CHECK」未覆盖项如实留空并说明原因、对「API required」说明 typed IPC 非 OpenAPI 故按等价口径覆盖）；时序 F1-F7 与测试 EX-F1 指向同一张表，术语差异可接受 —— 监督(malp-architect)

### 23. 产出 research 与 ai P0 场景测试用例 delta（3 份）
- 派单: 监督(malp-architect) 2026-11-10
- 预算档: M
- 任务书: runbook：① 输入只读 inventory.md + 该场景的时序 delta（deltas/prd/3-technical-plan/2-scenario-implementation/）+ 需求 delta（deltas/prd/1-product-requirements/）+ 功能规格 delta（deltas/prd/2-product-design/1-feature-specs/）+ 已就绪的 deltas/api/ 与 deltas/database/；② 产出到 deltas/test/，文件名 `<模块>-S<编号>-test-cases.md`；③ 每份文件开头写 `## ADDED — S<编号> <场景名> 测试用例（现状基线）` 并附口径块（基线 桌面 0.4.11 绑定提交 9c307bf3c；静态盘点，未运行任何测试，不得预填 PASS）；④ 四段固定结构：一、单元测试用例（按来源分组：API 字段约束 / DB 约束 / 业务规则）；二、场景测试用例（2.1 主路径 / 2.2 异常路径 / 2.3 人工验证 [manual]）；三、覆盖度校验（逐项勾选并注明未覆盖原因）；四、验收条件追溯表（AC ID 格式 S<编号>-AC-<两位序号>，从需求文档 §四 该场景验收条件逐条取，按出现顺序连续编号，映射到覆盖用例 ID）；⑤ 用例 ID 严格为 UT-S<编号>-<两位序号> / ST-S<编号>-<两位序号>，需要人工视觉或真实终端的用例加 [manual] 后缀；⑥ 事实只来自上述输入，不得发明新需求或新 API；⑦ 全中文
- 场景: S16（research）、S21/S22（ai），产出 logos/changes/add-baseline-docs/deltas/test/research-S16-test-cases.md、ai-S21-test-cases.md、ai-S22-test-cases.md 共 3 份
- 验收: for f in research-S16 ai-S21 ai-S22; do p=logos/changes/add-baseline-docs/deltas/test/$f-test-cases.md; test -f $p || exit 1; grep -q '## 四、验收条件追溯' $p || exit 1; grep -q 'UT-S' $p || exit 1; grep -q 'ST-S' $p || exit 1; done
- 优先级: P0
- 里程碑: M4
- 依据: 提案 add-baseline-docs 已授权，本条目在其范围内

CLAIM(执行(test-ra)): 1794298449
ACK(done): 产出 3 份 P0 场景测试用例 delta 到 logos/changes/add-baseline-docs/deltas/test/。research-S16-test-cases.md：UT-S16-01..09（9 条）、ST-S16-01..11（11 条，含 2 条 [manual]）、AC S16-AC-01..05（5 条）；ai-S21-test-cases.md：UT-S21-01..14（14 条）、ST-S21-01..12（12 条，含 2 条 [manual]）、AC S21-AC-01..04（4 条）；ai-S22-test-cases.md：UT-S22-01..14（14 条）、ST-S22-01..10（10 条，含 2 条 [manual]）、AC S22-AC-01..03（3 条）。覆盖度校验结论：各场景 Phase 1 正常/异常/边界验收条件与 EX 异常分支全部覆盖（EX-S16 6/6、EX-S21 7/7、EX-S22 6/6），每条 AC 至少映射 1 个用例且每个 UT/ST 均已进入追溯表；API required 字段与 DB UNIQUE/CHECK 两项对三场景均判为不适用并已写明原因（事实来源中 API delta 仅覆盖 MCP localhost 与 CLI JSON 契约，属执行路径④⑤，与 S16/S21/S22 无交集；无 research/ai 模块 DB DDL 来源，catalog 体积上限与 checksum 已改置业务规则组覆盖），未空勾、未发明字段与约束。本轮为只读静态盘点，未运行任何测试，未预填 PASS。 —— 执行(test-ra)
审查结论(通过): 独立复验：磁盘读回确认 3 份齐备（research-S16/ai-S21/ai-S22）；ai-S21 保留内置 Copilot「approve-for-me」默认审批模式口径与五条 AI 执行路径不可混称声明；跨文件机械校验（用例 ID 唯一性、AC 覆盖完整性、场景号与文件名一致性）全部通过 —— 监督(malp-architect)
