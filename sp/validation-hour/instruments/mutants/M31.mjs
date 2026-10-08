#!/usr/bin/env node
// h40d-twins.mjs <run-dir> [--cue <family>] [--control <family>] [--strict] [--notext-gated] [--pre-cue | --answers-only] [--dist <checkout>]
//
// Rule 3c of PREREGISTER-h40d.r4.md (the cue twins against the no-cue twins on the hour's own captured bytes): the
// adapter around the bench's calibrated pure function `benchDecide` (SP\cuebench\cuebench-score.mjs, r4 section 7.4).
// Per rep r = 1, 2, 3 of each family it reads, in <run-dir>:
//   interview60.answers.<family>[-r2|-r3].json   holes (transientError), empty prose, the raw `cues`, thoughts, ttft
//   interview60.judge.<family>[-r2|-r3].json     the merged verdicts
// Defaults: cue = gemini-3.5-flash-lite_captured-high, control = gemini-3.5-flash-lite_captured-no-cues-high.
// Prints ids, counts, lengths, stage names, finish reasons and token / ms numbers only: never an answer, a raw text,
// a prompt or a grader reason (an error message carries none either).
//
// What it counts (r4 rule 3c, "Counting per rep", "Counting rulings"):
//   acceptable / wrong   the judge's verdict, checked against verdictOf (MAIN's interview60.judge.mjs): wrong =
//                        correctness 0 or on_topic 0. A stored verdict that is not verdictOf of its own scores, a graded
//                        answer that differs from the answers file's, a graded id the answers file did not answer, an
//                        id-set that differs between files: REFUSED (the files do not belong together).
//   true hole            a record with transientError: not acceptable, not wrong, out of the cue check's n. More than 3 in
//                        a rep (either side) = INCOMPLETE.
//   empty prose          no transientError and an empty `spoken`. It counts WRONG on either side (the bench's rule). The
//                        stage that emptied it is read by replaying the stored raw text through the shipped chain (the
//                        build in --dist, default the worktree's dist, composed as interview60.answers.mjs composes it, fed
//                        one character at a time; the first stage whose output is empty names it):
//                          filterCodeFences emptied it  -> a pipeline event (a fenced answer): all-ids line only
//                          rawLen 0                     -> a no-text record: all-ids line only, named with its finish
//                                                          reason, an absent block in the cue check (the user's
//                                                          alternative, r4 section 12 item 6, `--notext-gated`: ALSO in
//                                                          the gated clause, on either side, on a gated id)
//                          any other stage, cues present-> a BLOCK-ONLY TWIN: counts in the gated clause
//                          any other stage, no cues     -> all-ids line only (r4 names no gated clause for it; it can exist
//                                                          without cue mode, so it is not cue-attributable)
//   gated clause         the ids outside R02F R04F R09F R11F R13F (the five follow-ups that arrive without their parent).
//                        DEFAULT: the cue reps' TOTAL gated wrong <= the no-cue reps' total + 1 (the controller's margin of
//                        one). STRICT alternative (the user's, `--strict` makes it govern): no cue rep with more gated wrong
//                        than the worst no-cue rep. Both are printed every time. benchDecide's own per-rep wrong clause is
//                        replaced for this hour: it is fed wrong 0 / 0 so it cannot fire, and gets the band and the cue
//                        check only.
//   all-ids wrong        printed beside, never gated.
//   cue check            the RAW block (the recorded `cues`) present and shaped (blockShape: 1..3 lines, none empty, none
//                        with "?" or "you") on at least 90% of the rep's ids net of true holes; over-3-line and over-5-word
//                        rates are reported, not gated. Limits and rule are the registered 3 x 5 / CUE_RULE 8e15e4e7dd41,
//                        read from the build in --dist and refused if they differ.
// Modes: default = the h40d reading (refused if the cue and the control family are the same one). --pre-cue marks the cue check NOT APPLICABLE and says so on the reading line (for
// pre-cue hours h40b / h40c only: refused if the cue family carries a single cue block, and a line carrying the mark is
// not a verdict). --answers-only reads no verdicts (and skips a family with no files): holes, empty prose, the cue check,
// thoughts and ttft only, reading NOT COMPUTED.
// Exit: 0 PASS (or NOT COMPUTED), 1 STOP (a cue-attributable FAIL), 2 REFUSED / usage, 3 INCOMPLETE, 4 instrument error.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { benchDecide, blockShape } from '../../../cuebench/cuebench-score.mjs';

