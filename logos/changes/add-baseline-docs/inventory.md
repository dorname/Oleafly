# Oleafly 产品现状基线盘点（合并版）

> 基线口径：当前工作树，HEAD `9c307bf3c`，桌面 `0.4.11`（package.json/src-tauri/Cargo.toml/tauri.conf.json 一致），Server crate `0.1.1`，CLI crate `0.1.0`；`v0.4.11` 标签位于 `a0154c69c`，HEAD 领先 3 个提交。本盘点为**只读静态盘点**，未运行任何测试，不声称任何动态验证通过。
> 来源：四条只读盘点证据链（本地工作流 / 协作同步 / AI 集成 / 架构测试发布）。
> 场景编号为全局唯一编号（S01-S52），后续 requirements / feature-specs / scenario-implementation / test-cases 全链引用；全部分配后 `scenario_counter.next_id = 53`。

## 模块划分（建议写入 logos-project.yaml）

| 模块 | 范围 |
|---|---|
| core | 本地写作核心：项目库、编辑、校对、图、编译、PDF、预检、导出、检查点、Git、终端、转换、导入 |
| research | 研究与文献：Citation Search、Zotero、文档扫描评审、OCR、机构/会议/统计 |
| ai | AI 与 agent：内置 Copilot、Skills、无头 CLI、模型目录、ACP、Research Tasks、MCP、Computer Use |
| collab | 实时协作：协议、客户端同步、Server、浏览器访问、Guest、备份恢复 |
| sync | 云同步与在线服务：Dropbox/Drive/S3、在线 LaTeX 服务桥、外部连接器凭据 |
| delivery | 工程交付：架构总纲、测试体系、发布/签名/更新、Server 部署 |

## 场景总表

### core（S01-S15）

