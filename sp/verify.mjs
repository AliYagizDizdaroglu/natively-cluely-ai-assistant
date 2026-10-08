import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));
const live=J('interview60.judge.json');
const a=live.items['S1Q03F'];
console.log('S1Q03F live answer (raw JSON, c/o/d %d/%d/%d):',a.correctness,a.on_topic,a.delivery);
console.log(JSON.stringify(a.answer).slice(0,700));
console.log('\nasterisk count:',(a.answer.match(/\*/g)||[]).length);
console.log('grader reason:',a.reason);

// fallback vs markdown contingency
const map=JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/answers-map.json','utf8'));
const graded=map.filter(m=>m.id&&live.items[m.id.replace('~','')]);
const fb=graded.filter(m=>m.stalled), pr=graded.filter(m=>!m.stalled);
const hasStar=m=>/\*/.test(live.items[m.id.replace('~','')].answer);
console.log('\nfallback-served answers:',fb.length,'with markdown:',fb.filter(hasStar).length,
  '->',fb.map(m=>m.id.replace('~','')+(hasStar(m)?'[*]':'')).join(' '));
console.log('primary-served answers:',pr.length,'with markdown:',pr.filter(hasStar).length);

// live word counts: judge vs app log agreement (sanity on the map)
const w=s=>(s||'').trim().split(/\s+/).filter(Boolean).length;
const dis=graded.filter(m=>Math.abs(w(live.items[m.id.replace('~','')].answer)-m.words)>2);
console.log('\nmap sanity: answers where judge words != logged words (>2):',
  dis.map(m=>m.id+' judge='+w(live.items[m.id.replace('~','')].answer)+' log='+m.words).join(', ')||'none');
