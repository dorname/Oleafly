## S35 共享历史与版本恢复 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S35 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S35 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S35 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S35-shared-history.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：共享历史由**本地 Loro change log** 构建，属实时协作路径①；sync 模块的云同步文件历史、冲突副本与三方合并是**另一套正交机制**，本场景不涉及、不得混称。
> - 共享历史由**本地完整 Loro change log** 构建，服务端**不另建一套历史真相**；本地缺版本即不可用。
> - 恢复是**追加新 change**，**不是回滚**；旧历史条目仍在，历史面板上体现为「恢复」这一条目。
> - **查看 ≠ 恢复**：Reviewer 可查看 / 比较历史，但恢复需要可编辑角色；最终裁决仍在服务端逐 change 校验。
> - 名称校验只有两项：**去空白后非空** + **不超过长度上限**（`MAX_VERSION_NAME_CHARS = 120`）；其余规则不由本基线推断。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（历史帧 / 端点 / 错误码）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S35-01 | 恢复作为**新变更**提交：走 `ClientFrame::Update`（`project_id` + `envelope`），提交消息标记为 `restore`（`RESTORE_MESSAGE = "restore"`） | 协议 delta §4.2；场景实现 §三 Step 4 | 本地存在目标版本 | 执行恢复并提交 | 以新 change 形式追加；历史面板可见到独立的「恢复」条目 |
| UT-S35-02 | 信封 `batch_id` 为恢复批次提供幂等键 | 协议 delta §五；场景实现 §三 Step 4 | 恢复变更待提交 | 重发同批次 | 服务端幂等处理，不重复存储 |
| UT-S35-03 | 服务端对恢复产生的变更同样**逐 change 校验角色**，越权恢复被拒 | 协议 delta §3.2；场景实现 §三 Step 5 | 已建立会话 | 以 Reviewer 身份提交恢复变更 | 被拒绝（`forbidden`）；不落库、不广播 |
| UT-S35-04 | `FrameErrorCode` 含 `forbidden` 与 `not_found`：恢复被拒与目标不存在可区分 | 协议 delta §4.4（`frames.rs:196-210`） | 恢复被拒 / 版本缺失 | 读取错误帧 | 两类错误码不同；不把「无权限」与「无此版本」混为一类 |
| UT-S35-05 | 历史页容量上限 `MAX_HISTORY_PAGE = 200` | 场景实现 §一 / `history.rs`（`MAX_HISTORY_PAGE`） | 本地 change log 很长 | 请求历史页 | 返回条目数不超过上限；超限部分被截断而非报错 |
| UT-S35-06 | 命名以文档内的版本映射（容器键 `VERSIONS = "versions"`）写入并提交，成为一条新变更 | 场景实现 §三 Step 3；`history.rs`（`VERSIONS`） | 有可命名版本 | 提交名称 | 名称写入版本映射；该写入本身是一条新变更 |
| UT-S35-07 | 取消命名（`unname_version`）同样以变更形式提交 | 场景实现 §三 Step 7 | 版本已命名 | 取消命名 | 名称被移除；作为新变更提交并广播 |
| UT-S35-08 | 只读打开历史版本与版本比较（diff）均通过变更帧 / 本地文档能力实现，不引入新的服务端端点 | 场景实现 §三 Step 2；API delta §四 | 项目已建立 | 打开历史版本、比较版本 | 复用既有通道；本基线不推断存在独立的历史查询端点 |
| UT-S35-09 | 快照端点 `PUT/GET/HEAD /api/v1/projects/{project}/snapshot` 与 `x-oleafly-snapshot-seq` 头可用于版本快照传递 | API delta §四（`routes/projects.rs:43`、`:63-66`） | 项目已建立 | 上传 / 下载快照 | 快照可存取；序号经专用头传递 |
| UT-S35-10 | 浏览器端角色映射 `abilitiesFor` 的 `edit` / `resolve` 等能力不包含「恢复历史」入口，恢复能力由可编辑角色决定 | 协议 delta §3.2；场景实现 §五「权限边界」 | 浏览器端已登录 | 逐角色检查恢复相关能力 | Reviewer 无恢复能力；Owner / Editor 有；客户端映射不构成服务端授权 |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S35-11 | **本场景没有服务端「历史表」**：共享历史由客户端本地 Loro change log 构建，Server 侧只存 `project_updates`（change log）与 `project_snapshots`（快照索引） | DB delta §三 B 组；场景实现 §一、§五「构建边界」 | Server 数据库已迁移 | 检视迁移链中与历史相关的表 | 不存在独立的 history / versions 表；服务端不另建历史真相 |
| UT-S35-12 | `project_updates` UNIQUE `(project_id, batch_id)`：恢复作为新批次提交，不与既有批次冲突且可幂等 | DB delta §三 B 组；`0002_projects.sql` | 项目已有若干批次 | 以新 `batch_id` 提交恢复变更 | 插入成功；重发时被幂等处理 |
| UT-S35-13 | `project_updates` PK `(project_id, seq)`：恢复占用新的连续序号 | DB delta §三 B 组；`0002_projects.sql` | 项目已有若干批次 | 提交恢复变更 | 写入新 `seq`；`projects.head_seq` 随之递增，旧序号不被覆盖 |
| UT-S35-14 | `project_updates.envelope` 为 NOT NULL BLOB：恢复变更必须带完整载荷 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 插入空 envelope | 被 NOT NULL 拒绝 |
| UT-S35-15 | `project_snapshots` PK `(project_id, seq)` 与 `hash` / `size` NOT NULL：快照索引唯一且带引用 | DB delta §三 B 组；`0002_projects.sql`、0005 增 `hash` 列 | 项目已建立 | 重复插入同 `(project_id, seq)` / 缺 `size` | 分别被主键约束与 NOT NULL 拒绝 |
| UT-S35-16 | `project_updates_counted` / `project_updates_uncounted` 触发器维护 `projects.log_bytes`，恢复变更计入累计 | DB delta §二（0013 / 0015 重建） | 项目已建立 | 提交恢复变更后读取 `log_bytes` | `log_bytes` 相应增加；删除后回落且不为负 |
| UT-S35-17 | `projects.status` 的 CHECK 只允许 `'pending'` / `'active'` / `'archived'`（归档项目不可写入历史类变更） | DB delta §二（0002 / 0015） | 项目 active | 写入非法状态 | 非法值被 CHECK 拒绝；归档态项目在服务端走只读保留路径 |