| 编号 | 名称 | 优先级 | 主路径摘要 | 关键异常/边界 | 证据（节选） |
|---|---|---|---|---|---|
| S01 | 从模板或外部资料创建研究项目 | P0 | 选模板或 ZIP/DOCX/MD/HTML/Typst 导入 → 预览确认引擎/主文件 → 生成独立项目目录 → 打开续写 | arXiv/转换失败保留输入可重试；删模板不影响已建项目；导入不改原件 | docs/ProjectLibrary.md L12-38；docs/Templates.md L7-52；ProjectImportDialog.test.tsx L419-478；project.rs L5489-5764（ZIP 限 5000 entries/2GiB/深度16，跳过 .git/.oleafly，shell escape 强制关）；project.rs L6905-7126（Pandoc staging，pandoc_missing/import_failed） |
| S02 | 从 arXiv 或 Git 仓库导入项目 | P1 | arXiv ID/本地 e-print → 预览源文件选主 TeX → 创建项目；Git URL → clone-staging 校验 → 导入工作树+历史 | ID 白名单校验；512MiB/5000 entries 上限；只有 PDF 明确提示；空仓库/过大/非法 URL 报错；staging 24h 清理 | arxiv_import.rs L179-395；git.rs L2090-2223；forge/import.rs L10-67；forge/cancel.rs |
| S03 | 项目库检索与恢复 | P1 | 全文词/is:/has:/engine:/kind:/created: → AND/OR/排除/日期 → 排序 → 打开 | 未知限定词按文本+警告；不支持值琥珀色提示；**实现支持 engine:quarto/calepin（文档未列，偏差 D1）** | docs/ProjectLibrary.md L40-75；project-search.tsx L49-76；project-search.test.tsx L64-100 |
| S04 | 多文件研究写作（源码/可视） | P0 | 文件树增删改选主文件 → Code/Visual 撰写（补全/结构/预览） → 写入普通源文件 → 自动保存/诊断/重命名 | 保存途中编辑不丢（dirty 再存）；旧 revision 分析拒绝；%novalidate 只关语法检查，编译/拼写/引用仍查 | docs/General.md L9-20；docs/Editor.md L8-76, L93-102, L111-174, L371-376；files.test.ts L346-399 |
| S05 | 本地拼写语法校对 | P1 | 选语言 → prose mask 跳过命令/数学 → 源位置查看发现 → 忽略/词典管理 | 未装语言明确报告不回退；非英语只跑 Hunspell，grammar-only unsupported（D5，文档未直说）；Harper 崩溃重建并标 partial | docs/Editor.md L217-289；proofreading.worker.test.ts L204-269；client.errors.test.ts L127-170 |
| S06 | 图表绘制与插入 | P1 | 进入 Composer 继承/选择语言 → 画布↔Code 双向 → 预览纠错 → 插入/保存 figures/ → 注释重开 | Typst 首次要 fletcher，离线缺包明确报；TikZ 画布不理解命令重写丢失；Mermaid 手改未重插则 PDF 显示代码 | docs/DiagramComposer.md L18-103；DiagramComposer.test.tsx L1031-1076, L1257-1272 |
| S07 | 编译引擎选择与工具链修复 | P0 | 选 Tectonic/latexmk/Typst/Pandoc → 写入 project.json → 编译 → 规范日志诊断定位 → 按提示装依赖 | 镜像失败改试上游；latexmk 缺 TeX 启动前停止给修复；shell escape 信任按目录+机器，不随 project.json 迁移 | docs/CompilationEngines.md L18-134, L272-345；e2e/tests/02-create-compile.spec.ts L23-43 |
| S08 | 可复现代码文档（Quarto/Calepin） | P1 | 打开 .qmd/.Rmd/Calepin → 查看风险并授权执行 → 选输出 → 编译看 chunk 错误 | 未授权 Quarto 用 --no-execute 但 filters/shortcodes 仍执行需拒绝；Calepin 未授权只能渲染已存结果；覆盖非同源工作文件停止；oleaflyc 明确不支持 | docs/CompilationEngines.md L347-427；CompileControls.notebook.test.tsx L121-150, L280-307；native_tests.rs L166-183 |
| S09 | PDF 预览与源文核对演示 | P0 | 并排/独立 PDF → 翻页缩放搜索目录 → SyncTeX/Tinymist 正反向 → 演示模式 → 下载 | 旧 revision 结果拒绝（stale）；**失败编译分两种：无 PDF 保留旧文件；有已验证 best-effort PDF 显示新文件但不更新检查点（D3，文档过度简化）**；Typst 过旧隐藏同步 | docs/PDFPreview.md L13-63；compile.ts L1960-2004；compile.test.ts L766-818, L944-951；PreviewPane.actions.test.tsx L275-335 |
| S10 | 投稿前预检 | P0 | 选 profile 与六类检查 → 读源/日志/PDF → 按严重度/规则审阅 → 修复或 accessible 导出 → 人工复核 alt/对比度 | 输入缺失不能报成功（source-only 缺 PDF 标 partial）；不兼容 class 拒绝；106 条 PDF/UA 规则只是子集不构成 conformance；Markdown 不做源规则但 PDF/ATS 仍查 | docs/Preflight.md L13-129；engine-capabilities.test.ts L15-95；PrepExport.test.ts L14-69 |
| S11 | 导出交付物 | P0 | 按引擎描述符选 PDF/ZIP/DOCX/HTML/MD/TXT/Typst/LaTeX/PPTX/EPUB → 选目标 → 保存 → 查警告 → 携带链接媒体 | 转换失败保留旧产物；PPTX 缺图失败；导出 stale PDF 提醒；EPS 原样写入并警告；**导出目标：绝对路径+父目录必须存在，文件可不存在（D2，文档写 existing 不准确）** | docs/Export.md L6-120；export.test.ts L332-499；e2e/55-export-artifacts.spec.ts L113-319；sandbox.rs L97-118 |
| S12 | 检查点恢复与加密迁移 | P0 | 成功编译后台快照 → 时间线查看/标签 → 恢复重编译 → 密码导出/导入加密历史 | 不完整捕获不发布；恢复保留后增文件与 .git/.oleafly；中断回滚；不支持的 archive 版本拒绝；忘密码不可恢复；与 Git 完全独立 | docs/Checkpoints.md L7-134；e2e/66-checkpoints.spec.ts L90-194；checkpoints.rs L724-776 |
| S13 | 本地 Git 版本管理与发布 | P1 | 初始化 + Create project 基线 → diff/stage → 显式 commit → 配 remote → publish/push/pull | >100MiB/疑似 secret/首提交失败不留伪基线且 unstage；Publish 排除 secret、历史有 secret 名需 Cancel 或显式放行（.key 可能误报）；保存/编译/关闭不自动提交；Git 未装不影响项目使用 | docs/SourceControl.md L6-139；git.rs L557-624, L998-1034, L4431-4715；e2e/12-git.spec.ts L83-205 |
| S14 | 确定性格式转换 | P1 | Experimentation 启用 → gallery/omnibar/slash 选转换器 → 本地工具链转换 → 检查保存/建项目 | gallery 默认关；标识检索不可用时手工录入仍可用；确定性 PDF 重建必须报限制不编造；扫描件走 S19 | docs/Tools.md L1-61, L131-160；settings.ts L1265-1276 |
| S15 | 终端与命令面板 | P2 | 面板/文件树开终端 → 跑命令 → 点输出链接回视图 → 标签管理 → 命令面板调用 | 每项目最多 10 标签；关闭运行中终端/切项目/退出要确认；**普通终端有所有权+进程树 containment，但不等于 Research 级 OS sandbox（不得错误宣传）** | docs/General.md L35-90；terminal.rs L38-51, L199-298 |

