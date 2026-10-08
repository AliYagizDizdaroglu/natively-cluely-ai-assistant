import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  keys.add(it.key);
  const w = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key.padEnd(7), String(w).padStart(4), it.source, it.verdict);
}
console.log('unique keys', keys.size);
