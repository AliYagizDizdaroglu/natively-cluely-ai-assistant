const p = require('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-05T13-50-01-after6/interview60.judge.pairs.json');
for (const it of p.items) {
  const a = (it.answer || '').trim();
  const words = a.split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (!/^[A-Z"(]/.test(a)) flags.push('LEADCHOP');
  if (/(^|\n)\s*([-*]\s|\d+\.\s)/.test(a)) flags.push('LIST');
  if (/\*\*|`|#{1,6}\s/.test(a)) flags.push('MD');
  if (/O\(|cdot|\$/.test(a)) flags.push('MATH');
  if (/would you like|shall I/i.test(a)) flags.push('OFFER');
  if (/\?$/.test(a)) flags.push('ENDQ');
  if (!/[.!?"]$/.test(a)) flags.push('TRUNC:' + JSON.stringify(a.slice(-30)));
  console.log(it.key.padEnd(5), String(words).padStart(3) + 'w', flags.join(' '));
}
