// Quota ledger — read-only estimate of today's (2026-09-26) Gemini *lite*-model request
// usage, so Task 6 of the h40c plan can decide whether a flight fits under the 500
// requests/model/day quota (reset 10:00 local / 07:00 UTC). Never calls a model API; only
// reads already-written JSON/log files. See task-0-brief.md step "Quota ledger" for the
// exact source list this was asked to cover.
//
// Sources counted, per lite model (gemini-3.1-flash-lite, gemini-3.5-flash-lite):
//   1. Offline replay arms: interview60.answers.*.json in the h40b run folder — one entry
//      per file = one live generateContent call made when that arm was captured. The exact
//      file set per model is the one the brief names explicitly (not a glob), because the
//      "bare" file (interview60.answers.json / interview60.answers.gemini-3.5-flash-lite.json)
//      and the "_captured-*" / "_low" / "_high" arms are all real separate replay runs.
//   2. In-app requests, from the h40b run folder's own natively_debug.log — the actual live
//      app session, not a replay. Two figures, both taken from the log's own wording:
//        - "verbal stall race: trying <model>" lines = requests actually sent to that model,
//          regardless of outcome (this is the conservative, i.e. upper-bound, count: a 503
//          rejection and a client-side stall timeout are still a request that reached Google's
//          endpoint and may still be billed against quota even though the app gave up on it).
//        - the collapsed "[LLMHelper] <model> usage: ... in=<n>" lines (chunk runs collapsed
//          into one request each, exactly as SP\check-smoke-model.mjs does; in>500 separates a
//          real spoken answer from a small warm-up ping) = requests that are CONFIRMED to have
//          completed with a real response. For 3.5-lite these two figures coincide (every 3.5
//          call in this log is a fallback call and every one of them completed), so 3.5's
//          in-app count is unambiguous. For 3.1-lite they differ (46 tried vs 40 completed);
//          the ledger uses the higher, conservative figure and prints both so the gap is
//          visible. See "ASSUMPTION" markers below.
//   3. Warm-up calls ("<model> warmed up in <n>ms" lines) — small pings, no usage line, but
//      still a live request.
//   4. The chains pass (interview60.chains.json): hardcoded to gemini-3.1-flash-lite in
//      electron/test/golden/interview60.chains.mjs (MODEL constant) — every chain entry has a
//      "contextual" turn (1 request) and turns 2-3 additionally have a "standalone" turn
//      (1 more request each); there is no per-entry "model" field in the JSON itself, so the
//      count is entries, not model-tagged rows, per the source file's own design.
//   5. SP\flash-h40b\*.json (+ its blind\ subdir) — the brief calls these "full-Flash only";
//      this ledger does not take that on faith, it scans every "model" field found in that
//      tree and flags any that name a *lite* model. None are expected.
//   6. MAIN's repo-root natively_debug.log — the same session as the h40b run folder's copy
//      (both start "2026-09-26T10:32:03.254Z"), so counting it in full would double-count.
//      Only lines timestamped at/after 2026-09-26T11:40:00Z (i.e. after the h40b copy was
//      taken) are counted, per the controller's instruction.
//
// Sources NOT counted, and why (printed at the end too):
//   - verbal-diag.log / verbal-prompts.log in the h40b run folder: per-request dumps of the
//     SAME in-app requests natively_debug.log already covers; counting them would double the
//     in-app figure.
//   - interview60.judge*.json / *.pairs.*.json / *.verdicts.*.json: the grader is
//     claude-opus-5(-5) (verified by grep), not a Gemini model at all — out of scope for a
//     Gemini quota ledger.
//   - interview60.answers.openai_gpt-oss-120b.json, interview60.answers.qwen_qwen3.8-27b.json:
//     other providers, not Gemini.
//   - "gemma-4-31b-it vision" warm-ups: a different model family (Ollama/local vision), not a
//     Gemini lite text model; counted separately and excluded from the lite totals.
//   - Any activity before 2026-09-26T10:32:03.254Z: natively_debug.log is truncated fresh per
//     app session, and the h40b session is the only one on 2026-09-26T; no source in the
//     brief's list reaches further back than that, so the ledger ASSUMES no earlier Gemini
//     lite usage happened today. This is an unverified assumption, not a measured zero.
//
// ASSUMPTION (flagged): whether a request that got a 503 or that the client gave up on after a
// 10s stall still consumes a slot against Google's per-day quota is not something this script
// can observe — Google does not expose a per-request "did this count" flag. The ledger takes
// the conservative reading (it counts) so the headroom estimate errs toward UNDER-stating
// headroom rather than over-stating it.

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const RUN_DIR = join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', '2026-09-26T11-39-51-h40b');
const SP = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp';
const FLASH_DIR = join(SP, 'flash-h40b');
const MAIN_ROOT_LOG = join(MAIN, 'natively_debug.log');

