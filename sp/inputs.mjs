import fs from 'fs';
const R='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/';
const J=f=>JSON.parse(fs.readFileSync(R+f,'utf8'));

const la=J('interview60.answers.json');
console.log('live answers type',Array.isArray(la)?'array '+la.length:'object '+Object.keys(la).length);
const k0=Array.isArray(la)?0:Object.keys(la)[0];
console.log('live answer rec keys:',Object.keys(la[k0]));
console.log(JSON.stringify(la[k0]).slice(0,900));

const p=J('interview60.prompts.json');
console.log('\nprompts type',Array.isArray(p)?'array '+p.length:'object '+Object.keys(p).length);
const pk=Array.isArray(p)?0:Object.keys(p)[0];
console.log('prompt rec keys:',Object.keys(p[pk]));
const s=JSON.stringify(p[pk]);
console.log(s.slice(0,600));
console.log('... len',s.length);
