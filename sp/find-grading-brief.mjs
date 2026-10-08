// Throwaway: pull the exact prompt the s50m grading agents were dispatched with, from this session's
// transcript, so the h40a grading repeats it word for word (only paths change).
import fs from 'node:fs';
import readline from 'node:readline';

const T = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(T, 'utf8'), crlfDelay: Infinity });
const hits = [];
for await (const line of rl) {
    if (!line.includes('s50m-verdicts-')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    for (const b of o?.message?.content ?? []) {
        if (b?.type === 'tool_use' && (b.name === 'Agent' || b.name === 'Task') && JSON.stringify(b.input).includes('s50m-verdicts-')) hits.push({ at: o.timestamp, input: b.input });
    }
}
console.log(`${hits.length} grading dispatches found`);
for (const h of hits) console.log(`  ${h.at}  ${h.input.description}  model=${h.input.model ?? '(inherit)'}  bg=${h.input.run_in_background ?? '-'}  prompt ${h.input.prompt.length} chars`);
if (hits.length) {
    fs.writeFileSync(new URL('./s50m-grading-brief.txt', import.meta.url), hits[0].input.prompt);
    console.log('\n--- first dispatch prompt (saved to s50m-grading-brief.txt) ---\n' + hits[0].input.prompt);
}
