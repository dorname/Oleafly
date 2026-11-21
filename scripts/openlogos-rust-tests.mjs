#!/usr/bin/env node

/**
 * 从 Rust 源码静态提取测试函数清单。
 *
 * 用途：`cargo nextest list` 需要编译整个 workspace，而 src-tauri 的测试二进制
 * 在内存受限的机器上会 OOM 被杀；本脚本不做编译，直接从源码抽出每个
 * `#[test]` / `#[tokio::test]` 函数及其所在测试模块，供映射表挑 Rust selector。
 *
 * 输出：`logos/resources/verify/.raw/rust-tests.json`
 *   { "<相对路径>": { "module": "<模块路径>", "tests": ["<函数名>", ...] } }
 *
 * 聚合器按「后缀或包含」匹配 Rust 测试名，因此 selector 写函数名或
 * `模块路径::函数名` 都能命中。
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, "..");
const OUTPUT = "logos/resources/verify/.raw/rust-tests.json";

/** 只扫这些目录——仓库里的 Rust 代码都在这儿。 */
const SCAN_ROOTS = ["src-tauri/src", "crates"];
const SKIP_DIRS = new Set(["target", "node_modules", ".git"]);

function usage() {
  return `Usage:
  node scripts/openlogos-rust-tests.mjs [--root <dir>] [--out <path>]

Extracts #[test] / #[tokio::test] function names from the Rust sources without
compiling anything, so that mapping tables can reference Rust tests on machines
where compiling the workspace is not feasible.

Options:
  --root <dir>   Repository root (default: this repository)
  --out <path>   Output path, relative to root (default: ${OUTPUT})
  -h, --help     Show this help`;
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, out: OUTPUT };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      options.root = resolve(argv[++i] ?? "");
    } else if (arg === "--out") {
      options.out = argv[++i] ?? OUTPUT;
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

function collectRustFiles(root) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".rs")) {
        files.push(join(dir, entry.name));
      }
    }
  };
  for (const rootDir of SCAN_ROOTS) {
    const absolute = join(root, rootDir);
    try {
      if (statSync(absolute).isDirectory()) walk(absolute);
    } catch {
      /* 目录不存在则跳过 */
    }
  }
  return files;
}

/**
 * 逐行扫描一个 .rs 文件，维护当前所处的 `mod` 名，收集测试函数。
 * 只处理顶层与内联 `mod tests` —— 这是仓库实际的测试布局。
 */
function extractFromFile(text) {
  const tests = [];
  const modules = [];
  let currentModule = "";
  const modStack = [];
  const lines = text.split(/\r?\n/u);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const modMatch = /^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+([A-Za-z0-9_]+)\s*\{/u.exec(line);
    if (modMatch) {
      modStack.push(currentModule);
      currentModule = currentModule ? `${currentModule}::${modMatch[1]}` : modMatch[1];
      modules.push(currentModule);
      continue;
    }
    if (/^\s*\}/u.test(line) && modStack.length > 0) {
      currentModule = modStack.pop() ?? "";
      continue;
    }
    const testMatch = /^\s*(?:#\[[^\]]*(?:test|tokio::test)[^\]]*\]\s*)*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/u.exec(
      line,
    );
    if (testMatch === null) continue;
    // 只有当该 fn 之前最近的一个属性是 test / tokio::test 时才算测试函数
    let attribute = "";
    for (let j = i - 1; j >= 0 && j >= i - 4; j -= 1) {
      const prev = lines[j].trim();
      if (prev.startsWith("#[") && prev.endsWith("]")) {
        attribute = prev;
        break;
      }
      if (prev === "" || prev.startsWith("//")) continue;
      break;
    }
    if (!attribute.includes("test")) continue;
    tests.push({
      name: testMatch[1],
      module: currentModule,
      qualified: currentModule ? `${currentModule}::${testMatch[1]}` : testMatch[1],
    });
  }
  return { tests, modules };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = options.root;
  const files = collectRustFiles(root);
  const result = {};
  let totalTests = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("#[test") && !text.includes("#[tokio::test")) continue;
    const { tests } = extractFromFile(text);
    if (tests.length === 0) continue;
    const relativePath = relative(root, file).replaceAll("\\", "/");
    result[relativePath] = tests;
    totalTests += tests.length;
  }
  const output = resolve(root, options.out);
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `[rust-tests] 扫描 ${files.length} 个 .rs 文件，抽出 ${totalTests} 个测试函数，写入 ${options.out}`,
  );
}

main();
