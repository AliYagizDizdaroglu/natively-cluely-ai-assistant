// Scratch, read-only: across EVERY subagent transcript under every project slug, which model-id SETS occur (counts of files per set),
// and how many sessions / slugs hold a subagents/ folder. Ids and counts only; never content.
import fs from 'node:fs';
import path from 'node:path';

const projects = 'C:/Users/sotka/.claude/projects';
const sets = new Map();
let files = 0, slugsWith = 0, sessionsWith = 0, unreadable = 0;
const examples = new Map();
for (const slug of fs.readdirSync(projects)) {
    const sp = path.join(projects, slug);
    if (!fs.statSync(sp).isDirectory()) continue;
    let slugHas = false;
    for (const sess of fs.readdirSync(sp)) {
        const sub = path.join(sp, sess, 'subagents');
        if (!fs.existsSync(sub) || !fs.statSync(sub).isDirectory()) continue;
        slugHas = true; sessionsWith++;
        for (const f of fs.readdirSync(sub)) {
            if (!f.endsWith('.jsonl')) continue;
            files++;
            const models = new Map();
            let text;
            try { text = fs.readFileSync(path.join(sub, f), 'utf8'); } catch { unreadable++; continue; }
            for (const l of text.split('\n')) {
                if (!l.trim()) continue;
                let o; try { o = JSON.parse(l); } catch { continue; }
                const m = o?.message?.model;
                if (o.type === 'assistant' && m) models.set(m, (models.get(m) ?? 0) + 1);
            }
            const key = [...models.keys()].sort().join(' + ') || '(no assistant model)';
            sets.set(key, (sets.get(key) ?? 0) + 1);
            if (!examples.has(key)) examples.set(key, `${slug.slice(-24)}/${sess.slice(0, 8)}/${f}`);
        }
    }
    if (slugHas) slugsWith++;
}
console.log(`transcripts ${files} (unreadable ${unreadable}) in ${sessionsWith} sessions across ${slugsWith} slugs`);
for (const [k, n] of [...sets.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}   e.g. ${examples.get(k)}`);
