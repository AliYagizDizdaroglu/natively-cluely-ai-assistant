// Throwaway: word counts per answer for the delivery length calibration. Read-only on the pairs file.
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('model:', j.model, 'items:', j.items.length);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUPLICATE KEY', it.key);
  keys.add(it.key);
  const ws = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const dash = it.answer.trim().split(/[\s—–]+/).filter(Boolean).length;
  const md = /(^|\n)\s*([-*]|\d+\.)\s|\*\*|`|#/.test(it.answer) ? ' MARKDOWN?' : '';
  const nl = /\n/.test(it.answer) ? ' NEWLINES' : '';
  const q = /\?/.test(it.answer) ? ' QMARK' : '';
  console.log(it.key.padEnd(6), String(ws).padStart(3), String(dash).padStart(3), (it.question === it.heard ? '' : 'HEARD-DIFFERS') + md + nl + q);
}
