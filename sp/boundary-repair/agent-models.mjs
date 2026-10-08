// Throwaway (2026-09-29): which model each subagent actually ran on, from the API's recorded "model" field in
// its transcript (every assistant message), not from the dispatch alias or the agent's self-report.
//   node agent-models.mjs <label>=<agentId> ...
import fs from 'node:fs';
const DIR = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents';
for (const a of process.argv.slice(2)) {
    const [label, id] = a.split('=');
    const f = `${DIR}/agent-${id}.jsonl`;
    if (!fs.existsSync(f)) { console.log(`${label}: no transcript ${f}`); continue; }
    const models = new Map();
    let turns = 0;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!line) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        const m = o?.message?.model;
        if (o?.type === 'assistant' && m) { turns++; models.set(m, (models.get(m) ?? 0) + 1); }
    }
    console.log(`${label.padEnd(22)} ${[...models].map(([m, n]) => `${m} x${n}`).join(', ') || '(no assistant turns)'}  (${turns} assistant messages)`);
}
