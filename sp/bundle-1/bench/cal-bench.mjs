// cal-bench.mjs: known-answer calibration of the bench's pure pieces (rule 8): bars.mjs, export-blind.mjs buildBlind, score-bench.mjs joinGrades/launchProblems, build-arms.mjs
// transformSystem, run-bench.mjs incomplete, common.mjs helpers. Every check is shown to FAIL on a deliberately broken input. NO network, NO model, writes nothing.
//   node cal-bench.mjs [--quiet]
import { loadLive40, expectedIds, NOCUE_IDS, MP, SH, SH1, C1_REQUIRED, median, pctile, mean, spread, jaccard, norm, wordCount } from './common.mjs';
import { allBars, classify, hasKey, firstWords, barsQuality, barsLength, barsThinking, barsTtft, barsShort, barsCues, REPS, TOL } from './bars.mjs';
import { buildBlind } from './export-blind.mjs';
import { joinGrades, launchProblems, runHashProblems } from './score-bench.mjs';
import { transformSystem, assertSameLengthRule, checkCueSplit } from './build-arms.mjs';
import { incomplete } from './run-bench.mjs';
import { fileURLToPath } from 'node:url';
import { sha12 } from './common.mjs';

const QUIET = process.argv.includes('--quiet');
const results = [];
const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); if (!QUIET || !cond) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };

const live40 = await loadLive40(), ids = expectedIds(live40);
const NS = ids.filter((i) => !NOCUE_IDS.includes(i));
ck('frozen sets: 42 ids, 22 no-cue, 20 cue ids; MP 9, SH 6, SH1 4', ids.length === 42 && NOCUE_IDS.length === 22 && NS.length === 20 && MP.length === 9 && SH.length === 6 && SH1.length === 4);
ck('frozen sets CAN fail: a set naming an id outside the 42 throws', (() => { try { expectedIds(live40.filter((i) => i.id !== 'RH03')); return false; } catch { return true; } })());

// ---------------------------------------------------------------- stats helpers
ck('median even/odd', median([1, 2, 3]) === 2 && median([1, 2, 3, 4]) === 2.5 && Number.isNaN(median([])));
ck('pctile nearest rank: p90 of 1..10 is 9, p50 is 5', pctile([...Array(10).keys()].map((x) => x + 1), 0.9) === 9 && pctile([...Array(10).keys()].map((x) => x + 1), 0.5) === 5);
ck('spread / mean', spread([3, 9, 5]) === 6 && mean([1, 2, 3]) === 2);
ck('jaccard: identical 1, disjoint 0, one word changed < 1', jaccard('a b c', 'a b c') === 1 && jaccard('a b', 'c d') === 0 && jaccard('what is a pod', 'what is the pod') < 1 && jaccard('what is a pod', 'what is the pod') > 0.3);
ck('norm matches the app (case and punctuation insensitive)', norm('Hello, World!') === norm('hello world'));

// ---------------------------------------------------------------- classify (the verdict rule of the spec, literal)
const G = (c, o, d = 2) => ({ correctness: c, on_topic: o, delivery: d });
ck('classify: 2/2 + 2/2 acceptable', classify([G(2, 2), G(2, 2)]) === 'acceptable');
ck('classify: one grader 1 -> weak', classify([G(2, 2), G(1, 2)]) === 'weak' && classify([G(2, 1), G(2, 2)]) === 'weak');
ck('classify: correctness 0 from EITHER grader -> wrong', classify([G(0, 2), G(2, 2)]) === 'wrong' && classify([G(2, 2), G(0, 0)]) === 'wrong');
ck('classify: on_topic 0 alone is weak (the spec is literal; the instrument-style count is reported beside it)', classify([G(2, 0), G(2, 2)]) === 'weak');
ck('classify: delivery is ignored (delivery 0 can still be acceptable)', classify([G(2, 2, 0), G(2, 2, 0)]) === 'acceptable');
ck('classify refuses one grader / a score of 3', (() => { try { classify([G(2, 2)]); return false; } catch { return true; } })() && (() => { try { classify([G(3, 2), G(2, 2)]); return false; } catch { return true; } })());

