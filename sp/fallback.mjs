import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));
const log=fs.readFileSync(R+'natively_debug.log','utf8').split(/\r?\n/);

const T=l=>{const m=l.match(/^(\d{4}-\d\d-\d\dT[\d:.]+Z)/);return m?Date.parse(m[1]):null;};
const norm=s=>(s||'').replace(/\s+/g,' ').replace(/[^a-z0-9 ]/gi,'').toLowerCase().trim();

const events=[]; // {i,t,kind,text}
log.forEach((l,i)=>{
  if(/verbal stall race: trying/.test(l)) events.push({i,t:T(l),kind:'race'});
  else if(/stalled after \d+ms — falling back/.test(l)) events.push({i,t:T(l),kind:'stall'});
  else if(/\[Answer\] full:/.test(l)){
    const m=l.match(/\[Answer\] full:\s*"([\s\S]*)"\s*$/);
    events.push({i,t:T(l),kind:'answer',text:m?m[1]:l.split('full:')[1]});
  }
  else if(/\[Answer\] budget: words=/.test(l)){
    const m=l.match(/words=(\d+) cut=(\w+)/);
    events.push({i,t:T(l),kind:'budget',words:+m[1],cut:m[2]});
  }
});

// pair each answer with the preceding race, and note a stall between
const answers=[];
for(let k=0;k<events.length;k++){
  if(events[k].kind!=='answer') continue;
  let raceIdx=-1;
  for(let j=k-1;j>=0;j--) if(events[j].kind==='race'){raceIdx=j;break;}
  let stalled=false;
  for(let j=raceIdx+1;j<k;j++) if(events[j].kind==='stall') stalled=true;
  // budget line nearest (before or after within 3 events)
  let words=null,cut=null;
  for(let j=k-1;j>=Math.max(0,k-4);j--) if(events[j].kind==='budget'){words=events[j].words;cut=events[j].cut;break;}
  if(words==null) for(let j=k+1;j<Math.min(events.length,k+4);j++) if(events[j].kind==='budget'){words=events[j].words;cut=events[j].cut;break;}
  answers.push({line:events[k].i+1,t:events[k].t,tISO:new Date(events[k].t).toISOString(),
    stalled, raceT:raceIdx>=0?events[raceIdx].t:null, words, cut, text:events[k].text});
}
console.log('answers logged:',answers.length,'stalled:',answers.filter(a=>a.stalled).length);

// match to judge ids
const live=J('interview60.judge.json');
const ids=Object.keys(live.items);
const byNorm=new Map();
for(const id of ids) byNorm.set(norm(live.items[id].answer), id);

for(const a of answers){
  const n=norm(a.text);
  let id=byNorm.get(n);
  if(!id){ // fuzzy: longest common prefix match
    let best=null,bl=0;
    for(const cand of ids){
      const c=norm(live.items[cand].answer);
      let p=0; while(p<c.length&&p<n.length&&c[p]===n[p])p++;
      if(p>bl){bl=p;best=cand;}
    }
    if(bl>60) id=best+(bl===norm(live.items[best].answer).length?'':'~');
  }
  a.id=id||'UNMATCHED';
}

const verdict=it=>{const c=it.correctness,o=it.on_topic,d=it.delivery;
  if(c===0||o===0)return 'wrong'; if(c===2&&o===2&&d>=1)return 'ok'; return 'weak';};

console.log('\n=== answers with stall fallback (served by gemini-3.1-flash-lite, thinking=LOW) ===');
for(const a of answers.filter(x=>x.stalled)){
  const base=a.id.replace('~','');
  const it=live.items[base];
  const genMs=a.raceT?a.t-a.raceT:null;
  console.log(a.tISO,'line',a.line,'id',a.id.padEnd(8),'words',a.words,'genMs',genMs,
    it?('verdict '+verdict(it)+' c/o/d '+it.correctness+'/'+it.on_topic+'/'+it.delivery):'(no judge item)');
}

console.log('\n=== full answer->id map (all 42) ===');
for(const a of answers){
  const base=a.id.replace('~','');
  const it=live.items[base];
  console.log(a.tISO,String(a.line).padStart(6),a.id.padEnd(9),'w='+String(a.words).padStart(3),
    'gen='+String(a.raceT?a.t-a.raceT:'?').padStart(6),a.stalled?'FALLBACK-3.1-LOW':'primary-3.5-HIGH',
    it?verdict(it):'-');
}
fs.writeFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/answers-map.json',JSON.stringify(answers,null,1));
