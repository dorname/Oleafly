#!/usr/bin/env node

/**
 * OpenLogos 聚合测试入口：跑三套测试体系，收集结构化结果，再 join 成契约 JSONL。
 *
 * 顺序固定为「采集 → 聚合」：
 *   1. Vitest 主实例（src/ 与 packages/）→ .raw/vitest.json
 *   2. Vitest web 实例（web/）          → .raw/vitest-web.json
 *   3. Rust workspace（cargo nextest）   → .raw/rust.json
 *   4. Playwright tauri（e2e/）          → .raw/playwright.json
 *   5. 聚合：.raw/* × test-map.json → logos/resources/verify/test-results.jsonl
 *
 * 每一套的原始结果文件在跑之前清空——JSONL reporter 每次运行都应只包含最近一次
 * 运行的结果（契约「清空策略」）。
 *
 * 跳过开关用于本地迭代（某一端在本机跑不动时先跑其余的）；`openlogos verify`
 * 的预跑命令不使用任何跳过开关。
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, "..");
const RAW_DIR = "logos/resources/verify/.raw";

const RAW_FILES = {
  vitest: join(RAW_DIR, "vitest.json"),
  "vitest-web": join(RAW_DIR, "vitest-web.json"),
  rust: join(RAW_DIR, "rust.json"),
  playwright: join(RAW_DIR, "playwright.json"),
};

function usage() {
  return `Usage:
  node scripts/openlogos-test.mjs [--root <dir>] [--skip <suite>...] [--only <suite>...]

Runs the Vitest, Rust and Playwright suites, then joins their structured results
with logos/resources/verify/test-map.json into the OpenLogos JSONL result file.

Suites: vitest, vitest-web, rust, playwright
  --skip <suite>   Skip a suite (repeatable). Local iteration only.
  --only <suite>   Run only the listed suites (repeatable).
  --rust-exclude <pkg>   Exclude a Rust package from the nextest run.
  --cargo-jobs <n>       Cargo build concurrency (default 2; 1 lowers memory peak).
  --root <dir>     Repository root (default: this repository)
  -h, --help       Show this help`;
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, skip: new Set(), only: null, rustExclude: null, cargoJobs: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      options.root = resolve(argv[++i] ?? "");
    } else if (arg === "--skip") {
      options.skip.add(argv[++i] ?? "");
    } else if (arg === "--rust-exclude") {
      options.rustExclude = argv[++i] ?? "";
    } else if (arg === "--cargo-jobs") {
      options.cargoJobs = argv[++i] ?? null;
    } else if (arg === "--only") {
      options.only ??= new Set();
      options.only.add(argv[++i] ?? "");
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

function run(label, command, args, cwd, env) {
  console.log(`\n[openlogos-test] ▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    console.error(`[openlogos-test] ${label} 启动失败：${result.error.message}`);
    return 1;
  }
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout.trim() !== "") console.log(stdout.trimEnd());
  if (stderr.trim() !== "") console.error(stderr.trimEnd());
  console.log(`[openlogos-test] ◀ ${label} 退出码 ${result.status ?? 1}`);
  return result.status ?? 1;
}

function clearRaw(root, relative) {
  const path = resolve(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  rmSync(path, { force: true });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = options.root;

  const enabled = (suite) => {
    if (options.only) return options.only.has(suite);
    return !options.skip.has(suite);
  };

  mkdirSync(resolve(root, RAW_DIR), { recursive: true });

  // 1. Vitest 主实例
  if (enabled("vitest")) {
    clearRaw(root, RAW_FILES.vitest);
    run(
      "vitest (src + packages)",
      "npx",
      [
        "vitest",
        "run",
        "--maxWorkers=4",
        "--reporter=json",
        `--outputFile=${resolve(root, RAW_FILES.vitest)}`,
      ],
      root,
    );
  }

  // 2. Vitest web 实例
  if (enabled("vitest-web")) {
    clearRaw(root, RAW_FILES["vitest-web"]);
    run(
      "vitest (web)",
      "npx",
      [
        "vitest",
        "run",
        "--config",
        "vitest.web.config.ts",
        "--reporter=json",
        `--outputFile=${resolve(root, RAW_FILES["vitest-web"])}`,
      ],
      root,
    );
  }

  // 3. Rust workspace
  if (enabled("rust")) {
    clearRaw(root, RAW_FILES.rust);
    const nextestAvailable = spawnSync("cargo", ["nextest", "--version"], { cwd: root, encoding: "utf8" }).status === 0;
    // src-tauri 的测试二进制体积大，链接阶段内存峰值高；内存紧张时可用
    // --rust-exclude oleafly 跳过它（crates/* 仍全量覆盖）。
    const excludeArgs = options.rustExclude ? ["--exclude", options.rustExclude] : [];
    if (nextestAvailable) {
      const output = join(root, RAW_FILES.rust);
      mkdirSync(dirname(output), { recursive: true });
      const result = spawnSync(
        "cargo",
        ["nextest", "run", "--workspace", ...excludeArgs, "--message-format", "libtest-json"],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            NEXTEST_EXPERIMENTAL_LIBTEST_JSON: "1",
            CARGO_BUILD_JOBS: options.cargoJobs ?? String(process.env.CARGO_BUILD_JOBS ?? "2"),
          },
          maxBuffer: 256 * 1024 * 1024,
        },
      );
      writeFileSync(output, result.stdout ?? "");
      if (result.stderr) console.error(result.stderr.trimEnd());
      console.log(`[openlogos-test] ◀ rust (cargo nextest) 退出码 ${result.status ?? 1}`);
    } else {
      // 回退：解析 libtest 文本输出（测试名只有函数名，映射粒度更粗）
      const result = spawnSync(
        "cargo",
        ["test", "--workspace", "--all-targets", "--no-fail-fast"],
        { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
      );
      const output = join(root, "logos/resources/verify/.raw/rust.txt");
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, result.stdout ?? "");
      if (result.stderr) console.error(result.stderr.trimEnd());
      console.log(`[openlogos-test] ◀ rust (cargo test 回退路径) 退出码 ${result.status ?? 1}`);
    }
  }

  // 4. Playwright tauri E2E
  if (enabled("playwright")) {
    clearRaw(root, RAW_FILES.playwright);
    run(
      "playwright (e2e)",
      "npx",
      [
        "playwright",
        "test",
        "-c",
        "e2e/playwright.config.ts",
        "--reporter=list,json",
      ],
      root,
      { PLAYWRIGHT_JSON_OUTPUT_NAME: resolve(root, RAW_FILES.playwright) },
    );
  }

  // 5. 聚合
  run(
    "aggregate",
    process.execPath,
    [join(SCRIPT_DIR, "openlogos-reporter.mjs"), "--root", root],
    root,
  );

  if (!existsSync(resolve(root, "logos/resources/verify/test-results.jsonl"))) {
    console.error("[openlogos-test] 聚合未产出 test-results.jsonl");
    process.exit(1);
  }
}

main();
