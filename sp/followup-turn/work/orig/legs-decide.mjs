// The pre-registered decision (PREREGISTER-turn-followup.md section 7) for the turn-based follow-up context replay.
// `decide({ front, back }, verdictOf, opts)` is exported PURE and calibrated by scripts/legs-decide-calibrate.mjs on synthetic
// verdicts for every branch of section 7 (and mutation-tested by scripts/mutate-decide.mjs) before it reads a real verdict.
//
//   node legs-decide.mjs --calibrate      runs the calibration (every clause holding / failing / inconclusive; VOID; refusals)
//   node legs-decide.mjs                  the real decision: (1) section 2 of the registered file verifies, (2) the parity set
//                                         re-derives -- BOTH before any verdict file is opened (I5) -- then merges the key files,
//                                         both graders' verdict files and the answer files and prints section 7 verbatim
//   node legs-decide.mjs --rerun          the one allowed s50k re-run: pooled over the three hours; a second INCONCLUSIVE = FAIL;
//                                         additivity (pooled = first run + re-run, every count) enforced before a decision prints
//
// Consensus (section 5): wrong = both graders correctness 0; off-topic = both on_topic <= 1; acceptable = both graders'
// verdictOf = acceptable. A completed call whose filtered answer is empty was not graded and scores 0/0/0 for both graders (the
// judge's mergeVerdicts scores an undelivered answer that way). A pair missing an answer after every retry leaves the decision
// and is named; a MISSING VERDICT is an instrument failure and stops the run. A record whose model/thinking/leg does not match
// its leg is a REFUSAL (I4); so is a null `thoughts` in any FRONT record (m8).
//
// blind/graders.json schema (written by the controller): { instrument, graders: { "blind-N.gX": { agent, model, memory: 'ABSENT'|'LOADED',
//   audit: 'clean'|'FLAGGED', replaced: [agentIds the slot replaced, at most one] } } }.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEG_SPEC = { front: { model: 'gemini-3.5-flash-lite', thinking: 'HIGH' }, back: { model: 'gemini-3.1-flash-lite', thinking: 'LOW' } };   // section 4

/** Element min(n-1, floor(n*p)) of the ascending list (section 7). */
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const SCORE = (v) => v && [v.correctness, v.on_topic, v.delivery].every((x) => [0, 1, 2].includes(x));
const num = (x) => typeof x === 'number' && Number.isFinite(x);

function validate(pairs, leg) {
    for (const p of pairs) {
        const tag = `${leg} ${p.key}#${p.rep}`;
        if (!['roster', 'dropped'].includes(p.kind)) throw new Error(`${tag}: unknown kind ${p.kind}`);
        if (leg === 'back' && p.kind !== 'roster') throw new Error(`${tag}: the back leg runs roster items only`);
        for (const arm of ['A', 'B']) {
            const s = p[arm];
            if (!s || !SCORE(s.g1) || !SCORE(s.g2)) throw new Error(`${tag} ${arm}: missing or out-of-range grader scores`);
            if (!num(s.ttft) || !num(s.words)) throw new Error(`${tag} ${arm}: ttft/words not numbers`);
            if (s.leg !== leg || s.model !== LEG_SPEC[leg].model || s.thinking !== LEG_SPEC[leg].thinking) throw new Error(`${tag} ${arm}: REFUSED, the record says leg=${s.leg} model=${s.model} thinking=${s.thinking}, the ${leg} leg is ${LEG_SPEC[leg].model} ${LEG_SPEC[leg].thinking}`);
            if (leg === 'front' && !num(s.thoughts)) throw new Error(`${tag} ${arm}: REFUSED, a front record has no thoughts count (null/missing): clause 5 cannot be decided (m8)`);
        }
    }
}

