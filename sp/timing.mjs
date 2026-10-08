import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));
const S=new Date('2026-09-22T07:14:07.873Z').getTime(), E=new Date('2026-09-22T08:22:50.638Z').getTime();

const diag=fs.readFileSync(R+'verbal-diag.log','utf8').split(/\r?\n/);
const ft=[];
for(const l of diag){
  const m=l.match(/^\[(\d{4}-\d\d-\d\dT[\d:.]+Z)\]\s+first token\s+(\d+)ms/);
  if(!m) continue;
  const t=Date.parse(m[1]);
  ft.push({t,iso:m[1],ms:+m[2],inWin:t>=S&&t<=E});
}
console.log('first-token lines total',ft.length,'in window',ft.filter(f=>f.inWin).length,
  'before',ft.filter(f=>f.t<S).length,'after',ft.filter(f=>f.t>E).length);

const live=J('interview60.judge.json');
const ids=Object.keys(live.items);
const map=JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/answers-map.json','utf8'));
const verdict=it=>{const c=it.correctness,o=it.on_topic,d=it.delivery;
  if(c===0||o===0)return 'wrong'; if(c===2&&o===2&&d>=1)return 'ok'; return 'weak';};

// attach the last first-token line at or before each answer completion, within its race window
const win=ft.filter(f=>f.inWin);
const rows=[];
for(const a of map){
  const base=(a.id||'').replace('~','');
  if(!live.items[base]) continue;
  const cands=win.filter(f=>f.t<=a.t && (a.raceT==null||f.t>=a.raceT-1500));
  const f=cands.length?cands[cands.length-1]:null;
  rows.push({id:base, level:base.endsWith('F')?'F':'M', ttft:f?f.ms:null, ttftAt:f?f.iso:null,
    gen:a.raceT?a.t-a.raceT:null, words:a.words, stalled:a.stalled, v:verdict(live.items[base])});
}
const fups=rows.filter(r=>r.level==='F');
const num=a=>a.filter(x=>x!=null);
const mean=a=>num(a).reduce((x,y)=>x+y,0)/num(a).length;
const med=a=>{const s=num(a).sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
const p90=a=>{const s=num(a).sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(0.9*s.length))];};

console.log('\n=== live follow-up timing by verdict ===');
for(const v of ['ok','weak']){
  const g=fups.filter(r=>r.v===v);
  console.log(v.padEnd(5),'n',g.length,
    'ttft median',med(g.map(r=>r.ttft)),'mean',mean(g.map(r=>r.ttft)).toFixed(0),
    '| gen median',med(g.map(r=>r.gen)),'mean',mean(g.map(r=>r.gen)).toFixed(0),
    '| words mean',mean(g.map(r=>r.words)).toFixed(1));
}
console.log('\nall live follow-ups: ttft p50',med(fups.map(r=>r.ttft)),'p90',p90(fups.map(r=>r.ttft)));
console.log('live follow-ups with gen>10000ms:',fups.filter(r=>r.gen>10000).map(r=>r.id+'('+r.v+')').join(',')||'none');
console.log('live answers (all 40) with gen>10000ms:',rows.filter(r=>r.gen>10000).map(r=>r.id+'('+r.v+')').join(','));

console.log('\n=== per follow-up ===');
console.log('id       v      ttft   gen   words stalled');
for(const r of fups) console.log(r.id.padEnd(8),r.v.padEnd(6),String(r.ttft).padStart(5),String(r.gen).padStart(6),String(r.words).padStart(5),r.stalled?'FALLBACK':'');

// replay ttft/total by verdict
console.log('\n=== replay arms: ttft/total by verdict on follow-ups ===');
const armF={r1:'',r2:'-r2',r3:'-r3'};
for(const [k,sfx] of Object.entries(armF)){
  const recs=J(`interview60.answers.gemini-3.5-flash-lite_captured-high${sfx}.json`);
  const jj=J(`interview60.judge.gemini-3.5-flash-lite_captured-high${sfx}.json`);
  const f=Object.keys(recs).filter(i=>i.endsWith('F'));
  for(const v of ['ok','weak']){
    const g=f.filter(i=>jj.items[i]&&verdict(jj.items[i])===v);
    console.log(k,v.padEnd(5),'n',g.length,'ttft med',med(g.map(i=>recs[i].ttft)),
      'total med',med(g.map(i=>recs[i].total)),'words mean',mean(g.map(i=>recs[i].words)).toFixed(1));
  }
}
