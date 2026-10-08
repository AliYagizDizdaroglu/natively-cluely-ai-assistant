// Read-only word counter for grading delivery length. Prints key, whitespace word count,
// and count with em/en dashes treated as word breaks.
import { readFileSync } from 'node:fs';
const p = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-29T11-42-00-h40c\\interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r3.json';
const j = JSON.parse(readFileSync(p, 'utf8'));
console.log('items', j.items.length);
for (const it of j.items) {
  const a = it.answer.trim();
  const ws = a.split(/\s+/).filter(Boolean).length;
  const dash = a.replace(/[\u2014\u2013]/g, ' ').split(/\s+/).filter(Boolean).length;
  const paras = a.split(/\n\s*\n/).length;
  console.log(`${it.key}\t${ws}\t${dash}\tparas=${paras}`);
}
