import fs from 'node:fs'; import {execFileSync} from 'node:child_process';
const M='C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
const head=execFileSync('git',['-C',M,'show','HEAD:electron/llm/verbalStreamFilter.ts'],{maxBuffer:1e8}).toString('utf8');
const old=fs.readFileSync(process.argv[2],'utf8');
console.log(head.length, old.length, head===old, head.replace(/\r/g,'')===old.replace(/\r/g,''));
