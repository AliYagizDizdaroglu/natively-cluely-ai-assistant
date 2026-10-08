// E\eq-twins.mjs: the twins adapter of flight eq (registration 7.b6 on A2.2/A2.7, A3.3 (rule 4c, the user's +1 margin), A3.4 (order, 2c condition),
// A4.4 (-b substitution)). Post-hour instrument (A2.5): its sha, its cal file's sha and its review go to E\instruments.sha256.txt BEFORE it touches the hour.
//
// What it does, on the G sitting's answer files (G_twin ids; front = 3.5-lite HIGH, 5 reps; back = 3.1-lite LOW, 3 reps):
//   --build-blind  writes the BLIND grading files (pairs.blind-1/2 = front split by whole items, pairs.blind-3 = back) into --out and the KEY files into
//                  --keys (E\R-keyhold). Seed `blind:flight-eq:<id>`; questionForGrader = the follow-up WITH its parent; keys carry a sha12 of every graded
//                  answer, so a later change of an answer file is refused, not silently graded against another text.
//   --eval         reads both graders' verdicts per blind file + the answer files and prints rules 3a, 4b, 4c, 2b, 2c, 2d as formulas, with per-item rows.
//
//   node eq-twins.mjs --build-blind --run <run-dir> --g <ids> [--answers <dir>] [--inapp-pairs <file>] [--out E\blind] [--keys E\R-keyhold]
//   node eq-twins.mjs --eval        --g <ids> [--answers <dir>] [--blind E\blind] [--keys E\R-keyhold] [--sitting E\gsitting.log]
//
// Prints ids, counts and hashes ONLY: never a question, an answer or a prompt.
// Exit: 0 computed (the clause words are in the lines) | 2 usage, refusal or integrity failure (named) | 3 INCOMPLETE input (a verdicts file missing) | 4 crash.
//
// Rulings made while building (named in E\b6-b8-build-report.md):
//  R1 a "hole" = a record with transientError, or no record for the id in an existing file. A missing FILE is a refusal, never a hole.
//  R2 (controller ruling I1, fix round 2026-10-06) incomplete PAIRS are counted per REP (A3.4 m5): a front rep with >= 2 incomplete pairs of its |G_twin| makes 3a INCOMPLETE,
//     and ONLY 3a (registration section 4 counting rulings). 4b, 4c and 2b-2d are always computed on the pairs that exist; a FAIL is printed, never hidden. A back-leg
//     hole only removes its pair; zero back pairs makes 4b INCOMPLETE only if the front did not already FAIL (B1).
//  R3 empty prose without transientError = consensus WRONG (correctness 0) but NOT off-topic: it was never graded, so its on_topic is not 0 (M2); ttft = its ttft ?? total, words 0.
//  R4 `thoughts` null/missing on either side excludes that pair from 2b only. Coverage < 90 % of complete front pairs => the TTFT fallback (2b FAIL iff the 2c median TTFT > +1000 ms)
//     BUT only when 2c gates; with 2c ungated 2b is undecided = INCOMPLETE (I2, section 5 item 3); the registration's own cal sentence "3 nulls of 20 -> excluded" contradicts its
//     90 % rule (17/20 = 85 %): the RULE wins, 3 of 20 reads fallback.
//  R5 medians and p90 are element min(n-1, floor(n*p)) of the ascending list (the replay's `pct`), so the replay's numbers reproduce.
//  R6 wrong = the judge's verdict 'wrong' (correctness 0 OR on_topic 0) on BOTH graders; acceptable = 'acceptable' on both; off-topic = on_topic <= 1 on both
//     (registration section 2 + counting rulings; the replay's "both correctness 0" is the older, narrower definition).
//  R7 a pair with a hole on either side leaves the decision, and its graded partner is not sent to a grader either (named).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MODELS = { front: 'gemini-3.5-flash-lite', back: 'gemini-3.1-flash-lite' };
export const REPS = { front: 5, back: 3 };
export const BASE_TAG = { front: { blk: 'captured-g-high', nob: 'captured-no-block-high' }, back: { blk: 'captured-g-low', nob: 'captured-no-block-low' } };
export const ARMS = ['blk', 'nob'];
export const SEED = (id) => `blind:flight-eq:${id}`;
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const E_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITTING_GAP_MS = 15 * 60 * 1000;                                   // A3.4: a front rep's two steps start <= 15 min apart

const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
export const fileSha12 = (f) => sha12(fs.readFileSync(f));
/** The tag of one step: rep 1 carries no suffix (`captured-g-high`), rep k > 1 `-rk`; a hole re-run adds `-b` (A3.4 m5: `...-rk-b`). */
export const tagOf = (leg, arm, rep, b = false) => `${BASE_TAG[leg][arm]}${rep > 1 ? `-r${rep}` : ''}${b ? (rep > 1 ? '-b' : '-r1-b') : ''}`;
export const answerFile = (dir, leg, tag) => path.join(dir, `interview60.answers.${MODELS[leg]}_${tag}.json`);

