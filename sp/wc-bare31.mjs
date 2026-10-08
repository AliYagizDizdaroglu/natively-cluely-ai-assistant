import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length, 'model', j.model);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key, words, it.question === it.heard ? 'heard=q' : 'HEARD DIFFERS');
}
