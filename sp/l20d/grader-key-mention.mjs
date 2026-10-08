// Where does a grader's transcript mention the blind key (l20d-key / key.json)? Prints, per mention, whether it sits in
// a tool call's input, a tool result, the dispatch prompt or the agent's own text, with 160 characters around it.
//   node grader-key-mention.mjs <agentId>
import fs from 'node:fs';
const DIR = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents';
const id = process.argv[2];
const RE = /l20d-key|key\.json/g;
const around = (s, i) => s.slice(Math.max(0, i - 80), i + 80).replace(/\s+/g, ' ');
let n = 0;
for (const line of fs.readFileSync(`${DIR}/agent-${id}.jsonl`, 'utf8').split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const content = o?.message?.content;
    const parts = typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : [];
    for (const c of parts) {
        const where = c.type === 'tool_use' ? `TOOL CALL ${c.name}` : c.type === 'tool_result' ? 'TOOL RESULT' : `${o.type} text`;
        const text = c.type === 'tool_use' ? JSON.stringify(c.input) : c.type === 'tool_result' ? (typeof c.content === 'string' ? c.content : JSON.stringify(c.content)) : (c.text ?? '');
        for (const m of text.matchAll(RE)) { n++; console.log(`${where}: …${around(text, m.index)}…`); }
    }
}
console.log(`${n} mention(s) in ${id}`);
