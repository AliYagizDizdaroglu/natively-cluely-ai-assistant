import { cutAtWordBudget, SPOKEN_WORD_GUARD, stripSpokenNotation } from './vsf.mjs';

const words = (s) => (s.match(/\S+/g) ?? []).length;
const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';

async function run(text, chunk = 9) {
  const src = (async function* () { for (let i = 0; i < text.length; i += chunk) yield text.slice(i, i + chunk); })();
  let done = null, out = '';
  for await (const c of cutAtWordBudget(src, { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
  return { words: words(out), done, tailLost: text.length - out.length };
}
async function runChunks(chunks) {
  const src = (async function* () { for (const c of chunks) yield c; })();
  let done = null, out = '';
  for await (const c of cutAtWordBudget(src, { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
  return { words: words(out), done };
}

// A: exactly 200 words, ends with a period
const A = [1, 2, 3, 4, 5].map((i) => sentence(40, i)).join(' ');
console.log('A exactly-200 ending in "."   ', JSON.stringify(await run(A)));

// B: a chunk pushes emitted 199 -> 203 (one big chunk, no terminator until the end)
const B199 = Array.from({ length: 199 }, (_, k) => `a${k}`).join(' ');
console.log('B 199 then a 4-word chunk     ', JSON.stringify(await runChunks([B199, ' b1 b2 b3 b4', ' tail tail tail.'])));

// C: no terminator at all, 250 words
const C = Array.from({ length: 250 }, (_, k) => `c${k}`).join(' ');
console.log('C 250 words, no terminator    ', JSON.stringify(await run(C)));

// D: 190 words then one 30-word sentence -> overshoot past 200?
const D = [sentence(38, 1), sentence(38, 2), sentence(38, 3), sentence(38, 4), sentence(38, 5), sentence(30, 6)].join(' ');
console.log('D 190 + a 30-word sentence    ', JSON.stringify(await run(D)));

// E: 199 words then one 40-word sentence
const E = [sentence(40, 1), sentence(40, 2), sentence(40, 3), sentence(40, 4), sentence(39, 5), sentence(40, 6)].join(' ');
console.log('E 199 + a 40-word sentence    ', JSON.stringify(await run(E)));

// F: 150 words, well under
const F = [1, 2, 3].map((i) => sentence(50, i)).join(' ');
console.log('F 150 words                   ', JSON.stringify(await run(F)));

// ---- notation ----
async function notation(text, size) {
  const src = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })();
  let out = '';
  for await (const c of stripSpokenNotation(src)) out += c;
  return out;
}
const cases = [
  'the p99 improved by $9.5\\%$ after the change.',
  'the p99 improved by $9.5\\% after the change.',
  'it cost $9.5 per user.',
  'margins are $5% better',            // no backslash
  'we saved $5 \\% of the budget',
  'the total is 100$ \\% odd',
  'it cost $9.5 \\text{per user} now',
  'we pay $5 million and $1.5M and $5-10 million',
  'it is $50/hour or $0.09/GB or $120 + equity',
  'stream ends in $9.5\\',
  'stream ends in $9.5 \\',
  'a $9.5   \\   b',
];
console.log('\n--- notation (chunk-size invariance across 1..13 + 1000) ---');
for (const t of cases) {
  const ref = await notation(t, 1000);
  const sizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13];
  const bad = [];
  for (const s of sizes) { const r = await notation(t, s); if (r !== ref) bad.push(`${s}:${JSON.stringify(r)}`); }
  console.log(JSON.stringify(t), '->', JSON.stringify(ref), bad.length ? ' MISMATCH ' + bad.join(' | ') : '');
}
