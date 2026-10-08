// Throwaway: what-if simulation on the 2026-09-23 latency windows (117 paired prompts, both models
// measured back to back on each). No API calls. Built on the rule's own functions (paired-latency
// .decide.mjs) and CALIBRATED against them: the sequential policy in "rule" mode must reproduce the
// rule's effectiveWait on every pair, both orders, and decide() must reproduce the published verdict.
//
// Two ways to charge a call the probe aborted at its 45 s cap with no token:
//   rule  as the rule's code does: an error at 45 s (so the fallback never gets a chance)
//   app   as the app would see it: a stall — the 10 s first-token race switches models at 10 s
// Assumption (unverified): each model's measured outcome on a prompt is what it would have done had it
// started a few seconds earlier or later — the probe ran the two back to back, not concurrently.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RULE = await import(pathToFileURL(`${MAIN}/electron/test/golden/paired-latency.decide.mjs`).href);
const { pairsOf, effectiveWait, pct, forcedFallback, decide, CAP_MS, BUDGET_MS, isVoid } = RULE;
const DIR = `${MAIN}/electron/test/golden/interview60.runs/latency-probe`;
const WINDOWS = ['W1', 'W2', 'W3'];

const rowsOf = {}, byWindow = {};
for (const w of WINDOWS) {
    rowsOf[w] = JSON.parse(fs.readFileSync(`${DIR}/2026-09-23-${w}.json`, 'utf8'));
    const pairs = pairsOf(rowsOf[w], w);
    if (isVoid(pairs)) throw new Error(`${w} is void`);
    byWindow[w] = pairs;
}
const all = WINDOWS.flatMap((w) => byWindow[w]);
const winOf = (p) => p.id.split(':')[0];

// One call: a first token at `tok` ms after it starts, a failure at `fail` ms, or a stall (neither).
const isCapAbort = (r) => !!r.error && /aborted at cap/.test(r.error);
const outcome = (r, mode) => {
    if (r.error) return mode === 'app' && isCapAbort(r) ? { stall: true } : { fail: r.total };
    return typeof r.ttft === 'number' ? { tok: r.ttft } : { stall: true };
};
const done = (t, by, extra) => (t < CAP_MS ? { wait: t, by, extra } : { wait: CAP_MS, by: 'none', extra });

/** Sequential (the app's stall race): the front alone until `budget` or its failure, then only the other. */
function seq(front, other, mode, budget = BUDGET_MS) {
    const a = outcome(front, mode), b = outcome(other, mode);
    if (a.tok !== undefined && a.tok <= budget) return { wait: a.tok, by: 'front', extra: false };
    const start = a.fail !== undefined ? (mode === 'rule' ? a.fail : Math.min(a.fail, budget)) : budget;
    return done(b.tok !== undefined ? start + b.tok : Infinity, 'other', true);
}

/** Hedge at H: the front keeps running; the other starts at H (or at the front's failure); first word wins. */
function hedge(front, other, H) {
    const a = outcome(front, 'app'), b = outcome(other, 'app');
    if (a.tok !== undefined && a.tok <= H) return { wait: a.tok, by: 'front', extra: false };
    const start = a.fail !== undefined ? Math.min(a.fail, H) : H;
    const tf = a.tok ?? Infinity, to = b.tok !== undefined ? start + b.tok : Infinity;
    return done(Math.min(tf, to), tf <= to ? 'front' : 'other', true);
}
const alone = (front) => { const a = outcome(front, 'app'); return done(a.tok ?? Infinity, 'front', false); };

