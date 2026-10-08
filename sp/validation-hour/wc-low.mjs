// Read-only: prints the word count of each answer in the pairs file.
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key, words);
}
