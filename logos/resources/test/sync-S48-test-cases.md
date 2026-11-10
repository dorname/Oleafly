## S48 在线服务 Git 桥双向同步 测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **本文性质**：本文件是**只读静态盘点**产物，**未运行任何测试**。下文所有条目均为**测试设计**，不含任何 PASS / FAIL 结论；auto 同步的计时精度与真实在线服务下的动态表现须在 verify 阶段单独取证。
> **事实来源**：`inventory.md` sync 段 S48 行；`deltas/prd/1-product-requirements/sync-01-requirements.md` §四 S48；`deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md` S48；`deltas/prd/3-technical-plan/2-scenario-implementation/sync-S48-online-git-bridge.md`。
> **口径声明（不可混称）**：本场景是**本地项目与在线 LaTeX 服务（实现内部称 overleaf）项目之间经 Git 桥的双向同步**，属 sync 模块。它**既不是** collab 模块的实时协作（S29-S42），**也不是** S43 的 Dropbox / Google Drive / S3 云存储同步路径——三者互不可混称。本场景的冲突处理是 **abort 回到 base 后逐文件选边**，不是 CRDT 自动合并，也不是云同步的「冲突副本 + merge3」。

---

## 一、单元测试用例

### 1.1 API 字段约束（来源：Tauri IPC 在线同步命令集）

> 来源基准：`deltas/api/core-01-backend-port.md` §四「Tauri IPC 注册表（分类清单）」——该清单为**代表性**命令，文中明示「完整清单以注册表原文为准」。在线同步命令族 `overleaf_sync_*` / `overleaf_git_token_*` **未出现在该代表性清单的 §4.2 云同步分组中**，故此处以注册表原文（`src-tauri/src/lib.rs` L1000-1008）与前端调用面（`src/lib/overleaf-sync.ts`）为准登记，未发明任何命令或字段。

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S48-01 | `overleaf_sync_link` 必填 `project_id` 与 `remote_id` | 注册表原文 `src-tauri/src/lib.rs` L1000-1008；前端 `src/lib/overleaf-sync.ts` `overleafSyncLink` → `projectId`、`remoteId` 必填 | 应用已启动，已登录在线服务 | 调用方不传 `remoteId` | 返回参数错误；不建立同步链路、不产生任何远端写入 |
| UT-S48-02 | `overleaf_sync_link` 对已链接到**不同**远端的项目返回分类错误 | `sync-S48-online-git-bridge.md` §四 F6（`AlreadyLinked`）；实现证据 `src-tauri/src/overleaf/mod.rs` L385-390、`crates/oleafly-online/src/sync/mod.rs` L2015-2020 | 项目已 link 到远端 A | `projectId=<项目>`，`remoteId=<远端 B>` | 返回错误 `overleaf.sync_already_linked`（底层错误类别 `sync_already_linked`）；**不混为一般失败**；原有链路不被改写 |
| UT-S48-03 | `overleaf_sync_link` 的 `prefer` 仅接受 `local` / `remote`（可选） | 前端 `src/lib/overleaf-sync.ts` `SyncSide = "local" \| "remote"`；实现证据 `crates/oleafly-online/src/sync/mod.rs` L1599-1604 | 应用已启动，已登录在线服务 | `prefer="both"` | 返回参数错误或按未提供处理（`prefer` 为 `Option`，非法值不得被当作 remote 处理）；不产生未预期的覆盖 |
| UT-S48-04 | `overleaf_sync_now` 的 `resolutions` 为逐文件选边映射 | 前端 `src/lib/overleaf-sync.ts` `overleafSyncNow(resolutions: Record<string, SyncSide> \| null)`；`sync-S48-online-git-bridge.md` §三 Step 6 | 上一轮同步返回冲突文件清单 | `resolutions={"a.tex":"local","b.tex":"remote"}` | 仅对列出的冲突文件按所选方向处理；未列出的冲突文件保持待选状态；**不做整目录自动取舍** |
| UT-S48-05 | `overleaf_sync_set_auto` 必填 `auto` 布尔 | 前端 `overleafSyncSetAuto(projectId, auto: boolean)` | 项目已 link | `auto=false` | 链接记录中的 `auto` 置为 false；此后 auto 周期到达**不推送** |
| UT-S48-06 | `overleaf_git_token_set` 的 `token` 必填且 `server` 归一化 | 前端 `overleafGitTokenSet(server, token)`；`src/lib/overleaf-sync.ts` `serverArg`（`trim()` 或 `null`）；实现证据 `src-tauri/src/overleaf/mod.rs` L323-334 | 已登录在线服务 | `server="  "`（仅空白）→ `null`；`token="  "`（仅空白） | `server` 归一化为默认服务；`token` 为空时**不保存空凭据**；返回错误或空操作，不写入空 token |
| UT-S48-07 | `overleaf_sync_status` 必填 `project_id` | 注册表原文 `src-tauri/src/lib.rs` L1000 | 应用已启动 | 调用方不传 `projectId` | 返回参数错误；不读取任何远端状态 |
| UT-S48-08 | `overleaf_sync_unlink` 必填 `project_id` | 注册表原文 `src-tauri/src/lib.rs` L1004 | 项目已 link | 调用方不传 `projectId` | 返回参数错误；**不导出备份、不解除链接** |

