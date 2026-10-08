// The scorer of the offline routing replay: the calibration gate, the pre-registered bars R1-R4 (SPEC-bundle-1.md 1.3), the length-guard decision (1.4) and the app-smoke bars S-R1 / S-R2 (7.4).
// Pure functions first (calibrated by cal-routing.mjs), then a CLI that refuses fake, partial or stopped runs. NO network, NO model. Prints ids, counts and numbers only; never a clip's or an answer's text.
//   node score-routing.mjs                 reads routing/runs/{B0-r1,B1-r1,B1-r2,V-r1}.json and routing/heard-words.json
//   node score-routing.mjs --sr <hardOutside> <hardShownLive> <easyOutside> <easyShownLive>     the app-smoke S-R1 / S-R2 rule on counts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTING, RUNS, MISROUTED_R1, GUARD_WORDS, CTX_SHA12, OLD, NEW, loadRoster, routeReader, runFile } from './common.mjs';
import { classifyRun, deciderText } from './classify.mjs';

const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pctile = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };

// ---- spec constants (1.3 bars)
export const BARS = { R1_MAX: 1, R2_MIN: 15, R2_VS_B0: 3, R2T_MS: 300, R3_MAX: 2, GATE_MIN: 2, GUARD_BLOCK_MAX: 2 };

/** { HARD: {HARD,EASY,LATE,NONE}, EASY: {...} } by roster key. `keys` = { id: 'EASY'|'HARD' }. Every roster id must be classified. */
export function tally(classes, keys) {
    const t = { HARD: { HARD: 0, EASY: 0, LATE: 0, NONE: 0 }, EASY: { HARD: 0, EASY: 0, LATE: 0, NONE: 0 } };
    for (const [id, k] of Object.entries(keys)) { const c = classes[id]; if (!c) throw new Error(`${id} was not classified`); t[k][c.cls]++; }
    return t;
}
const idsWhere = (classes, keys, key, cls) => Object.keys(keys).filter((id) => keys[id] === key && classes[id]?.cls === cls);

/** Spec 1.3 "Calibration gate": the OLD instruction must route at least 2 of RH04, RH05, RH07, RH08 to EASY, or the replay cannot show an improvement. */
export function calibrationGate(b0, ids = MISROUTED_R1) {
    const routedEasy = ids.filter((id) => b0[id]?.cls === 'EASY');
    return { pass: routedEasy.length >= BARS.GATE_MIN, routedEasy, n: ids.length };
}

const fwTimes = (classes) => Object.values(classes).filter((c) => c.fwAt !== null && c.cls !== 'NONE').map((c) => c.fwAt);

/** R1-R4 + the reported figures. b1: array of two classification maps; keysLive: live40 keys; v: scenario50 classes. */
export function routingBars({ b0, b1, v, keysLive, keysV }) {
    const out = [], reps = b1.length;
    const b0Easy = idsWhere(b0, keysLive, 'EASY', 'EASY').length;
    const r1 = b1.map((c) => idsWhere(c, keysLive, 'HARD', 'EASY'));
    out.push({ id: 'R1', pass: r1.every((x) => x.length <= BARS.R1_MAX), detail: `HARD routed EASY per rep [${r1.map((x) => x.length)}] of ${Object.values(keysLive).filter((k) => k === 'HARD').length} (max ${BARS.R1_MAX} in each rep); ids ${r1.map((x) => `[${x}]`).join(' ')}` });
    const r2 = b1.map((c) => idsWhere(c, keysLive, 'EASY', 'EASY').length);
    out.push({ id: 'R2', pass: r2.every((n) => n >= BARS.R2_MIN && n >= b0Easy - BARS.R2_VS_B0), detail: `EASY routed EASY within the deadline per rep [${r2}] of ${Object.values(keysLive).filter((k) => k === 'EASY').length} (need >= ${BARS.R2_MIN} and >= B0 ${b0Easy} - ${BARS.R2_VS_B0} = ${b0Easy - BARS.R2_VS_B0})` });
    const p50 = (c) => median(fwTimes(c)), b0p50 = p50(b0);
    out.push({ id: 'R2t', pass: b1.every((c) => p50(c) <= b0p50 + BARS.R2T_MS), detail: `first-word p50 ms from Q: B0 ${b0p50}, B1 reps [${b1.map(p50)}] (each <= B0 + ${BARS.R2T_MS}); p90 B0 ${pctile(fwTimes(b0), 0.9)}, B1 [${b1.map((c) => pctile(fwTimes(c), 0.9))}] (reported)` });
    const vEasy = idsWhere(v, keysV, 'HARD', 'EASY');
    out.push({ id: 'R3', pass: vEasy.length <= BARS.R3_MAX, detail: `scenario50 S1+S2 routed EASY ${vEasy.length} of ${Object.keys(keysV).length} (max ${BARS.R3_MAX}); ids [${vEasy}]` });
    // R4 counts SHOWN tokens only: a garbled first word on a LATE item goes to the pipeline and is never shown (spec 97); those are reported separately
    const garbled = (c) => Object.entries(c).filter(([, x]) => x.garbled && x.cls === 'HARD').map(([id]) => id);
    const lateGarbled = (c) => Object.values(c).filter((x) => x.garbled && x.cls === 'LATE').length;
    const g = [...b1.map(garbled), garbled(v)];
    out.push({ id: 'R4', pass: g.every((x) => x.length === 0), detail: `garbled routing tokens: B1 reps [${b1.map((c) => garbled(c).length)}] V ${garbled(v).length}; B0 ${garbled(b0).length} (reported); garbled on LATE (never shown, not counted) B1 [${b1.map(lateGarbled)}] V ${lateGarbled(v)} B0 ${lateGarbled(b0)}; ids ${g.flat().join(',') || '-'}` });
    const lateNone = (name, c) => `${name} LATE ${Object.values(c).filter((x) => x.cls === 'LATE').length} NONE ${Object.values(c).filter((x) => x.cls === 'NONE').length}`;
    out.push({ id: 'info', pass: true, detail: `reported only: ${[lateNone('B0', b0), ...b1.map((c, i) => lateNone(`B1r${i + 1}`, c)), lateNone('V', v)].join('; ')}; row-4 failures among on-time EASY B1 [${b1.map((c) => Object.values(c).filter((x) => x.cls === 'EASY' && x.row4 !== 'ok').length)}]` });
    return out;
}

