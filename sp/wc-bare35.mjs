import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const n = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key, n);
}
