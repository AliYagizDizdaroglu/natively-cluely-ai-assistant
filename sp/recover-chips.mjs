// Prints the follow-up chips (spawn_task calls) this session created: when, title, and the prompt each spawned session
// was given. Used to know what a peer session started from a chip was told to do and where.
//   node recover-chips.mjs [<title substring>]
import fs from 'node:fs';
import readline from 'node:readline';
const T = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64.jsonl';
const want = process.argv[2]?.toLowerCase();
const rl = readline.createInterface({ input: fs.createReadStream(T, 'utf8'), crlfDelay: Infinity });
let n = 0;
for await (const line of rl) {
    if (!line.includes('spawn_task')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const content = o?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
        if (c?.type !== 'tool_use' || !/spawn_task$/.test(c.name ?? '')) continue;
        n++;
        const title = c.input?.title ?? '';
        if (want && !title.toLowerCase().includes(want)) { console.log(`${o.timestamp}  ${title}`); continue; }
        console.log(`\n===== ${o.timestamp}  ${title}\ncwd: ${c.input?.cwd ?? '(default: this project)'}\ntldr: ${c.input?.tldr ?? ''}\n----- prompt\n${c.input?.prompt ?? ''}`);
    }
}
console.log(`\n${n} chip(s) in the transcript`);
