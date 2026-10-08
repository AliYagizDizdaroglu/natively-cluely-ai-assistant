// Throwaway: back up the harness-written files, place the reviewed records, build INDEX.md = HEAD + the r1 row.
import fs from 'fs'; import {execFileSync} from 'child_process';
const M='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant', P=M+'/electron/test/golden/passes/';
const S='C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/staging/', B=S+'backup/';
fs.mkdirSync(B,{recursive:true});
for (const f of ['INDEX.md','2026-10-07T00-22-47-router-default-r1.md']) fs.copyFileSync(P+f,B+f);
fs.copyFileSync(S+'passes/2026-10-07T00-22-47-router-default-r1.md',P+'2026-10-07T00-22-47-router-default-r1.md');
fs.copyFileSync(S+'passes/2026-10-07-router-default-result.md',P+'2026-10-07-router-default-result.md');
const head=execFileSync('git',['-C',M,'show','HEAD:electron/test/golden/passes/INDEX.md']).toString();
const row=fs.readFileSync(S+'INDEX-row.txt','utf8').split(/\r?\n/).filter(l=>l.startsWith('| 2026-10-07T00-22-47-router-default-r1 '));
if(row.length!==1){console.log('ROW COUNT',row.length);process.exit(1);}
const out=head.replace(/\n*$/,'\n')+row[0]+'\n';
fs.writeFileSync(P+'INDEX.md',out.replace(/\r/g,''));
for (const f of ['INDEX.md','2026-10-07T00-22-47-router-default-r1.md','2026-10-07-router-default-result.md']){const b=fs.readFileSync(P+f);console.log(f,b.length,'CR',b.includes(13));}
console.log('INDEX lines',out.split('\n').length-1);
