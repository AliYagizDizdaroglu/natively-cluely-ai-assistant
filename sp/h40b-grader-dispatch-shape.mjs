// Throwaway: find how h40b's in-app grading agent was dispatched (the exact prompt shape and the
// model it ran on), so h40c's graders get the same instrument. Reads subagent transcripts only.
import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents';
const needle = process.argv[2] || 'h40b-verdicts-inapp.json';
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean);
    let first = null, model = null;
    for (const l of lines) {
        let o; try { o = JSON.parse(l); } catch { continue; }
        if (!first && o.type === 'user' && o.message) {
            const c = o.message.content;
            first = typeof c === 'string' ? c : (Array.isArray(c) ? c.map((p) => p.text || '').join('') : '');
        }
        if (!model && o.message && o.message.model) model = o.message.model;
        if (first && model) break;
    }
    if (!first || !first.includes(needle)) continue;
    const mtime = fs.statSync(path.join(dir, f)).mtime.toISOString();
    console.log(`=== ${f}  model=${model}  mtime=${mtime}  promptChars=${first.length}`);
    console.log(first);
}
