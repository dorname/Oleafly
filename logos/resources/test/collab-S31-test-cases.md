## S31 断线重连与增量补发 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S31 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S31 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S31 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S31-reconnect-resync.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **回退是桌面端专属**：WS 连续两次失败后回退 `/frames` + `/poll` long-poll 并每分钟重探；**浏览器端只有 WS 重连、无 long-poll 回退**（见 S40），不得混称。
> - 退避含 jitter；429 / 503 busy 走**长等待**而非高频冲击。
> - 幂等由 Server 依据 `batch_id` / `seq` 与 `project_updates` 判定，客户端不做「保证不重发」的假设。
> - **实时协作 ≠ 云同步**：本场景是实时协作路径①（自建 Server + Loro change log）的断线补发；sync 模块的云同步文件同步、冲突副本与三方合并是**另一套正交机制**，本场景不涉及、不得混称。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（增量补发端点 / 帧字段 / 错误码）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S31-01 | 增量补发上行端点 `POST /api/v1/projects/{project}/frames`（批量提交帧） | API delta §7.1（`routes/poll.rs:38`）；场景实现 §三 Step 6 | 客户端持有未确认批次 | 提交带 `batch_id` 的批次 | 服务端按 `batch_id` / `seq` 比对并处理；已存批次幂等返回 `ack` |
| UT-S31-02 | 增量补发下行端点 `GET /api/v1/projects/{project}/poll`（长轮询取增量） | API delta §7.1（`routes/poll.rs:37`）；场景实现 §三 Step 6 | 服务端有增量待取 | 发起长轮询 | 返回 Server 增量帧；客户端据此合并到本地 Loro 文档 |
| UT-S31-03 | `subscribe` 帧的 `since_seq` 字段用于声明增量起点 | 协议 delta §4.2、§六（`frames.rs:31-35`） | 重连后重新订阅 | 携带上次已知 `since_seq` 的 subscribe 帧 | 服务端从该序号之后返回增量，不重放已确认内容 |
| UT-S31-04 | `subscribed` 帧的 `since_batch`（可选）与 `head_seq` 用于定位批次缺口 | 协议 delta §4.3（`frames.rs:128-136`）；场景实现 §三 Step 6 | 服务端已存若干批次 | 读取 subscribed 帧 | 队头序号与批次起点可解析；缺失的批次区间被识别为缺口 |
| UT-S31-05 | `ack` 帧含 `project_id`、`batch_id`、`seq`，是幂等与清除待发的唯一依据 | 协议 delta §4.3（`frames.rs:144-149`）；场景实现 §五 | 批次被接受 | 读取 ack | `batch_id` 与 `seq` 可定位该批；客户端据此清空待发 |
| UT-S31-06 | 帧错误码中 `rate_limited` 用于表达限流（429）语义 | 协议 delta §4.4（`frames.rs:196-210`） | 客户端超出限流 | 收到限流错误帧 | 错误码为 `rate_limited`；客户端据此进入等待而非立即重试 |
| UT-S31-07 | 项目族与输出族挂 `transfers::retry_soon` 响应中间件，在 429 / 503 busy 场景给出 `Retry-Soon` 语义 | API delta §四（`routes/projects.rs:75`、`routes/outputs.rs:33`） | Server 处于 busy | 请求受中间件保护的端点 | 响应带 `Retry-Soon` 语义；客户端可据此长等待 |
| UT-S31-08 | Server 错误族含 `Unauthorized`、`Forbidden`、`NotFound`、`BadRequest`、`RateLimited`、`SessionEnded`、`Internal` | API delta §十一（`error.rs` 家族） | 触发各类失败 | 逐一触发 | 错误可按类型区分；`RateLimited` 与 `SessionEnded` 分别对应 busy 与会话终止 |
| UT-S31-09 | `/ws` 与 `/poll` 均要求 `Authorization: Bearer`；`/frames` 同属 Bearer 族 | API delta §七；场景实现 §二 | 无凭据 | 无 Bearer 访问三个端点 | 均被拒；补发通道不提供匿名入口 |
| UT-S31-10 | 桌面端 long-poll 上行 / 下行端点为 `/frames`（POST）与 `/poll`（GET），二者成对使用 | API delta §7.3；场景实现 §三 Step 4 | WS 连续失败已回退 | 观察回退后的上行与下行 | 上行走 `/frames`、下行走 `/poll`；不混用浏览器族的 `/web/ws` |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S31-11 | `project_updates` 的 `UNIQUE (project_id, batch_id)` 是**批次幂等的落库保证**：重发同一批次不得产生第二行 | DB delta §二、§三 B 组；`0002_projects.sql` | 已存批次 B | 重发批次 B（`batch_id` 相同，`seq` 不同） | 被 UNIQUE 拒绝；行数不变；服务端据此幂等返回 `ack` |
| UT-S31-12 | `project_updates` 主键 `(project_id, seq)` 保证同一项目序号不重复 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 重放同 `seq` 的行 | 被主键约束拒绝 |
| UT-S31-13 | `project_updates.seq` 单调递增，`projects.head_seq` 记录队头 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 连续写入多批 | `seq` 连续递增；`head_seq` 等于最大 `seq` |
| UT-S31-14 | `refresh_tokens.family_id` 标识令牌家族，家族内一次轮换后其余令牌被撤销 | DB delta §二（0001）；S29 撤销分支 | 已轮换过令牌 | 重用旧刷新令牌 | 旧令牌被拒（家族撤销语义）；设备需重新登录 |
| UT-S31-15 | `refresh_tokens.revoked_at` 与 `access_tokens.expires_at` 记录撤销与到期时刻 | DB delta §二（0001） | 有活跃令牌 | 检查两表 | 到期或撤销后的令牌不可用于重连认证 |
| UT-S31-16 | `project_snapshots` 主键 `(project_id, seq)` 保证同一项目同一快照序号唯一 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 重复插入同 `(project_id, seq)` | 被主键约束拒绝；快照不重复占用序号 |
| UT-S31-17 | `project_updates.envelope` 为 NOT NULL BLOB：补发的变更必须带完整载荷 | DB delta §三 B 组；`0002_projects.sql` | 项目已建立 | 插入空 envelope | 被 NOT NULL 拒绝；不留半条记录 |

