## Oleafly 全局 UI 表面清单（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`；Server crate `0.1.1`，CLI crate `0.1.0`。
> 本文档为**现状清单，非原型**：只登记已实现、可在 inventory.md 与六份 `*-01-requirements.md` 中找到证据的 UI 表面，**不发明未实现表面**，不新增任何交互或界面设计。表面按「桌面主窗口 → 浏览器端 → Server 管理控制台 → 安装器/更新与 CLI」分组；关联场景编号引用全局唯一场景（S01-S52）。本基线为只读静态盘点，不声称任何动态验证通过。

### 一、全局表面总表

| 表面 | 所属模块 | 关联场景 | 主要入口 |
|---|---|---|---|
| 项目库（项目列表与检索） | core | S01, S02, S03 | 启动应用进入；检索框支持全文词与 `is:`/`has:`/`engine:`/`kind:`/`created:` 限定词、AND/OR/排除/日期与排序 |
| 模板画廊（新建项目模板选择） | core | S01 | 项目库新建流程：选择空白/内置/自定义模板；删模板不影响已建项目 |
| 项目导入界面（ZIP/DOCX/MD/HTML/Typst／arXiv／Git 仓库） | core | S01, S02 | 项目库导入流程：外部文件导入（预览确认引擎/主文件）、arXiv ID/本地 e-print（预览源文件选主 TeX）、Git URL（clone-staging 校验后导入工作树+历史） |
| 编辑器·源码视图（Code） | core | S04, S05, S08 | 项目库打开项目 → 文件树选中文件；补全/结构/预览；校对发现与建议在源位置查看 |
| 编辑器·可视视图（Visual） | core | S04 | 编辑器 Code/Visual 切换 |
| 文件树 | core | S04, S15 | 编辑器侧栏：文件增删改、选主文件、重命名；亦可在指定目录打开终端 |
| Diagram Composer（画布+Code 双向） | core | S06 | 编辑器进入 Composer，继承/选择语言；预览纠错后插入/保存 `figures/`，注释重开 |
| 编译控件与引擎选择 | core | S07, S08 | 编辑器编译区：选 Tectonic/latexmk/Typst/Pandoc 写入 `project.json`；打开 Quarto/Calepin 时查看风险并授权执行 |
| 编译日志与诊断视图 | core | S07, S09 | 编译后的规范化日志诊断定位；按提示安装依赖 |
| PDF 预览（并排/独立） | core | S09 | 编辑器并排或独立打开：翻页/缩放/搜索/目录，SyncTeX/Tinymist 正反向跳转，演示模式，下载 |
| 投稿前预检（Preflight）视图 | core | S10 | 投稿前入口：选 profile 与六类检查，按严重度/规则审阅，修复或 accessible 导出 |
| 导出对话框 | core | S11 | 导出入口：按引擎描述符选 PDF/ZIP/DOCX/HTML/MD/TXT/Typst/LaTeX/PPTX/EPUB → 选目标 → 保存 → 查警告 |
| Source Control 视图 | core | S13 | Git 初始化 + Create project 基线；diff/stage → 显式 commit → 配 remote → publish/push/pull |
| Versioning 时间线（检查点） | core | S12 | 检查点时间线：查看版本/引擎/主文档、加标签、恢复后重编译；密码导出/导入加密历史；Keep latest/Reset 清理 |
| Tools gallery（确定性转换器） | core | S14 | Settings → Experimentation 启用 LaTeX tools 后，经 gallery/omnibar/slash command 选择转换器（gallery 默认关） |
| 终端 dock | core | S15 | 从命令面板或文件树在指定目录打开；标签重命名/着色（跨重开保留）；每项目最多 10 个标签 |
| 命令面板（omnibar / slash command） | core | S15, S14 | 调用编译、SyncTeX、导出、检查点、引用等；转换器 slash command 入口 |
| 合并审查对话框（Merge Review）与同步暂停横幅 | collab | S32 | 离线冲突自动合并后只读审查作者/diff；二进制/路径冲突保留副本并通知；大批量外部磁盘变化进入暂停（Send/Keep local） |
| 分享项目与邀请链接界面 | collab | S29, S36 | 添加 Server 并登录后：分享项目/生成邀请链接并指定角色；Guest 由 Owner 发起邀请 → 审批（未配 SMTP 提供手工 Add link） |
| 评论/建议/项目聊天面板 | collab | S34 | 编辑器协作面板：评论/回复/mention/resolve；建议接受/拒绝/撤回；项目聊天；离线排队恢复后发 |
| 共享历史视图（SharedHistory） | collab | S35 | 历史入口：由本地完整 Loro change log 构建，只读打开/比较/命名 → 恢复为新 change |
| 访问日志面板（项目 Owner） | collab | S37 | Owner 开启访问日志：查看加入/下载/打开事件；server 可全局禁用 |
| AI 面板（内置 Copilot） | ai | S21 | 编辑器 AI 面板：配置 provider/模型/审批模式 → 任务（可先 Plan 只读）→ diff 审批落盘 → turn Review 逐文件 Undo/Redo |
| Skills 管理界面 | ai | S22 | 管理 bundled/shelf/user 技能；`/skill-id` 或自动选择调用 |
| 模型目录与信任状态视图 | ai | S24 | AI 设置：配 provider key / custom endpoint / Ollama → 刷新列表看 Verified/Untested/Blocked → Untested 首次跑真实 probe |
| ACP agent 目录与会话视图 | ai | S25 | 目录选/装外部 CLI agent（15 个内置，各自登录）→ 新会话发任务 → 越权审批卡 → 审阅 turn 变更 |
| Research Task 界面（brief / plan / run / apply） | ai | S26 | Experimentation 开启 Research Tasks：撰写 brief → plan-first 审阅 plan.md → 选执行环境（本机/SSH/Slurm/Cua）→ 后台运行看进度 → 选择性 apply |
| MCP 集成界面 | ai | S27 | AI/MCP 设置：开 MCP server → 复制 localhost URL+bearer 到外部 client；反向添加外部 server（每调用确认） |
| Computer Use 配置界面 | ai | S28 | 装 Cua Driver → 开启功能+白名单 app/site → bounded manifest 操作 → 关键动作审批 → 撤销/停止 |
| Citation Search 检索面板 | research | S16 | 编辑器引用入口：DOI/arXiv/URL/标题/多源检索 → 合并查重 → 插入引用+追加 `.bib` |
| Zotero 集成面板 | research | S17 | 引用入口：连本机 Zotero 7+/BBS 或 zotero.org → `@` 联合检索 → 插入只追加该条目防重 |
| 文档扫描评审面板 | research | S18 | 引用面板 From document：扫描 → 过滤已引用 → 看分数/理由 → 入书目；或 Review 获取流式反馈 |
| OCR 转换界面（Image/Equation/PDF 扫描） | research | S19 | Tools/转换入口：默认本机 Ollama 或显式选远程 → 运行前看数据去向/页数/成本 → 检查保存 |
| 研究规划与本地统计工具面板 | research | S20 | Tools 入口：Lab Search / Conference Deadlines / p 值 / 样本量 / 置信区间 → 输入条件运行 → 查看/复制/外链 |
| 云同步账户界面 | sync | S43, S46 | Settings 云同步入口：连 Dropbox/Drive/S3 → 同步 Library 项目+设置；切换账户、Disconnect（尝试 revoke+清密钥） |
| 冲突副本与回收站（Trash） | sync | S44, S45 | 批量删除保护：hold → restore 或确认 delete；远端删除进 Trash（保留 30 天）；冲突副本以 `main (Laptop 日期).tex` 类命名保留双方 |
| 在线 LaTeX 服务导入界面 | sync | S47 | 导入入口：登录 → 列项目 → 批量导入（并行，逐项成功/失败）并保存来源设置 |
| Git 桥同步控件（OverleafSyncButton） | sync | S48 | 项目工具栏：link → 手动/auto 双向同步；首链冲突选边（选 remote 前存本地 backup ref）；unlink 导出备份 |
| Settings（设置） | core | S05, S07, S14, S15, S21, S24, S26, S27, S28, S43 等 | 各模块设置入口汇总（详见第二节） |
| 浏览器登录页 | collab | S40, S41 | 访问 Server 地址：登录建立 30 天会话（HttpOnly/Secure/Lax cookie）；过期视为登出 |
| 浏览器项目列表（directory） | collab | S40 | 登录后项目列表；Guest 不能查看 directory |
| 浏览器编辑器 | collab | S40, S33, S34 | 打开项目：按角色（Owner/Editor/Reviewer/Commenter/Viewer）编辑/建议/评论/聊天/查看在线状态；断线恢复 inflight 与 sessionStorage 未确认输入 |
| 浏览器 PDF 查看 | collab | S42 | 项目输出查看：读 Owner/Editor 上传的最新 PDF/SyncTeX，源/PDF 跳转（生产浏览器无编译引擎） |
| Server 管理控制台 | collab | S37, S38, S39 | Admin 经控制台管理成员/设备/域名/安全日志/归档与项目；开放注册配额（存储/项目数/上传限制）；备份恢复运维 |
| 桌面安装器 | delivery | S50 | 全平台安装包（NSIS/MSI，SHA256 校验）；OS 签名链与 updater minisign 信任链分离 |
| 客户端更新界面（updater） | delivery | S50 | 应用内手动检查更新（E2E 明确 auto-updater 为 manual-only）：按 latest.json 下载并验签 minisign 后升级 |
| Server 安装与初始化界面 | delivery, collab | S51, S29 | 安装器 / Docker Compose / systemd / Render 部署 → setup code 初始化 → `/healthz`（进程存活）与 `/readyz`（可接流量）健康检查 |
| CLI（无 GUI，终端表面） | ai, delivery | S23, S52 | 终端命令：`oleafly ask` / `agent run`（只读分析 → review copy 变更清单 → dry-run → apply）、`version`/`help`/JSON/`doctor` |

### 二、各模块设置入口汇总（含默认状态）

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
