import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length, 'model', j.model);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUP KEY', it.key);
  keys.add(it.key);
  const w = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key.padEnd(6), String(w).padStart(4), it.answer.includes('\n') ? 'NL' : '');
}
