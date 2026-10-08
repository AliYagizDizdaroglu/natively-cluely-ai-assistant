// Item 1: the predicate on the partials the brief lists, and the claim "every prefix of a string that matches
// CUE_LINE matches CUE_LINE_PREFIX" (spec 2.1) checked by brute force over a small alphabet.
const { CUE_LINE, CUE_LINE_PREFIX, show } = require('./model.cjs');

const row = (p) => {
    const t = p.trim(), ts = p.trimStart();
    return `${show(p).padEnd(22)} trim=${show(t).padEnd(18)} CUE_LINE(trim)=${String(CUE_LINE.test(t)).padEnd(5)} PREFIX(trim)=${t === '' ? 'empty' : String(CUE_LINE_PREFIX.test(t)).padEnd(5)} PREFIX(trimStart)=${ts === '' ? 'empty' : CUE_LINE_PREFIX.test(ts)}  => ${t === '' || CUE_LINE_PREFIX.test(t) ? 'HELD' : 'CLOSES'}`;
};
console.log('--- the partials the brief names, and the spec\'s 17 states ---');
for (const p of ['', '   ', '\r', '\t', '1', '12', '1 ', '1\t', '1|', '1 |', '1| Spa', '1| Spa\r', ' 1| x', '1 2', '1| a\rb', 'Ten', '10 million vectors', '3 things matter', '2024 was', '10 million | shards', '2.', '- first', ' 1| Spa', '1.', '1)', '1:', '|', '| a', '١| a', '1│ a', '1｜ a', '1 | a', '﻿1| a'])
    console.log(row(p));

console.log('\n--- candidates for a WRONG RELEASE: a line that IS a cue line (CUE_LINE on trim) but fails PREFIX on trim ---');
for (const p of ['1|\ra', '1| \r a', '1|\r a', '1| a', '1|  a', '1\r| a', '1 | a', '1|\u000ba', '1|\u000ca', '1|\u0085a', '1| a ', '1| a\r'])
    console.log(row(p));

// Brute force. Alphabet: a digit, the bar, a letter, a dot, and every kind of whitespace that behaves differently
// under `.` and `\s` (space, tab, CR, U+2028, VT, NBSP). No '\n': a line never contains one.
const ALPHA = ['1', '|', 'a', '.', ' ', '\t', '\r', ' ', '\u000b', ' '];
const MAX = 6;
let lines = 0, cueLines = 0, wrongRelease = 0, examples = [];
const held = (p) => { const t = p.trim(); return t === '' || CUE_LINE_PREFIX.test(t); };
function* all(len, prefix = '') { if (prefix.length === len) { yield prefix; return; } for (const c of ALPHA) yield* all(len, prefix + c); }
for (let len = 1; len <= MAX; len++) {
    for (const line of all(len)) {
        lines++;
        if (!CUE_LINE.test(line.trim())) continue;
        cueLines++;
        // every partial of a real cue line must be HELD, or the early close releases a cue line as prose
        for (let k = 1; k <= line.length; k++) {
            if (!held(line.slice(0, k))) { wrongRelease++; if (examples.length < 12) examples.push(`${show(line)} released at partial ${show(line.slice(0, k))}`); break; }
        }
    }
}
console.log(`\n--- brute force over ${ALPHA.length}^1..${MAX}: ${lines} lines, ${cueLines} of them cue lines (CUE_LINE on trim) ---`);
console.log(`cue lines with a partial that the spec's predicate RELEASES: ${wrongRelease}`);
for (const e of examples) console.log('  ' + e);

// The same brute force for two alternative predicates.
for (const [name, re] of [['/^\\d+\\s*(\\||$)/  (digits, whitespace, then the bar or the end)', /^\d+\s*(\||$)/], ['/^\\d+\\s*(\\|[\\s\\S]*)?$/  (the spec\'s, with the dot crossing line terminators)', /^\d+\s*(\|[\s\S]*)?$/]]) {
    let wr = 0, differ = 0, heldMore = 0, heldLess = 0;
    const h2 = (p) => { const t = p.trim(); return t === '' || re.test(t); };
    for (let len = 1; len <= MAX; len++) for (const line of all(len)) {
        if (CUE_LINE.test(line.trim())) for (let k = 1; k <= line.length; k++) if (!h2(line.slice(0, k))) { wr++; break; }
        if (h2(line) !== held(line)) { differ++; if (h2(line)) heldMore++; else heldLess++; }
    }
    console.log(`alternative ${name}: wrong releases ${wr}; partials it judges differently from the spec's: ${differ} (holds more: ${heldMore}, holds less: ${heldLess})`);
}

// The converse (no wrong HOLD that matters is not a correctness property; but a CLOSE must be final): a partial
// that the predicate releases must not be completable into a cue line by any suffix.
let badClose = 0, closeEx = [];
for (let len = 1; len <= 4; len++) for (const p of all(len)) {
    if (held(p)) continue;
    for (let sl = 0; sl <= 3; sl++) for (const s of all(sl)) {
        if (CUE_LINE.test((p + s).trim())) { badClose++; if (closeEx.length < 8) closeEx.push(`${show(p)} + ${show(s)}`); }
    }
}
console.log(`\nreleased partials (len<=4) that some suffix (len<=3) completes into a cue line: ${badClose}`);
for (const e of closeEx) console.log('  ' + e);