### 1.2 DB 约束

**本组不适用（非遗漏）**：S48 在基线中**没有任何数据库表**。在线同步的链路记录（`SyncLink`）、镜像仓库与 backup ref 均落盘为**文件**（链路记录文件、本地 Git 仓库、`refs/oleafly/` 下的备份引用），不进入基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）——这两份 DB delta **均不含 sync / online 模块表**。因此 S48 **无 UNIQUE / CHECK / NOT NULL / FOREIGN KEY 约束可提取**，本组不设计用例。

### 1.3 业务规则（来源：时序 Step 与 F 分支）

| ID | 描述 | 来源 | 前置条件 | 输入 | 预期输出 |
|---|---|---|---|---|---|
| UT-S48-09 | auto 触发须**五项条件全部满足** | `sync-S48-online-git-bridge.md` §三 Step 4、§四 F1；`sync-01-requirements.md` §四 S48 正常条件；实现证据 `src/components/layout/overleaf-sync/OverleafSyncButton.tsx` L69-88 | 项目已 link、auto 开关开启、token 已保存、无冲突、无 dirty、页面可见且有焦点、静默已满 15 秒 | auto 周期到达 | 触发一次 auto 同步（`sync(null, "auto")`） |
| UT-S48-10 | auto **首次**在 2 秒后触发 | 同上（实现证据 `OverleafSyncButton.tsx` L85 `setTimeout(tick, 2_000)`） | 同 UT-S48-09 | 组件挂载后 2 秒 | 触发一次 auto 同步；此后由 3 分钟间隔接管 |
| UT-S48-11 | auto 其后**每 3 分钟**触发一次 | 同上（实现证据 `OverleafSyncButton.tsx` L36 `AUTO_SYNC_EVERY = 3 * 60_000`、L86 `setInterval`） | 首次触发已完成 | 连续 3 个 3 分钟窗口 | 每个窗口各触发一次 auto 同步；不叠加、不重复排队 |
| UT-S48-12 | 「静默 15 秒」判定 | 同上（实现证据 `OverleafSyncButton.tsx` L36 `QUIET_AFTER_TYPING = 15_000`、L84 `Date.now() - lastEdit.current < QUIET_AFTER_TYPING`） | 最后一次编辑发生在 10 秒前 | auto 周期到达 | **不触发**（未满 15 秒静默） |
| UT-S48-13 | 页面不可见 → 不推送 | `sync-S48-online-git-bridge.md` §四 F1；实现证据 `OverleafSyncButton.tsx` L73 `document.visibilityState === "visible" && document.hasFocus()` | 标签页不可见或窗口失去焦点 | auto 周期到达 | **不执行推送**；auto 不是无条件定时推送 |
| UT-S48-14 | 存在 dirty 编辑 → 不推送 | 同上（实现证据 `OverleafSyncButton.tsx` L72、L82） | 至少一个打开文件处于未保存状态 | auto 周期到达 | **不执行推送** |
| UT-S48-15 | 存在未解决冲突 → 不推送 | 同上（实现证据 `OverleafSyncButton.tsx` L80 `sync.conflicts.length > 0`） | 上一轮同步留下未选边的冲突文件 | auto 周期到达 | **不执行推送** |
| UT-S48-16 | 无可用 token → 不推送 | 同上（实现证据 `OverleafSyncButton.tsx` L79 `sync.status.tokenSaved`） | token 未保存 | auto 周期到达 | **不执行推送**；UI 状态行显示需要 token |
| UT-S48-17 | auto 开关未开启 → 不推送 | 实现证据 `OverleafSyncButton.tsx` L78 `sync.status.auto` | 项目已 link 但 auto 开关为关闭 | auto 周期到达 | **不执行推送**（前提条件之一） |
| UT-S48-18 | 远端持续变化三轮未收敛 → 以 `SyncKeptChanging` 收尾 | `sync-S48-online-git-bridge.md` §三 Step 5 备注、§四 F2；`sync-01-requirements.md` §四 S48 异常条件；实现证据 `crates/oleafly-online/src/sync/mod.rs` L1900-1988（`for _ in 0..3` 后 `SyncKeptChanging`） | 远端在每轮拉取后都发生变化 | 连续触发同步 | 最多尝试 3 轮后以分类错误 `sync_kept_changing` 结束；**不伪装成一般失败**；不静默丢数据 |
| UT-S48-19 | 并发触发 → 返回 `SyncBusy`，不叠加执行 | `sync-S48-online-git-bridge.md` §四 F3；实现证据 `crates/oleafly-online/src/sync/mod.rs` L163-174（`RUNNING` 集合已存在该 key → `SyncBusy`） | 同一项目的同步正在执行中 | 再次触发同步 | 返回分类错误 `sync_busy`；**不启动第二个同步实例**（执行不叠加） |
| UT-S48-20 | 同一文件双侧被修改 → abort 回 base 并返回待选边文件清单 | `sync-S48-online-git-bridge.md` §三 Step 6、§四 F4；实现证据 `crates/oleafly-online/src/sync/mod.rs` L1912-1918（`Integration::Conflicts(files)`） | 同一文件在本地与远端都被修改 | 触发同步 | 同步结果为「冲突」并给出冲突文件清单；工作树回到 base（**未自动选边、未自动合并**）；等待逐文件选边 |
| UT-S48-21 | 首链 NeedsChoice 且选 remote → **先保存本地 backup ref** | `sync-S48-online-git-bridge.md` §三 Step 2、§四 F5；实现证据 `crates/oleafly-online/src/sync/mod.rs` L1605-1619（提交 "Oleafly copy before linking" 并 `update-ref refs/oleafly/before-link-{ts}`） | 首链两侧内容不同；用户在选择界面选 **remote** | `prefer=Some(Side::Remote)` | 先创建本地备份提交并写入 `refs/oleafly/before-link-*` 引用，**之后**才以远端为准建立链路；本地内容**可回退** |
| UT-S48-22 | unlink → 导出本地备份 | `sync-S48-online-git-bridge.md` §三 Step 7、§四 F8；实现证据 `crates/oleafly-online/src/sync/mod.rs` L1693-1760（按 `refs/oleafly/` 前缀遍历并导出） | 项目已 link 且已产生过 backup ref | 执行 unlink | 导出本地备份（备份目录路径回传到 `backupsFolder`）；随后解除链接 |
| UT-S48-23 | 同步期间本地文件变化 → 分类错误 `after_files_changed` | `sync-S48-online-git-bridge.md` §四 F7；实现证据 `src-tauri/src/overleaf/errors.rs` L74-95（错误信封 `code=overleaf.sync_incomplete` 且参数 `files_may_have_changed=true`） | 同步过程中本地文件被外部改动 | 触发同步 | 返回**分类**错误（`after_files_changed` 语义），与一般失败区分开；不回滚为静默成功 |

