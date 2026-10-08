// recover-crons.mjs — the Claude app restart dropped session crons. Pull every CronCreate call's
// exact input (cron + prompt) out of this session's transcript so the lost ones can be recreated
// word for word. Writes them to recovered-crons.json beside this script and prints a summary.
import fs from 'node:fs';
import readline from 'node:readline';

const T = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64.jsonl';
const OUT = new URL('./recovered-crons.json', import.meta.url);
const found = [];
const rl = readline.createInterface({ input: fs.createReadStream(T, 'utf8'), crlfDelay: Infinity });
for await (const line of rl) {
    if (!line.includes('CronCreate')) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const content = o?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
        if (b?.type === 'tool_use' && b.name === 'CronCreate') found.push({ at: o.timestamp, id: b.id, ...b.input });
    }
}
fs.writeFileSync(OUT, JSON.stringify(found, null, 1));
for (const f of found) console.log(`${f.at}  cron="${f.cron}"  recurring=${f.recurring}  prompt ${f.prompt?.length ?? 0} chars: ${String(f.prompt ?? '').slice(0, 90).replace(/\s+/g, ' ')}…`);
console.log(`\n${found.length} CronCreate call(s) → ${OUT.pathname}`);
