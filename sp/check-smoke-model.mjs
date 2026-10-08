// Did the APP honour NATIVELY_VERBAL_PRIMARY_MODEL? The unit tests prove the resolver and the
// wiring against a mocked SDK; the environment reaches the app process by a spread of
// process.env at both spawn hops. This is the only check that watches the real app make a
// real request, which is the link a flight cannot afford to discover at 10:10.
//
//   node check-smoke-model.mjs <expected-model> <expected-level> <fallback-model> [lookbackMinutes]
//
// Rule: the expected model must account for MORE answer requests than the fallback, and every
// request it made must carry the expected level with thought tokens spent. Requests on the
// fallback are reported, not failed — a stall redirect is legitimate and s50k had two of them.
// A bare "every request must be the expected model" rule is WRONG and was calibrated out: run
// against s50k's own log it failed on that hour's two genuine redirects.
//
// Calibrated both directions on the s50k log, which flew 3.1-lite LOW with 2 redirects to 3.5:
//   expect 3.1 LOW  fallback 3.5  -> PASS   (40 against 2)
//   expect 3.5 HIGH fallback 3.1  -> FAIL   (2 against 40, the override plainly did not take)
import { readFileSync } from 'node:fs';

const PROJ = process.cwd();
const [WANT_MODEL, WANT_LEVEL, FALLBACK, LOOKBACK = '25'] = process.argv.slice(2);
if (!WANT_MODEL || !WANT_LEVEL || !FALLBACK) {
    console.error('usage: check-smoke-model.mjs <model> <level> <fallback-model> [lookbackMinutes]');
    process.exit(2);
}

const cutoff = Date.now() - Number(LOOKBACK) * 60_000;
const log = readFileSync(`${PROJ}/natively_debug.log`, 'utf8');

const rows = [];
for (const line of log.split('\n')) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z).*\[LLMHelper\] (\S+) usage: thinking=(\w+) thoughts=(\d+) out=(\d+) in=(\d+)/);
    if (!m) continue;
    const at = Date.parse(m[1]);
    if (!Number.isFinite(at) || at < cutoff) continue;
    rows.push({ at, model: m[2], level: m[3], thoughts: Number(m[4]), out: Number(m[5]), in: Number(m[6]) });
}
// Collapse a run of chunk lines into one request.
const reqs = [];
for (const r of rows) {
    const prev = reqs[reqs.length - 1];
    if (prev && prev.model === r.model && prev.in === r.in && r.out >= prev.out) { prev.thoughts = r.thoughts; prev.out = r.out; }
    else reqs.push({ ...r });
}

// Warm-ups are tiny; a real spoken answer carries the whole context block. 500 input tokens
// separates them by an order of magnitude (a flight's answers run around 4,000).
const answers = reqs.filter((r) => r.in > 500);
const onWanted = answers.filter((r) => r.model === WANT_MODEL);
const onFallback = answers.filter((r) => r.model === FALLBACK);
const onOther = answers.filter((r) => r.model !== WANT_MODEL && r.model !== FALLBACK);

console.log(`answer requests in the last ${LOOKBACK} min: ${answers.length}`);
console.log(`  on ${WANT_MODEL}: ${onWanted.length}`);
console.log(`  on ${FALLBACK} (stall redirects are legitimate): ${onFallback.length}`);
if (onOther.length) console.log(`  on something else: ${onOther.length}`);
for (const r of answers) {
    console.log(`    ${new Date(r.at).toISOString()}  ${r.model.padEnd(24)} ${r.level.padEnd(8)} thoughts ${String(r.thoughts).padStart(5)}  in ${r.in}`);
}

const problems = [];
if (answers.length === 0) problems.push('no answer request found at all — did the app run, and did it answer?');
if (onWanted.length === 0 && answers.length) problems.push(`NOT ONE answer used ${WANT_MODEL} — the override did not reach the app`);
if (onWanted.length <= onFallback.length && answers.length) {
    problems.push(`${WANT_MODEL} answered ${onWanted.length} of ${answers.length}, no more than the ${onFallback.length} on ${FALLBACK} — it is not the primary`);
}
for (const r of onWanted) {
    if (r.level !== WANT_LEVEL) problems.push(`${new Date(r.at).toISOString()} used level ${r.level}, expected ${WANT_LEVEL}`);
    else if (r.thoughts === 0) problems.push(`${new Date(r.at).toISOString()} spent ZERO thought tokens at ${r.level} — the level was not honoured`);
}
for (const r of onOther) problems.push(`${new Date(r.at).toISOString()} answered on ${r.model}, which is neither the primary nor the fallback`);

if (problems.length) { console.error('\nSMOKE FAILED:'); for (const p of problems) console.error('  ' + p); process.exit(1); }
console.log(`\nSMOKE OK: ${WANT_MODEL} is the primary at ${WANT_LEVEL}, thought tokens spent on every one of its ${onWanted.length} answers.`);
