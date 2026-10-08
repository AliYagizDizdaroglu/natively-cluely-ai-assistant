import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length, 'model', j.model);
const keys = new Set();
for (const it of j.items) {
  keys.add(it.key);
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const nl = (it.answer.match(/\n/g) || []).length;
  const heardSame = it.heard === it.question;
  console.log(it.key.padEnd(7), String(words).padStart(4), 'nl=' + nl, heardSame ? '' : 'HEARD-DIFFERS');
}
console.log('unique keys', keys.size);
