// Follow-up to 06-chunk-invariance.cjs: is the typeset fraction the ONLY construct whose spoken text changes with the
// early close? Same generator and seed as 06. Every difference is classified by whether the raw text holds "\frac".
// Then a second pass with the fraction fragment REMOVED from the generator: any difference there is another construct.
// Synthetic texts only. Run with stderr discarded (the built fence filter warns on every fenced text).
const { built, stripCueBlockNew, show } = require('./model.cjs');
const { filterCodeFences, filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } = built;
const WIDE = /^\d+\s*(\|\s*.*)?$/;
const newImpl = (src, cb) => stripCueBlockNew(src, cb, { prefix: WIDE });

async function chain(cueImpl, chunks) {
    async function* gen() { for (const c of chunks) yield c; }
    let spoken = '', cues = null, offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(cueImpl(gen(), (c) => { cues = c; }))), (o) => { offers = o; }))) spoken += p;
    return { spoken: spoken.trim(), cues, offers };
}
const same = (a, b) => a.spoken === b.spoken && JSON.stringify(a.cues) === JSON.stringify(b.cues) && JSON.stringify(a.offers) === JSON.stringify(b.offers);

const FRAG_ALL = [
    'Ten million vectors take about thirty gigabytes. ', 'Quantizing to int eight halves it. ', 'I would shard by tenant. ',
    'It costs $100,000$ a year. ', 'About $5 million in savings. ', 'That is $O(\\log n)$ per lookup. ', 'The rank is $\\text{rank}$ here. ',
    'Use **p99** latency, not *mean* latency. ', 'The ratio is $\\frac{3,000}{9,500}$ overall. ', 'Call `ModelLatency` first. ', 'e.g. 3.5 percent. ',
    'It is 2 * 3 shards. ', 'Roughly $9.5\\%$ of calls. ', 'Pay $50/hour or $0.09/GB. ', 'Bold at the end **p99**', 'A star at the end *', 'A dollar at the end $',
    "I'm going to walk you through the design. ", 'I will explain the trade-off as a queue. ', 'Let me describe it. ', 'Time: O(n) on average. ', 'Would you like me to go deeper? ',
    '1. First the index. ', '- then the cache. ', '2) last the queue. ', '```sql\nSELECT 1;\n``` ', 'a_b and __init__ stay. ', '\n', '\n\n', ' ',
];
const BLOCKS = ['__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\n', '__CUES__\n1| Spaces\n', '__CUES__ \n1| $O(\\log n)$ lookups\n\n', ''];
const OFFERS = ['', '', '\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling', '__MORE__\n1| one offer'];

async function pass(label, FRAG, N) {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const st = { texts: 0, withFrac: 0, hDiffFrac: 0, hDiffNoFrac: 0, aRuns: 0, aDiffFrac: 0, aDiffNoFrac: 0 };
    const ex = [];
    for (let t = 0; t < N; t++) {
        let body = '';
        const k = 1 + Math.floor(rnd() * 5);
        for (let i = 0; i < k; i++) body += pick(FRAG);
        const text = pick(BLOCKS) + body + pick(OFFERS);
        const frac = text.includes('\\frac');
        st.texts++; if (frac) st.withFrac++;
        const chars = text.split('');
        const oldH = await chain(built.stripCueBlock, chars), newH = await chain(newImpl, chars);
        if (!same(oldH, newH)) { if (frac) st.hDiffFrac++; else { st.hDiffNoFrac++; if (ex.length < 6) ex.push({ feed: 'chars', text, old: oldH.spoken, new: newH.spoken }); } }
        for (let c = 0; c < 3; c++) {
            const parts = []; let i = 0;
            while (i < text.length) { const len = 1 + Math.floor(rnd() * 40); parts.push(text.slice(i, i + len)); i += len; }
            st.aRuns++;
            const o = await chain(built.stripCueBlock, parts), n = await chain(newImpl, parts);
            if (!same(o, n)) { if (frac) st.aDiffFrac++; else { st.aDiffNoFrac++; if (ex.length < 6) ex.push({ feed: 'cut', parts, old: o.spoken, new: n.spoken }); } }
        }
    }
    console.log(`${label}: texts ${st.texts} (${st.withFrac} hold a typeset fraction)`);
    console.log(`  character by character: differ WITH a fraction ${st.hDiffFrac}, WITHOUT one ${st.hDiffNoFrac}`);
    console.log(`  random cuts (${st.aRuns} runs):  differ WITH a fraction ${st.aDiffFrac}, WITHOUT one ${st.aDiffNoFrac}`);
    for (const e of ex) console.log('   ' + show(e));
}

(async () => {
    await pass('pass 1, the generator of 06 (the corrected predicate)', FRAG_ALL, 20000);
    await pass('pass 2, the same generator without the fraction fragment', FRAG_ALL.filter((f) => !f.includes('\\frac')), 20000);
})();
