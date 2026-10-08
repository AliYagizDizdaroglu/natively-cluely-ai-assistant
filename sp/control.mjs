import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));
const live=J('interview60.judge.json');
const HI={r1:J('interview60.judge.gemini-3.5-flash-lite_captured-high.json'),
          r2:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json'),
          r3:J('interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json')};
const V=it=>{if(!it)return null;const c=it.correctness,o=it.on_topic,d=it.delivery;
  if(c===0||o===0)return 'wrong'; if(c===2&&o===2&&d>=1)return 'ok'; return 'weak';};
const ids=Object.keys(live.items), F=ids.filter(i=>i.endsWith('F')), M=ids.filter(i=>!i.endsWith('F'));
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;

const STOP=new Set('the a an and or of to in for on with that this how what would you your we i is are be do does did as at by from it its their them there when which why can could should my our me us if then than about into over under between each any all not no such other both more most some very using use used given give tell'.split(/\s+/));
const cw=s=>[...new Set((s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3&&!STOP.has(x)))];
const cov=(q,a)=>{const qs=cw(q.split('[Follow-up to:')[0]); if(!qs.length)return null;
  const al=' '+(a||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ')+' ';
  return qs.filter(t=>al.includes(' '+t)||al.includes(' '+t.replace(/s$/,''))).length/qs.length;};

console.log('=== coverage: live vs EACH arm, 1-vs-1 sign test ===');
for(const set of [['follow-ups',F],['mains',M]]){
  const [nm,list]=set;
  for(const k of ['r1','r2','r3']){
    const pairs=list.filter(i=>HI[k].items[i]).map(i=>{
      const q=live.items[i].question;
      return {i,l:cov(q,live.items[i].answer),r:cov(q,HI[k].items[i].answer)};});
    const lo=pairs.filter(p=>p.l<p.r).length, hi=pairs.filter(p=>p.l>p.r).length;
    console.log(nm.padEnd(11),k,'n',pairs.length,'live mean',mean(pairs.map(p=>p.l)).toFixed(3),
      'arm mean',mean(pairs.map(p=>p.r)).toFixed(3),'| live lower',lo,'higher',hi);
  }
}

console.log('\n=== six offline replays of identical bytes: follow-up ok-counts ===');
const six=[['3.5-high r1',HI.r1],['3.5-high r2',HI.r2],['3.5-high r3',HI.r3],
  ['3.1-low  r1',J('interview60.judge.gemini-3.1-flash-lite_captured-low.json')],
  ['3.1-low  r2',J('interview60.judge.gemini-3.1-flash-lite_captured-low-r2.json')],
  ['3.1-low  r3',J('interview60.judge.gemini-3.1-flash-lite_captured-low-r3.json')]];
const tot=six.map(([n,s])=>{const v=F.filter(i=>V(s.items[i])==='ok').length;console.log(n,v+'/20');return v;});
console.log('replay mean',mean(tot).toFixed(2),'min',Math.min(...tot),'max',Math.max(...tot),'| LIVE 12/20');

// per-item p from 6 reps, null model for the live total
let mu=0,va=0,unstable=[];
for(const id of F){
  const v=six.map(([n,s])=>V(s.items[id])).filter(Boolean);
  const nOK=v.filter(x=>x==='ok').length;
  if(nOK>0&&nOK<v.length) unstable.push(id+'('+nOK+'/'+v.length+')');
  const p=(nOK+1)/(v.length+2); mu+=p; va+=p*(1-p);
}
console.log('\nitems unstable across the 6 identical replays:',unstable.join(' '),'=',unstable.length+'/20');
console.log('null from 6 reps (Laplace): expected %s sd %s ; live 12 -> z %s',
  mu.toFixed(2),Math.sqrt(va).toFixed(2),((12-mu)/Math.sqrt(va)).toFixed(2));

// binomial tail for the live total under that null (normal approx + exact-ish MC)
let cnt=0,N=200000;
const ps=F.map(id=>{const v=six.map(([n,s])=>V(s.items[id])).filter(Boolean);
  return (v.filter(x=>x==='ok').length+1)/(v.length+2);});
for(let t=0;t<N;t++){let s=0;for(const p of ps) if(Math.random()<p)s++; if(s<=12)cnt++;}
console.log('P(replay-like run scores <=12 of 20) =',(cnt/N).toFixed(4));

console.log('\n=== mains: live vs the three matched arms ===');
for(const [nm,s] of [['live',live],...Object.entries(HI)]){
  const present=M.filter(i=>s.items[i]);
  console.log(nm.padEnd(5),F.filter(i=>V(s.items[i])==='ok').length+'/20 followups,',
    M.filter(i=>V(s.items[i])==='ok').length+'/'+present.length+' mains',
    nm!=='live'?'(missing: '+M.filter(i=>!s.items[i]).join(',')+')':'');
}
