## S34 评论建议与项目聊天 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S34 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S34 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S34 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S34-comments-suggestions.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：评论 / 建议 / 聊天随 change log 在**实时协作路径①**内同步与留痕；sync 模块的云同步文件同步、冲突副本与三方合并是**另一套正交机制**，本场景不涉及、不得混称。
> - **开关分两层，不可混称**：项目级 `comments_enabled`（`projects.comments_enabled`）与 Server 级功能开关 `comments` / `suggestions` / `chat`（能力清单 `features`）是两个层次。
> - **拒绝语义分两类，不可混称**：comments off 拒绝只针对**评论类操作**（新评论 + 对既有评论 resolve），**文本编辑继续**；Reviewer 的拒绝针对**建议裁决**动作。
> - 权限裁决在**服务端逐 change 校验**，客户端 UI 的按钮禁用不是安全边界。
> - 评论 / 建议 / 聊天都是 **change log 的一部分**：删除评论或聊天消息会从项目中移除，但**历史 change log 仍保留**。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（功能开关 / 裁决判定 / 帧与端点）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S34-01 | Server 级功能开关 `comments` / `suggestions` / `chat` 出现在能力清单 `features` 中，后两者带 `#[serde(default)]` | API delta §九（`capabilities.rs:40-54`）；场景实现 §一 | Server 能力清单可读 | 缺失 `suggestions` / `chat` 的清单 | 缺失项取默认 `false`；`comments` 显式给出；开关为 false 时对应入口不可用，但不影响文本与评论之外的其他能力 |
| UT-S34-02 | 项目级评论开关 `comments_enabled` 与 Server 级 `features.comments` **是两个独立层次** | 场景实现 §五「开关边界」；API delta §九 | 项目与 Server 均已配置 | 分别关闭 Server 级与项目级 | 两者分别生效、可独立取值；不互相覆盖 |
| UT-S34-03 | `FrameErrorCode` 含 `comments_off`，与 `forbidden` 可区分 | 协议 delta §4.4（`frames.rs:196-210`） | 项目评论关闭 | 提交新评论 | 错误码为 `comments_off`（评论关闭）而非笼统的 `forbidden` |
| UT-S34-04 | `access_changed` 帧的 `comments` 字段为 `CommentSwitches { server, project }`，两端开关分别回传 | 协议 delta §4.3、§4.5（`frames.rs:173-177`） | 评论开关变更 | 读取该帧 | Server 级与项目级开关分别可解析；客户端据此更新本地状态 |
| UT-S34-05 | `RoleVerdict::ChangesComments` 表示**只有评论部分被摘除**，其余变更照常 | 协议 delta §3.2 关键边界；场景实现 §三 Step 6 | 项目评论关闭 | 提交含文本 + 评论的 change | 判为 `ChangesComments`；文本变更通过、评论部分被拒 |
| UT-S34-06 | `comment_guard::Verdict` 四态：`Allowed` / `ChangesComments` / `Unreadable` / `Unchecked` | 场景实现 §四（`comment_guard.rs:39-44`） | 评论开关变化场景 | 逐一触发判定 | 四态可区分；`Unchecked` 表示该变更尚未被评论复核，不被当作拒绝 |
| UT-S34-07 | 评论复核队列上限 `MAX_RECHECKS = 5`、重试间隔 `RECHECK_RETRY = 60s`、分页 `RECHECK_PAGE = 64` | 场景实现 §四（`comment_guard.rs:31-33`）；DB delta §二（0014） | 存在待复核变更 | 触发复核 | 复核按页处理并有重试与上限；不无限增长 |
| UT-S34-08 | 评论根键常量为 `"comments"` | 场景实现 §四（`comment_guard.rs:24`） | 评论容器已建 | 判定评论相关变更 | 命中正确的容器根；非评论变更不被误判 |
| UT-S34-09 | `ProjectAction::Comment` 允许 Owner / Editor / Reviewer / Commenter；`Chat` 同 | 协议 delta §3.2（`projects.rs:109-145`） | 协议 crate 已编译 | 五角色 × 两动作 | 与协议 delta 矩阵一致；Viewer 为 false |
| UT-S34-10 | `ProjectAction::Suggest` 允许 Owner / Editor / Reviewer；`Resolve` 只允许 Owner / Editor | 协议 delta §3.2 | 同上 | 五角色 × 两动作 | 与矩阵一致；Commenter 既不能建议也不能 resolve |
| UT-S34-11 | 浏览器端 `canWithdraw(role, author, self)`：仅作者本人且角色不为 `viewer` / `commenter` / `unknown` 时可撤回 | 协议 delta §3.2；`web/src/roles.ts`（`canWithdraw`） | 浏览器端已登录 | 逐角色 × 作者是否为本人调用 | 作者本人且角色可撤回时为 true；他人或不可撤回角色为 false |
| UT-S34-12 | 浏览器端 `abilitiesFor` 的 `comment` / `chat` 依赖 `features.comments` / `features.chat`，`clearChat` 仅 `owner` 且需 `features.chat` | `web/src/roles.ts` | 浏览器端已登录 | 逐角色 × 开关组合调用 | 能力随开关与角色收敛；`clearChat` 不授予非 Owner |
| UT-S34-13 | mention 通知经 `mention_scans` / `mention_emails` 落库并进入异步邮件队列 | API delta §八 / DB delta §三 D 组 | 评论含 mention | 提交评论 | mention 被扫描并入队；邮件异步发送（重试与配额语义属 S38） |
| UT-S34-14 | 邮件偏好端点：`GET/PATCH /api/v1/admin/email/preferences`、`GET /api/v1/admin/email`（配置状态）、`POST /api/v1/admin/email/test` | API delta §六 | Server 管理员已登录 | 调用三个端点 | 偏好可读写；配置状态与测试邮件端点可用 |
| UT-S34-15 | 评论 / 建议 / 聊天作为变更帧提交，走 `ClientFrame::Update`（`project_id` + `envelope`） | 协议 delta §4.2；场景实现 §三 Step 3 | 已建立会话 | 提交评论 / 建议 / 聊天变更 | 三者结构与普通变更一致；统一进入 change log |
| UT-S34-16 | `Envelope.batch_id` 为每一批变更（含评论类）提供幂等键 | 协议 delta §五；场景实现 §三 Step 3 | 提交评论批次 | 重发同批次 | 服务端幂等处理，不重复存储 |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S34-17 | `projects.comments_enabled` 的 CHECK 只允许 `0` / `1`（项目级评论开关） | DB delta §二（0004 / 0015）；`0015_review_roles.sql` | 项目已建立 | 写入 `0` / 写入 `2` | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S34-18 | `comment_rechecks` 主键 `(project_id, seq)`：同一变更不重复入复核队列 | DB delta §二（0014）；`0014_comment_rechecks.sql` | 队列已有条目 | 重复入队同一条目 | 被主键约束拒绝 |
| UT-S34-19 | `comment_rechecks.spans` / `account_id` / `device_id` / `queued_at` 均为 NOT NULL；`attempts` 默认 0 | DB delta §二（0014） | 队列可用 | 插入缺字段的行 / 正常插入 | 缺字段被 NOT NULL 拒绝；正常插入 `attempts = 0` |
| UT-S34-20 | `comment_rechecks.project_id` 外键指向 `projects(id)` 且 `ON DELETE CASCADE` | DB delta §三 F 组（0014） | 项目已建立 | 删除项目 | 队列条目随之删除；无悬挂复核项 |
| UT-S34-21 | `mention_scans` 主键 `(project_id, seq)`：同一变更的 mention 扫描不重复 | DB delta §三 D 组（0011）；`0011_mention_emails.sql` | 扫描表已有条目 | 重复插入同一条目 | 被主键约束拒绝 |
| UT-S34-22 | `mention_emails` 主键 `(project_id, message_id, recipient_id)`：同一消息对同一收件人只入队一次 | DB delta §三 D 组（0011） | 邮件队列已有条目 | 重复入队同一三元组 | 被主键约束拒绝；不产生重复邮件 |
| UT-S34-23 | `mention_emails.recipient_id` 外键指向 `accounts(id)` 且 `ON DELETE CASCADE`；`sent_at` 可空表示未发送 | DB delta §三 D 组（0011） | 邮件队列已有条目 | 写入不存在 account 的收件人 / 写入未发送条目 | 非法外键被拒；`sent_at IS NULL` 的条目可被待发送索引命中 |
| UT-S34-24 | `mention_emails_waiting` 为部分索引（`WHERE sent_at IS NULL`），只索引待发送条目 | DB delta §三 D 组（0011） | 邮件队列可用 | 检查索引定义 | 未发送条目可按 `(recipient_id, due_at)` 命中；已发送条目不占用待发索引 |
| UT-S34-25 | `email_preferences.mentions` 的 CHECK 只允许 `0` / `1`，默认 1 | DB delta §二（0011）；`0011_mention_emails.sql` | 偏好表可用 | 写入 `0` / 写入 `2` | 合法值成功；非法值被 CHECK 拒绝；缺省为开启 |
| UT-S34-26 | `email_preferences.account_id` 为主键并外键指向 `accounts(id)`，账号删除时级联清理 | DB delta §三 D 组（0003 / 0011） | 偏好已建 | 删除账号 | 偏好行随之删除；无悬挂偏好 |
| UT-S34-27 | `project_updates` UNIQUE `(project_id, batch_id)`：评论 / 建议 / 聊天批次同样幂等 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 重发同一评论批次 | 被 UNIQUE 拒绝；不重复存储 |

