import { stripSpokenNotation, filterVerbalLines, stripSuggestionBlock } from './vsf.mjs';

const BS = String.fromCharCode(92); // avoid literal backslashes in this file

async function run(gen, text, size) {
  async function* src(){ for (let i=0;i<text.length;i+=size) yield text.slice(i,i+size); }
  let out=''; for await (const c of gen(src())) out+=c; return out;
}

const cases = [
  ['CALIB rrf', 'the reciprocal rank as $1 / (c + ' + BS + 'text{rank})$ for each list.'],
  ['CALIB olog', 'Use `map.get(key)` in **O(1)**, not $O(' + BS + 'log n)$.'],
  ['text mid sentence', 'we call ' + BS + 'text{rank} the position.'],
  ['unclosed brace', 'we call ' + BS + 'text{rank the position and keep going for a while.'],
  ['mathrm', 'the ' + BS + 'mathrm{QPS} number matters.'],
  ['rate per hour', 'We paid $50/hour for the contractor.'],
  ['s3 cost', 'S3 egress is $0.09/GB, so caching pays for itself.'],
];

for (const [name, text] of cases) {
  const whole = await run(stripSpokenNotation, text, 10000);
  const sizes = [1,2,3,4,5,6,7,11,13];
  const outs = [];
  for (const s of sizes) outs.push(await run(stripSpokenNotation, text, s));
  const diverge = sizes.filter((s,i)=>outs[i]!==whole);
  console.log('\n[' + name + ']');
  console.log('  in:    ' + JSON.stringify(text));
  console.log('  whole: ' + JSON.stringify(whole));
  if (diverge.length) diverge.forEach(s=>console.log('  DIVERGE size=' + s + ': ' + JSON.stringify(outs[sizes.indexOf(s)])));
  else console.log('  chunk-invariant: yes');
}

// --- filterVerbalLines: chunk invariance + suggestion-block interaction ---
const lineCases = [
  ['numbered list', 'I validate first.\n\n1. I sort by score.\n2. I slice the top k.\n'],
  ['more block', 'Consistent hashing keeps movement small.\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling\n'],
  ['more block dash label', 'Answer here.\n__MORE__\n- trade-offs of vnode count\n'],
  ['prose number', '2.5 words per question word is the budget.\n'],
  ['prose 100', '100 nodes is the ceiling we tested.\n'],
  ['money line start', '$5 million was the budget.\n'],
  ['minus line start', '-5 degrees is the low end here.\n'],
];
for (const [name, text] of lineCases) {
  const whole = await run(filterVerbalLines, text, 10000);
  const sizes = [1,2,3,4,5,6,7,11,13];
  const outs = [];
  for (const s of sizes) outs.push(await run(filterVerbalLines, text, s));
  const diverge = sizes.filter((s,i)=>outs[i]!==whole);
  console.log('\n[lines: ' + name + ']');
  console.log('  in:    ' + JSON.stringify(text));
  console.log('  whole: ' + JSON.stringify(whole));
  if (diverge.length) diverge.forEach(s=>console.log('  DIVERGE size=' + s + ': ' + JSON.stringify(outs[sizes.indexOf(s)])));
  else console.log('  chunk-invariant: yes');
}

// --- full chain as WhatToAnswerLLM composes it ---
async function chain(text, size) {
  async function* src(){ for (let i=0;i<text.length;i+=size) yield text.slice(i,i+size); }
  let sugg = null;
  const g = stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(src()), s => { sugg = s; }));
  let out=''; for await (const c of g) out+=c;
  return { out, sugg };
}
const CHAIN = 'I rank by score, then cut to k.\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling\n';
for (const size of [1,3,6,1000]) {
  const r = await chain(CHAIN, size);
  console.log('\n[chain size=' + size + '] out=' + JSON.stringify(r.out) + ' sugg=' + JSON.stringify(r.sugg));
}
