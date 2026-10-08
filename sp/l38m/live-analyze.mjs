// Readout of the Opus grading of 3.8 Live's own replies in L38M, beside the pipeline's (3.5-lite HIGH) grades on the
// SAME ids (blind/verdicts.g1/.g2 via keyhold/pipeline-key.json, the same frozen instrument). Acceptable = correctness
// 2 and on_topic 2 by BOTH graders; wrong = correctness 0 or on_topic 0 by both. Latency: Live first word after the
// question audio ended (answers.json ttftMs); pipeline first token from request send (runs/pipeline.json), a different
// clock (an offline text call that starts once the question text exists). Numbers and ids only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const lk = J('keyhold/live-key.json'), g = [J('blind/live.verdicts.g1.json'), J('blind/live.verdicts.g2.json')];
const pk = J('keyhold/pipeline-key.json'), pg = [J('blind/verdicts.g1.json'), J('blind/verdicts.g2.json')];
const ok = (s) => s && s.correctness === 2 && s.on_topic === 2, bad = (s) => s && (s.correctness === 0 || s.on_topic === 0);
const pipeById = {}; for (const [k, id] of Object.entries(pk)) pipeById[id] = { acc: pg.every((v) => ok(v[k])), wrong: pg.every((v) => bad(v[k])) };
const P = J('runs/pipeline.json'); const precs = Object.entries(P.records).map(([id, r]) => ({ id, ...r }));
const pTtft = {}; for (const r of precs) if (r?.id) pTtft[r.id] = r.ttft ?? r.ttftMs ?? null;
const q = (a, p) => { const x = a.filter(Number.isFinite).sort((m, n) => m - n); return x.length ? x[Math.min(x.length - 1, Math.floor(x.length * p))] : null; };
const s = (v) => (v === null ? '-' : `${(v / 1000).toFixed(1)} s`);
const rows = Object.entries(lk).map(([k, m]) => ({ ...m, acc: g.every((v) => ok(v[k])), wrong: g.every((v) => bad(v[k])), agree: ok(g[0][k]) === ok(g[1][k]), reason: [g[0][k]?.reason, g[1][k]?.reason] }));
const out = [`graded ${rows.length}; grader agreement on acceptable ${rows.filter((r) => r.agree).length}/${rows.length}`];
for (const v of ['v1', 'v2']) {
    out.push('', `${v === 'v1' ? 'V1 one continuous session' : 'V2 one session per chain'}`);
    for (const cls of ['E', 'QF', 'AF', 'H', 'HF']) {
        const r = rows.filter((x) => x.variant === v && x.cls === cls);
        if (!r.length) continue;
        const pipeSame = r.map((x) => pipeById[x.id]);
        out.push(`  ${cls.padEnd(2)} replies ${String(r.length).padStart(2)}  acceptable (both) ${r.filter((x) => x.acc).length}  wrong (both) ${r.filter((x) => x.wrong).length}  | first word p50 ${s(q(r.map((x) => x.ttftMs), 0.5))} p90 ${s(q(r.map((x) => x.ttftMs), 0.9))}  | pipeline on the same ids: acceptable ${pipeSame.filter((p) => p?.acc).length}/${r.length}, first token p50 ${s(q(r.map((x) => pTtft[x.id]), 0.5))}`);
    }
}
out.push('', 'not acceptable by both graders (variant id class label: g1 reason | g2 reason):');
for (const r of rows.filter((x) => !x.acc).sort((a, b) => a.variant.localeCompare(b.variant) || a.id.localeCompare(b.id))) out.push(`  ${r.variant} ${r.id.padEnd(5)} ${r.cls.padEnd(2)} ${r.label.padEnd(6)} ${r.wrong ? 'WRONG ' : ''}${String(r.reason[0]).slice(0, 90)} | ${String(r.reason[1]).slice(0, 90)}`);
fs.writeFileSync(path.join(HERE, 'live-analyze.out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
