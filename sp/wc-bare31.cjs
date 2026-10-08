// Throwaway: per-answer word counts for the bare31 grading (read-only on the pairs file).
const fs = require('fs');
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const paras = it.answer.split(/\n\s*\n/).length;
  console.log(it.key, words, 'paras=' + paras, it.heard === it.question ? 'heard=same' : 'heard=DIFF');
}