---

## 二、场景测试用例

### 2.1 主路径：在线服务 Git 桥双向同步

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S48-01 | link 本地项目到在线服务项目（两侧一致） | Step 1→3 | 已登录在线服务；本地项目与远端项目内容一致 | ①用户执行 link；②Git 桥建立同步链路；③用户手动触发同步 | 链路建立（状态显示已链接）；**不产生 NeedsChoice**；同步后两端内容一致 |
| ST-S48-02 | 首链 NeedsChoice → 用户选 local → 以本地为准建立链路 | Step 1→2 | 已登录在线服务；本地与远端内容不同 | ①用户执行 link；②桥返回 NeedsChoice 与差异文件清单；③用户选择 **local**；④再次触发同步 | 提示用户选择来源；选择 local 后以本地为准建立链路；**本地内容不被远端覆盖** |
| ST-S48-03 | 首链 NeedsChoice → 用户选 remote → 先存 backup ref 再建链路 | Step 1→2 | 同上 | ①用户执行 link；②返回 NeedsChoice；③用户选择 **remote** | 先创建本地备份提交与 `refs/oleafly/before-link-*` 引用，**然后**才以远端为准建立链路；本地内容**可回退** |
| ST-S48-04 | 手动触发同步 → 本地与远端双向同步完成 | Step 3→4 | 项目已 link 且有可用 token | ①用户在同步按钮触发手动同步；②桥拉取远端变更并写入本地；③桥推送本地变更到远端 | 同步结果为「已同步」；**两端内容一致**；本地状态变更被推送 |
| ST-S48-05 | auto 条件满足 → 首次 2 秒后触发、其后每 3 分钟 | Step 4→5 | 项目已 link；auto 开关开启；token 已保存；无冲突、无 dirty；页面可见且有焦点；最后一次编辑已超过 15 秒 | ①保持页面可见且不编辑，观察 2 秒；②继续静默观察 3 个 3 分钟窗口 | 首次在 **2 秒后**触发一次 auto 同步；其后**每 3 分钟**各触发一次；不叠加 |
| ST-S48-06 | 同文件冲突 → abort 回 base → 用户逐文件选边 → 收敛 | Step 6 | 项目已 link；同一文件在双侧被修改 | ①触发同步；②桥 abort 回 base 并给出冲突文件清单；③用户对每个冲突文件选 local 或 remote；④再次触发同步 | 冲突清单准确；选边后**仅按所选方向处理该文件**；再次同步后两端一致；无自动合并 |
| ST-S48-07 | unlink → 导出本地备份后解除链接 | Step 7 | 项目已 link；已产生过 backup ref | ①用户执行 unlink；②桥导出本地备份；③解除链接 | 返回备份目录路径（`backupsFolder`）；备份文件内容可读；链接状态解除（`linked=false`） |

