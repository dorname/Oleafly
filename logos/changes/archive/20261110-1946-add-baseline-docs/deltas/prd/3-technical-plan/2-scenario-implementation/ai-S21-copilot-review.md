## ADDED — S21 内置 Copilot 修复与逐轮审阅 场景实现（现状基线）

> module: ai | 场景编号: S21（全局唯一，见 `core-00-scenario-overview.md` 编号注册表） | 优先级: P0
> 基线口径：桌面 0.4.11，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）
> 本文档为存量产品现状基线：只描述已实现行为，事实来源为提案 `logos/changes/add-baseline-docs/inventory.md` ai 段（S21 行）与 `deltas/prd/1-product-requirements/ai-01-requirements.md` §四 S21 章节。**本次为只读静态盘点，未执行任何测试**，动态行为在 verify 阶段单独取证。
> 路径归属声明：本场景是 ai 模块五条执行路径中的 **①内置 Copilot**（Oleafly 自身运行 loop + diff 审批 + turn 快照隔离），**不可与 ②ACP turn copy、③Research worktree+manifest、④无头 CLI review copy、⑤外部 MCP 无副本混称**（需求文档 §1.2）。

### 触发与前置

- **触发条件**：用户需要 AI 修复编译错误、改写段落或批量调整稿件（需求文档 S21 触发条件）。
- **前置条件**：
  - 用户已配置 provider、模型与**审批模式**；审批模式默认 `approve-for-me`（`packages/ai-tools/src/approval-risk.ts:10` `DEFAULT_APPROVAL_MODE`）；
  - 审批规则的读写路径可用——若 run 启动时审批规则**无法读取**，该 run 被终止（见「失败与降级分支」）；
  - 可选先以 **Plan 模式**做只读规划再交办实际任务；
  - 落盘变更以 **turn 快照**为隔离与回退基础，触达快照上限时行为受「边界与证据」约束。

### 参与者

| 参与者 | 形态 | 职责 | 证据 |
|---|---|---|---|
| 研究者 | 用户 | 配置 provider/模型/审批模式、交办任务、逐步审批 diff、在 turn Review 中逐文件 Undo/Redo | `docs/Citations.md` 同模块文档口径；`ChatCore.tsx` L2241-3094 |
| Copilot 对话与审批 UI | 前端（`ToolConfirm.tsx`） | 呈现工具确认卡（write/shell 询问、Ask 另问 network）、diff 审批交互 | `ToolConfirm.tsx` L268-338 |
| Copilot 会话内核 | 前端（`ChatCore.tsx`） | 运行 agent loop、驱动工具调用、承接编译报错后的继续修复 | `ChatCore.tsx` L2241-3094 |
| 审批风险判定 | 前端（`packages/ai-tools/src/approval-risk.ts`） | 依据审批模式与工具类别判定询问/放行/拒绝；deny 始终优先 | `approval-risk.ts` L10, L64-129 |
| 审批规则存储 | Rust（`approvals.rs`） | 读取与保存审批规则；读取失败触发 run 终止 | `approvals.rs` L238-258 |
| turn 快照存储 | Rust（`agent_turns.rs`） | 记录每个 turn 的文件变更快照，供 turn Review 的逐文件 Undo/Redo | `agent_turns.rs` L143-177, L1501-1557 |
| 编译引擎 | 引擎进程 | 在同一会话内产出编译报错，供 Copilot 继续修复 | `inventory.md` ai 段 S21 主路径 |
| 项目文件 | 文件系统 | diff 审批通过后的落盘目标；turn 快照的还原对象 | `inventory.md` ai 段 S21 边界 |

### 主时序

1. **UI** — 用户配置 provider、模型与审批模式；审批模式默认 `approve-for-me`，write/shell 触发询问，Ask 模式另问 network，**deny 始终优先**。
2. **Rust（approvals.rs）** — run 启动时读取审批规则；读取失败则该 run 直接终止。
3. **UI** — 用户交办任务；可先以 Plan 模式做只读规划（Plan 只读**不等于离线**，见「边界与证据」）。
4. **Copilot 会话内核** — Oleafly 自身运行 agent loop，产出工具调用请求。
5. **审批风险判定** — 按工具类别（write / shell / network / 其他）判定询问、允许或拒绝。
6. **UI（ToolConfirm.tsx）** — 对需询问的变更展示**确认卡与 diff**，由用户逐步审批。
7. **项目文件** — 审批通过后变更落盘；拒绝则不落盘并按 deny 处理。
8. **引擎进程** — 触发编译并回传报错。
9. **Copilot 会话内核** — 在**同一会话中**依据编译报错继续修复，回到步骤 4。
10. **Rust（agent_turns.rs）** — 记录该 turn 的变更快照。
11. **UI** — 用户在 turn Review 中**逐文件**执行 Undo / Redo。