### 1.3 来源分组：业务规则（评论语义、建议裁决、离线排队、留痕）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S34-28 | 评论建模为线程（锚点 + 正文 + mention），作为变更进入 change log | 场景实现 §三 Step 1→2 | 项目已建立 | 发表评论 | 线程结构落库；其他端可刷新出该线程 |
| UT-S34-29 | 评论支持**回复 / mention / resolve** 四类操作 | 场景实现 §三 Step 1、Step 9 | 存在评论线程 | 依次回复、mention、resolve | 三种操作均被建模并广播；resolve 把线程标记为已解决 |
| UT-S34-30 | 项目关闭评论后：**新评论被拒**，但**文本编辑继续**（打字仍获 ack） | 需求 §四 S34「异常：comments off」；场景实现 §四 | `comments_enabled = 0` | 提交新评论 / 提交纯文本编辑 | 评论被拒（`comments_off`）；文本编辑照常落库并被对端接收 |
| UT-S34-31 | 项目关闭评论后：**对既有评论的 resolve 也被拒** | 需求 §四 S34「异常：comments off」；场景实现 §四 | `comments_enabled = 0` 且已有评论线程 | 对既有评论执行 resolve | resolve 被拒；评论线程状态不被改写 |
| UT-S34-32 | 客户端收到 comments off 拒绝后**只摘掉被拒的评论**并保留其正文供用户查看，文本变更照常发送 | 场景实现 §四（`refusals.rs`） | 提交含文本 + 评论的批次 | 接收拒绝结果 | 本地只移除被拒评论部分；文本变更保留并继续发送 |
| UT-S34-33 | **Reviewer 不能接受建议**（含自己提出的建议）——只提建议，不裁决建议 | 需求 §四 S34「异常：角色限制」；场景实现 §四 | 成员角色为 Reviewer | 提交接受建议操作 | 被拒绝；建议状态不变；自己提出的建议同样被拒 |
| UT-S34-34 | **Commenter 不能改文本 / 不能提建议 / 不能清空他人内容** | 需求 §四 S34；场景实现 §四 | 成员角色为 Commenter | 分别提交三类操作 | 三者均被拒绝；他人内容不被清空 |
| UT-S34-35 | 建议可被**接受 / 拒绝 / 撤回**；**接受**才把建议内容写入正文 | 场景实现 §三 Step 7 | 存在建议 | 分别执行接受 / 拒绝 / 撤回 | 三种操作均有确定结果；仅接受会改写正文 |
| UT-S34-36 | 离线期间的评论等操作**在本地排队**，连接恢复后按序发出 | 需求 §四 S34「正常」；场景实现 §三 Step 8 | 客户端离线 | 离线期间发表评论，恢复连接 | 操作先排队不丢；恢复后按序发出并落库 |
| UT-S34-37 | 离线评论的多种形态（纯评论、文本 + 评论、先文本后评论）都被正确处理 | inventory S34 行；场景实现 §四（`offline_comments.rs`） | 客户端离线 | 分别构造三种离线形态 | 三种形态恢复后均正确落库，不出现文本丢失或评论错挂 |
| UT-S34-38 | 评论 / 建议 / 聊天消息是 **change log 的一部分**：删除评论 / 聊天消息会从项目中移除，但历史 change log 仍保留 | 场景实现 §五「留痕边界」 | 项目已建立 | 删除评论 / 聊天消息 | 当前项目内容中该条目消失；change log 中的历史记录不被抹除 |
| UT-S34-39 | mention 被扫描后进入**通知队列**异步发送；邮件重试与配额语义属 S38 | 场景实现 §三 Step 5；需求 §四 S38 | 评论含 mention | 提交评论 | mention 进入队列而非同步阻塞发送；队列按 S38 口径处理 |
| UT-S34-40 | 功能开关未开（`suggestions` / `chat` 为 false）时对应入口不可用，**不影响文本与评论** | 场景实现 §四 | 能力清单 `suggestions = false` | 尝试提建议 / 发起聊天 | 对应入口不可用；文本编辑与评论不受影响 |
| UT-S34-41 | 项目内容**不是端到端加密**：评论 / 建议 / 聊天同样随 change log 留在服务端与各成员副本 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；不宣称 E2E 加密 |
| UT-S34-42 | 权限裁决**只在服务端逐 change 执行**；客户端评论 / 建议按钮禁用不是安全边界 | 场景实现 §五「权限边界」 | — | 绕过 UI 直接构造越权帧 | 仍被服务端拒绝 |