### research（S16-S20）

| 编号 | 名称 | 优先级 | 主路径摘要 | 关键异常/边界 | 证据（节选） |
|---|---|---|---|---|---|
| S16 | 文献检索与引用写入 | P0 | DOI/arXiv/URL/标题/多源检索 → 合并查重 → 插入引用+追加 .bib → key 补全/校验/诊断 | .bib 写失败时批量流程先停；provider 不可用显式呈现；无 Serper key 不列 Google Scholar；无网络继续用本地 .bib | docs/Citations.md L6-25, L98-135；citation.test.ts L480-605 |
| S17 | Zotero 文献库集成 | P1 | 连本机 Zotero 7+/BBS 或 zotero.org → @ 联合检索 → 插入只追加该条目防重 → 批量补 key → 审阅后更新 | Zotero 关闭用缓存并标注；手改条目须确认才覆盖；任何条目不被自动删除；写失败/缺失 key 报告 | docs/Citations.md L27-71；zotero-cite.test.ts L197-361；zotero-actions.test.ts L151-236 |
| S18 | 草稿文献发现与 AI 评审 | P2 | From document 扫描 → 过滤已引用 → 看分数/理由 → 入书目；或 Review 获取流式反馈 | 未配 AI 退化为启发式不显示理由；离线禁用扫描；缓存约一天；只发短查询不发送整个项目 | docs/Citations.md L73-135；DocumentCitationScanPanel.test.tsx L152-190；.states.test.tsx L203-485 |
| S19 | 图像与扫描件 OCR 转换 | P1 | 选 Image/Equation/PDF 扫描 → 默认本机 Ollama 或显式选远程 → 运行前看数据去向/页数/成本 → 检查保存 | 离线拒绝 hosted/Mathpix 允许 Ollama；扫描一次最多 50 页、>5 页需确认；托管图长边 2000px、CLI agent 图 760KB；只读 agent 仍可读图 | docs/Tools.md L63-129；ad-hoc-converters.test.ts L485-509；image-input.ts L37-39 |
| S20 | 研究规划与本地统计工具 | P2 | Lab Search/Conference Deadlines/p 值/样本量/置信区间 → 输入条件运行 → 查看/复制/外链 | 会议数据以 CS 为主非全学科；非法输入在面板说明并恢复可运行；需网络工具在自身面板声明 | docs/Tools.md L137-166；StatsToolView.test.tsx L83-121 |

### ai（S21-S28）

> 五条执行路径不可混称：①内置 Copilot（Oleafly 运行 loop，diff 审批）②交互式 ACP CLI agent（15 个内置目录，外部账号）③Research Task（worktree/snapshot+预算+apply）④无头 CLI（默认只读，write 走 review copy）⑤外部 MCP client（localhost bearer+审批）。隔离机制分别是 turn 快照 / ACP turn copy / worktree+manifest / review copy / 无副本，不能统一宣传。

