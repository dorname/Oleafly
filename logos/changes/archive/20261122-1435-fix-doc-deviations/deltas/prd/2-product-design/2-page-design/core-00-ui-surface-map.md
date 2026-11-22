<!-- fix-doc-deviations: D5/D6/D7/D8/D9/D10 活对照标注转已回补终态 -->

## MODIFIED — 二、各模块设置入口汇总（含默认状态）

以下开关与配置入口均为现状登记，默认状态以 inventory.md 与需求文档「默认开关矩阵」为准。

**core（本地写作核心）**

| 设置入口 | 关联场景 | 默认状态 |
|---|---|---|
| 校对：应用/项目语言选择；规则与词典管理；忽略范围（项目/全局/会话） | S05 | 未装语言明确报告、不回退；非英语仅 Hunspell（grammar-only unsupported；原偏差 D5，docs/Editor.md 已对齐） |
| shell escape 信任 | S07 | 按目录+机器记录，不随 `project.json` 迁移；导入项目强制关闭 |
| Experimentation → LaTeX tools（确定性转换 gallery） | S14 | 默认关，须显式启用 |
| 终端确认 | S15 | 关闭运行中终端/切项目/退出需确认 |
| 通用 toast 静音 | — | 已确认未实现（全库无对应代码；原偏差 D6），docs/Editor.md "Deferred, not planned for 0.4.1" 表述准确，基线不列为已实现场景 |

**ai（AI 与 agent）**

| 设置入口 | 关联场景 | 默认状态 |
|---|---|---|
| 内置 Copilot：provider/模型/审批模式 | S21 | 审批模式默认 `approve-for-me`；write/shell 询问、Ask 另问 network、deny 始终优先 |
| 模型目录：provider key / custom endpoint / Ollama | S24 | 刷新 30s 节流/24h 自动；blocked 分 catalog blocked（永拒）与 probe blocked（可无工具 plain chat；原偏差 D10，docs/AICopilot.md 与 docs/ai-model-catalog.md 已对齐） |
| Skills 管理（bundled/shelf/user） | S22 | 新技能默认开启；shelf 每日缓存+离线回退 |
| 无头 CLI 策略 | S23 | 默认 write/commands/network 全为 false；`--allow write` 走 review copy |
| Experimentation → Research Tasks | S26 | 默认关，须显式开启；默认预算 120 分钟、单 run 60 分钟（原偏差 D9，docs/Skills.md 已对齐） |
| MCP server 开关 | S27 | 默认关；写经审批；外部 server 调用默认逐次 ask，auto-approve 不含 delete；renderer 断开后 native 只保留 6 个只读工具（原偏差 D8，docs/mcp.md 已对齐） |
| Computer Use（Cua Driver / 白名单 app/site） | S28 | 默认全关：功能开启且白名单非空才 ready；旧配置迁移可能继承 `askBeforeActions=true`（不是新装默认） |
| ACP agent 目录（15 个内置；原偏差 D7，docs/AICopilot.md 已对齐） | S25 | 各 CLI agent 独立登录外部账号 |

**research（研究与文献）**

| 设置入口 | 关联场景 | 默认状态 |
|---|---|---|
| Zotero 连接（本机 Zotero 7+/BBS 或 zotero.org） | S17 | 需显式连接；Zotero 关闭时用缓存并标注 |
| 检索 provider（含 Serper key） | S16 | 无 Serper key 不列 Google Scholar；无网络继续用本地 `.bib` |
| OCR 引擎选择 | S19 | 默认本机 Ollama，或显式选远程；扫描一次最多 50 页、>5 页需确认 |
| alphaXiv 连接器 | S49 | 账号显式接入；token 经 credential helper+环境变量，不进 argv/URL |

**collab（实时协作）**

| 设置入口 | 关联场景 | 默认状态 |
|---|---|---|
| 添加 Server / GitHub/OIDC 登录 / 设备登记 | S29 | 首次 admin 初始化需 setup code；协议不兼容停止同步 |
| 分享角色（Owner/Editor/Reviewer/Commenter/Viewer） | S29, S33 | Reviewer 固定 Suggesting；服务端逐 change 校验 |
| Guest 功能开关与审批 | S36 | Guest 默认关、审批默认开；邀请链接 14 天过期、每小时最多 20 个 |
| 访问日志 | S37 | Owner 逐项目开启；server 可全局禁用；项目日志仅项目 Owner 可读 |

**sync（云同步与在线服务）**

| 设置入口 | 关联场景 | 默认状态 |
|---|---|---|
| 云同步账户（Dropbox / Google Drive / S3） | S43, S46 | 需显式连接；S3 先 probe+条件写检查再存密钥；Disconnect 尝试 revoke+清密钥 |
| 在线 LaTeX 服务桥（登录 / Git link / auto 同步） | S47, S48 | 登录窗口 20 分钟；auto 同步条件：页面可见+无 dirty+无冲突+有 token+静默 15s，首次 2s 后每 3 分钟 |
| 外部连接器凭据（Git hosting / Zotero / alphaXiv） | S49 | token 只经匹配 base URL 的 credential helper+环境变量；长期凭据 AES-256-GCM |

**delivery（工程交付）**

| 设置入口 | 关联场景 | 默认状态 |
|---|---|---|
| 客户端更新检查（updater） | S50 | manual-only：E2E 明确非自动更新；验签失败不改现有安装 |
| Server 部署配置（Compose / systemd / Render / `.env`） | S51 | 自托管显式部署；DB 比程序新拒绝打开 |
