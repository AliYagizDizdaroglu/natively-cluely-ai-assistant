// Throwaway: per-answer breakdown by route and model, with grader reasons for weak/wrong (local reading only, not committed).
import fs from 'fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-07T00-22-47-router-default-r1/';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/grade/verdicts/';
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const cat = (vs) => vs.some((v) => v.correctness === 0) ? 'WRONG' : vs.every((v) => v.correctness === 2 && v.on_topic === 2) ? 'ok' : 'WEAK';
const pairs = J(R + 'interview60.judge.pairs.json'); const items = pairs.items || pairs;
console.log('in-app pair keys:', Object.keys(items[0]).join(','));
const g1 = J(G + 'verdicts.inapp.g1.json'), g2 = J(G + 'verdicts.inapp.g2.json');
const tally = {};
for (const p of items) {
  const vs = [g1[p.id], g2[p.id]].filter(Boolean); const c = cat(vs);
  const key = `${p.kind}|${p.source}|${p.model}`; (tally[key] ??= { ok: 0, WEAK: 0, WRONG: 0 })[c]++;
  if (c !== 'ok') console.log(`INAPP ${p.id} ${p.kind} src=${p.source} model=${p.model} ${c} g1=${vs[0]?.correctness}/${vs[0]?.on_topic} g2=${vs[1]?.correctness}/${vs[1]?.on_topic}\n   g1: ${vs[0]?.reason}\n   g2: ${vs[1]?.reason}`);
}
console.log('IN-APP TALLY'); for (const [k, t] of Object.entries(tally)) console.log('  ', k, JSON.stringify(t));
for (const arm of ['high', 'low']) {
  const v = J(G + `verdicts.${arm}.json`); const t = { ok: 0, WEAK: 0, WRONG: 0 };
  for (const [id, x] of Object.entries(v)) { const c = cat([x]); t[c]++; if (c !== 'ok') console.log(`ARM ${arm} ${id} ${c} ${x.correctness}/${x.on_topic}: ${x.reason}`); }
  console.log(`ARM ${arm} TALLY`, JSON.stringify(t));
}
const key = J('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/keyhold/key-rd.json');
const blind = {};
for (const b of Object.keys(key)) for (const g of ['g1', 'g2']) { const v = J(G + `verdicts.${b}.${g}.json`);
  for (const [q, m] of Object.entries(key[b])) for (const arm of m.arms) ((blind[`${m.id}|${arm}`] ??= { id: m.id, arm, route: m.route, vs: [] }).vs.push(v[q])); }
const bt = {};
for (const x of Object.values(blind)) { const c = cat(x.vs); (bt[`${x.arm}|${x.route}`] ??= { ok: 0, WEAK: 0, WRONG: 0 })[c]++;
  if (c !== 'ok') console.log(`BLIND ${x.id} arm=${x.arm} route=${x.route} ${c} ${x.vs.map((v) => v.correctness + '/' + v.on_topic).join(' ')}\n   ${x.vs.map((v) => v.reason).join('\n   ')}`); }
console.log('BLIND TALLY'); for (const [k, t] of Object.entries(bt)) console.log('  ', k, JSON.stringify(t));