| 编号 | 名称 | 优先级 | 主路径摘要 | 关键异常/边界 | 证据（节选） |
|---|---|---|---|---|---|
| S21 | 内置 Copilot 修复与逐轮审阅 | P0 | 配 provider/模型/审批模式（默认 `approve-for-me`，`packages/ai-tools/src/approval-risk.ts:10` DEFAULT_APPROVAL_MODE；write/shell 询问、Ask 另问 network、deny 始终优先） → 任务（可先 Plan 只读） → diff 审批 → 编译续修 → turn Review 逐文件 Undo/Redo | Plan 只读≠离线（仍含文献等网络读取）；Undo 只处理未提交未重叠未再编辑文件；快照上限 20000 文件/25MiB/512MiB/1GiB、100 turns/14 天；切项目旧调用不执行；审批规则读取失败终止 run | ToolConfirm.tsx L268-338；ChatCore.tsx L2241-3094；approval-risk.ts L10, L64-129；approvals.rs L238-258；agent_turns.rs L143-177, L1501-1557 |
| S22 | 研究 Skills 调用 | P0 | 管理 bundled/shelf/user 技能 → /skill-id 或自动选择 → 检索/核验/成稿 → 审批 .bib 变更编译 | 新技能默认开；shelf 每日缓存+离线回退；catalog 8MiB/archive 64MiB+checksum，但不替代对脚本内容的人工信任；文献搜索/DOI 核验需网络 | src/lib/skills.ts L65-518；docs/Skills.md L175-205；skills_catalog.rs L17-30 |
| S23 | 无头 CLI 只读分析与受控写入 | P1 | `oleafly ask` / `agent run` 只读 → `--allow write` 在 review copy 工作 → 看变更清单 → dry-run 预演 → apply | 默认 write/commands/network 全 false；review 必须在 .oleafly；workspace 拒绝绝对路径/../.git/.oleafly/.private/NTFS 短名，上限 20000 文件/2GiB；`--unsandboxed-commands` 是显式高风险逃生口；apply 冲突退出码 8 | docs/cli.md L518-684；policy.rs L13-222；workspace.rs L40-246 |
| S24 | 模型目录与信任状态管理 | P1 | 配 provider key/custom endpoint/Ollama → 刷新列表看 Verified/Untested/Blocked → Untested 首次跑真实 probe → 离线规则 | **blocked 需区分 catalog blocked（永拒）与 probe blocked（可无工具 plain chat）**；刷新 30s 节流/24h 自动；失败保留旧列表；hosted probe 30s/自托管 120s；localhost/私网一律按自托管策略 | providers.ts L16-216；ai-model-state.ts L13-78；ai_model_registry.rs L185-207；agent.rs L1556-1712；provider.rs L159-193 |
| S25 | 外部 CLI agent（ACP）接入 | P1 | 目录选/装 CLI（各自登录） → 新会话发任务 → 越权触发拒绝/审批卡 → 审阅 turn 变更 | **内置 agent 实为 15 个（文档写 14，偏差）**；项目外读取拒绝、未知路径 fail closed；权限 diff 96KiB/16 个上限；turn copy 仅限非 task/非子会话/非 remote；Research 临时 HOME 凭据 0700/0600 | builtin_agents.rs L23-196；acp/runtime.rs L187-216, L2899-3210；permission_view.rs L8-99；acp/review.rs L49-55 |
| S26 | Research Task 隔离执行 | P1 | Experimentation 开启 → brief（目标/成功标准/预算/权限） → plan-first 审阅 plan.md → 选本机/SSH/Slurm/Cua → 后台/看 run → 选择性 apply | 默认关；**默认预算 120 分钟/run 60 分钟（文档写 30 分钟，偏差）**；Git 项目 worktree+覆盖 manifest（含未提交修改），非 Git staged snapshot；apply 校验前后 hash+journal 回滚；本地 run 无 sandbox 拒绝启动；Windows sandbox 默认关；证据检查只警告不是 apply 门禁 | research-tasks-flag.ts L10-27；research/model.rs L131-215, L917-924；isolation.rs L110-268；apply.rs L478-583；runs/local.rs L191-198 |
| S27 | MCP 双向集成 | P1 | 开 MCP server → 复制 localhost URL+bearer 到外部 client → 读工具 renderer 断开仍可用，写经审批 → 反向加外部 server 每调用确认 | 默认关、默认 ask；**renderer 断开后 native 只保留 6 个只读工具（文档写可写，偏差）**；bearer 常量时间比较；300s tool call/45s renderer lease；auto-approve 不含 delete；内置助手调外部 MCP 参数脱敏+截断 | config.rs L282-285；mcp/server_request.rs L41-265；mcp/native.rs L8-191；mcp/server.rs L20-27；mcp-approvals.ts L4-62；mcp-agent-tools.ts L21-229 |
| S28 | Computer Use 白名单操作 | P2 | 装 Cua Driver → 开启+白名单 app/site → bounded manifest 操作 → 关键动作审批 → 撤销/停止 | 默认全关；enabled+至少一个白名单才 ready；**旧配置迁移可能继承 askBeforeActions=true（不是新装默认）**；signed-in browser 每次询问；Cua Space 是真实计算机不是本地沙箱 | cua_driver/config.rs L16-109；gate.rs L19-22；docs/desktop-apps.md L62-77；docs/Skills.md L303-320 |

