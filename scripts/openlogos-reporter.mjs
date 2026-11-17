#!/usr/bin/env node

/**
 * OpenLogos 测试结果聚合器（集中映射表模式）。
 *
 * 把三套测试体系的结构化原始结果与 `logos/resources/verify/test-map.json`
 * 里的「用例 ID → 测试选择器」映射 join 成 OpenLogos 契约格式的 JSONL：
 *
 *   logos/resources/verify/test-results.jsonl
 *
 * 每行一个 `{ id, status, duration_ms?, timestamp, error?, scenario? }`。
 *
 * 原始结果来源（由各框架自带 reporter 落盘，聚合器只读）：
 *   - Vitest 主实例 / web 实例：json reporter
 *   - Playwright tauri / web：json reporter
 *   - Rust workspace：cargo-nextest JSON（`--message-format json`），
 *     无 nextest 时回退解析 libtest 文本输出
 *
 * 映射表 schema 见 `logos/resources/verify/test-map.json` 的 `schema` 字段，
 * 契约说明见 `logos/spec/test-results.md`「集中映射表 + 聚合器」章节。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, "..");

const MAP_PATH = "logos/resources/verify/test-map.json";
const RESULT_PATH = "logos/resources/verify/test-results.jsonl";
const RAW_DIR = "logos/resources/verify/.raw";

/** 契约闭合文法：id 必须完全一致于 test-cases.md 的 UT/ST 编号。 */
const CASE_ID_RE = /^(UT|ST)-S\d{2}-\d{2,3}$/u;

/** 状态劣序：fail 最差，其次 skip，最后 pass。 */
const STATUS_SEVERITY = { fail: 3, skip: 2, pass: 1 };

/** 各来源的原始结果文件（缺失即视为该来源无记录，不算失败）。 */
const RAW_SOURCES = {
  vitest: [`${RAW_DIR}/vitest.json`, `${RAW_DIR}/vitest-web.json`],
  e2e: [`${RAW_DIR}/playwright.json`, `${RAW_DIR}/playwright-web.json`],
  rust: [`${RAW_DIR}/rust.json`, `${RAW_DIR}/rust.txt`],
};

function usage() {
  return `Usage:
  node scripts/openlogos-reporter.mjs [--root <dir>] [--map <path>] [--out <path>]

Joins the structured results of the Vitest, Playwright and Rust test runs with
the case-to-selector mapping table, then writes the OpenLogos JSONL result file.
Missing raw result files are treated as "no records from that source"; cases
without a matching selector stay absent from the output so that
\`openlogos verify\` reports them as uncovered.

Options:
  --root <dir>    Repository root (default: this repository)
  --map <path>    Mapping table path, relative to root (default: ${MAP_PATH})
  --out <path>    Result file path, relative to root (default: ${RESULT_PATH})
  -h, --help      Show this help`;
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, map: MAP_PATH, out: RESULT_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      options.root = resolve(argv[++i] ?? "");
    } else if (arg === "--map") {
      options.map = argv[++i] ?? MAP_PATH;
    } else if (arg === "--out") {
      options.out = argv[++i] ?? RESULT_PATH;
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

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`[openlogos-reporter] 无法解析 ${path}：${String(error)}`);
    return null;
  }
}

/* ── Vitest ─────────────────────────────────────────────────────────────── */

/**
 * 把 Vitest json reporter 的结果摊平成 `{ file, fullName, status, duration }` 记录。
 * `testResults[].name` 是测试文件绝对路径，`assertionResults[].fullName` 是
 * `describe 标题 + it 标题` 的拼接。
 */
function collectVitest(raw) {
  const records = [];
  for (const suite of raw?.testResults ?? []) {
    const file = typeof suite?.name === "string" ? suite.name : "";
    for (const assertion of suite?.assertionResults ?? []) {
      const fullName = typeof assertion?.fullName === "string" ? assertion.fullName : "";
      if (!fullName) continue;
      records.push({
        file,
        fullName,
        status: normalizeStatus(assertion?.status),
        durationMs: Number.isFinite(assertion?.duration) ? assertion.duration : undefined,
        error: firstMessage(assertion),
      });
    }
  }
  return records;
}

/* ── Playwright ─────────────────────────────────────────────────────────── */

/**
 * 遍历 Playwright json reporter 的 suite/spec 树，取出每个 spec 的最终状态。
 * 树形结构随版本有细微变化，故递归收集而不是按固定深度取值。
 */
