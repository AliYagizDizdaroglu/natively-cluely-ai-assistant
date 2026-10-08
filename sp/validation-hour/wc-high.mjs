// Word counts for each answer in the pairs file (read-only).
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const a = it.answer;
  const ws = a.trim().split(/\s+/).filter(Boolean).length;
  const wsDash = a.trim().split(/[\s—–]+/).filter(Boolean).length;
  console.log(it.key, 'ws=' + ws, 'ws+dash=' + wsDash, 'nl=' + (a.includes('\n') ? 'Y' : 'n'), 'starts=' + JSON.stringify(a.slice(0, 12)));
}
