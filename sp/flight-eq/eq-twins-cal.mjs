// E\eq-twins-cal.mjs: the known-answer calibration of eq-twins.mjs (registration b6; A2.10; A3.3; A3.4; A4.4). No model is called; nothing is written
// outside E (scratch: E\eqcal-twins\). Output = E\eq-twins.cal.txt. Ids, counts and hashes only.
//   node eq-twins-cal.mjs [--no-mutants]
// Parts: (A) the replay's own s50m files and verdicts (direct, rebuilt through the blind builder with a text oracle, mutated); (B) synthetic verdicts for
// every branch of rules 3a/4b/4c/2b/2c/2d, holes, empties, -b, the sitting condition, the blind split; (C) the CLI on a synthetic run (exit codes, no leak);
// (D) mutants of eq-twins.mjs: each must make part A+B fail.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.join(E, 'eq-twins.mjs');
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TMP = path.join(E, 'eqcal-twins');
const MUT = path.join(E, 'eqcal-twins-mut');
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

const sc = (c, o, d) => { const v = { correctness: c, on_topic: o, delivery: d }; return { g1: { ...v }, g2: { ...v } }; };
const SPEC = { Y: sc(2, 2, 2), w: sc(1, 2, 2), o: sc(2, 1, 2), X: sc(0, 2, 2), Z: sc(2, 0, 2) };   // Y acceptable, w weak, o off-topic, X wrong (correctness 0), Z wrong via on_topic 0

