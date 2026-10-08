// Readout of the smaller 3.8 Live ET probe: timing from the extracted answers (first word after the question audio
// ended; last word; thinking tokens from the session usage events), apologies/holes, and quality from the blind
// verdicts (acceptable = correctness 2 and on_topic 2, mean of two graders; a hole counts as not acceptable and is
// listed). Compared inside the same blind files with tonight's plain Live and the app's 3.5-lite. Numbers and ids.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const IDS = ['S2Q02', 'S2Q06F', 'S2Q07F', 'S1Q02', 'S1Q04F', 'S2Q02F', 'S2Q10F', 'S1Q02F'];
const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const q = (a, p) => { const x = a.filter(Number.isFinite).sort((m, n) => m - n); return x.length ? x[Math.min(x.length - 1, Math.floor(x.length * p))] : null; };
const s = (v) => (v === null ? '-' : `${(v / 1000).toFixed(1)} s`);
const rec = { ETLOW: [], ETMED: [], LIVE: [] };
for (const arm of ['LOW', 'MED']) { const A = load(path.join(HERE, 'runs', `live38et-${arm}-r1.answers.json`)) ?? {}; for (const id of IDS) rec[`ET${arm}`].push({ id, ...(A[id] ?? {}) }); }
for (const rep of [1, 2, 3]) { const A = load(`${SP}/temp-live/runs/live38-TDEF-r${rep}.answers.json`) ?? {}; for (const id of IDS) rec.LIVE.push({ id, rep, ...(A[id] ?? {}) }); }
const out = ['TIMING (first word / last word after the question audio ended)'];
for (const [arm, r] of Object.entries(rec)) {
    const a = r.filter(isAnswered);
    out.push(`  ${arm.padEnd(5)} answered ${a.length}/${r.length}  apologies ${r.filter((x) => x.played && /system error/i.test(x.answer ?? '')).map((x) => x.id).join(' ') || '-'}  first word p50 ${s(q(a.map((x) => x.ttftMs), 0.5))} max ${s(q(a.map((x) => x.ttftMs), 1))}  last word p50 ${s(q(a.map((x) => x.lastWordMs), 0.5))}  thinking p50 ${q(a.map((x) => x.thoughts), 0.5) ?? '-'}  words p50 ${q(a.map((x) => x.words), 0.5) ?? '-'}`);
}
const BLIND = path.join(HERE, 'blind');
const vfiles = fs.existsSync(BLIND) ? fs.readdirSync(BLIND).filter((f) => /^verdicts\.blind-\d+\.g\d\.json$/.test(f)) : [];
if (!vfiles.length) out.push('', 'QUALITY: no verdicts yet');
else {
    const key = {}; for (const f of fs.readdirSync(BLIND).filter((f) => /^key\./.test(f))) Object.assign(key, load(path.join(BLIND, f)));
    const v = {}; for (const f of vfiles) for (const [k, x] of Object.entries(load(path.join(BLIND, f)))) (v[k] ??= []).push(x);
    const ok = (x) => x.correctness === 2 && x.on_topic === 2, bad = (x) => x.correctness === 0 || x.on_topic === 0;
    const cell = {};
    for (const [k, m] of Object.entries(key)) { const c = (cell[m.arm] ??= { n: 0, acc: 0, wrong: 0, per: {} }); const vs = v[k] ?? []; const a = vs.length ? vs.filter(ok).length / vs.length : 0; c.n++; c.acc += a; if (vs.length === 2 && vs.every(bad)) c.wrong++; (c.per[m.id] ??= []).push(a); }
    const of = { ETLOW: 8, ETMED: 8, LIVE: 24, APP: 24 };
    out.push('', `QUALITY (blind, frozen grader prompt, ${vfiles.length} verdict files; graded ${Object.keys(v).length} of ${Object.keys(key).length})`);
    for (const arm of ['ETLOW', 'ETMED', 'LIVE', 'APP']) { const c = cell[arm] ?? { n: 0, acc: 0, wrong: 0 }; out.push(`  ${arm.padEnd(5)} graded ${c.n} of ${of[arm]}  acceptable ${c.acc.toFixed(1)} (rate ${(c.acc / of[arm]).toFixed(2)}, holes count as not)  wrong (both) ${c.wrong}`); }
    out.push('  per item, acceptable summed (graded count):  item   ETLOW  ETMED   LIVE    APP');
    for (const id of IDS) out.push(`    ${id.padEnd(7)} ${['ETLOW', 'ETMED', 'LIVE', 'APP'].map((a) => { const p = cell[a]?.per[id] ?? []; return `${p.reduce((x, y) => x + y, 0).toFixed(1)}/${p.length}`.padStart(7); }).join('')}`);
}
fs.writeFileSync(path.join(HERE, 'analyze.out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