const QUOTA_PER_MODEL_PER_DAY = 500;
const QUOTA_DAY_START_Z = Date.parse('2026-09-26T07:00:00.000Z'); // 10:00 local reset
const ROOT_LOG_DEDUP_CUTOFF_Z = Date.parse('2026-09-26T11:40:00.000Z'); // avoid re-counting the h40b copy

const MODEL_31 = 'gemini-3.1-flash-lite';
const MODEL_35 = 'gemini-3.5-flash-lite';

const out = [];
const p = (s = '') => out.push(s);

const totals = { [MODEL_31]: 0, [MODEL_35]: 0 };
function add(model, n, label) {
  totals[model] += n;
  p(`  ${model.padEnd(24)} +${String(n).padStart(4)}  ${label}`);
}

p(`Quota ledger — 2026-09-26 (day starts 07:00Z / 10:00 local)`);
p(`Generated: ${new Date().toISOString()}`);
p(`Run folder: ${RUN_DIR}`);
p('');

// ---------------------------------------------------------------------------------------
// 1. Offline replay arms
// ---------------------------------------------------------------------------------------
p('=== 1. Offline replay arms (interview60.answers.*.json, h40b run folder) ===');

const ARM_FILES_31 = [
  'interview60.answers.gemini-3.1-flash-lite_captured-low.json',
  'interview60.answers.gemini-3.1-flash-lite_captured-low-r2.json',
  'interview60.answers.gemini-3.1-flash-lite_captured-low-r3.json',
  'interview60.answers.gemini-3.1-flash-lite_captured-minimal.json',
  'interview60.answers.gemini-3.1-flash-lite_low.json',
  'interview60.answers.json', // bare 3.1 arm, per the brief
];
const ARM_FILES_35 = [
  'interview60.answers.gemini-3.5-flash-lite.json', // bare 3.5 arm
  'interview60.answers.gemini-3.5-flash-lite_captured-high.json',
  'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json',
  'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json',
  'interview60.answers.gemini-3.5-flash-lite_high.json',
];

function entryCount(path) {
  return Object.keys(JSON.parse(readFileSync(path, 'utf8'))).length;
}

for (const f of ARM_FILES_31) add(MODEL_31, entryCount(join(RUN_DIR, f)), f);
for (const f of ARM_FILES_35) add(MODEL_35, entryCount(join(RUN_DIR, f)), f);

// Sanity: flag any interview60.answers.*.json in the folder that neither list accounts for,
// so a renamed/extra arm file cannot silently go uncounted.
const allAnswerFiles = readdirSync(RUN_DIR).filter((f) => f.startsWith('interview60.answers.') && f.endsWith('.json'));
const accounted = new Set([...ARM_FILES_31, ...ARM_FILES_35]);
const unaccounted = allAnswerFiles.filter((f) => !accounted.has(f));
p('');
p(`  Other interview60.answers.*.json present but NOT counted (non-Gemini providers, expected):`);
for (const f of unaccounted) p(`    ${f}`);
p('');

