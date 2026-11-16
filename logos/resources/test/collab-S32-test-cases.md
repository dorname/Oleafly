## S32 离线冲突合并与审查 测试用例（现状基线）

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

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（合并相关帧 / 端点 / 错误码）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S32-01 | 合并结果作为**新的 change** 提交：走 `ClientFrame::Update`（`project_id` + `envelope`），`batch_id` 由信封携带 | 协议 delta §4.2、§五；场景实现 §三 Step 4 | 合并已产出结果 | 构造合并结果提交 | 帧与信封结构合法；服务端按新变更处理并落库 |
| UT-S32-02 | 信封 `mode` 与 `key_epoch` 字段在合并提交中取值合法 | 协议 delta §五（`envelope.rs:8-27`） | 合并结果待提交 | `mode = plain`、`key_epoch = None` | 被接受；不因缺少 `key_epoch` 被拒（`e2ee` 模式下才有意义，而 Server 声明 `encryption = none`） |
| UT-S32-03 | 服务端对合并提交的变更同样**逐 change 校验角色**，合并不绕过授权 | 协议 delta §3.2；场景实现 §五「权限边界」 | 已建立会话 | 以越权角色提交合并结果 | 被拒绝（`RoleVerdict::Refused`）；不落库、不广播 |
| UT-S32-04 | 帧错误码含 `forbidden` / `not_found` / `too_large` / `comments_off`，可区分拒绝原因 | 协议 delta §4.4（`frames.rs:196-210`） | 提交被拒 | 读取错误帧 | 错误码可区分「权限不足」与「负载过大」等不同成因 |
| UT-S32-05 | `session_revoked` 帧携带可选 `reason`（`SessionEndReason`） | 协议 delta §4.3（`frames.rs:124-127`） | 会话被撤销 | 读取该帧 | `reason` 可解析；缺省时为 `None` |
| UT-S32-06 | `project_archived` 帧含 `project_id`，到达后同步终止 | 协议 delta §4.3（`frames.rs:178-181`）；场景实现 §四 | 项目被归档 | 读取该帧 | 客户端据以终止同步，不继续在失效项目上同步 |
| UT-S32-07 | 端点 `PUT/GET/HEAD /api/v1/projects/{project}/snapshot` 与 `PUT/GET /api/v1/projects/{project}/blobs/{hash}` 用于快照与 blob 传递 | API delta §四（`routes/projects.rs:59-66`） | 项目已建立 | 调用快照 / blob 端点 | 端点可用；快照序号经 `x-oleafly-snapshot-seq` 头传递 |
| UT-S32-08 | 项目标题上限 `MAX_TITLE_CHARS = 200`（合并副本若以项目标题关联亦受同一约束） | API delta §四（`routes/projects.rs:46`） | 项目已创建 | 200 / 201 字符标题 | 200 接受；201 被拒（`BadRequest`） |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S32-09 | `project_updates` UNIQUE `(project_id, batch_id)`：合并结果作为新批次提交，与既有批次不冲突 | DB delta §三 B 组；`0002_projects.sql` | 项目已有若干批次 | 以新 `batch_id` 提交合并结果 | 插入成功；`batch_id` 与既有批次不重复 |
| UT-S32-10 | `project_updates` PK `(project_id, seq)`：合并结果占用新的连续序号 | DB delta §三 B 组；`0002_projects.sql` | 项目已有若干批次 | 提交合并结果 | 写入新 `seq`；与既有行不冲突 |
| UT-S32-11 | `project_blobs` PK `(project_id, hash)`：冲突副本以内容哈希去重存放 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 插入相同 `(project_id, hash)` | 第二次被主键约束拒绝；不重复占用存储 |
| UT-S32-12 | `project_blobs.size` NOT NULL：副本大小必须记录 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 插入缺 `size` 的行 | 被 NOT NULL 拒绝 |
| UT-S32-13 | `project_blobs_used` 索引与 `used_at` 列（0009 起）支持副本回收排序 | DB delta §二（0009） | 项目已建立 | 检查索引与列 | `used_at` 存在且有索引；回收路径可按时间排序 |
| UT-S32-14 | `pending_removals` 表的 `kind` CHECK 只允许 `'file'` / `'snapshot'` | DB delta §二（0010）；`0010_storage_cleanup.sql` | 存储清理队列启用 | 写入合法 kind / 非法 kind `'other'` | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S32-15 | `pending_removals` PK `(kind, project_id, hash)`：同一待清理对象不重复入队 | DB delta §二（0010） | 队列中已有条目 | 重复入队同一条目 | 被主键约束拒绝 |
| UT-S32-16 | `project_blobs_counted` / `project_blobs_uncounted` / `project_blobs_resized` 触发器维护 `projects.file_bytes` 累计值 | DB delta §二（0013 / 0015 重建） | 项目已建立 | 插入含 N 字节 blob，再更新其 size | `file_bytes` 相应增减且不为负（删除路径取 `MAX(..., 0)`） |
| UT-S32-17 | `projects.log_bytes` / `projects.file_bytes` 为 NOT NULL 且默认 0 | DB delta §二（0013） | 项目已创建 | 读取两列 | 取值非负；新项目为 0，不为 NULL |
| UT-S32-18 | `project_updates_counted` / `project_updates_uncounted` 触发器维护 `projects.log_bytes` | DB delta §二（0013 / 0015 重建） | 项目已建立 | 写入合并产生的变更，再删除 | `log_bytes` 相应增减且不为负 |