export async function runAll(M, { quiet = false, file = SELF } = {}) {
    const results = [];
    const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond, extra }); if (!quiet) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
    const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);

    // ── B0. verdictOf is the judge's, on all 27 triples ──
    let same = 0, tot = 0;
    for (const c of [0, 1, 2]) for (const o of [0, 1, 2]) for (const d of [0, 1, 2]) { tot++; if (M.verdictOf({ correctness: c, on_topic: o, delivery: d }) === J.verdictOf({ correctness: c, on_topic: o, delivery: d })) same++; }
    ck('verdictOf equals the judge module on all 27 score triples', same === tot, `${same}/${tot}`);

    // ── A. the replay's own files ──
    const ROSTER = ['S1Q04F', 'S1Q06F', 'S2Q05F', 'S2Q08F'];
    const rj = (f) => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
    const replayStores = {};
    for (const [leg, model, reps] of [['front', 'gemini-3.5-flash-lite', 5], ['back', 'gemini-3.1-flash-lite', 3]]) for (let rep = 1; rep <= reps; rep++) {
        replayStores[`${leg}|nob|${rep}`] = rj(`interview60.answers.${model}_fturn-s50m-A-r${rep}.json`);
        replayStores[`${leg}|blk|${rep}`] = rj(`interview60.answers.${model}_fturn-s50m-B-r${rep}.json`);
    }
    const keyOf = (id) => `s50m:${id}`;
    // the replay's blind files, graders and keys, restricted to s50m's four roster ids, converted to eq's key format
    const replayFiles = [], textVerdict = new Map();
    let dupConflict = 0;
    for (let n = 1; n <= 9; n++) {
        const keys = rj(`blind/key.blind-${n}.json`), pairs = rj(`blind/pairs.blind-${n}.json`).items, v1 = rj(`blind/verdicts.blind-${n}.g1.json`), v2 = rj(`blind/verdicts.blind-${n}.g2.json`);
        const keyMap = {}, g1 = {}, g2 = {};
        for (const [k, m] of Object.entries(keys)) {
            if (m.hour !== 's50m' || !ROSTER.includes(m.id)) continue;
            const text = pairs.find((p) => p.key === k).answer;
            keyMap[k] = { id: m.id, arm: m.arm === 'A' ? 'nob' : 'blk', rep: m.rep, leg: m.leg, sha12: sha12(text) };
            g1[k] = v1[k]; g2[k] = v2[k];
            const prev = textVerdict.get(sha12(text));
            if (prev && JSON.stringify(prev) !== JSON.stringify({ g1: v1[k], g2: v2[k] })) dupConflict++;
            textVerdict.set(sha12(text), { g1: v1[k], g2: v2[k] });
        }
        if (Object.keys(keyMap).length) replayFiles.push({ n, keyMap, g1, g2 });
    }
    ck('replay: 4 roster ids x (10 front + 6 back) = 64 graded answers', replayFiles.reduce((a, f) => a + Object.keys(f.keyMap).length, 0) === 64);
    ck('replay: identical texts never carry conflicting verdicts (oracle is a function)', dupConflict === 0, `conflicts ${dupConflict}`);

    const evalOn = (stores, scores) => M.evaluate({ pairs: M.assemblePairs({ ids: ROSTER, stores, scores, keyOf }), nG: 4, sitting: { gates: true, why: 'cal' } });
    const replayScores = M.collectScores(replayFiles);
    const direct = evalOn(replayStores, replayScores);
    const line = (r, pre) => r.lines.find((l) => l.startsWith(pre)) ?? '';
    ck('replay direct: 3a = +8 (block 10 - no-block 2) on 20 pairs, PASS', /block 10 - no-block 2 = \+8 on 20 pairs/.test(line(direct, '3a ')) && direct.clauses['3a'] === 'PASS', line(direct, '3a ').slice(0, 120));
    ck('replay direct: back leg +7 on 12 pairs (block 9 - no-block 2)', /block 9 - no-block 2 = \+7 on 12 pairs/.test(line(direct, '3a-back')));
    ck('replay direct: 4b holds (0 wrong both legs under eq\'s wrong definition)', direct.clauses['4b'] === 'PASS');
    // per-item rows in the replay's own symbols, against RESULT-front-back.txt
    const result = fs.readFileSync(path.join(R, 'RESULT-front-back.txt'), 'utf8').split('\n');
    const replaySym = (s) => { const v = M.verdictOf; return s.g1.correctness === 0 && s.g2.correctness === 0 ? 'X' : v(s.g1) === 'acceptable' && v(s.g2) === 'acceptable' ? 'Y' : s.g1.on_topic <= 1 && s.g2.on_topic <= 1 ? 'o' : 'w'; };
    const pr = M.assemblePairs({ ids: ROSTER, stores: replayStores, scores: replayScores, keyOf });
    const sec = (title) => { const i = result.findIndex((l) => l.startsWith(title)); const j = result.findIndex((l, k) => k > i && /^(back leg|front leg|DECISION)/.test(l)); return result.slice(i, j < 0 ? undefined : j); };
    let rowsOk = 0;
    for (const [leg, title, set] of [['front', 'front leg, per item', pr.front], ['back', 'back leg, per item', pr.back]]) for (const id of ROSTER) {
        const ps = set.filter((p) => p.id === id).sort((a, b) => a.rep - b.rep);
        const want = sec(title).find((l) => l.trim().startsWith(`s50m:${id} `));
        const got = `A ${ps.map((p) => replaySym(p.nob)).join('')}  B ${ps.map((p) => replaySym(p.blk)).join('')}`;
        if (want && want.includes(got)) rowsOk++;
    }
    ck('replay direct: all 8 per-item rows (4 front + 4 back, replay symbols) equal RESULT-front-back.txt', rowsOk === 8, `${rowsOk}/8`);
    ck('replay direct: eq rows print per item with acceptable counts', direct.lines.some((l) => /^\s+S2Q08F\s+block YYYYY\s+no-block \S+\s+acceptable block 5 no-block 1 of 5/.test(l)));

    // through the blind builder with a text oracle (this exercises build -> keys -> verdicts -> collect -> assemble -> evaluate)
    const oracleRun = (stores) => {
        const b = M.buildBlindFiles({ ids: ROSTER, stores, questionOf: () => 'q', heardOf: () => 'h', keyOf });
        const files = b.files.map((f) => {
            const g1 = {}, g2 = {};
            for (const it of f.pairs.items) { const v = textVerdict.get(sha12(it.answer)); if (!v) throw new Error('oracle: text not in the replay'); g1[it.key] = v.g1; g2[it.key] = v.g2; }
            return { n: f.n, keyMap: f.keyMap, g1, g2 };
        });
        return { b, r: evalOn(stores, M.collectScores(files)) };
    };
    const piped = oracleRun(replayStores);
    ck('pipeline (build blind -> oracle verdicts -> eval): same +8 as the replay', /block 10 - no-block 2 = \+8 on 20 pairs/.test(line(piped.r, '3a ')) && /block 9 - no-block 2 = \+7 on 12 pairs/.test(line(piped.r, '3a-back')));
    ck('pipeline: split 2 + 2 front by whole items, back 1 file of 4 ids', piped.b.files.length === 3 && piped.b.files[0].ids.length === 2 && piped.b.files[1].ids.length === 2 && piped.b.files[2].ids.length === 4 && piped.b.files[0].pairs.items.length === 20 && piped.b.files[2].pairs.items.length === 24);
    // the mutated copy: two block records (S2Q08F r1, r2) carry the no-block text -> the oracle gives them the no-block verdict -> the gain falls by 2
    const mut = JSON.parse(JSON.stringify(replayStores));
    for (const rep of [1, 2]) mut[`front|blk|${rep}`][keyOf('S2Q08F')].spoken = replayStores[`front|nob|${rep}`][keyOf('S2Q08F')].spoken;
    const mutated = oracleRun(mut);
    ck('mutated copy (two block records set to the no-block text): delta falls +8 -> +6', /block 8 - no-block 2 = \+6 on 20 pairs/.test(line(mutated.r, '3a ')), line(mutated.r, '3a ').slice(0, 100));
    // integrity: an answer file changed after the blind build is refused, never graded against another text
    const staleScores = M.collectScores(replayFiles);
    const staleStores = JSON.parse(JSON.stringify(replayStores)); staleStores['front|blk|1'][keyOf('S1Q04F')].spoken += ' x';
    let stale = ''; try { M.assemblePairs({ ids: ROSTER, stores: staleStores, scores: staleScores, keyOf }); } catch (e) { stale = e.message; }
    ck('integrity: a changed answer text is refused (sha12 differs), naming ids only', /not the graded text/.test(stale) && /S1Q04F/.test(stale) && !stale.includes(replayStores['front|blk|1'][keyOf('S1Q04F')].spoken.slice(0, 20)));
    const noKey = JSON.parse(JSON.stringify(replayFiles)); for (const f of noKey) for (const k of Object.keys(f.keyMap)) if (f.keyMap[k].id === 'S1Q04F' && f.keyMap[k].arm === 'blk' && f.keyMap[k].rep === 2) { delete f.keyMap[k]; delete f.g1[k]; delete f.g2[k]; }
    let nk = ''; try { M.assemblePairs({ ids: ROSTER, stores: replayStores, scores: M.collectScores(noKey), keyOf }); } catch (e) { nk = e.message; }
    ck('integrity: an answered record with no graded key is refused', /answered but not graded/.test(nk));
    let un = ''; const half = JSON.parse(JSON.stringify(replayFiles)); delete half[0].g2[Object.keys(half[0].g2)[0]];
    try { M.collectScores(half); } catch (e) { un = e.message; }
    ck('a grader file missing one verdict is refused', /no valid verdict/.test(un));

    // ── B. synthetic branches ──
    const P = (id, rep, b, n, o = {}) => ({ id, rep, blk: { ...SPEC[b], ttft: o.bt ?? 3000, words: o.bw ?? 80, thoughts: o.bth === undefined ? 100 : o.bth }, nob: { ...SPEC[n], ttft: o.nt ?? 3000, words: o.nw ?? 80, thoughts: o.nth === undefined ? 100 : o.nth } });
    const ID4 = ['A', 'B', 'C', 'D'];
    const front = (f) => { const a = []; let i = 0; for (const id of ID4) for (let rep = 1; rep <= 5; rep++, i++) a.push(f(i, id, rep)); return a; };
    const back = (f) => { const a = []; let i = 0; for (const id of ID4) for (let rep = 1; rep <= 3; rep++, i++) a.push(f(i, id, rep)); return a; };
    const baseF = () => front((i, id, rep) => P(id, rep, 'w', 'w')), baseB = () => back((i, id, rep) => P(id, rep, 'w', 'w'));
    const ev = (fr, bk, o = {}) => M.evaluate({ pairs: { front: fr, back: bk ?? baseB(), holes: o.holes ?? [], empties: o.empties ?? [], incompleteByRep: o.inc ?? { front: {}, back: {} } }, nG: o.nG ?? 4, sitting: o.sitting ?? { gates: true, why: 'cal' } });
    const delta = (d, n = 20) => { const f = baseF().slice(0, n); for (let i = 0; i < Math.abs(d); i++) { if (d > 0) f[i].blk = { ...f[i].blk, ...SPEC.Y }; else f[i].nob = { ...f[i].nob, ...SPEC.Y }; } return f; };
    for (const [d, want] of [[4, 'PASS'], [5, 'PASS'], [3, 'INCONCLUSIVE'], [2, 'INCONCLUSIVE'], [1, 'FAIL'], [0, 'FAIL'], [-3, 'FAIL']]) ck(`3a n=20 delta ${d >= 0 ? '+' : ''}${d} -> ${want}`, ev(delta(d)).clauses['3a'] === want);
    ck('3a n=19 delta +1 -> FAIL (A2 m1: FAIL <= max(floor(.95), ceil(19/21)) = 1)', ev(delta(1, 19)).clauses['3a'] === 'FAIL' && /FAIL <= \+max\(floor\(0\.05\*19\), ceil\(19\/21\)\) = \+1/.test(line(ev(delta(1, 19)), '3a ')));
    ck('3a n=19 delta +2 -> INCONCLUSIVE; delta +4 -> PASS (ceil(0.20*19) = 4)', ev(delta(2, 19)).clauses['3a'] === 'INCONCLUSIVE' && ev(delta(4, 19)).clauses['3a'] === 'PASS' && ev(delta(3, 19)).clauses['3a'] === 'INCONCLUSIVE');
    const evN = (n) => M.evaluate({ pairs: { front: Array.from({ length: n }, (_, i) => P('A', i, 'w', 'w')), back: baseB(), holes: [], empties: [], incompleteByRep: { front: {}, back: {} } }, nG: 4, sitting: { gates: true, why: 'c' } });
    ck('3a bars as formulas: n=15 +3 / +1; n=21 +5 / +1; n=40 +8 / +2', [[15, 3, 1], [21, 5, 1], [40, 8, 2]].every(([n, p, f]) => line(evN(n), '3a ').includes(`PASS >= +ceil(0.20*${n}) = +${p}; FAIL <= +max(floor(0.05*${n}), ceil(${n}/21)) = +${f})`)));

    // 4b: per leg
    const withWrong = (setF, setB) => ev(setF ?? baseF(), setB ?? baseB());
    const fw = baseF(); fw[0].blk = { ...fw[0].blk, ...SPEC.X };
    const bw = baseB(); bw[0].blk = { ...bw[0].blk, ...SPEC.X };
    ck('4b: front block wrong 1 > no-block 0 -> FAIL', withWrong(fw).clauses['4b'] === 'FAIL');
    ck('4b: a back-leg wrong ALONE (front clean) -> FAIL', withWrong(null, bw).clauses['4b'] === 'FAIL' && /back 1 <= 0: FAIL/.test(line(withWrong(null, bw), '4b')) && /front 0 <= 0: holds/.test(line(withWrong(null, bw), '4b')));
    const fw2 = baseF(); fw2[0].nob = { ...fw2[0].nob, ...SPEC.X };
    ck('4b: wrong only on the no-block side -> PASS', withWrong(fw2).clauses['4b'] === 'PASS');
    const fw3 = baseF(); fw3[0].blk = { ...fw3[0].blk, ...SPEC.X }; fw3[1].nob = { ...fw3[1].nob, ...SPEC.Z };
    ck('4b: block wrong 1 <= no-block wrong 1 (a Z = on_topic 0 counts wrong) -> PASS', withWrong(fw3).clauses['4b'] === 'PASS' && /front 1 <= 1/.test(line(withWrong(fw3), '4b')));
    // 4c: the user's +1 margin
    const offs = (k, j = 0) => { const f = baseF(); for (let i = 0; i < k; i++) f[i].blk = { ...f[i].blk, ...SPEC.o }; for (let i = 0; i < j; i++) f[i + 10].nob = { ...f[i + 10].nob, ...SPEC.o }; return f; };
    ck('4c: off-topic block - no-block = +2 -> FAIL', ev(offs(2)).clauses['4c'] === 'FAIL');
    ck('4c: = +1 -> PASS, reported with its rows (U1)', ev(offs(1)).clauses['4c'] === 'PASS' && /a \+1 is reported with its rows/.test(line(ev(offs(1)), '4c')));
    ck('4c: = 0 and = -2 -> PASS; +3 vs 1 (= +2 net) -> FAIL', ev(offs(0)).clauses['4c'] === 'PASS' && ev(offs(0, 2)).clauses['4c'] === 'PASS' && ev(offs(3, 1)).clauses['4c'] === 'FAIL');
    const zf = baseF(); zf[0].blk = { ...zf[0].blk, ...SPEC.Z }; zf[1].blk = { ...zf[1].blk, ...SPEC.Z };
    ck('4c: two on_topic-0 answers on the block side count off-topic (+2 -> FAIL) and wrong (4b FAIL)', ev(zf).clauses['4c'] === 'FAIL' && ev(zf).clauses['4b'] === 'FAIL');
    // 2d
    const wd = (d) => front((i, id, rep) => P(id, rep, 'w', 'w', { bw: 80 + d }));
    for (const [d, want] of [[5, 'PASS'], [6, 'INCONCLUSIVE'], [10, 'INCONCLUSIVE'], [11, 'FAIL'], [-20, 'PASS']]) ck(`2d median words ${d >= 0 ? '+' : ''}${d} -> ${want}`, ev(wd(d)).clauses['2d'] === want);
    // 2b: thinking
    const td = (d) => front((i, id, rep) => P(id, rep, 'w', 'w', { bth: 100 + d }));
    ck('2b median thoughts +150 -> PASS; +151 -> FAIL', ev(td(150)).clauses['2b'] === 'PASS' && ev(td(151)).clauses['2b'] === 'FAIL');
    const nulls = (k, side = 'blk', extra = {}) => front((i, id, rep) => P(id, rep, 'w', 'w', { ...extra, ...(i < k ? { [side === 'blk' ? 'bth' : 'nth']: null } : {}) }));
    ck('2b: 2 nulls of 20 -> excluded, coverage 18/20 (90 %) printed, decided on thoughts', /coverage 18\/20 pairs with a finite thoughts on both sides \(90 %\)/.test(line(ev(nulls(2)), '2b')) && ev(nulls(2)).clauses['2b'] === 'PASS' && !/FALLBACK/.test(line(ev(nulls(2)), '2b')));
    ck('2b: 3 nulls of 20 -> 85 % < 90 %: TTFT fallback (the RULE wins over the registration cal sentence)', /17\/20.*\(85 %\).*TTFT FALLBACK/.test(line(ev(nulls(3)), '2b')));
    ck('2b: 4 nulls on one side -> TTFT fallback; median TTFT +1100 -> FAIL via the fallback', ev(nulls(4, 'nob', { bt: 4100 })).clauses['2b'] === 'FAIL' && /FALLBACK/.test(line(ev(nulls(4, 'nob', { bt: 4100 })), '2b')));
    ck('2b: fallback with median TTFT +1000 -> PASS (FAIL only > +1000)', ev(nulls(4, 'nob', { bt: 4000 })).clauses['2b'] === 'PASS');
    const i2 = ev(nulls(4, 'nob', { bt: 4100 }), null, { sitting: { gates: false, why: 'x' } });
    ck('I2: coverage under 90 % and 2c ungated -> 2b INCOMPLETE (undecided, section 5 item 3), the ungated TTFT median printed', i2.clauses['2b'] === 'INCOMPLETE' && /\+1100 ms/.test(line(i2, '2b')) && ev(nulls(4, 'nob', { bt: 4100 })).clauses['2b'] === 'FAIL');
    ck('I2: coverage >= 90 % and 2c ungated -> 2b still decided on thoughts', ev(nulls(2), null, { sitting: { gates: false, why: 'x' } }).clauses['2b'] === 'PASS');
    // 2c
    const tt = (d) => front((i, id, rep) => P(id, rep, 'w', 'w', { bt: 3000 + d }));
    for (const [d, want] of [[500, 'PASS'], [501, 'INCONCLUSIVE'], [700, 'INCONCLUSIVE'], [1000, 'INCONCLUSIVE'], [1001, 'FAIL']]) ck(`2c median TTFT ${sgnS(d)} -> ${want}`, ev(tt(d)).clauses['2c'] === want);
    const stalls = (k) => front((i, id, rep) => P(id, rep, 'w', 'w', { bt: i < k ? 12000 : 3000 }));
    ck('2c stalls: block 3 > no-block 0 + ceil(2*20/39) = 2 -> FAIL', ev(stalls(3)).clauses['2c'] === 'FAIL' && /block 3 <= no-block 0 \+ 2: FAIL/.test(line(ev(stalls(3)), '2c')));
    ck('2c stalls: block 2 <= 0 + 2 -> the stall bar holds', /block 2 <= no-block 0 \+ 2: PASS/.test(line(ev(stalls(2)), '2c')));
    const p90 = front((i, id, rep) => P(id, rep, 'w', 'w', { bt: i >= 18 ? 9000 : 3000 }));
    ck('2c p90 block 9000 > no-block 3000 + 2000 (median fine) -> INCONCLUSIVE', ev(p90).clauses['2c'] === 'INCONCLUSIVE' && /p90 block 9000 <= no-block 3000 \+ 2000: INCONCLUSIVE/.test(line(ev(p90), '2c')));
    // the sitting log: eq-gsitting.ps1's format (STEP <n> <tag> start|end <iso>, exit=<code> on end lines); problems REFUSE, only a broken 15-min rep ungates (I3, M4)
    const base16 = new Set(); for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) base16.add(`/x/${leg}/${M.tagOf(leg, arm, r)}`);
    const steps = M.resolveSteps((leg, tag) => `/x/${leg}/${tag}`, (fl) => base16.has(fl)).steps;
    const fullLog = ({ gaps = [], skip = null, dup = false, exitOf = {}, noExit = null, swapRep = null, renumber = false } = {}) => {
        let t = Date.parse('2026-10-06T04:20:00.000Z'), n = 0; const out = [];
        for (const [leg, reps] of [['front', 5], ['back', 3]]) for (let rep = 1; rep <= reps; rep++) {
            let first = rep % 2 === 1 ? 'blk' : 'nob'; if (swapRep === `${leg}${rep}`) first = first === 'blk' ? 'nob' : 'blk';
            const second = first === 'blk' ? 'nob' : 'blk';
            const g = (leg === 'front' ? gaps[rep - 1] : null) ?? 5;
            for (const [arm, off] of [[first, 0], [second, g * 60000]]) {
                n++; const tag = M.tagOf(leg, arm, rep), st = t + off, num = renumber && n === 3 ? 1 : n;
                if (tag === skip) continue;
                out.push(`STEP ${num} ${tag} start ${new Date(st).toISOString()}`);
                if (dup && tag === M.tagOf('front', 'blk', 1)) out.push(`STEP ${num} ${tag} start ${new Date(st).toISOString()}`);
                out.push(`STEP ${num} ${tag} end ${new Date(st + 60000).toISOString()}${noExit === tag ? '' : ` exit=${exitOf[tag] ?? 0}`}`);
            }
            t += (g + 20) * 60000;
        }
        return out.join('\n');
    };
    const chk = (o) => M.sittingCheck(M.parseSitting(fullLog(o)), steps);
    const sc1 = chk({});
    ck('sitting: a clean 16-step log (reps 20+ min apart in a long sitting) -> no problem, 2c gates', sc1.problems.length === 0 && sc1.gates === true, sc1.problems.join('; '));
    const sc2 = chk({ gaps: [5, 16, 5, 5, 5] });
    ck('sitting: rep 2 starts 16 min apart -> no problem, ONLY that rep ungates 2c, naming r2', sc2.problems.length === 0 && sc2.gates === false && /r2 \(16\.0 min\)/.test(sc2.why) && !/r1|r3/.test(sc2.why));
    ck('sitting: exactly 15.0 min gates; 15.1 min does not', chk({ gaps: [15, 5, 5, 5, 5] }).gates === true && chk({ gaps: [15.1, 5, 5, 5, 5] }).gates === false);
    const sc3 = chk({ skip: M.tagOf('front', 'nob', 3) });
    ck('I3: a step with no log line is a PROBLEM (refuses), never an ungated rep', sc3.problems.length > 0 && /no start line for captured-no-block-high-r3/.test(sc3.problems.join()) && sc3.gates === false);
    ck('I3: an empty log, a log with no STEP line and an unparsable STEP line are problems', M.sittingCheck(M.parseSitting(''), steps).problems.some((p) => /no STEP line/.test(p)) && M.parseSitting('STEP x y').problems.length === 1 && M.parseSitting('hello\nworld').problems.length === 1);
    ck('M4: a non-zero exit code on a step is a problem', chk({ exitOf: { [M.tagOf('front', 'blk', 2)]: 1 } }).problems.some((p) => /exit=1/.test(p)));
    ck('M4: an end line without exit=<code> is a problem', chk({ noExit: M.tagOf('back', 'nob', 2) }).problems.some((p) => /no exit=/.test(p)));
    ck('M4: a duplicate start line is a problem (a later line must not overwrite)', chk({ dup: true }).problems.some((p) => /duplicate start/.test(p)));
    ck('M4: a rep in the wrong counterbalanced order (A3.4) is a problem; a -b re-run is not order-checked', chk({ swapRep: 'front2' }).problems.some((p) => /front r2: not in the counterbalanced order/.test(p)) && chk({ swapRep: 'back2' }).problems.some((p) => /back r2/.test(p)));
    ck('M4: step numbers that do not increase are a problem', chk({ renumber: true }).problems.some((p) => /do not increase/.test(p)));
    const ung = ev(tt(1100), null, { sitting: sc2 });
    ck('2c with a broken sitting: median +1100 is REPORTED (would read FAIL), not a gate', ung.clauses['2c'] === 'REPORTED(FAIL)' && /=>  REPORTED \(not gated/.test(line(ung, '2c')));
    ck('the tag of a step: rep 1 no suffix, rep k -rk, -b re-runs -rk-b', M.tagOf('front', 'blk', 1) === 'captured-g-high' && M.tagOf('front', 'nob', 4) === 'captured-no-block-high-r4' && M.tagOf('back', 'blk', 3, true) === 'captured-g-low-r3-b' && M.tagOf('back', 'nob', 1, true) === 'captured-no-block-low-r1-b');
    // holes and empties (B1: holes gate ONLY 3a; I1: incomplete PAIRS per rep)
    const hole = ev(baseF().slice(1), null, { holes: ['front:blkr1:A'], inc: { front: { 1: 1 }, back: {} } });
    ck('one hole (transientError): its pair is out (19 pairs), named; 3a still computed (1 incomplete pair of a rep is allowed)', /front complete pairs 19 of 20; .*holes front:blkr1:A/.test(hole.lines[0]) && hole.clauses['3a'] === 'FAIL');
    const wrongRest = (n0) => { const f = baseF().slice(n0); f[5].blk = { ...f[5].blk, ...SPEC.X }; return f; };
    const hole2 = ev(wrongRest(2), null, { holes: ['front:blkr1:A', 'front:nobr1:B'], inc: { front: { 1: 2 }, back: {} } });
    ck('I1: a rep missing 2 of 4 pairs -> 3a INCOMPLETE', hole2.clauses['3a'] === 'INCOMPLETE' && /front rep\(s\) with >= 2 incomplete pairs of 4: r1 \(2\)/.test(hole2.lines.join('\n')));
    ck('B1: ... and 4b FAIL (a block wrong in the remaining pairs) survives those front holes; 4c, 2b, 2c, 2d are still computed (not INCOMPLETE)', hole2.clauses['4b'] === 'FAIL' && ['4c', '2b', '2c', '2d'].every((c) => !/INCOMPLETE/.test(hole2.clauses[c])), JSON.stringify(hole2.clauses));
    const hole3 = ev(baseF().slice(2), null, { holes: ['front:blkr1:A', 'front:nobr2:B'], inc: { front: { 1: 1, 2: 1 }, back: {} } });
    ck('I1: one incomplete pair in each of two reps (not 2 in one rep) -> 3a not INCOMPLETE', hole3.clauses['3a'] !== 'INCOMPLETE');
    const bwrong = baseF(); bwrong[0].blk = { ...bwrong[0].blk, ...SPEC.X };
    const hb0 = ev(bwrong, [], { holes: Array.from({ length: 12 }, (_, i) => `back:blkr1:${i}`) });
    ck('B1: ZERO back pairs and a front block wrong -> 4b FAIL (a back-leg hole never hides a front FAIL)', hb0.clauses['4b'] === 'FAIL' && /no complete back pair/.test(line(hb0, '4b')));
    ck('B1: zero back pairs with a clean front -> 4b INCOMPLETE (nothing to compare), 3a unaffected', ev(baseF(), []).clauses['4b'] === 'INCOMPLETE' && ev(baseF(), []).clauses['3a'] === 'FAIL');
    const hbF = ev(bwrong, baseB().slice(2), { holes: ['back:blkr1:A', 'back:blkr1:B'] });
    ck('B1: back-leg holes (10 of 12 pairs left) + a front block wrong -> 4b FAIL; back holes alone (clean) -> 4b PASS, not INCOMPLETE', hbF.clauses['4b'] === 'FAIL' && ev(baseF(), baseB().slice(2), { holes: ['back:blkr1:A', 'back:blkr1:B'] }).clauses['4b'] === 'PASS');
    const bkw = baseB().slice(2); bkw[0].blk = { ...bkw[0].blk, ...SPEC.X };
    ck('B1: a back wrong in the remaining back pairs, with back holes -> 4b FAIL', ev(baseF(), bkw, { holes: ['back:blkr1:A'] }).clauses['4b'] === 'FAIL');
    const emptyBlk = baseF(); emptyBlk[0].blk = { g1: M.EMPTY, g2: M.EMPTY, ttft: 2000, words: 0, thoughts: 90 };
    ck('M2: an empty answer is consensus wrong (4b FAIL) but NOT off-topic (4c unchanged, +0)', ev(emptyBlk).clauses['4b'] === 'FAIL' && /block 0 - no-block 0 = \+0/.test(line(ev(emptyBlk), '4c')) && M.EMPTY.on_topic === 2 && M.EMPTY.correctness === 0);
    ck('|G_twin| 2 -> INCOMPLETE everywhere (A2.4)', ['3a', '4b', '4c', '2b', '2c', '2d'].every((c) => ev(baseF(), baseB(), { nG: 2 }).clauses[c] === 'INCOMPLETE'));
    // empty prose, through assemblePairs
    const rec = (text, o = {}) => ({ spoken: text, words: 60, ttft: 2000, total: 4000, thoughts: 90, ...o });
    const mkStores = (over = {}) => { const s = {}; for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) s[`${leg}|${arm}|${r}`] = Object.fromEntries(['A', 'B', 'C'].map((id) => [id, rec(`TXT ${leg} ${arm} ${r} ${id}`)])); for (const [k, v] of Object.entries(over)) { const [leg, arm, r, id] = k.split('|'); s[`${leg}|${arm}|${r}`][id] = v; } return s; };
    const scoresFor = (stores, f = () => SPEC.Y) => { const files = []; const b = M.buildBlindFiles({ ids: ['A', 'B', 'C'], stores, questionOf: () => 'q', heardOf: () => 'h' }); for (const x of b.files) { const g1 = {}, g2 = {}; for (const it of x.pairs.items) { const m = x.keyMap[it.key]; const v = f(m); g1[it.key] = v.g1; g2[it.key] = v.g2; } files.push({ n: x.n, keyMap: x.keyMap, g1, g2 }); } return M.collectScores(files); };
    const holeStores = mkStores({ 'front|blk|2|B': { transientError: '429' }, 'front|nob|3|A': { ...rec(''), spoken: '' } });
    const hp = M.assemblePairs({ ids: ['A', 'B', 'C'], stores: holeStores, scores: scoresFor(holeStores) });
    ck('assemble: a transientError record = a hole (pair out, named); empty prose without it = scored wrong on its side', hp.holes.join() === 'front:blkr2:B' && hp.empties.join() === 'front:nobr3:A' && hp.front.length === 14 && isWrongPair(hp.front.find((p) => p.id === 'A' && p.rep === 3).nob));
    function isWrongPair(s) { return s.g1.correctness === 0 && s.g2.correctness === 0 && s.g1.on_topic === 2 && s.ttft === 2000 && s.words === 0; }
    const bb = M.buildBlindFiles({ ids: ['A', 'B', 'C'], stores: holeStores, questionOf: () => 'q', heardOf: () => 'h' });
    ck('build: the hole pair AND its graded partner are left out; the empty answer is not sent', bb.excluded.join() === 'front:nobr2:B' && bb.holes.join() === 'front:blkr2:B' && bb.files[0].pairs.items.length + bb.files[1].pairs.items.length === 30 - 2 - 1 && bb.empties.join() === 'front:nobr3:A');
    const missingRec = mkStores(); delete missingRec['back|blk|1'].C;
    ck('a missing record in an existing file is a hole', M.assemblePairs({ ids: ['A', 'B', 'C'], stores: missingRec, scores: scoresFor(missingRec) }).holes.join() === 'back:blkr1:C');
    const nullTh = mkStores({ 'front|blk|1|A': rec('TXT front blk 1 A', { thoughts: null }) });
    ck('thoughts null -> null in the pair (excluded from 2b only)', M.assemblePairs({ ids: ['A', 'B', 'C'], stores: nullTh, scores: scoresFor(nullTh) }).front.find((p) => p.id === 'A' && p.rep === 1).blk.thoughts === null);
    // -b substitution (A4.4)
    const present = new Set();
    const fo = (leg, tag) => `/x/${leg}/${tag}`; const ex = (f) => present.has(f);
    const allFiles = () => { present.clear(); for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) present.add(fo(leg, M.tagOf(leg, arm, r))); };
    allFiles();
    ck('resolveSteps: all 16 files present, no -b -> 16 steps, nothing substituted', Object.keys(M.resolveSteps(fo, ex).steps).length === 16 && M.resolveSteps(fo, ex).substituted.length === 0);
    present.add(fo('front', 'captured-g-high-r3-b')); present.add(fo('front', 'captured-no-block-high-r3-b'));
    const rs = M.resolveSteps(fo, ex);
    ck('resolveSteps: both -b files of rep 3 replace that rep on BOTH sides and are printed', rs.substituted.join() === 'front r3' && rs.steps['front|blk|3'].tag === 'captured-g-high-r3-b' && rs.steps['front|nob|3'].tag === 'captured-no-block-high-r3-b' && rs.steps['front|blk|2'].tag === 'captured-g-high-r2');
    present.delete(fo('front', 'captured-no-block-high-r3-b'));
    let one = ''; try { M.resolveSteps(fo, ex); } catch (e) { one = e.message; }
    ck('resolveSteps: only one side\'s -b file -> refused (never mixed)', /only the blk side has a -b file/.test(one));
    allFiles(); present.add(fo('front', 'captured-g-high-r1-b')); present.add(fo('front', 'captured-no-block-high-b'));
    ck('resolveSteps: rep 1 accepts -r1-b or -b on either side', M.resolveSteps(fo, ex).substituted.join() === 'front r1');
    allFiles(); present.delete(fo('back', 'captured-g-low-r2'));
    let mf = ''; try { M.resolveSteps(fo, ex); } catch (e) { mf = e.message; }
    ck('resolveSteps: a missing answer file is an instrument failure, not a hole', /does not exist/.test(mf) && /not a hole/.test(mf));
    // -b may only FILL holes (controller ruling B1)
    const rd = (o) => () => o;
    const mkS = (txt, over = {}) => Object.fromEntries(['A', 'B', 'C'].map((id) => [id, over[id] ?? rec(`${txt} ${id}`)]));
    const stepsB = (b) => { const st = {}; for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) { const useB = b && leg === 'front' && r === 2; st[`${leg}|${arm}|${r}`] = { tag: 't', file: `F:${leg}|${arm}|${r}|b`, b: useB, origFile: `F:${leg}|${arm}|${r}` }; } return st; };
    const files = {}; for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) { files[`F:${leg}|${arm}|${r}`] = mkS(`orig ${leg} ${arm} ${r}`); files[`F:${leg}|${arm}|${r}|b`] = mkS(`REDRAW ${leg} ${arm} ${r}`); }
    const lsOk = M.loadStores(stepsB(false), (fl) => files[fl], ['A', 'B', 'C']);
    ck('loadStores: no -b -> the 16 original stores, no notes', Object.keys(lsOk.stores).length === 16 && lsOk.notes.length === 0);
    let nohole = ''; try { M.loadStores(stepsB(true), (fl) => files[fl], ['A', 'B', 'C']); } catch (e) { nohole = e.message; }
    ck('B1: a -b re-run of a rep with NO hole is refused, naming why (it would resample a wrong answer away)', /may only FILL holes/.test(nohole) && /front rep 2/.test(nohole));
    files['F:front|blk|2'].B = { transientError: '429' };
    const lsFill = M.loadStores(stepsB(true), (fl) => files[fl], ['A', 'B', 'C']);
    ck('B1: with one hole, only the hole\'s PAIR (both sides) comes from -b; complete original pairs A and C are kept', lsFill.stores['front|blk|2'].B.spoken === 'REDRAW front blk 2 B' && lsFill.stores['front|nob|2'].B.spoken === 'REDRAW front nob 2 B' && lsFill.stores['front|blk|2'].A.spoken === 'orig front blk 2 A' && lsFill.stores['front|nob|2'].C.spoken === 'orig front nob 2 C' && /fills B; 2 complete/.test(lsFill.notes.join()));
    // blind split and determinism
    const splitOf = (n, legStores = mkStores()) => { const ids = Array.from({ length: n }, (_, i) => `I${i + 1}`); const s = {}; for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) s[`${leg}|${arm}|${r}`] = Object.fromEntries(ids.map((id) => [id, rec(`TXT ${leg} ${arm} ${r} ${id}`)])); return M.buildBlindFiles({ ids, stores: s, questionOf: () => 'q', heardOf: () => 'h' }); };
    const sizes = (n) => splitOf(n).files.map((f) => f.ids.length).join('+');
    ck('blind split by whole items: 3 -> 2+1+3, 4 -> 2+2+4, 5 -> 3+2+5, 7 -> 4+3+7, 8 -> 4+4 (back refused)', sizes(3) === '2+1+3' && sizes(4) === '2+2+4' && sizes(5) === '3+2+5' && sizes(7) === '4+3+7');
    let r8 = ''; try { splitOf(8); } catch (e) { r8 = e.message; } let r2 = ''; try { splitOf(2); } catch (e) { r2 = e.message; } let r9 = ''; try { splitOf(9); } catch (e) { r9 = e.message; }
    ck('blind: 2 ids refused (< 3), 8 ids refused (back > 7), 9 refused (front > 4 a file)', /< 3/.test(r2) && /back file would hold more than 7/.test(r8) && /more than 4 ids/.test(r9));
    const a1 = JSON.stringify(splitOf(4).files.map((f) => f.pairs.items.map((i) => i.key + i.answer))), a2 = JSON.stringify(splitOf(4).files.map((f) => f.pairs.items.map((i) => i.key + i.answer)));
    ck('blind: seeded and deterministic (same input twice = identical files)', a1 === a2);
    const f4 = splitOf(4).files[0];
    const order = f4.pairs.items.map((i) => f4.keyMap[i.key].arm).join('');
    ck('blind: arms are shuffled within an item (not blk-first for every item), keys carry no arm', f4.pairs.items.every((i) => /^[A-Za-z0-9]+#\d+$/.test(i.key)) && new Set(f4.ids.map((id) => f4.pairs.items.filter((i) => i.id === id).map((i) => f4.keyMap[i.key].arm).join(''))).size >= 1 && /blk/.test(order) && /nob/.test(order) && f4.pairs.items.filter((i) => i.id === f4.ids[0]).map((i) => f4.keyMap[i.key].arm).join('') !== 'blknob'.repeat(5));
    ck('blind: every item carries 10 front answers (5 reps x 2 arms), the back file 6 per item', f4.pairs.items.length === 20 && splitOf(4).files[2].pairs.items.length === 24);
    ck('blind: a pairs file never carries an arm label or a tag word', !/"(blk|nob)"|captured-g|no-block/.test(JSON.stringify(f4.pairs)));

    // ── C. the CLI on a synthetic run (exit codes; nothing leaks) ──
    fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
    const cli = (args, env = {}) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
    const run = path.join(TMP, 'run'); fs.mkdirSync(run, { recursive: true });
    fs.writeFileSync(path.join(run, 'interview60.timeline.json'), JSON.stringify({ items: [
        { id: 'X1', q: 'SENTINEL_Q_PARENT_1 what is a pod', level: 'main' }, { id: 'X1F', q: 'SENTINEL_Q_FU_1 why that one', chain: 'X1' },
        { id: 'X2', q: 'SENTINEL_Q_PARENT_2 explain a deployment', level: 'main' }, { id: 'X2F', q: 'SENTINEL_Q_FU_2 and rollbacks', chain: 'X2' },
        { id: 'X3', q: 'SENTINEL_Q_PARENT_3 what is an ingress', level: 'main' }, { id: 'X3F', q: 'SENTINEL_Q_FU_3 how about tls', chain: 'X3' }] }));
    const GIDS = 'X1F,X2F,X3F';
    const writeAnswers = (dir, tweak = () => {}) => { fs.mkdirSync(dir, { recursive: true }); for (const leg of ['front', 'back']) for (const arm of ['blk', 'nob']) for (let r = 1; r <= (leg === 'front' ? 5 : 3); r++) { const tag = M.tagOf(leg, arm, r); const o = Object.fromEntries(GIDS.split(',').map((id) => [id, { id, spoken: `SENTINEL_ANSWER ${tag} ${id}`, words: 50, ttft: 2000, total: 3000, thoughts: 80 }])); tweak(tag, o); fs.writeFileSync(M.answerFile(dir, leg, tag), JSON.stringify(o)); } };
    writeAnswers(run);
    const leak = (r) => /SENTINEL/.test(r.stdout + r.stderr);
    const bl = path.join(TMP, 'blind'), kd = path.join(TMP, 'keys');
    const b1 = cli(['--build-blind', '--run', run, '--g', GIDS, '--out', bl, '--keys', kd]);
    ck('CLI build-blind: exit 0, writes 3 pairs + 3 key files, prints no question/answer text', b1.status === 0 && fs.readdirSync(bl).filter((f) => /^pairs\.blind-\d\.json$/.test(f)).length === 3 && fs.readdirSync(kd).length === 3 && !leak(b1), `exit ${b1.status} ${b1.stdout.split('\n').slice(-2, -1)[0]?.slice(0, 80)}`);
    const p1 = JSON.parse(fs.readFileSync(path.join(bl, 'pairs.blind-1.json'), 'utf8'));
    ck('CLI: the grader sees the follow-up WITH its parent', p1.items.every((i) => i.question.includes(' [Follow-up to: SENTINEL_Q_PARENT_')));
    const w = (n, g, f) => { const k = JSON.parse(fs.readFileSync(path.join(kd, `key.blind-${n}.json`), 'utf8')); fs.writeFileSync(path.join(bl, `verdicts.blind-${n}.${g}.json`), JSON.stringify(Object.fromEntries(Object.keys(k).map((key) => [key, f(k[key])])))); };
    const Yv = { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' }, Wv = { correctness: 1, on_topic: 2, delivery: 2, reason: 'ok' };
    for (let n = 1; n <= 3; n++) for (const g of ['g1', 'g2']) w(n, g, (m) => (m.arm === 'blk' ? Yv : Wv));
    const sit = path.join(TMP, 'gsitting.log');
    const cliSteps = M.resolveSteps((leg, tag) => M.answerFile(run, leg, tag)).steps;
    const writeSit = (o) => { let t = Date.parse('2026-10-06T04:20:00.000Z'), n = 0; const out = []; for (const [leg, reps] of [['front', 5], ['back', 3]]) for (let rep = 1; rep <= reps; rep++) { const first = rep % 2 === 1 ? 'blk' : 'nob', second = first === 'blk' ? 'nob' : 'blk'; const g = (leg === 'front' ? (o?.gaps ?? [])[rep - 1] : null) ?? 5; for (const [arm, off] of [[first, 0], [second, g * 60000]]) { n++; const tag = M.tagOf(leg, arm, rep); out.push(`STEP ${n} ${tag} start ${new Date(t + off).toISOString()}`, `STEP ${n} ${tag} end ${new Date(t + off + 60000).toISOString()} exit=0`); } t += (g + 20) * 60000; } fs.writeFileSync(sit, out.join('\n')); };
    writeSit();
    const e1 = cli(['--eval', '--g', GIDS, '--answers', run, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('CLI eval: exit 0; 3a = +15 on 15 pairs PASS; no leak', e1.status === 0 && /3a .*= \+15 on 15 pairs.*=>  PASS/.test(e1.stdout) && !leak(e1), e1.stdout.split('\n').find((l) => l.startsWith('3a '))?.slice(0, 100));
    ck('CLI eval: a clean sitting log -> 2c gated (sitting condition holds)', /2c .*sitting condition holds/.test(e1.stdout));
    fs.writeFileSync(sit, '');
    const e1b = cli(['--eval', '--g', GIDS, '--answers', run, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('I3: an EMPTY gsitting.log REFUSES (exit 2) naming the file; it never ungates 2c', e1b.status === 2 && /REFUSED: the sitting log .*gsitting\.log does not match/.test(e1b.stdout) && !/^2c/m.test(e1b.stdout));
    const e1c = cli(['--eval', '--g', GIDS, '--answers', run, '--blind', bl, '--keys', kd, '--sitting', path.join(TMP, 'nope.log')]);
    ck('I3: a MISSING gsitting.log REFUSES (exit 2) naming the file', e1c.status === 2 && /nope\.log does not exist/.test(e1c.stdout));
    writeSit({ gaps: [5, 16, 5, 5, 5] });
    const e1d = cli(['--eval', '--g', GIDS, '--answers', run, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('A3.4: one rep 16 min apart -> exit 0 and 2c REPORTED naming r2 (only the broken rep ungates)', e1d.status === 0 && /2c .*REPORTED \(not gated: rep\(s\) broke the 15-min condition: r2 \(16\.0 min\)/.test(e1d.stdout));
    writeSit();
    const e1e = [cli(['--eval', '--g', 'X1F,X2F', '--answers', run, '--blind', bl, '--keys', kd, '--sitting', sit]), cli(['--eval', '--g', 'X1F,X2F,X3F,X3', '--answers', run, '--blind', bl, '--keys', kd, '--sitting', sit])];
    ck('I4: --g must equal the ids in the key files: a subset and a superset both REFUSE (exit 2) naming the difference', e1e.every((r) => r.status === 2 && /is not the set of ids in the key files/.test(r.stdout)) && /only in the keys: X3F/.test(e1e[0].stdout) && /only in --g: X3/.test(e1e[1].stdout));
    const runB = path.join(TMP, 'run-b'); writeAnswers(runB); for (const tag of ['captured-g-high-r2-b', 'captured-no-block-high-r2-b']) fs.writeFileSync(M.answerFile(runB, 'front', tag), fs.readFileSync(M.answerFile(runB, 'front', tag.replace(/-b$/, '')), 'utf8'));
    const e1f = cli(['--eval', '--g', GIDS, '--answers', runB, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('B1 CLI: a -b re-run of a hole-free rep REFUSES (exit 2), "may only FILL holes"', e1f.status === 2 && /may only FILL holes/.test(e1f.stdout));
    fs.rmSync(path.join(bl, 'verdicts.blind-2.g2.json'));
    const e2 = cli(['--eval', '--g', GIDS, '--answers', run, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('CLI eval: a verdicts file missing -> exit 3 INCOMPLETE naming the file', e2.status === 3 && /INCOMPLETE: verdicts\.blind-2\.g2\.json/.test(e2.stdout));
    w(2, 'g2', (m) => (m.arm === 'blk' ? Yv : Wv));
    const run2 = path.join(TMP, 'run-changed'); writeAnswers(run2, (tag, o) => { if (tag === 'captured-g-high-r2') o.X2F.spoken += ' changed'; });
    const e3 = cli(['--eval', '--g', GIDS, '--answers', run2, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('CLI eval: an answer file changed after the blind build -> exit 2 REFUSED, ids only', e3.status === 2 && /not the graded text/.test(e3.stdout) && !leak(e3));
    const run3 = path.join(TMP, 'run-missing'); writeAnswers(run3); fs.rmSync(M.answerFile(run3, 'back', 'captured-no-block-low-r2'));
    const e4 = cli(['--eval', '--g', GIDS, '--answers', run3, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('CLI eval: a missing answer file -> exit 2 REFUSED', e4.status === 2 && /does not exist/.test(e4.stdout));
    const run4 = path.join(TMP, 'run-bad'); writeAnswers(run4); fs.writeFileSync(M.answerFile(run4, 'front', 'captured-g-high'), '{not json');
    const e5 = cli(['--eval', '--g', GIDS, '--answers', run4, '--blind', bl, '--keys', kd, '--sitting', sit]);
    ck('CLI eval: a corrupt answer file -> exit 4 CRASH (never read as a result)', e5.status === 4 && /^CRASH/.test(e5.stdout) && !/not json/.test(e5.stdout));
    const u1 = cli(['--eval']), u2 = cli(['--build-blind', '--eval', '--g', 'A,B,C', '--answers', run]), u3 = cli(['--eval', '--g', GIDS, '--answers', run, '--bogus']);
    ck('CLI usage errors -> exit 2 (no --g; both modes; unknown option)', u1.status === 2 && u2.status === 2 && u3.status === 2);
    const b2 = cli(['--build-blind', '--run', run, '--g', GIDS, '--out', bl, '--keys', kd]);
    ck('CLI build-blind refuses to rebuild keys under existing verdicts', b2.status === 2 && /already holds verdicts/.test(b2.stdout));
    const b3 = cli(['--build-blind', '--run', run, '--g', 'X1F,X2F', '--out', path.join(TMP, 'b3'), '--keys', path.join(TMP, 'k3')]);
    ck('CLI build-blind with |G_twin| 2 -> exit 2 INCOMPLETE reason', b3.status === 2 && /< 3/.test(b3.stdout));
    return results;
}
const sgnS = (n) => (n >= 0 ? '+' : '') + n;

// ── D. mutants ──
const MUTANTS = [
    ['4c margin removed (FAIL at +1)', "d >= 2 ? 'FAIL' : 'PASS'", "d >= 1 ? 'FAIL' : 'PASS'"],
    ['3a PASS bar ceil(n/5) -> ceil(n/6)', 'const pass = Math.ceil(n / 5)', 'const pass = Math.ceil(n / 6)'],
    ['3a FAIL bar loses the ceil(n/21) arm (the m1 formula undone)', 'Math.max(Math.floor(n / 20), Math.ceil(n / 21))', 'Math.floor(n / 20)'],
    ['3a arms swapped', 'd = accB - accN;', 'd = accN - accB;'],
    ['2c stall allowance +5', 'slowB <= slowN + allow ?', 'slowB <= slowN + allow + 5 ?'],
    ['2b bar +150 -> +151', 'med <= 150 ?', 'med <= 151 ?'],
    ['2b coverage 90 % -> 80 %', 'have.length * 10 >= 9 * n', 'have.length * 10 >= 8 * n'],
    ['sitting gap 15 -> 16 min', 'const SITTING_GAP_MS = 15 * 60 * 1000', 'const SITTING_GAP_MS = 16 * 60 * 1000'],
    ['empty prose treated as ok', "!rec.spoken ? 'empty'", "!rec.spoken ? 'ok'"],
    ['wrong = correctness 0 only (the replay\'s older definition)', "const isWrong = (s) => verdictOf(s.g1) === 'wrong' && verdictOf(s.g2) === 'wrong';", 'const isWrong = (s) => s.g1.correctness === 0 && s.g2.correctness === 0;'],
    ['stale-text integrity check removed', 'if (s.sha12 !== sha12(side[arm].rec.spoken))', 'if (false)'],
    ['hole partner left in the blind files (R7 undone)', "if (ARMS.some((a) => cls[a] === 'hole')) { for (const arm of ARMS) if (cls[arm] === 'ok') excluded.push(`${leg}:${arm}r${rep}:${id}`); continue; }", "if (ARMS.some((a) => cls[a] === 'hole')) { continue; }"],
    ['4b checks the front leg only', "const st = !okF || okB === false ? 'FAIL' : okB === null ? 'INCOMPLETE' : 'PASS';", "const st = !okF ? 'FAIL' : okB === null ? 'INCOMPLETE' : 'PASS';"],
    ['2d FAIL line +10 -> +12', 'dw > 10 ? \'FAIL\'', 'dw > 12 ? \'FAIL\''],
    ['-b may replace complete pairs (fill-only removed)', "const holeIds = ids.filter((id) => classify(ob[keyOf(id)]) === 'hole' || classify(on[keyOf(id)]) === 'hole');", 'const holeIds = [...ids];'],
    ['I1 per-rep threshold >= 2 -> >= 3', '.filter(([, c]) => c >= 2)', '.filter(([, c]) => c >= 3)'],
    ['B1 zero back pairs hides a front FAIL', "const st = !okF || okB === false ? 'FAIL' : okB === null ? 'INCOMPLETE' : 'PASS';", "const st = okB === null ? 'INCOMPLETE' : !okF || okB === false ? 'FAIL' : 'PASS';"],
    ['B1 holes gate 4c (INCOMPLETE spreads)', "if (tooFew) state('4c',", "if (tooFew || badReps.length) state('4c',"],
    ['I2 the TTFT fallback decides with 2c ungated', '} else if (sitting?.gates) {', '} else if (true) {'],
    ['I3 exit code of a step not checked', 'if (s.exit !== 0) problems.push(', 'if (false) problems.push('],
    ['M4 duplicate start line tolerated', 'if (s[kind] != null) problems.push(', 'if (false) problems.push('],
    ['M4 counterbalanced order not checked', 'if (!b.b && !n.b) {', 'if (false) {'],
    ['I4 --g vs key ids not checked', 'if (keyIds.size !== ids.length ||', 'if (false &&'],
    ['M2 empty answer scored off-topic', 'export const EMPTY = { correctness: 0, on_topic: 2, delivery: 0 };', 'export const EMPTY = { correctness: 0, on_topic: 0, delivery: 0 };'],
    ['I3 a missing sitting log ungates instead of refusing', 'if (!fs.existsSync(sp)) {', 'if (false) {'],
    ['-b substitution reads the original tag', 'const tag = hasB.length === 2 ? cand[arm][0] : tagOf(leg, arm, rep);', 'const tag = tagOf(leg, arm, rep);'],
];

async function main() {
    const lines = [];
    const orig = console.log;
    console.log = (...a) => { lines.push(a.join(' ')); orig(...a); };
    const M = await import(pathToFileURL(SELF).href);
    const results = await runAll(M);
    const bad = results.filter((r) => !r.ok);
    let mutOk = 0, mutTot = 0;
    if (!process.argv.includes('--no-mutants')) {
        const src = fs.readFileSync(SELF, 'utf8');
        fs.rmSync(MUT, { recursive: true, force: true }); fs.mkdirSync(MUT, { recursive: true });
        for (const [name, from, to] of MUTANTS) {
            mutTot++;
            if (!src.includes(from)) { console.log(`MUTANT ${name}: pattern NOT FOUND in eq-twins.mjs (the mutant list is stale)`); continue; }
            const f = path.join(MUT, `mut-${mutTot}.mjs`);
            fs.writeFileSync(f, src.replace(from, to));
            let failed = [];
            try { const MM = await import(`${pathToFileURL(f).href}?m=${mutTot}`); failed = (await runAll(MM, { quiet: true, file: f })).filter((r) => !r.ok); } catch (e) { console.log(`MUTANT CRASHED (not counted as caught)  ${name}: ${String(e.message).slice(0, 80)}`); continue; }
            if (failed.length) { mutOk++; console.log(`MUTANT CAUGHT  ${name}  (first failing check: ${failed[0].name.slice(0, 90)})`); } else console.log(`MUTANT SURVIVED  ${name}`);
        }
    }
    console.log(`\nEQ-TWINS CALIBRATION: ${results.length - bad.length}/${results.length} checks${bad.length ? ` FAILED: ${bad.map((b) => b.name).join(' | ')}` : ' OK'}; mutants caught ${mutOk}/${mutTot}`);
    fs.rmSync(MUT, { recursive: true, force: true }); fs.rmSync(TMP, { recursive: true, force: true });
    console.log = orig;
    fs.writeFileSync(path.join(E, 'eq-twins.cal.txt'), lines.join('\n') + '\n');
    process.exit(bad.length === 0 && mutOk === mutTot ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