// MAIN and the worktree are built at run time: the folder name holds two u-umlauts (U+00FC), made here with
// String.fromCharCode so that neither a non-ASCII literal nor an escape sequence sits in a source another tool may re-encode.
const UE = String.fromCharCode(0xfc);
const MAIN = path.join(os.homedir(), 'OneDrive', `Masa${UE}st${UE}`, 'natively-cluely-ai-assistant');
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');

// r4 rule 3b / 3c: the five follow-ups that arrive without their parent on every hour of this roster. Sourced from r4 and
// checked against holdout40.questions.mjs (all five are level 'followup'; the other 40 of the 45 are the gated items).
export const GATED_EXCLUDED = ['R02F', 'R04F', 'R09F', 'R11F', 'R13F'];
// Pinned by r4: the cue block's limits and rule as the bench read them from the build, and the filter hash r4 section 2
// records for the combined build (compared and printed, never a refusal: a different value is explained before arming).
export const REGISTERED = { maxLines: 3, maxWords: 5, ruleSha12: '8e15e4e7dd41', filterSha16: '42d9bc42dbd17870' };
// r4 section 2 (the arms: captured-high{,-r2,-r3} the cue twins, captured-no-cues-high{,-r2,-r3} the no-cue twins) on the front model.
export const DEFAULT_FAMILIES = { cue: 'gemini-3.5-flash-lite_captured-high', control: 'gemini-3.5-flash-lite_captured-no-cues-high' };
export const MAX_HOLES = 3;     // r4 3c: a rep with more than 3 true holes makes 3c INCOMPLETE
export const GATE_MARGIN = 1;   // r4 3c, the controller's default: cue total gated wrong <= control total + 1
export const STAGES = ['stripCueBlock', 'filterCodeFences', 'filterVerbalLines', 'stripSuggestionBlock', 'stripSpokenNotation'];

export class Refusal extends Error {}
const refuse = (msg) => { throw new Refusal(msg); };

let verdictOf;
try { ({ verdictOf } = await import(pathToFileURL(path.join(MAIN, 'electron', 'test', 'golden', 'interview60.judge.mjs')).href)); }
catch (e) { console.error(`REFUSED: cannot import verdictOf from MAIN's interview60.judge.mjs (${e.code ?? e.name})`); process.exit(2); }

// The registered percentile: the element at index min(n-1, floor(n*p)) of the ascending list.
const pct = (a, p) => { const z = [...a].sort((x, y) => x - y); return z.length ? z[Math.min(z.length - 1, Math.floor(z.length * p))] : null; };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const rate = (x, n) => `${x}/${n} (${n ? ((100 * x) / n).toFixed(1) : '0.0'}%)`;
const slash = (a) => a.join(' / ');
const baseName = (f) => path.basename(f);

// ---------------------------------------------------------------------------------------------------- the chain
export function loadChain(root = WT) {
    const req = createRequire(path.join(root, 'package.json'));
    const filterFile = path.join(root, 'dist-electron', 'electron', 'llm', 'verbalStreamFilter.js');
    const promptsFile = path.join(root, 'dist-electron', 'electron', 'llm', 'prompts.js');
    for (const f of [filterFile, promptsFile]) if (!fs.existsSync(f)) refuse(`${f} does not exist: --dist must name a checkout with a built dist-electron`);
    const F = req(filterFile);
    const P = req(promptsFile);
    const lacking = STAGES.filter((n) => typeof F[n] !== 'function');
    if (lacking.length) refuse(`the filter chain in ${root} has no ${lacking.join(', ')}: it is not the cue build (a pre-cue dist cannot name the stage that emptied a record)`);
    if (P.CUE_MAX_LINES !== REGISTERED.maxLines || P.CUE_MAX_WORDS !== REGISTERED.maxWords) refuse(`the build in ${root} has cue limits ${P.CUE_MAX_LINES} x ${P.CUE_MAX_WORDS}; r4 registers ${REGISTERED.maxLines} x ${REGISTERED.maxWords}`);
    const ruleSha12 = typeof P.CUE_RULE === 'string' ? crypto.createHash('sha256').update(P.CUE_RULE).digest('hex').slice(0, 12) : null;
    if (ruleSha12 !== REGISTERED.ruleSha12) refuse(`the build in ${root} has CUE_RULE sha256/12 ${ruleSha12}; r4 registers ${REGISTERED.ruleSha12}`);
    const filterSha16 = crypto.createHash('sha256').update(fs.readFileSync(filterFile)).digest('hex').slice(0, 16);
    return { root, F, filterSha16, ruleSha12 };
}

async function* chars(raw) { for (const ch of raw) yield ch; }
async function drain(gen) { let s = ''; for await (const p of gen) s += p; return s; }

