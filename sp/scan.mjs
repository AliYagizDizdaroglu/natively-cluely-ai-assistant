import fs from 'node:fs';
const p = "C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.judge.pairs.json";
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
for (const it of j.items) {
  const flags = [];
  if (/\?/.test(it.answer)) flags.push('QUESTION_MARK');
  if (/would you like|shall i|do you want me/i.test(it.answer)) flags.push('OFFER');
  if (/[*_`#]/.test(it.answer)) flags.push('MD_CHAR:' + (it.answer.match(/[*_`#]/g) || []).join(''));
  if (/https?:\/\/|[A-Za-z]:\\|\/\w+\/\w+/.test(it.answer)) flags.push('URI_PATH');
  if (/^\s*[-*\d]/m.test(it.answer)) flags.push('LIST_START');
  if (/\n/.test(it.answer)) flags.push('NEWLINES:' + (it.answer.match(/\n/g) || []).length);
  if (flags.length) console.log(it.key, flags.join(' | '));
}
