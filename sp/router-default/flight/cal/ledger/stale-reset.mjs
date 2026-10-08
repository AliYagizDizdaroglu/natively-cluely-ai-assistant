// Read-only quota ledger for TODAY's lite-model quota day (reset 10:00 local = 07:00Z), for h40c's
// rule "fly on a quota day with no replay or smoke run scheduled on it, or check the day's quota
// ledger first" (tomorrow's 05:00 cue smoke shares this quota day). Never calls a model API.
// Sources: (1) every natively_debug.log AND natively_debug.log.1 an app on this machine writes (MAIN, the whole-turn worktree and the
// live-router worktree), counting ONE per outgoing request, from the app's own per-request markers, for lines stamped at/after the reset
// (router-default fix1, B1: the old rule counted every line naming a model, about 9 lines per request, and read a day with ~460 requests of
// headroom as ~110). The markers (LLMHelper.ts streamGeminiWithHedge / warmupGeminiFlash):
//   `[LLMHelper] verbal hedge: front=<M> back=<B> trigger=` once per hedge run, written right before the front leg is sent: ONE request on <M>;
//   `[LLMHelper] verbal hedge: back started at ` once per back leg, written right before it is sent: ONE request on the back model (3.1-lite);
//   `[LLMHelper] <M> warmed up in ` / `<M> warmup failed` once per warm-up or heartbeat ping: ONE request on <M>, success or not.
// Not counted, because the app writes no per-request marker for them: any non-hedge Gemini stream (typed chat, a hedge-off stall race) and any
// call made by a SCRIPT (probes, bare arms, replays, graders): those never reach an app log. Section 2 only lists such files; the guard's r7
// adds an `--extra-requests <n>` term, which the arming step fills in from the smoke and probe records, and refuses without it.
// (2) every file written since the reset under the golden folders, their run folders and the scratchpad (depth 2) whose name suggests a pass
// that calls a model, so an unlogged replay or probe cannot hide.
// Run copies (ledger-fix5): the harness keeps a copy of natively_debug.log in every run folder (<loc>/electron/test/golden/interview60.runs/*/natively_debug.log),
// so the day's early lines survive the app-start rotation there. Those copies are read too. CAVEAT (stated in the report): "complete" means SOME source holds a line older than the reset;
// a copy that ends BEFORE the reset satisfies that without covering the hours between it and the oldest live line, so complete=yes proves no more than that.
// The sources of one location OVERLAP (a line is in the live log and in a run copy), so they are merged as a MULTISET UNION by line identity (the full line, timestamp
// included): a line counts max(its occurrences in any ONE source), not the sum, and two genuinely identical lines inside one file both stay. `complete` is computed over
// the union: some source has a line older than the reset.
// Coverage (fix1, I1): every app start renames natively_debug.log to .log.1 and deletes the previous .log.1, so a log chain can have LOST the
// start of the quota day. Per location the oldest stamp covered (over the union of its sources) is printed; a location that has lines at/after the reset but whose oldest
// covered stamp is AFTER the reset is `complete=no`, and the summary says so (r7 refuses). A location with no line in the day cannot have lost one.
import fs from 'node:fs';
import path from 'node:path';

