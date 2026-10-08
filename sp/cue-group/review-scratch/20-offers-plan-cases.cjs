// The offers plan's 38 parser cases (Step 1a) and the 12 pre-existing extractSuggestions / stripSuggestionBlock cases,
// as data, against: TODAY (the built functions), AFTER (the plan's Edits A, C, D), mutant (a) (the draft predicate),
// mutant (b) (`if (false)`: every block treated as leading). Each case reports its FIRST failing assertion.
const M = require('./offers-model.cjs');
const { built } = M;

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (x) => JSON.stringify(x);
function makeImpl(kind) {
    const warns = [];
    if (kind === 'today') {
        return {
            warns,
            extract: built.extractSuggestions,
            strip: (src, cb) => (async function* () {
                const orig = console.warn;
                console.warn = (...a) => { warns.push(String(a[0])); };
                try { for await (const p of built.stripSuggestionBlock(src, cb)) yield p; } finally { console.warn = orig; }
            })(),
        };
    }
    const opts = { warn: (s) => warns.push(s) };
    if (kind === 'mutantA') opts.prefix = M.DRAFT;
    if (kind === 'mutantB') opts.alwaysLead = true;
    return { warns, extract: M.extractSuggestionsNew, strip: (src, cb) => M.stripSuggestionBlockNew(src, cb, opts) };
}
async function runStripTimed(impl, chunks) {
    let seen = 0, shownAfter = -1, sugg = null, calls = 0, out = '';
    async function* source() { for (const c of chunks) { seen++; yield c; } }
    for await (const p of impl.strip(source(), (s) => { sugg = s; calls++; })) { if (shownAfter === -1 && p.trim()) shownAfter = seen; out += p; }
    return { out, sugg, calls, shownAfter };
}
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };

const PROSE = 'Ten million vectors take about thirty gigabytes in float32, so I would quantise to int8 first.';
const OFFERS = '__MORE__\n1| cold start mitigation\n2| GPU node pools\n';
const TWO = [{ n: 1, label: 'cold start mitigation' }, { n: 2, label: 'GPU node pools' }];
const AB = [{ n: 1, label: 'a b' }];
const ABCD = [{ n: 1, label: 'a b' }, { n: 2, label: 'c d' }];
const LEAD = '__MORE__\n1| a b\n';
const ROWS = [
    ['empty: held', '', '2| c d\nZ', 3, 'Z', ABCD],
    ['whitespace only: held', '  ', '\n2| c d\nZ', 3, 'Z', ABCD],
    ['digits: held', '2', '| c d\nZ', 3, 'Z', ABCD],
    ['digits and the bar: held', '2|', ' c d\nZ', 3, 'Z', ABCD],
    ['a partial offer line: held to its newline', '2| c', ' d\nZ', 3, 'Z', ABCD],
    ['digits, the bar, a CR, then the label (CRLF after the bar): held', '2|\rc d', '\nZ', 3, 'Z', ABCD],
    ['a partial offer line ending in CR: held', '2| c d\r', '\nZ', 3, 'Z', ABCD],
    ['prose: closes', 'Ten', ' million\nZ', 2, 'Ten million\nZ', AB],
    ['prose that starts with a number: closes', '10 million', ' vectors\nZ', 2, '10 million vectors\nZ', AB],
    ['a list marker: closes', '2.', ' First\nZ', 2, '2. First\nZ', AB],
    ['a second sentinel', '_', '_MORE__\n2| c d\nZ', 3, 'Z', ABCD],
    ['an underscore that is not a sentinel', '_', 'x\nZ', 3, '_x\nZ', AB],
];
// expect helper: returns a failure string or null
const want = (label, got, exp) => (eq(got, exp) ? null : `${label}: received ${show(got)}, expected ${show(exp)}`);
const first = (...xs) => xs.find((x) => x) ?? null;