/**
 * Spec 1.4. Ship the length guard ONLY IF: the calibration gate passed; B1 alone fails R1; B1 + guard passes R1 in both reps; the guard blocks <= 2 of B1's EASY in each rep.
 * `words` = the HEARD dispatch word count per id (r1, last dispatch per id). The guard sends a question of MORE than GUARD_WORDS words to the pipeline.
 */
export function guardDecision({ gatePass, b1, keysLive, words, limit = GUARD_WORDS }) {
    const reasons = [];
    for (const id of Object.keys(keysLive)) if (typeof words[id] !== 'number') throw new Error(`no heard word count for ${id}`);
    if (!gatePass) return { ship: false, reasons: ['the calibration gate failed: the offline replay cannot show an improvement; no length guard ships (spec 1.3)'], perRep: [] };
    const perRep = b1.map((c) => {
        const hardEasy = idsWhere(c, keysLive, 'HARD', 'EASY');
        const left = hardEasy.filter((id) => words[id] <= limit);
        const blockedEasy = idsWhere(c, keysLive, 'EASY', 'EASY').filter((id) => words[id] > limit);
        return { alone: hardEasy.length, afterGuard: left.length, blockedEasy: blockedEasy.length, blockedIds: blockedEasy, stillMisrouted: left };
    });
    const aloneFails = perRep.some((r) => r.alone > BARS.R1_MAX);
    if (!aloneFails) reasons.push('B1 alone already passes R1 in both reps: no guard is needed');
    if (!perRep.every((r) => r.afterGuard <= BARS.R1_MAX)) reasons.push(`B1 + guard still fails R1 (HARD routed EASY after the guard per rep [${perRep.map((r) => r.afterGuard)}])`);
    if (!perRep.every((r) => r.blockedEasy <= BARS.GUARD_BLOCK_MAX)) reasons.push(`the guard blocks more than ${BARS.GUARD_BLOCK_MAX} of B1's EASY in a rep ([${perRep.map((r) => r.blockedEasy)}])`);
    return { ship: reasons.length === 0, reasons, perRep };
}

/** App smoke S-R1 / S-R2 (spec 7.4). Counts are OUTSIDE the drill windows. floor(13 x n / 20): r1's registered 13/20 EASY, scaled to the EASY items outside the windows. */
export const sR2Floor = (nEasyOutside) => Math.floor((13 * nEasyOutside) / 20);
export function smokeBars({ hardShownLive, easyShownLive, nEasyOutside }) {
    return [
        { id: 'S-R1', pass: hardShownLive <= 1, detail: `HARD shown Live ${hardShownLive} (max 1)` },
        { id: 'S-R2', pass: easyShownLive >= sR2Floor(nEasyOutside), detail: `EASY shown Live ${easyShownLive} of ${nEasyOutside} outside the windows (need >= floor(13 x ${nEasyOutside} / 20) = ${sR2Floor(nEasyOutside)})` },
    ];
}