/** The first stage of the shipped chain whose output on `raw` is empty (null: the chain leaves words), and the cue
 *  block stripCueBlock handed out on that replay. Each depth is the real nesting of interview60.answers.mjs
 *  (stripCueBlock innermost), fed one character at a time as the answers pass feeds it. */
export async function emptyingStage(chain, raw) {
    const { F } = chain;
    // The filters console.warn a fixed line when they suppress a fence or meet a leading offers block; a replay is not
    // the app, so those lines are muted here (they carry no text, but they would read as the app's own warnings).
    const warn = console.warn;
    console.warn = () => {};
    try {
        for (let k = 1; k <= STAGES.length; k++) {
            let cues = [];
            let g = F.stripCueBlock(chars(raw), (c) => { cues = c; });
            if (k >= 2) g = F.filterCodeFences(g);
            if (k >= 3) g = F.filterVerbalLines(g);
            if (k >= 4) g = F.stripSuggestionBlock(g, () => {});
            if (k >= 5) g = F.stripSpokenNotation(g);
            if ((await drain(g)).trim() === '') return { stage: STAGES[k - 1], cues };
        }
        return { stage: null, cues: [] };
    } finally { console.warn = warn; }
}

// --------------------------------------------------------------------------------------------------- the files
const fileFor = (kind, family, rep) => `interview60.${kind}.${family}${rep === 1 ? '' : `-r${rep}`}.json`;

function readJson(file) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch (e) { refuse(`${baseName(file)}: cannot be read (${e.code ?? 'error'})`); }
    try { return JSON.parse(text); } catch { refuse(`${baseName(file)}: not valid JSON (${text.length} characters)`); }
}
export function readStore(file) {
    const store = readJson(file);
    if (!store || typeof store !== 'object' || Array.isArray(store)) refuse(`${baseName(file)}: not an object keyed by id`);
    for (const [k, v] of Object.entries(store)) if (!v || typeof v !== 'object' || v.id !== k) refuse(`${baseName(file)}: the entry keyed ${k} does not carry that id`);
    return store;
}
export function readJudge(file) {
    const j = readJson(file);
    if (!j || typeof j !== 'object' || !j.items || typeof j.items !== 'object') refuse(`${baseName(file)}: no items object`);
    for (const [k, v] of Object.entries(j.items)) if (!v || typeof v !== 'object' || v.id !== k) refuse(`${baseName(file)}: the judge item keyed ${k} does not carry that id (a twin judge file has one item per id)`);
    return j;
}
/** A family's three reps from <dir>: a rep whose file is absent has store / judge null (named by analyze). */
export function loadFamily(dir, family, needJudge) {
    return {
        family,
        reps: [1, 2, 3].map((rep) => {
            const afile = path.join(dir, fileFor('answers', family, rep));
            const jfile = path.join(dir, fileFor('judge', family, rep));
            return { rep, afile, jfile, store: fs.existsSync(afile) ? readStore(afile) : null, judge: needJudge && fs.existsSync(jfile) ? readJudge(jfile) : null };
        }),
    };
}

// ------------------------------------------------------------------------------------------- one rep, one side
async function classifyEmpty(chain, r, excluded, notextGated) {
    const rawLen = Number.isFinite(r.rawLen) ? r.rawLen : typeof r.raw === 'string' ? r.raw.length : null;
    if (rawLen === null) refuse(`${r.id}: empty prose and neither rawLen nor raw on the record: a no-text record cannot be told from a filtered answer`);
    // r4 3c: a no-text record is out of the gated clause on either side (the controller's default); r4 section 12 item 6's
    // alternative, --notext-gated, counts it in the clause on either side (on a gated id).
    if (rawLen === 0) return { id: r.id, kind: 'no-text', stage: null, finish: r.finish ?? null, gated: notextGated && !excluded.has(r.id) };
    if (typeof r.raw !== 'string') refuse(`${r.id}: rawLen ${rawLen} but no raw text on the record: the stage that emptied it cannot be named`);
    const { stage, cues } = await emptyingStage(chain, r.raw);
    if (stage === null) refuse(`${r.id}: the stored prose is empty but the chain loaded from ${chain.root} leaves words of its raw text: that is not the build that flew (--dist)`);
    if (Array.isArray(r.cues) && JSON.stringify(cues) !== JSON.stringify(r.cues.map(String))) refuse(`${r.id}: the cue block replayed through the chain loaded from ${chain.root} differs from the recorded cues: that is not the build that flew (--dist)`);
    const present = blockShape(r.cues, REGISTERED.maxLines, REGISTERED.maxWords).present;
    if (stage === 'filterCodeFences') return { id: r.id, kind: 'pipeline', stage, finish: r.finish ?? null, gated: false };
    if (present) return { id: r.id, kind: 'block-only', stage, finish: r.finish ?? null, gated: !excluded.has(r.id) };
    return { id: r.id, kind: 'other', stage, finish: r.finish ?? null, gated: false };
}

