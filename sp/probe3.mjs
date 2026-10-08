import { stripSpokenNotation as now } from './vsf.mjs';
import { stripSpokenNotation as before } from './vsf_base.mjs';

async function run(gen, text, size) {
  async function* src(){ for (let i=0;i<text.length;i+=size) yield text.slice(i,i+size); }
  let out=''; for await (const c of gen(src())) out+=c; return out;
}
const cases = [
  'We paid $50/hour for the contractor.',
  'S3 egress is $0.09/GB, so caching pays for itself.',
  'The offer was $120 + equity.',
  'It cost $5 million.',
  'Roughly $1.5M a year.',
];
for (const t of cases) {
  console.log(JSON.stringify(t));
  console.log('  base: ' + JSON.stringify(await run(before, t, 10000)));
  console.log('  head: ' + JSON.stringify(await run(now, t, 10000)));
}