function cases(impl) {
    const C = [];
    const add = (name, fn) => C.push([name, fn]);
    add('E1 extract: offers first, then the answer', async () => want('toEqual', impl.extract(`${OFFERS}\n${PROSE}`), { answer: PROSE, suggestions: TWO }));
    add('E2 extract: offers first, the answer, then a second block', async () => want('toEqual', impl.extract(`${OFFERS}${PROSE}\n__MORE__\n3| a later thought\n`), { answer: PROSE, suggestions: [...TWO, { n: 3, label: 'a later thought' }] }));
    add('E3 extract: offers only', async () => first(want('1st', impl.extract(OFFERS), { answer: '', suggestions: TWO }), want('2nd', impl.extract('__MORE__\n1| a b\n\n'), { answer: '', suggestions: AB })));
    add('E4 extract: the answer first', async () => first(want('1st', impl.extract(`${PROSE}\n\n${OFFERS}`), { answer: PROSE, suggestions: TWO }), want('2nd', impl.extract(`${PROSE}\n__MORE__\nHere is what I left out:\n1| a b\n`), { answer: PROSE, suggestions: AB })));
    add('E5 extract: a digit-led answer', async () => want('toEqual', impl.extract('__MORE__\n1| a b\n10 million vectors fit.'), { answer: '10 million vectors fit.', suggestions: AB }));
    add('E6 extract: the known edge', async () => want('toEqual', impl.extract(`__MORE__\n1| a b\n${PROSE}\n2| c d\n`), { answer: `${PROSE}\n2| c d\n`, suggestions: AB }));
    for (const size of [1, 3, 7, 40]) add(`release matrix, chunk size ${size}`, async () => {
        const text = `${OFFERS}\n${PROSE}`;
        const chunks = cut(text, size);
        const r = await runStripTimed(impl, chunks);
        const expShown = Math.floor(text.indexOf('Ten') / size) + 1;
        return first(want(`shownAfter (of ${chunks.length} chunks)`, r.shownAfter, expShown), want('out.trim()', r.out.trim(), PROSE), r.out.includes('__MORE__') ? 'out contains __MORE__' : null, want('sugg', r.sugg, TWO), want('calls', r.calls, 1));
    });
    add('one chunk carries the last offer line, the blank line and the answer', async () => want('toEqual', await runStripTimed(impl, ['__MORE__\n1| a b\n', '2| c d\n\nTen ', 'million.']), { out: 'Ten million.', sugg: ABCD, calls: 1, shownAfter: 2 }));
    for (const [state, partial, rest, shownAfter, answer, offers] of ROWS) add(`row - ${state}`, async () => {
        const r = await runStripTimed(impl, [LEAD, partial, rest]);
        return first(want('shownAfter', r.shownAfter, shownAfter), want('out', r.out, answer), want('sugg', r.sugg, offers), want('calls', r.calls, 1), want('extractSuggestions', impl.extract(LEAD + partial + rest), { answer, suggestions: offers }));
    });
    add('whitespace yielded before the sentinel', async () => want('toEqual', await runStripTimed(impl, ['\n', '__MORE__\n1| a b\n', 'Ten']), { out: '\nTen', sugg: AB, calls: 1, shownAfter: 3 }));
    for (const size of [1, 3, 4, 7, 500]) add(`the answer first, chunk size ${size}`, async () => {
        const FULL = 'Bloom filters answer membership fast.\n__MORE__\n1| false positive rate math\n2| counting filters for deletes\n';
        const r = await runStripTimed(impl, cut(FULL, size));
        return first(want('out', r.out, 'Bloom filters answer membership fast.\n'), want('sugg', r.sugg, [{ n: 1, label: 'false positive rate math' }, { n: 2, label: 'counting filters for deletes' }]), want('calls', r.calls, 1), want('shownAfter', r.shownAfter, 1));
    });
    add('a trailing block with a stray line, streamed', async () => want('toEqual', await runStripTimed(impl, ['Answer first.\n', '__MORE__\nHere is more:\n1| a b\n']), { out: 'Answer first.\n', sugg: AB, calls: 1, shownAfter: 1 }));
    add('offers only, streamed', async () => want('toEqual', await runStripTimed(impl, cut(OFFERS, 4)), { out: '', sugg: TWO, calls: 1, shownAfter: -1 }));
    add('the stream ends on a held partial after the offers', async () => first(want('1st', await runStripTimed(impl, [LEAD, '2| c d']), { out: '', sugg: ABCD, calls: 1, shownAfter: -1 }), want('2nd', await runStripTimed(impl, [LEAD, '2|']), { out: '2|', sugg: AB, calls: 1, shownAfter: 2 })));
    for (const size of [1, 3, 4, 7, 500]) add(`streaming equals extractSuggestions, chunk size ${size}`, async () => {
        const text = `${OFFERS}${PROSE}\n__MORE__\n3| a later thought\n`;
        const r = await runStripTimed(impl, cut(text, size));
        const whole = impl.extract(text);
        return first(want('out.trim() vs whole.answer', r.out.trim(), whole.answer), want('sugg vs whole', r.sugg, whole.suggestions), want('calls', r.calls, 1));
    });
    add('logs one fixed line per stream when the block leads', async () => {
        impl.warns.length = 0;
        await runStripTimed(impl, [LEAD, '_', '_MORE__\n2| c d\nZ']);
        const a = want('warn calls', impl.warns.slice(), ['[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)']);
        impl.warns.length = 0;
        await runStripTimed(impl, cut('Answer first.\n__MORE__\n1| a b\n', 5));
        const b = impl.warns.length ? `warn called ${impl.warns.length} time(s) on an answer-first stream` : null;
        return first(a, b);
    });
    return C;
}

