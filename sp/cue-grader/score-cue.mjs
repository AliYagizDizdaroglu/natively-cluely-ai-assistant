// score-cue.mjs: the scorer and the reader of the cue grader (SPEC 1.4, 3.4, 4.3, 4.6, 6). Pure functions + a CLI. No model call; ids, counts and hashes only are printed.
//   node score-cue.mjs --cal          the first calibration (cal-1..3, two graders): the pass bars of SPEC 3.4
//   node score-cue.mjs --rev          the one revision (rev-1..4): the 16 fresh plants on their own AND the reused 48 on the original bars
//   node score-cue.mjs --real [--write]   the real runs found in LAB\verdicts: per-source counts, contested, and the reading of SPEC 6 (row 0 when h40d did not run); --write puts report.md in LAB
// The scorer refuses a verdicts file whose last launch record is not clean (exit 0, memory ABSENT, tools Read/Write/Edit, pinned, own paths only, the pairs and verdicts files the record names).
import fs from 'node:fs';
import path from 'node:path';
import { LAB, dirsOf, readJson, readJsonl, derive, worse, verdictFileProblem, lineCountsOf, pairsProblem, pairsName, verdictsName, parseTag, sha12, hashProblem, VERDICT_RANK, loadThresholds, fileSha } from './lib.mjs';

const GATED = ['Read', 'Write', 'Edit'];
/** null when the LAST launch record of `tag` is clean and binds the files on disk. */
export function recordProblem(rec, { pairsSha, verdictsSha, requireLauncher = true }) {
    if (!rec) return 'no launch record';
    if (rec.exit !== 0) return `exit ${rec.exit}`;
    if (rec.slugJsonl !== 1) return `slugJsonl ${rec.slugJsonl}`;
    if (rec.memoryDir === 'non-empty') return 'the projects folder holds a non-empty memory';
    if (rec.memory !== 'ABSENT') return `memory ${rec.memory}`;
    if (!rec.tools || Object.keys(rec.tools).some((t) => !GATED.includes(t))) return `tools ${JSON.stringify(rec.tools)}`;
    if (rec.pinned !== true) return 'not pinned to the model';
    if (rec.pathViolations !== 0) return `pathViolations ${rec.pathViolations}`;
    if (requireLauncher && !rec.launcher) return 'no launcher sha in the record';
    if (rec.pairsSha12 !== pairsSha) return 'the pairs file is not the one graded';
    if (rec.verdictsSha12 !== verdictsSha) return 'the verdicts file is not the one the launch wrote';
    return null;
}

/** Loads one tag: { tag, info, pairs, key, verdicts, blocks: [{key, meta, cues, v, derived}] }; throws naming the problem. */
export function loadTag(tag, lab = LAB) {
    const d = dirsOf(lab), info = parseTag(tag);
    const hp = hashProblem(tag, lab); if (hp) throw new Error(`${tag}: REFUSED: ${hp}`);
    const pairsPath = path.join(d.pairs, pairsName(tag)), vPath = path.join(d.verdicts, verdictsName(tag));
    const pairs = readJson(pairsPath), keyDoc = readJson(path.join(d.keyhold, `key.${info.base}.json`));
    const pp = pairsProblem(pairs); if (pp) throw new Error(`${tag}: ${pp}`);
    const verdicts = readJson(vPath), vp = verdictFileProblem(verdicts, lineCountsOf(pairs)); if (vp) throw new Error(`${tag}: verdicts invalid (${vp})`);
    const rec = readJsonl(d.launches).filter((r) => r.slot === tag).at(-1);
    const rp = recordProblem(rec, { pairsSha: sha12(fs.readFileSync(pairsPath)), verdictsSha: sha12(fs.readFileSync(vPath)) });
    if (rp) throw new Error(`${tag}: the last launch record is not clean (${rp})`);
    if (info.kind === 'real') for (const [field, file] of [['rubricSha12', d.rubric], ['specSha12', d.spec]]) if (rec[field] !== fileSha(file).slice(0, 12)) throw new Error(`${tag}: REFUSED: the launch record's ${field} is not the frozen file's (graded under a different ${field === 'rubricSha12' ? 'rubric' : 'spec'})`);
    const blocks = pairs.items.map((it) => ({ key: it.key, meta: keyDoc.items[it.key], cues: it.cues, v: verdicts[it.key], derived: derive(verdicts[it.key]) }));
    return { tag, info, keyDoc, blocks };
}