### 1.3 来源分组：业务规则（历史构建、版本定位、命名校验、恢复语义、权限）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S35-18 | 共享历史由**本地完整 Loro change log** 构建，按时间与作者归并条目 | 需求 §四 S35；场景实现 §三 Step 1 | 本地持有完整 change log | 打开历史面板 | 列出历史条目（时间 + 作者）；不依赖服务端另存的历史 |
| UT-S35-19 | 历史条目归并规则：相邻步长在合并窗口（`MERGE_SECONDS = 60`）内合并，间隔超过 `GAP_MS = 10 分钟` 断开，跨度超过 `SPAN_MS = 1 小时` 分段 | 场景实现 §五「构建边界」；`history.rs` | change log 含多段编辑 | 构建历史页 | 条目归并与分段符合上述窗口；同一作者连续编辑不产生碎片条目 |
| UT-S35-20 | 只读打开某版本内容或与当前版本比较（diff） | 场景实现 §三 Step 2 | 本地含目标版本 | 打开 / 比较 | 返回该版本的内容或差异；**只读**，不改变当前文档 |
| UT-S35-21 | 目标版本定位依赖 frontiers 解码；解码失败返回 **`history_unavailable`** | 需求 §四 S35「异常：本地无目标版本」；场景实现 §四（`decode_frontiers` / `history_unavailable`） | 目标版本不在本地 change log | 尝试打开 / 恢复该版本 | 返回 `history_unavailable`；**不凭空构造内容** |
| UT-S35-22 | 版本名称校验：**去空白后不得为空** | 需求 §四 S35「异常：Reviewer 恢复被拒与非法名称」；场景实现 §四（`checked_name`） | 有可命名版本 | 输入空白 / 纯空格名称 | 拒绝（无效名称）；版本映射不写入 |
| UT-S35-23 | 版本名称校验：**不得超过 `MAX_VERSION_NAME_CHARS = 120`** | 同上（`history.rs:17`） | 有可命名版本 | 输入 120 字符 / 121 字符名称 | 120 接受；121 按过大拒绝 |
| UT-S35-24 | 名称校验**只含上述两项**，其余规则不由本基线推断 | 场景实现 §五「命名边界」 | — | 审查校验逻辑 | 除「非空」与「长度上限」外不附加推断规则 |
| UT-S35-25 | 恢复以**新 change 追加**，当前内容被替换为该版本内容 | 需求 §四 S35「正常：查看与恢复」；场景实现 §三 Step 4 | 本地含目标版本且角色可编辑 | 执行恢复 | 当前内容变为目标版本内容；变更以新 change 形式存在 |
| UT-S35-26 | **恢复不抹除旧历史**：旧版本仍可在历史中查看，恢复只是历史中的又一个条目 | 需求 §四 S35；场景实现 §三 Step 5、§五「恢复语义边界」 | 已完成一次恢复 | 查看历史面板 | 旧条目仍在；新条目标记为「恢复」；不回滚、不截断历史 |
| UT-S35-27 | **Reviewer 可查看 / 比较历史但不能恢复**（恢复需要可编辑角色） | 需求 §四 S35「异常：Reviewer 恢复被拒与非法名称」；场景实现 §四 | 成员角色为 Reviewer | 尝试恢复 | 被拒绝；查看与比较仍可用 |
| UT-S35-28 | 服务端逐 change 校验会拒绝不匹配的恢复变更（客户端限制之外的第二道防线） | 场景实现 §四；协议 delta §3.2 | 已建立会话 | 构造恢复帧 | 服务端按角色判定；绕过客户端同样被拒 |
| UT-S35-29 | 项目文档因错误停止同步而**冻结**时，拒绝写入类操作（含命名与恢复），提示需重新打开项目 | 场景实现 §四（`doc.rs` 的 `writable`） | 文档已冻结 | 执行命名 / 恢复 | 被拒绝并提示需重新打开项目；不静默忽略 |
| UT-S35-30 | 恢复变更同样受协议与通道约束：会话按 min/max 协商确定，桌面端 WS 失败两次后回退 long-poll，浏览器端无回退 | 场景实现 §五 | 会话已建立 | 执行恢复 | 沿用既有通道语义；浏览器端不出现 long-poll 回退 |
| UT-S35-31 | 项目内容**不是端到端加密**：内容与历史都不是 E2E 加密，历史随 change log 存在服务端与各成员副本 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；不宣称 E2E 加密 |