const EMPTY_LABEL = {
    pipeline: (e) => `PIPELINE EVENT: emptied by ${e.stage} (a fenced answer, dropped by design, cues or not); all-ids line only, never the gated clause`,
    'block-only': (e) => `BLOCK-ONLY TWIN: a cue block with no prose under it, emptied by ${e.stage}; ${e.gated ? 'counts in the gated clause' : 'on an excluded follow-up: all-ids line only'}`,
    'no-text': (e) => `NO-TEXT RECORD: rawLen 0, finish ${String(e.finish ?? 'none').slice(0, 40)}; counts wrong in the all-ids line, an absent block in the cue check, ${e.gated ? 'IN the gated clause (--notext-gated, the r4 section 12 item 6 alternative)' : 'in no gated clause'}, not a hole`,
    other: (e) => `EMPTY PROSE, NO CUE BLOCK: emptied by ${e.stage}; all-ids line only (r4 names no gated clause for it; it can exist without cue mode)`,
};

/** mode: 'cue-hour' | 'pre-cue' | 'answers-only'; side: 'cue' | 'control'. Returns the rep's counts. */
export async function summarizeRep({ chain, side, rep, file, store, judge, mode, excluded, notextGated = false }) {
    const base = baseName(file);
    const recs = Object.values(store);
    const holes = recs.filter((r) => r.transientError).map((r) => ({ id: r.id, error: String(r.transientError).slice(0, 40) }));   // capped: a provider string is printed, never trusted to be short
    const live = recs.filter((r) => !r.transientError);                 // the cue check's n: net of true holes
    const answered = live.filter((r) => r.spoken);
    const empties = [];
    for (const r of live.filter((x) => !x.spoken)) empties.push(await classifyEmpty(chain, r, excluded, notextGated));
    const gated = (id) => !excluded.has(id);

    if (side === 'cue' && mode === 'cue-hour') {
        const bare = live.filter((r) => !Array.isArray(r.cues)).map((r) => r.id);
        if (bare.length) refuse(`${base}: ${bare.length} record(s) carry no cues array (${bare.slice(0, 5).join(' ')}${bare.length > 5 ? ' ...' : ''}): a cue-hour answers file records cues on every record; for a pre-cue hour use --pre-cue`);
    }
    if (side === 'cue' && mode === 'pre-cue') {
        const carrying = live.filter((r) => blockShape(r.cues, REGISTERED.maxLines, REGISTERED.maxWords).present).map((r) => r.id);
        if (carrying.length) refuse(`${base}: --pre-cue, but ${carrying.length} record(s) carry a cue block (${carrying.slice(0, 5).join(' ')}${carrying.length > 5 ? ' ...' : ''}): this is a cue hour, run it without --pre-cue`);
    }

    // verdicts (full and pre-cue modes)
    const verdicts = new Map();
    const unjudged = [];
    if (mode !== 'answers-only') {
        const jbase = judge.file ? baseName(judge.file) : `the judge file of ${base}`;
        const answeredIds = new Set(answered.map((r) => r.id));
        for (const r of answered) {
            const it = judge.items[r.id];
            if (!it) { unjudged.push(r.id); continue; }
            if (it.answer !== r.spoken) refuse(`${jbase}: the graded answer of ${r.id} differs from the answers file's: the judge file was merged from another answers file`);
            if (it.verdict === 'error') { unjudged.push(r.id); continue; }
            if (!['acceptable', 'weak', 'wrong'].includes(it.verdict) || verdictOf(it) !== it.verdict) refuse(`${jbase}: ${r.id} carries verdict ${JSON.stringify(it.verdict)}, but verdictOf(${it.correctness}, ${it.on_topic}, ${it.delivery}) is ${JSON.stringify(verdictOf(it))}`);
            verdicts.set(r.id, it.verdict);
        }
        const stray = Object.keys(judge.items).filter((id) => !answeredIds.has(id));
        if (stray.length) refuse(`${jbase}: graded id(s) ${stray.join(' ')} that the answers file did not answer`);
    }
    const countV = (v, onlyGated) => [...verdicts].filter(([id, x]) => x === v && (!onlyGated || gated(id))).length;
    const emptyWrongAll = empties.length;
    const emptyWrongGated = empties.filter((e) => (e.kind === 'block-only' || e.kind === 'no-text') && e.gated).length;
    const shapes = live.map((r) => blockShape(r.cues, REGISTERED.maxLines, REGISTERED.maxWords));
    const ok = (v) => Number.isFinite(v);
    const th = answered.filter((r) => ok(r.thoughts) && ok(r.ttft)).map((r) => r.thoughts);   // as h40d-thoughts-noise.mjs reads them
    const tt = answered.map((r) => r.ttft).filter(ok);
    return {
        side, rep, file, ids: recs.map((r) => r.id), n: recs.length, gatedN: recs.filter((r) => gated(r.id)).length,
        answered: answered.length, holes, empties, unjudged,
        acceptable: countV('acceptable'), weak: countV('weak'),
        verdictWrongAll: countV('wrong'), verdictWrongGated: countV('wrong', true),
        emptyWrongAll, emptyWrongGated,
        wrongAll: countV('wrong') + emptyWrongAll, wrongGated: countV('wrong', true) + emptyWrongGated,
        cue: {
            n: live.length, present: shapes.filter((s) => s.present).length, shape: shapes.filter((s) => s.shape).length,
            over3: shapes.filter((s) => s.lines > REGISTERED.maxLines).length,
            over5Blocks: shapes.filter((s) => s.longLines > 0).length, over5Lines: sum(shapes.map((s) => s.longLines)), allLines: sum(shapes.map((s) => s.lines)),
            noField: live.filter((r) => !Array.isArray(r.cues)).length,
        },
        thoughts: { n: th.length, p50: pct(th, 0.5), p90: pct(th, 0.9) },
        ttft: { n: tt.length, p50: pct(tt, 0.5), p90: pct(tt, 0.9) },
    };
}

