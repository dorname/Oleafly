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