// The 12 pre-existing cases of the two describes (verbalStreamFilter.test.ts:215-284), and their helper runStrip.
function existing(impl) {
    const C = [];
    const add = (name, fn) => C.push([name, fn]);
    const ANSWER = 'Consistent hashing keeps key movement small when a node joins.';
    const runStrip = async (text, size) => { let out = '', sugg = []; async function* src() { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); } for await (const c of impl.strip(src(), (s) => { sugg = s; })) out += c; return { out, sugg }; };
    add('X1 returns the whole text and no offers', async () => want('toEqual', impl.extract(ANSWER), { answer: ANSWER, suggestions: [] }));
    add('X2 splits the answer from the offers', async () => want('toEqual', impl.extract(`${ANSWER}\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling on the ring\n`), { answer: ANSWER, suggestions: [{ n: 1, label: 'trade-offs of vnode count' }, { n: 2, label: 'hot-key handling on the ring' }] }));
    add('X3 drops stray prose inside the block', async () => want('suggestions', impl.extract(`${ANSWER}\n__MORE__\nHere are some things I left out:\n1| vnode count trade-offs\n`).suggestions, [{ n: 1, label: 'vnode count trade-offs' }]));
    add('X4 never leaves the sentinel in the spoken answer', async () => { const { answer } = impl.extract(`${ANSWER}\n__MORE__\n1| something\n`); return answer.includes('__MORE__') || /\d\|/.test(answer) ? 'sentinel or N| in the answer' : null; });
    const FULL = 'Bloom filters answer membership fast.\n__MORE__\n1| false positive rate math\n2| counting filters for deletes\n';
    const SPOKEN = 'Bloom filters answer membership fast.';
    for (const size of [1, 3, 4, 7, 500]) add(`X5 suppresses the block at chunk size ${size}`, async () => { const { out, sugg } = await runStrip(FULL, size); return first(out.includes('__MO') ? 'out contains __MO' : null, want('out.trim()', out.trim(), SPOKEN), want('labels', sugg.map((s) => s.label), ['false positive rate math', 'counting filters for deletes'])); });
    add('X6 passes an answer with no block through byte-for-byte', async () => { const { out, sugg } = await runStrip(SPOKEN, 3); return first(want('out', out, SPOKEN), want('sugg', sugg, [])); });
    add('X7 reports an empty array when no offers were made', async () => { let called = 0; async function* src() { yield 'Short and complete.'; } for await (const _ of impl.strip(src(), () => { called++; })) { /* drain */ } return want('called', called, 1); });
    add('X8 does not mistake ordinary underscores', async () => { const text = 'Use snake_case for names, and __init__ is the constructor.'; const { out, sugg } = await runStrip(text, 2); return first(want('out', out, text), want('sugg', sugg, [])); });
    return C;
}

(async () => {
    // the numbers in the plan's comment: the chunk that carries the first character of the answer
    const text = `${OFFERS}\n${PROSE}`;
    console.log(`release text: length ${text.length}, indexOf('Ten') ${text.indexOf('Ten')}; per size [1,3,7,40]: chunks ${[1, 3, 7, 40].map((s) => cut(text, s).length).join(', ')}; first-answer chunk ${[1, 3, 7, 40].map((s) => Math.floor(text.indexOf('Ten') / s) + 1).join(', ')}`);
    for (const kind of ['today', 'after', 'mutantA', 'mutantB']) {
        const impl = makeImpl(kind);
        for (const [label, list] of [['38 new parser cases', cases(impl)], ['12 pre-existing cases', existing(impl)]]) {
            const failed = [];
            for (const [name, fn] of list) { const f = await fn(); if (f) failed.push(`${name} -> ${f.length > 230 ? f.slice(0, 230) + '…' : f}`); }
            console.log(`\n=== ${kind.toUpperCase()}: ${label}: ${failed.length} failed, ${list.length - failed.length} passed ===`);
            for (const f of failed) console.log('  FAIL ' + f);
        }
    }
})();
