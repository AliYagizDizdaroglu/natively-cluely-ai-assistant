// Throwaway: pull the planner agent's final reply out of its transcript into plan.md, then split it
// into task briefs (global part + one task each). Prints only paths and sizes, never the text.
import fs from 'node:fs';
const ID = 'a3b4fa17ff351376b';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const OUT = `${SP}/sdd/2026-09-26-h40c`;
const dirs = ['C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a', 'C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-whole-turn'];
const f = dirs.map((d) => `C:/Users/sotka/.claude/projects/${d}/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents/agent-${ID}.jsonl`).find((p) => fs.existsSync(p));
if (!f) { console.log('TRANSCRIPT NOT FOUND'); process.exit(2); }
let last = null;
for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    const msg = j.message;
    if (j.type !== 'assistant' || !msg || !Array.isArray(msg.content)) continue;
    const text = msg.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    if (text.includes('# Plan: h40c')) last = text;
}
if (!last) { console.log('PLAN TEXT NOT FOUND'); process.exit(3); }
const plan = last.slice(last.indexOf('# Plan: h40c'));
fs.writeFileSync(`${OUT}/plan.md`, plan);
const parts = plan.split(/\n(?=## Task \d+ )/);
const global = parts[0];
fs.writeFileSync(`${OUT}/global.md`, global);
console.log(`plan.md ${plan.length} chars; global ${global.length}`);
for (const p of parts.slice(1)) {
    const n = /^## Task (\d+)/.exec(p)[1];
    const body = p.split(/\n(?=## Residual risks)/)[0];
    fs.writeFileSync(`${OUT}/task-${n}-brief.md`, `${global}\n\n---\n\n${body}`);
    console.log(`task-${n}-brief.md ${body.length} chars`);
}