/** Element min(n-1, floor(n*p)) of the ascending list (the replay's pct). */
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const SCORE = (v) => v && [v.correctness, v.on_topic, v.delivery].every((x) => [0, 1, 2].includes(x));
/** interview60.judge.mjs verdictOf, copied (the cal compares it with the judge's over all 27 score triples). */
export const verdictOf = ({ correctness, on_topic, delivery }) => (correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak');
export const EMPTY = { correctness: 0, on_topic: 2, delivery: 0 };      // never graded: wrong (correctness 0), not off-topic (M2)
const isWrong = (s) => verdictOf(s.g1) === 'wrong' && verdictOf(s.g2) === 'wrong';
const isAcc = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';
const isOff = (s) => s.g1.on_topic <= 1 && s.g2.on_topic <= 1;
export const symbol = (s) => (isWrong(s) ? 'X' : isAcc(s) ? 'Y' : isOff(s) ? 'o' : 'w');   // X consensus wrong, Y acceptable, o off-topic, w otherwise
const sgn = (n) => (n >= 0 ? '+' : '') + n;

// ── blind builder ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** What a stored answer record is: 'ok' | 'empty' (no transientError, no prose: R3) | 'hole' (R1). */
export const classify = (rec) => (!rec || rec.transientError ? 'hole' : !rec.spoken ? 'empty' : 'ok');

/**
 * Resolves the 16 answer files of the G sitting under `dir`: per (leg, arm, rep) the original tag, and the `-b` tag when a hole re-run exists. A `-b` pair
 * REPLACES that rep's pair on both sides (A4.4 m11): one side's `-b` file without the other's is a refusal (never mixed). `fileOf(leg, tag)` is the seam.
 * Returns { steps: {`${leg}|${arm}|${rep}`: {tag, file, b}}, substituted: ['front r3', ...] }; throws on a missing file or a one-sided -b.
 */
export function resolveSteps(fileOf, existsFn = fs.existsSync) {
    const steps = {}, substituted = [];
    for (const leg of ['front', 'back']) for (let rep = 1; rep <= REPS[leg]; rep++) {
        const cand = Object.fromEntries(ARMS.map((arm) => [arm, [tagOf(leg, arm, rep, true), ...(rep === 1 ? [`${BASE_TAG[leg][arm]}-b`] : [])].filter((t) => existsFn(fileOf(leg, t)))]));
        for (const arm of ARMS) if (cand[arm].length > 1) throw new Error(`${leg} rep ${rep} ${arm}: two -b files exist (${cand[arm].join(', ')}): which one is the re-run?`);
        const hasB = ARMS.filter((a) => cand[a].length === 1);
        if (hasB.length === 1) throw new Error(`${leg} rep ${rep}: only the ${hasB[0]} side has a -b file; the -b pair replaces BOTH sides, never mixed (A4.4 m11)`);
        for (const arm of ARMS) {
            const tag = hasB.length === 2 ? cand[arm][0] : tagOf(leg, arm, rep);
            const file = fileOf(leg, tag);
            if (!existsFn(file)) throw new Error(`${leg} rep ${rep} ${arm}: the answer file for tag ${tag} does not exist (${path.basename(file)}): an instrument failure, not a hole`);
            steps[`${leg}|${arm}|${rep}`] = { tag, file, b: hasB.length === 2, origTag: tagOf(leg, arm, rep), origFile: fileOf(leg, tagOf(leg, arm, rep)) };
            if (hasB.length === 2 && !existsFn(fileOf(leg, tagOf(leg, arm, rep)))) throw new Error(`${leg} rep ${rep} ${arm}: a -b re-run exists but the original answer file does not`);
        }
        if (hasB.length === 2) substituted.push(`${leg} r${rep}`);
    }
    return { steps, substituted };
}

/**
 * Reads the 16 stores. A `-b` re-run may only FILL holes (controller ruling B1): per id, a pair whose original has a hole on either side is replaced by the -b
 * pair; every complete original pair is kept (a -b re-run drawn over --only <G_twin> must not resample a wrong answer away); a -b rep whose original has no hole
 * is REFUSED. The unbuilt eq-gsitting re-run must use --only <G_twin> (M3) or the holes' ids; both work here.
 */
export function loadStores(steps, readJson, ids, keyOf = (x) => x) {
    const stores = {}, notes = [];
    for (const leg of ['front', 'back']) for (let rep = 1; rep <= REPS[leg]; rep++) {
        const sb = steps[`${leg}|blk|${rep}`], sn = steps[`${leg}|nob|${rep}`];
        if (!sb.b) { stores[`${leg}|blk|${rep}`] = readJson(sb.file); stores[`${leg}|nob|${rep}`] = readJson(sn.file); continue; }
        const ob = readJson(sb.origFile), on = readJson(sn.origFile), bb = readJson(sb.file), bn = readJson(sn.file);
        const holeIds = ids.filter((id) => classify(ob[keyOf(id)]) === 'hole' || classify(on[keyOf(id)]) === 'hole');
        if (!holeIds.length) throw new Error(`${leg} rep ${rep}: a -b re-run exists but the original rep has no hole: a -b re-run may only FILL holes, never replace a rep that holds answers (it would resample a wrong answer away)`);
        const mb = { ...ob }, mn = { ...on };
        for (const id of holeIds) { mb[keyOf(id)] = bb[keyOf(id)]; mn[keyOf(id)] = bn[keyOf(id)]; }
        stores[`${leg}|blk|${rep}`] = mb; stores[`${leg}|nob|${rep}`] = mn;
        notes.push(`${leg} r${rep}: -b fills ${holeIds.join(',')}; ${ids.length - holeIds.length} complete original pair(s) kept`);
    }
    return { stores, notes };
}

/**
 * The blind files. stores: `${leg}|${arm}|${rep}` -> { id: record }; ids: G_twin in order; questionOf/heardOf: id -> text; keyOf: id -> the record key in a store
 * (identity on the day; the calibration's replay files key by `s50m:<id>`). Front is split by whole items into 2 files (ceil(n/2), floor(n/2); <= 4 ids a file),
 * back is 1 file (<= 7 ids). Returns { files: [{ n, leg, ids, pairs, keyMap }], holes, empties, excludedPartners }.
 */
export function buildBlindFiles({ ids, stores, questionOf, heardOf, keyOf = (x) => x, judgeModel = null, rubric = null }) {
    if (ids.length < 3) throw new Error(`|G_twin| = ${ids.length} < 3: 2b-2d, 3a, 4b, 4c are INCOMPLETE (A2.4); nothing is built`);
    if (ids.length > 8) throw new Error(`|G_twin| = ${ids.length} > 8: front files would hold more than 4 ids; A2.7's split rule applies and is named by the controller`);
    if (ids.length > 7) throw new Error(`|G_twin| = ${ids.length} > 7: the back file would hold more than 7 ids`);
    const holes = [], empties = [], excluded = [];
    const perLeg = {};
    for (const leg of ['front', 'back']) {
        const perItem = {};
        for (const id of ids) {
            const entries = [];
            for (let rep = 1; rep <= REPS[leg]; rep++) {
                const rec = Object.fromEntries(ARMS.map((arm) => [arm, stores[`${leg}|${arm}|${rep}`][keyOf(id)]]));
                const cls = Object.fromEntries(ARMS.map((arm) => [arm, classify(rec[arm])]));
                for (const arm of ARMS) {
                    if (cls[arm] === 'hole') holes.push(`${leg}:${arm}r${rep}:${id}`);
                    if (cls[arm] === 'empty') empties.push(`${leg}:${arm}r${rep}:${id}`);
                }
                if (ARMS.some((a) => cls[a] === 'hole')) { for (const arm of ARMS) if (cls[arm] === 'ok') excluded.push(`${leg}:${arm}r${rep}:${id}`); continue; }   // R7
                for (const arm of ARMS) if (cls[arm] === 'ok') entries.push({ arm, rep, answer: rec[arm].spoken });
            }
            perItem[id] = shuffle(entries, rng(SEED(id)));
        }
        perLeg[leg] = perItem;
    }
    const groups = [];
    const nf = Math.ceil(ids.length / 2);
    groups.push({ leg: 'front', ids: ids.slice(0, nf) }, { leg: 'front', ids: ids.slice(nf) }, { leg: 'back', ids });
    const files = groups.map((g, i) => {
        const items = [], keyMap = {};
        for (const id of g.ids) perLeg[g.leg][id].forEach((e, j) => {
            const k = `${id}#${j + 1}`;
            items.push({ key: k, id, kind: 'spoken', level: null, topic: null, question: questionOf(id), heard: heardOf(id), source: 'answers-pass', answer: e.answer });
            keyMap[k] = { id, arm: e.arm, rep: e.rep, leg: g.leg, sha12: sha12(e.answer) };
        });
        return { n: i + 1, leg: g.leg, ids: g.ids, pairs: { model: judgeModel, rubric, items }, keyMap };
    });
    return { files, holes, empties, excluded };
}

// ── verdicts -> scores -> pairs ───────────────────────────────────────────────────────────────────────────────────────
/** A grader's verdict file against the keys it must grade (the merge's reader): null, or the first reason. */
export function verdictProblem(vv, keys) {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !keys[k]);
    if (extra.length) return `grades keys that are not in the key file: ${extra.join(', ')}`;
    for (const k of Object.keys(keys)) if (!SCORE(vv[k])) return `no valid verdict for ${k}`;
    return null;
}
/** scores[`${leg}|${id}|${arm}|${rep}`] = { g1, g2, sha12 } from per-file key maps and the two graders' verdict objects ({ n: { keyMap, g1, g2 } }). */
export function collectScores(files) {
    const scores = {};
    for (const f of files) {
        for (const g of ['g1', 'g2']) { const why = verdictProblem(f[g], f.keyMap); if (why) throw new Error(`blind-${f.n}.${g}: ${why}`); }
        for (const [k, m] of Object.entries(f.keyMap)) {
            const s = `${m.leg}|${m.id}|${m.arm}|${m.rep}`;
            if (scores[s]) throw new Error(`${s} is graded twice`);
            scores[s] = { g1: f.g1[k], g2: f.g2[k], sha12: m.sha12 };
        }
    }
    return scores;
}
/** Complete pairs per leg, holes, empties. Throws when an answered record has no grade or its text is not the graded text (the answer file changed). */
export function assemblePairs({ ids, stores, scores, keyOf = (x) => x }) {
    const out = { front: [], back: [], holes: [], empties: [], incompleteByRep: { front: {}, back: {} } };
    for (const leg of ['front', 'back']) for (const id of ids) for (let rep = 1; rep <= REPS[leg]; rep++) {
        const side = {}, bad = [];
        for (const arm of ARMS) {
            const rec = stores[`${leg}|${arm}|${rep}`][keyOf(id)], cls = classify(rec);
            if (cls === 'hole') { out.holes.push(`${leg}:${arm}r${rep}:${id}`); bad.push(arm); continue; }
            const meta = { thoughts: Number.isFinite(rec.thoughts) ? rec.thoughts : null };
            if (cls === 'empty') { out.empties.push(`${leg}:${arm}r${rep}:${id}`); side[arm] = { g1: EMPTY, g2: EMPTY, ttft: rec.ttft ?? rec.total, words: 0, ...meta }; continue; }
            side[arm] = { rec, meta };
        }
        if (bad.length) { out.incompleteByRep[leg][rep] = (out.incompleteByRep[leg][rep] ?? 0) + 1; continue; }   // R7: one incomplete PAIR (counted per rep, I1)
        for (const arm of ARMS) {
            if (!side[arm].rec) continue;
            const s = scores[`${leg}|${id}|${arm}|${rep}`];
            if (!s) throw new Error(`${leg} ${id} ${arm} r${rep}: answered but not graded (no key for it): the answer file is not the one that was built into the blind files`);
            if (s.sha12 !== sha12(side[arm].rec.spoken)) throw new Error(`${leg} ${id} ${arm} r${rep}: the answer text is not the graded text (sha12 differs): the answer file changed after the blind build`);
            side[arm] = { g1: s.g1, g2: s.g2, ttft: side[arm].rec.ttft, words: side[arm].rec.words, ...side[arm].meta };
        }
        out[leg].push({ id, rep, blk: side.blk, nob: side.nob });
    }
    return out;
}

