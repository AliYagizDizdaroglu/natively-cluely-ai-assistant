// Throwaway: word counts per answer for grading r3 h2 g1 (read-only on the pairs file).
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const markers = (it.answer.match(/__[A-Z]+__/g) || []).join(',');
  console.log(it.key.padEnd(10), String(words).padStart(4), markers);
}