---

## 二、场景测试用例

### 2.1 主路径：共享历史与版本恢复

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S35-01 | 打开共享历史并按作者 / 时间浏览 | Step 1 | 项目已共享且本地持有完整 change log | ① 打开共享历史面板 → ② 引擎由本地完整 Loro change log 构建历史页 → ③ 按时间与作者查看条目 | 列出历史条目（时间 + 作者）；条目归并符合合并 / 分段窗口；不依赖服务端另存历史 |
| ST-S35-02 | 只读打开某版本并与当前版本比较 | Step 2 | 本地含目标版本 | ① 选择某版本 → ② 只读打开其内容 → ③ 切换到与当前版本比较（diff） | 可查看该版本内容与差异；**只读**，当前文档不被改变 |
| ST-S35-03 | 命名与取消命名 | Step 3、Step 7 | 本地含目标版本且名称合法 | ① 输入合法名称提交 → ② 查看历史面板中的命名条目 → ③ 取消命名 | 名称写入版本映射并作为新变更提交；历史中可见命名条目；取消命名后名称被移除 |
| ST-S35-04 | 恢复选定版本并广播 | Step 4→6 | 本地含目标版本且角色可编辑（Owner / Editor） | ① 执行恢复 → ② 恢复内容作为新 change 追加（提交标记 restore）→ ③ 服务端逐 change 校验后写入 `project_updates` → ④ 广播 → ⑤ 其他端同步更新 → ⑥ 查看历史面板 | 当前内容变为目标版本内容；变更落库并广播；其他端同步更新；**旧历史不被抹除**，恢复体现为新的历史条目 |

