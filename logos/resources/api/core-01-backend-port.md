## 桌面端 BackendPort v7 / CompilePort / Tauri IPC 契约（现状快照）

> module: core（契约同时被 ai / collab / sync / research 模块复用） | 契约版本: BackendPort `PROTOCOL_VERSION = 7`
> 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）；Server crate `0.1.1`，CLI crate `0.1.0`
> 事实来源：提案 `logos/changes/add-baseline-docs/inventory.md`「API 资产」段与「架构与测试要点」段（编译主链路、信任边界），并以实现定位符佐证（`packages/backend-port/src/index.ts`、`packages/compile-port/src/port.ts`、`src-tauri/src/lib.rs`）。
> **本文档是现状契约快照，非新增 API 设计**：不新增端点、不新增字段、不改签名。所有条目均以当前工作树实现为准；本次为只读静态盘点，**未执行任何测试**，动态行为在 verify 阶段单独取证。

## 一、性质声明（先读这一节）

> **本节描述的 BackendPort 与 Tauri IPC 是「应用内部 typed IPC」，不是稳定公共 HTTP API。**

- BackendPort 是**桌面应用 renderer（TypeScript/React）与 Rust 后端之间的进程内类型化契约**，实现载体是 Tauri `invoke` 命令通道，不是网络接口，没有 URL、方法、状态码、认证头这些 HTTP 语义。
- 它**不对外承诺稳定性**：命令名、参数形状、返回结构随桌面版本演进；外部集成方不应直接把它当成可依赖的公共 API 消费。
- 对外可依赖的公共面只有三处，且各自另有契约：**协作 Server 的 HTTP/WS 接口**（见 `collab-01-server-api.md`）、**协作 wire 协议**（见 `collab-02-collab-protocol.md`）、**MCP localhost 端点与 CLI JSON 输出**（见 `ai-01-mcp-cli-api.md`）。
- 因此本文档标题使用「契约」而非「公共 API」；任何「Oleafly 提供了 X API」的表述，若指的是本节的 BackendPort / Tauri IPC，均属**越界宣传**。

## 二、BackendPort v7（桌面内部 typed IPC 契约）

### 2.1 版本与能力声明

| 项 | 值 | 证据 |
|---|---|---|
| 契约版本常量 | `PROTOCOL_VERSION = 7` | `packages/backend-port/src/index.ts:1` |
| 能力清单来源 | `BACKEND_CAPABILITIES`（12 项，编译期常量数组，顺序固定且去重） | `packages/backend-port/src/index.ts:2-16` |
| 能力声明 IPC | `backend_protocol_info()` → `{ protocol_version: number; capabilities: string[] }` | `packages/backend-port/src/index.ts:17-20`；`src-tauri/src/protocol.rs:26-31` |
| 一致性约束 | 能力清单必须已排序且唯一；`capabilities` 必须包含 `collab` | `src-tauri/src/protocol.rs:38-55` |

### 2.2 12 个 capabilities 清单

| # | capability | 覆盖能力域 |
|---|---|---|
| 1 | `agent-server` | 内置 agent 服务端线程/请求解析（thread read/fork/archive/delete/claim-prewarmed） |
| 2 | `agent-stream` | agent 运行期流式事件与 turn 控制（stream/run/cancel/steer/tool_result） |
| 3 | `chats` | 项目内聊天记录检索与读写（chats_load / chat_read / chat_save / chats_search） |
| 4 | `checkpoints` | 检查点列举、标注、恢复、导出/导入、校验 |
| 5 | `collab` | 协作 Server 接入、分享、评论、建议、历史、同步 |
| 6 | `compile` | 编译、取消编译、隔离编译、构建产物读取 |
| 7 | `git` | 本地 Git 状态、暂存、提交、分支、远端、冲突解决 |
| 8 | `initial-state` | 启动初始状态、待打开请求（pending open requests） |
| 9 | `mcp` | MCP 服务端/客户端接入与工具路由 |
| 10 | `search` | 项目库检索 |
| 11 | `synctex` | 正反向 SyncTeX 定位与行映射 |
| 12 | `templates` | 模板目录、深链接模板就绪 |

### 2.3 端口形态

