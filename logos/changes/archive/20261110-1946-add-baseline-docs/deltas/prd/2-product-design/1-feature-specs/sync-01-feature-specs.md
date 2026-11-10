## ADDED — Oleafly 云同步与在线服务（sync）功能规格（现状基线）

> module: sync | 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）
> 本规格为存量产品现状基线：只描述已实现能力，不新增任何功能或交互；全部事实仅来自提案 `inventory.md`（sync 段 S43-S49）与需求文档 `sync-01-requirements.md`。本次为只读静态盘点，未运行任何测试，未经动态验证的行为均在各场景「能力与限制」中声明。

### 云同步 ≠ 实时协作（口径声明）

**云同步与实时协作是正交的两套机制，不可混称。**

- **云同步（本模块）**：设备间、文件级的最终一致同步，基于云存储上的 manifest 比对。双侧修改普通文件时**不做文本合并**，而是保留冲突副本（两个版本都留，如 `main (Laptop 日期).tex`），由用户比对收敛；`project.json` 与设置类走 merge3 三方合并。解决的是「同一人在多台设备间继续工作」。
- **实时协作（collab 模块，S29-S42）**：基于 Loro CRDT change log，多端并发编辑实时收敛，文本自动合并并提供只读 Merge Review。解决的是「多人同时编辑同一项目」。
- 两套机制独立运行、互不替代：不得把云同步宣传为实时协作，也不得把 CRDT 自动合并能力宣传到云同步路径上；云同步的冲突副本 / merge3 不得被宣传为 CRDT 自动合并。

---

### S43: 云同步多设备协作

#### 功能入口与表面

- 用户自有云存储账户连接入口：Dropbox / Google Drive / S3 三类 provider（证据：`cloud/provider.rs` L12-75）。
- S3 配置在保存密钥前先执行 probe 与条件写检查（证据：`commands.rs` L749-800）。
- 同步对象为 Library 项目与设置；同步执行由云同步引擎驱动（证据：`engine.rs` L21-47、`commands.rs` L1646-2142）。

#### 关键交互

1. 用户连接云存储账户（Dropbox / Google Drive / S3）；配置 S3 时先执行 probe 与条件写检查，通过后才保存密钥。
2. 本机同步 Library 项目与设置到云存储。
3. 在另一台设备连接同一云存储账户并触发同步。
4. 该设备获得对应的项目内容与设置更新，可继续编辑。

#### 能力与限制

- **同步范围**：只同步 Library 中有 `project.json` 的项目，不含任意 linked folder。
- **不同步内容**：`.git` 历史与 checkpoints 不随云同步；检查点与本地 Git（core 模块 S12/S13）与云同步完全独立、互不替代。
- **规模上限**：单项目受 100000 文件与 manifest 64MiB 上限约束。
- **S3 密钥前置检查**：先 probe + 条件写检查，通过后才保存密钥。
- **现状声明**：真实云服务商账户（Dropbox / Drive / S3）下的动态行为未在本次执行测试，verify 阶段单独取证。

#### 关联需求

- S43 ← P01（多设备工作上下文割裂）：用自己的云存储获得多设备一致的 Library，无需人工拷贝。

---

### S44: 冲突副本与三方合并

#### 功能入口与表面

- 同步引擎在双侧修改同一文件时自动产生冲突副本，命名形如 `main (Laptop 日期).tex`（证据：`engine.rs` L1110-1186、`tests/engine.rs` L275-306）。
- `project.json` 与设置类文件由 merge3 三方合并处理（证据：`cloud/merge.rs` L4-207）。

#### 关键交互

1. 设备 A 与设备 B 均修改同一普通文件，先后完成同步。
2. 后到的一侧同步时不覆盖先到的版本，保留两个版本（冲突副本含设备与日期命名）。
3. 用户比对两个版本后收敛，收敛结果再同步，双方趋于一致。
4. `project.json` 或设置在双侧被修改时，同步走 merge3 三方合并而非冲突副本；同字段 metadata 冲突时 local 获胜。

#### 能力与限制

- 普通文件双侧修改**不做文本合并**，保留两版本由用户收敛（见开头口径声明）。
- 编辑器存在未保存（dirty）缓冲时，Download / LocalDelete / MetaMerge 类同步操作改为 Carry 处理，不覆盖未保存缓冲（证据：`tests/engine.rs` L521-582）。
- 冲突副本尚未上传成功前，当前编辑不被冲突副本处理覆盖（证据：`tests/engine.rs` L1850-1891）。
- 同字段 metadata 冲突 local 获胜。

