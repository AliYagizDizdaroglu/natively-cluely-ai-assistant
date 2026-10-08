// The fix proposed for finding 1, checked before it is proposed: the predicate /^\d+\s*(\||$)/ and two new rows.
// For each candidate row: what extractCues says (the truth), what the plan's predicate does, what the proposed one does.
const { built, stripCueBlockNew, runCuesTimed, show } = require('./model.cjs');
const LS = String.fromCharCode(0x2028);
const HEAD = '__CUES__\n1| a\n';
const SPEC = /^\d+\s*(\|.*)?$/, ALT = /^\d+\s*(\||$)/;
const ROWS = [
    ['a CR directly after the bar (a cue line: CUE_LINE takes the CR as whitespace)', '2|\rSpa', 'ces\nZ'],
    ['a line separator U+2028 after the bar', '2| ' + LS + 'Spa', 'ces\nZ'],
    ['the plan\'s CR row (CRLF boundary)', '2| Spa\r', '\nZ'],
    ['a CR inside the phrase (never a cue line)', '2| a\rb', 'c\nZ'],
    ['prose', 'Ten', ' million\nZ'],
    ['digits then a letter', '10 m', 'illion\nZ'],
];
(async () => {
    for (const [name, partial, rest] of ROWS) {
        const truth = built.extractCues(HEAD + partial + rest);
        const today = await runCuesTimed(built.stripCueBlock, [HEAD, partial, rest]);
        console.log(`\n${name}: partial ${show(partial)} rest ${show(rest)}`);
        console.log(`   extractCues: cues ${show(truth.cues)} prose ${show(truth.prose)};   today: reportedAfter ${today.reportedAfter}`);
        for (const [label, opts] of [['plan predicate, trim', { prefix: SPEC, trim: 'trim' }], ['plan predicate, trimStart', { prefix: SPEC, trim: 'trimStart' }], ['proposed predicate, trim', { prefix: ALT, trim: 'trim' }], ['proposed predicate, trimStart', { prefix: ALT, trim: 'trimStart' }]]) {
            const r = await runCuesTimed(stripCueBlockNew, [HEAD, partial, rest], opts);
            const ok = JSON.stringify(r.cues) === JSON.stringify(truth.cues) && r.out.join('') === truth.prose && r.calls === 1;
            console.log(`   ${label.padEnd(30)} reportedAfter ${r.reportedAfter}  cues ${show(r.cues)}  prose ${show(r.out.join(''))}  ${ok ? 'equals extractCues' : 'DIFFERS FROM extractCues'}`);
        }
    }
    // The guard `head !== ''`: what fails if it is dropped (a calibration candidate for Step 5 under the proposed predicate)
    const noGuard = async function* (source, onCues) { yield* stripCueBlockNew(source, onCues, { prefix: /^(\d+\s*(\||$))?/ }); };
    void noGuard;
})();
