# 变更提案：add-test-reporter

> module: core | created: 2026-11-16

## 变更原因

`openlogos verify` 的 Layer 2 运行时覆盖恒为 0%（862/862 uncovered，`logos/resources/verify/test-results.jsonl` 0 字节）。根因：三套测试体系——Vitest（主实例 + web，约 2 万个测试函数）、Rust workspace（约 9800 个 `#[test]`/`#[tokio::test]`）、Playwright E2E（117 spec 约 552 个 test）——均不产出按 OpenLogos 用例 ID 组织的结果；且**全仓测试代码中 `UT-`/`ST-` 字样命中数为 0**（测试名全部为行为描述句），契约 `logos/spec/test-results.md` 的两种既有模式（测试代码内嵌 reporter、从测试名提取 ID）在存量上都没有数据基础。

直接后果：verify Gate 3.5/3.6 恒为 FAIL（`incomplete_coverage`）；而 openlogos v0.17.0 起 archive 带 fail-closed 门（要求 `VERIFY_PASS` 在场且 `VERIFY_FAIL` 缺席、无例外通道），verify FAIL 的提案无法归档——fix-doc-deviations 已因此搁置（见其 `verify-exception.md` 第五节），其 guard 持续锁定主工作区，阻塞后续一切提案。

来源：add-baseline-docs 遗留项①（862 用例 ID → 既有测试的 reporter 映射）；连续两个提案的 verify 例外记录均指向同一缺口。

## 最小实现论证

- 先检索既有机制：①契约 `logos/spec/test-results.md` 只定义「测试代码内嵌 reporter」与「从测试名提取 ID」两种模式——测试名 0% 含 ID、约 3 万个测试函数逐个内嵌不现实，两种模式均无法覆盖存量；②CI 仅有覆盖率产物（`cargo llvm-cov --lcov`、`vitest --coverage`），无 per-test 结构化结果；③`scripts/` 下无任何聚合脚本；④`[manual]` 与 `SMOKE-*` 用例已由契约排除在 verify 分母外，无需人工录入通道。
- 为什么不能更小：只做 Vitest reporter → Rust/E2E 源用例（如 `UT-S01-01` 对应 `src-tauri/src/protocol.rs`）永久 uncovered；只做 reporter 不建映射 → 862 个 ID 与约 3 万个测试函数仍是不透明关系，JSONL 无从产出；不调整 `verify.pre_run_command`（现值 `pnpm test` 仅 `vitest run --maxWorkers=4`）→ 聚合链不会被 verify 触发。
- 本提案主动砍掉的：①批量重命名约 3 万个测试函数嵌入 ID（与仓库行为句命名风格冲突、review 成本不可控，改用集中映射表）；②`logos/resources/test/*.md` 用例表结构变更（用例定义与分母不动；919 全局唯一 ID vs 862 defined 的口径差异、跨文件重复 ID 等数据问题留待实测，JSONL「最后一条生效」语义已在契约中）；③`SMOKE-delivery-01-NN` 50 个用例（非 UT/ST 正则，不在分母）；④`[manual]` 人工录入通道（契约已排除出分母，verify 实测 manual excluded = 37）；⑤`sandbox_root` 环境修正（遗留项②，另行处理）；⑥E2E 调试 artifacts 体系（`e2e-artifacts/` 现状保留）。

## 变更类型

代码级修复（纯测试基建；无需求/设计/API/DB 规格变更，不产出 resources/ delta）

## 变更范围

- 影响的需求文档：无
- 影响的功能规格：无
- 影响的业务场景：全部 23 个定义了测试用例的场景（S01–S48 区间；862 个 UT/ST 用例的**运行时覆盖链路**，场景与用例定义本身不变，以 `logos/resources/verify/acceptance-report.md` uncovered 清单为准）
- 影响的 API：无
- 影响的 DB 表：无
- 影响的编排测试：无（`logos/resources/scenario/` 不动）
- 测试基建（直接修改，不产出 delta）：`vitest.config.ts` / `vitest.web.config.ts`（新增结构化输出）、`e2e/playwright.config.ts` / `web/e2e/playwright.config.ts`（新增 JSON reporter）、Rust 侧结构化测试输出引入（nextest 或等效，见决策 D1）、新增 `scripts/openlogos-reporter.mjs` 聚合器、新增映射表 `logos/resources/verify/test-map.json`、`package.json` 新增聚合测试入口、`logos/logos.config.json` `verify.pre_run_command` 调整（见决策 D2）、`logos/spec/test-results.md` 增补映射表模式章节

