// Follow-up to 06: WHICH constructs make the chain behind the parser sensitive to how the prose is cut?
// For each short prose (one construct, then " and more."), the BUILT chain without any cue block is fed the text
// (a) whole and (b) character by character. A difference is a pre-existing chunk sensitivity of the filters
// (it exists on MAIN, with or without cues). Then the same prose under a cue block, old parser vs the plan's,
// fed character by character (the harness's feed) — a difference there is what the early close newly exposes.
const { built, stripCueBlockNew, show } = require('./model.cjs');
const { filterCodeFences, filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget, SPOKEN_WORD_GUARD } = built;

async function chain(cueImpl, chunks, withBudget = false) {
    async function* gen() { for (const c of chunks) yield c; }
    let spoken = '';
    let s = stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(cueImpl(gen(), () => {}))), () => {}));
    if (withBudget) s = cutAtWordBudget(s, { ...SPOKEN_WORD_GUARD });
    for await (const p of s) spoken += p;
    return spoken.trim();
}
const CONSTRUCTS = [
    'The ratio is $\\frac{3,000}{9,500}$ overall', 'The ratio is $\\frac{3}{4}$, roughly', 'The ratio is $\\frac{3}{4}$.', 'It costs $100,000$ a year', 'It costs $100,000$, yearly',
    'That is $O(\\log n)$ per lookup', 'That is $O(n^2)$ time', 'The rank is $\\text{rank}$ here', 'Use $\\alpha$ here', 'Use $\\alpha$, then', 'Roughly $9.5\\%$ of calls', 'About $5 million saved',
    'Pay $50/hour or $0.09/GB', 'Use **p99** latency', 'the *incremental* effect', 'Call `ModelLatency` first', 'It is 2 * 3 shards', 'e.g. 3.5 percent', 'a_b and __init__ stay',
    "I'm going to walk you through the design", 'I will explain the trade-off as a queue', 'Time: O(n) on average', '1. First the index', '- then the cache', 'Plain words only',
];
(async () => {
    const BLOCK = '__CUES__\n1| thirty gigabytes\n';
    let pre = 0, exposed = 0;
    for (const c of CONSTRUCTS) {
        const prose = `${c} and more.`;
        const whole = await chain(built.stripCueBlock, [prose]);
        const chars = await chain(built.stripCueBlock, prose.split(''));
        const oldCue = await chain(built.stripCueBlock, (BLOCK + prose).split(''));
        const newCue = await chain(stripCueBlockNew, (BLOCK + prose).split(''));
        const sens = whole !== chars, exp = oldCue !== newCue;
        if (sens) pre++;
        if (exp) exposed++;
        console.log(`${sens ? 'SENSITIVE' : 'invariant'} | ${exp ? 'EXPOSED  ' : 'same     '} | ${show(prose)}${sens ? `\n      whole: ${show(whole)}\n      chars: ${show(chars)}` : ''}${exp ? `\n      cue build today (chars): ${show(oldCue)}\n      cue build after (chars): ${show(newCue)}` : ''}`);
    }
    console.log(`\n${CONSTRUCTS.length} constructs: ${pre} chunk-sensitive without any cue block (pre-existing, MAIN too); ${exposed} where the cue build's spoken text changes with the early close (character-by-character feed, the harness's)`);
})();
