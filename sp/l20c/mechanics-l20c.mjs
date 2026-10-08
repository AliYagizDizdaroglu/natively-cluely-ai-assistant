// L20c mechanics (PREREGISTER-l20c.md condition 4, plus the reported timing): per run over the 18 items —
// answered (played, non-empty extracted answer, not a spoken system-error apology), abnormal sessions, first-word
// p50/max of the answered; pooled p50/p90 over 54 (a hole = no first word); condition 4 = at least 52 of 54.
//   node mechanics-l20c.mjs
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20c';
const IDS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8')).pairs.flat();
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const s = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : 'no answer');
export const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
const all = [];
let answeredTotal = 0;
for (const r of [1, 2, 3]) {
    const A = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${r}.answers.json`, 'utf8'));
    const R = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${r}.json`, 'utf8'));
    const answered = IDS.filter((id) => isAnswered(A[id]));
    const apologies = IDS.filter((id) => A[id]?.played && /system error/i.test(A[id].answer ?? ''));
    answeredTotal += answered.length;
    const tt = IDS.map((id) => (answered.includes(id) ? A[id].ttftMs : Infinity)).sort((a, b) => a - b);
    all.push(...tt);
    const fin = tt.filter(Number.isFinite);
    console.log(`r${r}: answered ${answered.length}/${IDS.length}${apologies.length ? ` (system-error apologies: ${apologies.join(' ')})` : ''}; holes ${IDS.filter((id) => !answered.includes(id)).join(' ') || 'none'}; abnormal sessions ${R.sessions.filter((x) => x.abnormal).length} of ${R.sessions.length}; answered first word p50 ${fin.length ? s(pct(fin, 0.5)) : '-'}, max ${fin.length ? s(Math.max(...fin)) : '-'}; window ${R.t0Iso}`);
}
all.sort((a, b) => a - b);
console.log(`pooled ${all.length}: first word p50 ${s(pct(all, 0.5))}, p90 ${s(pct(all, 0.9))} (reported, not a condition)`);
console.log(`condition 4 (reliability tonight): answered ${answeredTotal}/${IDS.length * 3}, need >= 52 -> ${answeredTotal >= 52 ? 'PASS' : 'FAIL'}`);