// ── the sitting's 2c condition (A3.4) ─────────────────────────────────────────────────────────────────────────────────
/**
 * E\gsitting.log, the format eq-gsitting.ps1 writes (controller, fix round): `STEP <n> <tag> start <iso>` and `STEP <n> <tag> end <iso> exit=<code>`.
 * Returns { steps: Map tag -> {n, start, end, exit}, problems: [...] }; any line starting STEP that does not parse, a duplicate, an end line without exit=, or a
 * file with no STEP line is a PROBLEM (the CLI refuses on any: a missing or unparseable log never ungates 2c, I3).
 */
export function parseSitting(text) {
    const steps = new Map(), problems = [];
    let any = 0, lastStart = 0;
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line.startsWith('STEP')) continue;
        any++;
        const m = /^STEP\s+(\d+)\s+(\S+)\s+(start|end)\s+(\S+?)(?:\s+exit=(-?\d+))?$/.exec(line);
        if (!m) { problems.push(`STEP line ${any} does not parse`); continue; }
        const [, n, tag, kind, iso, ex] = m, t = Date.parse(iso);
        if (!Number.isFinite(t)) { problems.push(`step ${n} ${tag}: unparseable time`); continue; }
        if (kind === 'end' && ex === undefined) problems.push(`step ${n} ${tag}: the end line has no exit=<code>`);
        const s = steps.get(tag) ?? {};
        if (s[kind] != null) problems.push(`duplicate ${kind} line for ${tag}`);
        if (s.n != null && s.n !== Number(n)) problems.push(`${tag}: start and end lines carry different step numbers`);
        s.n = Number(n); s[kind] = t; if (kind === 'end' && ex !== undefined) s.exit = Number(ex);
        if (kind === 'start') { if (Number(n) <= lastStart) problems.push(`step numbers do not increase at ${tag} (${n} after ${lastStart})`); lastStart = Number(n); }
        steps.set(tag, s);
    }
    if (!any) problems.push('no STEP line at all');
    return { steps, problems };
}
/**
 * Checks the 16 effective steps against the log: every tag has a start and an end line, exit=0, end >= start, the counterbalanced order of A3.4 (front reps 1,3,5 block
 * first, reps 2,4 no-block first; back rep 1,3 block first, rep 2 no-block first; -b re-runs run back to back and are not order-checked). Returns { problems, gates, bad, why }:
 * 'problems' REFUSE (never ungate); 'bad' = the front reps whose two steps start more than 15 min apart: only those ungate 2c.
 */
