// The pre-registered bench bars of SPEC-bundle-1 section 8, as PURE functions (no files, no network). The scorer feeds them real data; cal-bench.mjs feeds them a synthetic pass case and
// breaks it bar by bar. Tolerances are the spec's, verbatim, and each constant says where it comes from.
//
// Data model:
//   runs   [arm][rep][id] = { spoken, words?, ttft, thoughts, cues: string[], raw?: string }     arm in C|T, rep in 1..3
//   grades [arm][rep][id] = [ {correctness,on_topic,delivery}, {..} ]                              the two graders
import { NOCUE_IDS, MP, SH, SH1, C1_REQUIRED, S1_KEYS, median, pctile, mean, spread, wordCount } from './common.mjs';

export const REPS = [1, 2, 3];
const ARMS = ['C', 'T'];
// ---- spec constants (section 8 table)
export const TOL = {
    Q1_MEAN_SLACK: 2,                                  // mean(T) >= mean(C) - 2 (of 42)
    Q3_MAX: 1,                                         // at most 1 id acceptable in all 3 C reps and in 0 T reps
    L1A_PER_ID: 1.25, L1A_MAX_OVER: 2, L1A_POOLED: 1.05,
    L1B_POOLED: 0.9, L1B_PER_ID: 0.75,
    L2_FLOOR: 50, L3_FLOOR_MS: 200,
    S1_MIN: 15, S2_WORDS: [10, 35], S2_MIN: 9, S2_OVER: 35,
    C1_SLACK: 1, C2_CUE_FRACTION: 0.9,
};
export const FIRST_WORDS = 5;

// ---------------------------------------------------------------- per-answer verdicts (spec 8 "Grading")
/** acceptable = BOTH graders correctness 2 and on-topic 2; wrong = correctness 0 from EITHER grader; weak = neither. Literal. */
export function classify(gs) {
    if (!Array.isArray(gs) || gs.length !== 2) throw new Error('an answer needs exactly 2 graders');
    for (const g of gs) for (const k of ['correctness', 'on_topic', 'delivery']) if (![0, 1, 2].includes(g?.[k])) throw new Error(`a grade holds ${k}=${g?.[k]}`);
    if (gs.some((g) => g.correctness === 0)) return 'wrong';
    if (gs.every((g) => g.correctness === 2 && g.on_topic === 2)) return 'acceptable';
    return 'weak';
}
/** The instrument's own verdictOf also calls on_topic 0 "wrong"; reported beside the literal count, never used for a bar. */
export const wrongAlt = (gs) => gs.some((g) => g.correctness === 0 || g.on_topic === 0);
export const verdictTable = (grades, ids) => Object.fromEntries(ARMS.map((a) => [a, Object.fromEntries(REPS.map((r) => [r, Object.fromEntries(ids.map((id) => [id, classify(grades[a][r][id])]))]))]));

const result = (id, pass, detail, extra = {}) => ({ id, pass, detail, ...extra });
const wordsOf = (e) => wordCount(e.spoken);
const medOfId = (runs, arm, id, f = wordsOf) => median(REPS.map((r) => f(runs[arm][r][id])));
const pooled = (runs, arm, ids, f) => median(REPS.flatMap((r) => ids.map((id) => f(runs[arm][r][id]))));

// ---------------------------------------------------------------- Q1-Q3 quality
export function barsQuality(grades, ids) {
    const V = verdictTable(grades, ids);
    const acc = (a, r) => ids.filter((id) => V[a][r][id] === 'acceptable').length;
    const accC = REPS.map((r) => acc('C', r)), accT = REPS.map((r) => acc('T', r));
    const q1 = Math.max(...accT) >= Math.min(...accC) && mean(accT) >= mean(accC) - TOL.Q1_MEAN_SLACK;
    const wrongIn = (a, id) => REPS.some((r) => V[a][r][id] === 'wrong');
    const newWrong = ids.filter((id) => wrongIn('T', id) && !wrongIn('C', id));
    const totWrong = (a) => REPS.reduce((n, r) => n + ids.filter((id) => V[a][r][id] === 'wrong').length, 0);
    const q2 = newWrong.length === 0 && totWrong('T') <= totWrong('C');
    const drops = ids.filter((id) => REPS.every((r) => V.C[r][id] === 'acceptable') && REPS.every((r) => V.T[r][id] !== 'acceptable'));
    const q3 = drops.length <= TOL.Q3_MAX;
    const altWrong = (a) => REPS.reduce((n, r) => n + ids.filter((id) => wrongAlt(grades[a][r][id])).length, 0);
    return [
        result('Q1', q1, `acceptable C [${accC}] T [${accT}] (of ${ids.length}); mean C ${mean(accC).toFixed(2)} T ${mean(accT).toFixed(2)}; need T max >= C min and mean T >= mean C - ${TOL.Q1_MEAN_SLACK}`),
        result('Q2', q2, `new wrong ids [${newWrong}]; total wrong C ${totWrong('C')} T ${totWrong('T')}; (instrument-style wrong incl. on_topic 0: C ${altWrong('C')} T ${altWrong('T')}, reported only)`),
        result('Q3', q3, `weak-drop ids (acceptable in 3/3 C, 0/3 T) [${drops}] (max ${TOL.Q3_MAX}); named SH/MP among them [${drops.filter((i) => SH.includes(i) || MP.includes(i))}]`),
    ];
}

