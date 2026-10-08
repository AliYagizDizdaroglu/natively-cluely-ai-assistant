// The pre-registered decision (PREREGISTER-followup-questions.md §7) for the earlier-question context replay.
// `decide(pairs, verdictOf, opts)` is exported PURE and calibrated by followup-questions-decide-calibrate.mjs on
// synthetic sets covering every branch of §7 before it reads a real verdict (rule 8).
//
//   node followup-questions-decide.mjs            merge the key files, both graders' verdict files and the six
//                                                 answer files, then print §7's outcome verbatim
//
// Consensus (§5): wrong = both graders correctness 0; off-topic = both on_topic <= 1; acceptable = both graders'
// verdictOf = acceptable. A completed call whose filtered answer is empty was not graded and scores 0/0/0 for both
// graders (the judge's mergeVerdicts scores an undelivered answer that way). A pair missing an answer after every
// retry leaves the decision and is named; a MISSING VERDICT is an instrument failure and stops the run.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Element min(n-1, floor(n*p)) of the ascending list (h40c's method, §7). */
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

const SCORE = (v) => v && [v.correctness, v.on_topic, v.delivery].every((x) => [0, 1, 2].includes(x));

/**
 * pairs: [{ id, kind: 'roster'|'callback'|'dropped', rep, A, B }], each side { g1, g2, ttft, words } with
 * g1/g2 = { correctness, on_topic, delivery } (0-2). opts.pooled: the one pooled re-run of §7, where a second
 * INCONCLUSIVE is a FAIL. Bars that §7 states for 21 roster pairs and 48 pairs scale as §7's pooled clause says:
 * clause 5 PASS at delta >= ceil(4R/21), FAIL at delta <= ceil(R/21); clause 3c allows ceil(2n/39) more slow answers.
 */
export function decide(pairs, verdictOf, { pooled = false } = {}) {
    for (const p of pairs) {
        if (!['roster', 'callback', 'dropped'].includes(p.kind)) throw new Error(`${p.id}#${p.rep}: unknown kind ${p.kind}`);
        for (const arm of ['A', 'B']) {
            const s = p[arm];
            if (!s || !SCORE(s.g1) || !SCORE(s.g2)) throw new Error(`${p.id}#${p.rep} ${arm}: missing or out-of-range grader scores`);
            if (!Number.isFinite(s.ttft) || !Number.isFinite(s.words)) throw new Error(`${p.id}#${p.rep} ${arm}: ttft/words not numbers`);
        }
    }
    const n = pairs.length;
    const wrong = (s) => s.g1.correctness === 0 && s.g2.correctness === 0;
    const offTopic = (s) => s.g1.on_topic <= 1 && s.g2.on_topic <= 1;
    const acceptable = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';
    const count = (arm, f, set = pairs) => set.filter((p) => f(p[arm])).length;

    const wrongA = count('A', wrong), wrongB = count('B', wrong);
    const c1 = wrongB <= wrongA ? 'holds' : 'FAIL';
    const offA = count('A', offTopic), offB = count('B', offTopic);
    const c2 = offB <= offA ? 'holds' : 'FAIL';

    const dTtft = pct(pairs.map((p) => p.B.ttft - p.A.ttft), 0.5);
    const c3a = dTtft <= 500 ? 'holds' : dTtft > 1000 ? 'FAIL' : 'INCONCLUSIVE';
    const p90A = pct(pairs.map((p) => p.A.ttft), 0.9), p90B = pct(pairs.map((p) => p.B.ttft), 0.9);
    const c3b = p90B <= p90A + 2000 ? 'holds' : 'INCONCLUSIVE';
    const slowA = pairs.filter((p) => p.A.ttft > 10000).length, slowB = pairs.filter((p) => p.B.ttft > 10000).length;
    const allow3c = Math.ceil((2 * n) / 39);
    const c3c = slowB <= slowA + allow3c ? 'holds' : 'FAIL';

    const dWords = pct(pairs.map((p) => p.B.words - p.A.words), 0.5);
    const c4 = dWords <= 5 ? 'holds' : dWords > 10 ? 'FAIL' : 'INCONCLUSIVE';

    const roster = pairs.filter((p) => p.kind === 'roster');
    const R = roster.length;
    const accA = count('A', acceptable, roster), accB = count('B', acceptable, roster);
    const delta = accB - accA;
    const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);
    const c5 = delta >= passBar ? 'PASS' : delta <= failBar ? 'FAIL' : 'INCONCLUSIVE';

    const clauses = { c1, c2, c3a, c3b, c3c, c4, c5 };
    let outcome = Object.values(clauses).includes('FAIL') ? 'FAIL'
        : [c1, c2, c3a, c3b, c3c, c4].every((c) => c === 'holds') && c5 === 'PASS' ? 'PASS' : 'INCONCLUSIVE';
    if (pooled && outcome === 'INCONCLUSIVE') outcome = 'FAIL';
    return {
        outcome, clauses, n, R,
        numbers: { wrongA, wrongB, offA, offB, dTtft, p90A, p90B, slowA, slowB, allow3c, dWords, accA, accB, delta, passBar, failBar },
    };
}

