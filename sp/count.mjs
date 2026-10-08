import fs from 'node:fs';
const p = "C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.judge.pairs.json";
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items:', j.items.length);
for (const it of j.items) {
  const w = it.answer.trim().split(/\s+/).filter(Boolean).length;
  const md = /(\*\*|\*[A-Za-z]|^\s*[-*]\s|^\s*\d+\.\s|```|^#)/m.test(it.answer) ? 'MD?' : '';
  console.log(String(it.key).padEnd(8), String(w).padStart(4), md);
}