function repLines(s, mode) {
    const l = [];
    l.push(`  rep ${s.rep}  ${baseName(s.file)}`);
    l.push(`    ids ${s.n} (gated ${s.gatedN}): answered ${s.answered}, true holes ${s.holes.length}, empty prose ${s.empties.length}`);
    if (s.holes.length) l.push(`      true holes: ${s.holes.map((h) => `${h.id} (${h.error})`).join(', ')}`);
    for (const e of s.empties) l.push(`      empty prose: ${e.id}  ${EMPTY_LABEL[e.kind](e)}`);
    if (s.unjudged.length) l.push(`      answered but not graded: ${s.unjudged.join(' ')}`);
    if (mode === 'answers-only') l.push(`    verdicts not read; empty-prose wrong: gated ${s.emptyWrongGated}, all ids ${s.emptyWrongAll}`);
    else l.push(`    acceptable ${s.acceptable} (weak ${s.weak}); wrong: gated ${s.wrongGated}, all ids ${s.wrongAll}  [verdict-wrong ${s.verdictWrongGated} gated / ${s.verdictWrongAll} all, plus empty prose ${s.emptyWrongGated} gated / ${s.emptyWrongAll} all]`);
    if (s.side === 'cue') {
        const c = s.cue;
        if (mode === 'pre-cue') l.push('    cue check: NOT APPLICABLE (--pre-cue: no cue mode on this hour, nothing was read)');
        else l.push(`    cue check (net of true holes, n ${c.n}): blocks present ${rate(c.present, c.n)}, shaped ${rate(c.shape, c.n)}; over 3 lines ${rate(c.over3, c.n)}; over 5 words: blocks ${rate(c.over5Blocks, c.n)}, lines ${rate(c.over5Lines, c.allLines)}${mode === 'answers-only' && c.noField ? `; records with no cues field ${c.noField}` : ''}`);
    } else if (s.cue.present) l.push(`    control records that carry a cue block: ${s.cue.present} of ${s.cue.n} (reported; a no-cue twin should carry none)`);
    l.push(`    thoughts p50 ${s.thoughts.p50} p90 ${s.thoughts.p90} (n ${s.thoughts.n}); ttft p50 ${s.ttft.p50} p90 ${s.ttft.p90} ms (n ${s.ttft.n})`);
    return l;
}

// ----------------------------------------------------------------------------------------------- the reading
/** cue / control: { family, reps: [{ rep, afile, jfile, store|null, judge|null }] } (loadFamily's shape; a case runner
 *  may hand in modified in-memory stores). Returns { lines, reading, exit, ... }. */
