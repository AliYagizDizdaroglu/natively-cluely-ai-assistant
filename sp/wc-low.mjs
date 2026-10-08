import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(`${it.key}\t${words}`);
}
console.log('items', j.items.length);
