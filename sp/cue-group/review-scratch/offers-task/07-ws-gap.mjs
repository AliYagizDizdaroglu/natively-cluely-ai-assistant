// Coverage gap check: does any COMMITTED extractSuggestions input tell the real function apart from a mutant that treats
// whitespace before the sentinel as spoken text (`if (i > 0)`)? The streaming filter no longer calls extractSuggestions,
// so only the committed extractSuggestions calls could catch this mutant. Inputs copied from verbalStreamFilter.test.ts.
import fs from 'node:fs';
const here = (f) => new URL('./' + f, import.meta.url);
const W = await import('./work.mts');
const src = fs.readFileSync(here('work.ts'), 'utf8');
const A = "    if (text.slice(0, i).trim() !== '') {";
if (!src.includes(A)) throw new Error('anchor missing');
fs.writeFileSync(here('v-ws-before.mts'), src.replace(A, () => '    if (i > 0) {'));
const M = await import('./v-ws-before.mts');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ANSWER = 'Consistent hashing keeps key movement small when a node joins.';
const PROSE = 'Ten million vectors take about thirty gigabytes in float32, so I would quantise to int8 first.';
const OFFERS = '__MORE__\n1| cold start mitigation\n2| GPU node pools\n';
const LEAD = '__MORE__\n1| a b\n';
const ROWS = [['', '2| c d\nZ'], ['  ', '\n2| c d\nZ'], ['2', '| c d\nZ'], ['2|', ' c d\nZ'], ['2| c', ' d\nZ'], ['2|\rc d', '\nZ'], ['2| c d\r', '\nZ'], ['Ten', ' million\nZ'], ['10 million', ' vectors\nZ'], ['2.', ' First\nZ'], ['_', '_MORE__\n2| c d\nZ'], ['_', 'x\nZ']];
const committed = [
    ANSWER, `${ANSWER}\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling on the ring\n`, `${ANSWER}\n__MORE__\nHere are some things I left out:\n1| vnode count trade-offs\n`, `${ANSWER}\n__MORE__\n1| something\n`,
    `${OFFERS}\n${PROSE}`, `${OFFERS}${PROSE}\n__MORE__\n3| a later thought\n`, OFFERS, '__MORE__\n1| a b\n\n', `${PROSE}\n\n${OFFERS}`, `${PROSE}\n__MORE__\nHere is what I left out:\n1| a b\n`,
    '__MORE__\n1| a b\n10 million vectors fit.', `__MORE__\n1| a b\n${PROSE}\n2| c d\n`,
    ...ROWS.map(([p, r]) => LEAD + p + r),
];
let differ = 0;
for (const t of committed) if (!eq(W.extractSuggestions(t), M.extractSuggestions(t))) differ++;
console.log(`committed extractSuggestions inputs: ${committed.length}; real vs mutant differ on ${differ}`);
const row14 = '\n__MORE__\n1| a b\nTen';
console.log('row 14 shape, real  :', JSON.stringify(W.extractSuggestions(row14)));
console.log('row 14 shape, mutant:', JSON.stringify(M.extractSuggestions(row14)));