/** The short-answer opening on Live for the reported ids (spec 1.3, "RE10, RE14 x reps"): did the first 5 words of the EASY answer carry the bench's S1 key? words = the answer's length. Booleans/numbers only. */
export function openingReport(runs, R, ids, keys) {
    return ids.map((id) => runs.map((run) => {
        const it = run.items.find((x) => x.id === id), text = it ? deciderText(it.events ?? [], R) : '';
        const first = (text.trim().match(/\S+/g) || []).slice(0, 5).join(' ').toLowerCase();
        return { id, answered: text.trim().length > 0, key: keys[id] ? keys[id].test(first) : null, words: (text.trim().match(/\S+/g) || []).length };
    }));
}

/** Why B1 / V may not run: B0 missing, not scoreable, or the calibration gate failed. null = they may run. Pure on the B0 run object (or null). */
export function gateProblem(b0run, expectIds, R, pending = null) {
    if (!b0run) return 'B0 is missing: run B0 first (the calibration gate is read before B1 and V)';
    const pr = runProblems(b0run, expectIds, 'B0', 'B0');
    // the run about to start must use B0's context (same sha, same substitute flag)
    if (!pr.length && pending) pr.push(...contextProblems([{ label: 'B0', run: b0run }, { label: pending.label, run: { shas: { ctx: pending.ctx }, substitute: pending.substitute } }]));
    if (pr.length) return `B0 is not scoreable: ${pr.join(' | ')}`;
    const g = calibrationGate(classifyRun(b0run, R));
    return g.pass ? null : `the calibration gate FAILED: B0 routed ${g.routedEasy.length} of ${g.n} r1 misroutes to EASY (need >= ${BARS.GATE_MIN}); the replay cannot show an improvement. The routing claim moves to the app smoke (spec 1.3); no length guard ships`;
}

export const EXPECT_SHAS = { B0: { instruction: OLD.instruction, block: OLD.block }, B1: { instruction: NEW.instruction, block: NEW.block }, V: { instruction: NEW.instruction, block: NEW.block } };
export const EXPECT_MODEL = 'gemini-3.8-live';
/** One context for every run: identical shas.ctx and identical substitute flag across all of them; a non-substitute context must be the registered sha. */
export function contextProblems(items) {
    const bad = [], ctxs = items.map((x) => x.run.shas?.ctx);
    if (ctxs.some((c) => typeof c !== 'string' || !c)) bad.push('a run records no context sha');
    else if (new Set(ctxs).size !== 1) bad.push(`the runs did not use ONE context (${items.map((x, i) => x.label + ':' + ctxs[i]).join(' ')})`);
    const subs = items.map((x) => !!x.run.substitute);
    if (new Set(subs).size !== 1) bad.push('substitute and registered contexts are mixed across runs');
    else if (!subs[0] && ctxs[0] && ctxs[0] !== CTX_SHA12) bad.push(`the context sha ${ctxs[0]} is not the registered ${CTX_SHA12} and the runs are not marked SUBSTITUTE`);
    return bad;
}

