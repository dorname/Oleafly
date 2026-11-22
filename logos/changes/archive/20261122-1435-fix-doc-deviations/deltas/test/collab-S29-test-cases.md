<!-- fix-doc-deviations: D12 标注转终态 -->
## MODIFIED — 1.3 来源分组：业务规则（setup code、协议协商、设备准入、分享语义）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S29-37 | 全新 Server 的**首个管理员初始化必须提供 setup code** | 需求 §四 S29「边界：首次 admin 初始化」；场景实现 §四 | `needs_setup = true` | 缺 setup code 的 setup claim | 不授予管理员身份，返回明确错误 |
| UT-S29-38 | 协议不兼容时**停止同步并明确报告，不产生半同步状态** | 需求 §四 S29「异常：协议不兼容」；场景实现 §四、§五 | 客户端与 Server 区间无交集 | 发起同步 | 同步停止；错误可区分客户端过旧 / 服务端过旧；不写入任何变更、不进入降级编辑 |
| UT-S29-39 | 设备被 **suspended** 时登录 / 同步被明确拒绝，不授予访问 | 需求 §四 S29「异常：suspended 或已撤销设备」；inventory S29 行 | 账号 `status = 'suspended'` | 尝试登录 / 同步 | 返回明确错误（准入 suspended → not admitted）；不授予访问 |
| UT-S29-40 | 设备**已被撤销**（令牌家族被 revoke）时登录 / 刷新 / 同步被拒绝 | 需求 §四 S29；场景实现 §四 | 设备已撤销 | 用其令牌请求 | 返回明确错误；不授予访问 |
| UT-S29-41 | 可授予角色只有 Editor / Reviewer / Commenter / Viewer 四种，`Owner` 不可被授予（`grantable`） | 协议 delta §3.2（`roles.rs:24-30`）；场景实现 §二 | 项目已存在 | 逐个 `ProjectRole` 调用 `grantable` | 四种可授予角色返回 true；`Owner` 返回 false（Owner 由项目归属决定） |
| UT-S29-42 | 分享语义按实现口径：重叠文本是 **Loro 自动合并 + 只读 Merge Review**，不是「一切变更都先询问」 | 需求 §四 S32 与 §5.1（原偏差 D12，README 已对齐）；inventory 偏差清单（已回补） | 用户阅读分享说明文案 | 核对文案与实现一致性 | 文案不得声称「asks before it applies anything」式过宽承诺；测试断言以「自动合并 + 只读审查」为准 |
| UT-S29-43 | Server 能力清单中 `encryption = none`，产品不得宣传为端到端加密 | inventory collab 段引言；场景实现 §四 | 能力清单可读 | 读取 `features.encryption` | 值为 `none`；宿主 / 磁盘 / 备份运营者可读项目内容这一事实被如实呈现 |
| UT-S29-44 | 登录相关端点受专门限流中间件约束 | API delta §十一（`lib.rs:84-86`） | Server 已启动 | 高频请求登录端点 | 超限被拒（`RateLimited`），不拖垮 Server |
| UT-S29-45 | 客户端读取 Server 注册表：添加 Server 后本地保存 Server 条目 | 场景实现 §三 Step 5；参与者表 | 登录成功 | 读取本地 Server 注册表 | Server 条目存在，含地址与协议协商结果 |