/**
 * pairs: { front: [pair], back: [pair] }, pair = { key: '<hour>:<id>', hour, id, kind: 'roster'|'dropped', rep, A, B }, each side
 * { g1, g2, ttft, words, thoughts, model, thinking, leg } with g1/g2 = { correctness, on_topic, delivery } (0-2).
 * opts.parity: { ok, why } -- section 6 / precondition 6.4, checked by the caller BEFORE any verdict is opened; ok false -> VOID and NOTHING else.
 * opts.rerun: the pooled s50k re-run of section 7, where a second INCONCLUSIVE is a FAIL (bars are formulas on the pooled complete roster pairs).
 */
export function decide({ front, back }, verdictOf, { parity = { ok: true }, rerun = false } = {}) {
    if (!parity.ok) return { outcome: 'VOID', clauses: null, numbers: null, why: parity.why ?? 'parity failed', lines: ['VOID'] };   // I5: VOID prints no clause line
    validate(front, 'front'); validate(back, 'back');
    const wrong = (s) => s.g1.correctness === 0 && s.g2.correctness === 0;
    const offTopic = (s) => s.g1.on_topic <= 1 && s.g2.on_topic <= 1;
    const acceptable = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';
    const count = (set, arm, f) => set.filter((p) => f(p[arm])).length;

    const roster = front.filter((p) => p.kind === 'roster');
    const R = roster.length;
    if (!R) throw new Error('no complete front roster pairs: nothing to decide on');

    // 1. no new wrong, per leg, either leg failing fails
    const wrongAf = count(front, 'A', wrong), wrongBf = count(front, 'B', wrong), wrongAb = count(back, 'A', wrong), wrongBb = count(back, 'B', wrong);
    const c1front = wrongBf <= wrongAf, c1back = wrongBb <= wrongAb;
    const c1 = c1front && c1back ? 'holds' : 'FAIL';
    // 2. no rise in off-topic, all front pairs (back reported)
    const offAf = count(front, 'A', offTopic), offBf = count(front, 'B', offTopic), offAb = count(back, 'A', offTopic), offBb = count(back, 'B', offTopic);
    const c2 = offBf <= offAf ? 'holds' : 'FAIL';

    // 3-5 on R (the front leg's complete roster pairs); the all-front-pairs figures are reported only
    const med = (set, f) => pct(set.map(f), 0.5);
    const dTtft = med(roster, (p) => p.B.ttft - p.A.ttft);
    const c3a = dTtft <= 500 ? 'holds' : dTtft > 1000 ? 'FAIL' : 'INCONCLUSIVE';
    const p90A = pct(roster.map((p) => p.A.ttft), 0.9), p90B = pct(roster.map((p) => p.B.ttft), 0.9);
    const c3b = p90B <= p90A + 2000 ? 'holds' : 'INCONCLUSIVE';
    const slowA = roster.filter((p) => p.A.ttft > 10000).length, slowB = roster.filter((p) => p.B.ttft > 10000).length;
    const allow3c = Math.ceil((2 * R) / 39);
    const c3c = slowB <= slowA + allow3c ? 'holds' : 'FAIL';
    const dWords = med(roster, (p) => p.B.words - p.A.words);
    const c4 = dWords <= 5 ? 'holds' : dWords > 10 ? 'FAIL' : 'INCONCLUSIVE';
    const dThoughts = med(roster, (p) => p.B.thoughts - p.A.thoughts);
    const c5 = dThoughts <= 150 ? 'holds' : 'FAIL';
    // 7. gain on R
    const accA = count(roster, 'A', acceptable), accB = count(roster, 'B', acceptable);
    const delta = accB - accA;
    const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);
    const c7 = delta >= passBar ? 'PASS' : delta <= failBar ? 'FAIL' : 'INCONCLUSIVE';

    const nF = front.length;
    const all = {
        dTtft: med(front, (p) => p.B.ttft - p.A.ttft), p90A: pct(front.map((p) => p.A.ttft), 0.9), p90B: pct(front.map((p) => p.B.ttft), 0.9),
        slowA: front.filter((p) => p.A.ttft > 10000).length, slowB: front.filter((p) => p.B.ttft > 10000).length, allow3c: Math.ceil((2 * nF) / 39),
        dWords: med(front, (p) => p.B.words - p.A.words), dThoughts: med(front, (p) => p.B.thoughts - p.A.thoughts),
    };
    const backR = back.length;
    const backAcc = backR ? { A: count(back, 'A', acceptable), B: count(back, 'B', acceptable) } : { A: 0, B: 0 };
    const backThoughts = backR && back.every((p) => num(p.A.thoughts) && num(p.B.thoughts)) ? med(back, (p) => p.B.thoughts - p.A.thoughts) : null;

    const clauses = { c1, c2, c3a, c3b, c3c, c4, c5, c7 };
    let outcome = Object.values(clauses).includes('FAIL') ? 'FAIL'
        : ['c1', 'c2', 'c3a', 'c3b', 'c3c', 'c4', 'c5'].every((k) => clauses[k] === 'holds') && c7 === 'PASS' ? 'PASS' : 'INCONCLUSIVE';
    if (rerun && outcome === 'INCONCLUSIVE') outcome = 'FAIL';
    return {
        outcome, clauses, nFront: nF, nBack: backR, R, c1legs: { front: c1front ? 'holds' : 'FAIL', back: c1back ? 'holds' : 'FAIL' },
        numbers: {
            wrongAf, wrongBf, wrongAb, wrongBb, offAf, offBf, offAb, offBb, dTtft, p90A, p90B, slowA, slowB, allow3c, dWords, dThoughts, accA, accB, delta, passBar, failBar,
            all, backAcc, backDelta: backAcc.B - backAcc.A, backThoughts,
        },
    };
}