// ---------------------------------------------------------------- calibration (SPEC 3.4)
const BAD6 = ['wrong_fact', 'off_question', 'repeats', 'filler', 'cut', 'contradicts'];
const WRONG3 = ['wrong_fact', 'off_question', 'repeats'];
/** The bars of one grader over plant blocks [{kind, derived, v}] (kind from the key). `t` holds the thresholds so the revision's fresh set can use its own. */
export function graderBars(blocks, t) {
    const of = (ks) => blocks.filter((b) => ks.includes(b.kind));
    const bad = of(BAD6), wrong = of(WRONG3), good = of(['good']), halo = of(['halo']), missing = of(['missing']);
    const out = [];
    const bar = (name, got, want, extra = '') => out.push({ name, got, want, ok: got >= want, extra });
    bar(`catch: planted bad rated not-good (of ${bad.length})`, bad.filter((b) => b.derived !== 'good').length, t.catch);
    bar(`wrong is wrong: must-be-wrong rated wrong (of ${wrong.length})`, wrong.filter((b) => b.derived === 'wrong').length, t.wrong);
    for (const k of [...BAD6, 'missing']) { const bs = of([k]); if (bs.length) bar(`no blind spot: ${k} caught (of ${bs.length})`, bs.filter((b) => b.derived !== 'good').length, t.kind); }
    bar(`pass good: good rated good (of ${good.length})`, good.filter((b) => b.derived === 'good').length, t.good);
    out.push({ name: `pass good: good rated WRONG (of ${good.length}), must be 0`, got: good.filter((b) => b.derived === 'wrong').length, want: 0, ok: good.filter((b) => b.derived === 'wrong').length === 0, extra: '' });
    if (halo.length) bar(`halo: not wrong with every line C=2 (of ${halo.length})`, halo.filter((b) => b.derived !== 'wrong' && b.v.lines.every((l) => l.C === 2)).length, t.halo);
    bar(`label check: own label = derived verdict (of ${blocks.length})`, blocks.filter((b) => b.v.label === b.derived).length, t.label);
    return out;
}
export const CAL_BARS = { catch: 22, wrong: 11, kind: 3, good: 14, halo: 3, label: 42, agree: 40 };
export const REV_FRESH_BARS = { catch: 11, wrong: 6, kind: 0, good: 3, halo: 0, label: 0, agree: 13 };
const rate = (a, b) => `${a}/${b}`;

/**
 * Calibration reading. `files`: [{ g1: [blocks], g2: [blocks] }] where each block = { key, kind, fresh?, derived, v } and g1[i] / g2[i] are the SAME block (same file, same key).
 * mode 'cal': the 48 on CAL_BARS. mode 'rev': the 16 fresh on REV_FRESH_BARS (+ good 0 wrong), and the reused 48 on CAL_BARS.
 */
