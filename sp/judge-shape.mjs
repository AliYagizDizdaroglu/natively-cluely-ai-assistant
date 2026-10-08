// Throwaway, read-only: the shape of a merged judge file (top-level fields, one item's fields).
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log('top-level:', Object.keys(j).join(', '));
console.log('model/graderModel/graderPrompt:', j.model, j.graderModel, j.graderPrompt);
const [k, v] = Object.entries(j.items)[0];
console.log('first key:', k);
console.log('item fields:', Object.keys(v).join(', '));
console.log('verdict/kind/id:', v.verdict, v.kind, v.id);
console.log('verdict values:', JSON.stringify(Object.values(j.items).reduce((a, x) => ((a[x.verdict] = (a[x.verdict] ?? 0) + 1), a), {})));