// ---------------------------------------------------------------- L1 length, L2 thinking, L3 TTFT
export function barsLength(runs, ids) {
    const NS = ids.filter((id) => !NOCUE_IDS.includes(id));
    const over = NS.filter((id) => medOfId(runs, 'T', id) > TOL.L1A_PER_ID * medOfId(runs, 'C', id));
    const pc = pooled(runs, 'C', NS, wordsOf), pt = pooled(runs, 'T', NS, wordsOf);
    const l1a = over.length <= TOL.L1A_MAX_OVER && pt <= TOL.L1A_POOLED * pc;
    const mpC = pooled(runs, 'C', MP, wordsOf), mpT = pooled(runs, 'T', MP, wordsOf);
    const short = MP.filter((id) => medOfId(runs, 'T', id) < TOL.L1B_PER_ID * medOfId(runs, 'C', id));
    const l1b = mpT >= TOL.L1B_POOLED * mpC && short.length === 0;
    return [
        result('L1a', l1a, `NS ids over ${TOL.L1A_PER_ID}x [${over}] (max ${TOL.L1A_MAX_OVER}); pooled NS median C ${pc} T ${pt} (T <= ${TOL.L1A_POOLED} x C = ${(TOL.L1A_POOLED * pc).toFixed(1)})`),
        result('L1b', l1b, `pooled MP median C ${mpC} T ${mpT} (T >= ${TOL.L1B_POOLED} x C = ${(TOL.L1B_POOLED * mpC).toFixed(1)}); MP ids with T median < ${TOL.L1B_PER_ID} x C [${short}]`),
    ];
}
export function barsThinking(runs, ids) {
    const th = (e) => e.thoughts;
    const missing = ARMS.flatMap((a) => REPS.flatMap((r) => ids.filter((id) => typeof runs[a][r][id].thoughts !== 'number')));
    if (missing.length) return [result('L2', false, `thoughtsTokenCount missing on ${missing.length} answers: the bar cannot be read`)];
    const med = (a, set) => pooled(runs, a, set, th);
    const repMeds = (a) => REPS.map((r) => median(ids.map((id) => th(runs[a][r][id]))));
    const tol = Math.max(TOL.L2_FLOOR, spread(repMeds('C')));
    const nc = ids.filter((id) => NOCUE_IDS.includes(id)), cu = ids.filter((id) => !NOCUE_IDS.includes(id));
    return [result('L2', med('T', ids) <= med('C', ids) + tol, `pooled median thoughts C ${med('C', ids)} T ${med('T', ids)} (tolerance ${tol}; C rep medians [${repMeds('C')}]); no-cue C ${med('C', nc)} T ${med('T', nc)}; cue C ${med('C', cu)} T ${med('T', cu)} (subsets reported only)`)];
}
export function barsTtft(runs, ids) {
    const tf = (e) => e.ttft;
    const bad = ARMS.flatMap((a) => REPS.flatMap((r) => ids.filter((id) => typeof runs[a][r][id].ttft !== 'number')));
    if (bad.length) return [result('L3', false, `ttft missing on ${bad.length} answers: the bar cannot be read`)];
    const all = (a) => REPS.flatMap((r) => ids.map((id) => tf(runs[a][r][id])));
    const repP50 = (a) => REPS.map((r) => median(ids.map((id) => tf(runs[a][r][id]))));
    const tol = Math.max(TOL.L3_FLOOR_MS, spread(repP50('C')));
    const cp = median(all('C')), tp = median(all('T'));
    return [result('L3', tp <= cp + tol, `pooled TTFT p50 C ${cp} T ${tp} ms (tolerance ${tol}; C rep p50s [${repP50('C')}]); p90 C ${pctile(all('C'), 0.9)} T ${pctile(all('T'), 0.9)} (reported)`)];
}

