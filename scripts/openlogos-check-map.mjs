#!/usr/bin/env node

/**
 * 校验映射表分片里的选择器**确实命中**既有测试名。
 *
 * 「selector 非空」不等于「selector 能匹配上」——本脚本拿三份测试名清单
 * （Vitest json 报告、Playwright `--list` 输出、Rust nextest 清单）逐条比对，
 * 报出匹配不上的选择器，供映射工作自查。
 *
 * 用法：
 *   node scripts/openlogos-check-map.mjs [--root <dir>] [--parts <dir>] [--module <name>]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, "..");

const PARTS_DIR = "logos/resources/verify/.map-parts";
const VITEST_RAW = "logos/resources/verify/.raw/vitest.json";
const VITEST_WEB_RAW = "logos/resources/verify/.raw/vitest-web.json";
const PLAYWRIGHT_LIST = "logos/resources/verify/.raw/playwright-list.txt";
const RUST_LIST = "logos/resources/verify/.raw/rust-list.json";

function usage() {
  return `Usage:
  node scripts/openlogos-check-map.mjs [--root <dir>] [--module <name>]

Checks every selector in the mapping parts against the collected test-name
inventories (Vitest json report, Playwright --list output, Rust nextest list).
Selectors that match no known test are reported.

Options:
  --root <dir>       Repository root (default: this repository)
  --module <name>    Only check the part whose file name contains <name>
  -h, --help         Show this help`;
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, module: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      options.root = resolve(argv[++i] ?? "");
    } else if (arg === "--module") {
      options.module = argv[++i] ?? "";
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

/** 读 Vitest json 报告，返回 `{ "<仓库相对路径>": ["fullName", ...] }`。 */
function loadVitest(root, relative) {
  const path = resolve(root, relative);
  const byFile = new Map();
  if (!existsSync(path)) return byFile;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return byFile;
  }
  for (const suite of parsed?.testResults ?? []) {
    const file = typeof suite?.name === "string" ? suite.name : "";
    const names = [];
    for (const assertion of suite?.assertionResults ?? []) {
      if (typeof assertion?.fullName === "string") names.push(assertion.fullName);
    }
    byFile.set(file, names);
  }
  return byFile;
}

/** 读 Playwright `--list` 输出，返回 `{ "<spec 相对路径>": ["title", ...] }`。 */
function loadPlaywright(root) {
  const path = resolve(root, PLAYWRIGHT_LIST);
  const byFile = new Map();
  if (!existsSync(path)) return byFile;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const match = /^\s*\[[^\]]+\]\s+›\s+(\S+\.spec\.ts)(?::\d+:\d+)?\s+›\s+(.+?)\s*$/u.exec(line);
    if (!match) continue;
    const [, file, title] = match;
    const names = byFile.get(file) ?? [];
    names.push(title);
    byFile.set(file, names);
  }
  return byFile;
}

/** 读 Rust nextest 清单，返回测试名数组。 */
function loadRust(root) {
  const path = resolve(root, RUST_LIST);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return (parsed?.tests ?? [])
      .map((test) => (typeof test?.name === "string" ? test.name : ""))
      .filter((name) => name !== "");
  } catch {
    return [];
  }
}

function pathMatches(filePath, selectorPath) {
  const normalized = selectorPath.replaceAll("\\", "/").replace(/^\.\//u, "");
  const actual = filePath.replaceAll("\\", "/");
  return actual === normalized || actual.endsWith(`/${normalized}`);
}

function titleMatches(actual, expected) {
  if (expected === "") return true;
  const a = actual.replace(/\s+/gu, " ").trim();
  const e = expected.replace(/\s+/gu, " ").trim();
  return a === e || a.startsWith(e);
}

function splitSelector(selector) {
  const index = selector.indexOf(">");
  if (index === -1) return null;
  return { path: selector.slice(0, index).trim(), title: selector.slice(index + 1).trim() };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = options.root;
  const vitest = loadVitest(root, VITEST_RAW);
  const vitestWeb = loadVitest(root, VITEST_WEB_RAW);
  const playwright = loadPlaywright(root);
  const rust = loadRust(root);

  const partsDir = resolve(root, PARTS_DIR);
  if (!existsSync(partsDir)) {
    console.error(`[check-map] 分片目录不存在：${PARTS_DIR}`);
    process.exit(1);
  }

  let checked = 0;
  let unmatched = 0;
  let emptyCases = 0;
  const reports = [];

  for (const name of readdirSync(partsDir).sort()) {
    if (!name.endsWith(".json") || name.startsWith("_")) continue;
    if (options.module && !name.includes(options.module)) continue;
    const parsed = JSON.parse(readFileSync(join(partsDir, name), "utf8"));
    for (const [caseId, selectors] of Object.entries(parsed.cases ?? {})) {
      const vitestSelectors = selectors.vitest ?? [];
      const e2eSelectors = selectors.e2e ?? [];
      const rustSelectors = selectors.rust ?? [];
      if (vitestSelectors.length + e2eSelectors.length + rustSelectors.length === 0) {
        emptyCases += 1;
        reports.push(`${caseId}  无 selector`);
        continue;
      }
      for (const selector of vitestSelectors) {
        checked += 1;
        const parsedSelector = splitSelector(selector);
        const hit =
          parsedSelector !== null &&
          [...vitest.entries(), ...vitestWeb.entries()].some(
            ([file, names]) =>
              pathMatches(file, parsedSelector.path) &&
              names.some((name) => titleMatches(name, parsedSelector.title)),
          );
        if (!hit) {
          unmatched += 1;
          reports.push(`${caseId}  vitest 未命中: ${selector}`);
        }
      }
      for (const selector of e2eSelectors) {
        checked += 1;
        const parsedSelector = splitSelector(selector);
        const hit =
          parsedSelector !== null &&
          [...playwright.entries()].some(
            ([file, titles]) =>
              pathMatches(file, parsedSelector.path) &&
              titles.some((title) => titleMatches(title, parsedSelector.title)),
          );
        if (!hit) {
          unmatched += 1;
          reports.push(`${caseId}  e2e 未命中: ${selector}`);
        }
      }
      for (const selector of rustSelectors) {
        checked += 1;
        const hit = rust.some(
          (name) => name === selector || name.endsWith(selector) || name.includes(selector),
        );
        if (!hit) {
          unmatched += 1;
          reports.push(`${caseId}  rust 未命中: ${selector}`);
        }
      }
    }
  }

  console.log(
    `[check-map] 检查 selector ${checked} 条，未命中 ${unmatched} 条，无 selector 用例 ${emptyCases} 个`,
  );
  if (reports.length > 0) {
    console.error(reports.slice(0, 60).join("\n"));
    if (reports.length > 60) console.error(`… 另有 ${reports.length - 60} 条`);
  }
}

main();
