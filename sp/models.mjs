import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));

const la=J('interview60.answers.json');
console.log('live answers ids:',Object.keys(la).join(' '));
const ms={};
for(const [k,v] of Object.entries(la)) ms[v.model]=(ms[v.model]||0)+1;
console.log('live models:',ms);
console.log('live levels:',[...new Set(Object.values(la).map(v=>v.level))]);

const p=J('interview60.prompts.json');
console.log('\nprompt ids (%d):',Object.keys(p).length,Object.keys(p).join(' '));
const pm={};
for(const v of Object.values(p)) pm[v.model]=(pm[v.model]||0)+1;
console.log('prompt models:',pm);

// what does the flight.done say
const d=J('interview60.flight.done.json');
console.log('\nflight.done keys:',Object.keys(d));
console.log(JSON.stringify(d).slice(0,3000));