### 1.3 来源分组：业务规则（自动合并、只读审查、副本保留、同步暂停、写盘失败退避）

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

## 二、场景测试用例

### 2.1 主路径：离线冲突合并与审查

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S32-01 | 两端离线重叠编辑 → 自动合并 → 只读 Merge Review 审查 | Step 1→5 | 两端已加入同一项目；两端离线 | ① 两端离线期间各自编辑同一文本文件 → ② 网络恢复、变更补发（承接 S31）→ ③ 引擎执行 Loro/OT 自动合并 → ④ 合并结果写入本地文档并作为新变更补发到 Server → ⑤ 服务端逐 change 校验后落库 → ⑥ 用户打开只读 Merge Review | 文本被**自动合并**为唯一结果（非人工二选一）；合并结果落库并广播；Merge Review 中可查看涉及文件、变更量、**作者**与 diff，且**无编辑合并结果的入口**；其他端同步更新 |
| ST-S32-02 | 二进制 / 路径冲突保留双方副本并通知 | Step 6 | 两端对同一二进制文件或同一路径产生冲突 | ① 触发同步 → ② 引擎判定不可自动合并 → ③ 生成双方副本 → ④ 查看通知 | 双方副本均被保留（副本名可区分来源）；用户收到冲突副本通知；**任一侧都不被静默覆盖** |
| ST-S32-03 | 大批量外部磁盘变化进入同步暂停并由用户选择 | Step 7 | 项目目录被外部工具批量改写 | ① 触发同步 → ② 引擎进入同步暂停并提示 → ③ 用户选择 `Send` 或 `Keep local` → ④ 观察后续同步 | 暂停态可观测；两种选择均有确定结果：`Send` 把本地变化发上去，`Keep local` 保留本地不动；未选择前不擅自发送或覆盖 |

### 2.2 异常路径