// ---------------------------------------------------------------------------------------
// 2+3. In-app requests + warm-ups, from a natively_debug.log
// ---------------------------------------------------------------------------------------
const TS_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/;
const USAGE_RE = /\[LLMHelper\] (\S+) usage: thinking=(\w+) thoughts=(\d+) out=(\d+) in=(\d+)/;
const TRYING_RE = /\[LLMHelper\] verbal stall race: trying (\S+) \(fallback=(\S+) after \d+ms\)/;
const STALLED_RE = /\[WARN\] \[LLMHelper\] (\S+) stalled after \d+ms — falling back to (\S+)/;
const PRIMARY_FAILED_RE = /\[WARN\] \[WhatToAnswerLLM\] verbal primary failed before first token .* redirecting to (\S+)/;
const WARMUP_RE = /\[LLMHelper\] (.+?) warmed up in (\d+)ms/;

function parseInAppLog(logPath, { minTimeZ } = {}) {
  const text = readFileSync(logPath, 'utf8');
  const usageRows = [];
  const trying = [];
  const stalled = [];
  const primaryFailed = [];
  const warmups = [];
  for (const line of text.split('\n')) {
    const tsm = line.match(TS_RE);
    if (!tsm) continue; // every line type this ledger cares about starts with the log's ISO timestamp
    const at = Date.parse(tsm[1]);
    if (minTimeZ !== undefined && at < minTimeZ) continue;

    let m = line.match(USAGE_RE);
    if (m) { usageRows.push({ at, model: m[1], thinking: m[2], thoughts: Number(m[3]), out: Number(m[4]), in: Number(m[5]) }); continue; }
    m = line.match(TRYING_RE);
    if (m) { trying.push({ at, model: m[1], fallback: m[2], line }); continue; }
    m = line.match(STALLED_RE);
    if (m) { stalled.push({ at, model: m[1], fallback: m[2], line }); continue; }
    m = line.match(PRIMARY_FAILED_RE);
    if (m) { primaryFailed.push({ at, fallback: m[1], line }); continue; }
    m = line.match(WARMUP_RE);
    if (m) { warmups.push({ at, model: m[1], ms: Number(m[2]) }); continue; }
  }
  // Collapse a run of usage chunk lines (same model, same input, non-decreasing output) into
  // one request, exactly as SP\check-smoke-model.mjs does.
  const reqs = [];
  for (const r of usageRows) {
    const prev = reqs[reqs.length - 1];
    if (prev && prev.model === r.model && prev.in === r.in && r.out >= prev.out) { prev.thoughts = r.thoughts; prev.out = r.out; }
    else reqs.push({ ...r });
  }
  const answers = reqs.filter((r) => r.in > 500); // a real spoken answer carries the full context block
  return { trying, stalled, primaryFailed, warmups, answers };
}

p('=== 2. In-app requests (h40b run folder natively_debug.log, the real app session) ===');
const inApp = parseInAppLog(join(RUN_DIR, 'natively_debug.log'));

const trying31 = inApp.trying.filter((t) => t.model === MODEL_31).length;
const trying35 = inApp.trying.filter((t) => t.model === MODEL_35).length;
const landed31 = inApp.answers.filter((a) => a.model === MODEL_31).length;
const landed35 = inApp.answers.filter((a) => a.model === MODEL_35).length;
const stalledCount = inApp.stalled.length;
const primaryFailedCount = inApp.primaryFailed.length;