function collectPlaywright(raw) {
  const records = [];
  const visitSuite = (suite) => {
    for (const spec of suite?.specs ?? []) {
      const results = (spec?.tests ?? []).flatMap((test) => test?.results ?? []);
      if (results.length === 0) continue;
      const status = normalizeStatus(
        results.some((result) => result?.status === "failed" || result?.status === "timedOut")
          ? "failed"
          : results.every((result) => result?.status === "skipped") ? "pending" : "passed",
      );
      const durationMs = results.reduce(
        (sum, result) => sum + (Number.isFinite(result?.duration) ? result.duration : 0),
        0,
      );
      records.push({
        file: typeof spec?.file === "string" ? spec.file : "",
        title: typeof spec?.title === "string" ? spec.title : "",
        status,
        durationMs: durationMs > 0 ? durationMs : undefined,
        error: results.find((result) => result?.error)?.error?.message,
      });
    }
    for (const child of suite?.suites ?? []) {
      visitSuite(child);
    }
  };
  for (const suite of raw?.suites ?? []) {
    visitSuite(suite);
  }
  return records;
}

/* ── Rust ───────────────────────────────────────────────────────────────── */

/**
 * cargo-nextest 的 `--message-format libtest-json` 是 NDJSON 事件流：每条测试有
 * `started` 与终态（`ok` / `failed` / `ignored` / `skipped` / `timeout`）两条事件。
 * 测试名形如 `oleafly-core::context_golden$fn`（integration 测试用 `$` 分隔目标）。
 */
function collectRustNextest(rawText) {
  const records = [];
  for (const line of rawText.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (event?.type !== "test") continue;
    const status = nextestEventStatus(event?.event);
    if (status === null) continue;
    const testId = event?.name;
    if (typeof testId !== "string" || testId === "") continue;
    records.push({
      testId,
      status,
      durationMs: Number.isFinite(event?.exec_time) ? Math.round(event.exec_time * 1000) : undefined,
      error: typeof event?.output === "string" ? event.output.slice(0, 500) : undefined,
    });
  }
  return records;
}

/** nextest 终态事件 → 契约状态；`started` 等非终态返回 null。 */
function nextestEventStatus(event) {
  switch (event) {
    case "ok":
    case "passed":
      return "pass";
    case "failed":
    case "timeout":
    case "abort":
      return "fail";
    case "ignored":
    case "skipped":
      return "skip";
    default:
      return null;
  }
}

/**
 * libtest 文本回退：`cargo test` 的默认输出每行一个 `test <名字> ... ok|FAILED`。
 * 名字只有函数名（不含模块路径），因此 Rust 选择器按函数名匹配。
 */
function collectRustText(rawText) {
  const records = [];
  const re = /^test\s+(.+?)\s+\.\.\.\s+(ok|FAILED|ignored)\b/mu;
  let match = re.exec(rawText);
  while (match !== null) {
    records.push({
      testId: match[1].trim(),
      status: normalizeStatus(match[2] === "ok" ? "passed" : match[2] === "FAILED" ? "failed" : "skipped"),
    });
    match = re.exec(rawText);
  }
  return records;
}

/* ── 通用工具 ───────────────────────────────────────────────────────────── */

function normalizeStatus(status) {
  switch (status) {
    case "passed":
    case "pass":
    case "ok":
      return "pass";
    case "failed":
    case "fail":
    case "FAILED":
      return "fail";
    case "pending":
    case "skipped":
    case "skip":
    case "ignored":
      return "skip";
    default:
      return "skip";
  }
}

function firstMessage(assertion) {
  const message = assertion?.failureMessages;
  if (Array.isArray(message) && message.length > 0) return String(message[0]).slice(0, 500);
  if (typeof assertion?.message === "string" && assertion.message !== "") {
    return assertion.message.slice(0, 500);
  }
  return undefined;
}

function worseStatus(a, b) {
  const severityA = STATUS_SEVERITY[a] ?? 0;
  const severityB = STATUS_SEVERITY[b] ?? 0;
  return severityA >= severityB ? a : b;
}