---

## 二、场景测试用例

### 2.1 主路径：评论建议与项目聊天

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S34-01 | 评论 / 回复 / mention / resolve 全链路 | Step 1→2、Step 5→6、Step 9 | 项目已共享且评论开关开启；成员具备 `Comment` 权限 | ① 在正文选区发表评论 → ② 建模为线程（锚点 + 正文 + mention）→ ③ 以变更帧发送 → ④ 服务端逐 change 校验角色与评论开关 → ⑤ 写入 `project_updates` 并广播，mention 进入通知队列 → ⑥ 其他端刷新评论线程 → ⑦ 对既有评论 resolve | 评论在线实时同步到各端；mention 入队；线程可被 resolve 并标记为已解决；评论随 change log 留痕 |
| ST-S34-02 | 建议的接受 / 拒绝 / 撤回 | Step 7 | 项目建议功能开启；成员具备 `Suggest` 权限 | ① 协作者提出建议 → ② 其他端看到建议卡片 → ③ 执行接受 → ④ 另建建议并执行拒绝 → ⑤ 第三条建议执行撤回 | 接受才把建议内容写入正文；拒绝不改写正文；撤回使建议不再有效；Reviewer 提出的建议同样以建议形态呈现 |
| ST-S34-03 | 项目聊天 | Step 1→7 | 聊天功能开关开启；成员具备 `Chat` 权限 | ① 在项目聊天面板发送消息 → ② 变更帧提交 → ③ 服务端校验 → ④ 其他端收到并刷新聊天面板 | 聊天消息实时同步并随 change log 留痕；Commenter 可用聊天但不可改文本 |
| ST-S34-04 | 离线期间的评论等操作排队并在恢复后发出 | Step 8 | 客户端断网 | ① 断网期间发表评论（以及文本 + 评论、先文本后评论两种形态）→ ② 恢复连接 → ③ 观察排队操作发出 | 操作先在本地排队不丢；恢复后按序发出并落库；三种离线形态均被正确处理 |