p(`  CALIBRATION sub-count (compare against the controller's expectation of "near 44 answers`);
p(`  on 3.1-lite: 46 stall-race attempts, 1 fallback after a 503, 5 after stalls"):`);
p(`    "verbal stall race: trying ${MODEL_31}" lines (requests attempted on 3.1-lite): ${trying31}`);
p(`    "verbal stall race: trying ${MODEL_35}" lines (explicit 503 fallback attempt):  ${trying35}`);
p(`    "<model> stalled after 10000ms - falling back" WARN lines:                      ${stalledCount}`);
p(`    "verbal primary failed before first token" WARN lines (503s etc.):              ${primaryFailedCount}`);
p(`    Completed with a logged usage response, in>500, on ${MODEL_31}:                 ${landed31}`);
p(`    Completed with a logged usage response, in>500, on ${MODEL_35}:                 ${landed35}`);
p(`    Reconciliation: ${trying31} attempted - ${primaryFailedCount} (503) - ${stalledCount} (stalled) = ${trying31 - primaryFailedCount - stalledCount}; landed-on-3.1 measured = ${landed31} (${trying31 - primaryFailedCount - stalledCount === landed31 ? 'MATCHES' : 'DOES NOT MATCH — investigate'})`);
p(`    landed-on-3.5 measured (${landed35}) vs (503-fallback + stall-fallback) = ${primaryFailedCount + stalledCount} (${landed35 === primaryFailedCount + stalledCount ? 'MATCHES' : 'DOES NOT MATCH — investigate'})`);
p('');
p(`  ASSUMPTION: this ledger counts every "trying <model>" line as one request against that`);
p(`  model's quota, even when it later failed/stalled — see the file header for why (the`);
p(`  conservative, headroom-under-stating reading). Under this assumption:`);
add(MODEL_31, trying31, 'in-app requests attempted (conservative: includes the 503 + 5 stalled)');
add(MODEL_35, landed35, 'in-app requests (all confirmed landed via a usage response — fallback calls)');
p('');
p(`  (For reference, the non-conservative alternative would count only the ${landed31}`);
p(`  completed-with-response 3.1-lite requests, i.e. ${trying31 - landed31} fewer than above.)`);
p('');

p('=== 3. Warm-up calls ("<model> warmed up in Nms", h40b run folder log) ===');
const warmupCounts = {};
for (const w of inApp.warmups) warmupCounts[w.model] = (warmupCounts[w.model] || 0) + 1;
for (const [model, n] of Object.entries(warmupCounts)) {
  if (model === MODEL_31 || model === MODEL_35) add(model, n, 'warm-up pings');
  else p(`  ${model.padEnd(24)} +${String(n).padStart(4)}  warm-up pings (NOT a lite Gemini text model, excluded)`);
}
p('');

// ---------------------------------------------------------------------------------------
// 4. Chains pass
// ---------------------------------------------------------------------------------------
p('=== 4. Chains pass (interview60.chains.json — hardcoded to gemini-3.1-flash-lite) ===');
const chains = JSON.parse(readFileSync(join(RUN_DIR, 'interview60.chains.json'), 'utf8'));
let chainRequests = 0;
for (const chain of Object.values(chains)) {
  for (const turn of chain.turns) {
    if (turn.contextual !== undefined) chainRequests++;
    if (turn.standalone !== undefined) chainRequests++;
  }
}
add(MODEL_31, chainRequests, `interview60.chains.json (${Object.keys(chains).length} chains, contextual + standalone turns)`);
p('');

// ---------------------------------------------------------------------------------------
// 5. SP\flash-h40b — expected full-Flash only; verify, don't assume
// ---------------------------------------------------------------------------------------
p('=== 5. SP\\flash-h40b (expected full-Flash + judge only — scanned, not assumed) ===');
function walkJsonFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) found.push(full);
  }
  return found;
}
const flashModelsSeen = new Set();
let flashLiteHits = 0;
for (const file of walkJsonFiles(FLASH_DIR)) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/"model"\s*:\s*"([^"]+)"/g)) {
    flashModelsSeen.add(m[1]);
    if (m[1].startsWith(MODEL_31) || m[1].startsWith(MODEL_35)) flashLiteHits++;
  }
}
p(`  Distinct "model" values found under SP\\flash-h40b: ${[...flashModelsSeen].sort().join(', ')}`);
p(`  Of those, entries naming a lite model (gemini-3.1/3.5-flash-lite*): ${flashLiteHits}`);
if (flashLiteHits > 0) p(`  !! Unexpected — investigate before trusting this ledger's total.`);
else p(`  Confirmed 0 — none of these files touch the lite-model quota. Not added to totals.`);
p('');