// The quota day resets at 07:00:00.000Z; DAY_START is the most recent reset at or before NOW.
// `--now <ISO>` overrides the clock and exists only for calibration (quota-ledger-cal.mjs).
const arg = (k) => { const i = process.argv.indexOf(k); return i === -1 ? undefined : process.argv[i + 1]; };
const nowArg = arg('--now');
const NOW = nowArg === undefined ? Date.now() : Date.parse(nowArg ?? '');
if (Number.isNaN(NOW)) { console.error('--now needs an ISO timestamp'); process.exit(2); }
const DAY_MS = 86400000;
const midnight = Math.floor(NOW / DAY_MS) * DAY_MS;
const DAY_START = Date.parse("2026-10-05T07:00:00Z");
// `--main <dir>` points the three app-log and golden sources at a stub tree; it exists only for calibration (quota-ledger-cal.mjs).
const MAIN = arg('--main') === undefined ? 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant' : arg('--main').replace(/\\/g, '/');
// `--extra-requests <n>`: requests the app logs cannot see (script-run probes, bare arms, replays), charged to BOTH lite models (conservative).
// Unset prints extra=unset and r7 refuses it.
const extraArg = arg('--extra-requests');
if (extraArg !== undefined && !/^\d{1,4}$/.test(extraArg)) { console.error('--extra-requests needs a whole number'); process.exit(2); }
const EXTRA = extraArg === undefined ? null : Number(extraArg);
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
// router-default build: the live-router integration worktree writes its own natively_debug.log (spec 10.1: both app logs are sources)
const LR = `${MAIN}/.claude/worktrees/live-router`;
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const CAP = 500;   // lite requests per model per quota day (memory project_gemini_quota, measured 2026-09-25)
const M35 = 'gemini-3.5-flash-lite', M31 = 'gemini-3.1-flash-lite';
const MARK_FRONT = /\[LLMHelper\] verbal hedge: front=(gemini-3\.[15]-flash-lite) back=(gemini-3\.[15]-flash-lite) trigger=/;
const MARK_BACK = /\[LLMHelper\] verbal hedge: back started at /;
const MARK_WARM = /\[LLMHelper\] (gemini-3\.[15]-flash-lite) (?:warmed up in |warmup failed)/;
const LITE = /gemini-3\.[15]-flash-lite/g;
// informational only: `usage:` is written once per finished STREAM and a hedge run's legs, retries and chunks make it ~6 lines per request;
// it is NOT a request count and nothing gates on it
const USAGE = /\[LLMHelper\] (gemini-3\.[15]-flash-lite) usage:/;

console.log(`reset ${new Date(DAY_START).toISOString()} (10:00 local); now ${new Date(NOW).toISOString()}`);
console.log('\n1. app logs (natively_debug.log and .log.1 of each location): requests sent since the reset, one per request marker');
const sent = {}, mentions = {}, usageLines = {};
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
let oldestAll = null;
let complete = true;
for (const loc of [MAIN, WT, LR]) {
    const files = [`${loc}/natively_debug.log`, `${loc}/natively_debug.log.1`];
    // every run copy (an older copy adds only lines before the reset: they count for coverage, never for the day's requests)
    const runsDir = `${loc}/electron/test/golden/interview60.runs`;
    let copies = 0;
    try {
        for (const e of fs.readdirSync(runsDir, { withFileTypes: true })) {
            if (!e.isDirectory()) continue;
            const cf = `${runsDir}/${e.name}/natively_debug.log`;
            try { if (fs.statSync(cf).isFile()) { files.push(cf); copies++; } } catch { /* no copy in this run folder */ }
        }
    } catch { /* no run folders here */ }
    const union = new Map();   // line -> max occurrences in any ONE source (de-duplication by line identity)
    const stampOf = (l) => Date.parse(l.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/)?.[1] ?? '');
    let present = 0, rawStamped = 0;
    for (const f of files) {
        if (!fs.existsSync(f)) { if (!f.includes('/interview60.runs/')) console.log(`  ${f}: absent`); continue; }
        present++;
        const own = new Map();
        for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
            const line = l.replace(/\r$/, '');
            if (Number.isNaN(stampOf(line))) continue;
            own.set(line, (own.get(line) ?? 0) + 1);
            rawStamped++;
        }
        if (!f.includes('/interview60.runs/')) console.log(`  ${path.relative(MAIN, f) || f}: ${[...own.values()].reduce((x, y) => x + y, 0)} stamped lines`);
        for (const [line, n] of own) if (n > (union.get(line) ?? 0)) union.set(line, n);
    }
    const stamped = [];
    for (const [line, n] of union) for (let i = 0; i < n; i++) stamped.push([stampOf(line), line]);
    if (present) console.log(`  ${path.relative(MAIN, loc) || 'MAIN'}: ${copies} run cop${copies === 1 ? 'y' : 'ies'} read; ${rawStamped} stamped lines in all sources, ${stamped.length} after merging by line identity`);
    if (!present) continue;
    const today = stamped.filter(([t]) => t >= DAY_START);
    const counts = {};
    // the back model of a hedge run is the one its own `front=... back=...` line names; a back start with no such line before it is the build's BACK (3.1-lite)
    let lastBack = M31;
    // files were read newest-first (.log then .log.1): order by stamp so a back start meets its own front line
    for (const [, l] of [...today].sort((a, b) => a[0] - b[0])) {
        const f = MARK_FRONT.exec(l);
        if (f) { bump(counts, f[1]); bump(sent, f[1]); lastBack = f[2]; }
        else if (MARK_BACK.test(l)) { bump(counts, lastBack); bump(sent, lastBack); }
        else { const w = MARK_WARM.exec(l); if (w) { bump(counts, w[1]); bump(sent, w[1]); } }
        for (const m of l.matchAll(LITE)) bump(mentions, m[0]);
        const u = USAGE.exec(l); if (u) bump(usageLines, u[1]);
    }
    const oldest = stamped.length ? stamped.reduce((m, [tt]) => (tt < m ? tt : m), Infinity) : null;
    if (oldest !== null) oldestAll = oldestAll === null ? oldest : Math.min(oldestAll, oldest);
    const lost = today.length > 0 && oldest > DAY_START;
    if (lost) complete = false;
    console.log(`  ${path.relative(MAIN, loc) || 'MAIN'}: ${today.length} lines since the reset; requests sent ${JSON.stringify(counts)}; oldest covered ${oldest ? new Date(oldest).toISOString() : 'none'}${lost ? ' - AFTER the reset: the start of the quota day may have been rotated away (complete=no)' : ''}`);
}

