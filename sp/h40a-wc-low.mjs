import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length, 'model', j.model);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const nl = (it.answer.match(/\n/g) || []).length;
  const q = it.question === it.heard ? 'same' : 'DIFF';
  console.log(it.key.padEnd(6), String(words).padStart(4), 'nl=' + nl, 'q/heard=' + q, it.source, it.verdict, it.dispatchedAt);
}