// ── Calibration 0: the new policies on hand-worked cases (each case would answer differently if the
//    behaviour it names were absent — e.g. a hedge that dropped 3.5 would give 10600 in case 2). ──
{
    const T = (r, v) => ({ ...r, error: r.error ?? undefined, ttft: r.ttft ?? null, total: r.total ?? 0 });
    const cap = T({ error: 'aborted at cap', total: 45000 }), e503 = (t) => T({ error: 'HTTP 503', total: t }), tok = (t) => T({ ttft: t, total: t + 500 });
    const cases = [
        ['hedge: front inside H', hedge(tok(3000), tok(2000), 5000), 3000, 'front'],
        ['hedge: front kept, beats the late 3.1', hedge(tok(6200), tok(5600), 5000), 6200, 'front'],
        ['hedge: front stalls to cap, 3.1 from H', hedge(cap, tok(5600), 5000), 10600, 'other'],
        ['hedge: front 503 early, 3.1 from the failure', hedge(e503(500), tok(4000), 5000), 4500, 'other'],
        ['hedge: both fail', hedge(cap, e503(4100), 5000), CAP_MS, 'none'],
        ['hedge: 3.1 fails, slow front still answers', hedge(tok(30000), e503(300), 5000), 30000, 'front'],
        ['seq app: cap stall switches at 10 s', seq(cap, tok(5600), 'app'), 15600, 'other'],
        ['seq rule: cap stall charged as a 45 s error', seq(cap, tok(5600), 'rule'), CAP_MS, 'none'],
        ['seq app budget 5 s: slow front dropped', seq(tok(7000), tok(5600), 'app', 5000), 10600, 'other'],
        ['seq app: late 503 switches at the budget', seq(e503(14000), tok(3000), 'app'), 13000, 'other'],
        ['seq rule: late 503 charged at its time', seq(e503(14000), tok(3000), 'rule'), 17000, 'other'],
    ];
    const bad = cases.filter(([, r, w, by]) => r.wait !== w || r.by !== by);
    if (bad.length) throw new Error('KNOWN CASES FAILED: ' + bad.map(([n, r, w, by]) => `${n}: got ${r.wait}/${r.by}, want ${w}/${by}`).join('; '));
    console.log(`KNOWN CASES OK: ${cases.length} hand-worked hedge/seq cases.`);
}
// ── Calibration 1: seq in rule mode IS the rule's effectiveWait, on every pair, both orders. ──
let mism = 0;
for (const p of all) for (const [f, o] of [[p.cand, p.inc], [p.inc, p.cand]]) if (seq(f, o, 'rule').wait !== effectiveWait(f, o)) mism++;
if (mism) throw new Error(`CALIBRATION FAILED: seq(rule) differs from effectiveWait on ${mism} of ${all.length * 2}`);
// ── Calibration 2: decide() on the same pairs reproduces the published verdict numbers. ──
const d = decide(all);
const pub = { p90: [45000, 19180], forced: [41, 32] };
const got = { p90: [d.conditions[1].cand, d.conditions[1].inc], forced: [d.conditions[2].cand, d.conditions[2].inc] };
if (JSON.stringify(got) !== JSON.stringify(pub)) throw new Error(`CALIBRATION FAILED: decide() gives ${JSON.stringify(got)}, published ${JSON.stringify(pub)}`);
// ── Sensitivity: the same check must SEE the app-mode difference, on exactly the cap-abort fronts. ──
let appDiff = 0, capFronts = 0;
for (const p of all) for (const [f, o] of [[p.cand, p.inc], [p.inc, p.cand]]) {
    if (seq(f, o, 'app').wait !== effectiveWait(f, o)) appDiff++;
    if (isCapAbort(f)) capFronts++;
}
console.log(`CALIBRATION OK: seq(rule) = effectiveWait on all ${all.length} pairs x 2 orders; decide() reproduces p90 ${pub.p90.join(' vs ')} and forced ${pub.forced.join(' vs ')}.`);
console.log(`sensitivity: seq(app) differs from the rule on ${appDiff} pair-orders; cap-abort fronts: ${capFronts}.\n`);
for (const p of all) for (const [f, o, lab] of [[p.cand, p.inc, '3.5 first'], [p.inc, p.cand, '3.1 first']]) {
    const a = seq(f, o, 'app').wait, r = effectiveWait(f, o);
    if (a !== r) console.log(`   differs: ${p.id.padEnd(10)} ${lab}: front ${f.error ?? f.ttft + 'ms'} @${f.total}ms, other ${o.error ?? o.ttft + 'ms'} -> rule ${r}, app ${a}`);
}

