// (1) offersIn (the real helper, exported from a scratch copy) against BASE's trailing parse, extractSuggestions(SENTINEL + tail).
// (2) The 16 states of spec §2.3, each at its own split and at five more chunkings, with the table's expectations.
// (3) Spec §5: a consumer that stops early gets no callback (as BASE). (4) Recursion depth of the leading branch.
const X = await import('./work-exp.mts');
const W = await import('./work.mts');
const Bm = await import('./base.mts');
const SENT = '__MORE__';
const LINE = '[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)';
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const LS = String.fromCharCode(0x2028);

// ---------- (1) offersIn ----------
{
    const TOK = ['\n', '1| a', '2|  "q"', '3| "', '4 | b\r', '__MORE__', 'x', ' ', '|', '7', '\r', LS, '`t`', "5|'s'"];
    function* seqs(len, p = []) { if (p.length === len) { yield p; return; } for (const t of TOK) yield* seqs(len, p.concat([t])); }
    let n = 0, diff = 0, nonEmpty = 0, quoteStripped = 0, emptyLabelDropped = 0, ex = null;
    for (let len = 1; len <= 5; len++) for (const s of seqs(len)) {
        const tail = s.join('');
        n++;
        const a = X.offersIn(tail.split('\n'));
        const b = Bm.extractSuggestions(SENT + tail).suggestions;
        if (!eq(a, b)) { diff++; ex = ex ?? { tail, a, b }; }
        if (a.length) nonEmpty++;
        if (a.some((o) => o.label === 'q' || o.label === 's' || o.label === 't')) quoteStripped++;
        if (/(^|\n)\s*3\| "\s*($|\n)/.test(tail)) emptyLabelDropped++;
    }
    console.log(`(1) offersIn vs BASE trailing parse: ${n} tails, differ ${diff}; tails with offers ${nonEmpty}, with a quote stripped ${quoteStripped}, with a bare 3| " line ${emptyLabelDropped}`);
    if (ex) console.log('    example', JSON.stringify(ex));
    // calibration: a helper that forgets the quote strip must differ
    const noStrip = (lines) => lines.map((r) => r.trim().match(/^(\d+)\s*\|\s*(.+)$/)).filter(Boolean).map((m) => ({ n: Number(m[1]), label: m[2].trim() })).filter((o) => o.label);
    let calDiff = 0; for (const t of ['1| "q"\n', '2| a\n', "5|'s'"]) if (!eq(noStrip(t.split('\n')), Bm.extractSuggestions(SENT + t).suggestions)) calDiff++;
    console.log(`    calibration: a no-quote-strip helper differs on ${calDiff} of 3 known tails (expect 2)`);
}

// ---------- (2) the 16 states ----------
async function run(M, chunks) {
    const pieces = []; let sugg = null, calls = 0, seen = 0; const warns = [];
    const orig = console.warn; console.warn = (...a) => warns.push(a.map(String).join(' '));
    try {
        async function* source() { for (const c of chunks) { seen++; yield c; } }
        for await (const p of M.stripSuggestionBlock(source(), (s) => { sugg = s; calls++; })) pieces.push([seen, p]);
    } finally { console.warn = orig; }
    return { out: pieces.map((p) => p[1]).join(''), sugg, calls, warns: warns.length, shownAfter: (pieces.find((p) => p[1].trim()) ?? [-1])[0], pieces };
}
const cut = (t, n) => { const o = []; for (let i = 0; i < t.length; i += n) o.push(t.slice(i, i + n)); return o; };
const LEAD = '__MORE__\n1| a b\n';
const AB = [{ n: 1, label: 'a b' }], CD = { n: 2, label: 'c d' }, ABCD = [...AB, CD];
const PROSE = 'Ten million vectors take about thirty gigabytes.';
// [row, chunks (the row's own split), expected out (exact at the row's split), offers, warns, shownAfter at the row's split (null: not pinned), char-level release index (null: not pinned)]
const ROWS = [
    ['1 empty', [LEAD, '', '2| c d\nZ'], 'Z', ABCD, 1, 3, null],
    ['1 whitespace', [LEAD, '  ', '\n2| c d\nZ'], 'Z', ABCD, 1, 3, null],
    ['2 digit', [LEAD, '2', '| c d\nZ'], 'Z', ABCD, 1, 3, null],
    ['2 digit+bar', [LEAD, '2|', ' c d\nZ'], 'Z', ABCD, 1, 3, null],
    ['2 partial offer', [LEAD, '2| c', ' d\nZ'], 'Z', ABCD, 1, 3, null],
    ['3 CR after the bar', [LEAD, '2|\rc d', '\nZ'], 'Z', ABCD, 1, 3, null],
    ['4 CRLF boundary', [LEAD, '2| c d\r', '\nZ'], 'Z', ABCD, 1, 3, null],
    ['5 prose', [LEAD, 'Ten', ' million\nZ'], 'Ten million\nZ', AB, 1, 2, LEAD.length + 1],
    ['6 digit-led, closes at m', [LEAD, '10 million', ' vectors\nZ'], '10 million vectors\nZ', AB, 1, 2, LEAD.length + 4],
    ['7 list marker, closes at .', [LEAD, '2.', ' First\nZ'], '2. First\nZ', AB, 1, 2, LEAD.length + 2],
    ['8 second sentinel', [LEAD, '_', '_MORE__\n2| c d\nZ'], 'Z', ABCD, 1, 3, null],
    ['9 underscore not a sentinel', [LEAD, '_', 'x\nZ'], '_x\nZ', AB, 1, 3, null],
    ['10 ends on a complete offer', [LEAD, '2| c d'], '', ABCD, 1, -1, null],
    ['11 ends on 2|', [LEAD, '2|'], '2|', AB, 1, 2, null],
    ['12 answer then a second block', [LEAD, 'Answer here.\n__MORE__\n3| e f\n'], 'Answer here.\n', [...AB, { n: 3, label: 'e f' }], 1, 2, LEAD.length + 1],
    ['13 answer first (today)', ['Answer.\n__MORE__\nHere is more:\n1| a b\n'], 'Answer.\n', AB, 0, 1, null],
    ['14 whitespace before the sentinel', ['\n', '__MORE__\n1| a b\n', 'Ten'], '\nTen', AB, 1, 3, null],
    ['15 offers only', [LEAD], '', AB, 1, -1, null],
    ['16 offer-shaped line after the answer began (edge)', [LEAD, PROSE + '\n2| c d\n'], PROSE + '\n2| c d\n', AB, 1, 2, LEAD.length + 1],
];
let bad = 0;
for (const [name, chunks, out, offers, warns, shownAfter, rel] of ROWS) {
    const text = chunks.join('');
    const probs = [];
    const own = await run(W, chunks);
    if (own.out !== out) probs.push(`out ${JSON.stringify(own.out)}`);
    if (!eq(own.sugg, offers)) probs.push(`offers ${JSON.stringify(own.sugg)}`);
    if (own.calls !== 1) probs.push(`calls ${own.calls}`);
    if (own.warns !== warns) probs.push(`warns ${own.warns}`);
    if (shownAfter !== null && own.shownAfter !== shownAfter) probs.push(`shownAfter ${own.shownAfter}`);
    const whole = W.extractSuggestions(text);
    if (whole.answer.trim() !== out.trim() || !eq(whole.suggestions, offers)) probs.push(`whole ${JSON.stringify(whole)}`);
    for (const c of [[text], text.split(''), cut(text, 2), cut(text, 3), cut(text, 7)]) {
        const r = await run(W, c);
        if (r.out.trim() !== out.trim() || !eq(r.sugg, offers) || r.calls !== 1 || r.warns !== warns) probs.push(`chunking ${c.length}: ${JSON.stringify([r.out, r.sugg, r.calls, r.warns])}`);
        if (rel !== null && c.length === text.length && r.shownAfter !== rel) probs.push(`char release ${r.shownAfter} (want ${rel})`);
    }
    if (name.startsWith('13')) for (const c of [[text], text.split(''), cut(text, 3)]) { const a = await run(W, c), b = await run(Bm, c); if (!eq(a.pieces, b.pieces) || !eq(a.sugg, b.sugg)) probs.push('differs from BASE'); }
    if (probs.length) bad++;
    console.log(`(2) row ${name}: ${probs.length ? 'FAIL ' + probs.join('; ') : 'ok'}`);
}
console.log(`(2) ${ROWS.length - bad} of ${ROWS.length} row checks ok`);

// ---------- (3) early stop: no callback, as BASE ----------
for (const [label, chunks] of [['leading', [LEAD, 'Ten ', 'million ', 'vectors.']], ['trailing', ['Answer first. ', 'More words. ', '\n__MORE__\n1| a b\n']]]) {
    const res = [];
    for (const M of [W, Bm]) {
        let calls = 0; const orig = console.warn; console.warn = () => {};
        try {
            async function* source() { for (const c of chunks) yield c; }
            const g = M.stripSuggestionBlock(source(), () => { calls++; });
            const first = await g.next();
            await g.return(undefined);
            res.push(`${JSON.stringify(first.value)} calls=${calls}`);
        } finally { console.warn = orig; }
    }
    console.log(`(3) early stop, ${label}: WORK ${res[0]} | BASE ${res[1]}`);
}

// ---------- (4) recursion depth of extractSuggestions' leading branch ----------
for (const n of [1000, 5000, 12000]) {
    const text = '__MORE__\n'.repeat(n) + 'Z';
    const t0 = Date.now();
    let r;
    try { r = JSON.stringify(W.extractSuggestions(text)); } catch (e) { r = `${e.name}: ${e.message}`; }
    const t1 = Date.now();
    let s;
    const orig = console.warn; console.warn = () => {};
    try { let out = ''; async function* src() { yield text; } for await (const p of W.stripSuggestionBlock(src())) out += p; s = JSON.stringify(out); } catch (e) { s = `${e.name}: ${e.message}`; } finally { console.warn = orig; }
    console.log(`(4) ${n} leading sentinels (${text.length} chars): extractSuggestions ${r.slice(0, 60)} in ${t1 - t0} ms; stripSuggestionBlock ${s.slice(0, 40)} in ${Date.now() - t1} ms`);
}