- BackendPort 是一个**聚合接口**，由大量「特性局部端口」组合而成（如 `CollabKey = Extract<keyof BackendPort, `collab${string}` | `onCollab${string}`>` 这一类按前缀划分的子集，证据 `src/lib/backend-port-conformance.ts:5`）。
- 桌面实现把端口**按域拆分到两个适配器**：`desktopBackendPort`（非协作键）与 `desktopCollabPort`（`collab*` / `onCollab*` 键），证据 `src/lib/backend-port-conformance.ts:7-9`。
- 端口方法一律是**返回 Promise 的函数**，参数与返回值全部为显式类型；跨进程只传可序列化的 JSON 值（字节流以 base64 / `Uint8Array` 形式承载，PDF **不走 base64 JSON**，见 inventory「编译主链路」段）。

### 2.4 编译相关端口方法（BackendPort 侧摘录）

| 方法 | 用途 | 备注 |
|---|---|---|
| `compileProject(projectId, mainDoc, offline?, fast?, haltOnError?, typstVariant?)` | 主编译 | 返回 `CompileResult` |
| `cancelCompile()` | 取消编译 | 返回 `boolean` |
| `clearBuildDir(projectId)` | 清理构建目录 | — |
| `compileIsolated(projectId, source, offline?)` | 隔离编译 | 用于不可信/临时源码 |
| `readCompiledPdf(projectId)` / `readIsolatedPdf(projectId)` | 读取 PDF | `ArrayBuffer`，非 base64 JSON |
| `readBuildArtifact(projectId, name)` | 读取构建产物 | 可为 `null` |
| `validateCompileFingerprint(projectId, mainDoc)` | 校验编译指纹 | 防止旧 revision 结果被误用 |
| `getProjectEngine(projectId)` | 取引擎描述符 | `DocumentEngineDescriptor` |

证据：`packages/backend-port/src/index.ts:1419-1470`。

## 三、CompilePort（编译能力抽象）

### 3.1 接口形状

```ts
export interface CompilePort {
  supports(target: CompileTarget): boolean;
  compile(target: CompileTarget): Promise<CompileOutput>;
  stop(): void;
  syncTex(output: CompileOutput): Promise<SyncTexIndex | null>;
}
```

证据：`packages/compile-port/src/port.ts:33-38`。

### 3.2 方法语义

| 方法 | 语义 | 失败/边界 |
|---|---|---|
| `supports(target)` | 判断本端口能否处理给定编译目标 | 纯查询，无副作用 |
| `compile(target)` | 执行一次编译，返回结构化输出 | 被中断时抛 `CompileStopped`（`packages/compile-port/src/port.ts:40-45`） |
| `stop()` | 停止当前编译 | 无返回值 |
| `syncTex(output)` | 基于本次编译输出构建 SyncTeX 索引 | 无法建立时返回 `null` |

### 3.3 输入与输出类型

| 类型 | 字段 | 说明 |
|---|---|---|
| `CompileTarget` | `mainDocument`、`engine`（`DocumentEngineId`）、`texFlavor`（可空） | 一次编译的目标三元组 |
| `CompileOutput` | `target`、`ok`（boolean）、`pdf`（`Uint8Array \| null`）、`synctex`（`Uint8Array \| null`）、`log`（string）、`diagnostics`（`LogDiagnostic[]`）、`timeMs`（number） | **PDF / SyncTeX / log / diagnostics / 耗时** 全部内联在同一结构中 |
| `SyncTexIndex` | `forward(file, line)`、`inverse(page, x, y)`、`dispose()` | 正反向定位；`dispose()` 释放索引资源 |

证据：`packages/compile-port/src/port.ts:11-31`。

### 3.4 与浏览器编译端口的关系

`packages/compile-port/src/index.ts` 同时导出 `createBrowserCompilePort`（`packages/compile-port/src/browser.ts`）与测试替身（`testing.ts`），因此 CompilePort 是**桌面 / 浏览器 / 测试**共用的抽象，不绑定单一宿主。

## 四、Tauri IPC 注册表（分类清单）