### collab（S29-S42）

> 项目内容不是端到端加密：宿主/磁盘/备份运营者可读取（capability 明确 encryption=None）。

| 编号 | 名称 | 优先级 | 主路径摘要 | 关键异常/边界 | 证据（节选） |
|---|---|---|---|---|---|
| S29 | 服务器接入与项目共享 | P0 | 添加 Server → GitHub/OIDC 登录 → 设备登记 → 分享项目/链接角色 → 协作者加入 | 首次 admin 需 setup code；协议不兼容停止同步；suspended/撤销设备明确错误；**README "asks before it applies anything" 过宽（偏差）：重叠文本是 Loro 自动合并+只读 Merge Review** | docs/collaboration-server.md L1-28, L641-765；routes/auth.rs L43-85；e2e/109-live-collaboration-peer.spec.ts L201-297 |
| S30 | 实时共同编辑 | P0 | 同项目并发编辑文本/文件树/光标/在线状态实时收敛 | 大文本分批；过大单批 Unsendable 不阻断其他；慢上传不被 quiet timeout 误判；损坏 frame 不阻断后续 | collab/sync/tests/editing.rs L3-59；big_files.rs L6-317；transport.rs L297-366 |
| S31 | 断线重连与增量补发 | P0 | 断网继续编辑 → 恢复 → 补发合并；桌面 WS→两次失败回退 /frames+/poll，每分钟重探 | 有 jitter 退避；429/503 busy 长等待；已确认 batch 重启后幂等不重复存储 | sync/mod.rs L191-207；reconnect.rs L49-309；transport.rs L3-54, L170-256；editing.rs L130-275 |
| S32 | 离线冲突合并与审查 | P0 | 文本 Loro/OT 自动合并 → Merge Review 只读审查作者/diff；二进制/路径冲突保留副本并通知 | **不是所有重叠文本都人工二选一（README 偏差同上）**；大批量外部磁盘变化进暂停（Send/Keep local）；写盘失败退避+通知 | merge.rs L402-498；MergeReviewDialog.tsx L25-216；kept.rs L148-322；sync_hold.rs L26-310；SyncPauseBanner.tsx L24-75 |
| S33 | 协作角色权限边界 | P0 | Owner/Editor/Reviewer/Commenter/Viewer 五角色；Reviewer 固定 Suggesting；Owner 管成员/链接/停止分享 | 服务端逐 change 校验不只靠 UI；移除/归档后同步结束；Viewer 期间本地编辑保留 pending 恢复后可发 | collab-protocol/projects.rs L108-143；server/tests/review_roles.rs L148-409；refusals.rs L17-118；e2e L331-350 |
| S34 | 评论建议与项目聊天 | P0 | 评论/回复/mention/resolve；建议接受/拒绝/撤回；项目聊天；离线排队恢复后发 | comments off 拒新评论和旧 resolve 但文本继续；Reviewer 不能接受建议含自己的；Commenter 不能改文本/建议/清空他人内容 | server/tests/comment_switch.rs L171-366；offline_comments.rs L29-420；docs L862-876 |
| S35 | 共享历史与版本恢复 | P0 | 历史由本地完整 Loro change log 构建 → 只读打开/比较/命名 → 恢复为新 change | 本地无目标版本 history_unavailable；Reviewer 可看不能恢复；恢复不抹旧历史；空/超长名称拒绝 | collab/history.rs L16-395；SharedHistory.test.tsx L88-187；docs L878-882 |
| S36 | Guest 外部协作者 | P1 | 邀请 → 审批 → 已验证邮箱登录 → 只访问受邀项目 | Guest 默认关/审批默认开；14 天过期、20 个/小时；无 SMTP 手工 Add link；不能看 directory/分享/邀请；移除最后项目终止 admission | docs L812-844；routes/guests.rs L27-66；server/tests/guests.rs L230-1501 |
| S37 | 访问日志与管理控制台 | P1 | Owner 开访问日志看加入/下载/打开；Admin 管成员/设备/域名/安全日志/归档 | 只有项目 Owner 可读项目日志；server 可全局禁用；重连不重复记录；**Admin 项目管理≠项目内容授权** | routes/access_log.rs L18-58；server/tests/access_log.rs L126-490；console.rs L33-42 |
| S38 | 通知邮件与配额限制 | P1 | mention/邀请/分享邮件异步发送；开放注册可配存储/项目数/上传限制 | 内存队列 30s→2m→10m→30m→2h 重试后丢弃；**重启丢失未发送普通邮件**；存储满 413 但文本 change 仍可过；超限 429 | docs L767-860；routes/email.rs L19-100 |
| S39 | 服务端备份与恢复 | P1 | fs 模式备份整个 data；S3 模式 DB+bucket 一起 → 恢复旧库 → 客户端补发缺失 changes | 依赖已丢 change 的更新须等原作者上线不能凭空收敛；**Litestream 只复制 SQLite 不替代 S3 对象备份** | docs L933-1000；sync/tests/restore.rs L87-258；litestream.yml |
| S40 | 浏览器实时协作 | P0 | 浏览器登录 → 按角色编辑/建议/评论/聊天/presence → 断线恢复 inflight+sessionStorage 未确认输入 | **浏览器只有 WS 重连无 long-poll 回退**；离线新编辑 reject；sessionStorage ~2M 字符/7 天，非跨设备离线队列；ack 丢失需 transform | web/mod.rs L30-50；web/src/roles.ts L14-38；gateway.ts L73-98, L280-649；unsent.ts L12-75；gateway.test.ts L316-462 |
| S41 | 浏览器会话安全 | P0 | 30 天 HttpOnly/Secure/Lax cookie；写请求精确 Origin + X-Oleafly-Requested-With；严格 CSP 禁 framing | 过期视为登出；forbidden/not_found/removed/archived 结束访问；Origin 错为 cross_site；project_too_large/server_busy | docs L921-931；web/mod.rs L145-188；web_api.rs L197-244, L454-542 |
| S42 | 浏览器输出查看 | P1 | 读 Owner/Editor 上传的最新 PDF/SyncTeX → 源/PDF 跳转 | 非 Owner/Editor 上传拒绝；magic/大小/main-hash 校验失败拒绝；**生产浏览器无编译引擎，fake engine 仅开发测试** | web/src/compile/engines.ts L3-9；routes/outputs.rs L26-100；web_api.rs L113-195, L400-542 |

