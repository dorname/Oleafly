<!-- fix-doc-deviations: D1/D3/D5 活对照标注转已回补终态 -->

## MODIFIED — 正常：限定词检索

- **GIVEN** 项目库含多个不同引擎的项目
- **WHEN** 输入 `engine:typst is:pinned` 类组合条件
- **THEN** 结果正确过滤；引擎筛选支持 LaTeX/Typst/Markdown/Quarto/Calepin 五种（原偏差 D1，docs/ProjectLibrary.md 已对齐）

## MODIFIED — 异常：语言未安装

- **GIVEN** 所选语言词典未安装
- **WHEN** 校对运行
- **THEN** 明确报告该语言未安装，不回退到其他语言；非英语仅运行 Hunspell，grammar-only 返回 unsupported（原偏差 D5，docs/Editor.md 已对齐）

## MODIFIED — 边界：失败编译的 PDF 保留

- **GIVEN** 编译失败
- **WHEN** 预览刷新
- **THEN** 区分两种情况：无新 PDF 时保留旧文件；有经指纹验证的 best-effort PDF 时显示新文件、保持 error 状态且不更新最后成功检查点（原偏差 D3，docs/PDFPreview.md 已对齐）

## MODIFIED — 5.3 "不做"清单（本基线范围）

- 不新增任何功能或交互；只固化现状。
- 不在本模块内描述实时协作、云同步、AI 能力（分属 collab/sync/ai 模块）。
- 不修复文档偏差本身（D1-D12 文档已由 fix-doc-deviations 对齐），基线一律以实现为准。
