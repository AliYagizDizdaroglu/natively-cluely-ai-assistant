import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('model', j.model, 'items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  keys.add(it.key);
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const sameHeard = it.heard === it.question ? 'same' : 'DIFF';
  console.log(it.key.padEnd(6), String(words).padStart(4), sameHeard, it.source, it.level);
}
console.log('unique keys', keys.size);
