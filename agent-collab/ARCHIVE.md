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
