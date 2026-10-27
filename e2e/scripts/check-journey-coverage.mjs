#!/usr/bin/env node
/**
 * E2E journey coverage checker (the OS's, for the CRM).
 *
 * Validates that:
 *   1. every spec file listed in e2e/coverage.json exists in e2e/journeys/;
 *   2. every checkpoint id in the registry heads a test title in its spec, and
 *      every id in a spec is in the registry;
 *   3. with --no-regress, the checkpoint and journey counts have not dropped
 *      against a base ref (default origin/main);
 *   4. changed app/ and components/ files (or every app/**\/page.tsx with
 *      --all) are named in some journey's sourceFiles — an unmapped page fails,
 *      an unmapped component warns.
 *
 * Exit codes: 0 all good · 1 gaps · 2 script error.
 *
 *   node e2e/scripts/check-journey-coverage.mjs             # diff vs origin/main
 *   node e2e/scripts/check-journey-coverage.mjs --all       # every page (CI)
 *   node e2e/scripts/check-journey-coverage.mjs --no-regress [--base <ref>]
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const APP_DIR = join(REPO_ROOT, "app");
const COVERAGE_JSON = join(REPO_ROOT, "e2e", "coverage.json");
const JOURNEYS_DIR = join(REPO_ROOT, "e2e", "journeys");

/** Files that need no journey of their own. */
const EXCLUDED_PATTERNS = [
  /\/layout\.tsx$/,
  /\/loading\.tsx$/,
  /\/not-found\.tsx$/,
  /\/global-error\.tsx$/,
  /^app\/api\//,
  /\.test\.(ts|tsx)$/,
  /\.d\.ts$/,
  // The SSO landing is driven by e2e/auth.setup.ts, not by a journey.
  /^app\/sso-login-complete\//,
  // shadcn primitives and the brand files carry no behaviour of their own.
  /^components\/ui\//,
];

const R = "\x1b[31m";
const G = "\x1b[32m";
const Y = "\x1b[33m";
const B = "\x1b[34m";
const NC = "\x1b[0m";
const err = (m) => console.error(`${R}  ${m}${NC}`);
const ok = (m) => console.log(`${G}  ${m}${NC}`);
const warn = (m) => console.log(`${Y}  ${m}${NC}`);
const info = (m) => console.log(`${B}  ${m}${NC}`);

function loadCoverage() {
  if (!existsSync(COVERAGE_JSON)) {
    err(`coverage.json not found at ${COVERAGE_JSON}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(COVERAGE_JSON, "utf8"));
}

function loadBaseCoverage(base) {
  try {
    return JSON.parse(
      execSync(`git show ${base}:e2e/coverage.json`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    return null;
  }
}

const countCheckpoints = (coverage) =>
  coverage.journeys.reduce((n, j) => n + (j.checkpoints ?? []).length, 0);

/** Every `<prefix>-NN` heading a test title in a spec file. */
function idsInSpec(file) {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/\btest(?:\.(?:fixme|skip|only))?\(\s*["'`]([a-z0-9]+-\d{2}):/g)].map(
    (m) => m[1],
  );
}

function getChangedFiles(base) {
  for (const cmd of [
    `git diff --name-only ${base}...HEAD -- app/ components/`,
    "git diff --name-only HEAD~1 -- app/ components/",
  ]) {
    try {
      const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      return out ? out.split("\n") : [];
    } catch {
      // the next form
    }
  }
  return [];
}

function getAllAppPages(dir = APP_DIR) {
  const pages = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) pages.push(...getAllAppPages(full));
    else if (entry.name === "page.tsx") pages.push(relative(REPO_ROOT, full));
  }
  return pages;
}

const isExcluded = (file) => EXCLUDED_PATTERNS.some((p) => p.test(file));

