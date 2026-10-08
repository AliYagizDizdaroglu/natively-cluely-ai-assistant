// Throwaway (rev 3, m6): correctness-0 and correctness-1 ids per gating judge file. Prints ids and counts only.
import fs from 'node:fs';
const dir = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d';
const files = ['interview60.judge.json', 'interview60.judge.gemini-3.5-flash-lite_captured-high.json',
    'interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json', 'interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json',
    'interview60.judge.gemini-3.1-flash-lite_captured-low.json'];
for (const f of files) {
    const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
    const it = j.items;
    const ents = Array.isArray(it) ? it.map((x) => [x.id, x]) : Object.entries(it);
    const c = (v) => ents.filter(([, x]) => x && x.correctness === v).map(([k]) => k);
    console.log(f.replace('interview60.judge', ''), `n=${ents.length}`, `c0=${JSON.stringify(c(0))}`, `c1=${JSON.stringify(c(1))}`);
}
