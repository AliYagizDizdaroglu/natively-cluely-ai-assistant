// Throwaway: per-item A vs B counts from the graded blind files, using the judge's own verdictOf.
import fs from 'node:fs';
import { verdictOf } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.judge.mjs';
const B = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-replay/blind';
const rows = {};
for (const n of [1, 2, 3]) {
    const key = JSON.parse(fs.readFileSync(`${B}/key.blind-${n}.json`, 'utf8'));
    const v = JSON.parse(fs.readFileSync(`${B}/verdicts.blind-${n}.json`, 'utf8'));
    for (const [k, s] of Object.entries(v)) {
        const { arm, id } = key[k];
        const r = (rows[id] ??= { A: [], B: [] });
        r[arm].push(verdictOf(s));
    }
}
const sym = { acceptable: 'Y', weak: 'w', wrong: 'X' };
let tot = { A: 0, B: 0 };
for (const id of Object.keys(rows).sort()) {
    const r = rows[id];
    const a = r.A.filter((x) => x === 'acceptable').length, b = r.B.filter((x) => x === 'acceptable').length;
    tot.A += a; tot.B += b;
    console.log(`${id.padEnd(7)} A ${r.A.map((x) => sym[x]).join('')} (${a})   B ${r.B.map((x) => sym[x]).join('')} (${b})   ${b - a >= 0 ? '+' : ''}${b - a}`);
}
console.log(`total acceptable A ${tot.A} B ${tot.B}`);
