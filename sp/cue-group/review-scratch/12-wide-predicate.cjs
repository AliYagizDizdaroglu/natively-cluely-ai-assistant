// The controller's proposed fix (fable-revision-1.md, A2): CUE_LINE_PREFIX = /^\d+\s*(\|\s*.*)?$/ ("wide").
// Checked independently of the controller's fuzz: (1) the exhaustive run of 02-fuzz.cjs, with the wide predicate
// against today's built parser; (2) the prefix property by brute force, including U+2028 and NBSP; (3) the plan's
// cases plus the new row, under the wide predicate and under the two mutants Step 5 would use.
const { built, stripCueBlockNew, runCuesTimed, CUE_LINE, show } = require('./model.cjs');
const ch = (n) => String.fromCharCode(n);
const LS = ch(0x2028), NBSP = ch(0xa0), VT = ch(0x0b);
const WIDE = /^\d+\s*(\|\s*.*)?$/, SPEC = /^\d+\s*(\|.*)?$/, SIMPLE = /^\d+\s*(\||$)/;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function run(impl, chunks, opts) {
    let cues = null, calls = 0, out = '';
    async function* source() { for (const c of chunks) yield c; }
    for await (const p of impl(source(), (x) => { cues = x; calls++; }, opts)) out += p;
    return { out, cues, calls };
}
function chunkings(s) {
    const n = s.length; if (n === 0) return [[]];
    const res = [];
    for (let mask = 0; mask < (1 << (n - 1)); mask++) {
        const parts = []; let start = 0;
        for (let i = 0; i < n - 1; i++) if (mask & (1 << i)) { parts.push(s.slice(start, i + 1)); start = i + 1; }
        parts.push(s.slice(start)); res.push(parts);
    }
    return res;
}
(async () => {
    // (1) exhaustive: every tail over a 7-letter alphabet (with U+2028) up to length 5, every chunking
    const ALPHA = ['1', '|', 'a', ' ', '\n', '\r', LS];
    function* all(len, p = '') { if (p.length === len) { yield p; return; } for (const c of ALPHA) yield* all(len, p + c); }
    const st = { runs: 0, wide: 0, simple: 0, spec: 0, wideLater: 0 };
    for (const head of ['__CUES__\n1| a\n', '__CUES__']) for (let len = 0; len <= 5; len++) for (const tail of all(len)) for (const cut of chunkings(tail)) {
        const chunks = [head, ...cut];
        const O = await run(built.stripCueBlock, chunks);
        const same = (x) => x.out === O.out && eq(x.cues, O.cues) && x.calls === 1;
        st.runs++;
        if (!same(await run(stripCueBlockNew, chunks, { prefix: WIDE }))) st.wide++;
        if (!same(await run(stripCueBlockNew, chunks, { prefix: SIMPLE }))) st.simple++;
        if (!same(await run(stripCueBlockNew, chunks, { prefix: SPEC }))) st.spec++;
    }
    console.log(`(1) exhaustive, alphabet [1 | a space LF CR U+2028], tails up to 5, every chunking: ${st.runs} runs`);
    console.log(`    differ from today's built parser in cues / joined prose / report count:  spec predicate ${st.spec};  wide ${st.wide};  simple /^\\d+\\s*(\\||$)/ ${st.simple}`);

    // (2) the prefix property, brute force over lines (no LF) up to length 6
    const A2 = ['1', '|', 'a', '.', ' ', '\t', '\r', LS, VT, NBSP];
    function* all2(len, p = '') { if (p.length === len) { yield p; return; } for (const c of A2) yield* all2(len, p + c); }
    let cueLines = 0, wrongRelease = 0, holdsNonPrefix = 0, partials = 0;
    const heldW = (p) => { const t = p.trim(); return t === '' || WIDE.test(t); };
    for (let len = 1; len <= 6; len++) for (const line of all2(len)) {
        if (CUE_LINE.test(line.trim())) { cueLines++; for (let k = 1; k <= line.length; k++) if (!heldW(line.slice(0, k))) { wrongRelease++; break; } }
    }
    // the other direction, smaller: a partial the wide predicate HOLDS though no suffix (up to 3 more characters) makes a cue line
    for (let len = 1; len <= 4; len++) for (const p of all2(len)) {
        if (!heldW(p) || p.trim() === '') continue;
        partials++;
        let can = CUE_LINE.test(p.trim());
        for (let sl = 1; sl <= 2 && !can; sl++) for (const s of all2(sl)) if (CUE_LINE.test((p + s).trim())) { can = true; break; }
        if (!can) holdsNonPrefix++;
    }
    console.log(`(2) prefix property, 10 characters incl. CR, U+2028, VT, NBSP: ${cueLines} cue lines up to length 6; a partial of one that the wide predicate releases: ${wrongRelease}`);
    console.log(`    held partials (up to length 4) that no suffix of up to 2 characters completes into a cue line: ${holdsNonPrefix} of ${partials}  (0 = the predicate holds nothing it need not)`);

    // (3) the plan's rows + the controller's new row, under wide and under the two Step 5 mutants
    const HEAD = '__CUES__\n1| a\n';
    const ROWS = [
        ['empty', '', '2| b\nZ', 3, ['a', 'b'], 'Z'], ['whitespace only', '   ', '\n2| b\nZ', 3, ['a', 'b'], 'Z'], ['a lone CR', '\r', '\n2| b\nZ', 3, ['a', 'b'], 'Z'],
        ['digits', '2', '| b\nZ', 3, ['a', 'b'], 'Z'], ['two digits', '12', '| b\nZ', 3, ['a', 'b'], 'Z'], ['digits and a space', '2 ', '| b\nZ', 3, ['a', 'b'], 'Z'],
        ['digits and the bar', '2|', ' b\nZ', 3, ['a', 'b'], 'Z'], ['a partial cue line', '2| Spa', 'ces\nZ', 3, ['a', 'Spaces'], 'Z'], ['a partial cue line ending in CR', '2| Spa\r', '\nZ', 3, ['a', 'Spa'], 'Z'],
        ['NEW: digits, the bar, a stray CR, then the phrase', '2|\rb', '\nZ', 3, ['a', 'b'], 'Z'],
        ['prose', 'Ten', ' million\nZ', 2, ['a'], 'Ten million\nZ'], ['starts with a number', '10 million vectors', '\nZ', 2, ['a'], '10 million vectors\nZ'],
        ['a count', '3 things matter', '\nZ', 2, ['a'], '3 things matter\nZ'], ['a year', '2024 was', ' the year\nZ', 2, ['a'], '2024 was the year\nZ'],
        ['a bar later', '10 million | shards', '\nZ', 2, ['a'], '10 million | shards\nZ'], ['a list marker', '2.', ' First\nZ', 2, ['a'], '2. First\nZ'], ['a bullet', '- first', '\nZ', 2, ['a'], '- first\nZ'],
    ];
    for (const [label, impl, opts] of [['TODAY (built)', built.stripCueBlock, undefined], ['wide, trim (the revised plan)', stripCueBlockNew, { prefix: WIDE, trim: 'trim' }], ['mutant 1: wide, trimStart', stripCueBlockNew, { prefix: WIDE, trim: 'trimStart' }], ['mutant 2: the first regex, trim', stripCueBlockNew, { prefix: SPEC, trim: 'trim' }], ['simple, trim', stripCueBlockNew, { prefix: SIMPLE, trim: 'trim' }], ['simple, trimStart', stripCueBlockNew, { prefix: SIMPLE, trim: 'trimStart' }]]) {
        const failed = [];
        for (const [name, partial, rest, reportedAfter, cues, prose] of ROWS) {
            const r = await runCuesTimed(impl, [HEAD, partial, rest], opts);
            const truth = built.extractCues(HEAD + partial + rest);
            if (r.reportedAfter !== reportedAfter || !eq(r.cues, cues) || r.out.join('') !== prose || r.calls !== 1 || !eq(truth, { cues, prose })) failed.push(`${name} (reportedAfter ${r.reportedAfter})`);
        }
        console.log(`(3) ${label.padEnd(34)} ${ROWS.length} rows: ${failed.length} failed${failed.length ? ' -> ' + failed.join('; ') : ''}`);
    }
})();
