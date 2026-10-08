import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));
const live=J('interview60.judge.json');
const A={r1:J('interview60.judge.gemini-3.5-flash-lite_captured-high.json'),
         r2:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json'),
         r3:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json')};
const w=s=>(s||'').trim().split(/\s+/).filter(Boolean).length;
for(const id of (process.argv[2]||'S2Q02F,S2Q05F,S2Q08F,S1Q03F').split(',')){
  const L=live.items[id];
  console.log('\n'+'='.repeat(100));
  console.log('ID',id);
  console.log('Q:',L.question.split('[Follow-up to:')[0].trim());
  console.log('\n--- LIVE ('+w(L.answer)+'w, c/o/d '+L.correctness+'/'+L.on_topic+'/'+L.delivery+') ---');
  console.log(JSON.stringify(L.answer));
  console.log('REASON:',L.reason);
  for(const k of ['r1','r2','r3']){
    const a=A[k].items[id]; if(!a){console.log('\n--- '+k+': absent ---');continue;}
    console.log('\n--- '+k+' ('+w(a.answer)+'w, c/o/d '+a.correctness+'/'+a.on_topic+'/'+a.delivery+') ---');
    console.log(a.answer);
    console.log('REASON:',a.reason);
  }
}