// ── What the windows contain, per model: the outcome census. ──
const census = (rs) => {
    const c = { ok: 0, slow: 0, http: 0, cap: 0, none: 0 };
    for (const r of rs) {
        if (isCapAbort(r)) c.cap++;
        else if (r.error) c.http++;
        else if (typeof r.ttft !== 'number') c.none++;
        else if (r.ttft > BUDGET_MS) c.slow++;
        else c.ok++;
    }
    return `ok ${c.ok}  slow>10s ${c.slow}  http-error ${c.http}  stalled-to-cap ${c.cap}  no-token ${c.none}`;
};
for (const w of WINDOWS) {
    const ats = rowsOf[w].map((r) => r.at).sort();
    const ps = byWindow[w];
    const tt = (sel) => { const xs = ps.map((p) => p[sel]).filter((r) => !r.error && typeof r.ttft === 'number').map((r) => r.ttft); return `p50 ${(pct(xs, 0.5) / 1000).toFixed(1)} p90 ${(pct(xs, 0.9) / 1000).toFixed(1)}`; };
    const errs = (sel) => [...new Set(ps.map((p) => p[sel].error).filter(Boolean))].join(', ') || '-';
    console.log(`${w}  ${ats[0].slice(11, 16)}-${ats.at(-1).slice(11, 16)} UTC, ${ps.length} prompts`);
    console.log(`   3.5 HIGH: ${census(ps.map((p) => p.cand))}   first token ${tt('cand')} s   errors: ${errs('cand')}`);
    console.log(`   3.1 LOW : ${census(ps.map((p) => p.inc))}   first token ${tt('inc')} s   errors: ${errs('inc')}`);
}

// ── Do failures cluster? (Decides whether a retry of the SAME model, seconds later, can help.) ──
const RNG = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (xs, rnd) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const adj = (seq01) => seq01.slice(1).filter((x, i) => x && seq01[i]).length;
console.log('\nclustering of 3.5 failures (no first token by 10 s), prompts in time order:');
for (const w of WINDOWS) {
    const order = [...byWindow[w]].sort((x, y) => (x.cand.at < y.cand.at ? -1 : 1));
    const s01 = order.map((p) => forcedFallback(p.cand));
    const k = s01.filter(Boolean).length, obs = adj(s01), rnd = RNG(7);
    let ge = 0; const N = 20000;
    for (let i = 0; i < N; i++) if (adj(shuffle(s01, rnd)) >= obs) ge++;
    console.log(`   ${w}: ${k}/${s01.length} fail; failure followed by failure ${obs} times (random order expects ${((k * (k - 1)) / s01.length).toFixed(1)}); p = ${(ge / N).toFixed(3)}  sequence ${s01.map((x) => (x ? 'X' : '.')).join('')}`);
}
console.log('co-failure on the same prompt (3.5 fails AND 3.1 fails, measured seconds apart):');
for (const w of [...WINDOWS, 'all']) {
    const ps = w === 'all' ? all : byWindow[w];
    const f5 = ps.filter((p) => forcedFallback(p.cand)), f1 = ps.filter((p) => forcedFallback(p.inc)), both = ps.filter((p) => forcedFallback(p.cand) && forcedFallback(p.inc));
    console.log(`   ${w.padEnd(3)}: 3.5 fails ${f5.length}, 3.1 fails ${f1.length}, both ${both.length} (independence expects ${((f5.length * f1.length) / ps.length).toFixed(1)}); P(3.1 fails | 3.5 failed) = ${f5.length ? (both.length / f5.length).toFixed(2) : '-'} vs ${(f1.length / ps.length).toFixed(2)} overall`);
}

