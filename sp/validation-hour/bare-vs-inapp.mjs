// h40d, the 33 mains: in-app vs the bare arms (scripted question, no app context) vs the captured twins (the app's
// own prompt). Acceptable = correctness 2, on-topic 2 and delivery >= 1 (the judge's verdictOf); wrong = correctness 0 or on-topic 0 (the judge's classes).
// Reads the VH verdict files through each arm's pairs file (key -> id). Prints ids and classes only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const VH = path.dirname(fileURLToPath(import.meta.url));
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d';
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const ARMS = {
    inapp: ['interview60.judge.pairs.json', 'h40d-verdicts-inapp.json'],
    bareH: ['interview60.judge.pairs.gemini-3.5-flash-lite_high.json', 'h40d-verdicts-high.json'],
    bareL: ['interview60.judge.pairs.gemini-3.1-flash-lite_low.json', 'h40d-verdicts-low.json'],
    capH1: ['interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', 'h40d-verdicts-captured-high.json'],
    capH2: ['interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json', 'h40d-verdicts-captured-high-r2.json'],
    capH3: ['interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json', 'h40d-verdicts-captured-high-r3.json'],
};
// The judge's own classes (interview60.judge.mjs verdictOf): acceptable needs delivery >= 1 too.
const cls = (v) => (!v ? '-' : v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1 ? 'A' : v.correctness === 0 || v.on_topic === 0 ? 'X' : 'w');
const G = {};
for (const [arm, [pf, vf]] of Object.entries(ARMS)) {
    if (!fs.existsSync(path.join(VH, vf))) { console.log(`${arm}: verdicts not yet written (${vf})`); continue; }
    const P = J(path.join(R, pf)), V = J(path.join(VH, vf));
    G[arm] = {};
    for (const it of P.items) { const c = cls(V[it.key]); if (!G[arm][it.id] || c === 'A') G[arm][it.id] = c; }   // best answer per id
}
const mains = Object.keys(G.bareH ?? {}).sort();
const tot = {}; const rows = [];
for (const id of mains) {
    const row = Object.keys(G).map((a) => G[a][id] ?? '-');
    Object.keys(G).forEach((a, i) => { (tot[a] ??= { A: 0, w: 0, X: 0, '-': 0 })[row[i]]++; });
    if (row.some((c) => c !== 'A')) rows.push(`  ${id.padEnd(5)} ${row.map((c) => c.padEnd(6)).join('')}`);
}
console.log(`mains graded by the bare arms: ${mains.length}`);
console.log(`  id    ${Object.keys(G).map((a) => a.padEnd(6)).join('')}   (rows where any arm is not acceptable)`);
console.log(rows.join('\n'));
console.log('totals on these mains (A acceptable / w weak / X wrong / - none):');
for (const [a, t] of Object.entries(tot)) console.log(`  ${a.padEnd(6)} A ${t.A}  w ${t.w}  X ${t.X}  - ${t['-']}`);
if (G.inapp && G.bareH) {
    const both = mains.filter((id) => G.inapp[id] && G.inapp[id] !== '-');
    const inOnly = both.filter((id) => G.inapp[id] === 'A' && G.bareH[id] !== 'A'), bareOnly = both.filter((id) => G.inapp[id] !== 'A' && G.bareH[id] === 'A');
    console.log(`in-app vs bare 3.5-lite HIGH on the ${both.length} mains both answered: in-app acceptable where bare is not: ${inOnly.join(' ') || '-'}; bare acceptable where in-app is not: ${bareOnly.join(' ') || '-'}`);
}
