<!-- fix-doc-deviations: D12 标注转终态 -->

## MODIFIED — S32 离线冲突合并与审查 测试用例（现状基线）


> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S32 行与偏差 D12、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S32 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S32 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S32-offline-merge-review.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：本场景的「离线合并审查」是 Loro/OT 文本自动合并 + **只读** Merge Review；sync 模块的「冲突副本 / 三方合并（merge3）」是**另一套正交机制**，二者不得混称、不得互相引用为同一能力。
> - 偏差 D12（已回补）：README 曾以「asks before it applies anything」概括**过宽**；实际行为是**自动合并 + 只读审查**，并非所有重叠文本都要求人工二选一；README 已由 fix-doc-deviations 对齐。
> - 合并语义边界：自动合并只适用于**文本**；二进制与路径冲突走「保留双方副本 + 通知」，不由引擎判定胜方。
> - 失败语义边界：写盘失败走**退避 + 通知**；大批量外部磁盘变化走**同步暂停 + 用户选择**，二者是不同机制，不得混称。

---


## MODIFIED — 1.3 来源分组：业务规则（自动合并、只读审查、副本保留、同步暂停、写盘失败退避）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S32-19 | 重叠文本由 **Loro/OT 自动合并**产出唯一合并结果（必要时 rebase 一侧操作到另一侧基线） | 需求 §四 S32「正常」；场景实现 §三 Step 3、§五 | 两端离线各改同一文本 | 执行合并 | 得到唯一合并结果；**不要求人工二选一** |
| UT-S32-20 | `rebase(base, changed, onto)` 在无法直接套用时把一侧操作重放到另一侧基线上 | 场景实现 §三 Step 3；`merge.rs`（`rebase`） | 两侧编辑基于不同基线 | 调用 rebase | 返回重放后的操作或 `None`（不可重放时不产出错误内容） |
| UT-S32-21 | `diff(old, new)` 与 `distance(old, new)` 提供合并结果的差异与距离度量，且有预算上限（`DIFF_BUDGET = 400ms`、`DISTANCE_BUDGET = 40ms`） | 场景实现 §五「审查边界」；`merge.rs`（`diff` / `distance`） | 存在大文本差异 | 计算 diff / distance | 在预算内返回结果；超大差异不被无限计算拖住 |
| UT-S32-22 | **Merge Review 是只读的**：可查看文件、变更量、作者与 diff，**不提供在此编辑合并结果的入口** | 需求 §四 S32；场景实现 §五「审查边界」 | 打开 Merge Review | 尝试在审查界面编辑合并结果 | 无编辑入口；合并结果只能通过新的 change 变更 |
| UT-S32-23 | Merge Review 一次最多打开 `MAX_OPEN_DIFFS = 3` 个 diff | 场景实现 §五；`MergeReviewDialog.tsx`（`MAX_OPEN_DIFFS`） | 合并涉及多个文件 | 打开全部 diff | 打开的 diff 数不超过上限；界面明示该上限 |
| UT-S32-24 | Merge Review 按**作者**归并变更归属（`authors` / `accountId` 维度） | 场景实现 §三 Step 5、§五 | 合并涉及多作者 | 查看审查面板 | 每条变更可归属到作者 |
| UT-S32-25 | 二进制文件或路径冲突**保留双方副本并通知用户**，不静默覆盖任一侧 | 需求 §四 S32「异常：二进制/路径冲突」；场景实现 §三 Step 6 | 冲突对象为二进制或路径 | 执行同步 | 双方副本均被保留；用户收到通知；任一侧都不被静默覆盖 |
| UT-S32-26 | 副本命名带短哈希标记（`SHORT_HASH = 6`），可区分双方版本 | 场景实现 §三 Step 6；`kept.rs`（`copy_name`） | 产生冲突副本 | 生成副本名 | 副本名含来源标识与短哈希；不互相覆盖 |
| UT-S32-27 | 大批量外部磁盘变化进入**同步暂停**，由用户选择 `Send` / `Keep local`（`SyncDecision::Send` / `SyncDecision::KeepLocal`） | 需求 §四 S32「异常：大批量外部磁盘变化」；场景实现 §三 Step 7 | 项目目录被外部工具批量改写 | 触发同步 | 引擎进入暂停态并提示；未获用户选择前不擅自发送或覆盖 |
| UT-S32-28 | 同步暂停状态以 `sync-hold.json` 持久化，保留副本目录为 `sync-kept` | 场景实现 §三 Step 7；`sync_hold.rs`（`HOLD_FILE` / `KEPT_DIR`） | 已进入暂停 | 检查项目协作目录 | 暂停状态与保留副本可在磁盘上被找到；重启后可恢复该状态 |
| UT-S32-29 | `Keep local` 决策保留本地不动；`Send` 决策把本地变化发上去 | 场景实现 §三 Step 7；`sync_hold.rs`（`decide`） | 处于同步暂停 | 分别选择两种决策 | 两种决策均有确定结果；`Keep local` 不发送本地变化；`Send` 执行导入发送 |
| UT-S32-30 | 同步暂停**只针对大批量外部磁盘变化**这一类情形，不作为常规冲突的处理方式 | 场景实现 §五「暂停边界」 | 常规文本重叠冲突 | 执行冲突处理 | 不进入暂停流程；走自动合并路径 |
| UT-S32-31 | 写盘失败时**退避并通知**，变更不静默丢弃 | 需求 §四 S32「异常：写盘失败」；场景实现 §三 Step 8 | 本地文件不可写 | 触发写盘 | 进入退避重试并向用户提示写盘失败；变更不丢失 |
| UT-S32-32 | 写盘失败退避与「用户选择 Send / Keep local」是**不同机制**，二者不得混称 | 场景实现 §五「失败语义边界」 | 分别触发两种情形 | 观察行为差异 | 写盘失败不弹出 Send / Keep local 选择；暂停态不静默按退避处理 |
| UT-S32-33 | 合并结果提交后仍由**服务端逐 change 校验**，客户端 UI 不是安全边界 | 场景实现 §五「权限边界」 | 提交合并结果 | 服务端校验 | 越权合并结果被拒 |
| UT-S32-34 | 项目内容**不是端到端加密**：合并内容经 Server 中转，宿主 / 磁盘 / 备份运营者可读 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；不宣称 E2E 加密 |
| UT-S32-35 | **偏差 D12 口径**：本场景只提供自动合并 + 只读审查，不提供「一切变更先询问」的承诺 | 需求 §5.1；inventory 偏差 D12（已回补） | 评估产品文案与行为 | 核对文案 | 文案与测试断言均以「自动合并 + 只读审查」为准 |
