// Copies base.ts / work.ts to .mts (explicit ESM) and loads both with node's native type stripping.
// Also writes work-exp.mts: the working copy plus one appended export line for the module-private helpers.
import fs from 'node:fs';
const here = (f) => new URL('./' + f, import.meta.url);
fs.copyFileSync(here('work.ts'), here('work.mts'));
fs.copyFileSync(here('base.ts'), here('base.mts'));
fs.writeFileSync(here('work-exp.mts'), fs.readFileSync(here('work.ts'), 'utf8') + '\nexport { offersIn, suggestionOf, CUE_LINE, CUE_LINE_PREFIX, SENTINEL };\n');
const W = await import('./work.mts');
const Bm = await import('./base.mts');
const X = await import('./work-exp.mts');
console.log('work exports:', Object.keys(W).sort().join(','));
console.log('base exports:', Object.keys(Bm).sort().join(','));
console.log('exp extras  :', ['offersIn', 'suggestionOf', 'CUE_LINE', 'CUE_LINE_PREFIX', 'SENTINEL'].map((k) => `${k}:${typeof X[k]}`).join(' '));
console.log('work:', JSON.stringify(W.extractSuggestions('__MORE__\n1| a b\n\nTen million.')));
console.log('base:', JSON.stringify(Bm.extractSuggestions('__MORE__\n1| a b\n\nTen million.')));
