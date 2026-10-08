import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean);
  console.log(it.key.padEnd(10), String(words.length).padStart(4), JSON.stringify(it.answer.slice(0, 30)));
}
