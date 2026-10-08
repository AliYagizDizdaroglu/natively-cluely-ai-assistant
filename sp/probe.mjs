import { stripSpokenNotation, filterVerbalLines } from './vsf.mjs';

async function run(gen, text, size) {
  async function* src(){ for (let i=0;i<text.length;i+=size) yield text.slice(i,i+size); }
  let out=''; for await (const c of gen(src())) out+=c; return out;
}
const cases = [
  ['CALIB strip formula', 'the reciprocal rank as $1 / (c + \text{rank})$ for each list.'],
  ['CALIB keep money', 'It cost $5 million, about $1.5M a year, or $5-10 million over the term.'],
  ['rate per hour', 'We paid $50/hour for the contractor.'],
  ['s3 cost', 'S3 egress is $0.09/GB, so caching pays for itself.'],
  ['plus money', 'The offer was $120 + equity.'],
  ['money star', 'It is $5 * 3 per unit.'],
  ['dollar 7 digits formula', 'the value $1234567 / 2 is large.'],
  ['dollar then long space formula', 'the value $1   / (c) is large.'],
  ['exponent', 'It runs in $2^n$ time.'],
];
for (const [name, text] of cases) {
  const whole = await run(stripSpokenNotation, text, 10000);
  const sizes = [1,2,3,4,5,7,11,13];
  const outs = [];
  for (const s of sizes) outs.push(await run(stripSpokenNotation, text, s));
  const diverge = sizes.filter((s,i)=>outs[i]!==whole);
  console.log(`\n[${name}]\n  in:    ${JSON.stringify(text)}\n  whole: ${JSON.stringify(whole)}`);
  if (diverge.length) diverge.forEach(s=>console.log(`  DIVERGE size=${s}: ${JSON.stringify(outs[sizes.indexOf(s)])}`));
  else console.log('  chunk-invariant: yes');
}