> 注册表位置：`src-tauri/src/lib.rs` L523-1251 的 `tauri::generate_handler![...]`（inventory「API 资产」段已定位）。
> 下列为**分类后的代表性命令**，用于说明桌面内部 IPC 的能力面；完整清单以注册表原文为准。分类是文档可读性需要，不是新的官方分组。

### 4.1 研究 / ACP / agent

- 研究任务：`research_tasks_set_enabled`、`research_task_list/create/edit/start/cancel/retry/events/plan/approve_plan/run_cancel/run_log/attention/approvals/approval_decide/evidence_refresh/progress/watch/apply/accept_result/delete`、`research_task_file_preview`、`research_task_artifact_preview`、`research_task_set_keep_running`、`research_task_run_log`
- ACP（外部 CLI agent）：`acp_catalog`、`acp_registry_search`、`acp_register`、`acp_remove_agent`、`acp_install`、`acp_start`、`acp_cancel_start`、`acp_reconnect`、`acp_prompt`、`acp_cancel`、`acp_disconnect`、`acp_authenticate`、`acp_set_model`、`acp_permission`、`acp_delegated_permission`、`acp_sessions`、`acp_snapshot`、`acp_events`、`acp_check_agent`、`acp_session_export`、`acp_session_events_all`、`acp_session_import`、`acp_fork`、`acp_commit_turn`、`acp_steer`、`acp_buffer_reply`、`acp_set_mode`、`acp_set_config_option`、`acp_provider_choices`、`acp_sign_in_command`、`acp_logout`、`acp_elicitation_respond`、`acp_session_rename`、`acp_session_delete`、`acp_agent_sessions`、`acp_preferences` 系列、`acp_hermes_*`
- 内置 agent：`agent_complete`、`agent_cancel`、`agent_cancel_all`、`agent_steer`、`agent_stream`、`agent_run`、`agent_tool_result`、`agent_list_models`、`agent_probe_model`、`agent_web_search_ready`、`agent_subagents_stop`
- agent turn：`agent_turn_begin/finish/status/preview/revert/redo`
- agent server：`agent_server_initialize/resolve_request/abandon_request`、`agent_thread_read/fork/archive/delete/rollback/claim_prewarmed`
- agent 执行与模型：`agent_exec_cwd/authorize/register_external/exec`、`agent_model_metadata_status`、`agent_refresh_model_metadata`、`agent_multi_agent_config`、`agent_provider_credit`、`agent_web_support`

### 4.2 信任 / 技能 / 终端 / 云同步

- 信任：`project_trust_state`、`trust_folder`、`revoke_folder_trust`、`debug_answer_next_confirmation`
- 技能：`skills_list/add/create/update/validate/set_enabled/set_project_enabled/remove/read_file/update_builtin/replace_with_builtin`、`skills_catalog`、`skills_install`、`skills_uninstall`、`skills_share_targets`、`skills_share_sync`
- 终端：`term_open`、`term_write`、`term_resize`、`term_kill`、`term_ack`、`term_foreground`、`term_shells`、`terminal::external::external_terminals`、`open_external_terminal`
- 云同步：`cloud_state/details/providers`、`cloud_connect_begin/credentials/wait/paste/cancel`、`cloud_disconnect`、`cloud_set_enabled`、`cloud_set_device_name`、`cloud_sync_now`、`cloud_project_set_mode/resolve_hold/remove/replace_remote/dismiss_conflicts`、`cloud_remove_remote`、`cloud_download_project`、`cloud_settings_sync/download/applied/defer`、`cloud_wait_for_changes`、`cloud_settings_keep_local`
- 研究工作区与算力：`get_research_workspace`、`add/update/remove_research_root`、`list/read/write_research_root_file`、`research_root_capabilities`、`research_root_health`、`preview_research_project`、`create_research_project`、`research_compute_*`、`research_sandbox_*`

### 4.3 协作

