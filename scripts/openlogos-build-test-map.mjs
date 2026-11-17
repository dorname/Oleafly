#!/usr/bin/env node

/**
 * 合并 OpenLogos 映射表分片并校验覆盖面。
 *
 * 输入：`logos/resources/verify/.map-parts/*.json`（按模块切分的分片，每片形如
 * `{ schema, module, cases: { "<用例 ID>": { vitest: [], e2e: [], rust: [] } } }`）。
 * 输出：`logos/resources/verify/test-map.json`（合并后的完整映射表）。
 *
 * 校验项：
 *   1. 分片 ID 合文（`^(UT|ST)-S\d{2}-\d{2,3}$`）；
 *   2. ID 不跨分片重复；
 *   3. 与基准集（`logos/resources/verify/acceptance-report.md` 的 uncovered 清单，
 *      即 verify 的 defined 口径）一致——缺失与多余都要点名；
 *   4. 每个分片 ID 至少有一条 selector（否则该用例永远 uncovered）。
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, "..");

const PARTS_DIR = "logos/resources/verify/.map-parts";
const MAP_PATH = "logos/resources/verify/test-map.json";
const BASELINE_PATH = "logos/resources/verify/acceptance-report.md";
const CASE_ID_RE = /^(?:UT|ST)-S\d{2}-\d{2,3}$/u;

function usage() {
  return `Usage:
  node scripts/openlogos-build-test-map.mjs [--root <dir>] [--check]

Merges the per-module mapping parts into ${MAP_PATH} and reports coverage gaps
against the verify baseline (the uncovered list in ${BASELINE_PATH}).

Options:
  --root <dir>   Repository root (default: this repository)
  --check        Validate only; do not write the merged mapping table
  -h, --help     Show this help`;
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      options.root = resolve(argv[++i] ?? "");
    } else if (arg === "--check") {
      options.check = true;
    } else if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      console.error(usage());
      process.exit(1);
    }
  }
  return options;
}

function readBaseline(root) {
  const path = resolve(root, BASELINE_PATH);
  if (!existsSync(path)) return null;
  const ids = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const match = /^- ((?:UT|ST)-S\d{2}-\d{2,3})$/u.exec(line.trim());
    if (match) ids.push(match[1]);
  }
  return [...new Set(ids)];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = options.root;
  const partsDir = resolve(root, PARTS_DIR);
  if (!existsSync(partsDir)) {
    console.error(`[build-test-map] 分片目录不存在：${PARTS_DIR}`);
    process.exit(1);
  }

  const cases = {};
  const owners = new Map();
  const invalid = [];
  const emptySelectors = [];

  const partFiles = readdirSync(partsDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .sort();
  for (const name of partFiles) {
    const parsed = JSON.parse(readFileSync(join(partsDir, name), "utf8"));
    for (const [caseId, selectors] of Object.entries(parsed.cases ?? {})) {
      if (!CASE_ID_RE.test(caseId)) {
        invalid.push(`${name}:${caseId}`);
        continue;
      }
      if (owners.has(caseId)) {
        invalid.push(`${caseId}（重复：${owners.get(caseId)} 与 ${name}）`);
        continue;
      }
      owners.set(caseId, name);
      const total =
        (selectors.vitest?.length ?? 0) + (selectors.e2e?.length ?? 0) + (selectors.rust?.length ?? 0);
      if (total === 0) emptySelectors.push(caseId);
      cases[caseId] = {
        vitest: selectors.vitest ?? [],
        e2e: selectors.e2e ?? [],
        rust: selectors.rust ?? [],
      };
    }
  }

  const baseline = readBaseline(root);
  const missing = baseline ? baseline.filter((id) => !owners.has(id)) : [];
  const extra = [...owners.keys()].filter((id) => baseline && !baseline.includes(id));

  console.log(`[build-test-map] 分片 ${partFiles.length} 个，用例 ${owners.size} 个`);
  if (baseline) {
    console.log(`[build-test-map] 基准集 ${baseline.length} 个：缺失 ${missing.length}，多余 ${extra.length}`);
    if (missing.length > 0) {
      console.error(`[build-test-map] 缺失用例：${missing.slice(0, 20).join(", ")}${missing.length > 20 ? " …" : ""}`);
    }
    if (extra.length > 0) {
      console.error(`[build-test-map] 多余用例：${extra.slice(0, 20).join(", ")}${extra.length > 20 ? " …" : ""}`);
    }
  }
  if (emptySelectors.length > 0) {
    console.error(`[build-test-map] ${emptySelectors.length} 个用例尚无 selector：${emptySelectors.slice(0, 20).join(", ")}${emptySelectors.length > 20 ? " …" : ""}`);
  }
  if (invalid.length > 0) {
    console.error(`[build-test-map] ${invalid.length} 处非法或重复：${invalid.slice(0, 10).join(", ")}`);
  }

  if (!options.check) {
    const output = {
      schema: "openlogos/test-map@1",
      generated_at: new Date().toISOString(),
      description:
        "用例 ID → 测试选择器映射表。vitest/e2e 选择器语法为「<文件路径> > <标题前缀>」；rust 选择器为测试名（函数名或模块路径::函数名）。多选择器时状态取最差值。",
      cases,
    };
    const path = resolve(root, MAP_PATH);
    writeFileSync(path, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`[build-test-map] 已写入 ${MAP_PATH}`);
  }

  if (invalid.length > 0 || missing.length > 0 || extra.length > 0) {
    process.exit(1);
  }
}

main();