> EX 编号与 `collab-S32-offline-merge-review.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S32-01 | 重叠文本 | 两端离线期间对同一文本产生重叠编辑 | S32-AC-01 |
| EX-S32-02 | 二进制 / 路径冲突 | 冲突对象无法自动合并 | S32-AC-02 |
| EX-S32-03 | 大批量外部磁盘变化 | 项目目录被外部工具批量改动 | S32-AC-03 |
| EX-S32-04 | 写盘失败 | 本地文件写入失败 | S32-AC-03 |
| EX-S32-05 | 越权变更混入补发 | 补发批次中含超出角色的 change | S32-AC-01 |
| EX-S32-06 | 保密性边界（README 概括过宽 / 加密声明） | 用户评估托管风险或变更审批预期 | —（边界声明，不构成需求验收条件） |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S32-04 | 重叠文本自动合并且 Merge Review 为只读 | EX-S32-01 | 两端离线各改同一文本 | 恢复同步 | 文本自动合并为唯一结果；Merge Review 只可查看（文件 / 变更量 / 作者 / diff），**不能修改合并结果**；打开的 diff 数不超过上限；不出现「逐块二选一」交互 |
| ST-S32-05 | 二进制 / 路径冲突保留双方副本并通知 | EX-S32-02 | 冲突对象为二进制或路径 | 触发同步 | 双方副本被保留且名称可区分；用户收到明确通知；不静默覆盖任一侧 |
| ST-S32-06 | 大批量外部磁盘变化进入同步暂停 | EX-S32-03 | 项目目录被批量改写 | 触发同步 | 引擎进入暂停并给出 `Send` / `Keep local` 选择；暂停态可持久化恢复；不静默发送或丢弃本地变化 |
| ST-S32-07 | 写盘失败退避并通知 | EX-S32-04 | 本地文件不可写 | 触发写盘 | 进入退避重试；向用户提示写盘失败；变更不被静默丢弃；**不弹出** Send / Keep local 选择 |
| ST-S32-08 | 合并提交中的越权 change 被服务端逐 change 拒绝 | EX-S32-05 | 已建立会话 | 提交含越权 change 的合并结果 | 越权部分被拒并给出明确结果；不落库、不广播；客户端 UI 不是安全边界 |
| ST-S32-09 | 合并内容不被宣传为端到端加密，且不承诺「一切变更先询问」 | EX-S32-06 | 评估托管风险与审批预期 | 阅读产品说明与能力清单 | `encryption = none` 如实呈现；文案不声称「asks before it applies anything」式过宽承诺，实际行为为自动合并 + 只读审查 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S32-10 [manual] | Merge Review 界面呈现（作者归属与 diff 对比） | Step 5 | 存在多作者重叠编辑的合并结果 | 打开 Merge Review，逐个查看作者分组与 diff | 人工确认作者归属与 diff 可读、只读性明确（视觉核对与只读交互在无头 CI 中不可稳定断言） |
| ST-S32-11 [manual] | 冲突副本在磁盘上的可辨识性 | Step 6 | 已产生二进制冲突副本 | 在项目目录中查看保留副本 | 人工确认双方副本均可找到且文件名可区分来源（文件落盘布局需人工核对） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S32-AC-01（正常：重叠文本自动合并与 Merge Review）→ ST-S32-01、ST-S32-04、UT-S32-01、UT-S32-02、UT-S32-09、UT-S32-10、UT-S32-19、UT-S32-20、UT-S32-21、UT-S32-22、UT-S32-23、UT-S32-24、UT-S32-35
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S32-AC-02（异常：二进制/路径冲突）→ ST-S32-02、ST-S32-05、UT-S32-11、UT-S32-12、UT-S32-13、UT-S32-25、UT-S32-26
  - S32-AC-03（异常：大批量外部磁盘变化与写盘失败）→ ST-S32-03、ST-S32-06、ST-S32-07、UT-S32-14、UT-S32-15、UT-S32-16、UT-S32-17、UT-S32-18、UT-S32-27、UT-S32-28、UT-S32-29、UT-S32-30、UT-S32-31、UT-S32-32
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S32-01→ST-S32-04、EX-S32-02→ST-S32-05、EX-S32-03→ST-S32-06、EX-S32-04→ST-S32-07、EX-S32-05→ST-S32-08、EX-S32-06→ST-S32-09（6/6 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「帧类型与端点中不可省略的字段」等价覆盖：`update` + `envelope`（UT-S32-01）、信封 `mode` / `key_epoch`（UT-S32-02）、错误码集合（UT-S32-04）、`session_revoked.reason`（UT-S32-05）、`project_archived.project_id`（UT-S32-06）、快照 / blob 端点（UT-S32-07）、标题上限（UT-S32-08）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增帧字段或端点时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `project_updates` UNIQUE `(project_id, batch_id)`（UT-S32-09）、`project_updates` PK `(project_id, seq)`（UT-S32-10）、`project_blobs` PK `(project_id, hash)`（UT-S32-11）、`project_blobs.size` NOT NULL（UT-S32-12）、`project_blobs_used` 索引与 `used_at`（UT-S32-13）、`pending_removals.kind` CHECK（UT-S32-14）、`pending_removals` PK（UT-S32-15）、`file_bytes` 触发器（UT-S32-16）、`log_bytes` / `file_bytes` NOT NULL（UT-S32-17）、`log_bytes` 触发器（UT-S32-18）。
  - **未覆盖（说明原因）**：其余 Server 表的 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S31 / S33 / S40 / S41 的 DB 分组登记，本文件不重复登记以免越界。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景是**桌面端合并引擎与审查交互行为**，Server 部署形态、健康检查与升级迁移属 `delivery` 模块 S51；本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S32-AC-01 | **正常：重叠文本自动合并与 Merge Review** — GIVEN 两端离线期间对同一文本产生重叠编辑 / WHEN 恢复同步 / THEN 文本由 Loro/OT 自动合并，用户可在只读 Merge Review 中按作者与 diff 审查；并非所有重叠文本都要求人工二选一 | ST-S32-01, ST-S32-04, ST-S32-08, UT-S32-01, UT-S32-02, UT-S32-03, UT-S32-09, UT-S32-10, UT-S32-19, UT-S32-20, UT-S32-21, UT-S32-22, UT-S32-23, UT-S32-24, UT-S32-33, UT-S32-35 |
| S32-AC-02 | **异常：二进制/路径冲突** — GIVEN 二进制文件或路径冲突无法自动合并 / WHEN 同步 / THEN 保留双方副本并通知用户，不静默覆盖 | ST-S32-02, ST-S32-05, UT-S32-11, UT-S32-12, UT-S32-13, UT-S32-25, UT-S32-26 |
| S32-AC-03 | **异常：大批量外部磁盘变化与写盘失败** — GIVEN 项目目录发生大批量外部磁盘变化，或写盘失败 / WHEN 同步引擎处理 / THEN 大批量外部变化进入同步暂停（用户选 Send/Keep local）；写盘失败退避并通知 | ST-S32-03, ST-S32-06, ST-S32-07, UT-S32-14, UT-S32-15, UT-S32-16, UT-S32-17, UT-S32-18, UT-S32-27, UT-S32-28, UT-S32-29, UT-S32-30, UT-S32-31, UT-S32-32 |

> 追溯说明：`S32-AC-01` ~ `S32-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S32 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
