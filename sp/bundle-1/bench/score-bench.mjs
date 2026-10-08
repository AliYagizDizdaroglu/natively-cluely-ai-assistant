// bench step 7: the scorer. Joins the six run files, the blind key and the six graders' verdicts, REFUSES on any integrity hole, then evaluates every pre-registered bar (bars.mjs).
// NO network, NO model. Prints ids, counts and numbers only; never an answer, a question or a reason text.
//   node score-bench.mjs [--root <dir>]        root holds runs/, keyhold/key-b1.json, blind/, grade/verdicts/, grade/launches.jsonl (default: bundle-1/bench)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCH, readJson, sha12, loadLive40, expectedIds } from './common.mjs';
import { allBars, classify, REPS } from './bars.mjs';

export const PIN = 'claude-opus-5-5';
const GATED = ['Read', 'Write', 'Edit'];

/** Pure: why the launch records of the six graders are not clean. [] = clean. `recs` = parsed launches.jsonl lines; `sha(file)` gives the current sha12 of a pairs/verdicts path. */
export function launchProblems(recs, tags, pairsPathOf, verdictsPathOf, sha = (p) => { try { return sha12(fs.readFileSync(p)); } catch { return 'MISSING'; } }) {
    const bad = [];
    for (const tag of tags) {
        const r = recs.filter((x) => x.slot === tag).at(-1);
        if (!r) { bad.push(`${tag}: no launch record`); continue; }
        if (r.exit !== 0) bad.push(`${tag}: exit ${r.exit}`);
        if (r.memory !== 'ABSENT') bad.push(`${tag}: memory ${r.memory}`);
        if (r.pinned !== true) bad.push(`${tag}: model not the pin ${PIN} (${r.model})`);
        if (r.slugJsonl !== 1) bad.push(`${tag}: slugJsonl ${r.slugJsonl}`);
        if (r.memoryDir === 'non-empty') bad.push(`${tag}: projects memory dir non-empty`);
        if (Object.keys(r.tools ?? {}).some((t) => !GATED.includes(t))) bad.push(`${tag}: tool outside Read/Write/Edit`);
        if (r.pairsSha12 !== sha(pairsPathOf(tag))) bad.push(`${tag}: pairs file changed since the launch`);
        if (r.verdictsSha12 !== sha(verdictsPathOf(tag))) bad.push(`${tag}: verdicts file changed since the launch`);
    }
    return bad;
}

/** Pure: the run files must be byte-identical to the ones the blind export was built from (build-record runSha12, written by export-blind.mjs). `shaOf(path)` gives a file's sha12. */
export function runHashProblems(record, runPathOf, shaOf = (p) => { try { return sha12(fs.readFileSync(p)); } catch { return 'MISSING'; } }) {
    const bad = [];
    if (!record?.runSha12 || typeof record.runSha12 !== 'object') return ['the build record holds no runSha12'];
    for (const a of ['C', 'T']) for (const r of [1, 2, 3]) {
        const want = record.runSha12[`${a}${r}`];
        if (!want) bad.push(`${a}${r}: no hash in the build record`);
        else if (shaOf(runPathOf(a, r)) !== want) bad.push(`${a}${r}: the run file changed since the blind export (the graded answers are not the scored ones)`);
    }
    return bad;
}

