import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  keys.add(it.key);
  const ws = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const dash = it.answer.trim().split(/[\s—–]+/).filter(Boolean).length;
  const q = it.question === it.heard ? 'same' : 'DIFF';
  const nl = /\n/.test(it.answer) ? 'NL' : '';
  console.log(it.key, 'ws=' + ws, 'dashsplit=' + dash, q, nl);
}
console.log('unique keys', keys.size);
