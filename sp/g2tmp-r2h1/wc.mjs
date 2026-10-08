import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items:', j.items.length);
const keys = new Set();
for (const it of j.items) {
  keys.add(it.key);
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const heardSame = it.heard === it.question.replace(/ \[Follow-up to:.*\]$/s, '').replace(/ \[.*\]$/s, '');
  console.log(it.key.padEnd(12), String(words).padStart(4), 'words', heardSame ? '' : 'HEARD-DIFFERS');
}
console.log('unique keys:', keys.size);
