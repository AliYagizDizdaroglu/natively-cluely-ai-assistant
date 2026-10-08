// Throwaway: word counts per item of one arm's pairs file (read-only).
import { readFileSync } from 'node:fs';
const p = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json';
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items:', j.items.length, 'unique keys:', new Set(j.items.map(i => i.key)).size);
for (const it of j.items) {
  const n = String(it.answer || '').trim().split(/\s+/).filter(Boolean).length;
  const heardDiffers = it.heard !== it.question ? ' HEARD-DIFFERS' : '';
  console.log(it.key.padEnd(6), String(n).padStart(4), heardDiffers);
}