export function scoreCalibration(files, mode = 'cal') {
    const sets = mode === 'cal' ? [['the 48 plants', (b) => !b.fresh, CAL_BARS, 48]] : [['the 16 fresh plants', (b) => b.fresh, REV_FRESH_BARS, 16], ['the reused 48 plants', (b) => !b.fresh, CAL_BARS, 48]];
    const lines = []; let pass = true;
    for (const [label, pick, T, n] of sets) {
        const per = { g1: [], g2: [] }, agree = [];
        for (const f of files) f.g1.forEach((b1, i) => { const b2 = f.g2[i]; if (!pick(b1)) return; per.g1.push(b1); per.g2.push(b2); agree.push(b1.derived === b2.derived); });
        if (per.g1.length !== n) throw new Error(`${label}: ${per.g1.length} blocks, expected ${n}`);
        for (const g of ['g1', 'g2']) for (const r of graderBars(per[g], mode === 'rev' && label.includes('fresh') ? { ...T, kind: 0 } : T)) { lines.push(`${r.ok ? 'PASS' : 'FAIL'} [${label}] ${g}: ${r.name} = ${r.got} (bar >= ${r.want})`); pass = pass && r.ok; }
        const ag = agree.filter(Boolean).length; lines.push(`${ag >= T.agree ? 'PASS' : 'FAIL'} [${label}] agreement g1/g2 = ${rate(ag, agree.length)} (bar >= ${T.agree})`); pass = pass && ag >= T.agree;
    }
    return { pass, lines };
}
/** From loaded tags (cal-1..3 or rev-1..4) to the `files` argument. */
export function filesFromTags(prefix, n, lab = LAB) {
    const files = [];
    for (let i = 1; i <= n; i++) {
        const g = ['g1', 'g2'].map((x) => loadTag(`${prefix}-${i}.${x}`, lab));
        files.push({ g1: g[0].blocks.map((b) => ({ key: b.key, kind: b.meta.plantKind, fresh: !!b.meta.fresh, derived: b.derived, v: b.v })), g2: g[1].blocks.map((b) => ({ key: b.key, kind: b.meta.plantKind, fresh: !!b.meta.fresh, derived: b.derived, v: b.v })) });
        // the two graders graded the same file: their blocks line up by key
        for (let j = 0; j < files[i - 1].g1.length; j++) if (files[i - 1].g1[j].key !== files[i - 1].g2[j].key) throw new Error(`${prefix}-${i}: the two graders' blocks do not line up`);
    }
    return files;
}

// ---------------------------------------------------------------- real runs (SPEC 4.3, 4.6, 6)
export const floorN = (n, pct) => Math.floor((pct * n) / 100);
export const ceilN = (n, pct) => Math.ceil((pct * n) / 100);
export const AXES = ['G', 'V', 'K', 'R', 'C'];
/** The axis flags of a block from ONE grader's scores (SPEC 6, row 3, step 3). */
export function axisFlags(v) {
    const f = [];
    if (v.lines.some((l) => l.G === 0) || !v.lines.some((l) => l.G === 2)) f.push('G');
    if (v.V <= 1) f.push('V');
    if (v.K === 0) f.push('K');
    if (v.lines.some((l) => l.R === 0) || !v.lines.some((l) => l.R === 2)) f.push('R');
    if (v.lines.some((l) => l.C <= 1)) f.push('C');
    return f;
}
/**
 * Final verdicts of the in-app blocks of a run. `g1`, `g2`: blocks aligned by key ({key, meta, v, derived}). Returns rows [{id, pairKey, final, better, contested, explainer (the grader's scores that explain the final verdict)}].
 * `bestOf`: when true the BETTER verdict is taken (the "rests on contested blocks" test).
 */
export function inAppRows(g1, g2, bestOf = false) {
    return g1.map((b1, i) => {
        const b2 = g2[i];
        if (b1.key !== b2.key) throw new Error('the two in-app graders do not line up');
        const pick = bestOf ? (VERDICT_RANK[b1.derived] >= VERDICT_RANK[b2.derived] ? b1.derived : b2.derived) : worse(b1.derived, b2.derived);
        const final = pick;
        const explainer = b1.derived === final ? b1.v : b2.v;                       // the grader whose derived verdict IS the final one; g1 on a tie
        return { id: b1.meta.id, pairKey: b1.meta.pairKey, final, contested: b1.derived !== b2.derived, explainer, d1: b1.derived, d2: b2.derived };
    });
}
/**
 * The SPEC 6 reading over the pooled in-app rows. `rows` = [{final, pairKey, run}] of graded blocks; `empties` = count of empty in-app blocks; `grades` = { 'run:pairKey': 'acceptable'|'weak'|'wrong' };
 * `explainers` = per NG block scores. Returns { n, good, wrong, empty, adds, ng, shares, row, name }.
 */
