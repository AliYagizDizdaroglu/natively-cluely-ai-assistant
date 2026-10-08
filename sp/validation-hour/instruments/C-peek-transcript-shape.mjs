// Scratch, read-only: the SHAPE of a subagent transcript (.jsonl): per record type, the count, whether message.model is set and its values.
// Never prints message content.
//   node peek-transcript-shape.mjs <file.jsonl>
import fs from 'node:fs';

const file = process.argv[2];
const types = new Map();
const models = new Map();
let lines = 0;
let bad = 0;
const keysByType = new Map();
for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    lines++;
    let o; try { o = JSON.parse(l); } catch { bad++; continue; }
    const t = o.type ?? '(no type)';
    types.set(t, (types.get(t) ?? 0) + 1);
    if (!keysByType.has(t)) keysByType.set(t, Object.keys(o).join(','));
    const m = o?.message?.model;
    if (m) {
        const key = `${t}:${m}`;
        models.set(key, (models.get(key) ?? 0) + 1);
    }
}
console.log(`lines ${lines}, unparsable ${bad}`);
console.log('record types:', JSON.stringify(Object.fromEntries(types)));
for (const [t, k] of keysByType) console.log(`  keys of first "${t}" record: ${k}`);
console.log('message.model by record type:', JSON.stringify(Object.fromEntries(models)));
