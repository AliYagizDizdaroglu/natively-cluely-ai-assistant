import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items:', j.items.length);
for (const it of j.items) {
  const w = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key.padEnd(8), String(w).padStart(4));
}