// ---------------------------------------------------------------- S1, S2 short answers
export const firstWords = (spoken, n = FIRST_WORDS) => (String(spoken).trim().match(/\S+/g) || []).slice(0, n).join(' ').toLowerCase();
export const hasKey = (id, spoken) => S1_KEYS[id].test(firstWords(spoken));
export function barsShort(runs) {
    const s1 = (a) => REPS.reduce((n, r) => n + SH.filter((id) => hasKey(id, runs[a][r][id].spoken)).length, 0);
    const c1n = s1('C'), t1n = s1('T');
    const [lo, hi] = TOL.S2_WORDS;
    const inband = REPS.reduce((n, r) => n + SH1.filter((id) => { const w = wordsOf(runs.T[r][id]); return w >= lo && w <= hi; }).length, 0);
    const allOver = SH1.filter((id) => REPS.every((r) => wordsOf(runs.T[r][id]) > TOL.S2_OVER));
    const cBand = REPS.reduce((n, r) => n + SH1.filter((id) => { const w = wordsOf(runs.C[r][id]); return w >= lo && w <= hi; }).length, 0);
    return [
        result('S1', t1n >= TOL.S1_MIN && t1n >= c1n, `first-${FIRST_WORDS}-words key: C ${c1n}/${SH.length * 3}, T ${t1n}/${SH.length * 3} (need T >= ${TOL.S1_MIN} and T >= C)`),
        result('S2', inband >= TOL.S2_MIN && allOver.length === 0, `SH1 spoken words in ${lo}-${hi}: T ${inband}/${SH1.length * 3} (need >= ${TOL.S2_MIN}; C ${cBand}/${SH1.length * 3}); SH1 ids over ${TOL.S2_OVER} in all 3 T reps [${allOver}]`),
    ];
}

// ---------------------------------------------------------------- C1 cue coverage, C2 gate honoured
const cueLines = (e) => Math.min(3, (e.cues ?? []).length);   // 3 = P.CUE_MAX_LINES (displayed cap)
export function barsCues(runs, ids, sentinel = '__CUES__') {
    const metPerRep = (a) => REPS.map((r) => MP.filter((id) => cueLines(runs[a][r][id]) >= C1_REQUIRED[id]).length);
    const mc = metPerRep('C'), mt = metPerRep('T');
    const c1 = mean(mt) >= mean(mc) - TOL.C1_SLACK;
    const hasBlock = (e) => (e.cues ?? []).length > 0 || String(e.raw ?? '').includes(sentinel);
    const nc = ids.filter((id) => NOCUE_IDS.includes(id)), cu = ids.filter((id) => !NOCUE_IDS.includes(id));
    const leaks = REPS.map((r) => nc.filter((id) => hasBlock(runs.T[r][id])));
    const present = REPS.map((r) => cu.filter((id) => (runs.T[r][id].cues ?? []).length > 0).length);
    const need = Math.ceil(TOL.C2_CUE_FRACTION * cu.length);
    const c2 = leaks.every((l) => l.length === 0) && present.every((p) => p >= need);
    return [
        result('C1', c1, `MP ids meeting the frozen cue-line count per rep (of ${MP.length}): C [${mc}] T [${mt}]; mean T ${mean(mt).toFixed(2)} >= mean C ${mean(mc).toFixed(2)} - ${TOL.C1_SLACK}`),
        result('C2', c2, `no-cue ids with a cue block in T, per rep [${leaks.map((l) => l.length)}] (need 0 of ${nc.length}); cue ids with a block in T [${present}] of ${cu.length} (need >= ${need})`),
    ];
}

export function allBars(runs, grades, ids) {
    return [...barsQuality(grades, ids), ...barsLength(runs, ids), ...barsThinking(runs, ids), ...barsTtft(runs, ids), ...barsShort(runs), ...barsCues(runs, ids)];
}
