## ADDED — Oleafly 场景总览（现状基线，编号注册表）

> 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`，CLI crate `0.1.0`。
> 证据来源：`logos/changes/add-baseline-docs/inventory.md`（只读静态盘点，未运行任何测试）与六份模块需求文档 `deltas/prd/1-product-requirements/*-01-requirements.md` 的「三、场景总览」表。
> 本文档为**现状基线**，只登记已实现场景，不新增、不发明能力；各场景行为、异常与边界以对应需求文档、功能规格与时序文档为准。
> 场景编号为**全局唯一编号（S01-S52）**，全部分配后 `scenario_counter.next_id = 53`。
> 痛点编号（`P01`…`P09`）为**模块内局部编号**，不同模块可复用同一编号而含义不同，本文一律以「模块 / Pxx」形式书写以消歧。

# Oleafly 场景总览（现状基线，编号注册表）

## 一、全场景表（S01-S52）

| 编号 | 名称 | 所属模块 | 优先级 | 关联痛点 | 需求文档章节 | 功能规格章节 | 时序文档 |
|---|---|---|---|---|---|---|---|
| S01 | 从模板或外部资料创建研究项目 | core | P0 | core / P01 工具链碎片化 | core-01-requirements.md §四 S01 | core-01-feature-specs.md §S01 | core-S01-project-create-import.md |
| S02 | 从 arXiv 或 Git 仓库导入项目 | core | P1 | core / P01 工具链碎片化 | core-01-requirements.md §四 S02 | core-01-feature-specs.md §S02 | 本基线未单独产出时序 |
| S03 | 项目库检索与恢复 | core | P1 | core / P01 工具链碎片化 | core-01-requirements.md §四 S03 | core-01-feature-specs.md §S03 | 本基线未单独产出时序 |
| S04 | 多文件研究写作（源码/可视） | core | P0 | core / P01 工具链碎片化 | core-01-requirements.md §四 S04 | core-01-feature-specs.md §S04 | core-S04-multifile-authoring.md |
| S05 | 本地拼写语法校对 | core | P1 | core / P04 投稿规范核对繁琐 | core-01-requirements.md §四 S05 | core-01-feature-specs.md §S05 | 本基线未单独产出时序 |
| S06 | 图表绘制与插入 | core | P1 | core / P01 工具链碎片化 | core-01-requirements.md §四 S06 | core-01-feature-specs.md §S06 | 本基线未单独产出时序 |
| S07 | 编译引擎选择与工具链修复 | core | P0 | core / P02 编译环境配置复杂 | core-01-requirements.md §四 S07 | core-01-feature-specs.md §S07 | core-S07-compile-engines.md |
| S08 | 可复现代码文档（Quarto/Calepin） | core | P1 | core / P02 编译环境配置复杂 | core-01-requirements.md §四 S08 | core-01-feature-specs.md §S08 | 本基线未单独产出时序 |
| S09 | PDF 预览与源文核对演示 | core | P0 | core / P01 工具链碎片化 | core-01-requirements.md §四 S09 | core-01-feature-specs.md §S09 | core-S09-pdf-preview-synctex.md |
| S10 | 投稿前预检 | core | P0 | core / P04 投稿规范核对繁琐 | core-01-requirements.md §四 S10 | core-01-feature-specs.md §S10 | core-S10-preflight.md |
| S11 | 导出交付物 | core | P0 | core / P04 投稿规范核对繁琐 | core-01-requirements.md §四 S11 | core-01-feature-specs.md §S11 | core-S11-export.md |
| S12 | 检查点恢复与加密迁移 | core | P0 | core / P03 版本安全与可恢复性差 | core-01-requirements.md §四 S12 | core-01-feature-specs.md §S12 | core-S12-checkpoints.md |
| S13 | 本地 Git 版本管理与发布 | core | P1 | core / P03 版本安全与可恢复性差 | core-01-requirements.md §四 S13 | core-01-feature-specs.md §S13 | 本基线未单独产出时序 |
| S14 | 确定性格式转换 | core | P1 | core / P01 工具链碎片化 | core-01-requirements.md §四 S14 | core-01-feature-specs.md §S14 | 本基线未单独产出时序 |
| S15 | 终端与命令面板 | core | P2 | core / P01 工具链碎片化 | core-01-requirements.md §四 S15 | core-01-feature-specs.md §S15 | 本基线未单独产出时序 |
| S16 | 文献检索与引用写入 | research | P0 | research / P05 文献检索与引用整理碎片化 | research-01-requirements.md §四 S16 | research-01-feature-specs.md §S16 | research-S16-citation-search.md |
| S17 | Zotero 文献库集成 | research | P1 | research / P06 Zotero 文献库与写作脱节 | research-01-requirements.md §四 S17 | research-01-feature-specs.md §S17 | 本基线未单独产出时序 |
| S18 | 草稿文献发现与 AI 评审 | research | P2 | research / P07 草稿「该引而未引」发现靠人工 | research-01-requirements.md §四 S18 | research-01-feature-specs.md §S18 | 本基线未单独产出时序 |
| S19 | 图像与扫描件 OCR 转换 | research | P1 | research / P08 扫描件与图像内容不可用 | research-01-requirements.md §四 S19 | research-01-feature-specs.md §S19 | 本基线未单独产出时序 |
| S20 | 研究规划与本地统计工具 | research | P2 | research / P09 研究规划与统计速算工具分散 | research-01-requirements.md §四 S20 | research-01-feature-specs.md §S20 | 本基线未单独产出时序 |
| S21 | 内置 Copilot 修复与逐轮审阅 | ai | P0 | ai / P01 重复性研究与写作劳动密集、ai / P02 AI 修改失控与不可回退的顾虑 | ai-01-requirements.md §四 S21 | ai-01-feature-specs.md §S21 | ai-S21-copilot-review.md |
| S22 | 研究 Skills 调用 | ai | P0 | ai / P01 重复性研究与写作劳动密集 | ai-01-requirements.md §四 S22 | ai-01-feature-specs.md §S22 | ai-S22-research-skills.md |
| S23 | 无头 CLI 只读分析与受控写入 | ai | P1 | ai / P01 重复性研究与写作劳动密集、ai / P02 AI 修改失控与不可回退的顾虑 | ai-01-requirements.md §四 S23 | ai-01-feature-specs.md §S23 | 本基线未单独产出时序 |
| S24 | 模型目录与信任状态管理 | ai | P1 | ai / P04 数据越界与安全风险 | ai-01-requirements.md §四 S24 | ai-01-feature-specs.md §S24 | 本基线未单独产出时序 |
| S25 | 外部 CLI agent（ACP）接入 | ai | P1 | ai / P03 外部 AI 工具与项目上下文割裂 | ai-01-requirements.md §四 S25 | ai-01-feature-specs.md §S25 | 本基线未单独产出时序 |
| S26 | Research Task 隔离执行 | ai | P1 | ai / P01 重复性研究与写作劳动密集、ai / P02 AI 修改失控与不可回退的顾虑 | ai-01-requirements.md §四 S26 | ai-01-feature-specs.md §S26 | 本基线未单独产出时序 |
| S27 | MCP 双向集成 | ai | P1 | ai / P03 外部 AI 工具与项目上下文割裂、ai / P04 数据越界与安全风险 | ai-01-requirements.md §四 S27 | ai-01-feature-specs.md §S27 | 本基线未单独产出时序 |
| S28 | Computer Use 白名单操作 | ai | P2 | ai / P01 重复性研究与写作劳动密集、ai / P04 数据越界与安全风险 | ai-01-requirements.md §四 S28 | ai-01-feature-specs.md §S28 | 本基线未单独产出时序 |
| S29 | 服务器接入与项目共享 | collab | P0 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S29 | collab-01-feature-specs.md §S29 | collab-S29-server-onboarding.md |
| S30 | 实时共同编辑 | collab | P0 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S30 | collab-01-feature-specs.md §S30 | collab-S30-live-coediting.md |
| S31 | 断线重连与增量补发 | collab | P0 | collab / P04 断网与冲突破坏协作 | collab-01-requirements.md §四 S31 | collab-01-feature-specs.md §S31 | collab-S31-reconnect-resync.md |
| S32 | 离线冲突合并与审查 | collab | P0 | collab / P04 断网与冲突破坏协作 | collab-01-requirements.md §四 S32 | collab-01-feature-specs.md §S32 | collab-S32-offline-merge-review.md |
| S33 | 协作角色权限边界 | collab | P0 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S33 | collab-01-feature-specs.md §S33 | collab-S33-role-permissions.md |
| S34 | 评论建议与项目聊天 | collab | P0 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S34 | collab-01-feature-specs.md §S34 | collab-S34-comments-suggestions.md |
| S35 | 共享历史与版本恢复 | collab | P0 | collab / P04 断网与冲突破坏协作 | collab-01-requirements.md §四 S35 | collab-01-feature-specs.md §S35 | collab-S35-shared-history.md |
| S36 | Guest 外部协作者 | collab | P1 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S36 | collab-01-feature-specs.md §S36 | 本基线未单独产出时序 |
| S37 | 访问日志与管理控制台 | collab | P1 | collab / P03 协作过程不透明 | collab-01-requirements.md §四 S37 | collab-01-feature-specs.md §S37 | 本基线未单独产出时序 |
| S38 | 通知邮件与配额限制 | collab | P1 | collab / P03 协作过程不透明 | collab-01-requirements.md §四 S38 | collab-01-feature-specs.md §S38 | 本基线未单独产出时序 |
| S39 | 服务端备份与恢复 | collab | P1 | collab / P02 协作数据安全预期错位 | collab-01-requirements.md §四 S39 | collab-01-feature-specs.md §S39 | 本基线未单独产出时序 |
| S40 | 浏览器实时协作 | collab | P0 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S40 | collab-01-feature-specs.md §S40 | collab-S40-browser-collab.md |
| S41 | 浏览器会话安全 | collab | P0 | collab / P02 协作数据安全预期错位 | collab-01-requirements.md §四 S41 | collab-01-feature-specs.md §S41 | collab-S41-browser-session.md |
| S42 | 浏览器输出查看 | collab | P1 | collab / P01 多人协作靠传文件 | collab-01-requirements.md §四 S42 | collab-01-feature-specs.md §S42 | 本基线未单独产出时序 |
| S43 | 云同步多设备协作 | sync | P0 | sync / P01 多设备工作上下文割裂 | sync-01-requirements.md §四 S43 | sync-01-feature-specs.md §S43 | sync-S43-cloud-sync.md |
| S44 | 冲突副本与三方合并 | sync | P0 | sync / P01 多设备工作上下文割裂 | sync-01-requirements.md §四 S44 | sync-01-feature-specs.md §S44 | sync-S44-conflict-copies.md |
| S45 | 批量删除保护与回收站 | sync | P0 | sync / P02 跨设备误删放大 | sync-01-requirements.md §四 S45 | sync-01-feature-specs.md §S45 | sync-S45-mass-delete-guard.md |
| S46 | 云账户切换与断开 | sync | P1 | sync / P01 多设备工作上下文割裂 | sync-01-requirements.md §四 S46 | sync-01-feature-specs.md §S46 | 本基线未单独产出时序 |
| S47 | 在线 LaTeX 服务项目导入 | sync | P1 | sync / P03 在线平台锁定 | sync-01-requirements.md §四 S47 | sync-01-feature-specs.md §S47 | 本基线未单独产出时序 |
| S48 | 在线服务 Git 桥双向同步 | sync | P0 | sync / P03 在线平台锁定 | sync-01-requirements.md §四 S48 | sync-01-feature-specs.md §S48 | sync-S48-online-git-bridge.md |
| S49 | 外部连接器凭据安全 | sync | P1 | sync / P04 外部凭据散落 | sync-01-requirements.md §四 S49 | sync-01-feature-specs.md §S49 | 本基线未单独产出时序 |
| S50 | 桌面发布与自动更新 | delivery | P1 | delivery / P01 跨平台发布流程繁琐易错、delivery / P02 更新分发信任链不清 | delivery-01-requirements.md §四 S50 | delivery-01-feature-specs.md §S50 | 本基线未单独产出时序 |
| S51 | Server 部署与运维恢复 | delivery | P1 | delivery / P03 自托管部署与运维门槛高 | delivery-01-requirements.md §四 S51 | delivery-01-feature-specs.md §S51 | 本基线未单独产出时序 |
| S52 | CLI 独立发布分发 | delivery | P2 | delivery / P04 多端版本线混淆 | delivery-01-requirements.md §四 S52 | delivery-01-feature-specs.md §S52 | 本基线未单独产出时序 |

### 1.1 场景编号与模块分布核对

| 模块 | 编号区间 | 场景数 | P0 | P1 | P2 |
|---|---|---|---|---|---|
| core | S01-S15 | 15 | 7（S01/S04/S07/S09/S10/S11/S12） | 7（S02/S03/S05/S06/S08/S13/S14） | 1（S15） |
| research | S16-S20 | 5 | 1（S16） | 2（S17/S19） | 2（S18/S20） |
| ai | S21-S28 | 8 | 2（S21/S22） | 5（S23/S24/S25/S26/S27） | 1（S28） |
| collab | S29-S42 | 14 | 9（S29/S30/S31/S32/S33/S34/S35/S40/S41） | 5（S36/S37/S38/S39/S42） | 0 |
| sync | S43-S49 | 7 | 4（S43/S44/S45/S48） | 3（S46/S47/S49） | 0 |
| delivery | S50-S52 | 3 | 0 | 2（S50/S51） | 1（S52） |
| **合计** | **S01-S52** | **52** | **23** | **24** | **5** |

### 1.2 P0 场景清单（23 项）

S01、S04、S07、S09、S10、S11、S12、S16、S21、S22、S29、S30、S31、S32、S33、S34、S35、S40、S41、S43、S44、S45、S48。

## 二、编号规则

1. **全局唯一序列**：场景编号取自 `S01-S52` 的单一全局连续序列，跨模块共用同一序列。编号一经分配即绑定该场景的身份与标题，后续需求文档、功能规格、时序文档、测试用例、编排测试一律引用该编号，不得另起别名。
2. **`next_id = 53`**：本基线全部分配完成后，`logos-project.yaml` 的 `scenario_counter.next_id` 置为 `53`。下一个新增场景必须从 `S53` 起，不得回填 `S01-S52` 中的任何空位。
3. **严禁各模块从 S01 重开**：core（S01-S15）、research（S16-S20）、ai（S21-S28）、collab（S29-S42）、sync（S43-S49）、delivery（S50-S52）的区间是同一条全局序列的连续切片，不是六条独立序列。新增模块时**必须从 `next_id` 继续分配**，不得以模块名重新起号；模块区间会随新增场景自然延展，已分配区间的起始编号不可移动。
4. **废弃编号不回收**：场景被废弃、合并或重命名时，原编号作废并保留为空洞，**不回收复用**；复用会让历史测试用例、编排脚本与 trace 记录指向错误场景。废弃需在对应文档中注明「编号作废，原标题为 X」，新场景一律取新号。
5. **编号与模块前缀的分工**：场景编号（SXX）表示全局身份；文件名前缀（`core-` / `research-` / `ai-` / `collab-` / `sync-` / `delivery-`）表示模块归属与文件命名。二者不可互换，不得由文件前缀反推编号。
6. **时序文档命名约定**：`<模块前缀>-SXX-<slug>.md`，如 `core-S01-project-create-import.md`。本基线仅对 23 个 P0 场景产出独立时序文档；其余 29 个场景的「时序文档」列统一标注「本基线未单独产出时序」，其行为仍以需求文档与功能规格为准，不得据此推断该场景不存在或未实现。

## 三、场景到时序文档映射（23 份 P0 时序文件）

时序文档统一位于 `deltas/prd/3-technical-plan/2-scenario-implementation/`。

| 时序文件名 | 场景编号 | 场景名称 | 所属模块 |
|---|---|---|---|
| core-S01-project-create-import.md | S01 | 从模板或外部资料创建研究项目 | core |
| core-S04-multifile-authoring.md | S04 | 多文件研究写作（源码/可视） | core |
| core-S07-compile-engines.md | S07 | 编译引擎选择与工具链修复 | core |
| core-S09-pdf-preview-synctex.md | S09 | PDF 预览与源文核对演示 | core |
| core-S10-preflight.md | S10 | 投稿前预检 | core |
| core-S11-export.md | S11 | 导出交付物 | core |
| core-S12-checkpoints.md | S12 | 检查点恢复与加密迁移 | core |
| research-S16-citation-search.md | S16 | 文献检索与引用写入 | research |
| ai-S21-copilot-review.md | S21 | 内置 Copilot 修复与逐轮审阅 | ai |
| ai-S22-research-skills.md | S22 | 研究 Skills 调用 | ai |
| collab-S29-server-onboarding.md | S29 | 服务器接入与项目共享 | collab |
| collab-S30-live-coediting.md | S30 | 实时共同编辑 | collab |
| collab-S31-reconnect-resync.md | S31 | 断线重连与增量补发 | collab |
| collab-S32-offline-merge-review.md | S32 | 离线冲突合并与审查 | collab |
| collab-S33-role-permissions.md | S33 | 协作角色权限边界 | collab |
| collab-S34-comments-suggestions.md | S34 | 评论建议与项目聊天 | collab |
| collab-S35-shared-history.md | S35 | 共享历史与版本恢复 | collab |
| collab-S40-browser-collab.md | S40 | 浏览器实时协作 | collab |
| collab-S41-browser-session.md | S41 | 浏览器会话安全 | collab |
| sync-S43-cloud-sync.md | S43 | 云同步多设备协作 | sync |
| sync-S44-conflict-copies.md | S44 | 冲突副本与三方合并 | sync |
| sync-S45-mass-delete-guard.md | S45 | 批量删除保护与回收站 | sync |
| sync-S48-online-git-bridge.md | S48 | 在线服务 Git 桥双向同步 | sync |

### 3.1 未单独产出时序的场景（29 项）

S02、S03、S05、S06、S08、S13、S14、S15、S17、S18、S19、S20、S23、S24、S25、S26、S27、S28、S36、S37、S38、S39、S42、S46、S47、S49、S50、S51、S52。

这些场景在本次基线中**只有需求文档与功能规格**，没有独立的时序文档；后续如需补齐时序，须沿用同一编号并遵守上述命名约定，不得重新分配编号。

## 四、边界声明

- 本文档为**现状基线**，只做场景登记与编号注册，不新增功能、不修改场景定义。
- 场景行为、异常与边界的唯一依据是各模块需求文档与功能规格；本文的名称、模块归属、优先级与痛点关联均转录自需求文档「三、场景总览」表。
- 基线为**静态盘点**，本次执行未运行任何测试；文档与实现的偏差（D1-D12）按实现记录，文档回补另立变更，见 `inventory.md`。
- 关联痛点编号为模块内局部编号，跨模块含义不同，引用时须带模块前缀。
