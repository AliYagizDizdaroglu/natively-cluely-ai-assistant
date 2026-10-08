import fs from 'node:fs';
const M='C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/';
const D=process.argv[2];
for (const f of ['verbalStreamFilter.ts','verbalStreamFilter.test.ts']) { fs.copyFileSync(M+'electron/llm/'+f, D+'/'+f); console.log(f, fs.readFileSync(D+'/'+f).includes(13)?'HAS CR':'LF'); }
