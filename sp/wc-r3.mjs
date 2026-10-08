import { readFileSync } from 'node:fs';

const pairsPath = process.argv[2];
const data = JSON.parse(readFileSync(pairsPath, 'utf8'));
const items = data.items;
console.log('items:', items.length);
const keys = items.map((i) => i.key);
console.log('unique keys:', new Set(keys).size);
for (const it of items) {
  const a = it.answer;
  const ws = a.trim().split(/\s+/).length;
  const dash = a.trim().split(/[\s—]+/).filter(Boolean).length;
  const flags = [];
  if (/[*#`]|^\s*[-•]/m.test(a)) flags.push('md');
  if (/\n/.test(a)) flags.push('newline');
  if (/\?/.test(a)) flags.push('question-mark');
  if (/\$/.test(a)) flags.push('dollar');
  if (/O\([^)]*\)/.test(a)) flags.push('bigO');
  console.log(`${it.key}\t${ws}\t${dash}\t${flags.join(',')}`);
}
