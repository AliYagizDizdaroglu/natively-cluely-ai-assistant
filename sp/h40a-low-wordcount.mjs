// Throwaway: word counts per answer in one pairs file (read-only).
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const data = JSON.parse(readFileSync(file, 'utf8'));
console.log('model:', data.model, 'items:', data.items.length);
for (const it of data.items) {
  const words = it.answer.split(/[\s—–]+/).filter(Boolean);
  const flags = [];
  if (/^\s*[-*•]\s|\n\s*[-*•]\s|\*\*|`|#/.test(it.answer)) flags.push('MD?');
  if (/\?/.test(it.answer)) flags.push('Q?');
  if (/\n/.test(it.answer)) flags.push('NL');
  console.log(it.key.padEnd(5), String(words.length).padStart(4), flags.join(' '));
}
