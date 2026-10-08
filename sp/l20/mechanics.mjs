// L20: the conditions that do not need grades — answered/holes per run, drops per run, and the pre-registered
// speed condition on the pooled 60 answers (a hole counts as no first word: Infinity).
//   node mechanics.mjs
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const items = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const IDS = items.pairs.flat();
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const all = [];
for (const r of [1, 2, 3]) {
    const A = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${r}.answers.json`, 'utf8'));
    const R = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${r}.json`, 'utf8'));
    const answered = IDS.filter((id) => A[id]?.played && A[id].answer?.trim());
    const tt = IDS.map((id) => (answered.includes(id) ? A[id].ttftMs : Infinity)).sort((a, b) => a - b);
    all.push(...tt);
    const drops = R.sessions.filter((x) => x.abnormal).length;
    const fin = tt.filter(Number.isFinite);
    console.log(`r${r}: answered ${answered.length}/20 (hard ${answered.filter((id) => items.hard.flat().includes(id)).length}/10, normal ${answered.filter((id) => items.normal.flat().includes(id)).length}/10); abnormal sessions ${drops} of ${R.sessions.length}; answered first word p50 ${(pct(fin, .5) / 1000).toFixed(1)} s, max ${(Math.max(...fin) / 1000).toFixed(1)} s; window ${R.t0Iso}`);
}
all.sort((a, b) => a - b);
const s = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : 'no answer');
console.log(`pooled 60: p50 ${s(pct(all, .5))} (bar 6.8 s), p90 ${s(pct(all, .9))} (bar 9.4 s) -> speed ${pct(all, .5) <= 6812 && pct(all, .9) <= 9441 ? 'PASS' : 'FAIL'}`);
