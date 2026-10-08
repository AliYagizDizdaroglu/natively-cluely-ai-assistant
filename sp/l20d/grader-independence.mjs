// (L20d: copy of l20c/grader-independence.mjs, unchanged in logic; a grader that fails this check is re-run on the same packet BEFORE the key is read.)
// Did a grader see another grader's verdicts? For one agent transcript, list every tool call whose INPUT names a
// verdict file other than its own, and every tool RESULT that mentions one, with a short head of that result.
//   node grader-independence.mjs <agentId> <own label, e.g. C-g2>
import fs from 'node:fs';
const DIR = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents';
const [id, own] = process.argv.slice(2);
const other = new RegExp(`verdicts-(?!${own}\\.json)[A-D]-g[12]\\.json`);
const uses = new Map();
let n = 0;
for (const line of fs.readFileSync(`${DIR}/agent-${id}.jsonl`, 'utf8').split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const content = o?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
        if (c.type === 'tool_use') {
            uses.set(c.id, c);
            const input = JSON.stringify(c.input);
            if (other.test(input)) { n++; console.log(`TOOL CALL ${c.name} names another grader's file: ${input.slice(0, 400)}`); }
        } else if (c.type === 'tool_result') {
            const text = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
            if (other.test(text)) {
                const u = uses.get(c.tool_use_id);
                n++;
                console.log(`TOOL RESULT mentions another grader's file. The call: ${u ? `${u.name} ${JSON.stringify(u.input).slice(0, 300)}` : '?'}`);
                console.log(`   result head: ${text.slice(0, 500).replace(/\\n/g, ' | ')}`);
            }
        }
    }
}
console.log(`${n} mention(s) of another grader's verdict file in ${id} (${own})`);
