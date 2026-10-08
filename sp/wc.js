const fs=require('fs');
const p="C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9/interview60.judge.pairs.gemini-3.1-flash-lite.json";
const d=JSON.parse(fs.readFileSync(p,'utf8'));
console.log('ITEMS',d.items.length);
for(const it of d.items){
  const w=it.answer.trim().split(/\s+/).length;
  const flags=[];
  if(/\n/.test(it.answer)) flags.push('NEWLINE');
  if(/[_]{1}[a-z]/.test(it.answer)) flags.push('SNAKE');
  if(/s3:\/\/|https?:\/\//.test(it.answer)) flags.push('URI');
  if(/^[-*]\s|\*\*/m.test(it.answer)) flags.push('MD');
  if(/would you like|shall I|\?\s*$/.test(it.answer)) flags.push('ASK');
  console.log(it.key.padEnd(4), String(w).padStart(4), (it.question===it.heard?'match':'MISHEARD').padEnd(9), flags.join(','));
}
