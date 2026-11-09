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
