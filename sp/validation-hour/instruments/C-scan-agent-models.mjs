// Scratch, read-only: which agents in the controller session's subagents/ folder dispatched with model sonnet/opus/..., from the small
// meta.json files only (never a transcript). Prints id, meta model alias, description length. Used to FIND a known Sonnet agent.
//   node scan-agent-models.mjs <subagents dir> [<alias>]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const want = process.argv[3] ?? null;
const counts = new Map();
const hits = [];
for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.meta.json')) continue;
    let m; try { m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    const alias = m.model ?? '(none)';
    counts.set(alias, (counts.get(alias) ?? 0) + 1);
    if (want && alias === want) {
        const id = f.replace(/^agent-/, '').replace(/\.meta\.json$/, '');
        const jsonl = path.join(dir, `agent-${id}.jsonl`);
        hits.push({ id, size: fs.existsSync(jsonl) ? fs.statSync(jsonl).size : -1, mtime: fs.existsSync(jsonl) ? fs.statSync(jsonl).mtime.toISOString() : '-' });
    }
}
console.log('meta model aliases:', JSON.stringify(Object.fromEntries(counts)));
if (want) {
    hits.sort((a, b) => (a.mtime < b.mtime ? -1 : 1));
    console.log(`${hits.length} agents with meta model "${want}"; first 8 and last 3 by transcript mtime:`);
    for (const h of [...hits.slice(0, 8), ...hits.slice(-3)]) console.log(`  ${h.id}  jsonl ${h.size} bytes  ${h.mtime}`);
}
