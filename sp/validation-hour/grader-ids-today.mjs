// Finds this session's subagent transcripts written on 2026-10-02 after the hour (>= 12:30Z) and prints, per agent:
// id, the verdicts file name its dispatch text names (h40d-verdicts-<tag>.json or flash38-verdicts-<g>.json), and the
// set of model ids on its assistant records. Prints ids, file names and model ids only.
import fs from 'node:fs';
import path from 'node:path';
const DIR = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/subagents';
if (!fs.existsSync(DIR)) { console.log(`no subagents dir at ${DIR}`); process.exit(2); }
const since = Date.parse('2026-10-02T12:30:00Z');
const rows = [];
for (const f of fs.readdirSync(DIR).filter((x) => /^agent-.*\.jsonl$/.test(x))) {
    const p = path.join(DIR, f), st = fs.statSync(p);
    if (st.mtimeMs < since) continue;
    const recs = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const firstUser = recs.find((r) => r.type === 'user');
    const text = JSON.stringify(firstUser?.message?.content ?? '');
    const tag = (text.match(/(h40d-verdicts-[a-z0-9-]+\.json|flash38-verdicts-[A-Z]\.json|verdicts[-_][A-Za-z0-9_.-]+\.json)/) ?? [])[1] ?? '(no verdicts file named)';
    const models = {}; for (const r of recs) if (r.type === 'assistant') { const m = r.message?.model ?? '?'; models[m] = (models[m] ?? 0) + 1; }
    rows.push([st.mtime.toISOString(), f.replace(/^agent-|\.jsonl$/g, ''), tag, JSON.stringify(models)]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
for (const r of rows) console.log(r.join('  '));
console.log(`agents since 12:30Z: ${rows.length}`);