export function reading({ rows, empties, grades, T = loadThresholds(LAB) }) {
    const n = rows.length + empties;
    const good = rows.filter((r) => r.final === 'good').length, wrong = rows.filter((r) => r.final === 'wrong').length;
    const adds = rows.filter((r) => r.final === 'wrong' && grades[`${r.run}:${r.pairKey}`] === 'acceptable').length;
    const ngRows = rows.filter((r) => r.final !== 'good'), ng = ngRows.length;
    const shares = Object.fromEntries(AXES.map((a) => [a, ng ? ngRows.filter((r) => axisFlags(r.explainer).includes(a)).length / ng : 0]));
    const wrongMax = floorN(n, T.wrongPct), emptyMin = ceilN(n, T.emptyPct), goodMin = ceilN(n, T.goodPct), axisMin = T.axisPct / 100;
    let row, name;
    if (wrong > wrongMax || adds >= T.addsMin || empties >= emptyMin) { row = 1; name = 'Redesign (hard)'; }
    else if (good >= goodMin && wrong <= wrongMax && adds === 0) { row = 2; name = 'Keep ON'; }
    else if (good < goodMin && ng >= T.ngMin && Math.max(...Object.values(shares)) >= axisMin) { row = 3; name = 'Redesign (axis)'; }
    else { row = 4; name = 'Flag off by default'; }
    const named = AXES.filter((a) => shares[a] >= axisMin).sort((a, b) => shares[b] - shares[a] || AXES.indexOf(a) - AXES.indexOf(b));
    return { n, good, wrong, empty: empties, adds, ng, shares, row, name, wrongMax, emptyMin, goodMin, namedAxes: row === 3 ? named : [] };
}
export const agreementOf = (rows) => (rows.length ? rows.filter((r) => !r.contested).length / rows.length : 0);

// ---------------------------------------------------------------- the real-run report
const has = (tag, lab) => fs.existsSync(path.join(dirsOf(lab).verdicts, verdictsName(tag)));
const tally = (xs) => { const c = { good: 0, weak: 0, wrong: 0 }; for (const x of xs) c[x]++; return c; };
const mean = (xs) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : 'n/a');
/** D rate on choice questions: yes / (yes + no), "na" excluded. */
const dRate = (blocks) => { const y = blocks.filter((b) => b.v.D === 'yes').length, n = blocks.filter((b) => b.v.D === 'no').length; return y + n ? `${y}/${y + n}` : 'n/a'; };
const axisMeans = (bs) => `R ${mean(bs.flatMap((b) => b.v.lines.map((l) => l.R)))} C ${mean(bs.flatMap((b) => b.v.lines.map((l) => l.C)))} G ${mean(bs.flatMap((b) => b.v.lines.map((l) => l.G)))} V ${mean(bs.map((b) => b.v.V))} K ${mean(bs.map((b) => b.v.K))}`;

/** What exists for a run: in-app (both graders) and the two arms; everything loaded through loadTag (so a dirty record refuses). */
export function loadRealRun(run, lab = LAB) {
    const out = { run, inapp: null, arms: {} };
    if (has(`${run}-inapp.g1`, lab) && has(`${run}-inapp.g2`, lab)) {
        const g1 = loadTag(`${run}-inapp.g1`, lab), g2 = loadTag(`${run}-inapp.g2`, lab);
        const rows = inAppRows(g1.blocks, g2.blocks).map((r) => ({ ...r, run }));
        out.inapp = { g1, g2, rows, bestRows: inAppRows(g1.blocks, g2.blocks, true).map((r) => ({ ...r, run })), empties: g1.keyDoc.empties?.length ?? 0, report: g1.keyDoc.report, agreement: agreementOf(rows) };
    }
    for (const arm of ['high', 'low']) if (has(`${run}-${arm}`, lab)) { const t = loadTag(`${run}-${arm}`, lab); out.arms[arm] = { t, counts: tally(t.blocks.map((b) => b.derived)), empties: t.keyDoc.empties?.length ?? 0, report: t.keyDoc.report }; }
    return out;
}

