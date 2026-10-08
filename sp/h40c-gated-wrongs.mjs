// Throwaway, read-only: wrong answers per captured twin arm on the 40 gated items (outside R02F R04F
// R09F R11F R13F) and on all items, so the note compares twins and in-app on the same basis.
import fs from 'node:fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-29T11-42-00-h40c';
const EXCL = new Set(['R02F', 'R04F', 'R09F', 'R11F', 'R13F']);
for (const tag of ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3', 'gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3', '']) {
    const j = JSON.parse(fs.readFileSync(`${R}/interview60.judge${tag ? '.' + tag : ''}.json`, 'utf8'));
    const wrong = Object.entries(j.items).filter(([, v]) => v.verdict === 'wrong').map(([k, v]) => v.id ?? k);
    const gated = wrong.filter((id) => !EXCL.has(id.replace(/#\d+$/, '')));
    console.log(`${(tag || 'in-app').padEnd(40)} wrong all ${wrong.length} [${wrong.join(' ')}] | gated 40: ${gated.length} [${gated.join(' ')}] | graded ${Object.keys(j.items).length}`);
}
