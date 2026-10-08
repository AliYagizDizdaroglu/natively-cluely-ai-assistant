// Read-only: word counts per answer in the captured-high pairs file (for the delivery axis).
import { readFileSync } from 'node:fs';

const PAIRS = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-24T08-20-12-h40a\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json';
const data = JSON.parse(readFileSync(PAIRS, 'utf8'));
console.log('model', data.model, 'items', data.items.length);
const keys = data.items.map(i => i.key);
console.log('unique keys', new Set(keys).size);
for (const it of data.items) {
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  // em-dash joined words count separately when spoken
  const spoken = it.answer.replace(/[\u2014\u2013]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const heardDiff = it.heard !== it.question ? ' HEARD-DIFFERS' : '';
  console.log(`${it.key}\t${words}\t${spoken}${heardDiff}`);
}
