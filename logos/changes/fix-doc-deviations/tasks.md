# 实现任务

## [delta] 规格变更

> 基线规格偏差标注转终态：待办指向型标注（文档待回补 / 回补另立变更 / 文档写 X / 概括过宽）更新为「已由 fix-doc-deviations 回补」；溯源引用型标注（文件头事实来源）保留不动。验收条件与用例断言本身不变。

- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/core-01-requirements.md` — D1/D3/D5 标注转终态（S03 引擎筛选、S09 PDF 保留、S05 非英语校对三处括号标注）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` — D1/D3/D5 标注转终态（L79/L131/L240 三处）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md` — D5/D6/D7/D8/D9/D10 六处标注转终态（D6 从「状态无法确认」升级为「已确认未实现，文档表述准确」）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S09-pdf-preview-synctex.md` — D3 标注转终态（L90 失败路径口径句）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/research-01-requirements.md` — D4 标注转终态（「UI 入口待确认」升级为「已确认」，L84-85）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md` — D4 标注转终态（L29）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/research-S16-citation-search.md` — D4 标注转终态（L6 回补另立变更 + L76 待确认口径）
- [x] 产出 delta 文件到 `deltas/test/research-S16-test-cases.md` — D4 用例前提更新（ST-S16-11 [manual] 与 S16-AC-05 的「UI 入口待确认」升级为「已确认」，L66/L86）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/ai-01-requirements.md` — D7/D8/D9/D10 标注转终态（L170/L187/L225/L250/L287 五处）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md` — D7/D8/D9/D10 标注转终态（L13/L118/L132/L147/L173/L200 六处）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md` — D8/D10 标注转终态（L233 mcp.md 不符表述、L269）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/collab-01-requirements.md` — D12 标注转终态（L169/L427 两处）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` — D12 标注转终态（L43/L112 两处）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S29-server-onboarding.md` — D12 标注转终态（L6/L85 两处）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S32-offline-merge-review.md` — D12 标注转终态（L6/L77 两处）
- [x] 产出 delta 文件到 `deltas/test/collab-S29-test-cases.md` — D12 口径声明引用更新（L72）
- [x] 产出 delta 文件到 `deltas/test/collab-S32-test-cases.md` — D12 口径声明引用更新（L9/L65 两处）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/delivery-01-requirements.md` — D11 标注转终态（L169）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md` — D11 标注转终态（L87/L101/L120 三处）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md` — D1-D12 汇总标注转终态（L133；全量排查补充的第 20 份文件）

## [code] 代码实现

- [ ] 实现代码变更