const sgn = (n) => (n >= 0 ? '+' : '') + n;
export function formatResult(r) {
    if (r.outcome === 'VOID') return 'VOID';
    const x = r.numbers, a = x.all;
    return [
        `n_front = ${r.nFront} complete front pairs (roster + D); R = ${r.R} complete roster pairs (the bars below are formulas on R); n_back = ${r.nBack} complete back pairs`,
        `1. no new wrong, per leg       front: consensus-wrong B ${x.wrongBf} <= A ${x.wrongAf}: ${r.c1legs.front}; back: B ${x.wrongBb} <= A ${x.wrongAb}: ${r.c1legs.back}  =>  ${r.clauses.c1}`,
        `2. no rise in off-topic        front consensus-off-topic B ${x.offBf} <= A ${x.offAf}: ${r.clauses.c2}   (back, reported: B ${x.offBb}, A ${x.offAb})`,
        `3a. not later (median)         median paired TTFT B-A on R ${x.dTtft} ms (holds <= +500, FAIL > +1000): ${r.clauses.c3a}   (all ${r.nFront} front pairs, reported: ${a.dTtft} ms)`,
        `3b. not later (p90)            p90 B ${x.p90B} ms vs p90 A ${x.p90A} ms + 2000: ${r.clauses.c3b}   (all front pairs, reported: B ${a.p90B} vs A ${a.p90A})`,
        `3c. stalls                     TTFT > 10 s on R: B ${x.slowB} <= A ${x.slowA} + ${x.allow3c}: ${r.clauses.c3c}   (all front pairs, reported: B ${a.slowB} <= A ${a.slowA} + ${a.allow3c})`,
        `4. not longer                  median paired words B-A on R ${x.dWords} (holds <= +5, FAIL > +10): ${r.clauses.c4}   (all front pairs, reported: ${a.dWords})`,
        `5. not more thinking           median paired thoughts B-A on R ${x.dThoughts} tokens (holds <= +150): ${r.clauses.c5}   (all front pairs, reported: ${a.dThoughts}; back leg at LOW, reported: ${x.backThoughts ?? 'n/a'})`,
        `6. parity                      checked before any verdict was opened: holds`,
        `7. gain, on R                  consensus-acceptable B ${x.accB} - A ${x.accA} = ${sgn(x.delta)} (PASS >= +${x.passBar}, FAIL <= +${x.failBar}): ${r.clauses.c7}   (back leg, descriptive: ${sgn(x.backDelta)} on ${r.nBack} pairs)`,
        `DECISION: ${r.outcome}`,
    ].join('\n');
}