export async function analyze({ chain, cue, control, preCue = false, answersOnly = false, strict = false, notextGated = false, gatedExcluded = GATED_EXCLUDED }) {
    if (preCue && answersOnly) refuse('--pre-cue and --answers-only are exclusive');
    const mode = preCue ? 'pre-cue' : answersOnly ? 'answers-only' : 'cue-hour';
    // a family set against itself can only read clean; allowed for the calibration modes, refused for the h40d reading
    if (mode === 'cue-hour' && cue.family === control.family) refuse(`the cue and the control family are both ${cue.family}: a family set against itself reads clean whatever it holds`);
    const excluded = new Set(gatedExcluded);
    const L = [];
    const out = (s = '') => L.push(s);

    const missing = [];
    for (const [name, fam] of [['cue', cue], ['control', control]]) for (const r of fam.reps) {
        if (!r.store) missing.push(`${name} rep ${r.rep} answers (${baseName(r.afile)})`);
        else if (mode !== 'answers-only' && !r.judge) missing.push(`${name} rep ${r.rep} judge (${baseName(r.jfile)})`);
    }

    const sum3 = { cue: [], control: [] };
    for (const [name, fam] of [['cue', cue], ['control', control]]) {
        for (const r of fam.reps) {
            if (!r.store) continue;
            if (mode !== 'answers-only' && !r.judge) continue;
            const judge = r.judge ? { ...r.judge, file: r.jfile } : null;
            sum3[name].push(await summarizeRep({ chain, side: name, rep: r.rep, file: r.afile, store: r.store, judge, mode, excluded, notextGated }));
        }
    }

    // the same id set in every file: a rep that stopped early cannot be set against a complete one
    const all = [...sum3.cue, ...sum3.control];
    if (all.length) {
        const ref = new Set(all[0].ids);
        for (const s of all.slice(1)) {
            const have = new Set(s.ids);
            const extra = s.ids.filter((id) => !ref.has(id)), lacking = all[0].ids.filter((id) => !have.has(id));
            if (extra.length || lacking.length) refuse(`${baseName(s.file)} holds a different id set from ${baseName(all[0].file)}: extra [${extra.join(' ')}], lacking [${lacking.join(' ')}] (an arm that stopped early cannot be compared with a complete one)`);
        }
    }

    out(`chain: ${chain.root}`);
    out(`  verbalStreamFilter.js sha256/16 ${chain.filterSha16} (r4 section 2's combined build: ${REGISTERED.filterSha16} -> ${chain.filterSha16 === REGISTERED.filterSha16 ? 'MATCH' : 'DIFFERENT: explain before relying on a stage name'}); cue limits ${REGISTERED.maxLines} x ${REGISTERED.maxWords}, CUE_RULE sha256/12 ${chain.ruleSha12}`);
    out(`mode: ${mode === 'cue-hour' ? 'h40d reading (the cue check is read)' : mode === 'pre-cue' ? 'PRE-CUE KNOWN CASE: the cue check is NOT APPLICABLE and is not read; the reading line is not a verdict' : 'ANSWERS-ONLY: no verdicts read'}`);
    out(`gated ids: every id but ${[...excluded].join(' ')} (r4 rule 3b); wrong clause governing: ${strict ? 'STRICT per-rep alternative (--strict)' : 'DEFAULT sums with a margin of one'}; no-text records: ${notextGated ? 'IN the gated clause on either side (--notext-gated)' : 'out of the gated clause on either side (the default)'}`);
    out(`cue twins (${cue.family})`);
    if (!sum3.cue.length) out(mode === 'answers-only' ? '  no answers files in this folder: skipped' : '  none read');
    for (const s of sum3.cue) for (const x of repLines(s, mode)) out(x);
    out(`no-cue twins (control) (${control.family})`);
    if (!sum3.control.length) out(mode === 'answers-only' ? '  no answers files in this folder: skipped' : '  none read');
    for (const s of sum3.control) for (const x of repLines(s, mode)) out(x);

    if (mode === 'answers-only' && missing.length) out(`answers files absent (skipped): ${missing.join('; ')}`);
    const graders = new Map();
    for (const fam of [cue, control]) for (const r of fam.reps) if (r.judge) { const k = `${r.judge.graderModel ?? r.judge.model ?? 'n/a'} / prompt stamp ${r.judge.graderPrompt ?? 'n/a'}`; graders.set(k, (graders.get(k) ?? 0) + 1); }
    if (mode !== 'answers-only') out(`graders over the judge files (model / stamp: files): ${[...graders].map(([k, n]) => `${k}: ${n}`).join('; ') || 'none'}${false ? '   <-- GRADER MIXED: a cue-against-no-cue band read across graders is confounded; decide under r4 section 6 (GRADER DRIFT)' : ''}`);

    const three = (side) => sum3[side].length === 3;
    const incomplete = [];
    const result = { sum3, missing, mode };
    if (mode !== 'answers-only' && missing.length) incomplete.push(`files missing: ${missing.join('; ')}`);
    const holey = [...sum3.cue.map((s) => ['cue', s]), ...sum3.control.map((s) => ['control', s])].filter(([, s]) => s.holes.length > MAX_HOLES).map(([side, s]) => `${side} rep ${s.rep} (${s.holes.length})`);
    if (holey.length) incomplete.push(`more than ${MAX_HOLES} true holes: ${holey.join(', ')}`);
    const ungraded = [...sum3.cue, ...sum3.control].filter((s) => s.unjudged.length).map((s) => `${s.side} rep ${s.rep} [${s.unjudged.join(' ')}]`);
    if (ungraded.length) incomplete.push(`answered ids with no graded verdict: ${ungraded.join('; ')}`);

    out('');
    let decision = null, stops = [];
    if (mode === 'answers-only') {
        // benchDecide's own cue rule on the raw blocks, with a trivial band and wrong 0 / 0 so only the cue check can speak
        if (three('cue')) {
            const d = benchDecide(sum3.cue.map((s) => ({ rep: s.rep, control: { acc: 0, wrong: 0 }, cue: { acc: 0, wrong: 0, n: s.cue.n, present: s.cue.present, shape: s.cue.shape, ttftP90: s.ttft.p90 }, controlTtftP90: null })));
            out(`cue check (benchDecide's own rule, 90% of n in every cue rep): ${d.cueFails.length ? `FAILS in rep(s) ${d.cueFails.join(', ')}` : 'holds in every cue rep'}`);
            result.cueFails = d.cueFails;
        } else out('cue check: benchDecide needs three cue reps; not applied');
        out(`empty-prose wrong, all reps (verdict-wrongs not read): cue gated ${sum(sum3.cue.map((s) => s.emptyWrongGated))} / all ${sum(sum3.cue.map((s) => s.emptyWrongAll))}; control gated ${sum(sum3.control.map((s) => s.emptyWrongGated))} / all ${sum(sum3.control.map((s) => s.emptyWrongAll))}`);
        out('rule 3c reading: NOT COMPUTED  [--answers-only: no verdicts were read]');
        result.reading = 'NOT COMPUTED'; result.exit = 0;
        return { lines: L, ...result };
    }

    if (three('cue') && three('control') && !ungraded.length) {
        const c = sum3.cue, k = sum3.control;
        const reps = [0, 1, 2].map((i) => ({
            rep: i + 1,
            control: { acc: k[i].acceptable, wrong: 0 },
            cue: preCue
                ? { acc: c[i].acceptable, wrong: 0, n: c[i].cue.n, present: c[i].cue.n, shape: c[i].cue.n, ttftP90: c[i].ttft.p90 }
                : { acc: c[i].acceptable, wrong: 0, n: c[i].cue.n, present: c[i].cue.present, shape: c[i].cue.shape, ttftP90: c[i].ttft.p90 },
            controlTtftP90: k[i].ttft.p90,
        }));
        decision = benchDecide(reps);   // band + cue check only: wrong is fed 0 / 0 (the gated clause is this adapter's)
        const b = decision.band;
        out(`band (all ids, acceptable per rep): control [${b.control.join(', ')}] (reps ${slash(k.map((s) => s.acceptable))})  cue [${b.cue.join(', ')}] (reps ${slash(c.map((s) => s.acceptable))})  -> ${b.cue[1] >= b.control[0] ? `OVERLAP (cue max ${b.cue[1]} >= control min ${b.control[0]})` : `ENTIRELY BELOW (cue max ${b.cue[1]} < control min ${b.control[0]})`}`);
        const cg = c.map((s) => s.wrongGated), kg = k.map((s) => s.wrongGated);
        const defStop = sum(cg) > sum(kg) + GATE_MARGIN;
        const worst = Math.max(...kg);
        const strictReps = c.filter((s, i) => cg[i] > worst).map((s) => s.rep);
        out(`wrong on the gated ids, DEFAULT (totals over the three reps, margin ${GATE_MARGIN}): cue ${sum(cg)} (${slash(cg)}) vs control ${sum(kg)} (${slash(kg)}) + ${GATE_MARGIN} -> ${defStop ? `STOP (${sum(cg)} > ${sum(kg) + GATE_MARGIN})` : 'no stop'}`);
        out(`wrong on the gated ids, STRICT alternative (per rep): worst control rep ${worst}; cue rep(s) above it: ${strictReps.length ? strictReps.join(', ') : 'none'} -> ${strictReps.length ? 'STOP' : 'no stop'}`);
        out(`wrong on all ids, printed beside (never gated): control ${slash(k.map((s) => s.wrongAll))}, cue ${slash(c.map((s) => s.wrongAll))}`);
        if (preCue) out('cue check: NOT APPLICABLE (--pre-cue); benchDecide was fed present = shaped = n so only the band can stop it');
        else out(`cue check (blocks present AND shaped on >= 90% of n, every cue rep, net of true holes): present ${slash(c.map((s) => rate(s.cue.present, s.cue.n)))}; shaped ${slash(c.map((s) => rate(s.cue.shape, s.cue.n)))} -> ${decision.cueFails.length ? `FAILS in rep(s) ${decision.cueFails.join(', ')}` : 'holds in every cue rep'}`);
        for (const r of decision.reasons) stops.push(r);
        if (strict ? strictReps.length : defStop) stops.push(strict ? `wrong (strict): cue rep(s) ${strictReps.join(',')} have more gated wrong than the worst control rep's ${worst}` : `wrong (default): cue gated wrong total ${sum(cg)} exceeds the control's ${sum(kg)} + ${GATE_MARGIN}`);
        Object.assign(result, { band: b, defaultClause: { cue: cg, control: kg, stop: defStop }, strictClause: { worst, reps: strictReps }, cueFails: decision.cueFails });
    }

    const mark = preCue ? '  [PRE-CUE KNOWN CASE: the cue check is NOT APPLICABLE and was not read; this line is not a verdict]' : '';
    let reading;
    if (incomplete.length) {
        reading = `INCOMPLETE (${incomplete.join('; ')})`;
        if (stops.length) out(`NOTE: on the ids answered a clause already reads STOP (${stops.join('; ')}); r4 section 5 item 1 reads a cue-attributable FAIL in any hour, so read this beside the INCOMPLETE`);
        result.exit = 3;
    } else if (stops.length) {
        reading = `STOP (cue-attributable FAIL: ${stops.join('; ')})`;
        result.exit = 1;
    } else { reading = 'PASS'; result.exit = 0; }
    out(`rule 3c reading: ${reading}${mark}`);
    result.reading = reading.split(' ')[0]; result.stops = stops; result.incomplete = incomplete;
    return { lines: L, ...result };
}

