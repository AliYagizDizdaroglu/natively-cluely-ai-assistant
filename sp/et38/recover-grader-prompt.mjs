// ET38 needs the SAME grader prompt L20c used (the pre-registration says: same graders, same frozen rubric). The L20c
// prompts were pasted into Agent dispatches and live only in the session transcript. This scans the transcript for
// Agent calls whose prompt names an L20c packet, writes each prompt to et38/l20c-grader-prompts/<n>.txt and prints a
// one-line head per call (description, model, length). It prints no prompt body.
//   node recover-grader-prompt.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const T = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64.jsonl';
const OUT = path.join(HERE, 'l20c-grader-prompts');
fs.mkdirSync(OUT, { recursive: true });
const rl = readline.createInterface({ input: fs.createReadStream(T, 'utf8'), crlfDelay: Infinity });
let n = 0, lines = 0;
for await (const line of rl) {
    lines++;
    if (!line.includes('packet-') || !line.includes('l20c')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const content = o?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
        if (c?.type !== 'tool_use' || c.name !== 'Agent') continue;
        const p = c.input?.prompt ?? '';
        if (!/l20c/.test(p) || !/packet-[A-D]\.json/.test(p)) continue;
        n++;
        fs.writeFileSync(path.join(OUT, `${String(n).padStart(2, '0')}.txt`), p);
        console.log(`${String(n).padStart(2, '0')}  ${o.timestamp ?? ''}  model=${c.input.model ?? '-'}  type=${c.input.subagent_type ?? '-'}  bg=${c.input.run_in_background ?? '-'}  chars=${p.length}  desc=${c.input.description ?? ''}`);
    }
}
console.log(`${lines} transcript lines; ${n} grader dispatch(es) written to ${OUT}`);