// ---------------------------------------------------------------- S1 key reading
ck('S1 key: "Yes, because ..." has yes in 5 words; yes at word 6 does not', hasKey('RH06', 'Yes, because the pod restarts') && !hasKey('RH06', 'It really depends on the load, yes') );
ck('S1 key: RH16 no; RE10 "Azure Functions"; RE14 Parquet; RH19 serverless; RH13 O of one / constant / O(1)', hasKey('RH16', 'No, not at all') && hasKey('RE10', 'Azure Functions is the one') && hasKey('RE14', 'Parquet, since columnar') && hasKey('RH19', 'Serverless fits best here') && hasKey('RH13', 'O of one, constant time') && hasKey('RH13', 'Constant time, because hashing') && !hasKey('RH13', 'Linear in the number of items'));
ck('S1 key can fail: "Notably" does not contain "no"', !hasKey('RH06', 'Notably the answer is complicated'));
ck('firstWords takes exactly 5', firstWords('one two three four five six seven') === 'one two three four five');

// ---------------------------------------------------------------- synthetic pass case
const body = (n, lead = '') => `${lead} ${'word '.repeat(Math.max(0, n - wordCount(lead)))}`.trim();
const LEAD = { RH06: 'Yes it does', RH16: 'No it does not', RE10: 'Azure Functions fits', RE14: 'Parquet is better', RH19: 'Serverless fits best', RH13: 'O of one constant time' };
function base() {
    const runs = { C: { 1: {}, 2: {}, 3: {} }, T: { 1: {}, 2: {}, 3: {} } }, grades = { C: { 1: {}, 2: {}, 3: {} }, T: { 1: {}, 2: {}, 3: {} } };
    for (const a of ['C', 'T']) for (const r of REPS) for (const id of ids) {
        const isMP = MP.includes(id), isNS = !NOCUE_IDS.includes(id), isSH1 = SH1.includes(id);
        const w = isSH1 ? (a === 'C' ? 55 : 22) : isNS ? 50 : 40;
        const cues = a === 'T' && !isNS ? [] : ['a', 'b', 'c'];
        runs[a][r][id] = { spoken: body(w, LEAD[id] ?? ''), ttft: 3400 + r * 10, thoughts: 500 + r, cues, raw: '' };
        grades[a][r][id] = [G(2, 2), G(2, 2)];
    }
    return { runs, grades };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const verdicts = (bars) => Object.fromEntries(bars.map((b) => [b.id, b.pass]));
const BAR_IDS = ['Q1', 'Q2', 'Q3', 'L1a', 'L1b', 'L2', 'L3', 'S1', 'S2', 'C1', 'C2'];
{
    const { runs, grades } = base();
    const v = verdicts(allBars(runs, grades, ids));
    ck(`pass case: all ${BAR_IDS.length} bars PASS on the synthetic known-good data`, BAR_IDS.every((b) => v[b] === true) && Object.keys(v).length === BAR_IDS.length, JSON.stringify(v));
}
function mutate(name, bar, fn, { alsoOk = true } = {}) {
    const d = base(); fn(d);
    const v = verdicts(allBars(d.runs, d.grades, ids));
    ck(`mutant ${name}: ${bar} flips to FAIL`, v[bar] === false, JSON.stringify(Object.fromEntries(Object.entries(v).filter(([, x]) => !x))));
}
// Q1: T acceptable count collapses (many weak in every T rep)
mutate('T answers weak across the board', 'Q1', ({ grades }) => { for (const r of REPS) for (const id of ids.slice(0, 10)) grades.T[r][id] = [G(2, 1), G(2, 2)]; });
mutate('one id wrong in one T rep only', 'Q2', ({ grades }) => { grades.T[2]['RE05'] = [G(0, 2), G(2, 2)]; });
ck('Q2 passes when the same id is wrong in C too (not NEW) and T total <= C total', (() => { const d = base(); d.grades.C[1].RE05 = [G(0, 2), G(2, 2)]; d.grades.T[2].RE05 = [G(0, 2), G(2, 2)]; return barsQuality(d.grades, ids).find((b) => b.id === 'Q2').pass; })());
ck('Q2 fails when total wrong T > C even with no new id', (() => { const d = base(); d.grades.C[1].RE05 = [G(0, 2), G(2, 2)]; d.grades.T[1].RE05 = [G(0, 2), G(2, 2)]; d.grades.T[2].RE05 = [G(0, 2), G(2, 2)]; return !barsQuality(d.grades, ids).find((b) => b.id === 'Q2').pass; })());
mutate('two ids acceptable 3/3 in C, 0/3 in T', 'Q3', ({ grades }) => { for (const r of REPS) { grades.T[r].RH03 = [G(2, 1), G(2, 2)]; grades.T[r].RH05 = [G(2, 1), G(2, 2)]; } });
ck('Q1 overlap rule: T band entirely BELOW C band fails even with the mean inside the slack (C [42,42,42], T [41,41,41])', (() => { const d = base(); for (const r of REPS) d.grades.T[r].RE05 = [G(2, 1), G(2, 2)]; return !barsQuality(d.grades, ids).find((b) => b.id === 'Q1').pass; })());
ck('Q2 NEW-wrong rule alone: C wrong on id A, T wrong on a different id B (totals equal) -> Q2 fails', (() => { const d = base(); d.grades.C[1].RE05 = [G(0, 2), G(2, 2)]; d.grades.T[1].RE06 = [G(0, 2), G(2, 2)]; return !barsQuality(d.grades, ids).find((b) => b.id === 'Q2').pass; })());
ck('Q3 passes with exactly one weak-drop id (limit is 1)', (() => { const d = base(); for (const r of REPS) d.grades.T[r].RH03 = [G(2, 1), G(2, 2)]; return barsQuality(d.grades, ids).find((b) => b.id === 'Q3').pass; })());
ck('Q3 names SH/MP weak-drop ids in its detail', (() => { const d = base(); for (const r of REPS) { d.grades.T[r].RH03 = [G(2, 1), G(2, 2)]; d.grades.T[r].RH05 = [G(2, 1), G(2, 2)]; } return /named SH\/MP among them \[RH03,RH05\]/.test(barsQuality(d.grades, ids).find((b) => b.id === 'Q3').detail); })());
ck('Q1 boundary (overlapping bands): C acc [42,42,36] mean 40; T mean 38 = mean C - 2 passes, T mean 37.67 fails', (() => { const mk = (weakPerRep) => { const d = base(); const weak = (arm, r, n) => { for (const id of ids.slice(0, n)) d.grades[arm][r][id] = [G(2, 1), G(2, 2)]; }; weak('C', 3, 6); weak('T', 1, weakPerRep[0]); weak('T', 2, weakPerRep[1]); weak('T', 3, weakPerRep[2]); return barsQuality(d.grades, ids).find((b) => b.id === 'Q1').pass; }; return mk([0, 6, 6]) === true && mk([0, 6, 7]) === false; })());
const NSX = NS.filter((id) => !MP.includes(id) && !SH1.includes(id)).slice(0, 3);   // plain NS ids (base 50 words in both arms)
const setT = (ids_, w) => { const d = base(); for (const r of REPS) for (const id of ids_) d.runs.T[r][id].spoken = body(w); return d; };
const L1 = (d, k) => barsLength(d.runs, ids).find((b) => b.id === k).pass;
mutate('three NS ids 1.3x longer in T', 'L1a', ({ runs }) => { for (const r of REPS) for (const id of NSX) runs.T[r][id].spoken = body(65); });
ck('L1a per-id: 3 ids at 1.2x pass (none over 1.25x); 2 ids at 1.3x pass (limit 2 over); 3 ids at 1.3x fail', L1(setT(NSX, 60), 'L1a') && L1(setT(NSX.slice(0, 2), 65), 'L1a') && !L1(setT(NSX, 65), 'L1a'));
ck('L1b pooled: every MP id at 0.8x C (per-id 0.75 holds) fails the pooled 0.9 rule; at 0.9x passes', !L1(setT(MP, 40), 'L1b') && L1(setT(MP, 45), 'L1b'));
ck('L1a pooled boundary: T NS median 1.05x passes, 1.10x fails (no id over 1.25x)', (() => { const mk = (w) => { const d = base(); for (const r of REPS) for (const id of NS) d.runs.T[r][id].spoken = body(w); return barsLength(d.runs, ids).find((b) => b.id === 'L1a').pass; }; return mk(52) === true && mk(56) === false; })());
mutate('MP answers shortened to 70%', 'L1b', ({ runs }) => { for (const r of REPS) for (const id of MP) runs.T[r][id].spoken = body(35); });
ck('L1b per-id: one MP id at 0.7x fails even when pooled is fine', (() => { const d = base(); for (const r of REPS) d.runs.T[r].RH05.spoken = body(35); return !barsLength(d.runs, ids).find((b) => b.id === 'L1b').pass; })());
mutate('T thinking +200 tokens', 'L2', ({ runs }) => { for (const r of REPS) for (const id of ids) runs.T[r][id].thoughts += 200; });
ck('L2 boundary: +50 passes, +60 fails (C rep spread is 0..2 so the 50 floor applies)', (() => { const mk = (d) => { const x = base(); for (const r of REPS) for (const id of ids) x.runs.T[r][id].thoughts += d; return barsThinking(x.runs, ids)[0].pass; }; return mk(50) === true && mk(60) === false; })());
ck('L2 refuses a missing thoughtsTokenCount (fails loudly rather than reading 0)', (() => { const x = base(); delete x.runs.T[1].RE05.thoughts; const b = barsThinking(x.runs, ids)[0]; return !b.pass && /missing/.test(b.detail); })());
mutate('T TTFT +1000 ms', 'L3', ({ runs }) => { for (const r of REPS) for (const id of ids) runs.T[r][id].ttft += 1000; });
ck('L3 boundary: +200 passes, +250 fails', (() => { const mk = (d) => { const x = base(); for (const r of REPS) for (const id of ids) x.runs.T[r][id].ttft += d; return barsTtft(x.runs, ids)[0].pass; }; return mk(200) === true && mk(250) === false; })());
mutate('T short answers lose the key (4 of 18)', 'S1', ({ runs }) => { for (const r of REPS) for (const id of ['RH06', 'RE10']) runs.T[r][id].spoken = body(22, 'Well it can depend'); });
ck('S1 boundary (C at 12/18 so only the 15 floor binds): T 15/18 passes, 14/18 fails; and T 15 < C 18 fails (T >= C)', (() => { const mk = (nT, nC) => { const x = base(); let k = 0; for (const r of REPS) for (const id of SH) { if (k++ < nT) x.runs.T[r][id].spoken = body(22, 'Well it can depend somewhat'); } k = 0; for (const r of REPS) for (const id of SH) { if (k++ < nC) x.runs.C[r][id].spoken = body(22, 'Well it can depend somewhat'); } return barsShort(x.runs).find((b) => b.id === 'S1').pass; }; return mk(3, 6) === true && mk(4, 6) === false && mk(3, 0) === false; })());
mutate('one SH1 id over 35 words in all 3 T reps', 'S2', ({ runs }) => { for (const r of REPS) runs.T[r].RE10.spoken = body(40, LEAD.RE10); });
ck('S2 band: 9/12 passes, 8/12 fails (answers of 9 words are out of band)', (() => { const mk = (n) => { const x = base(); let k = 0; for (const r of REPS) for (const id of SH1) { if (k++ < n) x.runs.T[r][id].spoken = body(9, LEAD[id]); } return barsShort(x.runs).find((b) => b.id === 'S2').pass; }; return mk(3) === true && mk(4) === false; })());
mutate('MP cue lines vanish in T', 'C1', ({ runs }) => { for (const r of REPS) for (const id of MP) runs.T[r][id].cues = []; });
ck('C1 uses the FROZEN per-id line count (RH05 needs 3: 2 lines does not meet it)', (() => { const x = base(); for (const r of REPS) x.runs.T[r].RH05.cues = ['a', 'b']; const c1 = barsCues(x.runs, ids).find((b) => b.id === 'C1'); return /T \[8,8,8\]/.test(c1.detail) && c1.pass; })());
ck('C1 boundary: mean T = mean C - 1 passes, -2 fails', (() => { const mk = (n) => { const x = base(); for (const r of REPS) for (const id of MP.slice(0, n)) x.runs.T[r][id].cues = []; return barsCues(x.runs, ids).find((b) => b.id === 'C1').pass; }; return mk(1) === true && mk(2) === false; })());
mutate('a no-cue id carries a cue block in T', 'C2', ({ runs }) => { runs.T[2].RE05.cues = ['x']; });
mutate('a no-cue id leaks the sentinel in raw only', 'C2', ({ runs }) => { runs.T[1].RE02.raw = 'answer __CUES__ x'; });
ck('C2: cue ids with a block >= 90%: 18/20 passes, 17/20 fails', (() => { const mk = (n) => { const x = base(); for (const id of NS.slice(0, n)) x.runs.T[1][id].cues = []; return barsCues(x.runs, ids).find((b) => b.id === 'C2').pass; }; return mk(2) === true && mk(3) === false; })());

// ---------------------------------------------------------------- blind export
{
    const { runs } = base();
    const stores = { C: runs.C, T: runs.T };
    const built = buildBlind(stores, ids, (id) => `Q ${id}`, (id) => `H ${id}`);
    const k1 = built.key['blind-1'];
    ck('blind: 3 files of 84; each holds one C rep and one T rep (42 + 42)', built.files.length === 3 && built.files.every((f) => f.items.length === 84) && [1, 2, 3].every((k) => { const m = Object.values(built.key[`blind-${k}`]); return m.filter((x) => x.arm === 'C').length === 42 && m.filter((x) => x.arm === 'T').length === 42 && m.every((x) => x.rep === k); }));
    ck('blind: the pairs items carry no arm, no rep and no real id (only q001..q084 keys)', built.files.every((f) => f.items.every((i) => /^q\d{3}$/.test(i.key) && i.id === i.key && !('arm' in i) && !('rep' in i))) && !JSON.stringify(built.files).includes('"arm"'));
    ck('blind: the shuffle reorders (C items are not all first) and is deterministic', Object.values(k1).slice(0, 42).some((x) => x.arm === 'T') && JSON.stringify(buildBlind(stores, ids, (i) => i, (i) => i).key) === JSON.stringify(buildBlind(stores, ids, (i) => i, (i) => i).key));
    ck('blind: a different seed gives a different order (the shuffle depends on the seed)', JSON.stringify(buildBlind(stores, ids, (i) => i, (i) => i, 'other').key['blind-1']) !== JSON.stringify(k1));
    ck('blind: every (arm,id) appears exactly once per file', [1, 2, 3].every((k) => new Set(Object.values(built.key[`blind-${k}`]).map((x) => `${x.arm}/${x.id}`)).size === 84));
    ck('blind: answer text of a key is the spoken text of its (arm,rep,id)', Object.entries(k1).every(([q, m]) => built.files[0].items.find((i) => i.key === q).answer === runs[m.arm][1][m.id].spoken));
    const holed = clone(stores); delete holed.T[2].RH03.spoken;
    ck('blind CAN fail: an answer without spoken text refuses', (() => { try { buildBlind(holed, ids, (i) => i, (i) => i); return false; } catch (e) { return /RH03/.test(e.message); } })());
    const trans = clone(stores); trans.C[3].RE02.transientError = 'HTTP 429';
    ck('blind CAN fail: a transient error refuses', (() => { try { buildBlind(trans, ids, (i) => i, (i) => i); return false; } catch { return true; } })());
    // join: grade every key two times
    const pairsByFile = Object.fromEntries(built.files.map((f, i) => [i + 1, f.items]));
    const vs = {}; for (let k = 1; k <= 3; k++) for (const g of [1, 2]) vs[`blind-${k}.g${g}`] = Object.fromEntries(built.files[k - 1].items.map((i) => [i.key, G(2, 2)]));
    const j = joinGrades(pairsByFile, built.key, vs, ids);
    ck('join: a complete set of 6 verdict files joins with 0 problems and covers (arm,rep,id) 252 times', j.problems.length === 0 && ['C', 'T'].every((a) => REPS.every((r) => ids.every((id) => j.grades[a][r][id]?.length === 2))), j.problems.slice(0, 2).join('|'));
    ck('join: the join attaches the verdicts to the RIGHT arm (a T-only weak grade lands on T)', (() => { const v2 = clone(vs); const q = Object.entries(built.key['blind-1']).find(([, m]) => m.arm === 'T' && m.id === 'RE05')[0]; v2['blind-1.g1'][q] = G(2, 1); const jj = joinGrades(pairsByFile, built.key, v2, ids); return classify(jj.grades.T[1].RE05) === 'weak' && classify(jj.grades.C[1].RE05) === 'acceptable'; })());
    const v3 = clone(vs); delete v3['blind-2.g2'][Object.keys(v3['blind-2.g2'])[0]];
    ck('join CAN fail: a missing verdict is a problem', joinGrades(pairsByFile, built.key, v3, ids).problems.some((p) => /lacks a grader verdict/.test(p)));
    const v4 = clone(vs); delete v4['blind-3.g1'];
    ck('join CAN fail: a missing grader file is a problem', joinGrades(pairsByFile, built.key, v4, ids).problems.length > 0);
    const k5 = clone(built.key); const q0 = Object.keys(k5['blind-1'])[0]; k5['blind-1'][q0].rep = 2;
    ck('join CAN fail: a key entry with the wrong rep is a problem', joinGrades(pairsByFile, k5, vs, ids).problems.some((p) => /is rep 2/.test(p)));
    const v6 = clone(vs); v6['blind-1.g1'][q0] = { correctness: 3, on_topic: 2, delivery: 2 };
    ck('join CAN fail: an out-of-range score is a problem', joinGrades(pairsByFile, built.key, v6, ids).problems.some((p) => /correctness=3/.test(p)));
}

// ---------------------------------------------------------------- launch records
{
    const tags = ['blind-1.g1', 'blind-1.g2'];
    const good = (t) => ({ slot: t, exit: 0, memory: 'ABSENT', pinned: true, slugJsonl: 1, memoryDir: 'absent', tools: { Read: 3, Write: 1 }, pairsSha12: 'aaa', verdictsSha12: 'bbb', model: 'claude-opus-5-5' });
    const sha = (p) => (p.includes('verdicts') ? 'bbb' : 'aaa');
    const lp = (recs) => launchProblems(recs, tags, () => 'pairs', () => 'verdicts', sha);
    ck('launch records: clean records give no problem', lp(tags.map(good)).length === 0);
    for (const [name, mut, rx] of [['exit 1', { exit: 1 }, /exit 1/], ['memory LOADED', { memory: 'LOADED' }, /memory LOADED/], ['model not the pin', { pinned: false }, /not the pin/], ['slugJsonl 2', { slugJsonl: 2 }, /slugJsonl/], ['memory dir non-empty', { memoryDir: 'non-empty' }, /non-empty/], ['tool Bash', { tools: { Bash: 1 } }, /tool outside/], ['pairs changed', { pairsSha12: 'zzz' }, /pairs file changed/], ['verdicts changed', { verdictsSha12: 'zzz' }, /verdicts file changed/]])
        ck(`launch records CAN fail: ${name}`, lp([{ ...good(tags[0]), ...mut }, good(tags[1])]).some((p) => rx.test(p)));
    ck('launch records CAN fail: a missing record', lp([good(tags[0])]).some((p) => /no launch record/.test(p)));
    ck('launch records: only the LAST record of a tag counts (a later clean one supersedes an earlier failure)', lp([{ ...good(tags[0]), exit: 1 }, good(tags[0]), good(tags[1])]).length === 0);
}

// ---------------------------------------------------------------- transformSystem (the T bytes)
{
    const SP = 'SPOKEN-RULE', CR = '<CUE-RULE>';
    const sys = `head ${SP}${CR} tail`;
    ck('transform: cue id keeps the bytes unchanged', transformSystem('X', sys, { spoken: SP, cueRule: CR, stripCue: false }) === sys);
    ck('transform: no-cue id strips the cue rule and nothing else', transformSystem('X', sys, { spoken: SP, cueRule: CR, stripCue: true }) === `head ${SP} tail`);
    const thr = (s, o) => { try { transformSystem('X', s, o); return false; } catch (e) { return e.message; } };
    ck('transform CAN fail: length rule absent / twice', /0 times/.test(thr('head tail', { spoken: SP, cueRule: CR })) && /2 times/.test(thr(`${SP}${CR} ${SP}${CR}`, { spoken: SP, cueRule: CR })));
    ck('transform CAN fail: cue rule not directly after the length rule', !!thr(`head ${SP} x${CR}`, { spoken: SP, cueRule: CR }));
    ck('transform CAN fail: the cue rule occurs twice (once adjacent, once elsewhere) when stripping', !!thr(`head ${SP}${CR} mid ${CR}`, { spoken: SP, cueRule: CR, stripCue: true }));
    // AMENDMENT-A1: the length rule is identical in C and T; the cue rule is absent on exactly the no-cue ids
    ck('length rule: identical constants pass', (() => { try { assertSameLengthRule(SP, SP); return true; } catch { return false; } })());
    ck('length rule CAN fail: differing constants refuse', (() => { try { assertSameLengthRule(SP, SP + 'x'); return false; } catch (e) { return /identical/.test(e.message); } })());
    const ids2 = ['A', 'B'], cs = new Set(['A']);
    const goodT = { A: { system: `${SP}${CR}` }, B: { system: SP } };
    ck('cue split: cue rule on the cue id only -> no problems', checkCueSplit(goodT, ids2, cs, SP, CR).length === 0);
    ck('cue split CAN fail: cue rule left on a no-cue id', checkCueSplit({ ...goodT, B: { system: `${SP}${CR}` } }, ids2, cs, SP, CR).length > 0);
    ck('cue split CAN fail: cue rule missing on a cue id', checkCueSplit({ ...goodT, A: { system: SP } }, ids2, cs, SP, CR).length > 0);
    ck('cue split CAN fail: a changed length rule', checkCueSplit({ ...goodT, B: { system: 'other' } }, ids2, cs, SP, CR).length > 0);
}
ck('run-bench incomplete(): missing, empty and transient entries are all reported', JSON.stringify(incomplete({ a: { spoken: 'x' }, b: { spoken: '' }, c: { spoken: 'x', transientError: 'HTTP 429' } }, ['a', 'b', 'c', 'd'])) === JSON.stringify(['b', 'c', 'd']));

// ---------------------------------------------------------------- end to end: score-bench.mjs CLI on a synthetic root (runs + key + pairs + verdicts + launch records)
{
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'), { spawnSync } = await import('node:child_process');
    const here = path.dirname(fileURLToPath(import.meta.url));
    const mkRoot = (mut = {}) => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-score-'));
        const { runs } = base();
        const built = buildBlind({ C: runs.C, T: runs.T }, ids, (id) => `Q ${id}`, (id) => `H ${id}`);   // the export is built from the GOOD runs; a mutation then damages the run files only
        if (mut.runs) mut.runs(runs);
        for (const d of ['runs', 'keyhold', 'blind', 'grade/verdicts']) fs.mkdirSync(path.join(root, d), { recursive: true });
        for (const a of ['C', 'T']) for (const r of REPS) fs.writeFileSync(path.join(root, 'runs', `b1${a.toLowerCase()}${r}.json`), JSON.stringify(runs[a][r]));
        fs.writeFileSync(path.join(root, 'keyhold', 'key-b1.json'), JSON.stringify(built.key));
        fs.writeFileSync(path.join(root, 'keyhold', 'build-record-b1.json'), JSON.stringify({ runSha12: Object.fromEntries(['C', 'T'].flatMap((a) => REPS.map((r) => [`${a}${r}`, sha12(fs.readFileSync(path.join(root, 'runs', `b1${a.toLowerCase()}${r}.json`)))]))) }));   // as export-blind writes it, BEFORE any mutation of the run files
        const recs = [];
        built.files.forEach((f, i) => {
            const pf = path.join(root, 'blind', `pairs.blind-${i + 1}.json`); fs.writeFileSync(pf, JSON.stringify({ items: f.items }));
            for (const g of [1, 2]) {
                const tag = `blind-${i + 1}.g${g}`, vf = path.join(root, 'grade', 'verdicts', `verdicts.${tag}.json`);
                const v = Object.fromEntries(f.items.map((it) => { const m = built.key[`blind-${i + 1}`][it.key]; return [it.key, mut.grade ? mut.grade(m, g) : { correctness: 2, on_topic: 2, delivery: 2, reason: 'x' }]; }));
                fs.writeFileSync(vf, JSON.stringify(v));
                recs.push({ slot: tag, exit: 0, memory: 'ABSENT', pinned: true, slugJsonl: 1, memoryDir: 'absent', tools: { Read: 2, Write: 1 }, model: 'claude-opus-5-5', pairsSha12: sha12(fs.readFileSync(pf)), verdictsSha12: sha12(fs.readFileSync(vf)), ...(mut.rec ? mut.rec(tag) : {}) });
            }
        });
        fs.writeFileSync(path.join(root, 'grade', 'launches.jsonl'), recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
        return root;
    };
    const sc = (root) => spawnSync(process.execPath, [path.join(here, 'score-bench.mjs'), '--root', root], { encoding: 'utf8' });
    const good = mkRoot(), r0 = sc(good);
    ck('e2e score-bench CLI: a clean synthetic root scores BENCH PASS (exit 0) with 11 PASS lines', r0.status === 0 && /BENCH PASS: all 11 bars/.test(r0.stdout) && (r0.stdout.match(/^PASS /gm) ?? []).length === 11, (r0.stdout + r0.stderr).trim().split('\n').slice(0, 6).join(' | ').slice(0, 600));
    const bad1 = mkRoot({ grade: (m, g) => (m.arm === 'T' && m.id === 'RE05' && m.rep === 2 && g === 1 ? { correctness: 0, on_topic: 2, delivery: 2, reason: 'x' } : { correctness: 2, on_topic: 2, delivery: 2, reason: 'x' }) }), r1 = sc(bad1);
    ck('e2e score-bench CLI CAN fail: one NEW wrong answer in a T rep -> exit 1, Q2 FAIL named', r1.status === 1 && /FAIL Q2/.test(r1.stdout) && /BENCH FAIL: Q2/.test(r1.stdout));
    const bad2 = mkRoot({ rec: (tag) => (tag === 'blind-2.g2' ? { memory: 'LOADED' } : {}) }), r2 = sc(bad2);
    ck('e2e score-bench CLI CAN fail: a grader record with memory LOADED -> REFUSED (exit 2), no bars printed', r2.status === 2 && /memory LOADED/.test(r2.stdout) && !/^PASS /m.test(r2.stdout));
    const bad3 = mkRoot(); fs.rmSync(path.join(bad3, 'grade', 'verdicts', 'verdicts.blind-3.g1.json')); const r3 = sc(bad3);
    ck('e2e score-bench CLI CAN fail: a missing grader file -> REFUSED (exit 2)', r3.status === 2 && /missing/.test(r3.stdout));
    const bad4 = mkRoot({ runs: (runs) => { delete runs.T[2].RH05.spoken; } }), r4 = sc(bad4);
    ck('e2e score-bench CLI CAN fail: a T answer missing from a run file -> REFUSED (exit 2)', r4.status === 2 && /without an answer/.test(r4.stdout));
    const bad5 = mkRoot({ runs: (runs) => { for (const r of REPS) for (const id of MP) runs.T[r][id].spoken = body(40); } }), r5 = sc(bad5);
    ck('e2e score-bench CLI CAN fail: MP answers cut to 40 words in T -> BENCH FAIL (exit 1) naming L1b', r5.status === 1 && /FAIL L1b/.test(r5.stdout));
    const bad6 = mkRoot(); fs.appendFileSync(path.join(bad6, 'blind', 'pairs.blind-1.json'), ' '); const r6 = sc(bad6);
    ck('e2e score-bench CLI CAN fail: a pairs file edited after the graders ran -> REFUSED (exit 2)', r6.status === 2 && /pairs file changed/.test(r6.stdout));
    const bad7 = mkRoot(); const rf = path.join(bad7, 'runs', 'b1t2.json'); const rj = JSON.parse(fs.readFileSync(rf, 'utf8')); rj.RE05.ttft += 1; fs.writeFileSync(rf, JSON.stringify(rj)); const r7 = sc(bad7);
    ck('fix C e2e: a run file touched (one ttft changed) after the blind export -> REFUSED (exit 2) naming T2', r7.status === 2 && /T2: the run file changed since the blind export/.test(r7.stdout));
    const bad8 = mkRoot(); fs.rmSync(path.join(bad8, 'keyhold', 'build-record-b1.json')); const r8 = sc(bad8);
    ck('fix C e2e: no build record -> REFUSED (exit 2)', r8.status === 2 && /build-record-b1\.json missing/.test(r8.stdout));
    ck('fix C pure: runHashProblems passes when every hash matches; flags a changed file, a missing hash and a missing record', (() => { const rec = { runSha12: Object.fromEntries(['C', 'T'].flatMap((a) => [1, 2, 3].map((r) => [`${a}${r}`, 'h']))) }; const ok = runHashProblems(rec, () => 'x', () => 'h').length === 0; const ch = runHashProblems(rec, (a, r) => `${a}${r}`, (p) => (p === 'C3' ? 'z' : 'h')); const miss = runHashProblems({ runSha12: { C1: 'h' } }, () => 'x', () => 'h').length > 0; return ok && ch.length === 1 && /C3/.test(ch[0]) && miss && runHashProblems({}, () => 'x').length === 1; })());
    for (const d of [good, bad1, bad2, bad3, bad4, bad5, bad6, bad7, bad8]) fs.rmSync(d, { recursive: true, force: true });
}

const fail = results.filter((r) => !r.ok);
console.log(`\ncal-bench: ${results.length - fail.length}/${results.length} checks ok${fail.length ? `; FAILED: ${fail.map((f) => f.name).join(' | ')}` : ''}`);
process.exit(fail.length ? 1 : 0);
