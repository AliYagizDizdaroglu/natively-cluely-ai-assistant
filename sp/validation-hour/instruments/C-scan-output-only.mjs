// Scratch, read-only: agent ids that have a NON-EMPTY temp tasks/<id>.output but NO projects/**/subagents/agent-<id>.jsonl
// (the only place the .output search path could be the one that finds a transcript). Ids, sizes and first-line record types only.
import fs from 'node:fs';
import path from 'node:path';

const projects = 'C:/Users/sotka/.claude/projects';
const temp = 'C:/Users/sotka/AppData/Local/Temp/claude';
const inProjects = new Set();
for (const slug of fs.readdirSync(projects)) {
    const sp = path.join(projects, slug);
    if (!fs.statSync(sp).isDirectory()) continue;
    for (const sess of fs.readdirSync(sp)) {
        const sub = path.join(sp, sess, 'subagents');
        if (!fs.existsSync(sub) || !fs.statSync(sub).isDirectory()) continue;
        for (const f of fs.readdirSync(sub)) { const m = /^agent-(.+)\.jsonl$/.exec(f); if (m) inProjects.add(m[1]); }
    }
}
let outputs = 0, nonEmpty = 0;
const only = [];
for (const slug of fs.readdirSync(temp)) {
    const sp = path.join(temp, slug);
    let st; try { st = fs.statSync(sp); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const sess of fs.readdirSync(sp)) {
        const tk = path.join(sp, sess, 'tasks');
        if (!fs.existsSync(tk) || !fs.statSync(tk).isDirectory()) continue;
        for (const f of fs.readdirSync(tk)) {
            const m = /^(a[0-9a-f]{16})\.output$/.exec(f);
            if (!m) continue;
            outputs++;
            const size = fs.statSync(path.join(tk, f)).size;
            if (size > 0) {
                nonEmpty++;
                if (!inProjects.has(m[1])) only.push({ id: m[1], size, where: `${slug.slice(-24)}/${sess.slice(0, 8)}` });
            }
        }
    }
}
console.log(`agent .output files ${outputs}; non-empty ${nonEmpty}; non-empty with NO projects transcript: ${only.length}`);
for (const o of only.slice(0, 10)) console.log(`  ${o.id} ${o.size} bytes ${o.where}`);
