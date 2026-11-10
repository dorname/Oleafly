# 合并指令

## 变更提案
- 提案名称：add-baseline-docs
- 提案目录：logos/changes/add-baseline-docs/

## 提案内容

# 变更提案：add-baseline-docs（完整产品现状基线）

## 变更原因

本项目通过 adopted 模式接入 OpenLogos，`logos/resources/` 下的需求、设计、架构、API、DB、测试规格全部为空，导致：

1. `openlogos verify` 因缺少测试用例规格（`logos/resources/test/`）而无法通过，前案 `add-malp-protocol` 只能例外归档；
2. 后续任何变更都缺乏可追溯的 Why → What → How 基线，AI 无法感知产品现状与约束；
3. 文档与实现存在至少 12 处语义偏差（见 `inventory.md` 偏差清单），没有基线就无法管控漂移。

本次变更为存量产品（桌面 0.4.11，绑定提交 `9c307bf3c`）建立**完整产品现状基线**：只整理已实现能力，不引入新需求。

## 变更类型

需求级变更（基线建立：全链路规格文档初始化，无代码实现）

## 变更范围

依据 `inventory.md`（四条只读盘点证据链合并，52 个全局场景，6 个模块）：

- 影响的需求文档：`prd/1-product-requirements/` 新增 6 份模块需求文档（core/research/ai/collab/sync/delivery 各 1 份）
- 影响的功能规格：`prd/2-product-design/1-feature-specs/` 新增 6 份模块功能规格；`2-page-design/` 新增 1 份全局 UI 表面清单
- 影响的业务场景：S01-S52 全局编号（`scenario_counter.next_id` 用后置为 53）；P0 场景 23 个逐场景产出时序文档
- 影响的架构文档：`prd/3-technical-plan/1-architecture/core-01-architecture-overview.md`（全局唯一）+ `2-scenario-implementation/` 场景总览 + 23 份 P0 场景实现
- 影响的部署方案：`prd/3-technical-plan/3-deployment/delivery-01-deployment.md`
- 影响的 API：`api/` 新增 BackendPort v7 / Server HTTP+WS / 协作协议 v1 / MCP+CLI 契约 4 份
- 影响的 DB 表：`database/` 新增 Server schema 18 migration 链、本地 5 个 SQLite 存储共 2 份
- 影响的编排测试：不适用（桌面产品，module core 维持 skip scenario 阶段）
- 影响的测试规格：`test/` 新增 23 份 P0 场景测试用例 + 1 份发布/运维 smoke 用例
- 项目配置：`logos/logos-project.yaml` 注册 6 个模块、更新 `scenario_counter.next_id`、移除 core 模块 `skip_phases` 中的 api/database（保留 scenario skip）

## 部署影响

- 是否需要部署：否
- 部署原因：纯规格文档初始化，不修改业务代码、配置或服务
- 影响环境：无
- 是否涉及数据迁移：否
- 是否需要回滚预案：否
- 是否需要 smoke：否

## 变更概述

以四条只读盘点证据链（本地工作流 / 协作同步 / AI 集成 / 架构测试发布）为输入，将 Oleafly 当前实现反向整理为 OpenLogos 全链路基线：

1. **Why**：6 份模块需求文档，52 个场景（P0×23、P1×24、P2×5），P0/P1 场景含 GIVEN/WHEN/THEN 验收条件，异常与边界行为以实现测试为证据；
2. **What**：6 份功能规格 + 全局 UI 表面清单，对齐现有交互而非虚构原型；
3. **How**：全局唯一架构总纲（monorepo/组件/进程/数据流/信任边界）、P0 场景时序文档、API 契约（BackendPort/Server/协议/MCP）、DB schema（Server 18 migration + 本地 5 库）、部署方案（桌面/Server/CLI 三条发布线）；
4. **验收基础**：23 份 P0 测试用例规格 + 发布/运维 smoke 用例，使 `openlogos verify` 具备规格对照基础。

所有内容**只描述现状**：盘点确认为"实现支持"的行为按实现记录；文档与实现不一致处（D1-D12）按实现为准并标注；仅存在于测试定义、未经动态验证的行为一律声明"未执行验证"；无法确认的项（如浏览器生产编译、在线服务 ZIP 导入取消）明确记为边界而非能力。

