import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));
const live=J('interview60.judge.json');
const A={r1:J('interview60.judge.gemini-3.5-flash-lite_captured-high.json'),
         r2:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json'),
         r3:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json')};
const V=it=>{if(!it)return null;const c=it.correctness,o=it.on_topic,d=it.delivery;
  if(c===0||o===0)return 'wrong'; if(c===2&&o===2&&d>=1)return 'ok'; return 'weak';};
const ids=Object.keys(live.items), F=ids.filter(i=>i.endsWith('F')), M=ids.filter(i=>!i.endsWith('F'));

// --- 1. multi-hop check on S2Q05F ---
console.log('=== S2Q05F: does any arm address multi-hop? ===');
for(const [k,src] of [['live',live],...Object.entries(A)]){
  const t=(src.items['S2Q05F']||{}).answer||'';
  console.log(k.padEnd(5),'mentions multi-hop/hop:',/multi[- ]?hop|\bhop\b/i.test(t),
    '| verdict',V(src.items['S2Q05F']),'| grader reason:',(src.items['S2Q05F']||{}).reason);
}

// --- 2. markdown / non-speakable characters in every answer ---
console.log('\n=== markdown or symbol leakage into spoken text ===');
const bad=s=>{
  const hits=[];
  if(/\*/.test(s)) hits.push('asterisk');
  if(/^\s*[-•]\s/m.test(s)) hits.push('bullet');
  if(/^#{1,6}\s/m.test(s)) hits.push('heading');
  if(/`/.test(s)) hits.push('backtick');
  if(/\$[^ ]*\$/.test(s)) hits.push('latex');
  if(/\n\s*\d+\.\s/.test(s)) hits.push('numlist');
  return hits;
};
for(const [k,src] of [['live',live],...Object.entries(A)]){
  const hit=ids.filter(i=>src.items[i]&&bad(src.items[i].answer).length)
    .map(i=>i+'['+bad(src.items[i].answer).join('/')+']');
  console.log(k.padEnd(5),hit.length?hit.join(' '):'clean');
}

// --- 3. discordance + sign test on follow-ups ---
console.log('\n=== discordant follow-ups: live vs replay majority ===');
let liveLoses=[],liveWins=[];
for(const id of F){
  const lv=V(live.items[id]);
  const rs=['r1','r2','r3'].map(k=>V(A[k].items[id]));
  const nOK=rs.filter(x=>x==='ok').length;
  const maj=nOK>=2?'ok':'weak';
  if(lv!==maj){ (maj==='ok'?liveLoses:liveWins).push(id+' (replay '+nOK+'/3 ok)'); }
}
console.log('live loses:',liveLoses.join(', ')||'none');
console.log('live wins :',liveWins.join(', ')||'none');
const n=liveLoses.length+liveWins.length, k=liveLoses.length;
const C=(n,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return r;};
let p=0; for(let i=Math.min(k,n-k);i>=0;i--) p+=C(n,i);
console.log('sign test: %d discordant, %d one way -> two-sided p = %s',n,k,(2*p/Math.pow(2,n)).toFixed(4));
// excluding the already-explained markdown item
const n2=n-1,k2=k-1; let p2=0; for(let i=Math.min(k2,n2-k2);i>=0;i--) p2+=C(n2,i);
console.log('excluding S1Q03F (known markdown defect): %d discordant -> p = %s',n2,(2*p2/Math.pow(2,n2)).toFixed(4));

// --- 4. replay-internal item flip rate + null model ---
console.log('\n=== replay-internal instability on the SAME bytes ===');
const tally={};
for(const id of F){ const nOK=['r1','r2','r3'].map(kk=>V(A[kk].items[id])).filter(x=>x==='ok').length;
  tally[nOK]=(tally[nOK]||0)+1; }
console.log('follow-ups by replay ok-count (3 reps):',JSON.stringify(tally));
const flip=F.filter(id=>{const s=new Set(['r1','r2','r3'].map(kk=>V(A[kk].items[id])));return s.size>1;});
console.log('items that flipped between identical replays:',flip.join(', '),'=',flip.length+'/20');
// Laplace-smoothed null: is live 12 surprising?
let mu=0,va=0;
for(const id of F){const nOK=['r1','r2','r3'].map(kk=>V(A[kk].items[id])).filter(x=>x==='ok').length;
  const pp=(nOK+1)/5; mu+=pp; va+=pp*(1-pp);}
console.log('smoothed null from replays: expected ok = %s, sd = %s ; live = 12 -> z = %s',
  mu.toFixed(2),Math.sqrt(va).toFixed(2),((12-mu)/Math.sqrt(va)).toFixed(2));

// --- 5. arm totals incl. mains, and the 3.1 captured-low arms for context ---
console.log('\n=== all arms, follow-ups / mains ok-counts ===');
const arms=[['LIVE (3.5-lite HIGH, in-app)',live],
  ['captured-high r1',A.r1],['captured-high r2',A.r2],['captured-high r3',A.r3],
  ['captured-low(3.1) r1',J('interview60.judge.gemini-3.1-flash-lite_captured-low.json')],
  ['captured-low(3.1) r2',J('interview60.judge.gemini-3.1-flash-lite_captured-low-r2.json')],
  ['captured-low(3.1) r3',J('interview60.judge.gemini-3.1-flash-lite_captured-low-r3.json')]];
for(const [nm,src] of arms){
  const fo=F.filter(i=>V(src.items[i])==='ok').length, fn=F.filter(i=>src.items[i]).length;
  const mo=M.filter(i=>V(src.items[i])==='ok').length, mn=M.filter(i=>src.items[i]).length;
  console.log(nm.padEnd(30),'followups',fo+'/'+fn,' mains',mo+'/'+mn);
}

// --- 6. paired content-word coverage of the asked question (calibration included) ---
const STOP=new Set('the a an and or of to in for on with that this how what would you your we i is are be do does did as at by from it its their them there when which why can could should i\'d we\'d my our me us if then than about into over under between each any all not no such other both more most some very using use used given give tell me them'.split(/\s+/));
const cw=s=>[...new Set((s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/)
  .filter(x=>x.length>3&&!STOP.has(x)))];
const cov=(q,a)=>{const qs=cw(q.split('[Follow-up to:')[0]); if(!qs.length)return null;
  const al=' '+(a||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ')+' ';
  return qs.filter(t=>al.includes(' '+t)||al.includes(' '+t.replace(/s$/,''))).length/qs.length;};
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
console.log('\n=== question content-word coverage (live vs replay mean), follow-ups ===');
const lc=[],rc=[],dl=[];
for(const id of F){
  const q=live.items[id].question;
  const l=cov(q,live.items[id].answer);
  const r=mean(['r1','r2','r3'].map(kk=>cov(q,A[kk].items[id].answer)));
  lc.push(l);rc.push(r);dl.push({id,l,r,d:l-r,v:V(live.items[id])});
}
console.log('live mean %s  replay mean %s  live higher on %d/20',
  mean(lc).toFixed(3),mean(rc).toFixed(3),dl.filter(x=>x.d>0).length);
console.log('live ok  items coverage mean',mean(dl.filter(x=>x.v==='ok').map(x=>x.l)).toFixed(3));
console.log('live weak items coverage mean',mean(dl.filter(x=>x.v==='weak').map(x=>x.l)).toFixed(3));
// calibration: does this metric separate a real omission? S2Q08F live omits "current"
console.log('calibration — S2Q08F "current/fresh" present? live',
  /current|fresh|lag|timestamp|caught up|sync/i.test(live.items['S2Q08F'].answer),
  '| r1',/current|fresh|lag|timestamp|caught up|sync/i.test(A.r1.items['S2Q08F'].answer),
  '| r2',/current|fresh|lag|timestamp|caught up|sync/i.test(A.r2.items['S2Q08F'].answer),
  '| r3',/current|fresh|lag|timestamp|caught up|sync/i.test(A.r3.items['S2Q08F'].answer));
