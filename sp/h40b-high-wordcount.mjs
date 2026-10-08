// Throwaway: word counts per answer for delivery grading (read-only on the pairs file).
import { readFileSync } from 'node:fs';
const pairsPath = process.argv[2];
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
console.log('items:', pairs.items.length);
for (const it of pairs.items) {
  const ws = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const wsDash = it.answer.trim().split(/[\s—–]+/).filter(Boolean).length;
  console.log(`${it.key}\tws=${ws}\tws+dash=${wsDash}`);
}
