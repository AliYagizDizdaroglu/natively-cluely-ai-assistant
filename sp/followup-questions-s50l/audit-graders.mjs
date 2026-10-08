// Paths-only audit of grader transcripts (prep review I6): lists every tool input path/pattern/command each grader
// used and flags a read of (a) any key file, (b) any answer file (interview60.answers.*), (c) a verdicts file that is
// not the grader's own. Reads only the tool_use INPUT fields of assistant messages, never the content returned.
// A flagged grader makes its blind file "reported, not decided" (the registration's §1 rule).
//   node audit-graders.mjs <blindTag>.<g>=<agentId> ...      e.g. blind-1.g1=a5413ac009fc5bd7a
import fs from 'node:fs';
import path from 'node:path';
const PROJECTS = 'C:/Users/sotka/.claude/projects';
const SESSION = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const args = process.argv.slice(2);
if (!args.length) { console.log('usage: node audit-graders.mjs blind-N.gX=<agentId> ...'); process.exit(2); }
function find(id) {
    for (const slug of fs.readdirSync(PROJECTS)) {
        const f = path.join(PROJECTS, slug, SESSION, 'subagents', `agent-${id}.jsonl`);
        if (fs.existsSync(f)) return f;
    }
    return null;
}
let flaggedAny = false;
for (const a of args) {
    const [tag, id] = a.split('=');
    const f = find(id);
    if (!f) { console.log(`${tag}: transcript NOT FOUND (${id}) -> cannot audit`); flaggedAny = true; continue; }
    const own = `verdicts.${tag}.json`;
    const touched = [];
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const content = j?.message?.content;
        if (j?.type !== 'assistant' || !Array.isArray(content)) continue;
        for (const c of content) if (c?.type === 'tool_use') {
            const inp = c.input ?? {};
            for (const k of ['file_path', 'path', 'pattern', 'command', 'glob']) if (typeof inp[k] === 'string') touched.push(`${c.name}:${k}=${inp[k]}`);
        }
    }
    const flags = touched.filter((t) => /key\.blind-\d|keyhold/i.test(t) || /interview60\.answers\./.test(t) || (/verdicts\.blind-\d+\.g\d\.json/.test(t) && !t.includes(own)));
    flaggedAny ||= flags.length > 0;
    console.log(`${tag} (${id}): ${touched.length} tool inputs; ${flags.length ? `FLAGGED ${flags.length}: ${flags.map((x) => x.slice(0, 160)).join(' | ')}` : 'clean'}`);
}
console.log(flaggedAny ? 'AUDIT: FLAGGED (see lines above)' : 'AUDIT: all graders clean');
process.exit(flaggedAny ? 1 : 0);
