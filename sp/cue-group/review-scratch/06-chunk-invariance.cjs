// Item 7 (what nobody enumerated): the early close changes not only WHEN the parser yields but also HOW the
// prose is cut into pieces for every filter behind it. Today a one-paragraph answer leaves stripCueBlock as ONE
// piece (the end flush); after the change it leaves in the pieces the source sent. The spec (8.2, "Why the bench
// and the probe are not re-run") argues from the parser's joined bytes alone. This checks the rest of the chain:
// is the spoken text the harness and the app end up with the same, for the same raw answer, under both parsers?
//   harness: answers.mjs feeds the raw answer CHARACTER BY CHARACTER through
//            stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(stripCueBlock(...)))))
//   app:     the same chain, fed the SDK's chunks (random cuts here), plus cutAtWordBudget (not modelled: prose only).
// Synthetic texts only (notation, preambles, list markers, offers); no captured answer is read.
const { built, stripCueBlockNew, show } = require('./model.cjs');
const { filterCodeFences, filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } = built;

async function chain(cueImpl, chunks) {
    async function* gen() { for (const c of chunks) yield c; }
    let spoken = '', cues = null, offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(cueImpl(gen(), (c) => { cues = c; }))), (o) => { offers = o; }))) spoken += p;
    return { spoken: spoken.trim(), cues, offers };
}
const same = (a, b) => a.spoken === b.spoken && JSON.stringify(a.cues) === JSON.stringify(b.cues) && JSON.stringify(a.offers) === JSON.stringify(b.offers);

let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const FRAG = [
    'Ten million vectors take about thirty gigabytes. ', 'Quantizing to int eight halves it. ', 'I would shard by tenant. ',
    'It costs $100,000$ a year. ', 'About $5 million in savings. ', 'That is $O(\\log n)$ per lookup. ', 'The rank is $\\text{rank}$ here. ',
    'Use **p99** latency, not *mean* latency. ', 'The ratio is $\\frac{3,000}{9,500}$ overall. ', 'Call `ModelLatency` first. ', 'e.g. 3.5 percent. ',
    'It is 2 * 3 shards. ', 'Roughly $9.5\\%$ of calls. ', 'Pay $50/hour or $0.09/GB. ', 'Bold at the end **p99**', 'A star at the end *', 'A dollar at the end $',
    "I'm going to walk you through the design. ", 'I will explain the trade-off as a queue. ', 'Let me describe it. ', 'Time: O(n) on average. ', 'Would you like me to go deeper? ',
    '1. First the index. ', '- then the cache. ', '2) last the queue. ', '```sql\nSELECT 1;\n``` ', 'a_b and __init__ stay. ', '\n', '\n\n', ' ',
];
const BLOCKS = ['__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\n', '__CUES__\n1| Spaces\n', '__CUES__ \n1| $O(\\log n)$ lookups\n\n', ''];
const OFFERS = ['', '', '\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling', '__MORE__\n1| one offer'];

(async () => {
    const st = { texts: 0, harnessDiff: 0, appDiff: 0, oldSelfDiff: 0, newSelfDiff: 0 };
    const exH = [], exA = [], exSelf = [];
    for (let t = 0; t < 20000; t++) {
        let body = '';
        const k = 1 + Math.floor(rnd() * 5);
        for (let i = 0; i < k; i++) body += pick(FRAG);
        const text = pick(BLOCKS) + body + pick(OFFERS);
        st.texts++;
        const chars = text.split('');
        const oldH = await chain(built.stripCueBlock, chars);
        const newH = await chain(stripCueBlockNew, chars);
        if (!same(oldH, newH)) { st.harnessDiff++; if (exH.length < 8) exH.push({ text, old: oldH.spoken, new: newH.spoken }); }
        // the app: three random cuts, the SAME cut for both parsers
        for (let c = 0; c < 3; c++) {
            const parts = []; let i = 0;
            while (i < text.length) { const len = 1 + Math.floor(rnd() * 40); parts.push(text.slice(i, i + len)); i += len; }
            const o = await chain(built.stripCueBlock, parts), n = await chain(stripCueBlockNew, parts);
            if (!same(o, n)) { st.appDiff++; if (exA.length < 8) exA.push({ parts, old: o.spoken, new: n.spoken }); }
            // and is each build self-consistent across cuts? (pre-existing chunk sensitivity, whatever the parser)
            if (!same(o, oldH)) { st.oldSelfDiff++; if (exSelf.length < 6) exSelf.push({ which: 'today', text, chars: oldH.spoken, cut: o.spoken }); }
            if (!same(n, newH)) st.newSelfDiff++;
        }
    }
    console.log(`texts ${st.texts} (each: char by char, and 3 random cuts of 1..40 characters)`);
    console.log(`HARNESS (char by char): spoken/cues/offers differ between today's parser and the plan's: ${st.harnessDiff}`);
    for (const e of exH) console.log('   ' + show(e));
    console.log(`APP (same random cut): differ between today's parser and the plan's: ${st.appDiff}`);
    for (const e of exA) console.log('   ' + show(e));
    console.log(`pre-existing chunk sensitivity of the chain, today's parser (random cut vs char by char): ${st.oldSelfDiff};  with the plan's parser: ${st.newSelfDiff}`);
    for (const e of exSelf) console.log('   ' + show(e));
})();
