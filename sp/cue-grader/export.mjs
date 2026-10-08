// export.mjs: the blind exporter and its key (SPEC 2, 3.3, 4.1, 4.5). Writes LAB\pairs\p-<hex>.json (the ONLY thing in that folder) and LAB\keyhold\key.<base>.json (outside pairs).
// A pairs item is exactly { key, question, cues, answer }: nothing reveals the source, model, run, id, timing or `heard`. Keys are c01.. from a seeded shuffle, one source of one run per file.
//   node export.mjs cal                 the three calibration files from LAB\plants\plants.json
//   node export.mjs rev                 the revision's four files from plants.json + plants.fresh.json (SPEC 3.4); refuses until the fresh plants are authored
//   node export.mjs real r1|h40d        the real files of a run: in-app, bare HIGH, bare LOW (refused until rubric.sha and spec.sha exist and match: SPEC 4.5)
// Prints ids and counts only. No model call. It never overwrites a pairs or key file.
import fs from 'node:fs';
import path from 'node:path';
import { LAB, dirsOf, readJsonl, readJson, writeJson, shuffled, pairsProblem, pairsName, parseTag, hashProblem, shapeFlags, sha12 } from './lib.mjs';
import { extractInApp, extractArm } from './extract.mjs';
import { trimVersionCheck } from './trim.mjs';
import { EXPECT } from './plants.mjs';

export const EXPECTED_REAL = { r1: { inapp: 26, high: 31, low: 31 }, h40d: { inapp: 44, high: 33, low: 33 } };   // the measured joins SPEC 4.1 requires the builder to reproduce

const keyFile = (d, base) => path.join(d.keyhold, `key.${base}.json`);
/** Writes one blind file + key. `rows` = [{ question, cues, answer, meta }]; meta lands in the key only. Refuses to overwrite. */
export function writeBlind({ base, rows, run, source, extra = {}, lab = LAB }) {
    const d = dirsOf(lab);
    const pairsPath = path.join(d.pairs, pairsName(parseTag(`${base}.g1`) ? `${base}.g1` : base));
    if (fs.existsSync(pairsPath) || fs.existsSync(keyFile(d, base))) throw new Error(`${base}: a pairs or key file already exists; never overwritten (move it away deliberately)`);
    const order = shuffled(rows.map((_, i) => i), `cue-grader-export-${base}`);
    const items = [], key = {};
    order.forEach((ri, n) => { const r = rows[ri], k = `c${String(n + 1).padStart(2, '0')}`; items.push({ key: k, question: r.question, cues: r.cues, answer: r.answer }); key[k] = r.meta; });
    const p = { items }, why = pairsProblem(p);
    if (why) throw new Error(`${base}: the pairs file would be invalid (${why})`);
    for (const it of items) { const f = shapeFlags(it.cues); if (f.length && !extra.allowShapeFlags) throw new Error(`${base}: ${it.key} breaks the display shape (${f.join(',')}); refusing (fail early)`); }
    writeJson(pairsPath, p);
    writeJson(keyFile(d, base), { base, run, source, items: key, ...extra });
    return { pairsPath, items: items.length, pairsSha12: sha12(fs.readFileSync(pairsPath)) };
}

/** replace: true deletes the three calibration pairs and keys first, but ONLY while no grader has touched them (no cal verdicts file, no cal launch record): a plant the reviewer rejects is replaced before any grading. */
export function exportCal({ lab = LAB, replace = false } = {}) {
    const d = dirsOf(lab);
    const hp = hashProblem('cal-1.g1', lab); if (hp) throw new Error(`REFUSED: ${hp}`);          // a calibration export tolerates MISSING hashes, never a mismatch (SPEC 4.5)
    if (replace) {
        const touched = [...(fs.existsSync(d.verdicts) ? fs.readdirSync(d.verdicts) : [])].length > 0 || readJsonl(d.launches).some((r) => /^(cal|rev)-/.test(r.slot));
        if (touched) throw new Error('REFUSED: a grader has already touched the calibration files (verdicts or launch records exist); they are evidence and are never replaced');
        for (const n of [1, 2, 3]) for (const f of [path.join(d.pairs, pairsName(`cal-${n}.g1`)), keyFile(d, `cal-${n}`)]) fs.rmSync(f, { force: true });
    }
    const plants = readJson(path.join(d.plants, 'plants.json')).plants, out = [];
    for (const n of [1, 2, 3]) {
        const rows = plants.filter((p) => p.file === n).map((p) => ({ question: p.question, cues: p.cues, answer: p.answer, meta: { origin: 'plant', baseId: p.baseId, plantKind: p.kind, expected: EXPECT[p.kind].verdict, form: p.form, pairKey: p.pairKey, ...(p.contradictsLine != null ? { contradictsLine: p.contradictsLine } : {}) } }));
        out.push({ base: `cal-${n}`, ...writeBlind({ base: `cal-${n}`, rows, run: 'eq', source: 'plant', lab }) });
    }
    return out;
}