- Server 接入：`collab_servers_list`、`collab_server_probe/sign_in/sign_in_cancel/code_sign_in/sign_out/remove/devices/sign_out_device/test/refresh`
- Admin：`collab_admin_members/member_devices/patch_member/remove_member/sign_out_device/allowlist/add_allowlist/remove_allowlist/domain_rules/add_domain_rule/remove_domain_rule/settings/patch_settings/security_log/email_status/email_test/email_preferences`
- 控制台：`collab_admin_overview`、`collab_admin_projects`、`collab_admin_archive_project`、`collab_admin_unarchive_project`
- Guest：`collab_guest_invitations/invite/invitation_revoke`、`collab_admin_guest_invitations/approve/decline/revoke`
- 分享与成员：`collab_share_info/check/project`、`collab_project_summary`、`collab_members_list`、`collab_member_set/remove`、`collab_people_search`、`collab_link_sharing_set`、`collab_stop_sharing`、`collab_shared_with_me`、`collab_join_project`、`collab_join_cancel`、`collab_open_link`、`collab_link_preview`、`collab_pending_links`
- 实时通道：`collab::live::commands`（WS 通道相关，函数名在注册表中以模块前缀重复出现）、`collab::live::write`、`collab::live::uploads`、`collab::live::local_copy`
- 合并审查与文件树：`collab_merge_review`、`collab_trash_list/restore`、`collab_tree_clashes`、`collab_live_removed_list/dismiss`
- 评论 / 建议 / 聊天：`collab_comments_status/set_enabled`、`collab_comment_thread_list/counts/file_path/create/reply/edit/delete/resolve/reopen/thread_delete`、`collab_edit_mode_get/set`、`collab_suggestion_list/counts/accept/reject/withdraw/accept_file/reject_file/reply`、`collab_chat_list/send/delete/clear`
- 历史与输出：`collab_history_list/file/changed_files/restore`、`collab_version_name/unname`、`collab_output_info`、`collab_access_log_status/set_enabled/page`

### 4.4 SyncTeX

- `synctex_forward`、`synctex_inverse`、`synctex_map_line`（LaTeX 引擎）
- `typst_sync_forward`、`typst_sync_inverse`、`typst_sync_stop`（Typst 引擎）

### 4.5 项目源读取

- `list_files`、`list_file_tree`、`existing_project_files`、`read_file`、`read_project_sources`、`project_file_sizes`、`project_mutation_generation`、`folder_status::project_folder_status`

### 4.6 document stats

- `document_stats`

### 4.7 RAG

- `rag_retrieve`

### 4.8 文件与 path grant

- 项目文件写入：`write_file`、`create_file`、`delete_file`、`rename_file`、`copy_file`、`save_file_base`、`read_file_base`、`read_picked_file_base`、`import_paths_into_project`
- 原生拖放：`take_dropped_paths`、`read_dropped_file`
- 路径授权：`pick_open_paths`、`pick_save_path`、`grant_test_open_paths`、`grant_test_save_path`
- 导入选择：`pick_table_import_file`、`settings_file::pick_settings_file`、`project::register_picked_file_for_e`

### 4.9 引擎与下载

- 引擎信息：`project_engine`、`latex_engine_info`、`latex_engine::tinytex_install_state`、`latex_engine::has_tagging_engine`、`tex_distributions`、`set_tex_distribution`、`set_custom_tex_folder`
- 下载与安装：`download_pandoc`、`has_pandoc`、`download_update`、`install_update`、`confirm_update_install`、`settle_update_work`、`latex_engine::install_tinytex/cancel_tinytex_install/delete_tinytex`、`latex_engine::packages::tlmgr_search/tlmgr_install_missing`、`latex_engine::tlmgr_installed`
- 下载设置：`get_download_settings`、`set_download_settings`
- 转换与渲染：`convert_ad_hoc`、`render_typst_snippet`、`typst_document_insights`、`typst_slide_notes`

### 4.10 模板 / Git / config / MCP

- 模板：`deep_link::template_link_ready`、模板目录由 `templates` capability 覆盖
- Git：`git_status/diff/discard/discard_paths/stage/stage_paths/unstage/unstage_paths/stage_all/unstage_all/commit/commit_amend/create_branch/checkout_branch/restore/set_remote/remove_remote/get_remote/remote_credentials_need_cleanup/clean_remote_credentials/current_branch/ahead_behind/workspace_snapshot/fetch/push/pull/show/stash_push/stash_pop/resolve_conflict/continue_merge/abort_merge`、`git_clone_project`
- config：`config::set_ai_tools_model`、`system_integration_status/set`、`claim_quick_action_offer`、`shell_command_status/install/uninstall`、`get_ui_locale`、`set_ui_locale`、`app_icon_set`、`menu::set_dock_shortcut_accelerators`、`set_native_shortcuts_paused`、`set_recent_projects`
- MCP：`mcp::server::*`（localhost MCP 服务端启停与工具路由）、`mcp::client::*`（外部 MCP 客户端接入与逐次确认）
- 审批：`approvals_list/set/read_raw/write_raw`、`approvals_mode_get/set`
- 校对与语言服务：`language_service_start/send/stop/status/install/install_status`

