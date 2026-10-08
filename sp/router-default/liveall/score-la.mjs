// Throwaway scorer for the Live-all comparison (reported only). r1's rule (score-rd.mjs:36-37):
// acceptable = both graders correctness 2 and on_topic 2; wrong = either grader correctness 0; else weak.
// Refuses if a verdict file is missing or does not cover every packet item. Prints ids, counts and grader reasons.
import fs from 'fs';
const LA = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/';
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const key = J(LA + 'keyhold/key-liveall.json')['la-1'];
const v = {};
for (const g of ['g1', 'g2']) {
  const f = LA + `liveall/grade/verdicts/verdicts.la-1.${g}.json`;
  if (!fs.existsSync(f)) { console.log(`REFUSED: missing ${f}`); process.exit(2); }
  v[g] = J(f);
  const miss = Object.keys(key).filter((q) => !v[g][q]);
  if (miss.length) { console.log(`REFUSED: ${g} lacks ${miss.length} items`); process.exit(2); }
}
// r1 shown source per id: blind key of r1 — ids that carry an L arm were shown by Live
const rdKey = J(LA + 'keyhold/key-rd.json');
const liveShown = new Set();
for (const b of Object.values(rdKey)) for (const m of Object.values(b)) if (m.arms?.includes('L')) liveShown.add(m.id);
const cat = (a, b) => (a.correctness === 0 || b.correctness === 0) ? 'wrong' : (a.correctness === 2 && a.on_topic === 2 && b.correctness === 2 && b.on_topic === 2) ? 'ok' : 'weak';
const T = {}, per = {};
for (const [q, m] of Object.entries(key)) {
  const c = cat(v.g1[q], v.g2[q]);
  const grp = m.level === 'followup' ? 'followup' : m.class === 'H' ? 'hard-main' : 'easy-main';
  for (const k of [`${m.arm}|all`, `${m.arm}|${grp}`, m.arm === 'INAPP' ? `INAPP-shown-${liveShown.has(m.id) ? 'live' : 'pipeline'}|all` : null].filter(Boolean)) (T[k] ??= { ok: 0, weak: 0, wrong: 0 })[c]++;
  (per[m.id] ??= {})[m.arm] = { c, r: [v.g1[q].reason, v.g2[q].reason] };
}
console.log('TALLY (acceptable / weak / wrong)');
for (const k of Object.keys(T).sort()) console.log(`  ${k.padEnd(28)} ${T[k].ok} / ${T[k].weak} / ${T[k].wrong}`);
let la = 0, ia = 0, both = 0;
for (const [id, x] of Object.entries(per)) { if (x.LIVEALL?.c === 'ok') la++; if (x.INAPP?.c === 'ok') ia++; if (x.LIVEALL?.c === 'ok' && x.INAPP?.c === 'ok') both++; }
console.log(`PAIRED on ${Object.keys(per).length} ids: Live-all acceptable ${la}, in-app ${ia}, both ${both}`);
console.log('NOT ACCEPTABLE (id arm category: g1 | g2 reasons)');
for (const [id, x] of Object.entries(per)) for (const [arm, y] of Object.entries(x)) if (y.c !== 'ok') console.log(`  ${id} ${arm} ${y.c}${arm === 'INAPP' ? ' (r1 shown ' + (liveShown.has(id) ? 'live' : 'pipeline') + ')' : ''}: ${y.r[0]} | ${y.r[1]}`);
