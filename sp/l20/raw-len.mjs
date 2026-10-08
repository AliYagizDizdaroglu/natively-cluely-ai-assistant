// Throwaway: how long is a 3.8 Flash answer's raw output (what is billed as output besides thinking)?
// Mean raw characters over the recorded 3.8 Flash answers, and the same for 3.1 Flash-Lite captured-low.
import fs from 'node:fs';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const runs = ['2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m'];
for (const m of ['gemini-3.8-flash', 'gemini-3.1-flash-lite_captured-low']) {
    const lens = [];
    for (const d of runs) {
        const f = `${G}/${d}/interview60.answers.${m}.json`;
        if (!fs.existsSync(f)) continue;
        for (const r of Object.values(JSON.parse(fs.readFileSync(f, 'utf8')))) if (r?.spoken && typeof r.rawLen === 'number') lens.push(r.rawLen);
    }
    const mean = lens.reduce((s, x) => s + x, 0) / lens.length;
    console.log(`${m}: ${lens.length} answers, raw output mean ${mean.toFixed(0)} chars (~${(mean / 4).toFixed(0)} tokens at 4 chars/token), max ${Math.max(...lens)}`);
}