export function sittingCheck(parsed, steps) {
    const problems = [...parsed.problems], bad = [];
    for (const [k, st] of Object.entries(steps)) {
        const s = parsed.steps.get(st.tag);
        if (!s || s.start == null || s.end == null) { problems.push(`${k}: no ${!s || s.start == null ? 'start' : 'end'} line for ${st.tag}`); continue; }
        if (s.exit !== 0) problems.push(`${st.tag}: exit=${s.exit} (a step must end exit=0)`);
        if (s.end < s.start) problems.push(`${st.tag}: ends before it starts`);
    }
    for (const leg of ['front', 'back']) for (let rep = 1; rep <= REPS[leg]; rep++) {
        const b = steps[`${leg}|blk|${rep}`], n = steps[`${leg}|nob|${rep}`];
        const sb = parsed.steps.get(b.tag), sn = parsed.steps.get(n.tag);
        if (!sb?.start || !sn?.start) continue;
        if (!b.b && !n.b) { const blockFirst = rep % 2 === 1; if (blockFirst ? sb.start > sn.start : sn.start > sb.start) problems.push(`${leg} r${rep}: not in the counterbalanced order (${blockFirst ? 'block' : 'no-block'} first, A3.4)`); }
        if (leg === 'front') { const gap = Math.abs(sb.start - sn.start); if (gap > SITTING_GAP_MS) bad.push(`r${rep} (${(gap / 60000).toFixed(1)} min)`); }
    }
    return { problems, gates: problems.length === 0 && bad.length === 0, bad, why: bad.length ? `rep(s) broke the 15-min condition: ${bad.join(', ')}` : 'every front rep started both steps within 15 min' };
}

