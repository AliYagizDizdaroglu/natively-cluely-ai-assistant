// Temperature probe readout. Latency/shape from the answer files (tonight T04 vs TDEF, paired; prior = s50m's 0.4
// twins on the same items, another day). Quality from the blind verdicts when present: per answer, acceptable =
// correctness 2 and on_topic 2; scored per grader and as the mean of the two graders; wrong = correctness 0 or
// on_topic 0 by BOTH graders. Prints numbers and ids only. Exploratory: decides nothing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const OUT = path.join(HERE, 'out'), BLIND = path.join(HERE, 'blind');
const { items } = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
const LEGS = { high: ['captured-high', 'captured-high-r2', 'captured-high-r3'].map((t) => `gemini-3.5-flash-lite_${t}`), low: ['captured-low', 'captured-low-r2', 'captured-low-r3'].map((t) => `gemini-3.1-flash-lite_${t}`) };
const NAME = { high: '3.5-lite HIGH', low: '3.1-lite LOW' };
const q = (a, p) => { const x = a.filter((v) => v !== null && v !== undefined).sort((m, n) => m - n); return x.length ? x[Math.min(x.length - 1, Math.floor(x.length * p))] : null; };
const rd = (v) => (v === null ? '-' : Math.round(v));
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
const priorRecs = (tag) => { const a = JSON.parse(fs.readFileSync(`${RUN}/interview60.answers.${tag}.json`, 'utf8')); return Array.isArray(a) ? a : Object.values(a.items ?? a); };
const out = [];
const recs = {};   // `${leg}.${arm}` -> [{id, rep, ...}]
for (const leg of Object.keys(LEGS)) {
    for (const arm of ['T04', 'TDEF']) recs[`${leg}.${arm}`] = [1, 2, 3].flatMap((rep) => items.map((x) => ({ rep, ...(load(path.join(OUT, `answers.${leg}.${arm}.r${rep}.json`))[x.id] ?? { id: x.id, missing: true }) })));
    recs[`${leg}.P04`] = LEGS[leg].flatMap((tag, k) => { const pr = priorRecs(tag); return items.map((x) => ({ rep: k + 1, ...(pr.find((r) => r.id === x.id) ?? { id: x.id, missing: true }) })); });
}
out.push('LATENCY AND SHAPE (per answer; T04 and TDEF tonight, interleaved; P04 = s50m 0.4 twins, 2026-09-22)');
for (const leg of Object.keys(LEGS)) {
    out.push(`  ${NAME[leg]}`);
    for (const arm of ['T04', 'TDEF', 'P04']) {
        const r = recs[`${leg}.${arm}`].filter((x) => !x.missing && !x.transientError);
        out.push(`    ${arm.padEnd(4)} n ${String(r.length).padStart(2)}  first word p50 ${rd(q(r.map((x) => x.ttft), 0.5))} ms  p90 ${rd(q(r.map((x) => x.ttft), 0.9))} ms  | thinking p50 ${rd(q(r.map((x) => x.thoughts), 0.5))}  | words p50 ${rd(q(r.map((x) => x.words), 0.5))}`
            + (arm === 'P04' ? '' : `  | finish!=STOP ${r.filter((x) => x.finish !== 'STOP').length}  loop8>=3 ${r.filter((x) => (x.loop8 ?? 0) >= 3).length}  empty ${r.filter((x) => !x.spoken).length}  transient-or-not-run ${recs[`${leg}.${arm}`].filter((x) => x.transientError || x.missing).length}`));
    }
    // paired: same item + rep, TDEF minus T04
    const d = { ttft: [], thoughts: [], words: [] };
    for (const a of recs[`${leg}.T04`]) { const b = recs[`${leg}.TDEF`].find((x) => x.id === a.id && x.rep === a.rep); if (!a.missing && !b?.missing && !a.transientError && !b?.transientError) for (const k of Object.keys(d)) if (a[k] != null && b[k] != null) d[k].push(b[k] - a[k]); }
    out.push(`    paired TDEF - T04 (n ${d.ttft.length}): first word median ${rd(q(d.ttft, 0.5))} ms, thinking median ${rd(q(d.thoughts, 0.5))}, words median ${rd(q(d.words, 0.5))}`);
}
// quality
const vfiles = fs.existsSync(BLIND) ? fs.readdirSync(BLIND).filter((f) => /^verdicts\.blind-\d+\.g\d\.json$/.test(f)) : [];
if (!vfiles.length) { out.push('', 'QUALITY: no verdicts yet'); }
else {
    const key = {}; for (const f of fs.readdirSync(BLIND).filter((f) => /^key\./.test(f))) Object.assign(key, load(path.join(BLIND, f)));
    const byKey = {};
    for (const f of vfiles) { const v = load(path.join(BLIND, f)); for (const [k, s] of Object.entries(v)) (byKey[k] ??= []).push(s); }
    const nKeys = Object.keys(key).length, graded = Object.keys(byKey).length;
    out.push('', `QUALITY (blind, frozen grader prompt; ${vfiles.length} verdict files; keys ${nKeys}, graded ${graded}, keys with 2 graders ${Object.values(byKey).filter((a) => a.length === 2).length})`);
    const ok = (s) => s.correctness === 2 && s.on_topic === 2, bad = (s) => s.correctness === 0 || s.on_topic === 0;
    const cell = {};
    for (const [k, meta] of Object.entries(key)) {
        const vs = byKey[k] ?? [];
        const c = (cell[`${meta.leg}.${meta.arm}`] ??= { n: 0, mean: 0, both: 0, wrongBoth: 0, per: {} });
        c.n++; const m = vs.length ? vs.filter(ok).length / vs.length : 0; c.mean += m; if (vs.length === 2 && vs.every(ok)) c.both++; if (vs.length === 2 && vs.every(bad)) c.wrongBoth++;
        (c.per[meta.id] ??= []).push(m);
    }
    // empty-after-filter answers are scored as wrong (not in key): count them per cell
    for (const leg of Object.keys(LEGS)) {
        out.push(`  ${NAME[leg]}`);
        for (const arm of ['T04', 'TDEF', 'P04']) {
            const c = cell[`${leg}.${arm}`] ?? { n: 0, mean: 0, both: 0, wrongBoth: 0, per: {} };
            out.push(`    ${arm.padEnd(4)} answers ${String(c.n).padStart(2)}  acceptable mean-of-graders ${c.mean.toFixed(1)}  both graders ${c.both}  wrong (both) ${c.wrongBoth}`);
        }
        out.push('    per item, acceptable (mean of graders, summed over 3 reps): item  T04 / TDEF / P04   [group]');
        for (const x of items) {
            const s = (arm) => { const p = cell[`${leg}.${arm}`]?.per[x.id] ?? []; return `${p.reduce((a, b) => a + b, 0).toFixed(1)}/${p.length}`; };
            out.push(`      ${x.id.padEnd(7)} ${s('T04').padStart(6)} ${s('TDEF').padStart(6)} ${s('P04').padStart(6)}   [${x.group}]`);
        }
        // consistency: items where all three reps acceptable by mean >= 0.5
        for (const arm of ['T04', 'TDEF', 'P04']) {
            const per = cell[`${leg}.${arm}`]?.per ?? {};
            const allOk = Object.values(per).filter((p) => p.length === 3 && p.every((m) => m >= 0.5)).length;
            const allBad = Object.values(per).filter((p) => p.length === 3 && p.every((m) => m < 0.5)).length;
            out.push(`    consistency ${arm.padEnd(4)}: items all-3-acceptable ${allOk}, all-3-not ${allBad}, mixed ${Object.keys(per).length - allOk - allBad}`);
        }
    }
}
fs.writeFileSync(path.join(HERE, 'analyze.out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