```mermaid
sequenceDiagram
    autonumber
    actor R as 研究者
    participant UI as Copilot UI (ToolConfirm/ChatCore)
    participant AR as 审批风险判定 (approval-risk.ts)
    participant AP as 审批规则 (approvals.rs)
    participant LOOP as Copilot loop (ChatCore)
    participant SNAP as turn 快照 (agent_turns.rs)
    participant ENG as 编译引擎
    participant FS as 项目文件

    R->>UI: 配置 provider / 模型 / 审批模式（默认 approve-for-me）
    UI->>AP: run 启动读取审批规则
    alt 审批规则读取失败
        AP-->>UI: 读取失败
        UI-->>R: 终止该 run（不在缺规则约束下继续）
    else 规则读取成功
        AP-->>UI: 规则可用
        R->>UI: 交办任务（可先 Plan 只读规划）
        loop 每次工具调用
            LOOP->>AR: 判定工具类别（write/shell/network）
            AR-->>LOOP: 询问 / 允许 / 拒绝（deny 优先）
            alt 需要询问
                LOOP->>UI: 展示确认卡 + diff
                R->>UI: 逐步审批
                UI-->>LOOP: 批准 / 拒绝
            end
            alt 批准
                LOOP->>FS: 落盘变更
                LOOP->>ENG: 触发编译
                ENG-->>LOOP: 编译报错
                LOOP->>LOOP: 同会话继续修复
            end
            LOOP->>SNAP: 记录本 turn 变更快照
        end
        R->>UI: turn Review 中逐文件 Undo / Redo
        UI->>SNAP: 读取该 turn 的文件级变更
        SNAP-->>UI: 可回退 / 可恢复的文件集合
        UI->>FS: 按文件回退或恢复
    end
```

### 失败与降级分支

逐条对应需求文档 `ai-01-requirements.md` §四 S21 验收条件中的「异常」与「边界」：

| 分支 | 触发条件 | 行为（基线口径） | 证据 |
|---|---|---|---|
| 审批规则读取失败 | run 启动时审批规则无法读取 | 该 run **被终止**，不得在缺失审批规则约束的情况下继续执行 | `approvals.rs` L238-258；`approval-risk.ts` L64-129 |
| 工具调用被 deny | 审批规则判定拒绝该工具调用 | deny **始终优先**于询问与放行；变更不落盘 | `approval-risk.ts` L10, L64-129 |
| 用户拒绝 diff 审批 | 用户在确认卡上拒绝该步变更 | 该步不落盘，loop 按拒绝结果继续 | `ToolConfirm.tsx` L268-338 |
| 切换项目 | 用户在旧项目 run 进行中切换到另一个项目 | 旧项目的**进行中调用不再执行** | `inventory.md` ai 段 S21 边界；`agent_turns.rs` L143-177 |
| Undo 不可用 | 目标文件已提交 / 与其他变更重叠 / 事后被再次编辑 | Undo **只处理未提交、未与其他变更重叠、未再编辑**的文件；其余文件不进入可回退集合 | `agent_turns.rs` L1501-1557 |
| 编译失败 | 引擎回传编译报错 | 报错在**同一会话中继续修复**，不要求用户新开会话 | `ChatCore.tsx` L2241-3094 |
| 快照越界 | 单 turn 变更量超出上限 | 受快照上限约束（见「边界与证据」），不承诺无限量回退 | `agent_turns.rs` L143-177 |

### 边界与证据

- **Plan 只读 ≠ 离线**：Plan 模式的"只读"**不等于离线**——仍包含文献检索等**网络读取**，不得宣传为离线模式（需求文档 §四 S21 边界；`inventory.md` ai 段 S21）。
- **默认审批矩阵**：审批模式默认 `approve-for-me`；write/shell 询问、Ask 另问 network、deny 始终优先（`packages/ai-tools/src/approval-risk.ts:10` `DEFAULT_APPROVAL_MODE`）。
- **快照上限**：turn 快照上限为 20000 文件 / 单文件 25MiB / 单 turn 512MiB / 总量 1GiB；保留 100 turns / 14 天（`inventory.md` ai 段 S21）。
- **隔离机制归属**：本场景的隔离机制是 **turn 快照**，与 ACP 的 turn copy、Research Task 的 worktree+manifest、无头 CLI 的 review copy、外部 MCP 的无副本**互不等价**（需求文档 §1.2、§5.1）。
- **职责边界**：本场景只覆盖内置 Copilot（路径 ①）；无头 CLI 属 S23、模型目录属 S24、ACP 属 S25、Research Task 属 S26、MCP 属 S27、Computer Use 属 S28。
- **实现证据**：
  - `packages/ai-tools/src/approval-risk.ts` L10（`DEFAULT_APPROVAL_MODE`）、L64-129（审批判定）；
  - `src/.../ToolConfirm.tsx` L268-338（确认卡与 diff 审批）；
  - `src/.../ChatCore.tsx` L2241-3094（会话内核与 loop）；
  - `approvals.rs` L238-258（审批规则读取）；`agent_turns.rs` L143-177, L1501-1557（turn 快照与逐文件回退）。
- **动态验证声明**：本基线为静态盘点，上述行为**未在本次执行任何测试**；真实模型调用与 diff 审批链路的断言结果需在 verify 阶段取证，不得预填 PASS。
