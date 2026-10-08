// 3.8 Live temperature probe readout. Timing from the extracted answers (first word = after the question's audio
// ended; tonight's LT04/LTDEF interleaved per pair; LPRIOR = L20b/L20c on 2026-09-29/30). Quality from the blind
// verdicts when present: acceptable = correctness 2 and on_topic 2, mean of two graders; a hole (no answer) counts
// as not acceptable in the per-arm total and is listed. Numbers and ids only. Exploratory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const IDS = ['S2Q02', 'S2Q06F', 'S2Q07F', 'S1Q02', 'S1Q04F', 'S2Q02F', 'S2Q10F', 'S1Q02F'];
const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
const l20bIds = new Set(JSON.parse(fs.readFileSync(`${SP}/l20b/items.json`, 'utf8')).pairs.flat());
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const q = (a, p) => { const x = a.filter((v) => Number.isFinite(v)).sort((m, n) => m - n); return x.length ? x[Math.min(x.length - 1, Math.floor(x.length * p))] : null; };
const s = (v) => (v === null ? '-' : `${(v / 1000).toFixed(2)} s`);
const rec = { LT04: [], LTDEF: [], LPRIOR: [] };
for (const rep of [1, 2, 3]) {
    for (const arm of ['T04', 'TDEF']) { const A = load(path.join(HERE, 'runs', `live38-${arm}-r${rep}.answers.json`)) ?? {}; for (const id of IDS) rec[`L${arm}`].push({ id, rep, ...(A[id] ?? {}) }); }
    for (const id of IDS) { const A = load(`${SP}/${l20bIds.has(id) ? 'l20b' : 'l20c'}/runs/live38-r${rep}.answers.json`) ?? {}; rec.LPRIOR.push({ id, rep, ...(A[id] ?? {}) }); }
}
const out = ['TIMING AND SHAPE (3.8 Live; first word measured from the end of the question audio)'];
for (const [arm, r] of Object.entries(rec)) {
    const ans = r.filter(isAnswered);
    out.push(`  ${arm.padEnd(6)} answered ${ans.length}/${r.length}  first word p50 ${s(q(ans.map((x) => x.ttftMs), 0.5))}  p90 ${s(q(ans.map((x) => x.ttftMs), 0.9))}  | words p50 ${q(ans.map((x) => x.words), 0.5) ?? '-'}  | apologies ${r.filter((x) => x.played && /system error/i.test(x.answer ?? '')).length}  premature ${r.filter((x) => x.premature).length}  cap ${r.filter((x) => x.cap).length}`);
}
const app = [1, 2, 3].flatMap((rep) => IDS.map((id) => load(`${SP}/temp-bench/out/answers.high.T04.r${rep}.json`)?.[id]).filter(Boolean));
out.push(`  APP    (3.5-lite HIGH 0.4, offline text call; first token from request send, NOT comparable with Live's clock) first token p50 ${s(q(app.map((x) => x.ttft), 0.5))}, words p50 ${q(app.map((x) => x.words), 0.5)}`);
const BLIND = path.join(HERE, 'blind');
const vfiles = fs.existsSync(BLIND) ? fs.readdirSync(BLIND).filter((f) => /^verdicts\.blind-\d+\.g\d\.json$/.test(f)) : [];
if (!vfiles.length) out.push('', 'QUALITY: no verdicts yet');
else {
    const key = {}; for (const f of fs.readdirSync(BLIND).filter((f) => /^key\./.test(f))) Object.assign(key, load(path.join(BLIND, f)));
    const v = {}; for (const f of vfiles) for (const [k, x] of Object.entries(load(path.join(BLIND, f)))) (v[k] ??= []).push(x);
    const ok = (x) => x.correctness === 2 && x.on_topic === 2, bad = (x) => x.correctness === 0 || x.on_topic === 0;
    const cell = {};
    for (const [k, m] of Object.entries(key)) { const c = (cell[m.arm] ??= { n: 0, acc: 0, wrong: 0, per: {} }); const vs = v[k] ?? []; const a = vs.length ? vs.filter(ok).length / vs.length : 0; c.n++; c.acc += a; if (vs.length === 2 && vs.every(bad)) c.wrong++; (c.per[m.id] ??= []).push(a); }
    out.push('', `QUALITY (blind, frozen grader prompt; ${vfiles.length} verdict files; graded ${Object.keys(v).length} of ${Object.keys(key).length} keys)`);
    for (const arm of ['LT04', 'LTDEF', 'LPRIOR', 'APP']) { const c = cell[arm] ?? { n: 0, acc: 0, wrong: 0 }; out.push(`  ${arm.padEnd(6)} graded ${String(c.n).padStart(2)} of 24  acceptable (mean of graders) ${c.acc.toFixed(1)}  wrong (both graders) ${c.wrong}`); }
    out.push('  per item, acceptable summed over reps (graded count):  item   LT04   LTDEF  LPRIOR   APP');
    for (const id of IDS) out.push(`    ${id.padEnd(7)} ${['LT04', 'LTDEF', 'LPRIOR', 'APP'].map((a) => { const p = cell[a]?.per[id] ?? []; return `${p.reduce((x, y) => x + y, 0).toFixed(1)}/${p.length}`.padStart(7); }).join('')}`);
}
fs.writeFileSync(path.join(HERE, 'analyze.out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
