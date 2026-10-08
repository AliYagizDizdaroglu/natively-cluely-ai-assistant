const fs = require('fs');
const p = process.argv[2];
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('items:', d.items.length);
for (const it of d.items) {
  const a = it.answer || '';
  const w = a.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/^\s*[-*+]\s/m.test(a)) flags.push('BULLET');
  if (/\*\*|\*\w/.test(a)) flags.push('ASTERISK');
  if (a.indexOf('`') >= 0) flags.push('BACKTICK');
  if (/\bO\(/.test(a)) flags.push('BIGO');
  if (/^\s*#/m.test(a)) flags.push('HEADING');
  if (a.indexOf('?') >= 0) flags.push('QMARK');
  if (/\n\n/.test(a)) flags.push('PARA');
  if (/https?:\/\//.test(a)) flags.push('URL');
  if (a.indexOf('\\') >= 0) flags.push('BACKSLASH');
  console.log(it.key.padEnd(10), String(w).padStart(4), flags.join(','));
}