### 4.11 聊天 / 附件 / forge / Mathpix / CUA / 后台任务

- 聊天：`chats_load`、`chat_read`、`chat_save`、`chat_delete`、`chats_search`、`usage_summary`、`budget_get_cmd`、`budget_set_cmd`
- 附件：`attachment_put`、`attachment_put_text`、`attachment_read`、`attachment_meta`、`attachment_gc`
- forge（代码托管账号）：`gh_public_repo_stats`、`forge_accounts_list`、`forge_detect`、`forge_sign_in_token`、`forge_device_start/poll/cancel`、`forge_sign_out`、`forge_set_ca_file`、`forge_validate`、`forge_list_repos`、`forge_create_repo`、`forge_import_repo`
- Mathpix（托管 OCR）：`mathpix_key_status`、`mathpix_save_keys`、`mathpix_clear_keys`、`mathpix_text`、`mathpix_text_cancel`、`mathpix_pdf_upload`、`mathpix_pdf_wait`、`mathpix_pdf_cancel`
- CUA（Computer Use 白名单）：`cua_driver_status`、`cua_driver_settings_set`、`cua_driver_installed_apps`、`cua_driver_app_icons`、`cua_driver_pick_app`、`cua_driver_test`、`cua_driver_tool_spec`
- 后台任务与守护：`background_helper_status/stop/set_login_item/reveal_log`、`background_tasks_set_enabled`

### 4.12 其他归类说明

- 检查点族归入 `checkpoints` capability（`checkpoint_list/set_label/stats/restore/delete/keep_latest/reset/verify/reveal_store/files/save_file/inspect`、`checkpoint_export/import`）。
- 存储与回收站：`library_root`、`display_homes`、`library_storage_summary`、`list_recycled_projects`、`restore_recycled_project`、`permanently_delete_recycled_project`。
- 日志与诊断：`chunked_ack`、`read_app_log_chunked`、`export_log_archive`、`append_app_log`、`read_app_log`。
- 文献与引用：`verify_citation`、`literature_search_all`。

## 五、边界与不可推断事项

- **不得**把本文档中的任何命令名理解为公共 HTTP 端点；桌面端不存在「把这些命令暴露成 REST API」的既有能力。
- **不得**由 `PROTOCOL_VERSION = 7` 推断任何网络协议版本；它只约束 renderer ↔ Rust 的内部契约。
- **不得**由「存在 Tauri IPC」推断 IPC 已被第三方依赖或承诺兼容；inventory 已记录多处文档与实现偏差（D1-D12），本契约同样以实现为准。
- Tauri IPC 调用位于可信渲染进程；inventory「信任边界」段已明确：次级窗口默认拒绝、路径解析需校验、connector key 不回读 WebView、MCP 绑定 127.0.0.1 + bearer、下载 pin + SHA-256 + 原子安装、Server 项目内容非端到端加密、仅采信可信代理的 `X-Forwarded-For`。
- 本次盘点**未运行测试**，任何「该命令返回某结构」的表述均为静态阅读实现得出，动态证据留待 verify 阶段。

## 六、交叉引用

| 契约 | 文档 | 关系 |
|---|---|---|
| 协作 Server HTTP + WS | `deltas/api/collab-01-server-api.md` | 跨进程网络面，与本文档的进程内 IPC 相互独立 |
| 协作 wire 协议 v1 | `deltas/api/collab-02-collab-protocol.md` | 版本号与 BackendPort v7 **无继承、无协商关系** |
| MCP localhost + CLI | `deltas/api/ai-01-mcp-cli-api.md` | MCP 工具族最终落到本文档描述的内部能力上；CLI 为独立进程 |
