// Throwaway: word counts per answer in the gpt-oss pairs file (read-only).
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean);
  const hasNewline = /\n/.test(it.answer);
  const md = /[*#`]|^\s*[-•]\s/m.test(it.answer);
  console.log(it.key, words.length, hasNewline ? 'NL' : '', md ? 'MD' : '');
}
