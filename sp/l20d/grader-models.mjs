// (L20d: copy of l20c/grader-models.mjs, unchanged in logic; a grader that fails this check is re-run on the same packet BEFORE the key is read.)
// Which model each L20d grader actually ran on, from the API's recorded "model" field in its transcript (every
// assistant message), and which verdict file it wrote (the label is read from the transcript, not from memory).
//   node grader-models.mjs <agentId> ...
import fs from 'node:fs';
const DIR = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents';
let bad = 0;
const seen = new Set();
for (const id of process.argv.slice(2)) {
    const f = `${DIR}/agent-${id}.jsonl`;
    if (!fs.existsSync(f)) { console.log(`${id}: no transcript`); bad++; continue; }
    const text = fs.readFileSync(f, 'utf8');
    const models = new Map();
    for (const line of text.split('\n')) {
        if (!line) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        const m = o?.message?.model;
        if (o?.type === 'assistant' && m) models.set(m, (models.get(m) ?? 0) + 1);
    }
    const labels = [...new Set(text.match(/verdicts-[A-D]-g[12]\.json/g) ?? [])];
    const only55 = models.size === 1 && models.has('claude-opus-5-5');
    if (!only55 || labels.length !== 1 || seen.has(labels[0])) bad++;
    seen.add(labels[0]);
    console.log(`${id}  ${labels.join(',').padEnd(20)} ${[...models].map(([m, n]) => `${m} x${n}`).join(', ') || '(no assistant turns)'}  ${only55 ? 'OK' : 'NOT claude-opus-5-5 ONLY'}`);
}
console.log(`${seen.size} distinct verdict files; ${bad ? `${bad} PROBLEM(S)` : 'all graders ran on claude-opus-5-5 only, one verdict file each'}`);
process.exit(bad ? 1 : 0);
