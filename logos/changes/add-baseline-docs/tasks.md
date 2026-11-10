# 实现任务

> 场景编号 S01-S52 已按全局序列分配（详见 `inventory.md`），全部产出后 `scenario_counter.next_id = 53`。
> P0 = 23 个场景；P1 = 24 个；P2 = 5 个。P0 场景逐场景产出时序文档与测试用例，P1/P2 在需求文档内给验收条件。

## [delta] 规格变更

### 批次 M1：需求层（Why）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/core-01-requirements.md` — 本地写作核心 15 场景（S01-S15）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/research-01-requirements.md` — 研究与文献 5 场景（S16-S20）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/ai-01-requirements.md` — AI 与 agent 8 场景（S21-S28）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/collab-01-requirements.md` — 实时协作 14 场景（S29-S42）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/sync-01-requirements.md` — 云同步与在线服务 7 场景（S43-S49）
- [x] 产出 delta 文件到 `deltas/prd/1-product-requirements/delivery-01-requirements.md` — 工程交付 3 场景（S50-S52）

### 批次 M2：设计层（What）
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md` — core 功能规格
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md` — research 功能规格
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md` — ai 功能规格
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md` — collab 功能规格
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md` — sync 功能规格
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md` — delivery 功能规格
- [x] 产出 delta 文件到 `deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md` — 全局 UI 表面清单

### 批次 M3：技术层（How）
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md` — 全局唯一架构总纲
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md` — 52 场景总览与编号注册
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S01-project-create-import.md` — S01 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S04-multifile-authoring.md` — S04 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S07-compile-engines.md` — S07 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S09-pdf-preview-synctex.md` — S09 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S10-preflight.md` — S10 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S11-export.md` — S11 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/core-S12-checkpoints.md` — S12 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/research-S16-citation-search.md` — S16 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/ai-S21-copilot-review.md` — S21 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/ai-S22-research-skills.md` — S22 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S29-server-onboarding.md` — S29 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S30-live-coediting.md` — S30 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S31-reconnect-resync.md` — S31 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S32-offline-merge-review.md` — S32 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S33-role-permissions.md` — S33 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S34-comments-suggestions.md` — S34 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S35-shared-history.md` — S35 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S40-browser-collab.md` — S40 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/collab-S41-browser-session.md` — S41 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/sync-S43-cloud-sync.md` — S43 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/sync-S44-conflict-copies.md` — S44 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/sync-S45-mass-delete-guard.md` — S45 时序
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/2-scenario-implementation/sync-S48-online-git-bridge.md` — S48 时序
- [x] 产出 delta 文件到 `deltas/api/core-01-backend-port.md` — BackendPort v7 / CompilePort / Tauri IPC 契约
- [x] 产出 delta 文件到 `deltas/api/collab-01-server-api.md` — Server HTTP/WS 路由契约
- [x] 产出 delta 文件到 `deltas/api/collab-02-collab-protocol.md` — 协作协议 v1 契约
- [x] 产出 delta 文件到 `deltas/api/ai-01-mcp-cli-api.md` — MCP 工具与 CLI JSON 契约
- [x] 产出 delta 文件到 `deltas/database/collab-01-server-schema.md` — Server SQLite schema 18
- [x] 产出 delta 文件到 `deltas/database/core-01-local-stores.md` — 本地 5 个 SQLite 存储
- [x] 产出 delta 文件到 `deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md` — 桌面/Server/CLI 三条发布线部署方案

### 批次 M4：测试层（验收基础）
- [x] 产出 delta 文件到 `deltas/test/core-S01-test-cases.md` — S01 测试用例
- [x] 产出 delta 文件到 `deltas/test/core-S04-test-cases.md` — S04 测试用例
- [x] 产出 delta 文件到 `deltas/test/core-S07-test-cases.md` — S07 测试用例
- [x] 产出 delta 文件到 `deltas/test/core-S09-test-cases.md` — S09 测试用例
- [x] 产出 delta 文件到 `deltas/test/core-S10-test-cases.md` — S10 测试用例
- [x] 产出 delta 文件到 `deltas/test/core-S11-test-cases.md` — S11 测试用例
- [x] 产出 delta 文件到 `deltas/test/core-S12-test-cases.md` — S12 测试用例
- [x] 产出 delta 文件到 `deltas/test/research-S16-test-cases.md` — S16 测试用例
- [x] 产出 delta 文件到 `deltas/test/ai-S21-test-cases.md` — S21 测试用例
- [x] 产出 delta 文件到 `deltas/test/ai-S22-test-cases.md` — S22 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S29-test-cases.md` — S29 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S30-test-cases.md` — S30 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S31-test-cases.md` — S31 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S32-test-cases.md` — S32 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S33-test-cases.md` — S33 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S34-test-cases.md` — S34 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S35-test-cases.md` — S35 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S40-test-cases.md` — S40 测试用例
- [x] 产出 delta 文件到 `deltas/test/collab-S41-test-cases.md` — S41 测试用例
- [x] 产出 delta 文件到 `deltas/test/sync-S43-test-cases.md` — S43 测试用例
- [x] 产出 delta 文件到 `deltas/test/sync-S44-test-cases.md` — S44 测试用例
- [x] 产出 delta 文件到 `deltas/test/sync-S45-test-cases.md` — S45 测试用例
- [x] 产出 delta 文件到 `deltas/test/sync-S48-test-cases.md` — S48 测试用例
- [x] 产出 delta 文件到 `deltas/test/delivery-01-smoke-test-cases.md` — 发布/更新/Server 运维 smoke 用例

## [code] 项目配置同步

- [x] 更新 `logos/logos-project.yaml`：注册 research/ai/collab/sync/delivery 五个模块（core 保留），全模块 lifecycle launched / bootstrap adopted
- [x] 更新 `logos/logos-project.yaml`：core 模块 `skip_phases` 由 `[api, database, scenario]` 改为 `[scenario]`（本基线已含 API/DB 规格）
- [x] 更新 `logos/logos-project.yaml`：`scenario_counter.next_id` 置为 53
