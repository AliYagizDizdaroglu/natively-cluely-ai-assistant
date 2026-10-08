// Throwaway: word counts per item for grading (read-only on the pairs file).
// ws = whitespace split; dash = whitespace plus em/en dash split (em-dashes join words without spaces).
import fs from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUP KEY', it.key);
  keys.add(it.key);
  const ws = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const dash = it.answer.trim().split(/[\s—–]+/).filter(Boolean).length;
  const paras = it.answer.split(/\n\s*\n/).length;
  const md = /[*#`]|^\s*[-\d]+[.)]?\s/m.test(it.answer) ? ' MD?' : '';
  const snake = /\b[a-z]+_[a-z_]+\b/.test(it.answer) ? ' snake_case' : '';
  const q = /\?/.test(it.answer) ? ' has-?' : '';
  console.log(it.key.padEnd(6), String(ws).padStart(4), 'ws', String(dash).padStart(4), 'dash', paras > 1 ? `paras=${paras}` : '', md, snake, q, it.question === it.heard ? '' : 'HEARD-DIFFERS');
}
