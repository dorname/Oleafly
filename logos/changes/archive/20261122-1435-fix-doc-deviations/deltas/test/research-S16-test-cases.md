<!-- fix-doc-deviations: D4 标注转终态（UI 入口已确认，docs/Citations.md 已回补） -->
## MODIFIED — 2.3 人工验证用例（[manual]）

> 以下用例依赖真实桌面应用的环境观察或人工审阅，无法在 CI 无头环境稳定断言，标记为 `[manual]`。`openlogos verify` 不将其计入覆盖率。

| ID | 描述 | 覆盖 Steps / EX | 验证方式 |
|----|------|-----------------|---------|
| ST-S16-10 [manual] | 检索结果面板的来源标识与 provider 不可用提示的呈现 | Step 5、EX-S16-1 | 人工在真实桌面应用触发一次含 provider 不可用的检索，观察候选列表中来源标识与不可用提示是否同时可见、是否可区分 |
| ST-S16-11 [manual] | 参考文献文件（EndNote XML / RIS / BibTeX）导入入口核对（原偏差 D4，已回补） | EX-S16-6 | 人工核对桌面应用的导入入口（`FileReferencesDialog`）与 docs/Citations.md 回补后描述一致；基线原记「实现支持、UI 入口待确认」，fix-doc-deviations 已确认入口存在 |

## MODIFIED — 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|-------|---------|---------|
| S16-AC-01 | 正常：多源检索与引用写入 — 引用插入文稿、对应条目追加至 `.bib`、多来源结果合并查重去重、key 缺失时提供补全 / 校验 / 诊断 | ST-S16-01, ST-S16-02, ST-S16-03, ST-S16-04, ST-S16-09, UT-S16-01, UT-S16-04, UT-S16-06, UT-S16-07, UT-S16-09 |
| S16-AC-02 | 异常：provider 不可用或无 Serper key — provider 不可用被显式呈现不静默吞掉；结果中不列 Google Scholar | ST-S16-05, ST-S16-06, ST-S16-10 [manual], UT-S16-02, UT-S16-03 |
| S16-AC-03 | 异常：无网络 — 仍可继续使用本地 `.bib` 完成引用写入 | ST-S16-07, UT-S16-08 |
| S16-AC-04 | 边界：批量写入失败即停 — 批量流程先停止，不静默跳过继续执行 | ST-S16-08, UT-S16-05 |
| S16-AC-05 | 边界：参考文献文件导入（原偏差 D4，已回补）— UI 入口已确认，docs/Citations.md 已补写导入说明 | ST-S16-11 [manual]（人工核对入口与文档描述一致） |
