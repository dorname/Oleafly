# fix-doc-deviations verify 例外记录

> 2026-11-16 | verify 结果：Gate 3.6 FAIL（incomplete_coverage）| pre_run `pnpm test` **exit=0**

## 一、verify 实测结果

| 项 | 结果 |
|---|---|
| pre_run（pnpm test，沙箱内） | **exit=0**，duration 369s（比 add-baseline-docs 期的沙箱 exit=1 有改善——该次归因于沙箱复制隔离差异，本次未复现） |
| Layer 1 设计时覆盖 | PASS（16 份测试规格覆盖度校验勾选维持 117/117，含本次 ST-S16-11 前提升级） |
| Layer 2 运行时覆盖 | **0%**（862/862 uncovered，`test-results.jsonl` 0 条记录） |
| Layer 3 验收追溯 | PASS（82/82 AC → 用例映射完好，含本次 S16-AC-05 终态） |
| Gate 3.5 / 3.6 | FAIL，判定链仅 `incomplete_coverage`（`failed_cases=0`）——与 add-baseline-docs 例外同源 |
| sandbox 警告 | `.git/config` 非白名单写入 warn（兼容策略继续，未阻断）；`sandbox_root` 环境差异遗留仍在 |

## 二、归因（与 add-baseline-docs 例外同源）

仓库测试体系（Vitest app 1655 文件级 + web 22、Rust workspace 153 integration roots、E2E 117 spec）**未按 OpenLogos 用例 ID 组织、无 OpenLogos reporter**，`test-results.jsonl` 因此为空——Layer 2 的 0% 是**基线测试资产与 reporter 机制的缺口**，非本提案引入，也非本提案能修复（属 Phase 3-5 遗留，见 `archive/20261110-1946-add-baseline-docs/verify-exception.md`）。

## 三、本提案的验收面说明

本提案为**纯文档变更**：11 份英文用户文档（docs/*.md + README.md）的 D1–D12 回补 + 基线规格标注转终态（20 份）。**无代码行为变化、无新测试面、无部署**。`pnpm test` 全量通过（exit=0）证明文档变更未破坏任何既有测试。

[code] 段产出的正确性验证方式为**逐处读回 + 源码事实核对**（每个回补点均在源码中独立核实：`builtin_agents.rs` 15 个、`native.rs` 6 只读工具、`research-tasks.ts:144` run 60 分钟、`ai_model_registry.rs` blocked 两类、`release-cli.yml` 工作流、`ImportReferenceLibraryDialog` 入口等），已随提交 `642e68688` 记录。

## 四、结论边界

- **达成**：规格侧目标全部达成——D1–D12 标注转终态、用户文档对齐实现、D4 组件名经核实修正（`ImportReferenceLibraryDialog`）。
- **未达成**：Layer 2 运行时覆盖（862 uncovered），根因在 reporter 机制缺口，非本提案范围。
- **遗留**（延续上一提案清单）：①862 用例 ID → 既有测试的 reporter 映射（Phase 3-5）；②`sandbox_root` 环境修正（/private/tmp → /tmp）。

依 add-baseline-docs 先例（例外归档），建议按本记录归档本提案。
