// cal-kit.mjs: known-answer calibration of the cue grader kit EXCEPT the launcher (that is cal-launch-grader-cue.mjs): lib, extract, trim, plants, export, scorer, reading rules, freeze.
// NO MODEL IS CALLED, nothing real under LAB is written (everything writes to a temp LAB), RUNS and MAIN are only read. Prints ids and counts only.
//   node cal-kit.mjs [--quiet]       the suite (exit 0 = every check ok)
//   node cal-kit.mjs --mutants       the suite against every mutant of the kit: each must FAIL at least one check ("a test written after the code must fail on a broken copy")
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');

export const MUTANTS = [
    { id: 'lib-derive-ignores-C0', file: 'lib.mjs', from: "if (L.some((l) => l.C === 0) || L.every((l) => l.R === 0)) return 'wrong';", to: "if (L.every((l) => l.R === 0)) return 'wrong';" },
    { id: 'lib-derive-good-needs-no-K', file: 'lib.mjs', from: 'v.V === 2 && v.K >= 1 &&', to: 'v.V === 2 &&' },
    { id: 'lib-hash-real-tag-allowed-missing', file: 'lib.mjs', from: "if (real) return `${path.basename(shaFile)} is missing", to: "if (false) return `${path.basename(shaFile)} is missing" },
    { id: 'lib-hash-mismatch-allowed', file: 'lib.mjs', from: 'if (want !== got) return', to: 'if (false) return' },
    { id: 'lib-shape-words-6', file: 'lib.mjs', from: 'export const CUE_MAX_LINES = 3, CUE_MAX_WORDS = 5;', to: 'export const CUE_MAX_LINES = 3, CUE_MAX_WORDS = 6;' },
    { id: 'lib-validator-line-count', file: 'lib.mjs', from: 's.lines.length !== n) return', to: 'false) return' },
    { id: 'lib-pairs-extra-field-allowed', file: 'lib.mjs', from: "if (Object.keys(it).sort().join() !== [...PAIR_FIELDS].sort().join()) return", to: 'if (false) return' },
    { id: 'extract-join-live-not-pipeline', file: 'extract.mjs', from: "if (e.shown === 'pipeline') for (const c of cur.cues)", to: "if (e.shown !== 'pipeline') for (const c of cur.cues)" },
    { id: 'extract-window-check-off', file: 'extract.mjs', from: 'if (timeline && wid !== pair.id)', to: 'if (false)' },
    { id: 'extract-empty-lines-kept', file: 'extract.mjs', from: "typeof l === 'string' && l.trim() !== ''", to: "typeof l === 'string'" },
    { id: 'trim-arm-block-not-trimmed', file: 'trim.mjs', from: 'const t = trim(raw, CUE_MAX_LINES, CUE_MAX_WORDS);', to: 'const t = { cues: raw };' },
    { id: 'plants-cut-rules-unchecked', file: 'plants.mjs', edits: [{ from: "must(nWords(edit.fullPhrase) >= CUE_MAX_WORDS + 1, 'the full phrase has at least 6 words (it is the over-long line trimCues cuts)');", to: '' }, { from: "must(t.cut.length === 1 && t.cut[0] === edit.fullPhrase, 'trimCues cuts exactly that one line');", to: '' }, { from: "must(changed(lines, cues).length === 1 && nWords(cues[edit.line]) === CUE_MAX_WORDS, 'the displayed line is the first 5 words');", to: '' }] },
    { id: 'export-shape-unchecked', file: 'export.mjs', from: 'if (f.length && !extra.allowShapeFlags) throw', to: 'if (false) throw' },
    { id: 'export-overwrites', file: 'export.mjs', from: 'if (fs.existsSync(pairsPath) || fs.existsSync(keyFile(d, base))) throw', to: 'if (false) throw' },
    { id: 'export-cal-ignores-hash-mismatch', file: 'export.mjs', from: "const hp = hashProblem('cal-1.g1', lab); if (hp) throw new Error(`REFUSED: ${hp}`);", to: '' },
    { id: 'export-real-without-hashes', file: 'export.mjs', from: 'if (problem) throw new Error(`REFUSED: ${problem}`);', to: '' },
    { id: 'score-no-frozen-hash-check', file: 'score-cue.mjs', from: 'const hp = hashProblem(tag, lab); if (hp) throw new Error(`${tag}: REFUSED: ${hp}`);', to: '' },
    { id: 'score-record-rubric-sha-unchecked', file: 'score-cue.mjs', from: "if (info.kind === 'real') for (const [field, file]", to: "if (false) for (const [field, file]" },
    { id: 'score-thresholds-hardcoded-wrong-3', file: 'score-cue.mjs', from: 'floorN(n, T.wrongPct)', to: 'floorN(n, 3)' },
    { id: 'freeze-allows-awaiting-spec', file: 'freeze.mjs', from: 'if (/AWAITING THE USER/.test(specText)) return', to: 'if (false) return' },
    { id: 'freeze-ignores-threshold-mismatch', file: 'freeze.mjs', from: 'if (ST[k] !== T[k]) return', to: 'if (false) return' },
    { id: 'plants-placement-swap-disabled', file: 'plants.mjs', from: 'const swap = (id) => { const ms', to: 'const swap = (id) => { return; const ms' },
    { id: 'score-catch-bar-20', file: 'score-cue.mjs', from: 'catch: 22,', to: 'catch: 20,' },
    { id: 'score-wrong-bar-9', file: 'score-cue.mjs', from: 'wrong: 11,', to: 'wrong: 9,' },
    { id: 'score-agree-bar-30', file: 'score-cue.mjs', from: 'agree: 40 }', to: 'agree: 30 }' },
    { id: 'score-final-is-better-of-two', file: 'score-cue.mjs', from: 'const pick = bestOf ? (VERDICT_RANK[b1.derived] >= VERDICT_RANK[b2.derived] ? b1.derived : b2.derived) : worse(b1.derived, b2.derived);', to: 'const pick = (VERDICT_RANK[b1.derived] >= VERDICT_RANK[b2.derived] ? b1.derived : b2.derived);' },
    { id: 'score-wrong-floor-becomes-ceil', file: 'score-cue.mjs', from: 'export const floorN = (n, pct) => Math.floor((pct * n) / 100);', to: 'export const floorN = (n, pct) => Math.ceil((pct * n) / 100);' },
    { id: 'score-adds-error-threshold-3', file: 'score-cue.mjs', from: 'adds >= T.addsMin ||', to: 'adds >= T.addsMin + 1 ||' },
    { id: 'score-explainer-always-g2', file: 'score-cue.mjs', from: 'const explainer = b1.derived === final ? b1.v : b2.v;', to: 'const explainer = b2.v;' },
    { id: 'score-record-memory-unchecked', file: 'score-cue.mjs', from: "if (rec.memory !== 'ABSENT') return `memory ${rec.memory}`;", to: '' },
    { id: 'score-record-pairs-binding-unchecked', file: 'score-cue.mjs', from: "if (rec.pairsSha12 !== pairsSha) return 'the pairs file is not the one graded';", to: '' },
    { id: 'freeze-without-user-confirmation', file: 'freeze.mjs', from: 'if (!confirmed) return', to: 'if (false) return' },
    { id: 'freeze-rewrites-hash', file: 'freeze.mjs', from: "if (fs.existsSync(f)) return `${path.basename(f)} already exists", to: "if (false) return `${path.basename(f)} already exists" },
];

