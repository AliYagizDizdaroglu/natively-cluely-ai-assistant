// Base-rate reading (PREREGISTER-base-rate.md step 3): unblind the two verdict files, count EASY per set and level.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));
const items = new Map(J('items.json').map((x) => [x.id, x]));
const key = J('keyhold/key.json');
const g = [J('blind/verdicts.g1.json'), J('blind/verdicts.g2.json')];
for (const [n, v] of g.entries()) {
    const ks = Object.keys(v);
    if (ks.length !== 176 || ks.some((k) => !key[k]) || ks.some((k) => !['EASY', 'HARD'].includes(v[k].v))) { console.log(`REFUSED: grader ${n + 1} verdicts malformed (${ks.length} keys)`); process.exit(2); }
}
const HOUR = { scenario50: 40 / 100, interview60: 76 / 76 };   // items per hour / items in the set (S1+S2 = 40 items in 68 min; interview60 = 92 min)
const rows = {};
const dis = [];
for (const [k, id] of Object.entries(key)) {
    const it = items.get(id); const e1 = g[0][k].v === 'EASY', e2 = g[1][k].v === 'EASY';
    const r = (rows[`${it.set}/${it.kind}`] ??= { n: 0, g1: 0, g2: 0, both: 0, either: 0, ids: [] });
    r.n++; r.g1 += e1; r.g2 += e2; r.both += e1 && e2; r.either += e1 || e2;
    if (e1 || e2) r.ids.push(`${id}${e1 && e2 ? '' : e1 ? '(g1 only)' : '(g2 only)'}`);
    if (e1 !== e2) dis.push(`${id}: g1 ${g[0][k].v} "${g[0][k].r}" / g2 ${g[1][k].v} "${g[1][k].r}"`);
}
let agree = 0; for (const k of Object.keys(key)) agree += g[0][k].v === g[1][k].v;
console.log(`agreement ${agree}/176`);
console.log('set/level'.padEnd(22), 'n'.padStart(4), 'g1'.padStart(4), 'g2'.padStart(4), 'both'.padStart(5), 'either'.padStart(7), ' ids');
for (const [name, r] of Object.entries(rows)) console.log(name.padEnd(22), String(r.n).padStart(4), String(r.g1).padStart(4), String(r.g2).padStart(4), String(r.both).padStart(5), String(r.either).padStart(7), ' ' + r.ids.join(', '));
for (const set of ['scenario50', 'interview60']) {
    const rs = Object.entries(rows).filter(([n]) => n.startsWith(set)).map(([, r]) => r);
    const both = rs.reduce((a, r) => a + r.both, 0), either = rs.reduce((a, r) => a + r.either, 0), n = rs.reduce((a, r) => a + r.n, 0);
    console.log(`${set}: BOTH-easy ${both}/${n} (${(100 * both / n).toFixed(1)}%), EITHER ${either}/${n}; per hour BOTH ${(both * HOUR[set]).toFixed(1)}, EITHER ${(either * HOUR[set]).toFixed(1)}`);
}
console.log(dis.length ? 'disagreements:\n  ' + dis.join('\n  ') : 'disagreements: none');
for (const [k, id] of Object.entries(key)) if (g[0][k].v === 'EASY' || g[1][k].v === 'EASY') console.log(`EASY item ${id}: "${items.get(id).text}"`);
