// Throwaway, read-only: the model each h40c grading agent actually ran on (PREREGISTER-h40c: the
// grader is pinned to claude-opus-5-5, read from the agents' own transcripts). Prints only model
// ids and message counts per agent, never transcript content.
//   node h40c-grader-models.mjs <tag>=<agentId> ...
import fs from 'node:fs';
import path from 'node:path';

const projects = 'C:/Users/sotka/.claude/projects';
const session = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const slugs = fs.readdirSync(projects).filter((d) => d.startsWith('C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant'));
const tempRoot = 'C:/Users/sotka/AppData/Local/Temp/claude';

function candidates(id) {
    const out = [];
    for (const s of slugs) out.push(path.join(projects, s, session, 'subagents', `agent-${id}.jsonl`));
    for (const s of fs.readdirSync(tempRoot)) out.push(path.join(tempRoot, s, session, 'tasks', `${id}.output`));
    return out.filter((f) => fs.existsSync(f));
}

let allPinned = true;
for (const arg of process.argv.slice(2)) {
    const [tag, id] = arg.split('=');
    const files = candidates(id);
    if (!files.length) { console.log(`${tag}: NO TRANSCRIPT FOUND for ${id}`); allPinned = false; continue; }
    const models = new Map();
    for (const l of fs.readFileSync(files[0], 'utf8').split('\n')) {
        if (!l.trim()) continue;
        let o; try { o = JSON.parse(l); } catch { continue; }
        const m = o?.message?.model;
        if (o.type === 'assistant' && m) models.set(m, (models.get(m) ?? 0) + 1);
    }
    const pinned = models.size === 1 && models.has('claude-opus-5-5');
    if (!pinned) allPinned = false;
    console.log(`${tag}: ${JSON.stringify(Object.fromEntries(models))} ${pinned ? 'PINNED' : 'NOT PINNED'}  (${path.basename(path.dirname(files[0]))}/${path.basename(files[0])})`);
}
console.log(allPinned ? 'ALL GRADERS claude-opus-5-5' : 'GRADER PIN NOT MET - rule 3 is reported, not gated');
