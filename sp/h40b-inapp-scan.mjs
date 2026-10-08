import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const it of j.items) {
  const a = it.answer;
  const ws = a.trim().split(/\s+/).filter(Boolean).length;
  const spoken = a.trim().split(/[\s—–]+/).filter(Boolean).length;
  const flags = [];
  if (a.includes('?')) flags.push('Q?' + (a.match(/\?/g) || []).length);
  if (/[*`#]/.test(a)) flags.push('MD');
  if (/^\s*[-•\d]+[.)]?\s/m.test(a)) flags.push('LIST?');
  if (a.includes('\n')) flags.push('NL');
  if (/O\(/.test(a)) flags.push('BIGO');
  if (/https?:|\/\w+\//.test(a)) flags.push('URI?');
  console.log(it.key.padEnd(6), String(ws).padStart(4), String(spoken).padStart(4), flags.join(' '));
}
