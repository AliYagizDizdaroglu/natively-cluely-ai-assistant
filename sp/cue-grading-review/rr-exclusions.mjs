// Re-review: ids + correctness only. Prints which ids score 0/1 per judge file and overlap with the pipeline list.
import fs from 'node:fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d/';
const PIPE = ['R11F', 'R02F', 'R07F', 'R31'];
const files = {
    inapp: 'interview60.judge.json',
    h1: 'interview60.judge.gemini-3.5-flash-lite_captured-high.json',
    h2: 'interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json',
    h3: 'interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json',
    l1: 'interview60.judge.gemini-3.1-flash-lite_captured-low.json',
};
for (const [k, f] of Object.entries(files)) {
    const j = JSON.parse(fs.readFileSync(R + f, 'utf8'));
    const items = Object.entries(j.items).map(([id, v]) => ({ id, correctness: v.correctness }));
    const byC = { 0: [], 1: [], 2: [] };
    for (const it of items) { const c = it.correctness; if (c in byC) byC[c].push(it.id); }
    const n = items.length;
    console.log(k, 'n', n, 'c0', byC[0].join(','), '| c1', byC[1].join(','), '| pipeline-in-c1', byC[1].filter((x) => PIPE.includes(x)).join(','), '| pipeline-in-c0', byC[0].filter((x) => PIPE.includes(x)).join(','));
}