/** Per-item rows (section 7.7 + descriptive): one row per hour:id with A/B symbols per rep, per-hour deltas on roster pairs. */
export function itemTables(pairs, verdictOf, leg) {
    const sym = (s) => (s.g1.correctness === 0 && s.g2.correctness === 0 ? 'X' : verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable' ? 'Y' : s.g1.on_topic <= 1 && s.g2.on_topic <= 1 ? 'o' : 'w');
    const acc = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';
    const keys = [...new Set(pairs.map((p) => p.key))];
    const lines = [`${leg} leg, per item (reps in order; Y both graders acceptable, X both correctness 0, o both on_topic <= 1, w otherwise):`];
    for (const key of keys) {
        const ps = pairs.filter((p) => p.key === key).sort((a, b) => a.rep - b.rep);
        lines.push(`  ${key.padEnd(11)} ${ps[0].kind.padEnd(8)} A ${ps.map((p) => sym(p.A)).join('')}  B ${ps.map((p) => sym(p.B)).join('')}   acceptable A ${ps.filter((p) => acc(p.A)).length} B ${ps.filter((p) => acc(p.B)).length} of ${ps.length}`);
    }
    const hours = [...new Set(pairs.map((p) => p.hour))];
    for (const h of hours) {
        const rs = pairs.filter((p) => p.hour === h && p.kind === 'roster');
        lines.push(`  hour ${h}: roster pairs ${rs.length}, consensus-acceptable A ${rs.filter((p) => acc(p.A)).length} B ${rs.filter((p) => acc(p.B)).length}, delta ${sgn(rs.filter((p) => acc(p.B)).length - rs.filter((p) => acc(p.A)).length)}`);
    }
    return lines;
}

/** Additivity of the re-run (section 7): every pooled count equals the first run's plus the re-run's, each read alone. */
export function checkAdditivity(pooled, first, second) {
    const sums = ['wrongAf', 'wrongBf', 'wrongAb', 'wrongBb', 'offAf', 'offBf', 'offAb', 'offBb', 'slowA', 'slowB', 'accA', 'accB'];
    const bad = sums.filter((k) => pooled.numbers[k] !== first.numbers[k] + second.numbers[k]);
    if (pooled.R !== first.R + second.R || pooled.nFront !== first.nFront + second.nFront || pooled.nBack !== first.nBack + second.nBack) bad.push('pair counts');
    return bad;
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    if (argv.includes('--calibrate')) {
        const r = spawnSync(process.execPath, [path.join(HERE, 'scripts', 'legs-decide-calibrate.mjs')], { stdio: 'inherit' });
        process.exit(r.status ?? 1);
    }
    const C = await import(pathToFileURL(path.join(HERE, 'scripts', 'common.mjs')).href);
    const rerun = argv.includes('--rerun');
    const FIRST = C.PRIMARY_HOURS, RERUN = ['s50k'];

    // (1) section 2 and (2) the parity set, BEFORE any verdict file is opened (I5)
    const fail = (why) => { console.log('VOID'); console.error(`VOID reason (not a clause line): ${why}`); process.exit(4); };
    try {
    const v = C.verifySection2();
    if (!v.ok) fail(`section 2 does not verify: ${v.problems.slice(0, 8).join(' | ')}`);
    const ref = await import(pathToFileURL(C.REF).href);
    for (const hour of rerun ? [...FIRST, ...RERUN] : FIRST) {
        const fx = JSON.parse(fs.readFileSync(path.join(C.R_DIR, `turn-parity-${hour}.json`), 'utf8'));
        const G = JSON.parse(fs.readFileSync(path.join(C.R_DIR, `${hour}-gated-turn.json`), 'utf8'));
        for (const [key, e] of Object.entries(fx)) {
            const res = ref.buildEarlierQuestion({ question: e.question, turnId: e.turnId, supersede: e.supersede, ledger: e.ledger, promptLines: e.promptLines });
            if (res.block !== e.expectedBlock || res.cue !== e.expectedCue || C.sha(res.block) !== e.expectedSha256) fail(`parity: ${key} no longer re-derives`);
            if (!e.expectedBlock && G[key]) fail(`parity: ${key} is gated but the fixture says ''`);
            if (e.expectedBlock && !G[key]) fail(`parity: ${key} has a block but is not in the gated file`);
            if (e.expectedBlock && G[key] && C.sha(G[key].block) !== e.expectedSha256) fail(`parity: ${key}'s gated block is not the fixture's block`);
        }
        for (const id of ['S2Q09F', 'S1Q08', 'S2Q08', 'S2Q01F']) if (fx[`${hour}:${id}`]?.expectedBlock !== '') fail(`parity: ${hour}:${id} must be '' by id`);
        if (Object.keys(fx).length !== 42) fail(`parity: ${hour} fixture holds ${Object.keys(fx).length} entries, not 42`);
    }
    } catch (e) { fail(`precondition error (an exception here is a VOID, never a crash): ${e.message}`); }

    // (3) only now are the key files, the graders' verdicts and the answer files opened
    const J = await import(pathToFileURL(path.join(C.MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
    const stamp = J.graderPromptVersion();
    if (stamp !== C.INSTRUMENT) { console.log(`REPORTED, NOT DECIDED: instrument ${stamp} is not ${C.INSTRUMENT}`); process.exit(3); }
    const collect = async (hours, tag) => {
        const { G } = await C.loadGated(hours);
        const dir = tag === 'rerun' ? path.join(C.OUT_DIR, 'blind-rerun') : C.BLIND_DIR;
        const gj = path.join(dir, 'graders.json');
        if (!fs.existsSync(gj)) { console.log(`REPORTED, NOT DECIDED: missing ${gj}`); process.exit(3); }
        const gs = JSON.parse(fs.readFileSync(gj, 'utf8'));
        const keyFiles = fs.readdirSync(dir).filter((f) => /^key\.blind-\d+\.json$/.test(f));
        const slots = Object.entries(gs.graders ?? {});
        const bad = slots.filter(([, g]) => g.model !== C.PINNED_GRADER || g.memory !== 'ABSENT' || g.audit !== 'clean' || (g.replaced ?? []).length > 1);
        if (gs.instrument !== C.INSTRUMENT || slots.length !== 2 * keyFiles.length || bad.length) { console.log(`REPORTED, NOT DECIDED: ${gj}: instrument ${gs.instrument}, ${slots.length} graders for ${keyFiles.length} files; not pinned/ABSENT/clean/at most one replacement: ${bad.map(([k]) => k).join(', ') || 'none'}`); process.exit(3); }
        const scores = {};
        for (const kf of keyFiles) {
            const nf = kf.match(/^key\.blind-(\d+)\.json$/)[1];
            const keys = JSON.parse(fs.readFileSync(path.join(dir, kf), 'utf8'));
            for (const g of C.GRADERS) {
                const vf = path.join(dir, `verdicts.blind-${nf}.${g}.json`);
                if (!fs.existsSync(vf)) { console.error(`missing ${vf}: every blind file needs both graders' verdicts`); process.exit(2); }
                const vv = JSON.parse(fs.readFileSync(vf, 'utf8'));
                const extra = Object.keys(vv).filter((k) => !keys[k]);
                if (extra.length) { console.error(`${path.basename(vf)} grades keys that are not in ${kf}: ${extra.join(', ')}`); process.exit(2); }
                for (const [k, meta] of Object.entries(keys)) {
                    if (!SCORE(vv[k])) { console.error(`${path.basename(vf)}: no valid verdict for ${k}`); process.exit(2); }
                    ((scores[`${meta.leg}|${meta.key}|${meta.arm}|${meta.rep}`] ??= {})[g] = vv[k]);
                }
            }
        }
        const EMPTY = { correctness: 0, on_topic: 0, delivery: 0 };
        const out = { front: [], back: [] }, incomplete = [], emptied = [];
        for (const leg of ['front', 'back']) {
            const store = {};
            for (const h of hours) for (const arm of C.ARMS) for (let rep = 1; rep <= C.LEGS[leg].reps; rep++) store[`${h}|${arm}|${rep}`] = JSON.parse(fs.readFileSync(C.fileFor(leg, h, arm, rep), 'utf8'));
            for (const key of C.itemsFor(G, leg, hours)) for (let rep = 1; rep <= C.LEGS[leg].reps; rep++) {
                const o = G[key], side = {};
                for (const arm of C.ARMS) {
                    const x = store[`${o.hour}|${arm}|${rep}`][key];
                    if (!x || x.transientError) continue;
                    const meta = { thoughts: x.thoughts ?? null, model: x.model, thinking: x.thinking, leg: x.leg };
                    // No text at all (ttft null): the candidate waited `total` ms to see nothing; that wait is its first-token time.
                    if (!x.spoken) { emptied.push(`${leg}:${arm}r${rep}:${key}${x.ttft == null ? ' (no text at all)' : ''}`); side[arm] = { g1: EMPTY, g2: EMPTY, ttft: x.ttft ?? x.total, words: 0, ...meta }; continue; }
                    const s = scores[`${leg}|${key}|${arm}|${rep}`];
                    if (!s?.g1 || !s?.g2) { console.error(`${leg} ${key} r${rep} ${arm}: answered but not graded by both graders`); process.exit(2); }
                    side[arm] = { g1: s.g1, g2: s.g2, ttft: x.ttft, words: x.words, ...meta };
                }
                if (!side.A || !side.B) { incomplete.push(`${leg}:${key}#${rep} (${C.ARMS.filter((a) => !side[a]).join(',')} missing)`); continue; }
                out[leg].push({ key, hour: o.hour, id: o.id, kind: o.kind, rep, A: side.A, B: side.B });
            }
        }
        return { ...out, incomplete, emptied, nGraders: slots.length };
    };
    const first = await collect(FIRST, 'first');
    let use = first, second = null, r;
    if (rerun) {
        second = await collect(RERUN, 'rerun');
        use = { front: [...first.front, ...second.front], back: [...first.back, ...second.back], incomplete: [...first.incomplete, ...second.incomplete], emptied: [...first.emptied, ...second.emptied] };
        r = decide(use, J.verdictOf, { rerun: true });
        const bad = checkAdditivity(r, decide(first, J.verdictOf), decide(second, J.verdictOf));
        if (bad.length) { console.log(`ADDITIVITY FAILED: ${bad.join(', ')}`); process.exit(4); }
        console.log('additivity OK: every pooled count equals the first run plus the re-run');
    } else r = decide(first, J.verdictOf);
    console.log(`instrument ${stamp}; graders ${C.PINNED_GRADER} x ${first.nGraders}${second ? ` + ${second.nGraders}` : ''}`);
    console.log(`incomplete pairs (excluded): ${use.incomplete.length ? use.incomplete.join(', ') : 'none'}`);
    console.log(`answers empty after the filters (scored 0/0/0): ${use.emptied.length ? use.emptied.join(', ') : 'none'}`);
    console.log(formatResult(r));
    // Reported beside the rule, never decided on
    const either = (set, arm, f) => set.filter((p) => f(p[arm].g1) || f(p[arm].g2)).length;
    console.log(`\neither grader (front): wrong A ${either(use.front, 'A', (g) => g.correctness === 0)} B ${either(use.front, 'B', (g) => g.correctness === 0)}; off-topic A ${either(use.front, 'A', (g) => g.on_topic <= 1)} B ${either(use.front, 'B', (g) => g.on_topic <= 1)}`);
    for (const line of itemTables(use.front, J.verdictOf, 'front')) console.log(line);
    for (const line of itemTables(use.back, J.verdictOf, 'back')) console.log(line);
}
