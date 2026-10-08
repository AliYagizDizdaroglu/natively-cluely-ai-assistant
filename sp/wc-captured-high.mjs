import fs from 'node:fs';
const p = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-29T11-42-00-h40c\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items', j.items.length);
const keys = new Set();
for (const it of j.items) {
  if (keys.has(it.key)) console.log('DUP KEY', it.key);
  keys.add(it.key);
  const words = it.answer.trim().split(/\s+/).filter(Boolean).length;
  console.log(it.key.padEnd(7), String(words).padStart(4), it.question === it.heard ? 'heard=q' : 'HEARD DIFFERS');
}