console.log('\n2. files written since the reset that could hold model calls (calls made by SCRIPTS - probes, bare arms, replays - are NOT in any app log and NOT in the counts above: pass them as --extra-requests)');
const PASSY = /answers|chains|health|probe|replay|smoke|bench|arm|flight|verdict|judge|prompts|diag/i;
const roots = [`${MAIN}/electron/test/golden`, `${MAIN}/electron/test/golden/interview60.runs`, `${LR}/electron/test/golden`, `${LR}/electron/test/golden/interview60.runs`, `${WT}/electron/test/golden`, `${WT}/electron/test/golden/interview60.runs`, SP];
const seen = new Set();
let hits = 0;
const walk = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (depth > 0) walk(full, depth - 1); continue; }
        if (seen.has(full)) continue;
        seen.add(full);
        const st = fs.statSync(full);
        const short = full.replace(/\\/g, '/').replace(SP, 'SP').replace(WT, 'WT').replace(MAIN, 'MAIN');
        if (st.mtimeMs >= DAY_START && PASSY.test(e.name)) { hits++; console.log(`  ${new Date(st.mtimeMs).toISOString()}  ${st.size.toString().padStart(9)}  ${short}`); }
    }
};
for (const r of roots) walk(r, 2);
console.log(`  ${hits} file(s)`);

// The machine-readable line the router guard's r7 and write-arming read (spec 10.1, the arming gate).
// used = requests the app logs show (one per marker above) + extra. It is NOT an upper bound: a non-hedge stream, an app log lost to rotation
// (complete=no says so) and script calls (extra) can all be missing, so a passing read is only as good as the extra term and complete=yes.
const extra = EXTRA ?? 0;
const used35 = (sent[M35] ?? 0) + extra, used31 = (sent[M31] ?? 0) + extra;
console.log(`mentions (lines naming a model, NOT requests; informational): ${JSON.stringify(mentions)}; usage lines (NOT requests): ${JSON.stringify(usageLines)}`);
console.log(`LEDGER-SUMMARY reset=${new Date(DAY_START).toISOString()} now=${new Date(NOW).toISOString()} cap=${CAP} used35=${used35} used31=${used31} extra=${EXTRA === null ? 'unset' : EXTRA} headroom35=${CAP - used35} headroom31=${CAP - used31} complete=${complete ? 'yes' : 'no'} oldest=${oldestAll === null ? 'none' : new Date(oldestAll).toISOString()}`);