### 1.3 来源分组：业务规则（退避与 jitter、busy 长等待、通道切换、幂等补发）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S31-18 | 默认传输选项：`fallback_after = 2`、`retry_socket_every = 60s`、`ping_every = 20s`、`quiet_for = 30s` | 场景实现 §一（`sync/mod.rs:191-207`） | 读取默认选项 | 四项默认值 | 取值与上表一致 |
| UT-S31-19 | 重连退避**含 jitter**：等待时长在上限内随机化，避免多客户端同频重连 | 需求 §四 S31「异常：Server busy 与退避」；场景实现 §四（`reconnect.rs:45`） | 重连引擎可注入随机源 | 同一失败次数下多次计算退避 | 各次等待值不同但不超过上限；不出现固定同频 |
| UT-S31-20 | 退避随失败次数增长到分钟级，一次稳定连接后计数归零重新开始 | 场景实现 §三 Step 3、§四 | 重连引擎 | 连续失败 N 次后成功一次再失败 | 等待随失败次数增长；成功后计数归零，后续重新从低档起步 |
| UT-S31-21 | 退避初期等待上限不超过 **5 秒** | 场景实现 §三 Step 3（`reconnect.rs:401`） | 重连引擎 | 前若干次失败 | 等待不超过 5 秒上限（与 jitter 相容） |
| UT-S31-22 | 收到 429 / 503 busy 时进入**长等待**而非高频冲击，busy 与普通失败使用不同的等待策略 | 需求 §四 S31「异常：Server busy 与退避」；场景实现 §四（`reconnect.rs:76`、`busy_wait`） | 重连引擎 | 连续返回 busy | 走 busy 专用等待分支；请求频率显著低于普通退避 |
| UT-S31-23 | WS **连续两次失败**（`fallback_after = 2`）后回退到 `/frames` + `/poll` long-poll | 需求 §四 S31「正常：桌面 WS 回退 long-poll」；场景实现 §四（`reconnect.rs:168-300`） | 重连引擎 | 连续两次 WS 连接失败 | 传输切换为 long-poll；上行 `/frames`、下行 `/poll` |
| UT-S31-24 | 处于 long-poll 通道时**每分钟**（`retry_socket_every = 60s`）重探一次 WS 可用性；探测失败继续 long-poll，探测成功切回 WS | 需求 §四 S31；场景实现 §三 Step 5 | 已回退到 long-poll | 等待重探周期 | 每分钟探测一次；两种结果均有确定行为，不频繁抖动切换 |
| UT-S31-25 | 断网期间本地编辑的变更**保留不丢弃** | 需求 §四 S31「正常：断线补发」；场景实现 §三 Step 2 | 客户端离线 | 离线期间编辑 | 变更进入本地待发队列；不因离线被清除 |
| UT-S31-26 | 通道恢复后发起**增量补发**，携带未确认批次与 `since_batch` 缺口定位 | 场景实现 §三 Step 6 | 客户端持有未确认批次 | 恢复连接 | 只补发缺失部分；已确认批次被幂等处理，不重复存储 |
| UT-S31-27 | 幂等判定在**服务端**：客户端不做「保证不重发」的假设 | 场景实现 §五；需求 §四 S31「边界：重启后幂等」 | 客户端重启 | 重发已 ack 批次 | 服务端按 `batch_id` / `seq` 幂等处理；`project_updates` 不新增行 |
| UT-S31-28 | 项目文档被判定损坏（damaged）时**同步结束**并给出失败结束原因 | 场景实现 §四（`reconnect.rs`、`sync/mod.rs:180`） | 项目文档损坏 | 触发同步 | 同步终止并给出失败原因；不在损坏状态上继续同步 |
| UT-S31-29 | 补发批次中混入越权 change 时，服务端**逐 change 校验并拒绝** | 场景实现 §四；需求 §四 S33「异常：越权 change 服务端拒绝」 | 已建立会话 | 提交含越权 change 的批次 | 越权部分被拒；不依赖客户端 UI 自我约束 |
| UT-S31-30 | 协议在重连时沿用同一 min/max 协商结果；区间无交集则**停止同步并明确报告**，不回退到更旧协议 | 场景实现 §一、§四 | 重连时会话 | 触发协商失败 | 同步停止并报告；无「降级到更旧协议」的路径 |
| UT-S31-31 | 用户手动「立即重连」可提前打断长等待 | 场景实现 §五「退避边界」 | 客户端处于长等待 | 用户点击立即重连 | 等待被提前结束并立即发起重连 |
| UT-S31-32 | **浏览器端断线只有 WS 重连，无 long-poll 回退**；浏览器端也无离线编辑能力 | 需求 §四 S40「边界：无 long-poll 回退」；场景实现 §四 | 浏览器端 WS 断开 | 触发重连 | 不发起 `/frames` / `/poll`；行为与桌面端明确区分 |
| UT-S31-33 | 项目内容**不是端到端加密**：补发内容经 Server 中转，宿主 / 磁盘 / 备份运营者可读 | inventory collab 段引言；场景实现 §五 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；不宣称 E2E 加密 |