### 2.2 异常路径

| ID | 描述 | 覆盖 EX | 前置条件 | 触发条件 | 预期结果 |
|---|---|---|---|---|---|
| ST-S48-08 | auto 周期到达但条件不满足 → 不执行推送 | EX F1（条件不满足不推送） | 项目已 link、auto 开启、token 已保存 | 分别构造：dirty 编辑 / 未解决冲突 / 无 token / 页面不可见 | 四种情形**均不推送**；远端与本地均无变化；**auto 不是无条件定时推送** |
| ST-S48-09 | 远端在同步期间持续变化 → `SyncKeptChanging` 收尾 | EX F2（远端持续变化） | 项目已 link；远端在每轮拉取后都发生变化 | 触发同步 | 最多 3 轮后以 `sync_kept_changing` 分类错误结束；UI 明确展示「远端持续变化」；不伪装成一般失败 |
| ST-S48-10 | 前一同步未结束又触发 → `SyncBusy` | EX F3（并发） | 同一项目的同步正在执行中 | 在执行期间再次触发同步 | 返回 `sync_busy` 分类错误；**不叠加第二个同步实例**；第一次同步正常结束 |
| ST-S48-11 | 同一文件双侧被修改 → abort 回 base 并逐文件选边 | EX F4（同文件冲突） | 项目已 link；同一文件双侧被修改 | 触发同步 | 同步结果为「冲突」；工作树回到 base；冲突文件清单可逐个选边；未选边的文件不自动处理 |
| ST-S48-12 | 首链选 remote 前保存本地 backup ref，本地可回退 | EX F5（首链选择） | 首链两侧内容不同 | 用户在 NeedsChoice 中选 remote | 先写入 `refs/oleafly/before-link-*` 备份引用再建立链路；用该引用可取回本地原内容 |
| ST-S48-13 | 项目已 link 后再次 link → `AlreadyLinked` 分类错误 | EX F6（错误分类） | 项目已 link 到远端 A | 再次 link 到**同一**远端 A 或**不同**远端 B | 返回 `overleaf.sync_already_linked` / `sync_already_linked` 分类错误；**不混为一般失败**；原有链路不被改写 |
| ST-S48-14 | 同步期间本地文件发生变化 → `after_files_changed` 分类错误 | EX F7（错误分类） | 项目已 link | 同步过程中本地文件被外部改动 | 返回分类错误（`after_files_changed` 语义）；错误可定位到「文件已变化」；不静默继续覆盖 |
| ST-S48-15 | 未 link 的项目执行同步 → 明确「未链接」分类错误 | EX F6（错误分类） | 项目从未 link | 触发同步 | 返回 `sync_not_linked` 分类错误；不创建链路、不推送任何内容 |
| ST-S48-16 | 项目已 link 到另一远端时再次 link → 拒绝并保持原链路 | EX F6（错误分类） | 项目已 link 到远端 A | link 到远端 B | 返回 `sync_already_linked`；状态仍指向远端 A；本地与远端 A 的链路未被破坏 |

