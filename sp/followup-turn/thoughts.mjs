// Numbers only: design 2's paired thoughtsTokenCount B-A, TTFT, words per item, both days.
import fs from 'node:fs';
const P = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes/';
const days = { thu: P + '2026-10-01-followup-questions/', sat: P + '2026-10-03-followup-questions/' };
const load = (dir, arm, r) => JSON.parse(fs.readFileSync(`${dir}interview60.answers.gemini-3.5-flash-lite_fquestions-${arm}-r${r}.json`, 'utf8'));
const first = load(days.sat, 'A', 1);
const shape = (v, d = 0) => Array.isArray(v) ? `[${v.length}] ${shape(v[0], d + 1)}` : v && typeof v === 'object' ? (d > 3 ? '{…}' : `{${Object.keys(v).slice(0, 25).map(k => k + ':' + (typeof v[k] === 'string' ? `s${v[k].length}` : shape(v[k], d + 1))).join(', ')}}`) : typeof v;
void shape;
const med = (a) => { const s = [...a].filter(Number.isFinite).sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const all = { th: [], tt: [], w: [] }; const four = { th: [], tt: [], w: [] };
const FOUR = new Set(['S1Q04F', 'S1Q06F', 'S2Q05F', 'S2Q08F']);
for (const [day, dir] of Object.entries(days)) {
  const per = {};
  for (let r = 1; r <= 3; r++) {
    const A = load(dir, 'A', r), B = load(dir, 'B', r);
    for (const id of Object.keys(B)) {
      if (!A[id]) continue;
      const d = { th: (B[id].thoughts ?? NaN) - (A[id].thoughts ?? NaN), tt: B[id].ttft - A[id].ttft, w: B[id].words - A[id].words };
      (per[id] ??= []).push(d);
      for (const k of ['th', 'tt', 'w']) { all[k].push(d[k]); if (FOUR.has(id)) four[k].push(d[k]); }
    }
  }
  console.log(`\n${day}`);
  for (const [id, ds] of Object.entries(per)) console.log(`  ${id}: thoughts B-A ${ds.map(d => d.th).join(',')}  ttft B-A ${ds.map(d => d.tt).join(',')}  words B-A ${ds.map(d => d.w).join(',')}`);
}
console.log(`\nALL pairs n=${all.th.length}: median thoughts B-A ${med(all.th)}, ttft ${med(all.tt)}, words ${med(all.w)}`);
console.log(`FOUR new-gated items n=${four.th.length}: median thoughts B-A ${med(four.th)}, ttft ${med(four.tt)}, words ${med(four.w)}`);
console.log(`FOUR ttft deltas sorted: ${[...four.tt].sort((a,b)=>a-b).join(',')}`);
