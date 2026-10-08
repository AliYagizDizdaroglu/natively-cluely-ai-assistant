// Item 3: every number in the plan's expected outputs for the parser file. The plan's 24 new parser cases are
// re-stated here as data (copied from the plan's Step 1) and evaluated against three implementations:
//   TODAY  = the built v2 stripCueBlock            (what Step 2's RED run sees)
//   AFTER  = today's code + the plan's Edit C      (what Step 4's GREEN run sees)
//   MUTANT = AFTER with trimStart() for trim()     (what Step 5's calibration sees)
// A "case" fails when any of its expects would fail; the first failing expect is named.
const { built, stripCueBlockNew, runCuesTimed, show } = require('./model.cjs');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const extractCues = built.extractCues;

const NO_NL = '__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\nTen million vectors take about thirty gigabytes. Quantizing to int eight halves it.';
const HEAD = '__CUES__\n1| a\n';
const ROWS = [
    ['empty: held', '', '2| b\nZ', 3, ['a', 'b'], 'Z'],
    ['whitespace only: held', '   ', '\n2| b\nZ', 3, ['a', 'b'], 'Z'],
    ['a lone CR from a CRLF stream: held', '\r', '\n2| b\nZ', 3, ['a', 'b'], 'Z'],
    ['digits: held', '2', '| b\nZ', 3, ['a', 'b'], 'Z'],
    ['two digits: held', '12', '| b\nZ', 3, ['a', 'b'], 'Z'],
    ['digits and a space: held (the bar may still follow)', '2 ', '| b\nZ', 3, ['a', 'b'], 'Z'],
    ['digits and the bar: held', '2|', ' b\nZ', 3, ['a', 'b'], 'Z'],
    ['a partial cue line: held to its newline', '2| Spa', 'ces\nZ', 3, ['a', 'Spaces'], 'Z'],
    ['a partial cue line ending in CR: held - trim(), not trimStart()', '2| Spa\r', '\nZ', 3, ['a', 'Spa'], 'Z'],
    ['prose: closes', 'Ten', ' million\nZ', 2, ['a'], 'Ten million\nZ'],
    ['prose that starts with a number: closes', '10 million vectors', '\nZ', 2, ['a'], '10 million vectors\nZ'],
    ['prose that starts with a count: closes', '3 things matter', '\nZ', 2, ['a'], '3 things matter\nZ'],
    ['prose that starts with a year: closes', '2024 was', ' the year\nZ', 2, ['a'], '2024 was the year\nZ'],
    ['prose with a digit start and a bar later: closes', '10 million | shards', '\nZ', 2, ['a'], '10 million | shards\nZ'],
    ['a numbered list marker: closes', '2.', ' First\nZ', 2, ['a'], '2. First\nZ'],
    ['a bullet: closes', '- first', '\nZ', 2, ['a'], '- first\nZ'],
];