/** Why a run file may not be scored. [] = scoreable. `arm` (B0|B1|V), when given, also checks the recorded instruction, block, model and arm. */
export function runProblems(run, expectIds, label, arm = null) {
    const bad = [];
    if (arm) {
        const e = EXPECT_SHAS[arm];
        if (run.shas?.instruction !== e.instruction || run.shas?.block !== e.block) bad.push(`${label}: instruction/block sha ${run.shas?.instruction}/${run.shas?.block}, expected ${e.instruction}/${e.block}`);
        if (run.model !== EXPECT_MODEL) bad.push(`${label}: model ${run.model}, expected ${EXPECT_MODEL}`);
        if (run.arm !== arm) bad.push(`${label}: run is arm ${run.arm}`);
    }
    if (run.fake) bad.push(`${label}: a FAKE run (scripted stand-in), never scored`);
    if (run.stopped) bad.push(`${label}: the run stopped early (${run.stopped})`);
    if (run.partial) bad.push(`${label}: partial run`);
    const ids = run.items.map((i) => i.id);
    if (JSON.stringify(ids) !== JSON.stringify(expectIds)) bad.push(`${label}: item ids differ from the roster`);
    const notPlayed = run.items.filter((i) => i.played === false).map((i) => i.id);
    if (notPlayed.length) bad.push(`${label}: ${notPlayed.length} items not played (${notPlayed.slice(0, 4)})`);
    return bad;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
    if (argv[0] === '--sr') {
        const [ho, hs, eo, es] = argv.slice(1).map(Number);
        if ([ho, hs, eo, es].some((x) => !Number.isInteger(x) || x < 0)) refuse('usage: --sr <hardOutside> <hardShownLive> <easyOutside> <easyShownLive> (non-negative integers)');
        if (hs > ho || es > eo) refuse('shown-Live counts cannot exceed the outside counts');
        const bars = smokeBars({ hardShownLive: hs, easyShownLive: es, nEasyOutside: eo });
        for (const b of bars) console.log(`${b.pass ? 'PASS' : 'FAIL'} ${b.id} ${b.detail}`);
        process.exit(bars.every((b) => b.pass) ? 0 : 1);
    }
    const R = routeReader();
    const live = await loadRoster('live40'), s50 = await loadRoster('scenario50');
    const need = [['B0', 1], ['B1', 1], ['B1', 2], ['V', 1]];
    const runs = {};
    for (const [a, r] of need) { const f = runFile(a, r); if (!fs.existsSync(f)) refuse(`${f} missing`); runs[`${a}${r}`] = JSON.parse(fs.readFileSync(f, 'utf8')); }
    const expectLive = live.map((i) => i.id), expectV = s50.map((i) => i.id);
    const problems = [...runProblems(runs.B01, expectLive, 'B0', 'B0'), ...runProblems(runs.B11, expectLive, 'B1r1', 'B1'), ...runProblems(runs.B12, expectLive, 'B1r2', 'B1'), ...runProblems(runs.V1, expectV, 'V', 'V'), ...contextProblems([{ label: 'B0', run: runs.B01 }, { label: 'B1r1', run: runs.B11 }, { label: 'B1r2', run: runs.B12 }, { label: 'V', run: runs.V1 }])];
    if (problems.length) refuse(problems.join(' | '));
    if (runs.B01.substitute) { const log0 = console.log; console.log = (...a) => log0('SUBSTITUTE', ...a); console.log('the context is a USER-RULED SUBSTITUTE (not b2a43a2159a2); every line is marked; absolute rates are not comparable with r1'); }
    const keysLive = Object.fromEntries(live.map((i) => [i.id, i.key])), keysV = Object.fromEntries(s50.map((i) => [i.id, i.key]));
    const c = { b0: classifyRun(runs.B01, R), b1: [classifyRun(runs.B11, R), classifyRun(runs.B12, R)], v: classifyRun(runs.V1, R) };
    const gate = calibrationGate(c.b0);
    console.log(`${gate.pass ? 'GATE PASS' : 'GATE FAIL'} B0 (OLD instruction) routed ${gate.routedEasy.length} of ${gate.n} r1 misroutes to EASY [${gate.routedEasy}] (need >= ${BARS.GATE_MIN})`);
    const t0 = tally(c.b0, keysLive);
    console.log(`B0 tally HARD-key ${JSON.stringify(t0.HARD)} EASY-key ${JSON.stringify(t0.EASY)}`);
    c.b1.forEach((x, i) => console.log(`B1r${i + 1} tally HARD-key ${JSON.stringify(tally(x, keysLive).HARD)} EASY-key ${JSON.stringify(tally(x, keysLive).EASY)}`));
    const bars = routingBars({ b0: c.b0, b1: c.b1, v: c.v, keysLive, keysV });
    for (const b of bars) console.log(`${b.pass ? 'PASS' : 'FAIL'} ${b.id.padEnd(4)} ${b.detail}`);
    if (!gate.pass) console.log('NOTE: the calibration gate failed, so these bars cannot show an improvement; the routing claim moves to the app smoke S-R1/S-R2 on live40 (the TUNING set, not validation) and NO length guard ships (spec 1.3).');
    const hwFile = path.join(ROUTING, 'heard-words.json');
    if (!fs.existsSync(hwFile)) refuse(`${hwFile} missing: run heard-words.mjs`);
    const words = JSON.parse(fs.readFileSync(hwFile, 'utf8'));
    const g = guardDecision({ gatePass: gate.pass, b1: c.b1, keysLive, words });
    console.log(`GUARD ${g.ship ? 'SHIP (len > ' + GUARD_WORDS + ' words -> pipeline)' : 'NO GUARD'}: ${g.reasons.join('; ') || 'all four conditions hold'}; per rep ${JSON.stringify(g.perRep.map((r) => ({ alone: r.alone, afterGuard: r.afterGuard, blockedEasy: r.blockedEasy })))}`);
    console.log(`residual: scenario50 has no EASY items, so a shipped guard's EASY cost is validated on live40 (the tuning set) only`);
    const KEYS = { RE10: /azure functions/, RE14: /parquet/ };
    const op = openingReport([runs.B11, runs.B12], R, ['RE10', 'RE14'], KEYS);
    console.log(`reported: short-answer opening on Live, per id per rep: ${op.map((rr) => rr.map((x) => `${x.id}:${x.answered ? (x.key ? 'key' : 'no-key') : 'not-answered-by-Live'}/${x.words}w`).join(' ')).join(' | ')}`);
    fs.writeFileSync(path.join(ROUTING, 'score-routing.result.json'), JSON.stringify({ at: new Date().toISOString(), gate, bars, guard: g }, null, 1));
    process.exit(gate.pass && bars.every((b) => b.pass) ? 0 : 1);
}
