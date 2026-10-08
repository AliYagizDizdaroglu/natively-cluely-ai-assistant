// paired-latency.decide.mjs — the pre-registered decision on the spoken-answer model's latency
// (passes/PREREGISTER-latency-probe.md). Everything that decides lives in this file and was
// fixed, with its margins, before any counted window ran. It reads the windows' probe files and
// prints PASS or FAIL for each condition; the verdict is PASS only if every condition passes.
//
//   node electron/test/golden/paired-latency.decide.mjs <window.json> [<window.json> ...]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CANDIDATE = '3.5-lite HIGH';
export const INCUMBENT = '3.1-lite LOW';
export const BUDGET_MS = 10_000;   // the app's first-token stall budget under a thinking level
export const CAP_MS = 45_000;      // the probe's hard cap, also the wait charged for "no answer"

/**
 * Margins: how much worse the candidate may be before a condition fails. Calibrated on the
 * 2026-09-22 probe run, which generated the hypothesis and does not count toward the verdict,
 * by the null the rule must survive — the two models' labels swapped at random inside each pair,
 * bootstrapped to the 117 pairs three windows give. Each is the smallest round value with a
 * false-fail rate at or under 2.5 % when the models are equal (calibrate-latency-rule.mjs).
 */
export const MARGINS = { medianMs: 750, p90Ms: 1000, failures: 6 };

const firstToken = (r) => (typeof r?.ttft === 'number' ? r.ttft : null);

/** Did this model, as the primary, force the app's fallback? An error, no token, or one past the budget. */
export const forcedFallback = (r) => !!r.error || firstToken(r) === null || firstToken(r) > BUDGET_MS;

/**
 * What the user waits for the first word with `primary` answering and `other` behind it, by the
 * app's own mechanics: a first token inside the budget is the wait; a stall costs the budget and
 * then the other model's first token; an error costs the time it took to fail and then the other
 * model's first token (783991a makes the error fallback the other model). The other model failing
 * as well means no answer, charged the cap.
 */
export function effectiveWait(primary, other) {
    const behind = firstToken(other) ?? CAP_MS;
    if (primary.error) return Math.min(CAP_MS, primary.total + behind);
    const t = firstToken(primary);
    if (t !== null && t <= BUDGET_MS) return t;
    return Math.min(CAP_MS, BUDGET_MS + behind);
}

/** Nearest-rank percentile, the same definition the probe prints. */
export const pct = (xs, p) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

/** Rows from one window's probe file → { id, cand, inc } pairs. A pair missing either model is refused. */
export function pairsOf(rows, window = '') {
    const byId = new Map();
    for (const r of rows) {
        const slot = r.arm === CANDIDATE ? 'cand' : r.arm === INCUMBENT ? 'inc' : null;
        if (!slot) throw new Error(`${window}: unknown arm "${r.arm}"`);
        const p = byId.get(r.id) ?? { id: `${window}:${r.id}` };
        if (p[slot]) throw new Error(`${window}: ${r.id} measured twice on ${r.arm}`);
        p[slot] = r;
        byId.set(r.id, p);
    }
    const pairs = [...byId.values()];
    const half = pairs.filter((p) => !p.cand || !p.inc);
    if (half.length) throw new Error(`${window}: ${half.length} prompt(s) measured on one model only — the window is not a paired run`);
    return pairs;
}

/**
 * A window where BOTH models fail on more than half the prompts measured an outage, not a model:
 * it is void, and is flown again at the same local time the next day (declared in the rule).
 */
export const isVoid = (pairs) => pairs.filter((p) => forcedFallback(p.cand) && forcedFallback(p.inc)).length > pairs.length / 2;

export function decide(pairs, margins = MARGINS) {
    const cand = pairs.map((p) => effectiveWait(p.cand, p.inc));
    const inc = pairs.map((p) => effectiveWait(p.inc, p.cand));
    const fc = pairs.filter((p) => forcedFallback(p.cand)).length;
    const fi = pairs.filter((p) => forcedFallback(p.inc)).length;
    const conditions = [
        { name: 'typical wait (median, ms)', cand: pct(cand, 0.5), inc: pct(inc, 0.5), margin: margins.medianMs },
        { name: 'slow tail (p90 wait, ms)', cand: pct(cand, 0.9), inc: pct(inc, 0.9), margin: margins.p90Ms },
        { name: 'fallback forced (prompts)', cand: fc, inc: fi, margin: margins.failures },
    ].map((c) => ({ ...c, pass: c.cand <= c.inc + c.margin }));
    return { n: pairs.length, conditions, pass: conditions.every((c) => c.pass) };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const files = process.argv.slice(2);
    if (!files.length) { console.error('usage: paired-latency.decide.mjs <window.json> [...]'); process.exit(2); }
    if (Object.values(MARGINS).some(Number.isNaN)) { console.error('MARGINS are not set — the rule is not fixed yet'); process.exit(2); }
    const all = [];
    for (const f of files) {
        const pairs = pairsOf(JSON.parse(fs.readFileSync(f, 'utf8')), f.split(/[\\/]/).pop());
        const v = isVoid(pairs);
        console.log(`${f.split(/[\\/]/).pop()}: ${pairs.length} pairs${v ? '  VOID (both models failed on most prompts: an outage) — fly this window again' : ''}`);
        if (!v) all.push(...pairs);
    }
    const r = decide(all);
    console.log(`\n${r.n} pairs pooled. Candidate ${CANDIDATE} vs incumbent ${INCUMBENT}:`);
    for (const c of r.conditions) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(28)} candidate ${c.cand}  incumbent ${c.inc}  margin ${c.margin}`);
    console.log(`\nVERDICT: ${r.pass ? 'PASS — the candidate is not the slower or stallier model' : 'FAIL — the incumbent stays'}`);
    process.exit(r.pass ? 0 : 1);
}
