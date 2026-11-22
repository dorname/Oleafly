<!-- fix-doc-deviations: D7/D8/D9/D10 标注转终态 -->

## MODIFIED — 异常：blocked 两类语义

- **GIVEN** 模型处于 blocked 状态
- **WHEN** 尝试使用
- **THEN** 区分两类：catalog blocked 一律拒绝；probe blocked 允许在**无工具 plain chat** 场景使用（原偏差 D10，docs/AICopilot.md 与 docs/ai-model-catalog.md 已对齐）

## MODIFIED — 正常：接入与会话

- **GIVEN** 用户从内置目录选择并安装某个 CLI agent，完成其自身账号登录
- **WHEN** 新建会话并下发任务
- **THEN** agent 以交互式 ACP 会话运行，turn 产生的变更进入 turn copy 供审阅；内置 agent 数量为 15 个（原偏差 D7，docs/AICopilot.md 已对齐）

## MODIFIED — 边界：预算与快照

- 非 Git 项目使用 staged snapshot 而非 worktree
- 默认预算 120 分钟、单 run 60 分钟（原偏差 D9，docs/Skills.md 已对齐）
- Windows sandbox 默认关闭；证据检查只产生警告，不是 apply 门禁

## MODIFIED — 异常：renderer 断开降级

- **GIVEN** renderer 已断开
- **WHEN** 外部 client 继续调用 native 工具
- **THEN** 仅保留 6 个只读工具，写能力不可用（原偏差 D8，docs/mcp.md 已对齐）

## MODIFIED — 5.1 技术约束

- **五条执行路径不可混称**（见 1.2）：隔离机制分别为 turn 快照 / ACP turn copy / worktree+manifest / review copy / 无副本，任何对外表述不得统一为一种"AI 沙箱"或"AI 模式"。
- **默认开关矩阵**（inventory 可查证口径）：
  - 内置 Copilot：审批模式默认 `approve-for-me`（实现证据 `packages/ai-tools/src/approval-risk.ts:10` DEFAULT_APPROVAL_MODE），write/shell 询问、Ask 另问 network、deny 始终优先，所有工具变更必须经 diff 审批落盘（S21）；
  - Skills：新技能默认开启，但 checksum 校验不替代对脚本内容的人工信任（S22）；
  - 无头 CLI：默认 write/commands/network 全为 false（S23）；
  - Research Task：默认关闭，须在 Experimentation 显式开启（S26）；
  - MCP：双向均默认关闭；对外工具写操作经审批，对外部 server 的调用默认逐次 ask，auto-approve 不含 delete（S27）；
  - Computer Use：默认全关，功能开启且白名单非空才 ready（S28）。
- 网络访问均为显式配置或显式动作：Plan 模式只读≠离线（S21）；文献搜索/DOI 核验需网络（S22）；无头 CLI 默认无网络（S23）。
- 偏差 D7/D8/D9/D10（ACP agent 数量 15、native 断开后 6 个只读工具、run 60 分钟、blocked 两类语义）按实现现状记录，文档已由 fix-doc-deviations 对齐。

## MODIFIED — 5.3 "不做"清单（本基线范围）

- 不新增任何功能或交互；只固化现状。
- 不在本模块内描述协作、云同步与交付链路（分属 collab/sync/delivery 模块）；终端 containment 与 Research 级 OS sandbox 的区别归 core（S15）表述。
- 不修复文档偏差本身（D7-D10 文档已由 fix-doc-deviations 对齐），基线一律以实现为准。
