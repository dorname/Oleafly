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
