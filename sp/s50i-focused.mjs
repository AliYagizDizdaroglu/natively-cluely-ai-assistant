// Throwaway: the five focused questions (the ones the app has historically failed), across every
// graded arm. The big Flash models only answered these, so this is the only fair comparison to
// the lites. R = right, w = weak, X = wrong, - = the arm did not answer it.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { verdictOf } = await import(`file:///${path.join(PROJ, 'electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);
const IDS = ['S1Q02', 'S1Q06', 'S2Q07', 'S2Q09', 'S2Q10'];
const ARMS = ['inapp', 'captured-low', 'captured-high', 'low', 'high', 'bare31', 'bare35', 'captured-minimal', 'flash35', 'flash36', 'flash38'];
const mark = { acceptable: 'R', weak: 'w', wrong: 'X' };
console.log(`arm                 ${IDS.map((i) => i.padEnd(7)).join('')}  score`);
for (const tag of ARMS) {
    const f = path.join(HERE, `s50i-verdicts-${tag}.json`);
    if (!fs.existsSync(f)) continue;
    const v = JSON.parse(fs.readFileSync(f, 'utf8'));
    const cells = IDS.map((id) => (v[id] ? mark[verdictOf(v[id])] : '-'));
    const answered = cells.filter((c) => c !== '-').length;
    console.log(`${tag.padEnd(18)}  ${cells.map((c) => c.padEnd(7)).join('')}  ${cells.filter((c) => c === 'R').length}/${answered}`);
}