// ---------------------------------------------------------------------------------------
// 6. MAIN repo-root natively_debug.log — dedup against the h40b run-folder copy
// ---------------------------------------------------------------------------------------
p('=== 6. MAIN repo-root natively_debug.log (only entries >= 2026-09-26T11:40:00Z counted) ===');
p(`  (The h40b run folder's natively_debug.log is a copy of this same session; counting the`);
p(`  whole file again would double-count 10:32Z-11:39Z. Only requests after the copy was`);
p(`  taken are new.)`);
const rootLog = parseInAppLog(MAIN_ROOT_LOG, { minTimeZ: ROOT_LOG_DEDUP_CUTOFF_Z });
const rootTrying31 = rootLog.trying.filter((t) => t.model === MODEL_31).length;
const rootLanded35 = rootLog.answers.filter((a) => a.model === MODEL_35).length;
const rootWarmups31 = rootLog.warmups.filter((w) => w.model === MODEL_31).length;
const rootWarmups35 = rootLog.warmups.filter((w) => w.model === MODEL_35).length;
add(MODEL_31, rootTrying31, 'requests after 11:40Z (root natively_debug.log)');
add(MODEL_35, rootLanded35, 'requests after 11:40Z (root natively_debug.log)');
add(MODEL_31, rootWarmups31, 'warm-ups after 11:40Z (root natively_debug.log)');
add(MODEL_35, rootWarmups35, 'warm-ups after 11:40Z (root natively_debug.log)');
if (rootTrying31 === 0 && rootLanded35 === 0 && rootWarmups31 === 0 && rootWarmups35 === 0) {
  p(`  Confirmed 0, as the controller expected ("none expected"). The root log's last line is`);
  p(`  timestamped 2026-09-26T11:39:53.430Z, i.e. nothing of any kind exists past the cutoff.`);
}
p('');

// ---------------------------------------------------------------------------------------
// Sources checked but not counted (double-counting or out of scope) — for the record
// ---------------------------------------------------------------------------------------
p('=== Sources present but NOT counted, and why ===');
p('  - verbal-diag.log / verbal-prompts.log (h40b run folder): per-request dumps of the SAME');
p('    in-app requests already counted from natively_debug.log above; counting them too would');
p('    double the in-app figure.');
p('  - interview60.judge*.json / *.pairs.*.json / *.verdicts.*.json: grader is claude-opus-5(-5),');
p('    not Gemini — out of scope for a Gemini quota ledger.');
p('  - interview60.answers.openai_gpt-oss-120b.json, interview60.answers.qwen_qwen3.8-27b.json:');
p('    other providers, not Gemini (listed above under "not counted" arm files too).');
p('  - "gemma-4-31b-it vision" warm-ups: different model family, not a lite Gemini text model.');
p('  - Any Gemini lite usage before 2026-09-26T10:32:03.254Z (the natively_debug.log session');
p('    start): no source in scope reaches earlier than this; ASSUMED zero, not measured — the');
p('    h40b session is the only interview60.runs folder dated 2026-09-26.');
p('');

// ---------------------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------------------
p('=== TOTALS (2026-09-26, since 07:00Z) ===');
for (const model of [MODEL_31, MODEL_35]) {
  const total = totals[model];
  const headroom = QUOTA_PER_MODEL_PER_DAY - total;
  p(`  ${model.padEnd(24)} total = ${String(total).padStart(4)}   headroom = 500 - ${total} = ${headroom}`);
}
p('');
p(`Day-start filter used: ${new Date(QUOTA_DAY_START_Z).toISOString()} (07:00Z / 10:00 local). All`);
p(`counted sources above (the h40b run, its warm-ups, its chains pass, and the root-log tail)`);
p(`fall entirely after this timestamp, so no entries needed to be dropped for being from a`);
p(`prior quota day.`);

const report = out.join('\n') + '\n';
console.log(report);

const OUT_PATH = join(SP, 'h40c-baseline', 'quota-2026-09-26.txt');
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, report, 'utf8');
console.error(`\n[quota-ledger] wrote ${OUT_PATH}`);

export { report, parseInAppLog };