### 2.2 异常路径

> EX 编号与 `collab-S34-comments-suggestions.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S34-01 | comments off | 项目关闭了评论功能 | S34-AC-02 |
| EX-S34-02 | Reviewer 接受建议 | Reviewer 尝试接受建议（含自己提出的） | S34-AC-03 |
| EX-S34-03 | Commenter 越界 | Commenter 尝试改文本 / 改建议 / 清空他人内容 | S34-AC-03 |
| EX-S34-04 | 离线评论 | 评论操作在断网期间产生 | S34-AC-01 |
| EX-S34-05 | comments off 拒绝的本地处理 | 客户端收到 comments off 拒绝 | S34-AC-02 |
| EX-S34-06 | 功能开关未开 | Server 能力清单中 `suggestions` / `chat` 为 false | S34-AC-01 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S34-05 | 评论关闭时新评论与既有评论 resolve 均被拒，文本编辑继续 | EX-S34-01 | 项目 `comments_enabled = 0` | 提交新评论 / 对既有评论 resolve / 提交纯文本编辑 | 新评论被拒（`comments_off`）；既有评论的 resolve 被拒；**文本编辑继续**并获 ack，对端可收到 |
| ST-S34-06 | Reviewer 接受建议被拒（含接受自己提出的建议） | EX-S34-02 | 成员角色为 Reviewer | 提交接受建议操作 | 被拒绝；建议状态不变；Reviewer 仍可正常提出建议 |
| ST-S34-07 | Commenter 改文本 / 改建议 / 清空他人内容均被拒 | EX-S34-03 | 成员角色为 Commenter | 分别提交三类操作 | 三者均被拒绝；他人内容不被清空；Commenter 仍可评论与聊天 |
| ST-S34-08 | 离线评论在恢复后发出且形态正确 | EX-S34-04 | 客户端断网 | 离线期间产生评论 / 文本 + 评论 / 先文本后评论三种形态，恢复连接 | 三种形态的排队操作均按序发出并落库；无文本丢失、无评论错挂、无重复发送 |
| ST-S34-09 | 收到 comments off 拒绝后本地只摘掉被拒评论 | EX-S34-05 | 提交了含文本 + 评论的批次，项目评论关闭 | 接收服务端拒绝结果 | 本地只移除被拒评论部分并保留其正文供查看；文本变更保留并照常发送（与 Viewer's forbidden 丢弃整批的语义不同） |
| ST-S34-10 | 功能开关未开时对应入口不可用但不影响文本与评论 | EX-S34-06 | 能力清单 `suggestions = false` / `chat = false` | 尝试提建议 / 发起聊天 | 对应入口不可用；文本编辑与评论功能不受影响 |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S34-11 [manual] | 评论 / 建议 / 聊天面板的多端呈现 | Step 1→7 | 两个真实桌面实例连同一项目 | 一端评论、提建议、聊天，另一端观察刷新与呈现 | 人工确认线程锚点、作者标注、建议卡片与聊天消息呈现正确（视觉核对需人工确认） |
| ST-S34-12 [manual] | 离线队列在真实断网下的恢复体验 | Step 8 | 真实网络环境可断网 | 断网期间评论与提建议，恢复后观察发出 | 人工确认恢复后评论不丢、顺序合理（真实断网时序不可在 CI 稳定断言） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S34-AC-01（正常：评论建议聊天与离线排队）→ ST-S34-01、ST-S34-02、ST-S34-03、ST-S34-04、ST-S34-10、UT-S34-01、UT-S34-02、UT-S34-09 ~ UT-S34-13、UT-S34-15、UT-S34-16、UT-S34-28、UT-S34-29、UT-S34-35、UT-S34-36、UT-S34-37、UT-S34-40
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S34-AC-02（异常：comments off）→ ST-S34-05、ST-S34-09、UT-S34-03、UT-S34-04、UT-S34-05、UT-S34-06、UT-S34-17、UT-S34-30、UT-S34-31、UT-S34-32
  - S34-AC-03（异常：角色限制）→ ST-S34-06、ST-S34-07、UT-S34-10、UT-S34-11、UT-S34-33、UT-S34-34、UT-S34-42
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S34-01→ST-S34-05、EX-S34-02→ST-S34-06、EX-S34-03→ST-S34-07、EX-S34-04→ST-S34-08、EX-S34-05→ST-S34-09、EX-S34-06→ST-S34-10（6/6 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「帧 / 端点 / 判定结果中不可省略的字段」等价覆盖：`features` 开关组（UT-S34-01）、项目级与 Server 级开关分层（UT-S34-02）、`comments_off` 错误码（UT-S34-03）、`CommentSwitches`（UT-S34-04）、`RoleVerdict::ChangesComments`（UT-S34-05）、`comment_guard::Verdict` 四态与复核参数（UT-S34-06、UT-S34-07）、评论根键（UT-S34-08）、`ProjectAction` 矩阵（UT-S34-09、UT-S34-10）、浏览器端 `canWithdraw` / `abilitiesFor`（UT-S34-11、UT-S34-12）、mention 落库与邮件端点（UT-S34-13、UT-S34-14）、变更帧结构（UT-S34-15）、`Envelope.batch_id`（UT-S34-16）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增端点或帧字段时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `projects.comments_enabled` CHECK（UT-S34-17）、`comment_rechecks` PK（UT-S34-18）、`comment_rechecks` NOT NULL（UT-S34-19）、`comment_rechecks.project_id` FK（UT-S34-20）、`mention_scans` PK（UT-S34-21）、`mention_emails` PK（UT-S34-22）、`mention_emails.recipient_id` FK 与 `sent_at` 可空（UT-S34-23）、`mention_emails_waiting` 部分索引（UT-S34-24）、`email_preferences.mentions` CHECK（UT-S34-25）、`email_preferences.account_id` PK 与 FK（UT-S34-26）、`project_updates` UNIQUE `(project_id, batch_id)`（UT-S34-27）。
  - **未覆盖（说明原因）**：Server 数据库其余 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S31 / S32 / S33 / S40 / S41 的 DB 分组登记，本文件不重复登记以免越界。
- [ ] **部署后检查项（smoke）**
  - **未覆盖，原因**：本场景是**桌面端评论 / 建议 / 聊天行为**；SMTP 配置与邮件队列属 S38，Server 部署形态与升级迁移属 `delivery` 模块 S51，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S34-AC-01 | **正常：评论建议聊天与离线排队** — GIVEN 协作者在项目内评论、提建议、聊天，期间断网 / WHEN 恢复连接 / THEN 在线操作实时同步；离线期间的评论等操作排队并在恢复后发出 | ST-S34-01, ST-S34-02, ST-S34-03, ST-S34-04, ST-S34-08, ST-S34-10, UT-S34-01, UT-S34-02, UT-S34-09, UT-S34-10, UT-S34-11, UT-S34-12, UT-S34-13, UT-S34-14, UT-S34-15, UT-S34-16, UT-S34-21, UT-S34-22, UT-S34-23, UT-S34-24, UT-S34-27, UT-S34-28, UT-S34-29, UT-S34-35, UT-S34-36, UT-S34-37, UT-S34-39, UT-S34-40 |
| S34-AC-02 | **异常：comments off** — GIVEN 项目关闭了评论功能 / WHEN 有人发表新评论或对既有评论 resolve / THEN 均被拒绝，但文本编辑继续不受影响 | ST-S34-05, ST-S34-09, UT-S34-03, UT-S34-04, UT-S34-05, UT-S34-06, UT-S34-17, UT-S34-30, UT-S34-31, UT-S34-32 |
| S34-AC-03 | **异常：角色限制** — GIVEN Reviewer 尝试接受建议（包括自己提出的），或 Commenter 尝试改文本/建议/清空他人内容 / WHEN 操作提交 / THEN 均被拒绝 | ST-S34-06, ST-S34-07, UT-S34-33, UT-S34-34, UT-S34-42 |

> 追溯说明：`S34-AC-01` ~ `S34-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S34 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