---

## 二、场景测试用例

### 2.1 主路径：断线重连与增量补发

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S31-01 | 断网期间继续编辑，恢复后增量补发且无丢失 | Step 1→3、Step 6→9 | 客户端已连上 Server 并处于 active 同步 | ① 切断网络，客户端进入 `Offline` 并显示重试等待 → ② 断网期间继续编辑（变更本地排队保留）→ ③ 恢复网络并重连 → ④ 客户端携带未确认批次与 `since_batch` 发起补发 → ⑤ 服务端比对 `project_updates` → ⑥ 客户端把补发结果与增量合并进本地 Loro 文档 | 同步状态回到已连接；**断网期间的工作完整保留、无丢失**；服务端返回缺失增量，已存批次幂等不重复存储；两端内容收敛 |
| ST-S31-02 | 桌面端 WS 连续两次失败后回退 long-poll 并每分钟重探 | Step 4→5 | 桌面端在线；WS 端点不可用 | ① 制造 WS 连接连续失败 → ② 观察传输切换 → ③ 等待超过一个重探周期（`retry_socket_every = 60s`） | 客户端回退到 `/frames`（POST 上行）+ `/poll`（GET 长轮询）；每分钟重探一次 WS：探测失败继续 long-poll，探测成功切回 WebSocket；**该回退仅桌面端具备** |

