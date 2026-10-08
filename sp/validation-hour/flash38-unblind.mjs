// Unblinds the 3.8 Flash sidecar: per id and arm, both graders' correctness/on-topic/delivery and acceptable
// (correctness 2 and on-topic 2); per arm totals; 3.8 Flash vs in-app better/same/worse by the sum of the two
// graders' correctness. TTFTs: 3.8 Flash and the twins offline (answers files), in-app the screen clock is not comparable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const R = `${G}/interview60.runs/2026-10-02T11-39-41-h40d`;
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const key = J(path.join(HERE, 'keyhold-flash38-key.json'));
const V = ['A', 'B'].map((g) => J(path.join(HERE, `flash38-verdicts-${g}.json`)));
for (const v of V) if (Object.keys(key).some((k) => !v[k])) { console.log('REFUSED: verdicts incomplete'); process.exit(2); }
const F = J(`${G}/interview60.answers.gemini-3.8-flash_flash38.json`);
const H = J(`${R}/interview60.answers.gemini-3.5-flash-lite_captured-high.json`), L = J(`${R}/interview60.answers.gemini-3.1-flash-lite_captured-low.json`);
const s = {}; for (const [k, tag] of Object.entries(key)) { const [id, arm] = tag.split('|'); (s[id] ??= {})[arm] = V.map((v) => v[k]); }
const acc = (x) => x.correctness === 2 && x.on_topic === 2;
const arms = ['inapp', 'flash38', 'high', 'low'], names = { inapp: 'in-app (as shown)', flash38: '3.8 Flash', high: '3.5-lite HIGH r1', low: '3.1-lite LOW r1' };
const tot = Object.fromEntries(arms.map((a) => [a, { both: 0, either: 0, wrong: 0 }]));
console.log('id     ' + arms.map((a) => names[a].padEnd(20)).join(''));
for (const id of Object.keys(s)) {
    let line = id.padEnd(7);
    for (const a of arms) {
        const g = s[id][a]; const t = tot[a];
        t.both += g.every(acc); t.either += g.some(acc); t.wrong += g.some((x) => x.correctness === 0);
        line += `${g.map((x) => `${x.correctness}${x.on_topic}${x.delivery}`).join('/')} ${g.every(acc) ? 'ACC' : g.some(acc) ? 'split' : g.some((x) => x.correctness === 0) ? 'WRONG' : 'weak'}`.padEnd(20);
    }
    const c = (a) => s[id][a].reduce((n, x) => n + x.correctness, 0);
    line += ` flash vs in-app: ${c('flash38') > c('inapp') ? 'BETTER' : c('flash38') < c('inapp') ? 'worse' : 'same'}`;
    console.log(line);
}
console.log('\ntotals over ' + Object.keys(s).length + ' items (acceptable by both / by either / wrong by any grader):');
for (const a of arms) console.log(`  ${names[a].padEnd(20)} ${tot[a].both} / ${tot[a].either} / ${tot[a].wrong}`);
const med = (a) => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; };
const ids = Object.keys(s);
console.log(`\nfirst token, offline, these items: 3.8 Flash median ${med(ids.map((i) => F[i].ttftMs ?? F[i].ttft))} ms; 3.5-lite HIGH r1 ${med(ids.map((i) => H[i].ttftMs ?? H[i].ttft))} ms; 3.1-lite LOW r1 ${med(ids.map((i) => L[i].ttftMs ?? L[i].ttft))} ms`);