export function formatResult(r) {
    const x = r.numbers;
    return [
        `n = ${r.n} complete (item, rep) pairs; roster pairs R = ${r.R}`,
        `1. no new wrong answers        consensus-wrong B ${x.wrongB} <= A ${x.wrongA}: ${r.clauses.c1}`,
        `2. no rise in off-topic        consensus-off-topic B ${x.offB} <= A ${x.offA}: ${r.clauses.c2}`,
        `3a. not later (median)         median paired TTFT B-A ${x.dTtft} ms (holds <= +500, FAIL > +1000): ${r.clauses.c3a}`,
        `3b. not later (p90)            p90 B ${x.p90B} ms vs p90 A ${x.p90A} ms + 2000: ${r.clauses.c3b}`,
        `3c. stalls                     TTFT > 10 s: B ${x.slowB} <= A ${x.slowA} + ${x.allow3c}: ${r.clauses.c3c}`,
        `4. not longer                  median paired words B-A ${x.dWords} (holds <= +5, FAIL > +10): ${r.clauses.c4}`,
        `5. gain, roster pairs          consensus-acceptable B ${x.accB} - A ${x.accA} = ${x.delta >= 0 ? '+' : ''}${x.delta} (PASS >= +${x.passBar}, FAIL <= +${x.failBar}): ${r.clauses.c5}`,
        `DECISION: ${r.outcome}`,
    ].join('\n');
}