/** 路径后缀匹配：`src/store/x.test.ts` 命中 `/abs/root/src/store/x.test.ts`。 */
function pathMatches(filePath, selectorPath) {
  const normalized = selectorPath.replaceAll("\\", "/").replace(/^\.\//u, "");
  const actual = filePath.replaceAll("\\", "/");
  return actual === normalized || actual.endsWith(`/${normalized}`);
}

/**
 * 选择器语法：`<文件路径> > <标题>`。标题按「前缀」匹配——测试标题常带
 * 尾部的解释性从句，前缀比对全文更稳。
 */
function splitSelector(selector) {
  const index = selector.indexOf(">");
  if (index === -1) return null;
  return {
    path: selector.slice(0, index).trim(),
    title: selector.slice(index + 1).trim(),
  };
}

function titleMatches(actual, expected) {
  if (expected === "") return true;
  const a = actual.replace(/\s+/gu, " ").trim();
  const e = expected.replace(/\s+/gu, " ").trim();
  return a === e || a.startsWith(e);
}

/* ── 主流程 ─────────────────────────────────────────────────────────────── */

function loadMapping(root, mapPath) {
  const absolute = resolve(root, mapPath);
  if (!existsSync(absolute)) {
    console.error(`[openlogos-reporter] 映射表不存在：${mapPath}`);
    process.exit(1);
  }
  const parsed = readJsonIfExists(absolute);
  if (!parsed || typeof parsed !== "object") {
    console.error(`[openlogos-reporter] 映射表无法解析：${mapPath}`);
    process.exit(1);
  }
  const cases = parsed.cases ?? {};
  if (typeof cases !== "object" || Array.isArray(cases)) {
    console.error(`[openlogos-reporter] 映射表缺少 cases 对象：${mapPath}`);
    process.exit(1);
  }
  return cases;
}

function gatherRawRecords(root) {
  const vitest = [];
  const e2e = [];
  const rust = [];
  for (const relative of RAW_SOURCES.vitest) {
    const raw = readJsonIfExists(resolve(root, relative));
    if (raw) vitest.push(...collectVitest(raw));
  }
  for (const relative of RAW_SOURCES.e2e) {
    const raw = readJsonIfExists(resolve(root, relative));
    if (raw) e2e.push(...collectPlaywright(raw));
  }
  for (const relative of RAW_SOURCES.rust) {
    const absolute = resolve(root, relative);
    if (!existsSync(absolute)) continue;
    const text = readFileSync(absolute, "utf8");
    if (relative.endsWith(".json")) {
      rust.push(...collectRustNextest(text));
    } else {
      rust.push(...collectRustText(text));
    }
  }
  return { vitest, e2e, rust };
}

function matchCase(caseId, selectors, records) {
  let status = null;
  let durationMs;
  let error;
  let matched = 0;

  for (const selector of selectors.vitest ?? []) {
    const parsed = splitSelector(selector);
    for (const record of records.vitest) {
      const pathOk = parsed ? pathMatches(record.file, parsed.path) : false;
      const titleOk = parsed ? titleMatches(record.fullName, parsed.title) : true;
      if (!pathOk || !titleOk) continue;
      matched += 1;
      status = worseStatus(status ?? "pass", record.status);
      durationMs = (durationMs ?? 0) + (record.durationMs ?? 0);
      if (record.error && !error) error = record.error;
    }
  }

  for (const selector of selectors.e2e ?? []) {
    const parsed = splitSelector(selector);
    for (const record of records.e2e) {
      const pathOk = parsed ? pathMatches(record.file, parsed.path) : false;
      const titleOk = parsed ? titleMatches(record.title, parsed.title) : true;
      if (!pathOk || !titleOk) continue;
      matched += 1;
      status = worseStatus(status ?? "pass", record.status);
      durationMs = (durationMs ?? 0) + (record.durationMs ?? 0);
      if (record.error && !error) error = record.error;
    }
  }

  for (const selector of selectors.rust ?? []) {
    for (const record of records.rust) {
      const nameOk = titleMatches(record.testId, selector) || record.testId.endsWith(selector);
      if (!nameOk) continue;
      matched += 1;
      status = worseStatus(status ?? "pass", record.status);
      durationMs = (durationMs ?? 0) + (record.durationMs ?? 0);
      if (record.error && !error) error = record.error;
    }
  }

  return { status, durationMs, error, matched };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const cases = loadMapping(options.root, options.map);
  const records = gatherRawRecords(options.root);

  const lines = [];
  const unmatched = [];
  const invalid = [];
  const timestamp = new Date().toISOString();

  for (const [caseId, selectors] of Object.entries(cases)) {
    if (!CASE_ID_RE.test(caseId)) {
      invalid.push(caseId);
      continue;
    }
    const outcome = matchCase(caseId, selectors ?? {}, records);
    if (outcome.matched === 0) {
      unmatched.push(caseId);
      continue;
    }
    const record = {
      id: caseId,
      status: outcome.status ?? "pass",
      timestamp,
    };
    if (outcome.durationMs) record.duration_ms = Math.round(outcome.durationMs);
    if (outcome.status === "fail") record.error = outcome.error ?? "测试失败";
    const scenario = /^(?:UT|ST)-(S\d{2})/u.exec(caseId);
    if (scenario) record.scenario = scenario[1];
    lines.push(JSON.stringify(record));
  }

  const outPath = resolve(options.root, options.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.length > 0 ? `${lines.join("\n")}\n` : "");

  const covered = lines.length;
  const total = Object.keys(cases).length;
  console.log(`[openlogos-reporter] 用例 ${total}，已产出结果 ${covered}，未匹配 ${unmatched.length}`);
  if (invalid.length > 0) {
    console.error(`[openlogos-reporter] 映射表中 ${invalid.length} 个非法 id（已跳过）：${invalid.slice(0, 5).join(", ")}`);
  }
  if (unmatched.length > 0) {
    console.error(
      `[openlogos-reporter] ${unmatched.length} 个用例没有匹配到任何测试（不会写入 JSONL，verify 将报 uncovered）：${unmatched.slice(0, 10).join(", ")}${unmatched.length > 10 ? " …" : ""}`,
    );
  }
}

main();