### 2.2 异常路径

> EX 编号与 `collab-S31-reconnect-resync.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S31-01 | WS 连续两次失败 | 桌面端 WS 连接连续失败达到 `fallback_after = 2` | S31-AC-02 |
| EX-S31-02 | Server busy / 限流 | 重连请求收到 429 / 503 busy | S31-AC-03 |
| EX-S31-03 | 退避抖动 | 连续重试 | S31-AC-03 |
| EX-S31-04 | 重启后重发已确认批次 | 客户端重启后重发已被 `ack` 的批次 | S31-AC-04 |
| EX-S31-05 | 通道损坏 | 项目文档被判定损坏（damaged） | S31-AC-01 |
| EX-S31-06 | 越权变更混入补发 | 补发批次中含超出角色的 change | S31-AC-01 |
| EX-S31-07 | 浏览器端断线 | 浏览器端 WS 断线 | S31-AC-02 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S31-03 | 429 / 503 busy 时进入长等待而非高频冲击 | EX-S31-02 | Server 处于 busy | 重连请求收到 429 / 503 | 客户端走 busy 专用长等待；请求频率显著降低；等待可被用户手动「立即重连」打断 |
| ST-S31-04 | 退避含 jitter 且随失败次数增长 | EX-S31-03 | 重连引擎 | 连续多次重连失败 | 各次等待时长在上限内随机化（不同客户端不同频）；等待随失败次数增长到分钟级；一次稳定连接后计数归零 |
| ST-S31-05 | 客户端重启后重发已确认批次被幂等处理 | EX-S31-04 | 某批次已被服务端 ack 并存储 | 客户端重启后重发该批次 | 服务端幂等处理，**不重复存储**；`project_updates` 行数不变；客户端据 ack 收敛到与 Server 一致 |
| ST-S31-06 | 项目文档损坏时同步结束并给出失败原因 | EX-S31-05 | 项目文档被判定损坏 | 触发同步 | 同步终止并给出失败结束原因；不在损坏状态上继续同步 |
| ST-S31-07 | 补发批次中的越权 change 被逐 change 拒绝 | EX-S31-06 | 已建立会话 | 提交含越权 change 的补发批次 | 越权部分被服务端拒绝并给出明确结果；合法部分正常落库；客户端 UI 不是安全边界 |
| ST-S31-08 | 浏览器端断线只有 WS 重连、无 long-poll 回退 | EX-S31-07 | 浏览器端在线协作 | 断开浏览器 WS | 浏览器端**不发起** `/frames` / `/poll`，只做 WS 重连；与桌面端回退行为明确区分（浏览器端亦无离线编辑能力） |
| ST-S31-09 | WS 连续两次失败后回退 long-poll 并每分钟重探 | EX-S31-01 | 桌面端在线；WS 端点连续两次连接失败 | ① 制造 WS 连续两次失败（达 `fallback_after = 2`）→ ② 观察传输通道切换 → ③ 等待一个重探周期（`retry_socket_every = 60s`） | 传输回退为 `/frames`（POST 上行）+ `/poll`（GET 长轮询）；每分钟重探一次 WS：探测失败继续 long-poll，探测成功切回 WebSocket；**该回退仅桌面端具备**（浏览器端无，见 ST-S31-08） |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S31-10 [manual] | 真实网络中断下的恢复体验 | Step 1→9 | 真实网络环境（可断网 / 限速） | ① 断网并编辑 → ② 恢复网络 → ③ 观察补发与收敛 | 人工确认恢复过程无丢批、无重复内容，界面状态提示正确（真实网络抖动在 CI 中不可稳定复现） |
| ST-S31-11 [manual] | 弱网 / 高延迟下的 busy 长等待观感 | Step 3 | Server 处于高负载 | 制造 429 / 503 | 人工确认等待节奏合理、界面给出可理解的重试提示，不出现高频刷屏 |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S31-AC-01（正常：断线补发）→ ST-S31-01、UT-S31-03、UT-S31-04、UT-S31-25、UT-S31-26
  - S31-AC-02（正常：桌面 WS 回退 long-poll）→ ST-S31-02、ST-S31-08、ST-S31-09、UT-S31-18、UT-S31-23、UT-S31-24、UT-S31-32
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S31-AC-03（异常：Server busy 与退避）→ ST-S31-03、ST-S31-04、UT-S31-06、UT-S31-07、UT-S31-19、UT-S31-20、UT-S31-21、UT-S31-22、UT-S31-31
  - S31-AC-04（边界：重启后幂等）→ ST-S31-05、UT-S31-05、UT-S31-11、UT-S31-12、UT-S31-13、UT-S31-27
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S31-01→ST-S31-09、EX-S31-02→ST-S31-03、EX-S31-03→ST-S31-04、EX-S31-04→ST-S31-05、EX-S31-05→ST-S31-06、EX-S31-06→ST-S31-07、EX-S31-07→ST-S31-08（7/7 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「端点与帧中不可省略的字段」等价覆盖：`/frames`（UT-S31-01）、`/poll`（UT-S31-02）、`subscribe.since_seq`（UT-S31-03）、`subscribed.since_batch` / `head_seq`（UT-S31-04）、`ack.batch_id` / `seq`（UT-S31-05）、错误码 `rate_limited`（UT-S31-06）、`Retry-Soon` 语义（UT-S31-07）、错误族分类（UT-S31-08）、Bearer 要求（UT-S31-09）、桌面回退端点对（UT-S31-10）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增端点或帧字段时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `project_updates` UNIQUE `(project_id, batch_id)`（UT-S31-11）、`project_updates` PK `(project_id, seq)`（UT-S31-12）、`seq` 连续性与 `head_seq`（UT-S31-13）、`refresh_tokens.family_id`（UT-S31-14）、`refresh_tokens.revoked_at` / `access_tokens.expires_at`（UT-S31-15）、`project_snapshots` PK（UT-S31-16）、`project_updates.envelope` NOT NULL（UT-S31-17）。
  - **未覆盖（说明原因）**：其余 Server 表的 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S33 / S40 / S41 的 DB 分组登记，本文件不重复登记以免越界。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景是**桌面端同步引擎行为**，Server 部署形态、健康检查与升级迁移属 `delivery` 模块 S51；本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S31-AC-01 | **正常：断线补发** — GIVEN 客户端断网期间继续编辑 / WHEN 网络恢复重连 / THEN 本地变更增量补发并与服务端合并，无丢失 | ST-S31-01, ST-S31-06, ST-S31-07, UT-S31-01, UT-S31-02, UT-S31-03, UT-S31-04, UT-S31-05, UT-S31-11, UT-S31-12, UT-S31-13, UT-S31-17, UT-S31-25, UT-S31-26, UT-S31-27, UT-S31-28, UT-S31-29, UT-S31-30 |
| S31-AC-02 | **正常：桌面 WS 回退 long-poll** — GIVEN 桌面端 WS 连接连续两次失败 / WHEN 客户端维持同步 / THEN 回退 `/frames`+`/poll` 传输，并每分钟重探 WS 可用性（该回退仅桌面端有，浏览器端无，见 S40） | ST-S31-02, ST-S31-08, ST-S31-09, UT-S31-01, UT-S31-02, UT-S31-09, UT-S31-10, UT-S31-18, UT-S31-23, UT-S31-24, UT-S31-32 |
| S31-AC-03 | **异常：Server busy 与退避** — GIVEN 重连请求收到 429/503 busy / WHEN 客户端重试 / THEN 进入长等待而非高频冲击；重连退避含 jitter | ST-S31-03, ST-S31-04, UT-S31-06, UT-S31-07, UT-S31-19, UT-S31-20, UT-S31-21, UT-S31-22, UT-S31-31 |
| S31-AC-04 | **边界：重启后幂等** — GIVEN 客户端重启后重发已确认的 batch / WHEN 服务端处理 / THEN 幂等处理，不重复存储 | ST-S31-05, UT-S31-05, UT-S31-11, UT-S31-12, UT-S31-13, UT-S31-14, UT-S31-15, UT-S31-27 |

> 追溯说明：`S31-AC-01` ~ `S31-AC-04` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S31 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
