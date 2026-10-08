// Scratch, read-only: the values of the assistant records' advisorModel / effort fields (ids and counts only, never content).
import fs from 'node:fs';
const file = process.argv[2];
const adv = new Map();
const eff = new Map();
for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.type !== 'assistant') continue;
    const a = JSON.stringify(o.advisorModel ?? null);
    adv.set(a, (adv.get(a) ?? 0) + 1);
    const e = JSON.stringify(o.effort ?? null);
    eff.set(e, (eff.get(e) ?? 0) + 1);
}
console.log('advisorModel:', JSON.stringify(Object.fromEntries(adv)), ' effort:', JSON.stringify(Object.fromEntries(eff)));
