// Item 1: try to break the rule. Three things are compared on the same text:
//   E = the built extractCues (whole string)      O = the built stripCueBlock (today, streaming)
//   N = the plan's parser (today's code + Edit C) A = the same with the predicate /^\d+\s*(\||$)/
// for every chunking (exhaustive part) or for several random chunkings (random part). Reported: every way N differs
// from O (cues, joined prose, number of reports), every way O differs from E (pre-existing, not this delta's), and
// whether each N-vs-O difference is of the one class found by 01-regex.cjs (a line terminator after the bar).
// No unicode escapes in this file: special characters are built from char codes.
const { built, stripCueBlockNew, show } = require('./model.cjs');
const ch = (n) => String.fromCharCode(n);
const LS = ch(0x2028), PS = ch(0x2029), NBSP = ch(0xa0);

async function run(impl, chunks, opts) {
    let cues = null, calls = 0;
    async function* source() { for (const c of chunks) yield c; }
    let out = '';
    const pieces = [];
    for await (const p of impl(source(), (x) => { cues = x; calls++; }, opts)) { out += p; pieces.push(p); }
    return { out, cues, calls, pieces };
}
const same = (a, b) => a.out === b.out && JSON.stringify(a.cues) === JSON.stringify(b.cues) && a.calls === b.calls;
const ALT = { prefix: /^\d+\s*(\||$)/ };
// a bar, then whitespace that reaches a CR / LS / PS
const TERMINATOR_AFTER_BAR = new RegExp('\\|[^\\S\\r' + LS + PS + ']*[\\r' + LS + PS + ']');

function chunkings(s) {   // every way to cut s into non-empty pieces
    const n = s.length;
    if (n === 0) return [[]];
    const res = [];
    for (let mask = 0; mask < (1 << (n - 1)); mask++) {
        const parts = []; let start = 0;
        for (let i = 0; i < n - 1; i++) if (mask & (1 << i)) { parts.push(s.slice(start, i + 1)); start = i + 1; }
        parts.push(s.slice(start));
        res.push(parts);
    }
    return res;
}

