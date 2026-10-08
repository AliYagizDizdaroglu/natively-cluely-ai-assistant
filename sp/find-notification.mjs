// Prints the <result> of a background agent's completion notice from this session's transcript.
//   node find-notification.mjs <task id> [<out file>]
import fs from 'node:fs';
import readline from 'node:readline';
const id = process.argv[2];
const out = process.argv[3];
if (!id) { console.log('usage: find-notification.mjs <task id> [<out file>]'); process.exit(2); }
const file = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
let found = 0;
const texts = (o) => {
    const acc = [];
    const walk = (v) => { if (typeof v === 'string') acc.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(o);
    return acc;
};
for await (const line of rl) {
    if (!line.includes(`<task-id>${id}</task-id>`)) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    for (const t of texts(o)) {
        const i = t.indexOf(`<task-id>${id}</task-id>`);
        if (i === -1) continue;
        const a = t.indexOf('<result>', i), b = t.indexOf('</result>', a);
        if (a === -1 || b === -1) continue;
        found++;
        const body = t.slice(a + 8, b);
        if (out) fs.writeFileSync(found === 1 ? out : `${out}.${found}`, body); else console.log(body);
    }
}
console.log(`notifications found: ${found}`);
