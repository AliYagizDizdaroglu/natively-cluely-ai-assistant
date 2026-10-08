// Scratch, read-only: the keys and value TYPES of a timeline item (no string content).
import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const it = t.items[0];
console.log(Object.entries(it).map(([k, v]) => `${k}:${v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v}${typeof v === 'string' ? `(len ${v.length})` : ''}`).join(', '));
console.log(`items ${t.items.length}; kinds ${JSON.stringify(t.items.reduce((a, i) => ((a[i.kind ?? 'spoken'] = (a[i.kind ?? 'spoken'] ?? 0) + 1), a), {}))}`);
