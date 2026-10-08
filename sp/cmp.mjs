import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));

const live=J('interview60.judge.json');
const arms={
  r1:J('interview60.judge.gemini-3.5-flash-lite_captured-high.json'),
  r2:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json'),
  r3:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json'),
};
const recs={
  r1:J('interview60.answers.gemini-3.5-flash-lite_captured-high.json'),
  r2:J('interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json'),
  r3:J('interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json'),
};

const verdict=it=>{
  if(it==null) return 'absent';
  const c=it.correctness,o=it.on_topic,d=it.delivery;
  if(c===0||o===0) return 'wrong';
  if(c===2&&o===2&&d>=1) return 'ok';
  return 'weak';
};
const words=s=>(s||'').trim().split(/\s+/).filter(Boolean).length;
const endsTerm=s=>/[.!?"')\]]\s*$/.test((s||'').trim());

const ids=Object.keys(live.items);
const fups=ids.filter(i=>i.endsWith('F'));
const mains=ids.filter(i=>!i.endsWith('F'));

const rows=[];
for(const id of fups){
  const L=live.items[id];
  const row={id, liveV:verdict(L), liveW:words(L.answer), liveTerm:endsTerm(L.answer),
             liveC:L.correctness, liveO:L.on_topic, liveD:L.delivery};
  for(const k of ['r1','r2','r3']){
    const A=arms[k].items[id];
    row[k+'V']=verdict(A);
    row[k+'W']=A?words(A.answer):null;
    row[k+'Term']=A?endsTerm(A.answer):null;
    const rc=recs[k][id];
    row[k+'ttft']=rc?rc.ttft:null;
    row[k+'total']=rc?rc.total:null;
    row[k+'finish']=rc?rc.finish:null;
    row[k+'recW']=rc?rc.words:null;
  }
  rows.push(row);
}

const cnt=(arr,v)=>arr.filter(x=>x===v).length;
const sum=a=>a.reduce((x,y)=>x+y,0);
const mean=a=>a.length?sum(a)/a.length:NaN;
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};

console.log('=== FOLLOW-UP verdict tallies (n=%d) ===',fups.length);
for(const k of ['live','r1','r2','r3']){
  const vs=rows.map(r=>r[k+'V']);
  console.log(k.padEnd(5),'ok',cnt(vs,'ok'),'weak',cnt(vs,'weak'),'wrong',cnt(vs,'wrong'));
}
console.log('\n=== MAIN verdict tallies (n=%d) ===',mains.length);
for(const k of ['live','r1','r2','r3']){
  const src=k==='live'?live:arms[k];
  const vs=mains.map(i=>verdict(src.items[i]));
  console.log(k.padEnd(5),'ok',cnt(vs,'ok'),'weak',cnt(vs,'weak'),'wrong',cnt(vs,'wrong'));
}

console.log('\n=== WORD COUNTS ===');
const lw=rows.map(r=>r.liveW);
const rw=rows.flatMap(r=>[r.r1W,r.r2W,r.r3W]);
console.log('follow-ups live   mean',mean(lw).toFixed(1),'median',med(lw),'min',Math.min(...lw),'max',Math.max(...lw));
console.log('follow-ups replay mean',mean(rw).toFixed(1),'median',med(rw),'min',Math.min(...rw),'max',Math.max(...rw));
// paired per-id
const perId=rows.map(r=>({id:r.id,live:r.liveW,rep:mean([r.r1W,r.r2W,r.r3W]),d:r.liveW-mean([r.r1W,r.r2W,r.r3W])}));
console.log('paired live-minus-replaymean: mean %s median %s ; live shorter on %d/%d',
  mean(perId.map(p=>p.d)).toFixed(1), med(perId.map(p=>p.d)).toFixed(1),
  perId.filter(p=>p.d<0).length, perId.length);

// mains words
const mlw=mains.map(i=>words(live.items[i].answer));
const mrw=mains.flatMap(i=>['r1','r2','r3'].map(k=>arms[k].items[i]?words(arms[k].items[i].answer):null)).filter(x=>x!=null);
console.log('mains      live   mean',mean(mlw).toFixed(1),'median',med(mlw));
console.log('mains      replay mean',mean(mrw).toFixed(1),'median',med(mrw));

console.log('\n=== TERMINAL PUNCTUATION / TRUNCATION ===');
console.log('live follow-ups not ending in terminal punct:',rows.filter(r=>!r.liveTerm).map(r=>r.id).join(',')||'none');
for(const k of ['r1','r2','r3'])
  console.log(k,'not ending terminal:',rows.filter(r=>!r[k+'Term']).map(r=>r.id).join(',')||'none');
console.log('live mains not ending terminal:',mains.filter(i=>!endsTerm(live.items[i].answer)).join(',')||'none');
console.log('replay finish reasons != STOP:',rows.flatMap(r=>['r1','r2','r3'].filter(k=>r[k+'finish']!=='STOP').map(k=>r.id+':'+k+':'+r[k+'finish'])).join(',')||'none');

console.log('\n=== PER-ID TABLE (follow-ups) ===');
console.log('id       liveV  c/o/d  liveW | r1V r1W | r2V r2W | r3V r3W | repOK');
for(const r of rows){
  const repOK=['r1','r2','r3'].filter(k=>r[k+'V']==='ok').length;
  console.log(r.id.padEnd(8),r.liveV.padEnd(6),`${r.liveC}/${r.liveO}/${r.liveD}`.padEnd(6),
    String(r.liveW).padStart(4),'|',r.r1V.padEnd(5),String(r.r1W).padStart(4),'|',
    r.r2V.padEnd(5),String(r.r2W).padStart(4),'|',r.r3V.padEnd(5),String(r.r3W).padStart(4),'|',repOK);
}
fs.writeFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/rows.json',JSON.stringify(rows,null,1));
