// Merges today's two 3.8 Flash re-ask windows (tag sat: 1.2 s spacing; tag sat2: 30 s spacing) into one records file
// so their answers are graded in ONE blind batch with their originals. Only answered records (spoken text) are kept;
// refused calls (503/429) are listed and left out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (t) => JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `reask-gemini-3.8-flash-${t}.json`), 'utf8')).records;
const records = {}, refused = [];
for (const t of ['sat', 'sat2']) for (const [id, r] of Object.entries(read(t))) {
    if (r.spoken) { if (records[id]) { console.log(`REFUSED: ${id} answered in two windows`); process.exit(2); } records[id] = { ...r, window: t }; }
    else refused.push(`${id}(${t}: ${String(r.error ?? 'empty').slice(0, 12)})`);
}
const out = path.join(HERE, 'runs', 'reask-gemini-3.8-flash-satall.json');
if (fs.existsSync(out)) { console.log(`REFUSED: ${out} exists`); process.exit(2); }
fs.writeFileSync(out, JSON.stringify({ model: 'gemini-3.8-flash', windows: ['sat', 'sat2'], records }, null, 1));
console.log(`answered: ${Object.keys(records).join(',')}; refused: ${refused.join(' ')}`);