### sync（S43-S49）

| 编号 | 名称 | 优先级 | 主路径摘要 | 关键异常/边界 | 证据（节选） |
|---|---|---|---|---|---|
| S43 | 云同步多设备协作 | P0 | 连 Dropbox/Drive/S3 → 同步 Library 项目+设置 → 另一设备继续 | S3 先 probe+条件写检查再存密钥；**只同步 Library 有 project.json 的项目，不含任意 linked folder；.git 历史和 checkpoints 不随云同步**；单项目 100000 文件/manifest 64MiB 上限 | cloud/provider.rs L12-75；commands.rs L749-800, L1646-2142；engine.rs L21-47, L3486-3845 |
| S44 | 冲突副本与三方合并 | P0 | 双侧改普通文件保留两版本（main (Laptop 日期).tex）→ 后到者保留双方 → 收敛；project.json/设置走 merge3 | dirty editor 时 Download/LocalDelete/MetaMerge 改 Carry 不覆盖未保存缓冲；冲突副本上传成功前不覆盖当前编辑；同字段 metadata 冲突 local 获胜 | engine.rs L1110-1186；tests/engine.rs L275-306, L521-582, L1850-1891；cloud/merge.rs L4-207 |
| S45 | 批量删除保护与回收站 | P0 | 大批量删除 hold → restore 或确认 delete；远端删除进 Trash | 删全部必 hold；>20 且过半 hold（本地远端分别判）；tombstone 异地暂停不删本地；Trash 30 天 | engine.rs L1237-1279；tests/engine.rs L321-418, L1761-1799, L2072-2134 |
| S46 | 云账户切换与断开 | P1 | 切换先停旧 sweep 再用新账户；Disconnect 尝试 revoke+清密钥 | 状态写入校验 account id 防污染；token 刷新绑定 expected account；revoke 失败仍完成本地断开返回 remoteRevoked:false | commands.rs L560-675, L1281-1451；state.rs L214-237 |
| S47 | 在线 LaTeX 服务项目导入 | P1 | 登录 → 列项目 → 批量导入（并行，逐项成功/失败）保存来源设置 | 登录窗口 20 分钟；session 过期清理回登录态；**ZIP 导入取消能力未确认（不得写成支持）** | overleaf/signin.rs L16-183；import.rs L17-232；overleaf-import.ts L70-279；e2e/109-online-import.spec.ts L23-63 |
| S48 | 在线服务 Git 桥双向同步 | P0 | link → 手动/auto 双向同步；auto 条件：页面可见+无 dirty+无冲突+有 token+静默 15s，首次 2s 后每 3 分钟 | auto 不是无条件定时推送；持续远端变化三轮后 SyncKeptChanging；并发 SyncBusy；同文件冲突 abort 回 base 逐文件选边；**首链 NeedsChoice 且选 remote 前存本地 backup ref**；unlink 导出备份；错误分开：AlreadyLinked/after_files_changed 等 | OverleafSyncButton.tsx L35-129；oleafly-online/sync/mod.rs L17-72, L528-560, L1417-2049；sync/tests.rs L360-617, L1200-1219 |
| S49 | 外部连接器凭据安全 | P1 | Git hosting/Zotero/alphaXiv 账号接入 → publish/push/pull、引用、文献检索 → 断开/离线降级 | token 只经匹配 base URL 的 credential helper+环境变量，不进 argv/URL/.git/config；remote URL 含密码拒绝；错误分类+脱敏；长期凭据 AES-256-GCM 0600/owner ACL；离线后本地缓存/本地 Zotero 仍可用 | forge/remote_auth.rs L9-168；oleafly-online/git.rs L34-378；git.rs L1541-1704, L2238-2273；zotero/http.rs L10-11；zotero/sync.rs L1030-1046；alphaxiv-connector.ts L13-100；oleafly-secrets/lib.rs L1-15 |