if (argv.includes('--mutants')) {
    let caught = 0; const lines = [];
    for (const m of MUTANTS) {
        const T = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-kit-mut-'));
        for (const f of fs.readdirSync(HERE)) if (/\.(mjs|md|txt|json)$/.test(f) && !f.includes('.mut-')) fs.copyFileSync(path.join(HERE, f), path.join(T, f));
        fs.mkdirSync(path.join(T, 'plants'), { recursive: true }); fs.copyFileSync(path.join(HERE, 'plants', 'plants.author.json'), path.join(T, 'plants', 'plants.author.json'));
        let src = fs.readFileSync(path.join(T, m.file), 'utf8'), bad = null;
        for (const ed of m.edits ?? [{ from: m.from, to: m.to }]) { const n = src.split(ed.from).length - 1; if (n !== 1) { bad = `anchor occurs ${n} times (must be 1)`; break; } src = src.replace(ed.from, () => ed.to); }
        if (bad) { lines.push(`ERROR ${m.id}: ${bad}`); continue; }
        fs.writeFileSync(path.join(T, m.file), src);
        const r = spawnSync(process.execPath, [path.join(T, 'cal-kit.mjs'), '--quiet'], { encoding: 'utf8', timeout: 900000, cwd: process.cwd() });
        const failed = (r.stdout.match(/^FAIL /gm) ?? []).length, crashed = r.status !== 0 && failed === 0;
        const ok = r.status !== 0;
        if (ok) caught++;
        lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${m.id}  (${failed} check(s) failed${crashed ? ', crashed' : ''})`);
        fs.rmSync(T, { recursive: true, force: true });
    }
    console.log(lines.join('\n')); console.log(`MUTANTS ${caught}/${MUTANTS.length} caught`);
    process.exit(caught === MUTANTS.length ? 0 : 1);
}

const results = [];
const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); if (!QUIET || !cond) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
const guard = async (name, fn) => { try { await fn(); } catch (e) { ck(`${name}: no exception`, false, String(e.message).slice(0, 160)); } };

const U = (f) => import(pathToFileURL(path.join(HERE, f)).href);
const lib = await U('lib.mjs'), ext = await U('extract.mjs'), trim = await U('trim.mjs'), plants = await U('plants.mjs'), exp = await U('export.mjs'), sc = await U('score-cue.mjs'), fr = await U('freeze.mjs');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-kit-'));
const mkLab = (name) => { const d = path.join(TMP, name); fs.mkdirSync(d, { recursive: true }); for (const f of ['rubric.md', 'SPEC-cue-grader.md', 'cue-grader-dispatch.txt', 'thresholds.json']) fs.copyFileSync(path.join(HERE, f), path.join(d, f)); return d; };
const freezeAll = (d) => { fs.writeFileSync(d.rubricSha, `${lib.fileSha(d.rubric)}\n`); fs.writeFileSync(d.specSha, `${lib.fileSha(d.spec)}\n`); fs.writeFileSync(d.thresholdsSha, `${lib.fileSha(d.thresholds)}\n`); };

// ================================================================= 1. lib: the derived verdict (SPEC 1.4)
await guard('lib.derive', () => {
    const L = (R, C, G) => ({ R, C, G });
    const good = { lines: [L(2, 2, 2), L(1, 2, 1)], V: 2, K: 2 };
    ck('derive: a block with V2 K2, every R,G >= 1 and one R2G2 line is good', lib.derive(good) === 'good');
    ck('derive: K 1 still good (K >= 1)', lib.derive({ ...good, K: 1 }) === 'good');
    ck('derive: K 0 with every line C >= 1 is weak (the cue is right, the screen contradicts itself)', lib.derive({ ...good, K: 0 }) === 'weak');
    ck('derive: V 1 is weak', lib.derive({ ...good, V: 1 }) === 'weak');
    ck('derive: no line with R2 and G2 is weak', lib.derive({ lines: [L(2, 2, 1), L(1, 2, 2)], V: 2, K: 2 }) === 'weak');
    ck('derive: a line with G 0 is weak, not good', lib.derive({ lines: [L(2, 2, 2), L(2, 2, 0)], V: 2, K: 2 }) === 'weak');
    ck('derive: any line with C 0 is wrong', lib.derive({ lines: [L(2, 2, 2), L(2, 0, 2)], V: 2, K: 2 }) === 'wrong');
    ck('derive: every line R 0 is wrong', lib.derive({ lines: [L(0, 2, 2), L(0, 2, 1)], V: 2, K: 2 }) === 'wrong');
    ck('derive: ONE line with R 0 (not all) is weak', lib.derive({ lines: [L(0, 2, 2), L(2, 2, 2)], V: 2, K: 2 }) === 'weak');
    ck('worse(): wrong < weak < good', lib.worse('good', 'weak') === 'weak' && lib.worse('wrong', 'good') === 'wrong' && lib.worse('good', 'good') === 'good');
});

// ================================================================= 2. lib: the verdicts validator (SPEC 1.5)
await guard('lib.verdictFileProblem', () => {
    const V = (n) => ({ lines: Array.from({ length: n }, () => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2, D: 'na', label: 'good', note: 'ok' });
    const counts = { c01: 2, c02: 3 }, ok = { c01: V(2), c02: V(3) };
    ck('validator: a complete valid file passes', lib.verdictFileProblem(ok, counts) === null);
    ck('validator: a missing key is refused', /no verdict for c02/.test(lib.verdictFileProblem({ c01: V(2) }, counts)));
    ck('validator: a key that is not in the pairs file is refused', /not in the pairs file: c09/.test(lib.verdictFileProblem({ ...ok, c09: V(1) }, counts)));
    ck('validator: lines of a different length from the block are refused', /lines has length 3, the block has 2/.test(lib.verdictFileProblem({ c01: V(3), c02: V(3) }, counts)));
    ck('validator: a score outside 0-2 is refused (line, V, K)', [{ ...V(2), lines: [{ R: 3, C: 2, G: 2 }, { R: 2, C: 2, G: 2 }] }, { ...V(2), V: 5 }, { ...V(2), K: -1 }].every((v) => lib.verdictFileProblem({ c01: v, c02: V(3) }, counts) !== null));
    ck('validator: D and label outside their sets are refused', lib.verdictFileProblem({ c01: { ...V(2), D: 'maybe' }, c02: V(3) }, counts) !== null && lib.verdictFileProblem({ c01: { ...V(2), label: 'ok' }, c02: V(3) }, counts) !== null);
    ck('validator: a non-object file is refused', lib.verdictFileProblem([], counts) !== null && lib.verdictFileProblem(null, counts) !== null);
});

// ================================================================= 3. lib: the mechanical shape check, calibrated on known cases (SPEC 1.1)
await guard('lib.shapeFlags', () => {
    const good = ['Tabular data handling', 'Fast FastAPI deployment', 'Logistic regression baseline'];
    ck('shape: a known-good block gives 0 flags', lib.shapeFlags(good).length === 0);
    ck('shape: a money line ("$5 million budget") is not notation', lib.shapeFlags(['$5 million budget']).length === 0);
    ck('shape: a planted 4-line block gives 1 flag', lib.shapeFlags([...good, 'Fourth line here']).length === 1);
    ck('shape: a 7-word line gives 1 flag', lib.shapeFlags(['one two three four five six seven']).length === 1);
    ck('shape: a `$O(n)$` line gives 1 flag', lib.shapeFlags(['Sort in $O(n)$ time']).length === 1);
    ck('shape: a __CUES__ sentinel and an "N|" markup each give 1 flag', lib.shapeFlags(['__CUES__ x']).length === 1 && lib.shapeFlags(['1|Fit on train']).length === 1);
});

// ================================================================= 4. lib: hash states (SPEC 4.5; mutations 9 and 9b for the exporter and the scorer)
await guard('lib.hashProblem', () => {
    const lab = mkLab('hash');
    ck('hash: cal-* and rev-* are allowed while rubric.sha and spec.sha are missing', lib.hashProblem('cal-1.g1', lab) === null && lib.hashProblem('rev-2.g2', lab) === null);
    ck('hash: r1-* and h40d-* are REFUSED while the hash files are missing (9b)', ['r1-inapp.g1', 'r1-high', 'h40d-low'].every((t) => /is missing/.test(lib.hashProblem(t, lab) ?? '')));
    const d = lib.dirsOf(lab);
    fs.writeFileSync(d.rubricSha, `${lib.fileSha(d.rubric)}\n`);
    ck('hash: with only rubric.sha, a real tag is still refused (spec.sha missing)', /spec\.sha is missing/.test(lib.hashProblem('r1-low', lab) ?? ''));
    fs.writeFileSync(d.specSha, `${lib.fileSha(d.spec)}\n`);
    ck('hash: with rubric.sha and spec.sha but NO thresholds.sha a real tag is still refused (thresholds are frozen too)', /thresholds\.sha is missing/.test(lib.hashProblem('r1-low', lab) ?? ''));
    fs.writeFileSync(d.thresholdsSha, `${lib.fileSha(d.thresholds)}\n`);
    ck('hash: with all three matching, real and cal tags are allowed', lib.hashProblem('r1-low', lab) === null && lib.hashProblem('cal-3.g2', lab) === null);
    fs.appendFileSync(d.rubric, '\nedit');
    ck('hash: an edited rubric refuses EVERY tag, calibration tags included (9)', ['cal-1.g1', 'rev-1.g1', 'r1-low'].every((t) => /not the frozen rubric\.sha/.test(lib.hashProblem(t, lab) ?? '')));
    fs.copyFileSync(path.join(HERE, 'rubric.md'), d.rubric); fs.appendFileSync(d.spec, '\nedit');
    ck('hash: an edited spec refuses every tag (9)', ['cal-2.g2', 'h40d-inapp.g1'].every((t) => /not the frozen spec\.sha/.test(lib.hashProblem(t, lab) ?? '')));
    fs.copyFileSync(path.join(HERE, 'SPEC-cue-grader.md'), d.spec); fs.appendFileSync(d.thresholds, ' ');
    ck('hash: an edited thresholds.json refuses every tag (thresholds frozen with the spec)', ['cal-1.g1', 'r1-high'].every((t) => /not the frozen thresholds\.sha/.test(lib.hashProblem(t, lab) ?? '')));
    ck('hash: a name that is not a tag is refused', lib.hashProblem('blind-1.g1', lab) !== null);
});

// ================================================================= 5. tags, opaque names, the seeded shuffle
await guard('lib.tags', () => {
    ck('tags: the 22 tags parse (6 cal + 8 rev + 4 r1 + 4 h40d)', lib.ALL_TAGS.length === 22 && lib.ALL_TAGS.every((t) => lib.parseTag(t)));
    ck('tags: "blind-1.g1", "cal-4.g1", "r1-high.g1", "r1-inapp" (no grader) are not tags', ['blind-1.g1', 'cal-4.g1', 'r1-high.g1', 'r1-inapp', 'h40d-mid'].every((t) => lib.parseTag(t) === null));
    ck('tags: both graders of a file share ONE pairs file name; verdict names differ; no name carries "cal", "rev", "r1" or "h40d"', lib.pairsName('cal-1.g1') === lib.pairsName('cal-1.g2') && lib.verdictsName('cal-1.g1') !== lib.verdictsName('cal-1.g2') && lib.ALL_TAGS.every((t) => !/cal|rev|r1|h40d/.test(lib.pairsName(t) + lib.verdictsName(t) + lib.cwdName(t, 1))));
    ck('tags: opaque pairs names are distinct per file (13 files over 22 tags)', new Set(lib.ALL_TAGS.map((t) => lib.pairsName(t))).size === new Set(lib.ALL_TAGS.map((t) => lib.parseTag(t).base)).size);
    ck('shuffle: seeded = deterministic, a different seed differs, a permutation', JSON.stringify(lib.shuffled([1, 2, 3, 4, 5, 6, 7, 8], 'a')) === JSON.stringify(lib.shuffled([1, 2, 3, 4, 5, 6, 7, 8], 'a')) && JSON.stringify(lib.shuffled([1, 2, 3, 4, 5, 6, 7, 8], 'a')) !== JSON.stringify(lib.shuffled([1, 2, 3, 4, 5, 6, 7, 8], 'b')) && lib.shuffled([1, 2, 3, 4, 5, 6, 7, 8], 'a').slice().sort().join() === '1,2,3,4,5,6,7,8');
});

// ================================================================= 6. the pairs file: nothing but four fields
await guard('lib.pairsProblem', () => {
    const it = { key: 'c01', question: 'q', cues: ['a b'], answer: 'x' };
    ck('pairs: a valid file passes', lib.pairsProblem({ items: [it] }) === null);
    ck('pairs: an extra field (id, source, heard, model) is refused', ['id', 'source', 'heard', 'model'].every((f) => lib.pairsProblem({ items: [{ ...it, [f]: 'x' }] }) !== null));
    ck('pairs: a top-level field, duplicate keys, an empty cue and a non-cNN key are refused', lib.pairsProblem({ items: [it], model: 'x' }) !== null && lib.pairsProblem({ items: [it, it] }) !== null && lib.pairsProblem({ items: [{ ...it, cues: [''] }] }) !== null && lib.pairsProblem({ items: [{ ...it, key: 'RE01' }] }) !== null);
});

// ================================================================= 7. extract: the joins reproduce the measured counts (SPEC 4.1, 3.1)
let X = {};
await guard('extract', () => {
    X.r1 = ext.extractInApp('r1'); X.h40d = ext.extractInApp('h40d'); X.eq = ext.extractInApp('eq');
    const r = X.r1.report;
    ck('r1: 49 cue lines, 49 Router turns, 27 to pipeline-shown turns, 22 to live-shown, 0 unassigned', r.cueLines === 49 && r.routerTurns === 49 && r.cuesToPipelineTurns === 27 && r.cuesToLiveTurns === 22 && r.unassignedCues === 0, JSON.stringify([r.cueLines, r.routerTurns, r.cuesToPipelineTurns, r.cuesToLiveTurns, r.unassignedCues]));
    ck('r1: 26 of the 27 pipeline-shown cue lines join a judge answer exactly (26 distinct ids), 1 unjoined and listed by turn and reason', r.joined === 26 && r.distinctIds === 26 && X.r1.unjoined.length === 1 && X.r1.unjoined[0].where === 'turn 2' && /equals no judge pair answer/.test(X.r1.unjoined[0].reason), JSON.stringify(X.r1.unjoined.map((u) => u.where)));
    ck('r1: every Router segment held exactly one cue line and one full line', r.segmentsNotOneCueOneFull === 0);
    ck('r1: the play-window check ran and refused none (ids agree with the judge pairs)', r.windowChecked === true && X.r1.unjoined.every((u) => !/disagreement/.test(u.reason)));
    const h = X.h40d.report;
    ck('h40d: 47 cue lines, 46 paired, 1 unpaired; 44 match a judge pair (44 distinct ids), 3 listed', h.cueLines === 47 && h.pairedToFull === 46 && h.unpaired === 1 && h.joined === 44 && h.distinctIds === 44 && X.h40d.unjoined.length === 3, JSON.stringify([h.cueLines, h.pairedToFull, h.unpaired, h.joined, h.distinctIds, X.h40d.unjoined.length]));
    const q = X.eq.report;
    ck('eq: 42 cue lines all paired; 40 join the 40 judge pairs (40 distinct ids)', q.cueLines === 42 && q.pairedToFull === 42 && q.unpaired === 0 && q.joined === 40 && q.distinctIds === 40, JSON.stringify([q.cueLines, q.pairedToFull, q.joined]));
    const g = ext.answerGrades('eq'), acc = X.eq.blocks.filter((b) => g[b.pairKey] === 'acceptable'), wr = X.eq.blocks.filter((b) => g[b.pairKey] === 'wrong');
    ck('eq: 31 bases are acceptable (correctness 2 AND on_topic 2) and 0 are wrong (correctness 0)', acc.length === 31 && wr.length === 0, `${acc.length}/${wr.length}`);
    ck('in-app blocks have 0 shape flags (the code cap holds) and 0 empty lines', ['r1', 'h40d', 'eq'].every((k) => X[k].report.shapeFlagged === 0 && X[k].report.emptyLineDrops === 0));
    const g1 = ext.answerGrades('r1');
    ck('r1 answer grades: the two-grader rule yields a grade for all 47 judge pairs', Object.keys(g1).length === 47 && Object.values(g1).every((v) => ['acceptable', 'weak', 'wrong'].includes(v)));
});
await guard('extract.arms', () => {
    const a = ext.extractArm('r1', 'high'), b = ext.extractArm('r1', 'low'), c = ext.extractArm('h40d', 'high'), d = ext.extractArm('h40d', 'low');
    ck('arms: r1 HIGH 31 and LOW 31, h40d HIGH 33 and LOW 33, all with cues', a.blocks.length === 31 && b.blocks.length === 31 && c.blocks.length === 33 && d.blocks.length === 33);
    ck('arms: the raw over-limit blocks are r1 HIGH 3/31 and h40d HIGH 2/33 (LOW 0), and the shipped trim changes exactly those', a.report.rawOverLimit === 3 && a.report.trimChanged === 3 && c.report.rawOverLimit === 2 && c.report.trimChanged === 2 && b.report.rawOverLimit === 0 && d.report.rawOverLimit === 0, JSON.stringify([a.report.rawOverLimit, c.report.rawOverLimit]));
    ck('arms: after the trim every arm block passes the shape check, and the answer shown equals the judge pair answer', [a, b, c, d].every((x) => x.report.shapeFlagged === 0 && x.report.answerMismatch === 0));
    ck('arms: a broken trim (identity) leaves the over-limit blocks over the limit and the shape check flags them', ext.extractArm('r1', 'high', { trim: (raw) => ({ cues: raw }) }).report.shapeFlagged === 3);
    const raw = ['Fit on train only', '**', '$O(n)$ cost now', 'extra fourth line'];
    const t = trim.displayedArmBlock(raw);
    ck('trim: a line that cleans to "" is dropped and counted; the 4th line is cut; a notation line is cleaned', t.cues.length === 2 && t.emptyDropped === 1 && t.changed && t.cues[1] === 'O(n) cost now', JSON.stringify(t.cues));
});
await guard('extract.makeBlock', () => {
    const pair = { id: 'X1', key: 'X1', question: 'q', answer: 'a' };
    const b = ext.makeBlock({ run: 'r', cuesEv: { v: ['Fit on train', '', '   ', 'Second cue'], ts: 0, n: 1 }, answer: 'a', pair, turn: 1 });
    ck('block: empty-string and blank lines are DROPPED from the displayed block and counted (SPEC 1.1)', b.cues.join('|') === 'Fit on train|Second cue' && b.emptyDropped === 2 && b.loggedLines === 4 && !b.empty, JSON.stringify([b.cues, b.emptyDropped]));
    const e = ext.makeBlock({ run: 'r', cuesEv: { v: ['', ' '], ts: 0, n: 1 }, answer: 'a', pair, turn: 1 });
    ck('block: a block whose lines are all empty strings is EMPTY (mechanical verdict, never sent to a grader)', e.empty === true && e.cues.length === 0 && e.emptyDropped === 2);
    const alt = ext.makeBlock({ run: 'r', cuesEv: { v: ['a'], ts: 0, n: 1, trim: { cut: ['long line'], dropped: [], cleaned: [] } }, answer: 'a', pair });
    ck('block: a display that trimCues altered (cut/dropped/cleaned) is flagged displayAltered', alt.displayAltered === true && b.displayAltered === false);
});
await guard('extract.window', () => {
    // inject a SHIFTED timeline: every window then names the wrong id, so every in-app block must be refused (the id of the judge pair and of the play window must agree)
    const r = ext.extractInApp('r1', { timelineShift: 1 });
    ck('window: with the play windows shifted by one item, every joined block is refused as an id disagreement', r.blocks.length === 0 && r.unjoined.filter((u) => /id disagreement/.test(u.reason)).length === 26, `blocks ${r.blocks.length}`);
});
await guard('trim.versions', () => {
    const v = trim.trimVersionCheck();
    ck('trimCues: the h40d build (2b0906f), the r1 build, the eq build and MAIN\'s dist are IDENTICAL (region text and behaviour on the battery)', v.identicalText && v.identicalBehaviour && v.builds.length === 4, v.builds.map((b) => `${b.name}:${b.behaviourSha12}`).join(' '));
    const broken = trim.trimRegion(`function cleanNotation(s: string): string {\n    return s;\n}\nexport function trimCues(raw: string[], a: number, b: number) {\n    return { cues: raw.map((x) => x.toUpperCase()), rawLines: 0, dropped: [], cut: [], cleaned: [] };\n}\n`);
    ck('trimCues check can fail: a region whose behaviour differs compiles to a different function', broken && trim.compileRegion(broken)(['abc'], 3, 5).cues[0] === 'ABC' && trim.distTrimCues()(['abc'], 3, 5).cues[0] === 'abc');
});

// ================================================================= 8. plants: the 48 (SPEC 3.2)
let PL = null, SC = null;
await guard('plants', () => {
    const bases = plants.eqBases();
    ck('bases: 31 acceptable eq blocks; 7 excluded because trimCues CUT/dropped lines (cleaned-only blocks are re-admitted: 0 exist) + 4 replaced by the reviewer = 11; 20 usable', bases.acceptable.length === 31 && bases.excluded.length === 11 && bases.usable.length === 20 && bases.acceptable.filter((b) => b.displayAltered && !b.displayCut).length === 0 && plants.REPLACED_BASES.every((i) => bases.excluded.includes(i)), `${bases.acceptable.length}/${bases.excluded.length}/${bases.usable.length}`);
    const sp = plants.splitBases(bases.usable);
    ck('split: 16 shown + 4 hidden reserve, disjoint, seeded; >= 4 one-line-eligible and >= 4 many-part among the shown', sp.shown.length === 16 && sp.hidden.length === 4 && new Set([...sp.shown, ...sp.hidden]).size === 20 && sp.shown.filter((i) => plants.ONE_LINE_ELIGIBLE.includes(i)).length >= 4 && sp.shown.filter((i) => plants.MANY_PART.includes(i)).length >= 4, `seed ${sp.seedIndex}`);
    const author = lib.readJson(path.join(HERE, 'plants', 'plants.author.json'));
    PL = plants.buildPlants(author, { bases, split: sp });
    const P = PL.plants, count = (k) => P.filter((p) => p.kind === k).length;
    ck('plants: 48 = 16 good + 4 each of wrong_fact, off_question, repeats, filler, cut, contradicts, missing, halo', P.length === 48 && count('good') === 16 && plants.MUTANT_KINDS.every((k) => count(k) === 4), JSON.stringify(Object.fromEntries(plants.KINDS.map((k) => [k, count(k)]))));
    ck('plants: planted bad = 24 and must-be-wrong = 12', P.filter((p) => plants.BAD_KINDS.includes(p.kind)).length === 24 && P.filter((p) => plants.MUST_BE_WRONG.includes(p.kind)).length === 12);
    ck('plants: 3 files x 16; a base and its mutants never share a file; each base sits once in each file', [1, 2, 3].every((f) => P.filter((p) => p.file === f).length === 16) && sp.shown.every((id) => P.filter((p) => p.baseId === id).map((p) => p.file).sort().join('') === '123'));
    ck('plants: 4 one-line goods; no missing-part on a one-line base; every plant respects the display shape', P.filter((p) => p.kind === 'good' && p.form === 'one-line').length === 4 && P.filter((p) => p.kind === 'missing').every((p) => p.cues.length >= 1 && p.form !== 'one-line') && P.every((p) => lib.shapeFlags(p.cues).length === 0));
    ck('plants: an off-question donor is a SHOWN base on the same topic and its own base is never in the plant\'s file; a hidden base is never a donor', P.filter((p) => p.kind === 'off_question').every((p) => sp.shown.includes(p.edit.donor) && p.edit.donor !== p.baseId && PL.fileOf[p.edit.donor] !== p.file && p.edit.donor.slice(0, 2) === p.baseId.slice(0, 2)));
    ck('plants (K3): in every file no two blocks of DIFFERENT questions have an identical cue block, and the donor base\'s own good block is never in an off-question plant\'s file', [1, 2, 3].every((f) => { const bs = P.filter((p) => p.file === f); return bs.every((p, i) => bs.every((q, j) => i === j || p.baseId === q.baseId || JSON.stringify(p.cues) !== JSON.stringify(q.cues))); }) && P.filter((p) => p.kind === 'off_question').every((p) => !P.some((q) => q.baseId === p.edit.donor && q.kind === 'good' && q.file === p.file)));
    ck('plants: every cut plant is exactly what trimCues produces from the over-long phrase (first 5 words)', P.filter((p) => p.kind === 'cut').every((p) => trim.distTrimCues()([p.edit.fullPhrase], 3, 5).cues[0] === p.cues[p.edit.line] && lib.wordsOf(p.cues[p.edit.line]).length === 5));
    ck('plants: halo and repeats change the ANSWER (halo keeps the cues), wrong fact / filler / contradicts / cut / missing keep the answer', P.filter((p) => p.kind === 'halo').every((p) => { const g = P.find((q) => q.baseId === p.baseId && q.kind === 'good'); return JSON.stringify(p.cues) === JSON.stringify(g.cues) && p.answer !== g.answer; }) && P.filter((p) => p.kind === 'repeats').every((p) => p.answer !== P.find((q) => q.baseId === p.baseId && q.kind === 'good').answer) && P.filter((p) => ['wrong_fact', 'filler', 'contradicts', 'cut', 'missing', 'off_question'].includes(p.kind)).every((p) => p.answer === P.find((q) => q.baseId === p.baseId && q.kind === 'good').answer));
    ck('plants: a minimal pair: each wrong-fact / contradicts / repeats / cut plant differs from its base cue block in exactly one line', P.filter((p) => ['wrong_fact', 'contradicts', 'repeats', 'cut'].includes(p.kind)).every((p) => { const g = P.find((q) => q.baseId === p.baseId && q.kind === 'good'); return p.cues.length === g.cues.length && p.cues.filter((c, i) => c !== g.cues[i]).length === 1; }));
    // known-bad plans must be refused
    const bad = (mut) => { const a = JSON.parse(JSON.stringify(author)); mut(a); try { plants.buildPlants(a, { bases, split: sp }); return false; } catch { return true; } };
    ck('plants: a plan with 3 halo plants is refused', bad((a) => { a.plants.S1Q01[1] = { kind: 'wrong_fact', line: 0, text: 'Sort by token count' }; }));
    ck('plants: a plan whose cut plant is not over-long is refused', bad((a) => { a.plants.S1Q03F[1].fullPhrase = 'Lost causes leave'; }));
    ck('plants: a plan with a hidden base as off-question donor is refused (n3)', bad((a) => { a.plants.S1Q10F[1].donor = sp.hidden.find((h) => h.slice(0, 2) === 'S1'); }));
    ck('plants: a plan with an answerFind that does not occur exactly once is refused', bad((a) => { a.plants.S1Q01[1].answerFind = 'zzz not in the answer'; }));
    ck('plants: a missing-part plant on a one-line base is refused', bad((a) => { a.plants.S1Q03F[0] = { kind: 'missing', removeLine: 0 }; }));
});

// ================================================================= 9. export: blind files, keys, hash rule (SPEC 2, 4.5)
await guard('export', () => {
    const lab = mkLab('export'), d = lib.dirsOf(lab);
    fs.mkdirSync(d.plants, { recursive: true });
    lib.writeJson(path.join(d.plants, 'plants.json'), { split: PL.split, plants: PL.plants });
    const out = exp.exportCal({ lab });
    ck('export cal: 3 files x 16 blocks; the pairs folder holds only p-<hex>.json; the keys sit in keyhold', out.length === 3 && out.every((o) => o.items === 16) && fs.readdirSync(d.pairs).every((f) => /^p-[0-9a-f]{8}\.json$/.test(f)) && fs.readdirSync(d.keyhold).length === 3);
    const p = lib.readJson(path.join(d.pairs, lib.pairsName('cal-1.g1')));
    ck('export cal: every item is exactly {key, question, cues, answer}; keys c01..c16; the key file maps every key to a plant kind and a base id', lib.pairsProblem(p) === null && p.items.map((i) => i.key).join() === Array.from({ length: 16 }, (_, i) => `c${String(i + 1).padStart(2, '0')}`).join() && Object.values(lib.readJson(path.join(d.keyhold, 'key.cal-1.json')).items).every((m) => m.plantKind && m.baseId && m.expected));
    ck('export cal: the file text carries no run label, source name, base id or kind word', (() => { const s = JSON.stringify(p); return !/\b(eq|r1|h40d|inapp|bare|plant)\b/i.test(JSON.stringify(Object.keys(p))) && !PL.split.shown.some((id) => new RegExp(`"${id}"`).test(s)); })());
    ck('export cal: a second export REFUSES to overwrite', (() => { try { exp.exportCal({ lab }); return false; } catch (e) { return /never overwritten/.test(e.message); } })());
    ck('export cal: an existing hash file that does not match refuses a calibration export too (a mismatch is never tolerated)', (() => { const l9 = mkLab('export9'); fs.writeFileSync(lib.dirsOf(l9).rubricSha, 'deadbeef'); fs.mkdirSync(lib.dirsOf(l9).plants, { recursive: true }); lib.writeJson(path.join(lib.dirsOf(l9).plants, 'plants.json'), { split: PL.split, plants: PL.plants }); try { exp.exportCal({ lab: l9 }); return false; } catch (e) { return /not the frozen rubric\.sha/.test(e.message); } })());
    ck('export cal --replace works while untouched, and is REFUSED once a verdicts file exists', (() => { exp.exportCal({ lab, replace: true }); fs.mkdirSync(d.verdicts, { recursive: true }); fs.writeFileSync(path.join(d.verdicts, 'v-x.json'), '{}'); try { exp.exportCal({ lab, replace: true }); return false; } catch (e) { return /already touched/.test(e.message); } })());
    ck('export real: REFUSED while rubric.sha / spec.sha are missing (9b), naming the missing hash', (() => { try { exp.exportReal('r1', { lab }); return false; } catch (e) { return /REFUSED/.test(e.message) && /is missing/.test(e.message); } })());
    // writeBlind: a block that breaks the display shape is refused (fail early), and a block with an extra field cannot be written
    const lab2 = mkLab('export2');
    ck('export: a 4-line block is refused at the boundary (shape), nothing written', (() => { try { exp.writeBlind({ base: 'r1-low', rows: [{ question: 'q', cues: ['a', 'b', 'c', 'd'], answer: 'x', meta: {} }], run: 'r1', source: 'low', lab: lab2 }); return false; } catch (e) { return /display shape/.test(e.message) && !fs.existsSync(lib.dirsOf(lab2).pairs); } })());
    // real export in a lab with matching hashes: the joins are reproduced and the files are written
    const lab3 = mkLab('export3'), d3 = lib.dirsOf(lab3);
    freezeAll(d3);
    const r1 = exp.exportReal('r1', { lab: lab3 }), h = exp.exportReal('h40d', { lab: lab3 });
    ck('export real r1: in-app 26, HIGH 31, LOW 31 blocks; none empty', r1.summary.inapp.graded === 26 && r1.summary.high.graded === 31 && r1.summary.low.graded === 31 && r1.summary.inapp.empty === 0, JSON.stringify(r1.summary));
    // end to end: synthetic all-good verdicts for the r1 files of lab3 -> loadRealRun -> the report (row 0: h40d not run)
    {
        const goodV = (n) => ({ lines: Array.from({ length: n }, () => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2, D: 'yes', label: 'good', note: 'x' });
        for (const tag of ['r1-inapp.g1', 'r1-inapp.g2', 'r1-high', 'r1-low']) {
            const pp = path.join(d3.pairs, lib.pairsName(tag)), pairs = lib.readJson(pp), vp = path.join(d3.verdicts, lib.verdictsName(tag));
            lib.writeJson(vp, Object.fromEntries(pairs.items.map((it) => [it.key, goodV(it.cues.length)])));
            fs.appendFileSync(d3.launches, `${JSON.stringify({ slot: tag, attempt: 1, exit: 0, slugJsonl: 1, memoryDir: 'absent', launcher: 'abc', memory: 'ABSENT', tools: { Read: 3, Write: 1 }, pinned: true, pathViolations: 0, rubricSha12: lib.fileSha(d3.rubric).slice(0, 12), specSha12: lib.fileSha(d3.spec).slice(0, 12), pairsSha12: lib.sha12(fs.readFileSync(pp)), verdictsSha12: lib.sha12(fs.readFileSync(vp)) })}\n`);
        }
        // REVIEW-KIT K1: the scorer applies the frozen-hash rule before any real scoring
        {
            const keep = fs.readFileSync(d3.rubric, 'utf8');
            fs.appendFileSync(d3.rubric, 'x');
            ck('real e2e (K1): a rubric edited after the freeze makes the scorer REFUSE a real file', (() => { try { sc.loadTag('r1-high', lab3); return false; } catch (e) { return /REFUSED/.test(e.message) && /rubric/.test(e.message); } })());
            fs.writeFileSync(d3.rubric, keep);
            const keepT = fs.readFileSync(d3.thresholds, 'utf8'); fs.appendFileSync(d3.thresholds, ' ');
            ck('real e2e (K1): thresholds.json edited after the freeze makes the scorer REFUSE a real file', (() => { try { sc.loadTag('r1-high', lab3); return false; } catch (e) { return /REFUSED/.test(e.message) && /thresholds/.test(e.message); } })());
            fs.writeFileSync(d3.thresholds, keepT);
            const lf = d3.launches, rows = lib.readJsonl(lf).map((r) => (r.slot === 'r1-high' ? { ...r, rubricSha12: 'abcdefabcdef' } : r)); const keepL = fs.readFileSync(lf, 'utf8');
            fs.writeFileSync(lf, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
            ck('real e2e (K1): a launch record whose rubricSha12 is not the frozen rubric makes the scorer REFUSE', (() => { try { sc.loadTag('r1-high', lab3); return false; } catch (e) { return /graded under a different rubric/.test(e.message); } })());
            fs.writeFileSync(lf, keepL);
        }
        const run = sc.loadRealRun('r1', lab3), g = ext.answerGrades('r1');
        const grades = Object.fromEntries(Object.entries(g).map(([k, v]) => [`r1:${k}`, v]));
        const txt = sc.realReport([run], grades, {});
        ck('real e2e: r1 loads (26 in-app rows, 2 arms), nothing contested, and the report says row 0 / h40d not run / AWAITING THE USER with the build facts (27 of 49 Router turns pipeline-shown)', run.inapp.rows.length === 26 && run.inapp.rows.every((r) => r.final === 'good' && !r.contested) && run.arms.high.counts.good === 31 && run.arms.low.counts.good === 31 && /READING: row 0 No reading \(h40d not run\)/.test(txt) && /AWAITING THE USER/.test(txt) && /cue presence 27 of 49 Router turns/.test(txt), txt.split('\n').filter((l) => /READING|INFORMATIONAL/.test(l)).join(' | ').slice(0, 200));
        ck('real e2e: the report prints ids and counts only (no pairs text leaks into it)', (() => { const p = lib.readJson(path.join(d3.pairs, lib.pairsName('r1-inapp.g1'))); return p.items.every((it) => !txt.includes(it.question.slice(0, 30)) && !txt.includes(it.answer.slice(0, 30))); })());
        const vpath = path.join(d3.verdicts, lib.verdictsName('r1-low')); fs.appendFileSync(vpath, ' ');
        ck('real e2e: a verdicts file edited after its launch record is refused at load', (() => { try { sc.loadRealRun('r1', lab3); return false; } catch (e) { return /verdicts file is not the one/.test(e.message); } })());
    }
    ck('export real h40d: in-app 44, HIGH 33, LOW 33 blocks', h.summary.inapp.graded === 44 && h.summary.high.graded === 33 && h.summary.low.graded === 33, JSON.stringify(h.summary));
    const kr = lib.readJson(path.join(d3.keyhold, 'key.r1-inapp.json'));
    ck('export real: the in-app key holds ids + pair keys and the build facts; the pairs file holds none of them', Object.values(kr.items).every((m) => m.id && m.pairKey) && kr.report.cuesToPipelineTurns === 27 && kr.report.routerTurns === 49 && (() => { const s = fs.readFileSync(path.join(d3.pairs, lib.pairsName('r1-inapp.g1')), 'utf8'); return !/"RE\d\d"|"RH\d\d"/.test(s); })());
    ck('export real: one source of one run per file, at most one block per roster id', ['r1-inapp', 'r1-high', 'r1-low', 'h40d-inapp', 'h40d-high', 'h40d-low'].every((b) => { const k = lib.readJson(path.join(d3.keyhold, `key.${b}.json`)); const ids = Object.values(k.items).map((m) => m.id); return new Set(ids).size === ids.length; }));
    ck('export real: all six pairs files are mutually distinct and each only p-<hex>.json', new Set(fs.readdirSync(d3.pairs)).size === 6);
});

// ================================================================= 10. the scorer (SPEC 3.4, 4.3, 6) on synthetic verdicts
await guard('scorer', () => {
    const lab = mkLab('score'), d = lib.dirsOf(lab);
    fs.mkdirSync(d.plants, { recursive: true });
    lib.writeJson(path.join(d.plants, 'plants.json'), { split: PL.split, plants: PL.plants });
    exp.exportCal({ lab });
    // the simulated grader: writes a verdict that DERIVES to the plant's expected verdict, with the kind's characteristic scores
    const L2 = (n, f) => Array.from({ length: n }, (_, i) => f(i));
    const verdictFor = (kind, n, halo) => {
        const base = { lines: L2(n, () => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2, D: 'yes', note: 'sim' };
        const mod = { good: {}, wrong_fact: { lines: L2(n, (i) => ({ R: 2, C: i === 0 ? 0 : 2, G: 2 })) }, off_question: { lines: L2(n, () => ({ R: 0, C: 2, G: 2 })) }, repeats: { lines: L2(n, (i) => ({ R: 2, C: i === 0 ? 0 : 2, G: 2 })) }, filler: { lines: L2(n, () => ({ R: 1, C: 2, G: 0 })), V: 1 }, cut: { lines: L2(n, (i) => ({ R: 2, C: 2, G: i === 0 ? 0 : 2 })) }, contradicts: { K: 0 }, missing: { V: 1 }, halo: { K: 0 } }[kind];
        const v = { ...base, ...mod }; v.label = lib.derive(v); return v;
    };
    const writeAll = (twist = () => null, launchOver = {}) => {
        fs.rmSync(d.verdicts, { recursive: true, force: true }); fs.rmSync(d.launches, { force: true });
        for (const n of [1, 2, 3]) {
            const pairs = lib.readJson(path.join(d.pairs, lib.pairsName(`cal-${n}.g1`))), key = lib.readJson(path.join(d.keyhold, `key.cal-${n}.json`));
            for (const g of ['g1', 'g2']) {
                const vv = {}; for (const it of pairs.items) { const m = key.items[it.key]; vv[it.key] = twist(g, m, it, verdictFor(m.plantKind, it.cues.length)) ?? verdictFor(m.plantKind, it.cues.length); }
                const tag = `cal-${n}.${g}`, vp = path.join(d.verdicts, lib.verdictsName(tag)); lib.writeJson(vp, vv);
                fs.appendFileSync(d.launches, `${JSON.stringify({ slot: tag, attempt: 1, session_id: 's', model: 'claude-opus-5-5', exit: 0, slugJsonl: 1, memoryDir: 'absent', launcher: 'abc', memory: 'ABSENT', tools: { Read: 3, Write: 1 }, pinned: true, pathViolations: 0, pairsSha12: lib.sha12(fs.readFileSync(path.join(d.pairs, lib.pairsName(tag)))), verdictsSha12: lib.sha12(fs.readFileSync(vp)), ...launchOver })}\n`);
            }
        }
    };
    SC = { lab, writeAll };
    writeAll();
    const ok = sc.scoreCalibration(sc.filesFromTags('cal', 3, lab), 'cal');
    ck('scorer: an oracle grader (every plant rated as expected, labels = derived) passes EVERY calibration bar', ok.pass && ok.lines.every((l) => l.startsWith('PASS')), `${ok.lines.filter((l) => l.startsWith('PASS')).length} PASS lines`);
    const wrongAs = (kind, to, count) => { let c = 0; return (g, m, it, v) => (g === 'g1' && m.plantKind === kind && c++ < count ? { ...v, ...to(it.cues.length), label: 'good' } : null); };
    const goodV = (n) => ({ lines: L2(n, () => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2 });
    writeAll(wrongAs('wrong_fact', goodV, 3));
    const r1 = sc.scoreCalibration(sc.filesFromTags('cal', 3, lab), 'cal');
    ck('scorer: a grader that rates 3 wrong-fact plants GOOD fails the catch bar (21 < 22), the wrong bar (9 < 11), the no-blind-spot bar (1/4) and agreement', !r1.pass && r1.lines.some((l) => /FAIL.*catch/.test(l)) && r1.lines.some((l) => /FAIL.*wrong is wrong/.test(l)) && r1.lines.some((l) => /FAIL.*wrong_fact caught/.test(l)));
    writeAll(wrongAs('wrong_fact', goodV, 1));
    const r2 = sc.scoreCalibration(sc.filesFromTags('cal', 3, lab), 'cal');
    ck('scorer: ONE wrong-fact plant missed by one grader still passes every bar (catch 23 >= 22, wrong 11 >= 11, kind 3/4, agreement 47/48)', r2.lines.filter((l) => /FAIL/.test(l)).length === 0, r2.lines.filter((l) => /FAIL/.test(l)).join(' | ').slice(0, 120));
    writeAll((g, m, it, v) => (g === 'g2' && m.plantKind === 'good' ? { ...v, lines: L2(it.cues.length, (i) => ({ R: 2, C: i === 0 ? 0 : 2, G: 2 })), label: 'wrong' } : null));
    const r3 = sc.scoreCalibration(sc.filesFromTags('cal', 3, lab), 'cal');
    ck('scorer: a grader that rates all 16 good blocks WRONG fails "good rated good", "0 rated wrong" and agreement', !r3.pass && r3.lines.some((l) => /FAIL.*good rated WRONG/.test(l)) && r3.lines.some((l) => /FAIL.*agreement/.test(l)));
    writeAll((g, m, it, v) => (m.plantKind === 'halo' ? { ...v, lines: L2(it.cues.length, (i) => ({ R: 2, C: i === 0 ? 0 : 2, G: 2 })), label: 'wrong' } : null));
    ck('scorer: halo plants rated WRONG fail the halo bar (0 of 4 not wrong)', sc.scoreCalibration(sc.filesFromTags('cal', 3, lab), 'cal').lines.some((l) => /FAIL.*halo/.test(l)));
    writeAll((g, m, it, v) => ({ ...v, label: 'good' === v.label ? 'weak' : 'good' }));
    ck('scorer: labels that disagree with the derived verdict fail the label check (0 of 48)', sc.scoreCalibration(sc.filesFromTags('cal', 3, lab), 'cal').lines.some((l) => /FAIL.*label check/.test(l)));
    // the launch record must be clean
    for (const [what, over, why] of [['memory LOADED', { memory: 'LOADED' }, /memory LOADED/], ['a tool outside Read/Write/Edit', { tools: { Read: 1, Bash: 1 } }, /tools/], ['not pinned', { pinned: false }, /not pinned/], ['exit 1', { exit: 1 }, /exit 1/], ['a path violation', { pathViolations: 2 }, /pathViolations/], ['a stale pairs sha', { pairsSha12: 'zzz' }, /pairs file is not the one graded/], ['a stale verdicts sha', { verdictsSha12: 'zzz' }, /verdicts file is not the one/]]) {
        writeAll(() => null, over);
        ck(`scorer: a verdicts file whose last launch record shows ${what} is REFUSED`, (() => { try { sc.loadTag('cal-1.g1', lab); return false; } catch (e) { return why.test(e.message); } })());
    }
    writeAll();
    fs.appendFileSync(d.launches, `${JSON.stringify({ slot: 'cal-1.g1', exit: 1 })}\n`);
    ck('scorer: only the LAST record counts: a later failed attempt of the tag makes its earlier clean verdicts refused', (() => { try { sc.loadTag('cal-1.g1', lab); return false; } catch (e) { return /exit 1/.test(e.message); } })());
    ck('scorer: an invalid verdicts file (a key missing) is refused with the validator\'s reason', (() => { writeAll(); const vp = path.join(d.verdicts, lib.verdictsName('cal-1.g1')); const v = lib.readJson(vp); delete v.c01; fs.writeFileSync(vp, JSON.stringify(v)); try { sc.loadTag('cal-1.g1', lab); return false; } catch (e) { return /verdicts invalid/.test(e.message) && /no verdict for c01/.test(e.message); } })());
});

// ================================================================= 11. the reading rules (SPEC 6) on synthetic in-app sets
await guard('reading', () => {
    const G = (n) => ({ lines: Array.from({ length: n }, () => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2 });
    const mk = (n, { wrong = 0, weak = 0, flagsOf = null } = {}) => Array.from({ length: n }, (_, i) => ({ run: 'x', pairKey: `k${i}`, final: i < wrong ? 'wrong' : i < wrong + weak ? 'weak' : 'good', explainer: i < wrong + weak && flagsOf ? flagsOf : G(2) }));
    const grades = (rows, g) => Object.fromEntries(rows.map((r) => [`x:${r.pairKey}`, g]));
    const R = (rows, empties = 0, g = 'weak') => sc.reading({ rows, empties, grades: grades(rows, g) });
    const rowsOf = (n, wrong, weak) => mk(n, { wrong, weak });
    ck('reading n=70: floor(3%)=2, ceil(5%)=4, ceil(80%)=56', sc.floorN(70, 3) === 2 && sc.ceilN(70, 5) === 4 && sc.ceilN(70, 80) === 56);
    ck('reading: wrong 2 of 70 does NOT fire row 1; wrong 3 fires row 1', R(rowsOf(70, 2, 0)).row === 2 && R(rowsOf(70, 3, 0)).row === 1);
    ck('reading: 4 empties of 70 fire row 1 (empty >= ceil(5%)); 3 do not', R(rowsOf(66, 0, 0), 4).row === 1 && R(rowsOf(67, 0, 0), 3).row === 2, `${R(rowsOf(66, 0, 0), 4).n}`);
    ck('reading: adds-error 1 (a wrong cue on an acceptable answer) blocks Keep ON but is not row 1; adds-error 2 fires row 1', (() => { const rows = rowsOf(70, 1, 0); return R(rows, 0, 'acceptable').row !== 2 && R(rows, 0, 'acceptable').adds === 1 && R(rowsOf(70, 2, 0), 0, 'acceptable').row === 1; })());
    ck('reading: good 56 of 70 = Keep ON; good 55 is not', R(rowsOf(70, 0, 14)).row === 2 && R(rowsOf(70, 0, 15)).row !== 2);
    ck('reading: good 55 of 70 with no axis pattern falls to row 4 (flag off by default)', R(rowsOf(70, 0, 15)).row === 4);
    // row 3: axis attribution is deterministic; every axis at or above 50% is named in the fixed order
    const gOnly = { lines: [{ R: 2, C: 2, G: 0 }, { R: 2, C: 2, G: 1 }], V: 2, K: 2 };      // flags: G only
    const gAndV = { lines: [{ R: 2, C: 2, G: 0 }], V: 1, K: 2 };                              // flags: G, V
    const rows3 = [...mk(20, { weak: 15, flagsOf: gOnly }), ...mk(0)].map((r, i) => ({ ...r, pairKey: `a${i}` }));
    const rd3 = R(rows3);
    ck('reading row 3: 15 weak of 20, every NG flagged G only -> row 3, G named (share 100%), the other shares 0', rd3.row === 3 && rd3.namedAxes.join() === 'G' && rd3.shares.G === 1 && rd3.shares.V === 0, JSON.stringify(rd3.shares));
    const rows3b = [...mk(8, { weak: 8, flagsOf: gAndV }), ...mk(8, { weak: 8, flagsOf: gOnly })].map((r, i) => ({ ...r, pairKey: `b${i}` })).concat(mk(10).map((r, i) => ({ ...r, pairKey: `c${i}` })));
    ck('reading row 3: ties name EVERY axis at or above 50%, ordered by share then G,V,K,R,C (G 100%, V 50%)', (() => { const r = R(rows3b); return r.row === 3 && r.namedAxes.join() === 'G,V'; })());
    ck('reading row 3 needs NG >= 5: 4 not-good blocks with a 100% G pattern (good 11 of 15 < 12) fall to row 4', R(mk(15, { weak: 4, flagsOf: gOnly })).row === 4 && R(mk(15, { weak: 5, flagsOf: gOnly })).row === 3);
    ck('reading: the axis flags: G (some line G0 or no line G2), V (V<=1), K (K0), R (some R0 or no R2), C (some C<=1)', (() => { const f = sc.axisFlags; return f({ lines: [{ R: 2, C: 2, G: 2 }], V: 2, K: 2 }).length === 0 && f({ lines: [{ R: 2, C: 2, G: 1 }], V: 2, K: 2 }).join() === 'G' && f({ lines: [{ R: 2, C: 2, G: 2 }], V: 1, K: 2 }).join() === 'V' && f({ lines: [{ R: 2, C: 2, G: 2 }], V: 2, K: 0 }).join() === 'K' && f({ lines: [{ R: 0, C: 2, G: 2 }, { R: 2, C: 2, G: 2 }], V: 2, K: 2 }).join() === 'R' && f({ lines: [{ R: 2, C: 1, G: 2 }], V: 2, K: 2 }).join() === 'C'; })());
    // the final verdict and the explainer: the grader whose derived verdict IS the final; g1 on a tie
    const blk = (key, v) => ({ key, meta: { id: key, pairKey: key }, v, derived: lib.derive(v) });
    const wk = { lines: [{ R: 2, C: 2, G: 1 }], V: 2, K: 2, D: 'na', label: 'weak' }, wr = { lines: [{ R: 2, C: 0, G: 2 }], V: 2, K: 2, D: 'na', label: 'wrong' };
    const rows = sc.inAppRows([blk('a', wk), blk('b', wk), blk('c', G(1))], [blk('a', wr), blk('b', { ...wk, V: 1 }), blk('c', wk)]);
    ck('in-app final = the WORSE of the two derived verdicts; contested marks every block where they differ', rows[0].final === 'wrong' && rows[1].final === 'weak' && rows[2].final === 'weak' && rows.map((r) => r.contested).join() === 'true,false,true');
    ck('in-app explainer = the grader whose derived verdict is the final (g2 here), g1 on a tie', rows[0].explainer === wr && rows[1].explainer.V === 2 && rows[2].explainer === wk);
    ck('in-app "better of the two" (the rests-on-contested test) takes g1 wrong/g2... the better verdict', sc.inAppRows([blk('a', wk)], [blk('a', wr)], true)[0].final === 'weak');
    // reading text: row 0 when h40d did not run
    const fakeRun = (run, agree) => ({ run, arms: {}, inapp: { g1: { blocks: [] }, g2: { blocks: [] }, rows: rowsOf(26, 0, 0).map((r) => ({ ...r, run, contested: false, id: `i${r.pairKey}` })), bestRows: rowsOf(26, 0, 0).map((r) => ({ ...r, run })), empties: 0, report: { cuesToPipelineTurns: 27, routerTurns: 49, cuesToLiveTurns: 22, joined: 26, unjoined: 1, emptyLineDrops: 0 }, agreement: agree } });
    const t0 = sc.realReport([fakeRun('r1', 0.9)], {}, {});
    ck('report: with only r1 the reading is row 0 "No reading (h40d not run)", the thresholds are marked AWAITING THE USER, and the rows are INFORMATIONAL', /READING: row 0 No reading \(h40d not run\)/.test(t0) && /AWAITING THE USER/.test(t0) && /INFORMATIONAL ONLY/.test(t0));
    ck('report: an unreliable run (agreement < 75%) gives row 0 and says so', /grader unreliable on real data: r1/.test(sc.realReport([fakeRun('r1', 0.5), fakeRun('h40d', 0.9)], {}, {})));
    ck('report: confirmed thresholds drop the AWAITING banner; r1 + h40d reliable gives a pooled READING', (() => { const t = sc.realReport([fakeRun('r1', 0.9), fakeRun('h40d', 0.9)], {}, { thresholdsConfirmed: true }); return !/AWAITING THE USER/.test(t) && /READING \(pooled r1 \+ h40d/.test(t); })());
});

// ================================================================= 12. freeze (SPEC 4.5)
await guard('freeze', () => {
    const lab = mkLab('freeze'), d = lib.dirsOf(lab);
    ck('freeze (K2): the spec as it stands (thresholds AWAITING THE USER) is REFUSED even with the user\'s flag', /still says the thresholds are AWAITING THE USER/.test(fr.freezeProblem({ lab, confirmed: true }) ?? ''));
    const confirmSpec = (l, edit = (t) => t) => { const p = lib.dirsOf(l).spec; fs.writeFileSync(p, edit(fs.readFileSync(p, 'utf8').replace(/AWAITING THE USER/g, 'CONFIRMED BY THE USER'))); };
    ck('freeze (K2): a confirmed spec whose THRESHOLDS line disagrees with thresholds.json is refused', (() => { const l2 = mkLab('freeze2'); confirmSpec(l2, (t) => t.replace('goodPct=80', 'goodPct=75')); return /disagrees with thresholds\.json/.test(fr.freezeProblem({ lab: l2, confirmed: true }) ?? ''); })());
    ck('freeze (K2): a spec with no THRESHOLDS line is refused', (() => { const l2 = mkLab('freeze3'); confirmSpec(l2, (t) => t.replace(/^THRESHOLDS: .*$/m, '')); return /no "THRESHOLDS/.test(fr.freezeProblem({ lab: l2, confirmed: true }) ?? ''); })());
    ck('freeze (K2): the scorer reads its thresholds from thresholds.json (changing wrongPct there changes the reading)', (() => { const T = lib.loadThresholds(lab); const rows = Array.from({ length: 70 }, (_, i) => ({ run: 'x', pairKey: `k${i}`, final: i < 3 ? 'wrong' : 'good', explainer: { lines: [{ R: 2, C: 2, G: 2 }], V: 2, K: 2 } })); return sc.reading({ rows, empties: 0, grades: {}, T }).row === 1 && sc.reading({ rows, empties: 0, grades: {}, T: { ...T, wrongPct: 5 } }).row === 2; })());
    confirmSpec(lab);
    ck('freeze: refused without the user\'s confirmation flag (the thresholds are AWAITING THE USER)', /AWAITING THE USER/.test(fr.freezeProblem({ lab, confirmed: false }) ?? ''));
    ck('freeze: with the flag but no calibration on disk, refused (the calibration cannot be read)', /calibration cannot be read/.test(fr.freezeProblem({ lab, confirmed: true }) ?? ''));
    // a passing calibration on disk (re-using the scorer's lab) lets the freeze through; a failing one does not
    const labS = SC.lab, dS = lib.dirsOf(labS);
    confirmSpec(labS);
    SC.writeAll();
    ck('freeze: a FAILING calibration on disk is refused even with the flag', (() => { const w = (g, m, it, v) => (m.plantKind === 'good' ? { ...v, lines: v.lines.map((l) => ({ ...l, C: 0 })), label: 'wrong' } : null); SC.writeAll(w); const why = fr.freezeProblem({ lab: labS, confirmed: true }); SC.writeAll(); return /does not pass every bar/.test(why ?? ''); })());
    ck('freeze: with a passing calibration and the flag it writes rubric.sha, spec.sha and thresholds.confirmed; a second freeze is refused', (() => {
        const r = fr.freeze({ lab: labS, confirmed: true });
        return r.rubric === lib.fileSha(dS.rubric) && fs.readFileSync(dS.specSha, 'utf8').trim() === lib.fileSha(dS.spec) && fs.readFileSync(dS.thresholdsSha, 'utf8').trim() === lib.fileSha(dS.thresholds) && fs.existsSync(path.join(labS, 'thresholds.confirmed')) && /already exists/.test(fr.freezeProblem({ lab: labS, confirmed: true }) ?? '');
    })());
});

fs.rmSync(TMP, { recursive: true, force: true });
const bad = results.filter((r) => !r.ok).length;
console.log(`${bad === 0 ? 'ALL OK' : 'FAILED'}: ${results.length - bad}/${results.length} checks ok`);
process.exit(bad === 0 ? 0 : 1);
