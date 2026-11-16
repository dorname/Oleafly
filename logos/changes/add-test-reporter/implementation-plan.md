# add-test-reporter 实施批次预案

> 本文件是 plan 阶段的实施规划备忘（非 tasks.md 正式条目——spec-complete 前 [code] 段须为空，正式切片由 merge 后 slice-planner 生成）。批次划分依据 proposal.md「变更概述」与决策 D1–D5。

## 分批闭环约定（CLAUDE.md Step 5）

每批同时交付：（1）基建/映射代码，（2）当批覆盖核验——`pnpm test:openlogos` 后 `test-results.jsonl` 的 covered 数增长符合预期、无非法 id 行，（3）规划勾选记录。

映射基准集 = `logos/resources/verify/acceptance-report.md` 的 862 个 uncovered 用例 ID（CLI extractDefinedIds 口径）。

## 批次划分

- **批1 reporter 基建与聚合链路**：映射表 schema 与 `test-map.json` 骨架（862 ID、选择器语法：vitest/e2e 逐 test、rust 文件/模块粒度、聚合取最差 status；落 Rust 结构化输出选型结论 D1）→ Vitest 两实例 JSON reporter（editor-performance 不参与）→ Playwright 两 config JSON reporter → Rust 结构化输出引入 → 聚合器 `scripts/openlogos-reporter.mjs`（truncate 契约 + id 正则校验）→ `package.json` `test:openlogos` 聚合入口（本地迭代跳过参数 D5）→ `logos/logos.config.json` `verify.pre_run_command` 调整（最小 diff D2）→ `logos/spec/test-results.md` 增补映射表模式章节 → 批次自验（端到端合法 JSONL）
- **批2–6 按模块建映射**（每批：建映射 → `test:openlogos` → covered 增长核验 → gap 清单更新）：core 244 → collab 481 → sync 154 → ai 54 → research 22（全局唯一 ID 口径）
- **批7 gap 收敛与全量核验**：无测试对应用例按场景分批补最小断言测试（gap > 200 按 D4 暂停上报）→ 全量 `test:openlogos`（不跳过）后 862 ID 全覆盖、uncovered=0 → 登记全量链实测耗时（D5）

## 后续主线（本提案完成后）

主工作区 `openlogos verify`（fix-doc-deviations，guard 仍指向它）→ VERIFY_PASS → `openlogos archive fix-doc-deviations` 正常过 v0.17.0 门禁（无需任何标记手工操作）。