/** The revision's files: the 48 reused plants + the 16 fresh ones, re-split over 4 files (SPEC 3.4). A base and its mutants never share a file. */
export function exportRev({ lab = LAB } = {}) {
    const d = dirsOf(lab), freshFile = path.join(d.plants, 'plants.fresh.json');
    const hp = hashProblem('rev-1.g1', lab); if (hp) throw new Error(`REFUSED: ${hp}`);
    if (!fs.existsSync(freshFile)) throw new Error('plants.fresh.json is missing: the 16 fresh plants (4 good + 12 mutants) are authored only when the first calibration fails (SPEC 3.4)');
    const all = [...readJson(path.join(d.plants, 'plants.json')).plants.map((p) => ({ ...p, fresh: false })), ...readJson(freshFile).plants.map((p) => ({ ...p, fresh: true }))];
    if (all.length !== 64) throw new Error(`the revision needs 64 plants, found ${all.length}`);
    const groups = {}; for (const p of all) (groups[`${p.fresh ? 'f' : 'o'}:${p.baseId}`] ??= []).push(p);
    for (let attempt = 1; attempt <= 500; attempt++) {
        const files = [[], [], [], []], ids = shuffled(Object.keys(groups), `cue-grader-rev-${attempt}`);
        let ok = true;
        for (const g of ids) for (const p of groups[g]) {
            const free = [0, 1, 2, 3].filter((f) => files[f].length < 16 && !files[f].some((q) => `${q.fresh ? 'f' : 'o'}:${q.baseId}` === g));
            if (!free.length) { ok = false; break; }
            free.sort((a, b) => files[a].length - files[b].length); files[free[0]].push(p);
        }
        if (!ok || files.some((f) => f.length !== 16)) continue;
        return files.map((f, i) => ({ base: `rev-${i + 1}`, ...writeBlind({ base: `rev-${i + 1}`, rows: f.map((p) => ({ question: p.question, cues: p.cues, answer: p.answer, meta: { origin: 'plant', fresh: p.fresh, baseId: p.baseId, plantKind: p.kind, expected: EXPECT[p.kind].verdict, form: p.form, pairKey: p.pairKey } })), run: 'eq', source: 'plant', lab }) }));
    }
    throw new Error('no placement of the 64 plants over 4 files keeps every base apart from its mutants');
}

/** The real files of a run. Refused until both hashes exist and match (SPEC 4.5), and until the join counts reproduce (SPEC 4.1). */
export function exportReal(run, { lab = LAB } = {}) {
    const problem = hashProblem(`${run}-inapp.g1`, lab);
    if (problem) throw new Error(`REFUSED: ${problem}`);
    const tv = trimVersionCheck();
    if (!tv.identicalBehaviour) throw new Error('REFUSED: the trimCues versions differ between the builds and the dist; trim each run\'s arm blocks with its own build first (SPEC 4.1)');
    const out = [], summary = {};
    const inapp = extractInApp(run);
    const exp = EXPECTED_REAL[run];
    if (inapp.blocks.length !== exp.inapp) throw new Error(`REFUSED: the ${run} in-app join gives ${inapp.blocks.length} blocks, the measured count is ${exp.inapp} (the data or the join drifted)`);
    const live = inapp.blocks.filter((b) => !b.empty);
    out.push({ base: `${run}-inapp`, ...writeBlind({ base: `${run}-inapp`, rows: live.map((b) => ({ question: b.question, cues: b.cues, answer: b.answer, meta: { origin: 'real', id: b.id, pairKey: b.pairKey, turn: b.turn } })), run, source: 'inapp', lab, extra: { empties: inapp.blocks.filter((b) => b.empty).map((b) => ({ id: b.id, pairKey: b.pairKey })), report: inapp.report, unjoined: inapp.unjoined } }) });
    summary.inapp = { blocks: inapp.blocks.length, graded: live.length, empty: inapp.blocks.length - live.length };
    for (const arm of ['high', 'low']) {
        const x = extractArm(run, arm);
        if (x.blocks.length !== exp[arm]) throw new Error(`REFUSED: the ${run} ${arm} arm gives ${x.blocks.length} blocks, the measured count is ${exp[arm]}`);
        const arml = x.blocks.filter((b) => !b.empty);
        out.push({ base: `${run}-${arm}`, ...writeBlind({ base: `${run}-${arm}`, rows: arml.map((b) => ({ question: b.question, cues: b.cues, answer: b.answer, meta: { origin: 'real', id: b.id, pairKey: b.pairKey } })), run, source: arm, lab, extra: { empties: x.blocks.filter((b) => b.empty).map((b) => ({ id: b.id, pairKey: b.pairKey })), report: x.report } }) });
        summary[arm] = { blocks: x.blocks.length, graded: arml.length, empty: x.blocks.length - arml.length };
    }
    return { out, summary };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/export.mjs')) {
    const [mode, run] = process.argv.slice(2);
    try {
        if (mode === 'cal') for (const o of exportCal({ replace: process.argv.includes('--replace') })) console.log(`${o.base}: ${o.items} blocks, pairs sha12 ${o.pairsSha12}, file ${path.basename(o.pairsPath)}`);
        else if (mode === 'rev') for (const o of exportRev()) console.log(`${o.base}: ${o.items} blocks, pairs sha12 ${o.pairsSha12}, file ${path.basename(o.pairsPath)}`);
        else if (mode === 'real' && ['r1', 'h40d'].includes(run)) { const r = exportReal(run); for (const o of r.out) console.log(`${o.base}: ${o.items} blocks, pairs sha12 ${o.pairsSha12}, file ${path.basename(o.pairsPath)}`); console.log(`counts ${JSON.stringify(r.summary)}`); }
        else { console.error('usage: node export.mjs cal | rev | real r1|h40d'); process.exit(2); }
    } catch (e) { console.error(`export: ${e.message}`); process.exit(2); }
}
