const fs = require('fs');
const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a/interview60.judge.pairs.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
for (const it of d.items) {
  const a = String(it.answer || '');
  const wc = a.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/(^|\n)\s*\d+\.\s/.test(a)) flags.push('NUMLIST');
  if (/(^|\n)\s*[-*\u2022]\s/.test(a)) flags.push('BULLET');
  if (/\*[A-Za-z][^*]{0,40}\*/.test(a)) flags.push('EMPHASIS');
  if (/frac\{|text\{|\$\$/.test(a)) flags.push('LATEX');
  if (/```|def \w+\(|http:|https:/.test(a)) flags.push('CODEISH');
  if (/\{"error"/.test(a)) flags.push('RAWJSON');
  if (/would you like|shall I|\?"?\s*$/i.test(a)) flags.push('ASKBACK');
  if (/_[a-z]+_[a-z]/.test(a)) flags.push('SNAKE');
  if (wc > 85) flags.push('LONG' + wc);
  console.log(it.key.padEnd(9), String(wc).padStart(3), flags.join(',') || '-');
}
