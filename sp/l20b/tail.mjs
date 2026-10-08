// Throwaway (2026-09-29), reported outside the rule: per run, every item's first-word time, the slow tail
// (> 9.4 s, the registered p90 bar), holding lines, and S2Q08's pair; plus the shape of one answers record.
import fs from 'node:fs';
const HERE = new URL('./', import.meta.url);
const items = JSON.parse(fs.readFileSync(new URL('items.json', HERE), 'utf8'));
const ids = items.pairs.flat();
for (const r of [1, 2, 3]) {
    const A = JSON.parse(fs.readFileSync(new URL(`runs/live38-r${r}.answers.json`, HERE), 'utf8'));
    const recs = A.items ?? A.answers ?? A;
    if (r === 1) console.log(`record keys: ${Object.keys(Array.isArray(recs) ? recs[0] : recs[ids[0]] ?? {}).join(', ')}`);
    const get = (id) => (Array.isArray(recs) ? recs.find((x) => x.id === id) : recs[id]);
    const slow = [], missing = [];
    for (const id of ids) {
        const x = get(id);
        const t = x?.ttftMs ?? x?.firstWordMs ?? x?.ttft ?? null;
        if (!x || t == null || !x.answer) { missing.push(id); continue; }
        if (t > 9400) slow.push(`${id} ${(t / 1000).toFixed(1)}s${x.hold || x.holding ? ' (after a holding line)' : ''} ${x.words ?? ''}w`);
    }
    const s = get('S2Q08'), sf = get('S2Q08F');
    const fmt = (x) => (x?.answer ? `${((x.ttftMs ?? x.firstWordMs ?? x.ttft) / 1000).toFixed(1)}s ${x.words ?? '?'}w` : 'NO ANSWER');
    console.log(`r${r}: missing [${missing.join(', ')}]; slow >9.4s: ${slow.length ? slow.join('; ') : 'none'}; S2Q08 ${fmt(s)}, S2Q08F ${fmt(sf)}`);
}