// --------------------------------------------------------------------------------------------------------- CLI
const FLAGS = new Set(['--cue', '--control', '--strict', '--notext-gated', '--pre-cue', '--answers-only', '--dist']);
async function main() {
    const argv = process.argv.slice(2);
    const usage = 'usage: h40d-twins.mjs <run-dir> [--cue <family>] [--control <family>] [--strict] [--notext-gated] [--pre-cue | --answers-only] [--dist <checkout>]';
    // process.exitCode, not process.exit(): a long report written to a pipe must drain before the process ends.
    try {
        const dir = argv[0];
        if (!dir || dir.startsWith('--')) { console.error(usage); process.exitCode = 2; return; }
        const unknown = argv.filter((a, i) => a.startsWith('--') && !FLAGS.has(a));
        if (unknown.length) refuse(`unknown option ${unknown.join(' ')}; ${usage}`);
        const opt = (k, d) => { const i = argv.indexOf(k); if (i < 0) return d; if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) refuse(`${k} needs a value`); return argv[i + 1]; };
        if (!fs.existsSync(dir)) refuse(`${dir} does not exist`);
        const answersOnly = argv.includes('--answers-only');
        const chain = loadChain(path.resolve(opt('--dist', WT)));
        const cue = loadFamily(dir, opt('--cue', DEFAULT_FAMILIES.cue), !answersOnly);
        const control = loadFamily(dir, opt('--control', DEFAULT_FAMILIES.control), !answersOnly);
        console.log(`h40d-twins: run ${path.basename(path.resolve(dir))}`);
        const res = await analyze({ chain, cue, control, preCue: argv.includes('--pre-cue'), answersOnly, strict: argv.includes('--strict'), notextGated: argv.includes('--notext-gated') });
        console.log(res.lines.join('\n'));
        process.exitCode = res.exit;
    } catch (e) {
        if (e instanceof Refusal) { console.error(`REFUSED: ${e.message}`); process.exitCode = 2; return; }
        console.error(`INSTRUMENT ERROR: ${e?.stack ?? e}`);
        process.exitCode = 4;
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
