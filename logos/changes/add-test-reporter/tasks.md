# 实现任务

## [code] 代码实现

> 分批闭环约定（CLAUDE.md Step 5）：每批同时交付（1）基建/映射代码，（2）当批覆盖核验——`pnpm test:openlogos` 后 `test-results.jsonl` 的 covered 数增长符合预期、无非法 id 行，（3）本清单勾选。映射基准集 = `logos/resources/verify/acceptance-report.md` 的 862 个 uncovered 用例 ID（CLI extractDefinedIds 口径）。

- [ ] (批1) 定义映射表 schema 并生成 `logos/resources/verify/test-map.json` 骨架 — 基准集 862 ID、选择器语法（vitest/e2e 逐 test，rust 文件/模块粒度）、聚合语义（同用例多选择器取最差 status），并落 Rust 结构化输出选型结论（决策 D1）
- [ ] (批1) Vitest 接入结构化输出 — `vitest.config.ts` 与 `vitest.web.config.ts` 增加 JSON reporter/outputFile（editor-performance 实例不参与）
- [ ] (批1) Playwright 接入结构化输出 — `e2e/playwright.config.ts` 与 `web/e2e/playwright.config.ts` 增加 JSON reporter
- [ ] (批1) Rust 接入结构化输出 — 按选型引入 nextest 或等效机制，workspace 测试可产出 per-test JSON
- [ ] (批1) 实现聚合器 `scripts/openlogos-reporter.mjs` — 三端原始结果 × `test-map.json` → `logos/resources/verify/test-results.jsonl`（先 truncate，字段遵契约，id 逐一过 `^(UT|ST)-S\d{2}-\d{2,3}$` 校验）
- [ ] (批1) `package.json` 新增 `test:openlogos` 聚合入口 — vitest + cargo + e2e 串行，支持本地迭代跳过参数（决策 D5）
- [ ] (批1) `logos/logos.config.json` `verify.pre_run_command` 调整为聚合入口 — 最小 diff（决策 D2）
- [ ] (批1) `logos/spec/test-results.md` 增补「集中映射表 + 聚合器」模式章节 — schema、清空策略、聚合语义、与既有两种模式的关系
- [ ] (批1) 批次自验 — 聚合链路端到端产出合法 JSONL（非零行、全部 id 命中基准集、格式过契约校验）
- [ ] (批2) core 模块映射（244 ID） — 建映射 → `test:openlogos` → covered 增长核验 → 更新 gap 清单（无既有测试对应的用例）
- [ ] (批3) collab 模块映射（481 ID） — 同上
- [ ] (批4) sync 模块映射（154 ID） — 同上
- [ ] (批5) ai 模块映射（54 ID） — 同上
- [ ] (批6) research 模块映射（22 ID） — 同上
- [ ] (批7) gap 收敛 — 对批2–6 盘点出的无测试对应用例，按场景分批补最小断言测试（gap > 200 时按决策 D4 暂停上报）
- [ ] (批7) 全量核验 — `pnpm test:openlogos` 全量（不跳过）后基准集 862 ID 全部出现在 JSONL、uncovered=0；登记全量链实测耗时（决策 D5）