// ── CLI: merge the real files and decide ──────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('followup-questions-decide.mjs')) {
    const { MAIN, BLIND_DIR, IDS, REPS, ARMS, GRADERS, fileFor, loadGated } = await import('./common.mjs');
    const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
    const { G } = await loadGated();
    const answers = {};
    for (const arm of ARMS) for (const rep of REPS) answers[`${arm}${rep}`] = JSON.parse(fs.readFileSync(fileFor(arm, rep), 'utf8'));
    // key -> { id, arm, rep }, and every grader's verdicts, per blind file
    const keyFiles = fs.readdirSync(BLIND_DIR).filter((f) => /^key\.blind-\d+\.json$/.test(f));
    if (!keyFiles.length) { console.error(`no key.blind-N.json under ${BLIND_DIR}`); process.exit(2); }
    const scores = {}; // `${id}|${arm}|${rep}` -> { g1, g2 }
    for (const kf of keyFiles) {
        const nf = kf.match(/^key\.blind-(\d+)\.json$/)[1];
        const keys = JSON.parse(fs.readFileSync(path.join(BLIND_DIR, kf), 'utf8'));
        for (const g of GRADERS) {
            const vf = path.join(BLIND_DIR, `verdicts.blind-${nf}.${g}.json`);
            if (!fs.existsSync(vf)) { console.error(`missing ${vf}: every blind file needs both graders' verdicts`); process.exit(2); }
            const v = JSON.parse(fs.readFileSync(vf, 'utf8'));
            const extra = Object.keys(v).filter((k) => !keys[k]);
            if (extra.length) { console.error(`${path.basename(vf)} grades keys that are not in ${kf}: ${extra.join(', ')}`); process.exit(2); }
            for (const [k, meta] of Object.entries(keys)) {
                if (!SCORE(v[k])) { console.error(`${path.basename(vf)}: no valid verdict for ${k}`); process.exit(2); }
                ((scores[`${meta.id}|${meta.arm}|${meta.rep}`] ??= {})[g] = v[k]);
            }
        }
    }
    const EMPTY = { correctness: 0, on_topic: 0, delivery: 0 };
    const pairs = [], incomplete = [], emptied = [];
    for (const id of IDS) for (const rep of REPS) {
        const side = {};
        for (const arm of ARMS) {
            const x = answers[`${arm}${rep}`][id];
            if (!x || x.transientError) continue;
            // No text at all (ttft null): the candidate waited `total` ms to see nothing; that wait is its first-token time.
            if (!x.spoken) { emptied.push(`${arm}r${rep}:${id}${x.ttft == null ? ' (no text at all)' : ''}`); side[arm] = { g1: EMPTY, g2: EMPTY, ttft: x.ttft ?? x.total, words: 0 }; continue; }
            const s = scores[`${id}|${arm}|${rep}`];
            if (!s?.g1 || !s?.g2) { console.error(`${id} r${rep} ${arm}: answered but not graded by both graders`); process.exit(2); }
            side[arm] = { g1: s.g1, g2: s.g2, ttft: x.ttft, words: x.words };
        }
        if (!side.A || !side.B) { incomplete.push(`${id}#${rep} (${ARMS.filter((a) => !side[a]).join(',')} missing)`); continue; }
        pairs.push({ id, kind: G[id].kind, rep, A: side.A, B: side.B });
    }
    const r = decide(pairs, J.verdictOf);
    console.log(`incomplete pairs (excluded): ${incomplete.length ? incomplete.join(', ') : 'none'}`);
    console.log(`answers empty after the filters (scored 0/0/0): ${emptied.length ? emptied.join(', ') : 'none'}`);
    console.log(formatResult(r));

    // Reported beside the rule, never decided on (§5, §3, §3b).
    const sym = (s) => (s.g1.correctness === 0 && s.g2.correctness === 0 ? 'X' : J.verdictOf(s.g1) === 'acceptable' && J.verdictOf(s.g2) === 'acceptable' ? 'Y' : s.g1.on_topic <= 1 && s.g2.on_topic <= 1 ? 'o' : 'w');
    const either = (arm, f) => pairs.filter((p) => f(p[arm].g1) || f(p[arm].g2)).length;
    const meanAcc = (arm) => ((pairs.filter((p) => J.verdictOf(p[arm].g1) === 'acceptable').length + pairs.filter((p) => J.verdictOf(p[arm].g2) === 'acceptable').length) / 2).toFixed(1);
    console.log(`\neither grader: wrong A ${either('A', (g) => g.correctness === 0)} B ${either('B', (g) => g.correctness === 0)}; off-topic A ${either('A', (g) => g.on_topic <= 1)} B ${either('B', (g) => g.on_topic <= 1)}; mean-of-graders acceptable (all pairs) A ${meanAcc('A')} B ${meanAcc('B')}`);
    console.log('per item, reps 1-3 (Y both acceptable, X both correctness 0, o both on_topic <= 1, w otherwise):');
    for (const kind of ['roster', 'callback', 'dropped']) {
        console.log(`  ${kind}`);
        for (const id of IDS.filter((i) => G[i].kind === kind)) {
            const row = (arm) => REPS.map((rep) => { const p = pairs.find((q) => q.id === id && q.rep === rep); return p ? sym(p[arm]) : '-'; }).join('');
            console.log(`    ${id.padEnd(6)} A ${row('A')}  B ${row('B')}`);
        }
    }
}