// ── the rules ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * pairs: { front, back, holes, empties, incompleteByRep }; nG = |G_twin|; sitting = { gates, why } from sittingCheck (problems refuse BEFORE this is called).
 * Returns { clauses: {name: STATE}, lines: [...] }. STATE: PASS | FAIL | INCONCLUSIVE | INCOMPLETE | REPORTED(<state>). Holes gate ONLY 3a (a front rep with >= 2 incomplete
 * pairs, I1); every other clause is computed on the pairs that exist and a FAIL is never hidden behind an INCOMPLETE (B1; section 5 puts FAIL first).
 */
export function evaluate({ pairs, nG, sitting }) {
    const { front, back } = pairs;
    const n = front.length, m = back.length;
    const clauses = {}, lines = [];
    const L = (x) => lines.push(x);
    const badReps = Object.entries(pairs.incompleteByRep?.front ?? {}).filter(([, c]) => c >= 2);
    const tooFew = nG < 3 || n === 0;                       // |G_twin| < 3 (A2.4) or no complete front pair at all: nothing can be computed
    L(`EQ-TWINS |G_twin| ${nG}; front complete pairs ${n} of ${nG * REPS.front}; back complete pairs ${m} of ${nG * REPS.back}; holes ${pairs.holes.length ? pairs.holes.join(',') : 'none'}; empty prose (scored wrong, not off-topic) ${pairs.empties.length ? pairs.empties.join(',') : 'none'}`);
    if (nG < 3) L(`INCOMPLETE: |G_twin| ${nG} < 3 (every clause)`);
    if (n === 0 && nG >= 3) L('INCOMPLETE: no complete front pair (every clause)');
    if (badReps.length) L(`INCOMPLETE (3a only): front rep(s) with >= 2 incomplete pairs of ${nG}: ${badReps.map(([r, c]) => `r${r} (${c})`).join(', ')}; a -b re-run may only fill holes (A3.4 m5, ruling B1)`);
    const cnt = (set, arm, fn) => set.filter((p) => fn(p[arm])).length;
    const state = (name, st, text) => { clauses[name] = st; L(`${name}  ${text}  =>  ${st}`); };

    // 3a: gain, front. Gated by the hole threshold.
    if (tooFew) state('3a', 'INCOMPLETE', `front pairs ${n}`);
    else {
        const accB = cnt(front, 'blk', isAcc), accN = cnt(front, 'nob', isAcc), d = accB - accN;
        const pass = Math.ceil(n / 5), fail = Math.max(Math.floor(n / 20), Math.ceil(n / 21));         // ceil(0.20 n), max(floor(0.05 n), ceil(n/21)): integer forms
        const read = d >= pass ? 'PASS' : d <= fail ? 'FAIL' : 'INCONCLUSIVE';
        const body = `gain front: consensus-acceptable block ${accB} - no-block ${accN} = ${sgn(d)} on ${n} pairs (PASS >= +ceil(0.20*${n}) = +${pass}; FAIL <= +max(floor(0.05*${n}), ceil(${n}/21)) = +${fail})`;
        if (badReps.length) { clauses['3a'] = 'INCOMPLETE'; L(`3a  ${body}  =>  INCOMPLETE (would read ${read} on these pairs)`); } else state('3a', read, body);
        const mb = m ? cnt(back, 'blk', isAcc) - cnt(back, 'nob', isAcc) : null;
        L(`3a-back (reported, decides only in 4b)  back: block ${m ? cnt(back, 'blk', isAcc) : 'n/a'} - no-block ${m ? cnt(back, 'nob', isAcc) : 'n/a'} = ${mb == null ? 'n/a' : sgn(mb)} on ${m} pairs`);
    }
    // 4b: no new wrong, per leg. A front FAIL is a FAIL whatever the back leg holds.
    if (tooFew) state('4b', 'INCOMPLETE', `front pairs ${n}, back pairs ${m}`);
    else {
        const wf = [cnt(front, 'blk', isWrong), cnt(front, 'nob', isWrong)], wb = m ? [cnt(back, 'blk', isWrong), cnt(back, 'nob', isWrong)] : null;
        const okF = wf[0] <= wf[1], okB = wb ? wb[0] <= wb[1] : null;
        const st = !okF || okB === false ? 'FAIL' : okB === null ? 'INCOMPLETE' : 'PASS';
        state('4b', st, `consensus-wrong block <= no-block per leg: front ${wf[0]} <= ${wf[1]}: ${okF ? 'holds' : 'FAIL'}; back ${wb ? `${wb[0]} <= ${wb[1]}: ${okB ? 'holds' : 'FAIL'}` : 'no complete back pair: not computed'}`);
    }
    // 4c: off-topic, front, the user's +1 margin (U1)
    if (tooFew) state('4c', 'INCOMPLETE', `front pairs ${n}`);
    else {
        const ob = cnt(front, 'blk', isOff), on = cnt(front, 'nob', isOff), d = ob - on;
        state('4c', d >= 2 ? 'FAIL' : 'PASS', `consensus-off-topic front: block ${ob} - no-block ${on} = ${sgn(d)} (U1: FAIL only if >= +2; ${d === 1 ? 'a +1 is reported with its rows, not a FAIL' : 'margin not used'})`);
    }
    // 2c first (2b's fallback reads its median)
    const ttftMed = n ? pct(front.map((p) => p.blk.ttft - p.nob.ttft), 0.5) : null;
    if (tooFew) state('2c', 'INCOMPLETE', `front pairs ${n}`);
    else {
        const medSt = ttftMed <= 500 ? 'PASS' : ttftMed > 1000 ? 'FAIL' : 'INCONCLUSIVE';
        const slowB = front.filter((p) => p.blk.ttft > 10000).length, slowN = front.filter((p) => p.nob.ttft > 10000).length, allow = Math.ceil((2 * n) / 39);
        const stallSt = slowB <= slowN + allow ? 'PASS' : 'FAIL';
        const p90B = pct(front.map((p) => p.blk.ttft), 0.9), p90N = pct(front.map((p) => p.nob.ttft), 0.9);
        const p90St = p90B <= p90N + 2000 ? 'PASS' : 'INCONCLUSIVE';
        const st = medSt === 'FAIL' || stallSt === 'FAIL' ? 'FAIL' : medSt === 'INCONCLUSIVE' || p90St === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : 'PASS';
        const body = `TTFT median paired block - no-block ${sgn(ttftMed)} ms (PASS <= +500, FAIL > +1000): ${medSt}; stalls > 10 s: block ${slowB} <= no-block ${slowN} + ${allow}: ${stallSt}; p90 block ${p90B} <= no-block ${p90N} + 2000: ${p90St}`;
        if (sitting?.gates) state('2c', st, `${body} [sitting condition holds: ${sitting.why}]`);
        else { clauses['2c'] = `REPORTED(${st})`; L(`2c  ${body}  =>  REPORTED (not gated: ${sitting?.why ?? 'no sitting reading'}); would read ${st}`); }
    }
    // 2b: thinking
    if (tooFew) state('2b', 'INCOMPLETE', `front pairs ${n}`);
    else {
        const have = front.filter((p) => Number.isFinite(p.blk.thoughts) && Number.isFinite(p.nob.thoughts));
        const cov = `${have.length}/${n} pairs with a finite thoughts on both sides (${Math.round((100 * have.length) / n)} %)`;
        if (have.length * 10 >= 9 * n) {
            const med = pct(have.map((p) => p.blk.thoughts - p.nob.thoughts), 0.5);
            state('2b', med <= 150 ? 'PASS' : 'FAIL', `thinking: paired median thoughtsTokenCount block - no-block ${sgn(med)} (PASS <= +150); coverage ${cov}`);
        } else if (sitting?.gates) {
            state('2b', ttftMed > 1000 ? 'FAIL' : 'PASS', `thinking: coverage ${cov} is under 90 %: the TTFT FALLBACK decides, FAIL iff the paired median TTFT > +1000 ms (it is ${sgn(ttftMed)} ms); a sub-second model-side cost could not be read (section 9)`);
        } else {
            state('2b', 'INCOMPLETE', `thinking: coverage ${cov} is under 90 % and 2c is not gated (${sitting?.why ?? 'no sitting reading'}), so the TTFT fallback cannot decide: 2b is undecided (section 5 item 3); the ungated median TTFT is ${sgn(ttftMed)} ms`);
        }
    }
    // 2d: length
    if (tooFew) state('2d', 'INCOMPLETE', `front pairs ${n}`);
    else {
        const dw = pct(front.map((p) => p.blk.words - p.nob.words), 0.5);
        state('2d', dw <= 5 ? 'PASS' : dw > 10 ? 'FAIL' : 'INCONCLUSIVE', `length: paired median words block - no-block ${sgn(dw)} (PASS <= +5, FAIL > +10)`);
    }
    // reported, never gating
    const either = (set, arm, fn) => set.filter((p) => fn(p[arm].g1) || fn(p[arm].g2)).length;
    L(`reported: either grader, front: wrong block ${either(front, 'blk', (g) => g.correctness === 0 || g.on_topic === 0)} no-block ${either(front, 'nob', (g) => g.correctness === 0 || g.on_topic === 0)}; off-topic block ${either(front, 'blk', (g) => g.on_topic <= 1)} no-block ${either(front, 'nob', (g) => g.on_topic <= 1)}`);
    for (const [leg, set] of [['front', front], ['back', back]]) {
        L(`${leg} leg, per item (reps in order; Y both graders acceptable, X both consensus wrong, o both on_topic <= 1, w otherwise; a hole leaves its pair out):`);
        for (const id of [...new Set(set.map((p) => p.id))]) {
            const ps = set.filter((p) => p.id === id).sort((a, b) => a.rep - b.rep);
            L(`  ${id.padEnd(10)} block ${ps.map((p) => symbol(p.blk)).join('')}  no-block ${ps.map((p) => symbol(p.nob)).join('')}   acceptable block ${ps.filter((p) => isAcc(p.blk)).length} no-block ${ps.filter((p) => isAcc(p.nob)).length} of ${ps.length}`);
        }
    }
    return { clauses, lines };
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
    const argv = process.argv.slice(2);
    const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
    const usage = (why) => { console.error(`eq-twins: ${why}\nusage: node eq-twins.mjs --build-blind --run <run-dir> --g <ids> [--answers <dir>] [--inapp-pairs <file>] [--out <dir>] [--keys <dir>]\n       node eq-twins.mjs --eval --g <ids> [--answers <dir>] [--blind <dir>] [--keys <dir>] [--sitting <gsitting.log>]`); process.exit(2); };
    const known = new Set(['--build-blind', '--eval', '--run', '--g', '--answers', '--inapp-pairs', '--out', '--keys', '--blind', '--sitting']);
    argv.forEach((a, i) => { if (a.startsWith('--') && !known.has(a)) usage(`unknown option ${a}`); });
    const build = argv.includes('--build-blind'), ev = argv.includes('--eval');
    if (build === ev) usage('exactly one of --build-blind and --eval');
    const gArg = opt('--g');
    if (!gArg || gArg.startsWith('--')) usage('--g <ids> is required (G_twin, from the reader)');
    const ids = [...new Set(gArg.split(',').map((s) => s.trim()).filter(Boolean))];
    const answers = opt('--answers') ?? opt('--run');
    if (!answers) usage('--answers <dir> (or --run <dir>) names where the answer files are');
    const fileOf = (leg, tag) => answerFile(answers, leg, tag);
    let resolved;
    try { resolved = resolveSteps(fileOf); } catch (e) { console.log(`REFUSED: ${e.message}`); process.exit(2); }
    let loaded;
    try { loaded = loadStores(resolved.steps, (fl) => JSON.parse(fs.readFileSync(fl, 'utf8')), ids); } catch (e) { if (e instanceof SyntaxError) throw e; console.log(`REFUSED: ${e.message}`); process.exit(2); }
    const stores = loaded.stores;
    for (const nt of loaded.notes) console.log(`-b FILL (holes only): ${nt}`);
    const blindDir = opt('--blind') ?? opt('--out') ?? path.join(E_DIR, 'blind');
    const keysDir = opt('--keys') ?? path.join(E_DIR, 'R-keyhold');

    if (build) {
        const run = opt('--run');
        if (!run) usage('--build-blind needs --run <run-dir> (timeline for the questions)');
        if (fs.existsSync(blindDir) && fs.readdirSync(blindDir).some((f) => /^verdicts\./.test(f))) { console.log(`REFUSED: ${blindDir} already holds verdicts; refusing to rebuild the keys under them`); process.exit(2); }
        const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
        const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
        const inapp = opt('--inapp-pairs') ? JSON.parse(fs.readFileSync(opt('--inapp-pairs'), 'utf8')).items : null;
        const itemOf = (id) => { const it = tl.items.find((x) => x.id === id); if (!it) throw new Error(`${id} is not in the run's timeline`); return it; };
        const questionOf = (id) => {
            const it = itemOf(id), q = J.questionForGrader(it, tl.items);
            if (it.chain && !q.includes(' [Follow-up to: ')) throw new Error(`${id}: a follow-up of ${it.chain}, but its grader question carries no parent`);
            return q;
        };
        const heardOf = (id) => inapp?.find((p) => p.id === id)?.heard ?? itemOf(id).q;
        let r;
        try { r = buildBlindFiles({ ids, stores, questionOf, heardOf, judgeModel: J.JUDGE_MODEL, rubric: J.RUBRIC }); } catch (e) { console.log(`REFUSED: ${e.message}`); process.exit(2); }
        fs.mkdirSync(blindDir, { recursive: true }); fs.mkdirSync(keysDir, { recursive: true });
        for (const f of r.files) {
            fs.writeFileSync(path.join(blindDir, `pairs.blind-${f.n}.json`), JSON.stringify(f.pairs, null, 1));
            fs.writeFileSync(path.join(keysDir, `key.blind-${f.n}.json`), JSON.stringify(f.keyMap, null, 1));
            console.log(`pairs.blind-${f.n}.json  ${f.leg}  ${f.pairs.items.length} answers  ${f.ids.join(',')}  sha12 ${fileSha12(path.join(blindDir, `pairs.blind-${f.n}.json`))}`);
        }
        console.log(`${r.files.length} files (2 front + 1 back); heard from ${inapp ? 'the in-app pairs file' : 'the timeline question (no --inapp-pairs)'}; not graded, pair incomplete: ${r.holes.length ? r.holes.join(', ') : 'none'}; partners of holes not sent: ${r.excluded.length ? r.excluded.join(', ') : 'none'}; empty after the filters (scored wrong): ${r.empties.length ? r.empties.join(', ') : 'none'}; instrument ${J.graderPromptVersion()}`);
        return;
    }
    // --eval
    const files = [];
    const keyIds = new Set();
    for (let n = 1; n <= 3; n++) {
        const kf = path.join(keysDir, `key.blind-${n}.json`);
        if (!fs.existsSync(kf)) { console.log(`REFUSED: ${kf} is missing`); process.exit(2); }
        const f = { n, keyMap: JSON.parse(fs.readFileSync(kf, 'utf8')) };
        for (const g of ['g1', 'g2']) {
            const vf = path.join(blindDir, `verdicts.blind-${n}.${g}.json`);
            if (!fs.existsSync(vf)) { console.log(`INCOMPLETE: ${path.basename(vf)} is missing (a verdicts file missing = section 5 item 3)`); process.exit(3); }
            f[g] = JSON.parse(fs.readFileSync(vf, 'utf8'));
        }
        for (const m of Object.values(f.keyMap)) keyIds.add(m.id);
        files.push(f);
    }
    if (keyIds.size !== ids.length || ids.some((x) => !keyIds.has(x))) { console.log(`REFUSED: --g (${ids.length} ids) is not the set of ids in the key files (${keyIds.size} ids; only in --g: ${ids.filter((x) => !keyIds.has(x)).join(',') || 'none'}; only in the keys: ${[...keyIds].filter((x) => !ids.includes(x)).join(',') || 'none'}) (I4)`); process.exit(2); }
    let pairs, scores;
    try { scores = collectScores(files); pairs = assemblePairs({ ids, stores, scores }); } catch (e) { console.log(`REFUSED: ${e.message}`); process.exit(2); }
    const sp = opt('--sitting') ?? path.join(E_DIR, 'gsitting.log');
    if (!fs.existsSync(sp)) { console.log(`REFUSED: the sitting log ${sp} does not exist (a missing log never ungates 2c, I3)`); process.exit(2); }
    const sitting = sittingCheck(parseSitting(fs.readFileSync(sp, 'utf8')), resolved.steps);
    if (sitting.problems.length) { console.log(`REFUSED: the sitting log ${sp} does not match the 16 steps (I3): ${sitting.problems.slice(0, 8).join(' | ')}${sitting.problems.length > 8 ? ` | ... ${sitting.problems.length - 8} more` : ''}`); process.exit(2); }
    const r = evaluate({ pairs, nG: ids.length, sitting });
    for (const l of r.lines) console.log(l);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((e) => { console.log(`CRASH: ${e instanceof SyntaxError ? 'a JSON file is not valid JSON (message withheld: it quotes file content)' : String(e?.message ?? e).slice(0, 200)}`); process.exit(4); });
}