/** Pure: join keys. pairsByFile[k] = items; key[`blind-k`] = {qKey: {arm,id,rep}}; verdicts[`blind-k.gK`] = {qKey: grade}. Returns { grades, problems }. */
export function joinGrades(pairsByFile, key, verdicts, ids) {
    const problems = [], grades = { C: { 1: {}, 2: {}, 3: {} }, T: { 1: {}, 2: {}, 3: {} } };
    for (let k = 1; k <= 3; k++) {
        const items = pairsByFile[k] ?? [], km = key[`blind-${k}`] ?? {};
        const keys = items.map((i) => i.key);
        if (new Set(keys).size !== keys.length || keys.length !== 2 * ids.length) problems.push(`blind-${k}: ${keys.length} unique-key items, need ${2 * ids.length}`);
        if (JSON.stringify([...keys].sort()) !== JSON.stringify(Object.keys(km).sort())) problems.push(`blind-${k}: key and pairs keys differ`);
        for (const [q, m] of Object.entries(km)) {
            if (m.rep !== k) problems.push(`blind-${k}: ${q} is rep ${m.rep}`);
            const gs = [1, 2].map((g) => verdicts[`blind-${k}.g${g}`]?.[q]);
            if (gs.some((g) => !g)) { problems.push(`blind-${k}: ${q} lacks a grader verdict`); continue; }
            if (grades[m.arm][m.rep][m.id]) problems.push(`blind-${k}: (${m.arm},${m.id},${m.rep}) twice`);
            grades[m.arm][m.rep][m.id] = gs;
        }
    }
    for (const a of ['C', 'T']) for (const r of REPS) for (const id of ids) if (!grades[a][r][id]) problems.push(`no grades for ${a} rep ${r} ${id}`);
    for (const a of ['C', 'T']) for (const r of REPS) for (const id of ids) { try { classify(grades[a][r][id]); } catch (e) { problems.push(`${a} rep ${r} ${id}: ${e.message}`); } }
    return { grades, problems: [...new Set(problems)] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const root = path.resolve(argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : BENCH);
    const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
    const ids = expectedIds(await loadLive40());
    const runs = { C: {}, T: {} };
    for (const a of ['C', 'T']) for (const r of REPS) {
        const f = path.join(root, 'runs', `b1${a.toLowerCase()}${r}.json`);
        if (!fs.existsSync(f)) refuse(`${f} missing`);
        runs[a][r] = readJson(f);
        const miss = ids.filter((id) => !runs[a][r][id]?.spoken || runs[a][r][id].transientError);
        if (miss.length) refuse(`${a} rep ${r}: ${miss.length} ids without an answer (${miss.slice(0, 5).join(',')})`);
    }
    const recFile = path.join(root, 'keyhold', 'build-record-b1.json');
    if (!fs.existsSync(recFile)) refuse(`${recFile} missing: the run files cannot be tied to the graded export`);
    const hp = runHashProblems(readJson(recFile), (a, r) => path.join(root, 'runs', `b1${a.toLowerCase()}${r}.json`));
    if (hp.length) refuse(hp.join(' | '));
    const key = readJson(path.join(root, 'keyhold', 'key-b1.json'));
    const pairsPath = (tag) => path.join(root, 'blind', `pairs.${tag.replace(/\.g\d$/, '')}.json`);
    const verdictsPath = (tag) => path.join(root, 'grade', 'verdicts', `verdicts.${tag}.json`);
    const tags = [1, 2, 3].flatMap((k) => [`blind-${k}.g1`, `blind-${k}.g2`]);
    for (const t of tags) if (!fs.existsSync(verdictsPath(t))) refuse(`${verdictsPath(t)} missing: ${tags.length} graders must have run`);
    const lp = launchProblems(fs.existsSync(path.join(root, 'grade', 'launches.jsonl')) ? fs.readFileSync(path.join(root, 'grade', 'launches.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : [], tags, pairsPath, verdictsPath);
    if (lp.length) refuse(`grader launch records are not clean: ${lp.join(' | ')}`);
    const pairsByFile = Object.fromEntries([1, 2, 3].map((k) => [k, readJson(pairsPath(`blind-${k}.g1`)).items]));
    const verdicts = Object.fromEntries(tags.map((t) => [t, readJson(verdictsPath(t))]));
    const { grades, problems } = joinGrades(pairsByFile, key, verdicts, ids);
    if (problems.length) refuse(`the join is not clean: ${problems.slice(0, 8).join(' | ')}`);
    const bars = allBars(runs, grades, ids);
    for (const b of bars) console.log(`${b.pass ? 'PASS' : 'FAIL'} ${b.id.padEnd(4)} ${b.detail}`);
    const failed = bars.filter((b) => !b.pass).map((b) => b.id);
    console.log(failed.length ? `BENCH FAIL: ${failed.join(', ')} -- the chain stops (spec 8): root cause, fix, re-check` : `BENCH PASS: all ${bars.length} bars`);
    // information that is not a bar
    let d0 = 0; for (const a of ['C', 'T']) for (const r of REPS) for (const id of ids) for (const g of grades[a][r][id]) if (g.delivery === 0) d0++;
    console.log(`info: delivery 0 grades ${d0} (the spec's acceptable ignores delivery)`);
    fs.writeFileSync(path.join(root, 'score.result.json'), JSON.stringify({ at: new Date().toISOString(), bars, failed }, null, 1));
    process.exit(failed.length ? 1 : 0);
}
