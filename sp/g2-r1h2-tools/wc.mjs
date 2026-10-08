// Throwaway: word counts per item for delivery length calibration (read-only on the pairs file).
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUPLICATE KEY', it.key);
  keys.add(it.key);
  const ws = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const dash = it.answer.trim().split(/[\s—–]+/).filter(Boolean).length;
  console.log(it.key.padEnd(10), 'ws=' + ws, 'dashsplit=' + dash);
}