## 部署影响

- 是否需要部署：否
- 部署原因：纯测试基建与本地 verify 链路，不改变应用交付物
- 影响环境：无
- 是否涉及数据迁移：否
- 是否需要回滚预案：否（git revert 即回滚）
- 是否需要 smoke：否

## UI/UX 变更声明

```yaml
ui_impact: false
design_system_mode: generated
design_system_fallback_reason: ""
pages: []
```

## 决策澄清

```yaml
schema: openlogos/clarification@1
mode: adaptive
status: pending
impacts:
  data:
    status: none
    reason: 测试结果与映射表均为仓库内文件，无数据高影响面
  compatibility:
    status: none
    reason: 不改变应用行为与既有测试语义；JSONL schema 维持契约原样
  security_privacy:
    status: none
    reason: 结果文件仅含用例 ID 与状态，不出机器
  public_release:
    status: none
    reason: 测试基建不触及发布面
  external_commitment:
    status: none
    reason: 无外部接口承诺变化
decisions:
  - "D1 Rust 结构化输出选型：倾向 cargo-nextest（--message-format json，stable 工具链可用）；备选解析 libtest terse 文本。批次 1 内定稿并记录选型证据。"
  - "D2 logos/logos.config.json 属 guard 保护范围文件：verify.pre_run_command 的调整在本提案 guard 范围内以最小 diff 执行，并在提交信息中显式记录该保护文件的变更。"
  - "D3 映射粒度：用例 → 测试选择器集合（Vitest/E2E 可逐 test 粒度，Rust 以文件/模块粒度为主），同用例多选择器时聚合 status 取最差值；映射基准集 = acceptance-report 862 uncovered 清单（CLI extractDefinedIds 口径）。"
  - "D4 gap 处理：映射建立后无既有测试对应的用例，在本提案内按场景分批补最小断言测试；若盘点后 gap 量级异常（>200），暂停并上报 operator 重新核定范围。"
  - "D5 verify 全量链耗时：pre_run 聚合三套测试后 verify 时长将显著上升（Vitest 实测约 6 分钟 + cargo + E2E）；聚合入口提供本地迭代用跳过参数，verify 全量不跳过；实测时长登记入验收记录。"
unresolved: []
defaults: []
```

## 变更概述

建立「集中映射表 + 三端结构化输出 + 聚合器」的 OpenLogos reporter 链路：`test-map.json` 以 862 个用例 ID 为基准集，每个 ID 映射到一组测试选择器；Vitest（根配置一处生效于主/web 实例）与 Playwright（tauri/web 两个 config）接入 JSON reporter，Rust 侧引入 nextest（或等效）产出结构化结果；聚合器 `scripts/openlogos-reporter.mjs` 将三端原始结果与映射表 join 成契约格式 JSONL（先 truncate、id 过正则校验）。`verify.pre_run_command` 调整为聚合入口 `pnpm test:openlogos`，使 verify 自动驱动全链。

实现按批闭环推进：批次 1 落基建与聚合链路自验；批次 2–6 按模块建映射（core 244 / collab 481 / sync 154 / ai 54 / research 22，分布为全局唯一 ID 口径），每批以「uncovered 数下降符合预期」核验；批次 7 对无既有测试对应的用例补最小断言测试直至 uncovered=0。契约文档 `logos/spec/test-results.md` 同步增补「集中映射表 + 聚合器」模式章节。

完成后 verify 三层可达全绿，fix-doc-deviations 得以在主工作区正常 verify PASS 并归档（其 guard 释放，恢复提案流水线）。