// ── Policies ──
const ACC = { '3.5': 29 / 39, '3.1': 22 / 39 }; // blind-graded acceptable rate, s50m 39 items, Opus 5.5, 2026-09-24
function summarize(name, results, front35, note = '') {
    const w = results.map((r) => r.wait), n = results.length;
    const by35 = results.filter((r) => (front35 ? r.by === 'front' : r.by === 'other')).length;
    const by31 = results.filter((r) => (front35 ? r.by === 'other' : r.by === 'front')).length;
    return {
        name, note, n, results, by35,
        median: pct(w, 0.5), p90: pct(w, 0.9),
        over10: w.filter((x) => x > BUDGET_MS).length,
        none: results.filter((r) => r.by === 'none').length,
        extra: results.filter((r) => r.extra).length,
        acc: (100 * (by35 * ACC['3.5'] + by31 * ACC['3.1'])) / n,
    };
}
const P = [];
const run = (name, front35, fn, note) => P.push(summarize(name, all.map((p) => fn(front35 ? p.cand : p.inc, front35 ? p.inc : p.cand, p)), front35, note));
run('A  today: 3.1 first, 3.5 at 10 s   [rule charge]', false, (f, o) => seq(f, o, 'rule'), 'the 09-23 verdict');
run('B  swap:  3.5 first, 3.1 at 10 s   [rule charge]', true, (f, o) => seq(f, o, 'rule'), 'the 09-23 verdict');
run('A  today: 3.1 first, 3.5 at 10 s', false, (f, o) => seq(f, o, 'app'));
run('B  swap:  3.5 first, 3.1 at 10 s', true, (f, o) => seq(f, o, 'app'));
for (const H of [4000, 5000, 6000]) run(`C  swap:  3.5 first, 3.1 at ${H / 1000} s (3.5 dropped)`, true, (f, o) => seq(f, o, 'app', H));
for (const H of [3000, 4000, 5000, 6000, 8000]) run(`D  hedge: 3.5 first, +3.1 at ${H / 1000} s (3.5 kept)`, true, (f, o) => hedge(f, o, H));
run('   3.5 alone, no fallback', true, (f) => alone(f));
run('   3.1 alone, no fallback', false, (f) => alone(f));

// E: a SECOND 3.5 call at H, the first kept. Its outcome is unknown; bound it two ways.
//    independent: drawn from the same window's 3.5 calls (the best a retry can do)
//    correlated : it behaves like the first call (a retry never helps) = "3.5 alone"
for (const H of [4000, 6000]) {
    const rnd = RNG(11), N = 4000, acc = { median: 0, p90: 0, over10: 0, none: 0, extra: 0 };
    for (let it = 0; it < N; it++) {
        const res = all.map((p) => {
            const a = outcome(p.cand, 'app');
            if (a.tok !== undefined && a.tok <= H) return { wait: a.tok, by: 'front', extra: false };
            const pool = byWindow[winOf(p)], b = outcome(pool[Math.floor(rnd() * pool.length)].cand, 'app');
            const start = a.fail !== undefined ? Math.min(a.fail, H) : H;
            return done(Math.min(a.tok ?? Infinity, b.tok !== undefined ? start + b.tok : Infinity), 'front', true);
        });
        const s = summarize('', res, true);
        for (const k of Object.keys(acc)) acc[k] += s[k] / N;
    }
    P.push({ name: `E  retry: 3.5 first, +3.5 at ${H / 1000} s  [if independent]`, n: all.length, results: null, by35: all.length - acc.none, ...acc, acc: (100 * (all.length - acc.none) * ACC['3.5']) / all.length, mc: true });
}

