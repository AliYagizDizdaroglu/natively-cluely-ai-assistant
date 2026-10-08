// Throwaway: word counts per answer for delivery grading (reads the pairs file only).
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('model:', j.model, 'items:', j.items.length);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUPLICATE KEY', it.key);
  keys.add(it.key);
  const a = String(it.answer ?? '');
  const ws = a.trim().split(/\s+/).filter(Boolean).length;
  const wsDash = a.trim().split(/[\s—]+/).filter(Boolean).length;
  const paras = a.trim().split(/\n\s*\n/).length;
  const flags = [];
  if (/[*#`]/.test(a)) flags.push('md-chars');
  if (/^\s*[-*•]\s/m.test(a)) flags.push('bullets');
  if (/\?/.test(a)) flags.push('has-?');
  if (/[{}]/.test(a)) flags.push('braces');
  console.log(it.key.padEnd(6), String(ws).padStart(4), String(wsDash).padStart(4), 'paras=' + paras, flags.join(','));
}