#### 关联需求

- S44 ← P01（多设备工作上下文割裂）：双侧修改都不丢，冲突可见、可收敛。

---

### S45: 批量删除保护与回收站

#### 功能入口与表面

- 同步引擎对大批量删除的 hold 处理与用户交互（restore 或确认 delete）（证据：`engine.rs` L1237-1279）。
- 远端传播删除的 Trash（回收站）保留 30 天。

#### 关键交互

1. 本地一次删除大量文件（或删除全部文件）时，同步引擎进入 hold 状态。
2. 用户在 hold 状态选择 restore（恢复）或确认 delete（删除）。
3. 另一设备的删除经同步传播到本机时，被删文件进入 Trash 而非直接消失。
4. Trash 中的文件 30 天内可恢复。

#### 能力与限制

- 删除全部文件必进入 hold。
- 删除超过 20 个且过半项目文件进入 hold；本地与远端**分别判定**（证据：`tests/engine.rs` L321-418）。
- 远端 tombstone 传播的删除在本机判定为异常大规模删除时，暂停执行，不删除本地文件（证据：`tests/engine.rs` L1761-1799、L2072-2134）。
- Trash 保留 30 天。

#### 关联需求

- S45 ← P02（跨设备误删放大）：误删有兜底，删除可恢复。

---

### S46: 云账户切换与断开

#### 功能入口与表面

- 云存储账户切换操作与 Disconnect（断开连接）操作（证据：`commands.rs` L560-675、L1281-1451）。
- 云同步状态持久化与 token 刷新（证据：`state.rs` L214-237）。

#### 关键交互

1. 设备已连接云账户 A，用户切换到账户 B。
2. 引擎先停止旧账户的 sweep，再以新账户继续同步。
3. 用户执行 Disconnect 时，尝试 revoke 远端授权。
4. revoke 后清除本地保存的密钥，断开完成。

#### 能力与限制

- 云同步状态写入校验 account id，防止账户污染。
- token 刷新绑定 expected account，不跨账户误用。
- revoke 请求失败（如无网络）时，本地断开仍完成，并如实返回 `remoteRevoked:false`（远端授权未撤销）。

#### 关联需求

- S46 ← P01（多设备工作上下文割裂）：切换与断开结果可预期，不留半连接状态。

---

### S47: 在线 LaTeX 服务项目导入

#### 功能入口与表面

- 在线 LaTeX 服务（实现内部称 overleaf）登录与项目列表界面、批量导入界面（证据：`overleaf/signin.rs` L16-183、`import.rs` L17-232、前端 `overleaf-import.ts` L70-279、E2E `e2e/109-online-import.spec.ts` L23-63）。
- 导入完成后保存来源设置。

#### 关键交互

1. 用户登录在线 LaTeX 服务（登录窗口 20 分钟）。
2. 列出在线服务上的项目。
3. 选择多个项目批量导入；导入并行执行，逐项独立报告成功/失败，单项失败不阻断其他项。
4. 导入完成后保存来源设置。

#### 能力与限制

- 登录窗口 20 分钟；session 过期后清理会话回到登录态，要求重新登录后再继续。
- **ZIP 导入的取消能力未在实现与测试中确认，本基线不声称支持取消；任何文档与宣传不得写成支持**。
- 批量导入并行执行，逐项独立成功/失败。

#### 关联需求

- S47 ← P03（在线平台锁定）：批量、逐项可追踪地把在线项目迁入本地 Library。

---

### S48: 在线服务 Git 桥双向同步

#### 功能入口与表面

- 在线服务同步按钮（证据：`OverleafSyncButton.tsx` L35-129）。
- 项目 link（链接）与 unlink（解除链接）操作；unlink 时导出本地备份。
- 同步执行与冲突处理由 Git 桥同步引擎承担（证据：`oleafly-online/sync/mod.rs` L17-72、L528-560、L1417-2049；`sync/tests.rs` L360-617、L1200-1219）。

#### 关键交互

