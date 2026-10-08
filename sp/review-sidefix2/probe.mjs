// Reviewer probe: OLD vs NEW built stripSpokenNotation on edge cases + a random fuzz for new chunk-dependence.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = '../sidefix2/build/';
const OLD = require(B + 'old/verbalStreamFilter.cjs');
const NEW = require(B + 'new/verbalStreamFilter.cjs');
const J = JSON.stringify;
const run = async (F, text, size) => { let o = ''; const g = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })(); for await (const c of F.stripSpokenNotation(g)) o += c; return o; };
const SIZES = [1, 2, 3, 4, 5, 7, 11];

const cases = [
    'costs $5 a month.', 'between $5 and $10 million.', 'it is $x$ here.', 'so $\\frac{a}{b}$ grows.', 'so $\\frac{a}{b}$', '$$x^2$$ shown.',
    'a lone $', 'the end $', 'That is $100,000$.', 'That is $100,000$', 'it is $2$^3 now', 'cost:$5$.', 'see $\\sim$, ok', '$\\sim$5 more',
    'a \\frac{a}{b} b', '\\frac{a} b', '\\frac{a}{' + 'x'.repeat(60) + '} end', '\\frac{' + 'y'.repeat(60) + '}{b} end',
    '$\\frac{' + 'y'.repeat(45) + '}{b}$ end', 'about $120k, $5.', 'pay $5$$10 now', 'x $5$$ y', 'ends with pair $\\log n$',
    'ends with pair+dot $\\log n$.', '$9.5\\%$ better', 'is $O(n)$.', 'at $1 / (c + r)$ rate',
];
console.log('== edge cases: whole OLD | whole NEW | NEW sizes differing from NEW whole | OLD sizes differing from OLD whole');
for (const t of cases) {
    const wo = await run(OLD, t, t.length), wn = await run(NEW, t, t.length);
    const dn = [], dO = [];
    for (const s of SIZES) { if ((await run(NEW, t, s)) !== wn) dn.push(s); if ((await run(OLD, t, s)) !== wo) dO.push(s); }
    console.log(`${J(t)}\n   old ${J(wo)} | new ${J(wn)}${wo !== wn ? '  <-- WHOLE CHANGED' : ''} | newChunkDiff [${dn}] | oldChunkDiff [${dO}]`);
}

// Fuzz: tokens likely to interact; flag (a) whole changed, (b) a size where OLD == OLD-whole but NEW != NEW-whole (new chunk dependence),
// (c) a size where NEW output != OLD output and OLD was chunk-stable there.
const TOK = ['$', '$', '$', '5', '100,000', '.', ',', ' ', ' ', 'x', '\\frac', '{a}', '{b}', '{', '}', '\\sim', '^', '/', '*', 'k', '\\%', 'US', '\n'];
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const N = Number(process.argv[2] ?? 20000);
let wholeChanged = 0, newChunkDep = 0, changedWhereOldStable = 0, newFixedChunk = 0; const ex = { whole: [], dep: [], chg: [] };
for (let i = 0; i < N; i++) {
    let t = ''; const len = 2 + Math.floor(rnd() * 10); for (let k = 0; k < len; k++) t += TOK[Math.floor(rnd() * TOK.length)];
    const wo = await run(OLD, t, t.length), wn = await run(NEW, t, t.length);
    if (wo !== wn) { wholeChanged++; if (ex.whole.length < 12) ex.whole.push(`${J(t)}: ${J(wo)} -> ${J(wn)}`); }
    for (const s of [1, 2, 3]) {
        const o = await run(OLD, t, s), n = await run(NEW, t, s);
        if (o === wo && n !== wn) { newChunkDep++; if (ex.dep.length < 12) ex.dep.push(`${J(t)} @${s}: new ${J(n)} vs new-whole ${J(wn)} (old ${J(o)})`); }
        if (o !== wo && n === wn) newFixedChunk++;
        if (o === wo && o !== n && wo === wn) { changedWhereOldStable++; if (ex.chg.length < 12) ex.chg.push(`${J(t)} @${s}: ${J(o)} -> ${J(n)}`); }
    }
}
console.log(`\n== fuzz ${N} strings, sizes 1,2,3`);
console.log(`whole output changed old->new: ${wholeChanged}`); for (const e of ex.whole) console.log('   ' + e);
console.log(`(string,size) where OLD was chunk-stable but NEW is chunk-dependent: ${newChunkDep}`); for (const e of ex.dep) console.log('   ' + e);
console.log(`(string,size) where OLD chunk-dependent and NEW chunk-stable: ${newFixedChunk}`);
console.log(`(string,size) output changed although old was stable and whole unchanged: ${changedWhereOldStable}`); for (const e of ex.chg) console.log('   ' + e);
