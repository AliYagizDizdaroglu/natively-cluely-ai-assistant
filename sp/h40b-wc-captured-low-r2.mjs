import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('model', j.model, 'items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  keys.add(it.key);
  const a = it.answer || '';
  const ws = a.trim().split(/\s+/).filter(Boolean).length;
  const wd = a.trim().split(/[\s—–]+/).filter(Boolean).length;
  const paras = a.split(/\n\s*\n/).length;
  const md = /(^|\n)\s*([-*•]|\d+\.)\s|\*\*|`|#/.test(a);
  const q = /\?\s*$/.test(a.trim());
  console.log(`${it.key}\tws=${ws}\twd=${wd}\tparas=${paras}\tmd=${md}\tendsQ=${q}\theardEq=${it.heard === it.question}`);
}
console.log('unique keys', keys.size);
