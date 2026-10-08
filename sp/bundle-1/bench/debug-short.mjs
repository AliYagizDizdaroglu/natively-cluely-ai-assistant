// Throwaway debug (local reading only): for the short-answer ids, per arm and rep: key-in-first-5, words, and the first 12 words.
import fs from 'fs';
import { SH, SH1, NOCUE_IDS } from './common.mjs';
import { hasKey } from './bars.mjs';
const R = (f) => JSON.parse(fs.readFileSync(new URL('./runs/' + f + '.json', import.meta.url), 'utf8'));
const runs = { C: [R('b1c1'), R('b1c2'), R('b1c3')], T: [R('b1t1'), R('b1t2'), R('b1t3')] };
const items = (r) => { const a = r.answers ?? r.items ?? r; return Array.isArray(a) ? Object.fromEntries(a.map((x) => [x.id, x])) : a; };
for (const arm of ['C', 'T']) runs[arm] = runs[arm].map(items);
console.log('SH', SH.length, 'SH1', SH1.length, 'SH in nocue', SH.filter((i) => NOCUE_IDS.includes(i)).length);
for (const id of SH) {
  const row = ['C', 'T'].map((a) => runs[a].map((r) => { const s = r[id]?.spoken ?? ''; return `${hasKey(id, s) ? 'K' : '-'}${s.split(/\s+/).filter(Boolean).length}`; }).join(' ')).join(' | ');
  const t = (runs.T[0][id]?.spoken ?? '').split(/\s+/).slice(0, 12).join(' ');
  const c = (runs.C[0][id]?.spoken ?? '').split(/\s+/).slice(0, 12).join(' ');
  console.log(`${id}${SH1.includes(id) ? '*' : ' '} C ${row}\n   C1: ${c}\n   T1: ${t}`);
}
