// Throwaway: after6 → after7 per-question verdict diff, delivery-score drift, and
// length vs verdict. usage: node after7-diff.mjs <root> <after6Dir> <after7Dir>
import fs from 'node:fs';
import path from 'node:path';
const [root, a6, a7] = process.argv.slice(2);
const load = (dir) => {
    const v = JSON.parse(fs.readFileSync(path.join(root, dir, 'interview60.judge.verdicts.json'), 'utf8'));
    const p = JSON.parse(fs.readFileSync(path.join(root, dir, 'interview60.judge.pairs.json'), 'utf8'));
    const items = p.items ?? Object.values(p).find(Array.isArray);
    return { v, items };
};
const cls = (r) => (r.correctness === 0 || r.on_topic === 0) ? 'wrong' : (r.correctness === 2 && r.on_topic === 2 && r.delivery >= 1) ? 'acceptable' : 'weak';
const spoken = (k) => /^[WMH]\d\d(#\d)?$/.test(k);
const A = load(a6), B = load(a7);
const summary = (X) => { const c = { acceptable: 0, weak: 0, wrong: 0, d2: 0, d1: 0, d0: 0, n: 0 }; for (const [k, r] of Object.entries(X.v)) { if (!spoken(k) || k.includes('#')) continue; c.n++; c[cls(r)]++; c['d' + r.delivery]++; } return c; };
console.log('after6 (first answer per question):', JSON.stringify(summary(A)));
console.log('after7 (first answer per question):', JSON.stringify(summary(B)));
console.log('--- per-question changes (after6 → after7), first answer per question');
const ids = [...new Set([...Object.keys(A.v), ...Object.keys(B.v)].filter((k) => spoken(k) && !k.includes('#')))].sort();
let improved = 0, regressed = 0;
for (const id of ids) {
    const ra = A.v[id], rb = B.v[id]; if (!ra || !rb) continue;
    const ca = cls(ra), cb = cls(rb);
    if (ca !== cb) { const dir = (cb === 'acceptable' || (cb === 'weak' && ca === 'wrong')) ? 'IMPROVED' : 'REGRESSED'; if (dir === 'IMPROVED') improved++; else regressed++; console.log(`  ${id} ${ca} → ${cb}  (${dir})  after7: c${rb.correctness} t${rb.on_topic} d${rb.delivery} — ${rb.reason}`); }
}
console.log(`  improved ${improved}, regressed ${regressed}`);
console.log('--- after7 non-acceptable (all keys):');
for (const [k, r] of Object.entries(B.v)) { if (!spoken(k)) continue; if (cls(r) === 'acceptable') continue; const it = B.items.find((i) => i.key === k) ?? {}; const w = (it.answer ?? '').match(/\S+/g)?.length ?? 0; console.log(`  ${k} ${cls(r)} c${r.correctness} t${r.on_topic} d${r.delivery} words=${w} heard=${JSON.stringify((it.heard ?? '').slice(0, 50))} — ${r.reason}`); }
console.log('--- after7 words vs verdict (first answers):');
const byCls = {};
for (const [k, r] of Object.entries(B.v)) { if (!spoken(k) || k.includes('#')) continue; const it = B.items.find((i) => i.key === k) ?? {}; const w = (it.answer ?? '').match(/\S+/g)?.length ?? 0; (byCls[cls(r)] ??= []).push(w); }
for (const [c, a] of Object.entries(byCls)) { const s = [...a].sort((x, y) => x - y); console.log(`  ${c}: n=${a.length} words p50 ${s[Math.floor((s.length - 1) / 2)]} min ${s[0]} max ${s[s.length - 1]}`); }
console.log('--- delivery by length band (after7 first answers): ≤80 / 81–100 / 101+');
const bands = { '≤80': [], '81–100': [], '101+': [] };
for (const [k, r] of Object.entries(B.v)) { if (!spoken(k) || k.includes('#')) continue; const it = B.items.find((i) => i.key === k) ?? {}; const w = (it.answer ?? '').match(/\S+/g)?.length ?? 0; (w <= 80 ? bands['≤80'] : w <= 100 ? bands['81–100'] : bands['101+']).push(r.delivery); }
for (const [b, a] of Object.entries(bands)) console.log(`  ${b}: n=${a.length} d2=${a.filter((x) => x === 2).length} d1=${a.filter((x) => x === 1).length} d0=${a.filter((x) => x === 0).length}`);