(async () => {
    // ---------- exhaustive: HEAD in one chunk, then every string over a small alphabet, every chunking ----------
    const HEADS = ['__CUES__\n1| a\n', '__CUES__', '__CUES__ '];
    const ALPHA = ['1', '|', 'a', ' ', '\n', '\r'];
    const stat = { runs: 0, nVsO: 0, nVsO_class: 0, nVsO_other: 0, oVsE: 0, aVsO: 0, nCalls: 0, emptyYield: 0 };
    const exN = [], exOther = [], exOE = [], exA = [];
    function* all(len, prefix = '') { if (prefix.length === len) { yield prefix; return; } for (const c of ALPHA) yield* all(len, prefix + c); }
    for (const head of HEADS) for (let len = 0; len <= 6; len++) for (const tail of all(len)) {
        const text = head + tail;
        const E = built.extractCues(text);
        const cuts = len <= 5 ? chunkings(tail) : [tail.split(''), [tail], [tail.slice(0, 3), tail.slice(3)], [tail.slice(0, 1), tail.slice(1, 4), tail.slice(4)]];
        for (const cut of cuts) {
            const chunks = [head, ...cut];
            const O = await run(built.stripCueBlock, chunks);
            const N = await run(stripCueBlockNew, chunks);
            const A = await run(stripCueBlockNew, chunks, ALT);
            stat.runs++;
            if (N.calls !== 1) stat.nCalls++;
            if (N.pieces.some((p) => p === '')) stat.emptyYield++;
            if (!same(N, O)) {
                stat.nVsO++;
                if (TERMINATOR_AFTER_BAR.test(tail)) stat.nVsO_class++; else { stat.nVsO_other++; if (exOther.length < 10) exOther.push({ chunks, O, N }); }
                if (exN.length < 4) exN.push({ chunks, O: { out: O.out, cues: O.cues }, N: { out: N.out, cues: N.cues } });
            }
            if (!same(A, O)) { stat.aVsO++; if (exA.length < 6) exA.push({ chunks, O, A }); }
            if (O.out !== E.prose || JSON.stringify(O.cues) !== JSON.stringify(E.cues)) { stat.oVsE++; if (exOE.length < 6) exOE.push({ text, E, O: { out: O.out, cues: O.cues } }); }
        }
    }
    console.log('--- exhaustive: 3 heads x every tail over ["1","|","a"," ","\\n","\\r"] up to length 6 (every chunking up to length 5) ---');
    console.log(`runs ${stat.runs}`);
    console.log(`N (the plan) differs from O (today) in cues / joined prose / report count: ${stat.nVsO}   of which: a line terminator after the bar ${stat.nVsO_class}, anything else ${stat.nVsO_other}`);
    for (const e of exN) console.log('   e.g. ' + show(e));
    for (const e of exOther) console.log('   OTHER ' + show(e));
    console.log(`N reports other than exactly once: ${stat.nCalls};  N yields an empty string: ${stat.emptyYield}`);
    console.log(`A (predicate /^\\d+\\s*(\\||$)/) differs from O: ${stat.aVsO}`);
    for (const e of exA) console.log('   e.g. ' + show(e));
    console.log(`O (today, streaming) differs from E (extractCues) — pre-existing, not this delta: ${stat.oVsE}`);
    for (const e of exOE) console.log('   e.g. ' + show(e));

    // ---------- random: richer tokens ----------
    let seed = 20260930;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const TOKENS = ['__CUES__', '\n', '\n', '\r\n', ' ', '  ', '\t', '1', '2', '3', '10', '2024', '|', '| ', ' | ', 'a', 'Ten million', 'Spaces', '.', '. ', '- ', '* ', '"quoted"', '`tick`', 'x y z', 'Time: O(n)', "I'm going to explain", '1| cue one', '2| cue two', '3|', '4', LS, NBSP, 'e' + ch(0x301), ch(0xff11), ch(0xff5c)];
    const r = { texts: 0, runs: 0, nVsO: 0, nVsO_class: 0, nVsO_other: 0, aVsO: 0, oVsE: 0, nCalls: 0 };
    const rOther = [], rOE = [], rClass = [];
    for (let t = 0; t < 60000; t++) {
        let text = rnd() < 0.85 ? pick(['__CUES__\n', '__CUES__', '\n__CUES__\n', ' __CUES__\r\n', '__CUES__ ']) : '';
        const k = 1 + Math.floor(rnd() * 9);
        for (let i = 0; i < k; i++) text += pick(TOKENS);
        const E = built.extractCues(text);
        r.texts++;
        const cuts = [text.split(''), [text]];
        for (let c = 0; c < 4; c++) { const parts = []; let i = 0; while (i < text.length) { const len = 1 + Math.floor(rnd() * 9); parts.push(text.slice(i, i + len)); i += len; } cuts.push(parts); }
        for (const chunks of cuts) {
            const O = await run(built.stripCueBlock, chunks);
            const N = await run(stripCueBlockNew, chunks);
            const A = await run(stripCueBlockNew, chunks, ALT);
            r.runs++;
            if (N.calls !== 1) r.nCalls++;
            if (!same(N, O)) {
                r.nVsO++;
                if (TERMINATOR_AFTER_BAR.test(text)) { r.nVsO_class++; if (rClass.length < 3) rClass.push({ chunks, O: { out: O.out, cues: O.cues }, N: { out: N.out, cues: N.cues } }); }
                else { r.nVsO_other++; if (rOther.length < 10) rOther.push({ chunks, O, N }); }
            }
            if (!same(A, O)) r.aVsO++;
            if (O.out !== E.prose || JSON.stringify(O.cues) !== JSON.stringify(E.cues)) { r.oVsE++; if (rOE.length < 6) rOE.push({ text, E, O: { out: O.out, cues: O.cues } }); }
        }
    }
    console.log('\n--- random: 60000 texts from 36 tokens, 6 chunkings each (char by char, whole, 4 random) ---');
    console.log(`texts ${r.texts}, runs ${r.runs}`);
    console.log(`N differs from O: ${r.nVsO}   of which: a line terminator after the bar ${r.nVsO_class}, anything else ${r.nVsO_other}`);
    for (const e of rClass) console.log('   e.g. ' + show(e));
    for (const e of rOther) console.log('   OTHER ' + show(e));
    console.log(`N reports other than exactly once: ${r.nCalls}`);
    console.log(`A differs from O: ${r.aVsO}`);
    console.log(`O differs from E (pre-existing): ${r.oVsE}`);
    for (const e of rOE) console.log('   e.g. ' + show(e));
})();