### 2.2 异常路径

> EX 编号与 `collab-S35-shared-history.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S35-01 | 本地无目标版本 | 本地 change log 不含目标版本（frontiers 解码失败） | S35-AC-02 |
| EX-S35-02 | Reviewer 恢复 | Reviewer 尝试恢复历史版本 | S35-AC-03 |
| EX-S35-03 | 空名称 | 用户输入空白名称 | S35-AC-03 |
| EX-S35-04 | 超长名称 | 用户输入超长名称 | S35-AC-03 |
| EX-S35-05 | 恢复后历史 | 恢复完成 | S35-AC-01 |
| EX-S35-06 | 文档冻结 | 项目因错误停止同步而冻结 | S35-AC-01 |
| EX-S35-07 | 保密性边界 | 用户评估托管风险 | —（边界声明，不构成需求验收条件） |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S35-05 | 本地无目标版本时返回 `history_unavailable` | EX-S35-01 | 本地 change log 不含该版本 | 尝试打开 / 恢复该版本 | 返回 `history_unavailable`；**不凭空构造内容**；界面给出明确不可用提示 |
| ST-S35-06 | Reviewer 可查看但不能恢复 | EX-S35-02 | 成员角色为 Reviewer | 尝试恢复历史版本 | 恢复被拒绝（客户端与服务端两侧均拦截）；查看与比较仍可用 |
| ST-S35-07 | 空名称被拒绝 | EX-S35-03 | 有可命名版本 | 输入空白 / 纯空格名称 | 拒绝（去空白后为空即无效）；版本映射不写入；不产生变更 |
| ST-S35-08 | 超长名称被拒绝 | EX-S35-04 | 有可命名版本 | 输入超过 120 字符的名称 | 按过大拒绝；版本映射不写入；不产生变更 |
| ST-S35-09 | 恢复不抹除旧历史 | EX-S35-05 | 已完成一次恢复 | 查看历史面板 | 旧版本条目仍在可查看；新条目为「恢复」；历史不被回滚或截断 |
| ST-S35-10 | 文档冻结时拒绝命名与恢复 | EX-S35-06 | 项目文档已冻结 | 执行命名 / 恢复 | 写入类操作被拒绝并提示需重新打开项目；不静默忽略 |
| ST-S35-11 | 历史内容不被宣传为端到端加密 | EX-S35-07 | 评估托管风险 | 阅读能力清单与产品说明 | `encryption = none` 如实呈现；历史随 change log 存在服务端与各成员副本这一事实被如实说明 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S35-12 [manual] | 共享历史面板的呈现与交互 | Step 1→3、Step 7 | 项目有多作者多轮编辑 | 打开历史面板，浏览条目、命名、比较、取消命名 | 人工确认条目归并合理、作者标注与只读打开呈现正确（视觉与交互需人工确认） |
| ST-S35-13 [manual] | 恢复后的多端内容一致性 | Step 4→6 | 两端在线同一项目，成员角色可编辑 | 一端恢复某版本，观察另一端内容与历史面板 | 人工确认另一端内容同步为恢复后的版本且历史中可见「恢复」条目（跨端观感需人工确认） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S35-AC-01（正常：查看与恢复）→ ST-S35-01、ST-S35-02、ST-S35-03、ST-S35-04、ST-S35-09、ST-S35-10、UT-S35-01、UT-S35-02、UT-S35-05、UT-S35-06、UT-S35-07、UT-S35-08、UT-S35-09、UT-S35-12、UT-S35-13、UT-S35-18、UT-S35-19、UT-S35-20、UT-S35-25、UT-S35-26、UT-S35-29、UT-S35-30
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S35-AC-02（异常：本地无目标版本）→ ST-S35-05、UT-S35-21
  - S35-AC-03（异常：Reviewer 恢复被拒与非法名称）→ ST-S35-06、ST-S35-07、ST-S35-08、UT-S35-03、UT-S35-04、UT-S35-10、UT-S35-22、UT-S35-23、UT-S35-24、UT-S35-27、UT-S35-28
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S35-01→ST-S35-05、EX-S35-02→ST-S35-06、EX-S35-03→ST-S35-07、EX-S35-04→ST-S35-08、EX-S35-05→ST-S35-09、EX-S35-06→ST-S35-10、EX-S35-07→ST-S35-11（7/7 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字，且**本场景不存在专属的历史 API 端点**（历史由客户端本地 change log 构建）；本项按「变更帧与既有端点中不可省略的字段」等价覆盖：`update` + `envelope`（UT-S35-01）、`Envelope.batch_id`（UT-S35-02）、恢复变更的角色校验（UT-S35-03）、错误码集合（UT-S35-04）、历史页容量（UT-S35-05）、版本映射容器（UT-S35-06）、取消命名（UT-S35-07）、只读打开 / 比较不引入新端点（UT-S35-08）、快照端点与序号头（UT-S35-09）、浏览器端恢复能力映射（UT-S35-10）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，且本场景无独立历史端点，不存在按 OpenAPI 枚举的剩余清单项；契约新增历史相关端点时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - 本场景无服务端历史表（UT-S35-11）；`project_updates` UNIQUE `(project_id, batch_id)`（UT-S35-12）、`project_updates` PK `(project_id, seq)`（UT-S35-13）、`project_updates.envelope` NOT NULL（UT-S35-14）、`project_snapshots` PK 与 NOT NULL（UT-S35-15）、`log_bytes` 触发器（UT-S35-16）、`projects.status` CHECK（UT-S35-17）。
  - **未覆盖（说明原因）**：Server 数据库其余 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S31 / S32 / S33 / S34 / S40 / S41 的 DB 分组登记，本文件不重复登记以免越界。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景是**桌面端历史面板与恢复交互**，Server 部署形态、健康检查与升级迁移属 `delivery` 模块 S51；本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S35-AC-01 | **正常：查看与恢复** — GIVEN 协作者打开共享历史 / WHEN 选择某版本查看/比较/命名并恢复 / THEN 恢复以新 change 形式追加，旧历史不被抹除 | ST-S35-01, ST-S35-02, ST-S35-03, ST-S35-04, ST-S35-09, ST-S35-10, UT-S35-01, UT-S35-02, UT-S35-05, UT-S35-06, UT-S35-07, UT-S35-08, UT-S35-09, UT-S35-12, UT-S35-13, UT-S35-14, UT-S35-15, UT-S35-16, UT-S35-17, UT-S35-18, UT-S35-19, UT-S35-20, UT-S35-25, UT-S35-26, UT-S35-29, UT-S35-30, UT-S35-31 |
| S35-AC-02 | **异常：本地无目标版本** — GIVEN 本地 change log 不含目标版本 / WHEN 尝试打开/恢复该版本 / THEN 返回 `history_unavailable`，不凭空构造内容 | ST-S35-05, UT-S35-21 |
| S35-AC-03 | **异常：Reviewer 恢复被拒与非法名称** — GIVEN Reviewer 尝试恢复历史版本，或用户输入空名称/超长名称 / WHEN 操作提交 / THEN Reviewer 可查看历史但不能恢复；空/超长名称被拒绝 | ST-S35-06, ST-S35-07, ST-S35-08, UT-S35-03, UT-S35-04, UT-S35-10, UT-S35-22, UT-S35-23, UT-S35-24, UT-S35-27, UT-S35-28 |

> 追溯说明：`S35-AC-01` ~ `S35-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S35 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
