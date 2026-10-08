// Throwaway, read-only: exact tallies for the misses section — per item, over h40a/h40b/h40c, the
// captured twins' acceptable count per model, and the bare arms' acceptable count (mains only: the
// bare arms answer roster text and hold no follow-ups). Counts only, from the merged judge files.
import fs from 'node:fs';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const H = { h40a: '2026-09-24T08-20-12-h40a', h40b: '2026-09-26T11-39-51-h40b', h40c: '2026-09-29T11-42-00-h40c' };
const readJ = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const HIGH = ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3'];
const LOW = ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3'];
const BARE = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite_low', 'gemini-3.5-flash-lite_high'];
function tally(id, tags, hours) {
    let acc = 0, n = 0;
    for (const h of hours) for (const t of tags) {
        const j = readJ(`${RUNS}/${H[h]}/interview60.judge.${t}.json`);
        const v = j?.items?.[id]?.verdict;
        if (!v) continue;
        n++; if (v === 'acceptable') acc++;
    }
    return `${acc}/${n}`;
}
const all = Object.keys(H);
for (const id of process.argv.slice(2)) {
    console.log(`${id}: HIGH twins all hours ${tally(id, HIGH, all)} (h40c ${tally(id, HIGH, ['h40c'])}) | LOW twins all hours ${tally(id, LOW, all)} (h40c ${tally(id, LOW, ['h40c'])}) | captured both models h40c ${tally(id, [...HIGH, ...LOW], ['h40c'])}, all hours ${tally(id, [...HIGH, ...LOW], all)} | bare arms h40a+h40b ${tally(id, BARE, ['h40a', 'h40b'])}`);
}