分四个批次产出（M1 需求层 → M2 设计层 → M3 技术层 → M4 测试层），每批完成后汇报并继续下一批。


## 需要合并的 Delta 文件

### 1. deltas/api/ai-01-mcp-cli-api.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/api/ai-01-mcp-cli-api.md`
- 目标目录：`logos/resources/api/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 2. deltas/api/collab-01-server-api.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/api/collab-01-server-api.md`
- 目标目录：`logos/resources/api/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 3. deltas/api/collab-02-collab-protocol.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/api/collab-02-collab-protocol.md`
- 目标目录：`logos/resources/api/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 4. deltas/api/core-01-backend-port.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/api/core-01-backend-port.md`
- 目标目录：`logos/resources/api/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 5. deltas/database/collab-01-server-schema.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/database/collab-01-server-schema.md`
- 目标目录：`logos/resources/database/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 6. deltas/database/core-01-local-stores.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/database/core-01-local-stores.md`
- 目标目录：`logos/resources/database/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 7. deltas/prd/1-product-requirements/ai-01-requirements.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/ai-01-requirements.md`
- 目标目录：`logos/resources/prd/1-product-requirements/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 8. deltas/prd/1-product-requirements/collab-01-requirements.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/collab-01-requirements.md`
- 目标目录：`logos/resources/prd/1-product-requirements/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 9. deltas/prd/1-product-requirements/core-01-requirements.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/core-01-requirements.md`
- 目标目录：`logos/resources/prd/1-product-requirements/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 10. deltas/prd/1-product-requirements/delivery-01-requirements.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/delivery-01-requirements.md`
- 目标目录：`logos/resources/prd/1-product-requirements/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 11. deltas/prd/1-product-requirements/research-01-requirements.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/research-01-requirements.md`
- 目标目录：`logos/resources/prd/1-product-requirements/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 12. deltas/prd/1-product-requirements/sync-01-requirements.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/1-product-requirements/sync-01-requirements.md`
- 目标目录：`logos/resources/prd/1-product-requirements/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 13. deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/ai-01-feature-specs.md`
- 目标目录：`logos/resources/prd/2-product-design/1-feature-specs/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 14. deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/collab-01-feature-specs.md`
- 目标目录：`logos/resources/prd/2-product-design/1-feature-specs/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 15. deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/core-01-feature-specs.md`
- 目标目录：`logos/resources/prd/2-product-design/1-feature-specs/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 16. deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md`
- 目标目录：`logos/resources/prd/2-product-design/1-feature-specs/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 17. deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/research-01-feature-specs.md`
- 目标目录：`logos/resources/prd/2-product-design/1-feature-specs/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 18. deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/1-feature-specs/sync-01-feature-specs.md`
- 目标目录：`logos/resources/prd/2-product-design/1-feature-specs/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 19. deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/2-product-design/2-page-design/core-00-ui-surface-map.md`
- 目标目录：`logos/resources/prd/2-product-design/2-page-design/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 20. deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/1-architecture/core-01-architecture-overview.md`
- 目标目录：`logos/resources/prd/3-technical-plan/1-architecture/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 21. deltas/prd/3-technical-plan/2-scenario-implementation/ai-S21-copilot-review.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/ai-S21-copilot-review.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 22. deltas/prd/3-technical-plan/2-scenario-implementation/ai-S22-research-skills.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/ai-S22-research-skills.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 23. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S29-server-onboarding.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S29-server-onboarding.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 24. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S30-live-coediting.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S30-live-coediting.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 25. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S31-reconnect-resync.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S31-reconnect-resync.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 26. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S32-offline-merge-review.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S32-offline-merge-review.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 27. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S33-role-permissions.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S33-role-permissions.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 28. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S34-comments-suggestions.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S34-comments-suggestions.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 29. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S35-shared-history.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S35-shared-history.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 30. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S40-browser-collab.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S40-browser-collab.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 31. deltas/prd/3-technical-plan/2-scenario-implementation/collab-S41-browser-session.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/collab-S41-browser-session.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 32. deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-00-scenario-overview.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 33. deltas/prd/3-technical-plan/2-scenario-implementation/core-S01-project-create-import.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S01-project-create-import.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 34. deltas/prd/3-technical-plan/2-scenario-implementation/core-S04-multifile-authoring.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S04-multifile-authoring.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 35. deltas/prd/3-technical-plan/2-scenario-implementation/core-S07-compile-engines.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S07-compile-engines.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 36. deltas/prd/3-technical-plan/2-scenario-implementation/core-S09-pdf-preview-synctex.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S09-pdf-preview-synctex.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 37. deltas/prd/3-technical-plan/2-scenario-implementation/core-S10-preflight.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S10-preflight.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 38. deltas/prd/3-technical-plan/2-scenario-implementation/core-S11-export.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S11-export.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 39. deltas/prd/3-technical-plan/2-scenario-implementation/core-S12-checkpoints.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/core-S12-checkpoints.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 40. deltas/prd/3-technical-plan/2-scenario-implementation/research-S16-citation-search.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/research-S16-citation-search.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 41. deltas/prd/3-technical-plan/2-scenario-implementation/sync-S43-cloud-sync.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/sync-S43-cloud-sync.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 42. deltas/prd/3-technical-plan/2-scenario-implementation/sync-S44-conflict-copies.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/sync-S44-conflict-copies.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 43. deltas/prd/3-technical-plan/2-scenario-implementation/sync-S45-mass-delete-guard.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/sync-S45-mass-delete-guard.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 44. deltas/prd/3-technical-plan/2-scenario-implementation/sync-S48-online-git-bridge.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/2-scenario-implementation/sync-S48-online-git-bridge.md`
- 目标目录：`logos/resources/prd/3-technical-plan/2-scenario-implementation/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 45. deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md`
- 目标目录：`logos/resources/prd/3-technical-plan/3-deployment/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 46. deltas/test/ai-S21-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/ai-S21-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 47. deltas/test/ai-S22-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/ai-S22-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 48. deltas/test/collab-S29-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S29-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 49. deltas/test/collab-S30-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S30-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 50. deltas/test/collab-S31-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S31-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 51. deltas/test/collab-S32-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S32-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 52. deltas/test/collab-S33-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S33-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 53. deltas/test/collab-S34-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S34-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 54. deltas/test/collab-S35-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S35-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 55. deltas/test/collab-S40-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S40-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 56. deltas/test/collab-S41-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/collab-S41-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 57. deltas/test/core-S01-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S01-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 58. deltas/test/core-S04-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S04-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 59. deltas/test/core-S07-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S07-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 60. deltas/test/core-S09-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S09-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 61. deltas/test/core-S10-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S10-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 62. deltas/test/core-S11-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S11-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 63. deltas/test/core-S12-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/core-S12-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 64. deltas/test/delivery-01-smoke-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/delivery-01-smoke-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 65. deltas/test/research-S16-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/research-S16-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 66. deltas/test/sync-S43-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/sync-S43-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 67. deltas/test/sync-S44-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/sync-S44-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 68. deltas/test/sync-S45-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/sync-S45-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

### 69. deltas/test/sync-S48-test-cases.md

- Delta 文件：`logos/changes/add-baseline-docs/deltas/test/sync-S48-test-cases.md`
- 目标目录：`logos/resources/test/`
- 操作：读取 delta 中的 ADDED / MODIFIED / REMOVED 标记，合并到目标目录中对应的主文档

## 执行要求

1. 逐个 Delta 文件处理，每处理完一个报告修改摘要
2. 对于 ADDED 标记：在主文档的指定位置插入新内容
3. 对于 MODIFIED 标记：替换主文档中同名章节的内容
4. 对于 REMOVED 标记：从主文档中删除对应章节
5. 保持主文档的原有格式和风格
6. 如果主文档有"最后更新"时间戳，同步更新
7. 所有变更完成后，列出修改清单
8. 所有变更合并完成后，自动执行 git commit（告知用户，无需确认）：
   git add -A && git commit -m "docs(add-baseline-docs): merge spec deltas"
   然后提示用户：按更新后的规格实现代码，代码完成后运行 `openlogos verify` 验收，验收通过后明确授权执行 `openlogos archive add-baseline-docs`。