async function cases(impl, opts) {
    const R = (chunks) => runCuesTimed(impl, chunks, opts);
    const results = [];
    const add = (name, fails) => results.push({ name, fail: fails.find((f) => f) || null });

    {   // 1. Appendix B
        const r = await R(['__CUES__\n1| a\n', 'Ten ', 'million ', 'vectors.']);
        add('Appendix B', [r.reportedAfter !== 2 && `reportedAfter received ${r.reportedAfter}, expected 2`, !eq(r.out, ['Ten ', 'million ', 'vectors.']) && `out ${show(r.out)}`, !eq(r.cues, ['a']) && 'cues', r.calls !== 1 && 'calls']);
    }
    for (const size of [1, 3, 4, 7, 500]) {   // 2. the matrix
        const chunks = [];
        for (let i = 0; i < NO_NL.length; i += size) chunks.push(NO_NL.slice(i, i + size));
        const r = await R(chunks);
        const firstProseChunk = Math.floor(NO_NL.indexOf('Ten') / size) + 1;
        add(`matrix size ${size} (chunks ${chunks.length}, first prose chunk ${firstProseChunk})`, [
            r.reportedAfter !== firstProseChunk && `reportedAfter received ${r.reportedAfter}, expected ${firstProseChunk}`,
            r.out.join('') !== extractCues(NO_NL).prose && 'prose',
            !eq(r.cues, extractCues(NO_NL).cues) && 'cues',
            r.calls !== 1 && 'calls',
            size < NO_NL.length && !(r.out.length > 1) && `out.length ${r.out.length}`,
        ]);
    }
    for (const [state, partial, rest, reportedAfter, cues, prose] of ROWS) {   // 3. the 16 rows
        const r = await R([HEAD, partial, rest]);
        add(`row - ${state}`, [
            r.reportedAfter !== reportedAfter && `reportedAfter received ${r.reportedAfter}, expected ${reportedAfter}`,
            !eq(r.cues, cues) && `cues ${show(r.cues)}`,
            r.out.join('') !== prose && `prose ${show(r.out.join(''))}`,
            r.calls !== 1 && 'calls',
            !eq(extractCues(HEAD + partial + rest), { cues, prose }) && `THE ROW ITSELF is wrong against extractCues: ${show(extractCues(HEAD + partial + rest))}`,
        ]);
    }
    {   // 4. the sentinel's own line
        const a = await R(['__CUES__ 1| Spa', 'ces\nZ']);
        const b = await R(['__CUES__Ten', ' million\nZ']);
        add("the sentinel's own line", [
            !eq(a, { out: ['Z'], cues: ['Spaces'], calls: 1, reportedAfter: 2 }) && `first expect: ${show(a)}`,
            !eq(b, { out: ['Ten', ' million\nZ'], cues: [], calls: 1, reportedAfter: 1 }) && `second expect: ${show(b)}`,
            !eq(extractCues('__CUES__Ten million\nZ'), { cues: [], prose: 'Ten million\nZ' }) && 'third expect',
        ]);
    }
    {   // 5. the end flush
        const a = await R(['__CUES__\n1| a\n', '2| b']);
        const b = await R(['__CUES__\n1| a\n', '2|']);
        const c = await R(['__CUES__\n1| a\n', '2']);
        add('the stream ends on a held partial', [
            !eq(a, { out: [], cues: ['a', 'b'], calls: 1, reportedAfter: 2 }) && `first: ${show(a)}`,
            !eq(b, { out: ['2|'], cues: ['a'], calls: 1, reportedAfter: 2 }) && `second: ${show(b)}`,
            !eq(c, { out: ['2'], cues: ['a'], calls: 1, reportedAfter: 2 }) && `third: ${show(c)}`,
        ]);
    }
    return results;
}

(async () => {
    console.log(`NO_NL.length ${NO_NL.length}; indexOf('Ten') ${NO_NL.indexOf('Ten')}; rows ${ROWS.length} (held ${ROWS.filter((r) => r[3] === 3).length}, closes ${ROWS.filter((r) => r[3] === 2).length})`);
    for (const [label, impl, opts] of [['TODAY (built v2)', built.stripCueBlock, undefined], ['AFTER (plan, trim)', stripCueBlockNew, { trim: 'trim' }], ['MUTANT (trimStart)', stripCueBlockNew, { trim: 'trimStart' }], ['ALT predicate /^\\d+\\s*(\\||$)/, trim', stripCueBlockNew, { trim: 'trim', prefix: /^\d+\s*(\||$)/ }], ['ALT predicate, trimStart', stripCueBlockNew, { trim: 'trimStart', prefix: /^\d+\s*(\||$)/ }]]) {
        const res = await cases(impl, opts);
        const failed = res.filter((r) => r.fail);
        console.log(`\n=== ${label}: ${res.length} parser cases, ${failed.length} failed, ${res.length - failed.length} passed ===`);
        for (const f of failed) console.log(`  FAIL ${f.name}: ${f.fail}`);
    }
    // The pre-existing stripCueBlock cases that feed a CR anywhere: none in the file (grep), so the mutant touches only the new describe.
})();
