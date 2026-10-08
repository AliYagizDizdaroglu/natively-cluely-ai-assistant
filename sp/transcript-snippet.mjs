// Throwaway, read-only: print the text around a phrase in this session's transcript (JSON-unescaped),
// for recovering a plan written before a compaction.
//   node transcript-snippet.mjs "<phrase>" [before=400] [after=1200] [maxHits=2]
import fs from 'node:fs';
const file = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64.jsonl';
const [phrase, before = 400, after = 1200, maxHits = 2] = process.argv.slice(2);
let hits = 0;
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes(phrase.slice(0, 20))) continue;
    let text = line;
    try { text = JSON.stringify(JSON.parse(line)).replace(/\\n/g, '\n').replace(/\\"/g, '"'); } catch { /* raw */ }
    let i = text.indexOf(phrase);
    while (i >= 0 && hits < Number(maxHits)) {
        console.log(`--- hit ${++hits}`);
        console.log(text.slice(Math.max(0, i - Number(before)), i + Number(after)));
        i = text.indexOf(phrase, i + phrase.length);
    }
    if (hits >= Number(maxHits)) break;
}
