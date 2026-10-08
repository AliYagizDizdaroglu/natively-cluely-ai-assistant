const fs=require('fs'),vm=require('vm');
const MAIN='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
let src=fs.readFileSync(MAIN+'/dist-electron/electron/llm/IntentClassifier.js','utf8');
src+='\nmodule.exports.__detect=detectIntentByPattern;';
const m={exports:{}};
vm.runInNewContext(src,{module:m,exports:m.exports,console:{log(){},warn(){}},require:(n)=>n==='electron'?{app:{}}:require(n),__dirname:'',process,Object,Promise,Map,Set,JSON,RegExp,Math,Error});
const tier1=t=>{const r=m.exports.__detect(t);return r?r.intent:'none'};
const kn=require(MAIN+'/dist-electron/electron/knowledge/IntentClassifier.js');
const knI=t=>String(kn.classifyIntent(t));
const wc=t=>t.trim().split(/\s+/).length;
const sig=t=>({t1:tier1(t),kn:knI(t),w:wc(t)});
const cal=["Design a real-time fraud detection system, and explain how you would handle data ingestion, feature storage, model serving and monitoring, and what the tradeoffs are.","What is a Docker image?","Write code to implement an LRU cache.","Tell me more about that."];
cal.forEach((c,i)=>console.log('CAL',i,JSON.stringify(sig(c))));
(async()=>{
const {LIVE40}=await import('file:///'+MAIN+'/electron/test/golden/live40.questions.mjs');
const D=MAIN+'/electron/test/golden/interview60.runs/2026-10-07T00-22-47-router-default-r1/';
const pairs=require(D+'interview60.judge.pairs.json').items;
const live=new Set(require(D+'interview60.answers.router-live.json').map(x=>x.id));
const heard={};pairs.forEach(p=>heard[p.id]=p.heard||'');
const rows=LIVE40.map(it=>({id:it.id,cls:it.class,route:it.route,live:live.has(it.id),rost:sig(it.q),h:sig(heard[it.id]||it.q)}));
console.log('ids',rows.length,'heardMissing',rows.filter(r=>!heard[r.id]).length,'knValues',[...new Set(rows.map(r=>r.rost.kn))].join(','),'t1Values',[...new Set(rows.map(r=>r.rost.t1))].join(','));
for(const r of rows) if((r.live&&r.route==='HARD')||r.route==='EASY') console.log(r.id,r.cls,r.live?'L':'-','R:',r.rost.t1,r.rost.kn,r.rost.w,'H:',r.h.t1,r.h.kn,r.h.w);
const rules={
 'A t1 no regex hit':s=>s.t1==='none',
 'B kn not technical':s=>!/technical/i.test(s.kn),
 'C t1 none AND kn not technical':s=>s.t1==='none'&&!/technical/i.test(s.kn),
 'D words<=12':s=>s.w<=12,
 'E words<=12 AND kn not technical':s=>s.w<=12&&!/technical/i.test(s.kn),
};
const hardLive=rows.filter(r=>r.route==='HARD'&&r.live),easyAll=rows.filter(r=>r.route==='EASY'),hardAll=rows.filter(r=>r.route==='HARD');
for(const inp of ['rost','h']){console.log('INPUT',inp);
 for(const [n,f] of Object.entries(rules)){
  const ok=r=>f(r[inp]);
  console.log(n,'| hard caught',hardLive.filter(r=>!ok(r)).length+'/'+hardLive.length,'| easy blocked',easyAll.filter(r=>!ok(r)).length+'/20','| hard flagged',hardAll.filter(r=>!ok(r)).length+'/'+hardAll.length,'| blockedEasy:',easyAll.filter(r=>!ok(r)).map(r=>r.id).join(','),'| missedHard:',hardLive.filter(r=>ok(r)).map(r=>r.id).join(','));
 }}
})();
