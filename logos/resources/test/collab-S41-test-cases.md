## S41 浏览器会话安全 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`。
> **本文件性质**：**只读静态盘点**产物。全部用例由 `inventory.md` collab 段 S41 行、`deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S41 节、`deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` S41 节、`deltas/prd/3-technical-plan/2-scenario-implementation/collab-S41-browser-session.md`、`deltas/api/collab-01-server-api.md`、`deltas/api/collab-02-collab-protocol.md`、`deltas/database/collab-01-server-schema.md` 静态推导而来。
> **未运行任何测试**：本文件**未执行**任何单元测试、场景测试或端到端测试，**不预填任何 PASS / FAIL 结论**；「预期输出」列描述的是**应当被断言的行为**，不是已观测结果。动态证据留待 `openlogos verify` 阶段单独取证。
> **不发明声明**：本文件不新增需求、不新增 API、不新增字段；只登记已实现能力的测试设计。
> **口径红线（本场景强制）**：
> - **实时协作 ≠ 云同步**：浏览器会话是实时协作路径①的访问控制；sync 模块的云同步凭据（Dropbox/Drive/S3 OAuth 等）是**另一套正交机制**，本场景不涉及、不得混称。
> - 服务端**只存会话令牌哈希**，不存明文令牌；会话期限 **30 天**。
> - 写请求需**精确 Origin 匹配** + **app marker** 双重校验，判定**完全在服务端**（请求可由任意客户端伪造，浏览器端带头不构成安全保证）。
> - 页面带**严格 CSP**，其中 `frame-ancestors 'none'` 禁止被嵌入；CSP 与 cookie 属性是**两个独立防护**，不可互相替代。
> - 浏览器路径（会话 cookie + `/web/*`）与桌面路径（设备凭据 + `/api/v1/*`）是**两套会话模型**，不得混写。
>
> **称谓差异说明（只登记，不改需求）**：需求文档与 API delta 把 app marker 写作 **`X-Oleafly-Requested-With`**；当前实现读取的头名是 `x-requested-with`，其值为 `oleafly-web`（`web/mod.rs:27-28`）。本文件的断言按**实现**登记，并在用例中同时标注文档称谓；文档回补另立变更，本基线以实现为准。

---

## 一、单元测试用例

### 1.1 来源分组：API 字段约束（浏览器族端点 / 会话 cookie / 错误码）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S41-01 | 浏览器会话期限常量为 `SESSION_DAYS = 30`，`SESSION_TTL_MS = SESSION_DAYS * DAY_MS` | 场景实现 §一（`web_sessions.rs:27-28`） | Server 已启动 | 读取常量 | 会话到期时间为建立时间 + 30 天 |
| UT-S41-02 | 会话 cookie 名为 `oleafly_web`；在 host-only 绑定配置下为 `__Host-oleafly_web` | 场景实现 §一（`web_sessions.rs:24-25`、`:300-304`） | 两种绑定配置各一 | 建立会话 | 下发的 `Set-Cookie` 名称符合当前绑定配置；两种名称不混用 |
| UT-S41-03 | 会话 cookie 属性为 `HttpOnly`、`SameSite=Lax`、`Path={前缀}/`、`Max-Age=30 天秒数` | 场景实现 §三 Step 3、§五；`web_sessions.rs:347-360` | 建立会话 | 检查 `Set-Cookie` | 四项属性齐备；作用域限定在浏览器应用路径下 |
| UT-S41-04 | `Secure` 属性在本机明文 HTTP 场景下**例外省略**，其余场景必须带 | 场景实现 §三 Step 3、§五；`web_sessions.rs:332-345` | `public_url` 为 https / 为本机回环 http | 建立会话 | https 与非回环 http 下带 `Secure`；回环明文 http 下不带 |
| UT-S41-05 | 会话令牌长度为 `TOKEN_CHARS = 43`，字符集限定为 ASCII 字母数字与 `-` / `_` | `web_sessions.rs:34`、`:308-330` | 浏览器端可用 | 读取并校验 cookie 值 | 合法令牌被接受；长度不符或含非法字符的令牌不被信任 |
| UT-S41-06 | `presented` 只读取**期望 cookie 名**且格式合法的值；同名 cookie 出现多个时**不被信任** | 场景实现 §四「令牌旁带伪造」；`web_sessions.rs:308-330` | 构造带伪造同名 cookie 的请求头 | 解析 cookie | 格式非法的项被过滤；出现多于一个候选时返回 `None`（不任选其一） |
| UT-S41-07 | `web_sessions` 表**只存 token 哈希**，服务端不保存明文令牌 | DB delta §三 F 组；场景实现 §五「会话边界」 | 已建立会话 | 检查数据库内容 | 无明文令牌列或值；明文只存在于下发给浏览器的 cookie 中 |
| UT-S41-08 | app marker 常量：请求头名 `x-requested-with`、值 `oleafly-web`（文档称谓 `X-Oleafly-Requested-With`） | 场景实现 §一、§三 Step 5；`web/mod.rs:27-28` | Server 已启动 | 检查常量 | 写请求携带该标记头时校验通过；缺失或值不符时判定失败 |
| UT-S41-09 | `same_origin` 要求**恰好一个** `Origin` 头且其值**精确等于** `public_url` 的 origin；零个或多个 Origin 头均判定为不匹配 | 场景实现 §三 Step 5；`web/mod.rs:166-173` | 已配置 `public_url` | 分别传入无 Origin、单个正确 Origin、单个错误 Origin、两个 Origin 头 | 仅「单个且精确相等」通过；其余全部不通过（不做前缀 / 包含匹配） |
| UT-S41-10 | `requested_by_the_app` = **app marker 存在且值正确** **且** `same_origin` 成立，二者同时满足才通过 | 场景实现 §三 Step 5、§五；`web/mod.rs:175-180` | Server 已启动 | 分别只满足其一 / 两者都满足 | 缺任一条件均判为跨站；两者齐备才通过 |
| UT-S41-11 | `cross_site` 错误的形状：状态码 403、错误码 `cross_site`、消息明示「该请求并非来自本 Server 上的 Oleafly 网页应用」 | 场景实现 §四「Origin 错误」；`web/mod.rs:183-189` | 触发跨站判定 | 读取错误响应 | 状态码与错误码符合；消息文本与实现一致，不泄露内部细节 |
| UT-S41-12 | 写路径守卫：写请求先经 `changing`（校验 app marker 与 Origin），再经 `signed_in`（解析会话并校验到期） | 场景实现 §三 Step 4→6；`web/mod.rs:145-164` | Server 开启 `features.web` | 写请求未带 marker | 返回 `cross_site`（403），**不进入会话解析**；marker 正确但会话无效时返回会话类错误 |
| UT-S41-13 | `features.web` 未开启时，浏览器写路径返回 `NotFound` | `web/mod.rs:156-159` | Server 未开启浏览器访问 | 发起浏览器写请求 | 返回 `NotFound`；不暴露浏览器接口 |
| UT-S41-14 | 严格 CSP 内容含 `default-src 'self'`、`script-src 'self' 'wasm-unsafe-eval'`、`connect-src`、`img-src`、`worker-src`、`style-src`，且 **`frame-ancestors 'none'`** | 场景实现 §三 Step 7、§四「被 framing」；`web/assets.rs:69`、`:298` | 访问任意 `/web/*` 页面 | 检查响应头 | CSP 头存在且含 `frame-ancestors 'none'`；各指令齐全 |
| UT-S41-15 | 项目过大错误 `project_too_large` 映射为 **409 CONFLICT**；服务繁忙 `server_busy` 映射为 **503 SERVICE_UNAVAILABLE** | 场景实现 §四「项目过大 / 服务繁忙」；`web/api.rs:185-186` | 触发两类失败 | 读取错误响应 | 两者是**独立的错误分类**且状态码符合；不被归为通用失败 |
| UT-S41-16 | 浏览器族端点错误族沿用 Server 通用错误结构：`Unauthorized` / `Forbidden` / `NotFound` / `BadRequest` / `RateLimited` / `SessionEnded` / `Internal` | API delta §十一 | 触发各类失败 | 逐一触发 | 错误可按类型区分；浏览器族与桌面族共用同一错误家族 |
| UT-S41-17 | 浏览器族与 API 族认证**不可混用**：浏览器族凭会话 cookie，桌面 / API 族凭 `Authorization: Bearer` | API delta §3.2、§十二 | 两类客户端各一 | 交叉尝试凭据 | 交叉使用不被接受；不存在「浏览器 Bearer」或「桌面 cookie」的混用路径 |
| UT-S41-18 | 登出端点 `POST /web/api/sign-out` 清除会话 cookie | API delta §八（`web/mod.rs:49`）；`web_sessions.rs:365-367` | 浏览器已登录 | 调用登出 | 返回清空 cookie（`Max-Age=0`）；会话在服务端被结束 |
| UT-S41-19 | 浏览器会话绑定设备：`web_sessions.device_id` 指向 `devices(id)`，并以 `platform = 'web'`（`PLATFORM = "web"`）区分平台 | DB delta §三 F 组（0018）；`web_sessions.rs:26` | 已建立浏览器会话 | 检查会话记录 | 会话绑定到浏览器设备；与桌面设备登录记录可区分 |
| UT-S41-20 | 返回路径参数上限 `MAX_RETURN_CHARS = 512`，且只接受浏览器应用路径内的返回目标 | `web_sessions.rs:33`、`:57-75` | 登录流程带返回路径 | 传入超长 / 越界返回路径 | 超长被截断或拒绝；越界路径回落到应用首页 `HOME = "/web/"` |

### 1.2 来源分组：DB 约束（SQLite UNIQUE / CHECK）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S41-21 | `web_sessions.token_hash` 为主键：同一令牌只存一行，且只存哈希 | DB delta §二（0018）；`0018_web_sessions.sql` | 已建立会话 | 重复写入同一 `token_hash` | 被主键约束拒绝；重复登录不产生第二行 |
| UT-S41-22 | `web_sessions.device_id` 为 UNIQUE：一台设备只保留一个浏览器会话 | DB delta §二（0018） | 已有会话 | 为同一 `device_id` 再插一行 | 被 UNIQUE 拒绝；再次登录须先结束旧会话 |
| UT-S41-23 | `web_sessions.account_id` 外键指向 `accounts(id)` 且 `ON DELETE CASCADE` | DB delta §三 F 组（0018） | 已有会话 | 删除账号 | 会话行随之删除；无悬挂会话 |
| UT-S41-24 | `web_sessions.mode` 的 CHECK 只允许 `'editing'` / `'suggesting'` | DB delta §二（0018） | 已有会话 | 写入 `'suggesting'` / 写入 `'viewing'` | 合法值成功；非法值被 CHECK 拒绝 |
| UT-S41-25 | `web_sessions.expires_at` 为 NOT NULL 且与 `created_at` 相差 30 天 | DB delta §二（0018）；场景实现 §一 | 已建立会话 | 读取两列 | `expires_at` 非空且等于 `created_at + 30 天` |
| UT-S41-26 | `web_sessions_expires` 索引按 `expires_at` 建立，支持过期会话清理 | DB delta §三 F 组（0018） | 已建立会话 | 检查索引 | 索引存在；过期会话可被清理路径命中 |
| UT-S41-27 | `devices.public_key` UNIQUE 与 `devices.account_id` FK：浏览器会话绑定的设备不得重复登记同一公钥 | DB delta §二（0001）；`0018_web_sessions.sql` | 已登记设备 | 再次插入相同 `public_key` | 被 UNIQUE 拒绝 |
| UT-S41-28 | `accounts.status` 的 CHECK 只允许 `'active'` / `'suspended'` / `'removed'`：账号状态终止时浏览器访问亦终止 | DB delta §二（0001） | 账号 active | 写入 `'removed'` | 成功；该账号的浏览器会话不再获得访问 |

### 1.3 来源分组：业务规则（会话生命周期、双重校验、CSP、错误分类、边界声明）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S41-29 | 登录成功建立 30 天会话：令牌随机生成、**哈希后入库**，到期时间 = 建立时间 + 30 天，并绑定浏览器设备 | 场景实现 §三 Step 1→2；§五「会话边界」 | 浏览器登录 | 完成登录 | `web_sessions` 写入哈希、到期与设备绑定；无明文令牌入库 |
| UT-S41-30 | 读请求携带会话 cookie 即可解析身份；解析时校验到期 | 场景实现 §三 Step 4 | 已建立会话 | 读请求带 cookie | 会话被解析并返回当前身份；过期会话被拒 |
| UT-S41-31 | **会话过期视为登出**，结束当前访问 | 需求 §四 S41「异常：会话过期与访问终止」；场景实现 §四 | 会话超过 30 天 | 带过期会话发请求 | 请求被拒（会话类错误）；浏览器端按登出处理 |
| UT-S41-32 | 服务端判定 `forbidden` / `not_found` / `removed` / `archived` 时**结束当前访问** | 需求 §四 S41；场景实现 §四 | 权限被终止或项目不可见 | 请求触发对应判定 | 返回对应错误码；浏览器端结束访问而非停留在半可用状态 |
| UT-S41-33 | Origin 不匹配的写请求按 **cross_site** 拒绝（403） | 需求 §四 S41「异常：Origin 错误」；场景实现 §四 | 已登录 | 写请求带错误 Origin | 判为 `cross_site` 并拒绝；消息明示来源不合法 |
| UT-S41-34 | 缺少 app marker 的写请求同样按 cross_site 拒绝 | 场景实现 §四「缺少 app marker」 | 已登录 | 写请求不带 marker | 判为 `cross_site` 并拒绝；marker 校验与 Origin 校验**并列**而非二选一 |
| UT-S41-35 | **双重校验的判定完全落在服务端**：请求可由任意客户端伪造，浏览器端带头不构成安全保证 | 场景实现 §五「写请求边界」 | — | 审查判定位置 | 判定逻辑位于 Server 路由层；前端是否带头不影响判定结果 |
| UT-S41-36 | 严格 CSP **禁止被嵌入**（`frame-ancestors 'none'`） | 需求 §四 S41「正常：会话建立与写请求防护」；场景实现 §四「被 framing」 | 页面可访问 | 由第三方站点尝试 iframe 嵌入 | 浏览器拒绝渲染；CSP 头中 `frame-ancestors 'none'` 存在 |
| UT-S41-37 | **CSP 与 cookie 属性是两个独立防护**，不可互相替代 | 场景实现 §五「页面边界」 | — | 审查防护层次 | 两项防护各自独立生效；测试分别断言，不以其一推断另一 |
| UT-S41-38 | 项目过大返回 `project_too_large`，服务繁忙返回 `server_busy`，两者为**独立错误分类** | 需求 §四 S41「异常：Origin 错误与限流/容量错误」；场景实现 §四 | 分别触发两类失败 | 读取错误响应 | 错误码分别为 `project_too_large` / `server_busy`；不归为通用失败或同一类 |
| UT-S41-39 | 会话有效**不等于**有权改动内容：写操作仍受服务端逐 change 的角色校验约束 | 场景实现 §五「权限边界」；需求 §四 S33 | 浏览器会话有效但角色受限 | 提交越权写操作 | 被拒绝（会话层通过、授权层拒绝）；会话层不替代授权层 |
| UT-S41-40 | 令牌旁带伪造：真实 cookie 旁附带同名伪造 cookie 时，伪造项不被信任 | 场景实现 §四「令牌旁带伪造」 | 构造双 cookie 请求头 | 解析会话 | 解析结果为「无有效令牌」；不采信伪造项，也不因存在两个候选而任选其一 |
| UT-S41-41 | 浏览器路径与桌面路径是**两套会话模型**：桌面端凭设备凭据与 `/api/v1/*`，浏览器凭会话 cookie 与 `/web/*` | 场景实现 §三、§五「范围边界」；API delta §3.2 | 两类客户端各一 | 交叉使用凭据 | 互不接受；本场景不重复登记桌面端登录与设备登记（S29） |
| UT-S41-42 | 浏览器端**没有 long-poll 回退**，只有 WS 重连；桌面端才有 WS 失败两次后的 long-poll 回退 | 场景实现 §五「协议与通道边界」；需求 §四 S40 | 两端各一 | 断开连接 | 行为按端区分；本场景不把桌面回退能力写成浏览器能力 |
| UT-S41-43 | 项目内容**不是端到端加密**：Server 能力 `encryption = none`；会话令牌在服务端以哈希存储，不存明文 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；两处事实（内容非 E2E 加密、令牌非明文存储）均如实呈现 |
| UT-S41-44 | 本场景只覆盖**浏览器会话**；Guest admission、Admin 控制台、桌面端凭据分属 S36 / S37 / S29 | 场景实现 §五「范围边界」 | — | 审查范围 | 不越界登记其他场景的会话与授权语义 |

---

## 二、场景测试用例

### 2.1 主路径：浏览器会话安全

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S41-01 | 登录建立 30 天会话并下发安全 cookie | Step 1→3 | Server 开启浏览器访问能力 | ① 浏览器完成登录 → ② Server 生成令牌（哈希后入库）并写入 `web_sessions`（到期 = 建立时间 + 30 天，绑定设备）→ ③ 响应下发会话 cookie | cookie 为 **HttpOnly / SameSite=Lax / Secure**（本机明文 http 场景除外）；`Path` 限定在浏览器应用路径；`Max-Age` 对应 30 天；服务端**只存哈希** |
| ST-S41-02 | 读请求凭会话 cookie 解析身份 | Step 4 | 会话有效 | ① 浏览器发读请求并携带 cookie → ② Server 解析 cookie 与会话并校验到期 → ③ 返回内容 | 会话被正确解析；过期会话被拒；旁带的伪造同名 cookie 不被信任 |
| ST-S41-03 | 写请求的精确 Origin + app marker 双重校验 | Step 5→6 | 会话有效 | ① 写请求携带 cookie 与 `x-requested-with: oleafly-web`（文档称 `X-Oleafly-Requested-With`）→ ② Origin 精确等于 Server 公开地址 origin → ③ 执行写操作 | 双重校验通过后写操作执行成功；两者任一不满足即 403 `cross_site` |
| ST-S41-04 | 页面响应带严格 CSP 且禁止被嵌入 | Step 7 | 页面可访问 | ① 访问任意 `/web/*` 页面 → ② 检查响应头 → ③ 由第三方站点尝试 iframe 嵌入 | CSP 头含 `default-src 'self'` 与 **`frame-ancestors 'none'`**；第三方嵌入被浏览器拒绝 |

### 2.2 异常路径

> EX 编号与 `collab-S41-browser-session.md` §四「失败与降级分支」表的分支一一对应。

| EX 编号 | 对应失败分支 | 触发 | 对应验收条件 |
|---|---|---|---|
| EX-S41-01 | 会话过期 | 浏览器会话超过 30 天期限 | S41-AC-02 |
| EX-S41-02 | 访问终止 | 服务端判定 `forbidden` / `not_found` / `removed` / `archived` | S41-AC-02 |
| EX-S41-03 | Origin 错误 | 写请求来自错误 Origin | S41-AC-03 |
| EX-S41-04 | 缺少 app marker | 写请求未带 app marker 头 | S41-AC-03 |
| EX-S41-05 | 项目过大 | 请求体 / 项目超过上限 | S41-AC-03 |
| EX-S41-06 | 服务繁忙 | Server 过载 | S41-AC-03 |
| EX-S41-07 | 被 framing | 第三方站点尝试嵌入 | S41-AC-01 |
| EX-S41-08 | 令牌旁带伪造 | 客户端在真实 cookie 旁附带同名伪造 cookie | S41-AC-01 |

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S41-05 | 会话过期被视为登出 | EX-S41-01 | 会话超过 30 天期限 | 带过期会话发起请求 | 请求被拒；浏览器端按登出处理并结束当前访问 |
| ST-S41-06 | 权限终止类错误结束当前访问 | EX-S41-02 | 权限被终止 / 项目不可见 | 触发 `forbidden` / `not_found` / `removed` / `archived` | 返回对应错误码；浏览器端结束访问，不停留在半可用状态 |
| ST-S41-07 | Origin 错误按 cross_site 拒绝 | EX-S41-03 | 已登录 | 写请求带错误 Origin | 403 `cross_site`；消息明示该请求并非来自本 Server 上的 Oleafly 网页应用 |
| ST-S41-08 | 缺少 app marker 按 cross_site 拒绝 | EX-S41-04 | 已登录 | 写请求不带 marker 头 | 403 `cross_site`；与 Origin 校验并列生效，二者都通过才放行 |
| ST-S41-09 | 项目过大返回 `project_too_large` | EX-S41-05 | 项目或请求体超过上限 | 触发该失败 | 返回 `project_too_large`（409 CONFLICT）；为独立错误分类 |
| ST-S41-10 | 服务繁忙返回 `server_busy` | EX-S41-06 | Server 过载 | 触发该失败 | 返回 `server_busy`（503 SERVICE_UNAVAILABLE）；与 `project_too_large` 分类不同 |
| ST-S41-11 | 第三方站点无法嵌入浏览器应用页面 | EX-S41-07 | 页面可访问 | 由第三方站点 iframe 嵌入 | 浏览器拒绝渲染；CSP 含 `frame-ancestors 'none'`；**cookie 属性不能替代该防护** |
| ST-S41-12 | 旁带伪造同名 cookie 不被信任 | EX-S41-08 | 会话有效 | 请求同时携带真实 cookie 与同名伪造 cookie | 伪造项不被采信；解析不产生有效会话（不因存在多个候选而任选其一） |

### 2.3 人工验证用例（`[manual]`）

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 验证方式 |
|---|---|---|---|---|---|
| ST-S41-13 [manual] | 浏览器 cookie 属性在真实浏览器开发者工具中的呈现 | Step 3 | 真实浏览器 + 真实 Server | 登录后查看 cookie 明细 | 人工确认 HttpOnly / Secure / SameSite=Lax / Path / Max-Age 与实现一致（真实浏览器行为需人工核对） |
| ST-S41-14 [manual] | 第三方站点 iframe 嵌入的真实拦截表现 | Step 7 | 可控的第三方页面 | 在第三方页面嵌入 `/web/` 页面 | 人工确认浏览器拒绝渲染且控制台可见 CSP 拦截（跨源嵌入表现需人工确认） |

---

## 三、覆盖度校验

- [x] **Phase 1 正常验收条件至少对应 1 个 ST 用例**
  - S41-AC-01（正常：会话建立与写请求防护）→ ST-S41-01、ST-S41-02、ST-S41-03、ST-S41-04、ST-S41-11、ST-S41-12、UT-S41-01 ~ UT-S41-20、UT-S41-25、UT-S41-26、UT-S41-29、UT-S41-30、UT-S41-36、UT-S41-37、UT-S41-40
- [x] **Phase 1 异常验收条件至少对应 1 个 ST 或 UT 用例**
  - S41-AC-02（异常：会话过期与访问终止）→ ST-S41-05、ST-S41-06、UT-S41-21、UT-S41-22、UT-S41-23、UT-S41-28、UT-S41-31、UT-S41-32
  - S41-AC-03（异常：Origin 错误与限流/容量错误）→ ST-S41-07、ST-S41-08、ST-S41-09、ST-S41-10、UT-S41-08 ~ UT-S41-11、UT-S41-15、UT-S41-16、UT-S41-33、UT-S41-34、UT-S41-35、UT-S41-38
- [x] **每个 EX 异常用例至少对应 1 个 ST 用例**：EX-S41-01→ST-S41-05、EX-S41-02→ST-S41-06、EX-S41-03→ST-S41-07、EX-S41-04→ST-S41-08、EX-S41-05→ST-S41-09、EX-S41-06→ST-S41-10、EX-S41-07→ST-S41-11、EX-S41-08→ST-S41-12（8/8 全覆盖）
- [x] **API 每个 `required` 字段至少 1 个 UT 用例**
  - 说明：`deltas/api/collab-01-server-api.md` 与 `collab-02-collab-protocol.md` 是**现状契约快照**，全文未使用 OpenAPI 的 `required` 关键字；本项按「会话 / cookie / 端点 / 错误码中不可省略的要素」等价覆盖：30 天期限（UT-S41-01）、cookie 名（UT-S41-02）、cookie 属性与作用域（UT-S41-03、UT-S41-04）、令牌形状（UT-S41-05）、cookie 解析与伪造防护（UT-S41-06）、只存哈希（UT-S41-07）、app marker 常量（UT-S41-08）、Origin 精确匹配（UT-S41-09）、双重校验组合（UT-S41-10）、`cross_site` 错误形状（UT-S41-11）、写路径守卫顺序（UT-S41-12）、`features.web` 关闭行为（UT-S41-13）、CSP 内容（UT-S41-14）、`project_too_large` / `server_busy` 映射（UT-S41-15）、错误族（UT-S41-16）、cookie 与 Bearer 分族（UT-S41-17）、登出端点（UT-S41-18）、会话绑定设备与平台（UT-S41-19）、返回路径上限（UT-S41-20）。
  - **未覆盖（说明原因）**：契约未标注任何 `required` 字段，不存在按 OpenAPI 枚举的剩余清单项；契约新增会话要素或端点时须同步补充本节。
- [x] **DB 每个 `UNIQUE` / `CHECK` 约束至少 1 个 UT 用例**
  - `web_sessions.token_hash` PK（UT-S41-21）、`web_sessions.device_id` UNIQUE（UT-S41-22）、`web_sessions.account_id` FK（UT-S41-23）、`web_sessions.mode` CHECK（UT-S41-24）、`web_sessions.expires_at` NOT NULL 与 30 天语义（UT-S41-25）、`web_sessions_expires` 索引（UT-S41-26）、`devices.public_key` UNIQUE（UT-S41-27）、`accounts.status` CHECK（UT-S41-28）。
  - **未覆盖（说明原因）**：Server 数据库其余 `UNIQUE` / `CHECK` 约束已在 S29 / S30 / S31 / S32 / S33 / S34 / S35 / S40 的 DB 分组登记，本文件不重复登记以免越界。
- [x] **部署后检查项（smoke）**：**本场景不单独产出**——本场景是**浏览器会话与写请求防护**；Server 部署形态（TLS / 反向代理 / Caddy）、健康检查与升级迁移属 `delivery` 模块 S51，本文件不越界登记。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S41-AC-01 | **正常：会话建立与写请求防护** — GIVEN 浏览器登录成功 / WHEN 建立 30 天会话并发起写请求 / THEN cookie 为 HttpOnly/Secure/Lax；写请求要求精确 Origin 与 `X-Oleafly-Requested-With` 头；严格 CSP 禁止 framing | ST-S41-01, ST-S41-02, ST-S41-03, ST-S41-04, ST-S41-11, ST-S41-12, UT-S41-01, UT-S41-02, UT-S41-03, UT-S41-04, UT-S41-05, UT-S41-06, UT-S41-07, UT-S41-08, UT-S41-09, UT-S41-10, UT-S41-11, UT-S41-12, UT-S41-13, UT-S41-14, UT-S41-16, UT-S41-17, UT-S41-18, UT-S41-19, UT-S41-20, UT-S41-25, UT-S41-26, UT-S41-29, UT-S41-30, UT-S41-36, UT-S41-37, UT-S41-40 |
| S41-AC-02 | **异常：会话过期与访问终止** — GIVEN 会话过期，或服务端判定 forbidden/not_found/removed/archived / WHEN 浏览器请求 / THEN 过期会话视为登出；对应错误结束当前访问 | ST-S41-05, ST-S41-06, UT-S41-21, UT-S41-22, UT-S41-23, UT-S41-28, UT-S41-31, UT-S41-32 |
| S41-AC-03 | **异常：Origin 错误与限流/容量错误** — GIVEN 写请求来自错误 Origin，或项目过大/服务繁忙 / WHEN 请求到达服务端 / THEN Origin 错误按 cross_site 拒绝；返回 `project_too_large`/`server_busy` 明确错误 | ST-S41-07, ST-S41-08, ST-S41-09, ST-S41-10, UT-S41-11, UT-S41-15, UT-S41-33, UT-S41-34, UT-S41-35, UT-S41-38 |

> 追溯说明：`S41-AC-01` ~ `S41-AC-03` 按 `deltas/prd/1-product-requirements/collab-01-requirements.md` §四 S41 节中「正常 / 异常 / 边界」验收条件的出现顺序连续编号，正常与异常统一编号。