### delivery（S50-S52）

| 编号 | 名称 | 优先级 | 主路径摘要 | 关键异常/边界 | 证据（节选） |
|---|---|---|---|---|---|
| S50 | 桌面发布与自动更新 | P1 | tag/手动触发 → draft 全平台资产+latest.json+SBOM+attestation → 手动 Publish → 客户端验签升级 | 缺资产/attestation 保持 draft；**updater 失败不改现有安装、成功后无自动 rollback**；首个发布只建 baseline 需两版本才有真实升级路径；OS 签名与 updater minisign 是两条链；E2E 明确 auto-updater 是 manual-only | docs/releasing.md L5-90；release.yml L14-872；docs/updates.md L18-108；docs/signing.md L3-82 |
| S51 | Server 部署与运维恢复 | P1 | 安装器/Compose/systemd/Render 部署 → setup code 初始化 → 健康检查 → 升级 migration → 备份恢复演练 | server-v 独立发布不得抢占 desktop latest；**/healthz 只表示进程存活 /readyz 才可接流量**；DB 比程序新拒绝打开；migration 逐个事务+FK check；旧二进制不能简单回滚新 DB；重启后 server_id 持久 | release-server.yml L3-697；Dockerfile L31-89；deploy/server/*（compose/Caddyfile/.env.example/oleafly-server.service/smoke-test.sh/install.sh）；collaboration-server.md L1147-1155 |
| S52 | CLI 独立发布分发 | P2 | cli-vX.Y.Z 工作流 → 7 个 target 构建 → version/help/JSON/doctor smoke → draft → Publish | macOS 有证书才签名有凭据才公证；**Windows Authenticode 当前未接线（明确警告）**；CLI JSON 1.0 前不稳定 | release-cli.yml L142-197；docs/development.md L98-152（**注意：development.md "no standalone package yet" 已过时，工作流已存在**） |

## 文档/实现偏差清单（基线按实现记录，文档回补另立变更）

| # | 偏差 | 文档 | 实现 |
|---|---|---|---|
| D1 | 项目库引擎筛选 | 只列 LaTeX/Typst/Markdown（ProjectLibrary.md L46-55） | 实际支持五种含 Quarto/Calepin（project-search.tsx L49-67） |
| D2 | 导出目标语义 | "absolute, existing"（Export.md L114-118） | 绝对路径+父目录存在，文件可不存在（sandbox.rs L97-118） |
| D3 | 失败编译 PDF 保留 | 单一 retained-PDF 表述（PDFPreview.md L3-63） | 分"当前可见 PDF"与"最后成功检查点"两种失败路径（compile.ts L1960-2004） |
| D4 | 参考文献文件导入 | Citations.md 未列 RIS/EndNote XML | E2E 经 devtools hook 可导入（48-citation-import.spec.ts）——记为"实现支持、UI 入口待确认" |
| D5 | 非英语语法校对 | Editor.md 未直说 | 非英语只 Hunspell，grammar-only unsupported（worker.test.ts L232-269） |
| D6 | 通用 toast 静音 | Editor.md L264-267 "Deferred, not planned for 0.4.1" | 状态无法确认，基线不列为已实现场景 |
| D7 | 内置 ACP agent 数量 | 14（AICopilot.md L18-19） | 15（builtin_agents.rs L23-196） |
| D8 | MCP native writes | renderer 断开后可写（mcp.md L95-102） | 只保留 6 个只读工具（mcp/native.rs L8-49） |
| D9 | Research 默认 run 时长 | analysis 30min/training 4h（Skills.md L322-325） | 单 run 60 分钟（model.rs L177-197） |
| D10 | blocked 模型文案 | 概括为不可选 | catalog blocked 永拒；probe blocked 可无工具 plain chat（ai_model_registry.rs L185-207） |
| D11 | CLI 独立包 | "no standalone package yet"（development.md L98-101） | release-cli.yml 工作流已存在 |
| D12 | README 离线冲突概括 | "asks before it applies anything"（README L52-66） | 自动合并+只读 Merge Review（merge.rs） |

## 架构与测试要点（进 architecture/deployment delta）

- Monorepo：pnpm workspace（packages/*）+ Cargo workspace（crates/* + src-tauri），Node ≥22.13 <25、pnpm 11.9.0、Rust 1.98.1；workspace 包以 TS source 消费，不得导入 Zustand/Tauri API/@/ 模块。
- 组件分组：项目与编译共享（core/history/preflight/lint/doctools/synctex/downloads）、可执行（cli/src-tauri）、Agent与研究（agent/acp/research/sandbox/secrets/forge/online）、协作（collab-protocol/collab/server）；TS 包 17 个按编辑/契约/规则分组。
- 编译主链路：engine descriptor → 项目索引 → typed IPC → Rust sandbox 引擎 → 规范化日志/诊断/artifact → PDF.js+SyncTeX；PDF 不走 base64 JSON。
- 信任边界：路径解析校验；次级窗口默认拒绝；connector key 不回读 WebView；MCP 127.0.0.1+bearer；下载 pin+SHA-256+原子安装；模型 verified/blocked/untested；Server 项目非 E2E 加密；可信代理才采 X-Forwarded-For。
- 测试体系：Vitest（app 1655 文件级 + web 22）、coverage 门禁 lines 98/branches 92、editor performance、Rust workspace（153 integration roots）、真实 Tauri E2E 117 spec 三平台、Browser E2E（fake engine，不等同生产）、协作 crowd/soak、部署 installer E2E；`npm test` 失败根因是 node_modules 未装（vitest 已声明于 devDependencies），正确流程 `corepack enable && pnpm install --frozen-lockfile && pnpm test`；pnpm 路径疑似 WSL/Windows 混用为次要不确定项。
- CI 覆盖 lint/i18n/build/WASM/budget/coverage/performance/Rust 全套/三平台 E2E/NSIS-MSI/collab peer/browser harness；已知边界：OS 原生拖放、auto-updater、真实 AI 端到端为人工区域；Linux 大文档编译有开放问题。
- 数据资产：Server SQLite schema 18（migration 0001-0018，WAL，4 reader/64 write group）；本地五库 library.db(schema3)/catalog.sqlite3(checkpoint format2)/tasks.sqlite3(research schema5)/literature-cache.sqlite3/sessions.sqlite。
- API 资产：BackendPort v7（12 capabilities）、CompilePort（supports/compile/stop/syncTex）、Tauri IPC 注册表 lib.rs L523-1251、collab protocol v1（min/max 协商）、Server HTTP/WS 路由全集、MCP localhost、CLI JSON（1.0 前不稳定）。
- 部署资产：Server Dockerfile（distroless/10001/8080/healthcheck）、Compose+Caddy 2.11.7、Litestream 可选、systemd 硬化、Render 模板、installer（SHA256 校验）、smoke-test.sh；外部 Oleafly/oleafly-server 仓库仅作发布分发 adapter，不可推断其实际状态。

## verify 阶段注意

- 本次基线为静态盘点；verify 时测试结果只能声明"未执行/环境未装依赖"，不得预填 PASS。
- `logos.config.json` verify.pre_run_command 为 `npm test`，与本仓库 pnpm workspace 不符；基线落地后应修正为 pnpm 路径（另立小变更或在 verify 前人工修正）。