/** The report text of the real runs found on disk, and the reading. `grades`: { 'run:pairKey': grade }. */
export function realReport(runs, grades, { thresholdsConfirmed = false, lab = LAB } = {}) {
    const L = [], T = loadThresholds(lab), AG = T.agreePct / 100;
    L.push(thresholdsConfirmed ? 'THRESHOLDS of SPEC 6: confirmed by the user.' : `THRESHOLDS of SPEC 6 (${(([g, w, e, a]) => `${g}% good, ${w}% wrong, ${e}% empty, adds-error >= ${a}`)([T.goodPct, T.wrongPct, T.emptyPct, T.addsMin])}): AWAITING THE USER; the reading below is reported, not ruled.`);
    for (const r of runs) {
        if (r.run === 'h40d' && r.inapp) { const R33 = r.inapp.rows.find((x) => x.id === 'R33'); L.unshift(`h40d R33 (the known case, SPEC 4.4): final verdict ${R33 ? R33.final : 'not among the graded blocks'}; expected wrong${R33 && R33.final !== 'wrong' ? '  <-- NOT WRONG: stated first' : ''}`); }
    }
    for (const r of runs) {
        L.push(`== ${r.run}`);
        if (r.inapp) {
            const c = tally(r.inapp.rows.map((x) => x.final)), ct = r.inapp.rows.filter((x) => x.contested).length;
            L.push(`${r.run} in-app (2 graders, worse of two): good ${c.good} weak ${c.weak} wrong ${c.wrong} empty ${r.inapp.empties}; contested ${ct} of ${r.inapp.rows.length}; agreement ${(100 * r.inapp.agreement).toFixed(0)}% (${r.inapp.agreement >= AG ? 'reliable' : 'GRADER UNRELIABLE ON REAL DATA (< ${loadThresholds(LAB).agreePct}%)'})`);
            L.push(`  per-axis means of the two graders: ${axisMeans([...r.inapp.g1.blocks, ...r.inapp.g2.blocks])}; D yes rate on choice questions ${dRate(r.inapp.g1.blocks)} (g1) ${dRate(r.inapp.g2.blocks)} (g2)`);
            const gr = (k) => grades[`${r.run}:${k}`];
            const adds = r.inapp.rows.filter((x) => x.final === 'wrong' && gr(x.pairKey) === 'acceptable').length, echo = r.inapp.rows.filter((x) => x.final === 'wrong' && gr(x.pairKey) === 'wrong').length, gw = r.inapp.rows.filter((x) => x.final === 'good' && gr(x.pairKey) === 'wrong').length;
            L.push(`  joined to the flight's answer grades (SPEC 4.6): adds-error ${adds}; echo ${echo}; cue good while the answer is wrong ${gw}`);
            const rep = r.inapp.report ?? {};
            L.push(`  build facts: ${r.run === 'r1' ? `cue presence ${rep.cuesToPipelineTurns} of ${rep.routerTurns} Router turns pipeline-shown; the ${rep.cuesToLiveTurns} Live-shown carried none; ` : ''}joined ${rep.joined}, unjoined ${rep.unjoined}, empty-line drops ${rep.emptyLineDrops}`);
        } else L.push(`${r.run} in-app: not graded`);
        for (const arm of ['high', 'low']) { const a = r.arms[arm]; L.push(a ? `${r.run} bare ${arm === 'high' ? '3.5-lite HIGH' : '3.1-lite LOW'} (1 grader, no agreement check): good ${a.counts.good} weak ${a.counts.weak} wrong ${a.counts.wrong} empty ${a.empties}; trim changed ${a.report?.trimChanged}, empty-line drops ${a.report?.emptyLineDrops}; D yes rate ${dRate(a.t.blocks)}` : `${r.run} bare ${arm}: not graded`); }
    }
    // the reading
    const withInapp = runs.filter((r) => r.inapp), h40d = runs.find((r) => r.run === 'h40d')?.inapp, r1 = runs.find((r) => r.run === 'r1')?.inapp;
    const pool = (which) => withInapp.flatMap((r) => r.inapp[which]);
    const empt = withInapp.reduce((s, r) => s + r.inapp.empties, 0);
    const unreliable = withInapp.filter((r) => r.inapp.agreement < AG).map((r) => r.run);
    const show = (rd, tag) => L.push(`${tag}: n ${rd.n}; good ${rd.good} (>= ${rd.goodMin} for row 2); wrong ${rd.wrong} (> ${rd.wrongMax} fires row 1); empty ${rd.empty} (>= ${rd.emptyMin} fires row 1); adds-error ${rd.adds}; NG ${rd.ng}; axis shares ${AXES.map((a) => `${a} ${(100 * rd.shares[a]).toFixed(0)}%`).join(' ')} -> row ${rd.row} ${rd.name}${rd.namedAxes.length ? ` [${rd.namedAxes.join(', ')}]` : ''}`);
    if (!r1) { L.push('READING: none (r1 in-app not graded yet)'); return L.join('\n'); }
    const rd = reading({ rows: pool('rows'), empties: empt, grades }), best = reading({ rows: pool('bestRows'), empties: empt, grades });
    const contested = pool('rows').filter((x) => x.contested).length;
    const sentence = `contested ${contested} of ${pool('rows').length}${best.row !== rd.row ? '; the reading rests on contested blocks (with every contested block at its BETTER verdict the row would be ' + best.row + ')' : ''}`;
    if (!h40d || unreliable.length) {
        L.push(`READING: row 0 No reading (${!h40d ? 'h40d not run' : `grader unreliable on real data: ${unreliable.join(', ')}`}); the r1-only counts above stand, and n = ${rd.n} is too small to read.`);
        show(rd, 'INFORMATIONAL ONLY (not a reading): the rows evaluated on what exists');
        L.push(`  ${sentence}`);
    } else {
        show(rd, `READING (pooled r1 + h40d, in-app, final verdicts)`);
        L.push(`  ${sentence}`);
    }
    return L.join('\n');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/score-cue.mjs')) {
    const argv = process.argv.slice(2);
    try {
        if (argv.includes('--cal')) { const r = scoreCalibration(filesFromTags('cal', 3), 'cal'); console.log(r.lines.join('\n')); console.log(r.pass ? 'CALIBRATION PASS: both graders pass every bar' : 'CALIBRATION FAIL (one revision allowed, SPEC 3.4)'); process.exit(r.pass ? 0 : 1); }
        else if (argv.includes('--rev')) { const r = scoreCalibration(filesFromTags('rev', 4), 'rev'); console.log(r.lines.join('\n')); console.log(r.pass ? 'REVISION PASS' : 'REVISION FAIL: stop, report both runs; the user rules (SPEC 3.4)'); process.exit(r.pass ? 0 : 1); }
        else if (argv.includes('--real')) {
            const lab = LAB, d = dirsOf(lab), { answerGrades } = await import('./extract.mjs');
            const runs = ['r1', 'h40d'].map((r) => loadRealRun(r, lab)).filter((r) => r.inapp || Object.keys(r.arms).length);
            const grades = {}; for (const run of ['r1', 'h40d']) if (runs.some((x) => x.run === run)) { const g = answerGrades(run); for (const [k, v] of Object.entries(g)) grades[`${run}:${k}`] = v; }
            const text = realReport(runs, grades, { thresholdsConfirmed: fs.existsSync(path.join(lab, 'thresholds.confirmed')) });
            console.log(text);
            if (argv.includes('--write')) { fs.writeFileSync(path.join(d.lab, 'report.md'), `# cue grader report (ids and counts only)\n\n\`\`\`\n${text}\n\`\`\`\n`); console.log('report.md written'); }
        } else { console.error('usage: node score-cue.mjs --cal | --rev | --real [--write]'); process.exit(2); }
    } catch (e) { console.error(`score-cue: REFUSED: ${e.message}`); process.exit(2); }
}