### 2.3 人工验证用例（`[manual]`）

> 以下用例依赖**真实在线 LaTeX 服务**与**真实计时窗口**，在无头 CI 中无法稳定断言，故标记 `[manual]`，不计入 `defined_count`。

| ID | 描述 | 覆盖 Steps | 前置条件 | 操作序列 | 预期结果 |
|---|---|---|---|---|---|
| ST-S48-17 `[manual]` | 真实在线服务下的手动双向同步 | Step 1→4 | 真实在线 LaTeX 服务账号与本地项目；token 已保存 | ①link 本地项目到线上项目；②在本地编辑并保存；③手动触发同步；④打开线上项目查看 | 线上项目出现本地改动；线上改动也回到本地；两端最终一致 |
| ST-S48-18 `[manual]` | 真实在线服务下 auto 同步的计时精度 | Step 4→5 | 同上；页面保持可见且有焦点；不编辑 | ①静默观察首次触发时刻；②观察其后 3 分钟间隔 | 首次触发落在 2 秒附近；其后间隔约 3 分钟；期间无重复触发 |
| ST-S48-19 `[manual]` | unlink 后备份目录的人工查看 | Step 7 | 已产生过 backup ref | ①执行 unlink；②打开返回的备份目录路径 | 目录存在且含备份文件；内容与 link 前本地内容一致 |

---

## 三、覆盖度校验

### 3.1 Phase 1 正常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 正常：手动双向同步（GIVEN 项目已 link 到在线服务；WHEN 用户手动触发同步；THEN 本地与远端双向同步完成，内容一致） | UT-S48-09、ST-S48-01、ST-S48-02、ST-S48-04、ST-S48-17 `[manual]` | ✅ 已覆盖 |
| 正常：auto 同步按条件触发（GIVEN 页面可见、无 dirty 编辑、无冲突、token 可用且已静默 15 秒；WHEN auto 同步判定；THEN 首次在 2 秒后触发，其后每 3 分钟一次） | UT-S48-09 ~ UT-S48-12、ST-S48-05、ST-S48-18 `[manual]` | ✅ 已覆盖 |

### 3.2 Phase 1 异常验收条件

| 验收条件 | 覆盖用例 | 结论 |
|---|---|---|
| 异常：条件不满足不推送（GIVEN dirty 编辑、未解决冲突、无 token 或页面不可见任一条件不满足；WHEN auto 周期到达；THEN 不执行推送——auto 不是无条件定时推送） | UT-S48-13 ~ UT-S48-17、ST-S48-08 | ✅ 已覆盖（四个不满足条件逐条对应 + auto 开关前提） |
| 异常：远端持续变化与并发（GIVEN 远端在同步期间持续变化（三轮未收敛），或前一同步尚未结束又触发新同步；WHEN 同步执行；THEN 持续变化以 `SyncKeptChanging` 收尾；并发触发返回 `SyncBusy`，不叠加执行） | UT-S48-18、UT-S48-19、ST-S48-09、ST-S48-10 | ✅ 已覆盖 |
| 异常：同文件冲突与首链选择（GIVEN 同一文件在双侧被修改，或首次同步链路需要用户选择来源（NeedsChoice）；WHEN 同步处理；THEN 同文件冲突 abort 回到 base 并逐文件选边；首链选 remote 前先保存本地 backup ref，本地内容可回退） | UT-S48-20、UT-S48-21、UT-S48-04、ST-S48-03、ST-S48-06、ST-S48-11、ST-S48-12 | ✅ 已覆盖 |
| 边界：unlink 备份与错误分类（GIVEN 用户 unlink 项目，或同步出错；WHEN 解除链接或错误返回；THEN unlink 导出本地备份；错误按 `AlreadyLinked`、`after_files_changed` 等分类明确返回，不混为一般失败） | UT-S48-02、UT-S48-22、UT-S48-23、ST-S48-07、ST-S48-13、ST-S48-14、ST-S48-15、ST-S48-16、ST-S48-19 `[manual]` | ✅ 已覆盖 |

