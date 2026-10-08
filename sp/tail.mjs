import { cutAtWordBudget, SPOKEN_WORD_GUARD } from './vsf.mjs';
const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const A = [1, 2, 3, 4, 5].map((i) => sentence(40, i)).join(' ');
const src = (async function* () { for (let i = 0; i < A.length; i += 9) yield A.slice(i, i + 9); })();
let out = '', done = null;
for await (const c of cutAtWordBudget(src, { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
console.log('text tail :', JSON.stringify(A.slice(-14)));
console.log('out  tail :', JSON.stringify(out.slice(-14)));
console.log('done      :', JSON.stringify(done));
