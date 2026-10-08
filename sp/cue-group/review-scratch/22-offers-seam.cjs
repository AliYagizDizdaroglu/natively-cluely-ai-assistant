// Part B item 4: the seam. The chain of WhatToAnswerLLM (as 04-seam.cjs copies it), with four builds:
//   e3fae5f      the built cue parser, the built offers guard                 (what flew at 16:12)
//   task1        the early close (corrected predicate), the built offers guard (RED state of the offers task)
//   both         the early close and the plan's offers guard                  (the combined build)
//   offers-only  the built cue parser and the plan's offers guard             (does the fix need the early close?)
// (1) the plan's chain case (Step 1b) at the helper's chunk size 5 and at other sizes; (2) D4 and neighbours through
// the hedge-shaped raw stream; (3) what is shown, and when, for each offers state. Invented text only.
const { built, stripCueBlockNew } = require('./model.cjs');
const M = require('./offers-model.cjs');
const { filterCodeFences, filterVerbalLines, stripSpokenNotation, cutAtWordBudget, SPOKEN_WORD_GUARD } = built;
const show = (x) => JSON.stringify(x);
const earlyClose = (src, cb) => stripCueBlockNew(src, cb, { prefix: M.WIDE });
const BUILDS = {
    'e3fae5f': { cue: built.stripCueBlock, sug: (src, cb) => built.stripSuggestionBlock(src, cb) },
    'task1': { cue: earlyClose, sug: (src, cb) => built.stripSuggestionBlock(src, cb) },
    'both': { cue: earlyClose, sug: (src, cb, warn) => M.stripSuggestionBlockNew(src, cb, { warn }) },
    'offers-only': { cue: built.stripCueBlock, sug: (src, cb, warn) => M.stripSuggestionBlockNew(src, cb, { warn }) },
};

async function* stripModelSentinel(source) {
    let buffer = '', stripped = false;
    for await (const chunk of source) {
        if (stripped) { yield chunk; continue; }
        buffer += chunk;
        if (!buffer.startsWith('__model_source:') && !'__model_source:'.startsWith(buffer)) { stripped = true; yield buffer; buffer = ''; continue; }
        const match = buffer.match(/^__model_source:[^_]*__/);
        if (match) { stripped = true; const rest = buffer.slice(match[0].length); if (rest) yield rest; buffer = ''; }
    }
    if (!stripped && buffer) yield buffer;
}
const HEDGE_WINNER = /^__model_source:(\S+) \(hedge\)__$/;
async function* nameStallSwitch(raw, filter) {
    let announce = null;
    async function* watch() { for await (const chunk of raw) { if (HEDGE_WINNER.test(chunk)) announce = chunk; yield chunk; } }
    for await (const chunk of filter(watch())) { if (announce) { yield announce; announce = null; } yield chunk; }
}

/** One generateStream over raw steps (arrays = chunks; {thenFail} = chunks then a throw), hedge on, as hedgeCues.test.ts feeds them. */
async function generate(build, plan, { hedge = true } = {}) {
    const ev = [], asked = [];
    let step = 0, seen = 0;
    const warn = () => ev.push(`WARN offers-first line during raw chunk ${seen}`);
    const rawStream = async function* () {
        const s = plan[step++];
        asked.push('gemini-3.5-flash-lite');
        if (hedge) yield '__model_source:gemini-3.5-flash-lite (hedge)__';
        seen = 0;
        const chunks = Array.isArray(s) ? s : s.thenFail;
        for (const c of chunks) { seen++; yield c; }
        if (!Array.isArray(s)) { ev.push(`RAW THROWS after raw chunk ${seen}`); throw new Error('socket hang up'); }
    };
    let cuesSent = false, sugSent = false, fallbackModel;
    const cues = [], offers = [];
    const onCuesOnce = (c) => { if (cuesSent) { ev.push(`(second cue report dropped: ${show(c)})`); return; } cuesSent = true; cues.push(c); ev.push(`CUES ${show(c)} during raw chunk ${seen}`); };
    const onSugOnce = (s) => { if (sugSent) { ev.push(`(second offers report dropped: ${show(s.map((x) => x.label))})`); return; } sugSent = true; offers.push(s); ev.push(`OFFERS ${show(s.map((x) => x.label))}`); };
    const filtered = (raw) => stripSpokenNotation(build.sug(filterVerbalLines(filterCodeFences(build.cue(stripModelSentinel(raw), onCuesOnce))), onSugOnce, warn));
    const filteredAndNamed = (raw) => nameStallSwitch(raw, filtered);
    async function* withVerbalFallback(primary) {
        let started = false;
        try { for await (const chunk of primary) { if (chunk && !started) { started = true; } yield chunk; } }
        catch (err) {
            if (started) { ev.push('failure AFTER started: re-thrown'); throw err; }
            fallbackModel = 'gemini-3.1-flash-lite';
            ev.push('failure BEFORE started: redirect');
            yield `__model_source:${fallbackModel} (fallback)__`;
            yield* filteredAndNamed(rawStream());
        }
    }
    const out = [];
    let firstTokenAt = null, budget = null;
    try {
        for await (const c of cutAtWordBudget(withVerbalFallback(filteredAndNamed(rawStream())), { ...SPOKEN_WORD_GUARD, onDone: (r) => { budget = r; } })) {
            if (firstTokenAt === null && c.length > 0 && !/^__model_source:[^_]*__$/.test(c)) { firstTokenAt = seen; ev.push(`FIRST TOKEN ${show(c.slice(0, 24))} during raw chunk ${seen}`); }
            out.push(c);
        }
    } catch (error) { out.push(`[No answer — the answer model failed: ${(error?.message ?? String(error)).slice(0, 160)}]`); }
    const text = out.join('').replace(/__model_source:[^_]*__/g, '');
    return { asked, ev, text, cues, offers, budget, firstTokenAt };
}
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };

(async () => {
    // ---------- (1) the plan's chain case, Step 1b ----------
    const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight cuts that to about seven and a half.';
    const RAW1B = `__CUES__\n1| thirty gigabytes in float32\n__MORE__\n1| int8 quantization trade-offs\n2| sharding across nodes\n\n${PROSE}`;
    const WANT_OFFERS = [{ n: 1, label: 'int8 quantization trade-offs' }, { n: 2, label: 'sharding across nodes' }];
    console.log('=== (1) the chain case of Step 1b: cue block, offers block, blank line, one paragraph ===');
    for (const size of [5, 1, 3, 7, 40, 1000]) for (const name of Object.keys(BUILDS)) {
        const r = await generate(BUILDS[name], [cut(RAW1B, size)], { hedge: false });
        const a = { out: r.text.trim() === PROSE, noMore: !r.text.includes('__MORE__'), noBar: !r.text.includes('1|'), cues: show(r.cues) === show([['thirty gigabytes in float32']]), offers: show(r.offers) === show([WANT_OFFERS]) };
        const all = Object.values(a).every(Boolean);
        const chunks = cut(RAW1B, size);
        const firstProse = Math.floor(RAW1B.indexOf('Ten') / size) + 1, underscore = Math.floor(RAW1B.indexOf('__MORE__') / size) + 1;
        console.log(`  size ${String(size).padStart(4)} ${name.padEnd(11)}: ${all ? 'all five assertions hold' : 'FAILS: ' + Object.entries(a).filter(([, v]) => !v).map(([k]) => k).join(', ')}; shown ${show(r.text.trim().slice(0, 30))}${r.text.trim().length > 30 ? '…' : ''} words=${r.budget?.words}; ${r.ev.filter((e) => /^CUES|^FIRST|^WARN/.test(e)).join('; ')}  [of ${chunks.length} chunks: the underscore in ${underscore}, the first prose character in ${firstProse}]`);
    }

    // ---------- (2) D4 and its neighbours, hedge on ----------
    const CHUNKED = ['__CU', 'ES__\n1| thirty giga', 'bytes in float32\n2| int8, then shard\nTen million vectors take about ', 'thirty gigabytes. Quantizing to int eight cuts that ', 'to about seven and a half.'];
    const CASES = [
        ['D4 (the plan): dies inside a leading offers block, one chunk', [{ thenFail: ['__CUES__\n1| first stream cue a\n__MORE__\n1| an offer\n'] }, CHUNKED]],
        ['D4b: dies right after the underscore (the early close alone reported)', [{ thenFail: ['__CUES__\n1| first stream cue a\n', '_'] }, CHUNKED]],
        ['D4c: dies after the offers block, 2 characters into its answer', [{ thenFail: ['__CUES__\n1| first stream cue a\n__MORE__\n1| an offer\n\n', 'Te'] }, CHUNKED]],
        ['D4d: dies after the first words of its answer were shown', [{ thenFail: ['__CUES__\n1| first stream cue a\n__MORE__\n1| an offer\n\n', 'Ten million vectors '] }, CHUNKED]],
    ];
    console.log('\n=== (2) the redirect window of a leading offers block ===');
    for (const [name, plan] of CASES) {
        console.log(`  ${name}`);
        for (const b of ['e3fae5f', 'task1', 'both']) {
            const r = await generate(BUILDS[b], plan.slice());
            const d4 = { asked: show(r.asked) === show(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']), once: r.cues.length === 1, cue: show(r.cues[0]) === show(['first stream cue a']), prose: r.text.includes('Ten million vectors take about thirty gigabytes.'), noOffer: !r.text.includes('an offer') };
            console.log(`    [${b.padEnd(7)}] asked ${r.asked.length}; cues ${show(r.cues)}; shown ${show(r.text.trim().length > 70 ? r.text.trim().slice(0, 34) + ' … ' + r.text.trim().slice(-30) : r.text.trim())}; D4's five assertions: ${Object.values(d4).every(Boolean) ? 'hold' : 'FAIL ' + Object.entries(d4).filter(([, v]) => !v).map(([k]) => k).join(', ')}`);
            console.log(`              ${r.ev.join(' | ')}`);
        }
    }

    // ---------- (3) what the candidate sees, per state, on the combined build ----------
    const P2 = 'Ten million vectors take about thirty gigabytes.';
    const STATES = [
        ['offers first, one paragraph (the 9 saved replies)', `__CUES__\n1| cue a\n__MORE__\n1| offer one\n2| offer two\n\n${P2}`],
        ['offers first, no blank line before the answer', `__CUES__\n1| cue a\n__MORE__\n1| offer one\n${P2}`],
        ['offers only (a true block-only reply)', '__CUES__\n1| cue a\n__MORE__\n1| offer one\n2| offer two\n'],
        ['the answer first (the asked order)', `__CUES__\n1| cue a\n${P2}\n__MORE__\n1| offer one\n`],
        ['offers first, the answer, then offers again', `__CUES__\n1| cue a\n__MORE__\n1| offer one\n\n${P2}\n__MORE__\n2| offer two\n`],
        ['offers first, then an offer-shaped line after the answer began (the accepted edge)', `__CUES__\n1| cue a\n__MORE__\n1| offer one\n\n${P2}\n2| offer two\n`],
        ['offers first, a digit-led answer', '__CUES__\n1| cue a\n__MORE__\n1| offer one\n\n10 million vectors fit in thirty gigabytes.'],
        ['a second __CUES__ line closing the cue block, then the answer and offers', `__CUES__\n1| cue a\n__CUES__\n${P2}\n__MORE__\n1| offer one\n`],
        ['no cue block, offers first', `__MORE__\n1| offer one\n\n${P2}`],
        ['offers first, the answer opens with a preamble the line filter rewrites', `__CUES__\n1| cue a\n__MORE__\n1| offer one\n\nI'm going to walk you through it. ${P2}`],
        ['offers first, the answer opens with a list marker', `__CUES__\n1| cue a\n__MORE__\n1| offer one\n\n1. ${P2}`],
    ];
    console.log('\n=== (3) what is shown, per state (chunk size 9; the same text at sizes 1, 4, 9, 40 and whole must agree) ===');
    for (const [name, raw] of STATES) {
        console.log(`  ${name}`);
        for (const b of ['e3fae5f', 'task1', 'both']) {
            const seenTexts = new Set(), seenCues = new Set(), seenOffers = new Set();
            let r9 = null;
            for (const size of [9, 1, 4, 40, 100000]) { const r = await generate(BUILDS[b], [cut(raw, size)], { hedge: false }); seenTexts.add(r.text.trim()); seenCues.add(show(r.cues)); seenOffers.add(show(r.offers.map((o) => o.map((x) => x.label)))); r9 = r9 ?? r; }
            console.log(`    [${b.padEnd(7)}] shown ${show(r9.text.trim())}; cues ${show(r9.cues[0])}; offers ${show((r9.offers[0] || []).map((x) => x.label))}; words=${r9.budget?.words}; ${r9.ev.filter((e) => /^WARN/.test(e)).length ? 'warn line' : 'no warn line'}${seenTexts.size > 1 || seenCues.size > 1 || seenOffers.size > 1 ? `   <-- DEPENDS ON THE CHUNK SIZE: ${show([...seenTexts])} ${[...seenOffers]}` : ''}`);
        }
    }
})();