### 3.3 EX 异常用例（时序文件 §四 失败与降级分支）

| EX | 覆盖用例 | 结论 |
|---|---|---|
| F1 auto 条件任一不满足 → 不执行推送 | UT-S48-13 ~ UT-S48-17、ST-S48-08 | ✅ 已覆盖 |
| F2 远端持续变化（三轮未收敛）→ `SyncKeptChanging` | UT-S48-18、ST-S48-09 | ✅ 已覆盖 |
| F3 并发触发 → `SyncBusy`，不叠加执行 | UT-S48-19、ST-S48-10 | ✅ 已覆盖 |
| F4 同一文件双侧被修改 → abort 回 base，逐文件选边 | UT-S48-20、ST-S48-04、ST-S48-06、ST-S48-11 | ✅ 已覆盖 |
| F5 首链 NeedsChoice 且选 remote → 先保存本地 backup ref | UT-S48-21、ST-S48-03、ST-S48-12 | ✅ 已覆盖 |
| F6 项目已 link 后再次 link → `AlreadyLinked` 等分类错误 | UT-S48-02、ST-S48-03、ST-S48-13、ST-S48-16 | ✅ 已覆盖 |
| F7 同步期间本地文件发生变化 → `after_files_changed` 等分类错误 | UT-S48-23、ST-S48-14 | ✅ 已覆盖 |
| F8 用户 unlink 项目 → 导出本地备份后解除链接 | UT-S48-22、ST-S48-07、ST-S48-19 `[manual]` | ✅ 已覆盖 |

### 3.4 API required 字段

| 命令 | 必填字段 | 覆盖用例 | 结论 |
|---|---|---|---|
| `overleaf_sync_link` | `projectId`（必填）、`remoteId`（必填）、`prefer`（可选，枚举 `local`/`remote`）、`server`（可选）、`expectedGeneration`（可选） | UT-S48-01、UT-S48-02、UT-S48-03 | ✅ 已覆盖 |
| `overleaf_sync_now` | `projectId`（必填）、`resolutions`（可选，逐文件选边映射）、`expectedGeneration`（可选）、`fetched`（可选） | UT-S48-04 | ✅ 已覆盖（`resolutions` 的逐文件语义） |
| `overleaf_sync_check` | `projectId`（必填） | — | ⚠️ 未单独设计 UT：`projectId` 的必填约束与 `overleaf_sync_status` / `overleaf_sync_unlink` 同族，已在 UT-S48-07、UT-S48-08 覆盖该约束族；差异仅在只读探测语义，不重复登记 |
| `overleaf_sync_status` | `projectId`（必填） | UT-S48-07 | ✅ 已覆盖 |
| `overleaf_sync_unlink` | `projectId`（必填） | UT-S48-08 | ✅ 已覆盖 |
| `overleaf_sync_set_auto` | `projectId`（必填）、`auto`（必填 bool） | UT-S48-05 | ✅ 已覆盖 |
| `overleaf_git_token_status` | `server`（可选，归一化） | — | ✅ 不适用：无必填参数 |
| `overleaf_git_token_set` | `token`（必填且非空）、`server`（可选，归一化） | UT-S48-06 | ✅ 已覆盖 |
| `overleaf_git_token_clear` | `server`（可选，归一化） | — | ✅ 不适用：无必填参数 |
| `cloud_*` 系列（Tauri IPC 云同步命令集） | 见 S43 文件 §3.4 与 S45 文件 §3.4 登记 | — | ➖ 属 S43 / S45 的 Dropbox / Drive / S3 云存储路径，**与本场景的 Git 桥不是同一条路**，本文件不重复登记 |

