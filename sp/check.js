const fs=require('fs');
const dir="C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4/";
const arms=["gemini-3.1-flash-lite","gemini-3.5-flash-lite","gemma-4-31b-it"];
for(const a of arms){
  const pairs=JSON.parse(fs.readFileSync(dir+"interview60.judge.pairs."+a+".json","utf8"));
  const v=JSON.parse(fs.readFileSync(dir+"interview60.judge.verdicts."+a+".json","utf8"));
  const want=pairs.items.map(i=>i.key), got=Object.keys(v);
  const missing=want.filter(k=>!got.includes(k)), extra=got.filter(k=>!want.includes(k));
  let bad=[],longr=[],zeros=0;
  for(const k of got){
    const e=v[k];
    for(const f of ["correctness","on_topic","delivery"]){
      if(![0,1,2].includes(e[f])) bad.push(k+"."+f+"="+e[f]);
      if(e[f]===0) {}
    }
    if([e.correctness,e.on_topic,e.delivery].includes(0)) zeros++;
    const w=String(e.reason).trim().split(/\s+/).length;
    if(w>25) longr.push(k+"("+w+")");
  }
  console.log(a,"| graded:",got.length,"| missing:",missing.length,"| extra:",extra.length,
    "| badScores:",bad.join(",")||"none","| reasons>25w:",longr.join(",")||"none","| itemsWithAnyZero:",zeros);
}
