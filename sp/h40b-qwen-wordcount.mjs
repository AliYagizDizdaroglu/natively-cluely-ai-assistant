// Throwaway: word counts per answer for delivery scoring (read-only on the pairs file).
import fs from 'node:fs';
const p = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b\\interview60.judge.pairs.qwen_qwen3.8-27b.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', d.items.length, 'unique keys', new Set(d.items.map(i => i.key)).size);
for (const it of d.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/\n/.test(it.answer)) flags.push('newline');
  if (/[*#`]|^\s*[-•]\s/m.test(it.answer)) flags.push('md-ish');
  if (/\?\s*$/.test(it.answer.trim())) flags.push('ends-with-?');
  console.log(it.key, words, flags.join(','));
}
