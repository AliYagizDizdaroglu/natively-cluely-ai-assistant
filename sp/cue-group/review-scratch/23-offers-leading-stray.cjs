// Part B item 7: shapes the spec does not name. The PLAN'S offers code (offers-model.cjs) and the built code, whole-string
// and streaming at several chunk sizes, on leading blocks that are not well formed. Invented text only.
const M = require('./offers-model.cjs');
const { built } = M;
const show = (x) => JSON.stringify(x);
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };
async function run(strip, chunks) {
    let sugg = null, calls = 0, out = '', warns = 0;
    async function* source() { for (const c of chunks) yield c; }
    for await (const p of strip(source(), (s) => { sugg = s; calls++; }, { warn: () => { warns++; } })) out += p;
    return { out, sugg, calls, warns };
}
const A = 'Ten million vectors take about thirty gigabytes.';
const CASES = [
    ['a stray line INSIDE a leading block, before its offers', `__MORE__\nHere is what I left out:\n1| a b\n2| c d\n\n${A}`],
    ['a stray line inside a leading block, after one offer', `__MORE__\n1| a b\nAlso worth a look:\n2| c d\n\n${A}`],
    ['a bare sentinel, then the answer (no offers at all)', `__MORE__\n${A}`],
    ['text on the sentinel\'s own line', `__MORE__ (optional depth)\n1| a b\n\n${A}`],
    ['an offer on the sentinel\'s own line', `__MORE__ 1| a b\n2| c d\n\n${A}`],
    ['a bulleted offer (a dash, not N|)', `__MORE__\n- a b\n- c d\n\n${A}`],
    ['offers numbered with a dot (1. a b)', `__MORE__\n1. a b\n2. c d\n\n${A}`],
    ['offers first, a two-paragraph answer, no trailing block', `__MORE__\n1| a b\n\n${A}\n\nQuantizing to int eight cuts that.`],
    ['offers first, the answer, a trailing block with a stray line', `__MORE__\n1| a b\n\n${A}\n__MORE__\nMore:\n2| c d\n`],
    ['whitespace, then the leading block (what the chain could pass if the cue parser released leading spaces)', `  __MORE__\n1| a b\n\n${A}`],
];
(async () => {
    for (const [name, text] of CASES) {
        const W = M.extractSuggestionsNew(text), WO = built.extractSuggestions(text);
        const outs = new Set(), offers = new Set(); let calls = new Set(), warns = new Set();
        for (const size of [1, 2, 3, 5, 9, 40, 100000]) {
            const r = await run(M.stripSuggestionBlockNew, cut(text, size));
            outs.add(r.out); offers.add(show(r.sugg.map((s) => s.label))); calls.add(r.calls); warns.add(r.warns);
        }
        const today = await run((src, cb) => built.stripSuggestionBlock(src, cb), cut(text, 5));
        console.log(`${name}`);
        console.log(`   today:  shown ${show(today.out)}; offers ${show(today.sugg.map((s) => s.label))}   [whole-string: answer ${show(WO.answer)}]`);
        console.log(`   after:  shown ${show([...outs][0])}; offers ${[...offers][0]}; callback ${[...calls].join('/')}; warn lines ${[...warns].join('/')}${outs.size > 1 || offers.size > 1 ? '   <-- DEPENDS ON THE CHUNK SIZE ' + show([...outs]) : ''}`);
        console.log(`           whole-string: answer ${show(W.answer)}; offers ${show(W.suggestions.map((s) => s.label))}${W.answer.trim() !== [...outs][0].trim() ? '   <-- DIFFERS from the stream' : ''}`);
    }
})();
