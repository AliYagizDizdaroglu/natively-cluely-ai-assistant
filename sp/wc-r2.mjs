import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length, 'model', j.model);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUP KEY', it.key);
  keys.add(it.key);
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/[*#`]/.test(it.answer)) flags.push('md-chars');
  if (/\n\s*[-*\d]/.test(it.answer)) flags.push('list?');
  if (/\n/.test(it.answer)) flags.push('newline');
  if (/\?/.test(it.answer)) flags.push('has-?');
  console.log(it.key.padEnd(6), String(words).padStart(4), flags.join(','));
}
