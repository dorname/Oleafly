# 验收例外记录

- 提案：`add-baseline-docs`
- 记录日期：2026-11-10
- 例外类型：在 `openlogos verify` 失败的情况下，由 operator 明确授权归档
- 基线口径：桌面 `0.4.11`，绑定提交 `9c307bf3c`

## verify 实际结果

2026-11-10 执行 `openlogos verify` 两轮。

**第一轮**（覆盖度校验体裁未统一时）：

```text
📋 设计时覆盖度（Layer 1）
  覆盖度校验：95/117 项确认
  ⚠️  未确认项（22）：部署后检查项（smoke）×16、DB UNIQUE/CHECK 约束 ×6

🔗 验收条件追溯（Layer 3）
  验收追溯：82/82 个验收条件通过

❌ Gate 3.6：FAIL（覆盖不完整）
```

**第二轮**（统一体裁后重跑）：

```text
📋 设计时覆盖度（Layer 1）
  覆盖度校验：117/117 项确认

🔗 验收条件追溯（Layer 3）
  验收追溯：82/82 个验收条件通过

❌ Gate 3.6：FAIL（覆盖不完整）
```

验收报告摘要（`logos/resources/verify/acceptance-report.md`）：

| 指标 | 值 |
|---|---|
| Defined cases | 862 |
| Manual cases (excluded) | 37 |
| Executed cases | 0 |
| Uncovered | 862 |
| Coverage | 0% |
| **Gate 3.5** | **FAIL** |
| **Gate 3.6** | **FAIL**（判定原因 `incomplete_coverage`） |

## 失败根因（经 CLI 判定源码核实）

`openlogos` 的 Gate 3.6 判定顺序为：`failed_cases` → `incomplete_coverage`（`uncovered.length > 0`）→ `checklist_incomplete` → `ac_trace_incomplete`。本次失败命中的是第二项：

- **Layer 1（设计时覆盖）已 117/117 全绿**，不再触发 `checklist_incomplete`；
- **Layer 3（验收追溯）82/82 通过**，不触发 `ac_trace_incomplete`；
- 唯一卡点是 **862 个用例在运行时全部 uncovered**：`logos/resources/verify/test-results.jsonl` 为空，仓库中**不存在 OpenLogos reporter**，且既有测试代码未按新用例 ID（`UT-S01-01` / `ST-S01-01` 等）组织，因此没有任何运行结果能映射回用例 ID。

这属于 **Phase 3-5 代码实现阶段尚未开始**，不是规格缺失：862 个用例在规格侧已有完整定义、覆盖度核对与 AC 追溯。

## 附带发现：预跑命令在 sandbox 中 exit=1

预跑命令 `pnpm test`（本次已由 `npm test` 修正而来）在 verify 的 sandbox 中退出码为 1，而直接在仓库根执行退出码为 0：

```text
直接执行：Test Files 1653 passed | 2 skipped (1655)
          Tests    24288 passed | 11 skipped (24299)
verify sandbox：[fail] pre_run：pnpm test（exit=1，duration=952370ms）
                ⚠️ 检测到非白名单写入：.git/config, node_modules/.bin/biome, ...
```

原因是 `verify.sandbox_mode: auto` 会把整个项目根复制到 `sandbox_root` 下执行；该配置为 macOS 路径 `/private/tmp`，在 Linux 环境下被自动创建后使用，副本内部分测试因隔离差异失败。sandbox 为兼容模式仅记 warn，不阻断判定。此项不影响 Gate 结论（`uncovered` 仍为 862）。

## 例外原因与授权

本提案是**需求级变更（基线建立）**，`proposal.md` 明确「无代码实现」；`tasks.md` 的 `[code]` 段仅含 `logos/logos-project.yaml` 配置同步三项，均已完成。规格基线已按 Why → What → How 全链路交付（69 份文档 / 10,912 行），但把 862 个用例 ID 对齐到仓库既有的 24,288 个测试、并实现 OpenLogos reporter 产出 `test-results.jsonl`，属于 Phase 3-5 的代码实现工作量，若在本提案内补齐会不当扩大变更范围。

operator 已明确确认：选择「跑 verify 拿报告，再决定归档」并在获知 Layer 1 / Layer 3 全绿、仅因运行时覆盖 0% 而 FAIL 后，选择「例外归档」。

## 结论边界

- 本次归档是 operator 授权的例外关闭，**不代表测试通过或工程验收通过**。
- 本提案达成的是**规格基线侧的目标**：Layer 1 设计时覆盖 117/117、Layer 3 验收追溯 82/82、52 个场景编号全链路一致（P0×23 / P1×24 / P2×5，`next_id = 53`）。
- **未达成**的是运行时验收：862 个用例的运行结果缺失（无 reporter、测试代码未按用例 ID 组织），Layer 2 运行时覆盖 0%。
- `pre_run` 在 verify sandbox 中 exit=1 的隔离差异问题**仍未解决**。
- 后续变更应完成 Phase 3-5（实现 reporter 并建立用例 ID 到既有测试的映射），再重跑 verify 争取 Gate 3.5 / 3.6 全绿。
- 本次基线登记的偏差清单 D1-D12 一律按**实现现状**记录，文档回补需另立变更。
