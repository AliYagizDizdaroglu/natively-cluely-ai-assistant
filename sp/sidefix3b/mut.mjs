import fs from 'node:fs'; import {createRequire} from 'node:module';
const M='C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
const {build}=createRequire(M+'/package.json')('esbuild'); const req=createRequire(import.meta.url);
const B=process.argv[2]; fs.mkdirSync(B+'/build/mut',{recursive:true});
const src=fs.readFileSync(B+'/verbalStreamFilter.ts','utf8'); const l=src.split('\n').find(x=>x.includes('!decided && probe'));
fs.writeFileSync(B+'/build/mut/verbalStreamFilter.ts',src.replace(l,''));
await build({entryPoints:[B+'/build/mut/verbalStreamFilter.ts'],outfile:B+'/build/mut/verbalStreamFilter.cjs',bundle:false,platform:'node',target:'node20',format:'cjs',absWorkingDir:B});
const run=async(m)=>{let o='';for await(const c of m.cutAtWordBudget((async function*(){yield '{';})(),{limit:200,floor:120,ceiling:200}))o+=c;return o;};
console.log('real', JSON.stringify(await run(req(B+'/build/new/verbalStreamFilter.cjs'))), 'mutant (flush removed)', JSON.stringify(await run(req(B+'/build/mut/verbalStreamFilter.cjs'))));