1. 将本地项目 link 到在线服务上的对应项目；首次同步链路可能要求用户选择来源（NeedsChoice），选 remote 前先保存本地 backup ref。
2. 用户手动触发同步，本地与远端双向同步；或在条件满足时 auto 同步。
3. auto 同步条件：页面可见、无 dirty 编辑、无冲突、token 可用且已静默 15 秒；首次在 2 秒后触发，其后每 3 分钟一次。
4. 同一文件双侧被修改时，同步 abort 回到 base 并逐文件选边。
5. 用户 unlink 项目时导出本地备份。

#### 能力与限制

- **auto 不是无条件定时推送**：dirty 编辑、未解决冲突、无 token 或页面不可见任一条件不满足时，auto 周期到达也不执行推送。
- 远端在同步期间持续变化（三轮未收敛）以 `SyncKeptChanging` 收尾；前一同步尚未结束又触发新同步返回 `SyncBusy`，不叠加执行。
- 首链 NeedsChoice 且选 remote 前保存本地 backup ref，本地内容可回退。
- unlink 导出本地备份。
- 错误按类型分开明确返回，如 `AlreadyLinked`、`after_files_changed` 等，不混为一般失败。

#### 关联需求

- S48 ← P03（在线平台锁定）：不经手工搬运，本地与在线双向同步。

---

### S49: 外部连接器凭据安全

#### 功能入口与表面

- Git hosting、Zotero、alphaXiv 等外部账号服务接入入口（证据：`forge/remote_auth.rs` L9-168、`alphaxiv-connector.ts` L13-100）。
- 接入后凭据用于 publish / push / pull（证据：`oleafly-online/git.rs` L34-378、`git.rs` L1541-1704、L2238-2273）、引用与文献检索（证据：`zotero/http.rs` L10-11、`zotero/sync.rs` L1030-1046）。
- 长期凭据存储由 secrets 组件承担（证据：`oleafly-secrets/lib.rs` L1-15）。

#### 关键交互

1. 用户接入 Git hosting / Zotero / alphaXiv 账号。
2. 凭据用于 publish / push / pull、引用插入与文献检索：token 只经匹配 base URL 的 credential helper 与环境变量传递。
3. 用户断开外部账号连接。
4. 网络不可用时相关功能明确降级，本地缓存与本地 Zotero 仍可用。

#### 能力与限制

- token 不进 argv / URL / `.git/config`，只经匹配 base URL 的 credential helper 与环境变量传递。
- remote URL 内嵌密码时拒绝该 remote，不使用含明文密码的 URL。
- 错误按类别返回且经脱敏，不回显 token。
- 长期凭据以 AES-256-GCM 加密、0600/owner ACL 保存。
- 离线后本地缓存与本地 Zotero 仍可用，不伪装在线成功。

#### 关联需求

- S49 ← P04（外部凭据散落）：凭据最小暴露，离线可降级工作。

---

## UI 表面清单（现状清单，非原型）

> 以下表面由 inventory.md 证据文件与需求文档主路径推得，仅列现状存在的表面，不设计新交互。

| 表面 | 所属模块 | 关联场景 | 主要入口 / 证据 |
|---|---|---|---|
| 云存储账户连接与凭据配置（Dropbox / Drive / S3，S3 含 probe + 条件写检查） | sync | S43 | 云存储账户连接路径；`commands.rs` L749-800、`cloud/provider.rs` L12-75 |
| 同步状态与批量删除 hold 交互（restore / 确认 delete） | sync | S45 | 同步引擎 hold 处理；`engine.rs` L1237-1279 |
| Trash 回收站查看与恢复（30 天保留） | sync | S45 | 远端删除进 Trash 路径；`engine.rs` L1237-1279 |
| 云账户切换与 Disconnect | sync | S46 | 账户切换 / 断开路径；`commands.rs` L560-675、L1281-1451 |
| 在线 LaTeX 服务登录与项目列表 | sync | S47 | 在线服务导入路径；`overleaf/signin.rs` L16-183、`overleaf-import.ts` L70-279 |
| 在线服务批量导入（并行、逐项成功/失败） | sync | S47 | 批量导入路径；`import.rs` L17-232、`overleaf-import.ts` L70-279、`e2e/109-online-import.spec.ts` |
| 在线服务同步按钮（手动触发 / link / unlink 备份导出） | sync | S48 | `OverleafSyncButton.tsx` L35-129；`oleafly-online/sync/mod.rs` |
| Git hosting / Zotero / alphaXiv 账号接入 | sync | S49 | 外部账号接入路径；`forge/remote_auth.rs` L9-168、`alphaxiv-connector.ts` L13-100 |
