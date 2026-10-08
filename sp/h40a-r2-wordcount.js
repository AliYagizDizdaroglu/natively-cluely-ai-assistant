// Throwaway: word counts + delivery-format flags for one pairs file (read-only).
const fs = require('fs');
const p = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-24T08-20-12-h40a\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('top-level fields:', Object.keys(d).join(','), '| items:', d.items.length);
const keys = new Set();
for (const it of d.items) {
  if (keys.has(it.key)) console.log('DUP KEY', it.key);
  keys.add(it.key);
  const a = it.answer || '';
  const ws = a.trim().split(/\s+/).filter(Boolean).length;
  const wsDash = a.trim().split(/[\s\u2014\u2013]+/).filter(Boolean).length;
  const flags = [];
  if (/[*#`]/.test(a) || /^\s*([-\u2022]|\d+\.)\s/m.test(a)) flags.push('markdown/list');
  if (/\n/.test(a)) flags.push('newline');
  if (/\?/.test(a)) flags.push('qmark');
  if (/O\(/.test(a)) flags.push('bigO');
  if (/would you like|let me know|do you want|shall i/i.test(a)) flags.push('offer');
  if (/https?:|[a-z]+:\/\/|\w:\\/i.test(a)) flags.push('uri/path');
  if (/\w_\w|\(\)/.test(a)) flags.push('identifier');
  if (it.heard !== it.question) flags.push('HEARD-DIFFERS');
  console.log(it.key.padEnd(6), String(ws).padStart(4), String(wsDash).padStart(4), flags.join(','));
}
console.log('distinct keys:', keys.size);