function main() {
  const args = process.argv.slice(2);
  const checkAll = args.includes("--all");
  const noRegress = args.includes("--no-regress");
  const baseIdx = args.indexOf("--base");
  const base = baseIdx !== -1 ? args[baseIdx + 1] : "origin/main";

  info("CRM e2e journey coverage check");
  const coverage = loadCoverage();
  let exitCode = 0;

  // 1. Spec files exist.
  const missing = coverage.journeys.filter((j) => !existsSync(join(JOURNEYS_DIR, j.spec)));
  for (const j of missing)
    err(`Journey "${j.name}" names ${j.spec}, which is not in e2e/journeys/`);
  if (missing.length) process.exit(1);
  ok(`All ${coverage.journeys.length} spec files exist`);

  // 2. Ids in the registry ⇄ ids in the specs.
  let idGaps = 0;
  for (const j of coverage.journeys) {
    const inSpec = new Set(idsInSpec(join(JOURNEYS_DIR, j.spec)));
    const inRegistry = new Set((j.checkpoints ?? []).map((c) => c.id));
    for (const id of inRegistry) {
      if (!inSpec.has(id)) {
        err(`${j.spec}: checkpoint ${id} is in coverage.json but heads no test title`);
        idGaps++;
      }
    }
    for (const id of inSpec) {
      if (!inRegistry.has(id)) {
        err(`${j.spec}: test ${id} is not in coverage.json`);
        idGaps++;
      }
    }
  }
  const registered = new Set(coverage.journeys.map((j) => j.spec));
  for (const file of readdirSync(JOURNEYS_DIR).filter((f) => f.endsWith(".spec.ts"))) {
    if (!registered.has(file)) {
      err(`${file} is not registered in coverage.json`);
      idGaps++;
    }
  }
  if (idGaps) exitCode = 1;
  else ok(`${countCheckpoints(coverage)} checkpoints match their test titles`);

  // 3. No regression against the base.
  if (noRegress) {
    const before = loadBaseCoverage(base);
    if (!before) warn(`Could not load ${base}:e2e/coverage.json — skipping the regression check`);
    else {
      const [b, c] = [countCheckpoints(before), countCheckpoints(coverage)];
      if (c < b) {
        err(
          `Coverage REGRESSION: checkpoints ${b} → ${c}; replace removed checkpoints or mark them deprecated`,
        );
        exitCode = 1;
      } else
        ok(
          c > b
            ? `Coverage improved: ${b} → ${c} checkpoints`
            : `Coverage unchanged: ${c} checkpoints`,
        );
      if (coverage.journeys.length < before.journeys.length) {
        err(`Journey REGRESSION: ${before.journeys.length} → ${coverage.journeys.length}`);
        exitCode = 1;
      }
    }
  }

  // 4. Source files map to a journey.
  const sourceMap = new Map();
  for (const j of coverage.journeys)
    for (const src of j.sourceFiles ?? [])
      sourceMap.set(src, [...(sourceMap.get(src) ?? []), j.spec]);
  const files = checkAll ? getAllAppPages() : getChangedFiles(base);
  const relevant = files.filter(
    (f) => (f.endsWith("/page.tsx") || f.startsWith("components/")) && !isExcluded(f),
  );
  if (relevant.length === 0)
    ok(checkAll ? "No app pages to check" : "No user-facing files changed");
  const uncovered = relevant.filter((f) => !sourceMap.has(f));
  for (const f of relevant.filter((f) => sourceMap.has(f)))
    ok(`${f}  →  ${sourceMap.get(f).join(", ")}`);
  for (const f of uncovered) {
    if (f.endsWith("/page.tsx")) {
      err(
        `${f} is in no journey's sourceFiles — add it to e2e/coverage.json and a test to the journey`,
      );
      exitCode = 1;
    } else warn(`${f} is in no journey's sourceFiles`);
  }

  if (exitCode === 0) ok("Every user-facing file is covered by a journey");
  else err("Coverage check failed");
  process.exit(exitCode);
}

main();
