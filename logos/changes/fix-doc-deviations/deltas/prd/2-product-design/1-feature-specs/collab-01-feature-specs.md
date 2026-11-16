<!-- fix-doc-deviations: D12 标注转终态 -->
<!-- 「#### 能力与限制」等小节标题在本文件内多处重复，故以所属场景 ### 标题为块（标题与主文档逐字一致）；块内仅偏差标注句变化，其余逐字保留 -->
## MODIFIED — S29: 服务器接入与项目共享

**优先级**：P0 ｜ **触发**：团队启用实时协作，接入一台自建 Oleafly Collaboration Server

#### 功能入口与表面
- 桌面端「添加 Server」入口：填写自建 Server 地址 → GitHub/OIDC 登录 → 设备登记。
- 项目分享表面：分享项目、生成邀请链接并指定角色。
- Server 首次初始化：第一个 admin 初始化入口（需 setup code）。

#### 关键交互
1. 用户在桌面端添加自建 Server 地址，经 GitHub/OIDC 登录。
2. 完成设备登记，设备获得同步资格。
3. Owner 分享项目或生成邀请链接并指定角色。
4. 协作者经邀请加入项目，按所授角色进入协作。

#### 能力与限制
- 全新 Server 的第一个 admin 初始化必须提供 setup code 才能完成。
- 客户端与 Server 协作协议版本不兼容时，停止同步并明确报告，不产生半同步状态。
- 设备被 suspended 或已撤销时，登录/同步返回明确错误，不授予访问。
- README 离线冲突概括（原偏差 D12，README 已由 fix-doc-deviations 对齐）：实际重叠文本是 Loro 自动合并 + 只读 Merge Review，并非一切变更都先询问（见 S32）。

#### 关联需求
- `collab-01-requirements.md` §S29（用户价值：一键接入 Server 并把项目按角色分享给协作者）；痛点 P01。
- 证据（inventory 节选）：docs/collaboration-server.md L1-28、L641-765；routes/auth.rs L43-85；e2e/109-live-collaboration-peer.spec.ts L201-297。

## MODIFIED — S32: 离线冲突合并与审查

**优先级**：P0 ｜ **触发**：离线/断线期间产生重叠编辑或外部磁盘变化

#### 功能入口与表面
- Merge Review 只读对话框：按作者与 diff 审查合并结果。
- 同步暂停横幅（SyncPauseBanner）：大批量外部磁盘变化时的 Send / Keep local 选择。
- 冲突副本保留通知。

#### 关键交互
1. 离线期间两端对同一文本产生重叠编辑。
2. 恢复同步后，文本由 Loro/OT 自动合并。
3. 用户在只读 Merge Review 中按作者与 diff 审查合并结果。
4. 二进制文件或路径冲突无法自动合并时，保留双方副本并通知用户，不静默覆盖。
5. 项目目录发生大批量外部磁盘变化时进入同步暂停，由用户选择 Send / Keep local。

#### 能力与限制
- 并非所有重叠文本都要求人工二选一：实际行为是自动合并 + 只读审查（原偏差 D12，README 已对齐）。
- 写盘失败时退避并通知。
- 暂停、副本与通知均有明确行为，不静默丢弃任何一方修改。

#### 关联需求
- `collab-01-requirements.md` §S32（用户价值：文本冲突自动合并、可审查；无法合并的保留副本不丢数据）；痛点 P04。
- 证据（inventory 节选）：merge.rs L402-498；MergeReviewDialog.tsx L25-216；kept.rs L148-322；sync_hold.rs L26-310；SyncPauseBanner.tsx L24-75。