### 3.5 DB UNIQUE · CHECK 约束

| 约束清单 | 覆盖用例 | 结论 |
|---|---|---|
| S48 相关表的 UNIQUE / CHECK / NOT NULL / FOREIGN KEY | — | ➖ **不适用**：S48 无数据库表。在线同步的链路记录、镜像仓库与 backup ref 均为文件形态；基线 DB 规格（`deltas/database/core-01-local-stores.md` 本地五库、`deltas/database/collab-01-server-schema.md` Server 18 迁移）**不含 sync / online 模块表**，故本场景**无 DB 约束可提取**，不存在未覆盖项 |

### 3.6 覆盖度小结

- 正常验收条件 2 条、异常验收条件 3 条 + 边界条件 1 条、EX 分支 8 条：**全部覆盖**。
- API required 字段：9 个在线同步命令全部登记；8 条有独立 UT 覆盖，1 条为「同族约束已覆盖」的部分覆盖并写明原因；`cloud_*` 系列明确归入 S43 / S45（**不是同一条路**）。
- DB 约束：本场景无 DB 表，登记为不适用并写明原因，**无空勾**。
- **未决口**：真实在线服务下的双向同步、auto 计时精度与 unlink 备份的人工查看以 `[manual]` 用例登记，不预填结论。

---

## 四、验收条件追溯

| AC ID | 验收条件 | 覆盖用例 |
|---|---|---|
| S48-AC-01 | **正常：手动双向同步** — GIVEN 项目已 link 到在线服务；WHEN 用户手动触发同步；THEN 本地与远端双向同步完成，内容一致 | UT-S48-01、UT-S48-09、ST-S48-01、ST-S48-02、ST-S48-04、ST-S48-17 `[manual]` |
| S48-AC-02 | **正常：auto 同步按条件触发** — GIVEN 页面可见、无 dirty 编辑、无冲突、token 可用且已静默 15 秒；WHEN auto 同步判定；THEN 首次在 2 秒后触发，其后每 3 分钟一次 | UT-S48-05、UT-S48-09、UT-S48-10、UT-S48-11、UT-S48-12、ST-S48-05、ST-S48-18 `[manual]` |
| S48-AC-03 | **异常：条件不满足不推送** — GIVEN dirty 编辑、未解决冲突、无 token 或页面不可见任一条件不满足；WHEN auto 周期到达；THEN 不执行推送——auto 不是无条件定时推送 | UT-S48-05、UT-S48-13、UT-S48-14、UT-S48-15、UT-S48-16、UT-S48-17、ST-S48-08 |
| S48-AC-04 | **异常：远端持续变化与并发** — GIVEN 远端在同步期间持续变化（三轮未收敛），或前一同步尚未结束又触发新同步；WHEN 同步执行；THEN 持续变化以 `SyncKeptChanging` 收尾；并发触发返回 `SyncBusy`，不叠加执行 | UT-S48-18、UT-S48-19、ST-S48-09、ST-S48-10 |
| S48-AC-05 | **异常：同文件冲突与首链选择** — GIVEN 同一文件在双侧被修改，或首次同步链路需要用户选择来源（NeedsChoice）；WHEN 同步处理；THEN 同文件冲突 abort 回到 base 并逐文件选边；首链选 remote 前先保存本地 backup ref，本地内容可回退 | UT-S48-04、UT-S48-20、UT-S48-21、ST-S48-03、ST-S48-06、ST-S48-11、ST-S48-12 |
| S48-AC-06 | **边界：unlink 备份与错误分类** — GIVEN 用户 unlink 项目，或同步出错；WHEN 解除链接或错误返回；THEN unlink 导出本地备份；错误按 `AlreadyLinked`、`after_files_changed` 等分类明确返回，不混为一般失败 | UT-S48-02、UT-S48-22、UT-S48-23、ST-S48-07、ST-S48-13、ST-S48-14、ST-S48-15、ST-S48-16、ST-S48-19 `[manual]` |