const sec = (ms) => (ms >= CAP_MS ? '   cap' : (ms / 1000).toFixed(1).padStart(6));
const num = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1)).padStart(5);
console.log('\n117 prompts (3 windows x 39). Wait = first word. "cap" = 45 s, i.e. at least that share got no answer.');
console.log('policy                                                median    p90  >10s  none  by 3.5  extra calls  est. acceptable/100');
for (const r of P) console.log(`${r.name.padEnd(52)} ${sec(r.median)} ${sec(r.p90)} ${num(r.over10)} ${num(r.none)}   ${String(Math.round((100 * r.by35) / r.n)).padStart(3)}%   ${String(Math.round((100 * r.extra) / r.n)).padStart(4)}%        ${r.acc.toFixed(0).padStart(3)}${r.note ? `   (${r.note})` : ''}`);
console.log('(est. acceptable = share answered by each model x its blind-graded acceptable rate, 29/39 vs 22/39; a no-answer scores 0 — rough)');

console.log('\nper window: median / p90 / none');
for (const name of ['A  today: 3.1 first, 3.5 at 10 s', 'B  swap:  3.5 first, 3.1 at 10 s', 'C  swap:  3.5 first, 3.1 at 5 s (3.5 dropped)', 'D  hedge: 3.5 first, +3.1 at 5 s (3.5 kept)', 'D  hedge: 3.5 first, +3.1 at 6 s (3.5 kept)']) {
    const r = P.find((x) => x.name === name);
    const cells = WINDOWS.map((w) => { const sl = r.results.filter((_, i) => winOf(all[i]) === w), ws = sl.map((x) => x.wait); return `${w} ${sec(pct(ws, 0.5)).trim()} / ${sec(pct(ws, 0.9)).trim()} / ${sl.filter((x) => x.by === 'none').length}`; });
    console.log(`   ${name.padEnd(52)} ${cells.join('    ')}`);
}

// The rule's margins against TODAY under the same (app) charge — exploratory, the rule was registered for a swap.
const today = P.find((x) => x.name === 'A  today: 3.1 first, 3.5 at 10 s');
console.log('\nagainst today (same charge) with the rule\'s margins: median +750 ms, p90 +1000 ms, and no more no-answers:');
for (const r of P.filter((x) => !x.name.includes('[rule') && x !== today)) {
    const ok = [r.median <= today.median + 750, r.p90 <= today.p90 + 1000, r.none <= today.none];
    console.log(`   ${ok.every(Boolean) ? 'no worse ' : 'WORSE    '} ${r.name.padEnd(52)} median ${ok[0] ? 'ok' : 'X '}  p90 ${ok[1] ? 'ok' : 'X '}  none ${ok[2] ? 'ok' : 'X '}`);
}

// Which prompts still get no answer under the best hedge, and why.
const best = P.find((x) => x.name === 'D  hedge: 3.5 first, +3.1 at 5 s (3.5 kept)');
console.log('\nno-answer prompts under D at 5 s:');
best.results.forEach((r, i) => { if (r.by === 'none') { const p = all[i]; const d1 = (x) => (x.error ? `${x.error} @${(x.total / 1000).toFixed(1)}s` : typeof x.ttft === 'number' ? `${(x.ttft / 1000).toFixed(1)}s` : 'no token'); console.log(`   ${p.id.padEnd(10)} 3.5 ${d1(p.cand).padEnd(24)} 3.1 ${d1(p.inc)}`); } });

console.log('\nextra-call rate per window (how often the second model is started):');
for (const name of ['A  today: 3.1 first, 3.5 at 10 s', 'D  hedge: 3.5 first, +3.1 at 4 s (3.5 kept)', 'D  hedge: 3.5 first, +3.1 at 5 s (3.5 kept)', 'D  hedge: 3.5 first, +3.1 at 6 s (3.5 kept)']) {
    const r = P.find((x) => x.name === name);
    console.log(`   ${name.padEnd(52)} ` + WINDOWS.map((w) => { const sl = r.results.filter((_, i) => winOf(all[i]) === w); return `${w} ${sl.filter((x) => x.extra).length}/${sl.length}`; }).join('   '));
}