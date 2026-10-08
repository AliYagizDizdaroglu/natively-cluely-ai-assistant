// Item 2: the seam. A faithful copy of WhatToAnswerLLM.generateStream's verbal chain (stripModelSentinel,
// nameStallSwitch, withVerbalFallback, the catch) composed with the BUILT downstream filters (filterCodeFences,
// filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget) and with either cue parser:
// the built one (today) or the plan's (after). The raw stream imitates what the hedge hands over for the stub's
// plan steps: its winner sentinel, the chunks, then (for thenFail) a throw of "socket hang up".
// This runs no project test and starts nothing; it answers "what does the reader get, and when".
const { built, stripCueBlockNew, show } = require('./model.cjs');
const { filterCodeFences, filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget, SPOKEN_WORD_GUARD } = built;

const STALL_SWITCH = /^__model_source:(\S+) \(fallback\)__$/;
const GEMMA_HANDOVER = /^__model_source:(Gemini Flash)__$/;
const HEDGE_WINNER = /^__model_source:(\S+) \(hedge\)__$/;
const FRONT = 'gemini-3.5-flash-lite', BACK = 'gemini-3.1-flash-lite';

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
async function* nameStallSwitch(raw, filter, onSwitch) {
    let announce = null;
    async function* watch() {
        for await (const chunk of raw) {
            const h = HEDGE_WINNER.exec(chunk);
            const m = h ?? STALL_SWITCH.exec(chunk) ?? GEMMA_HANDOVER.exec(chunk);
            if (m) { announce = h ? chunk : `__model_source:${m[1]} (fallback)__`; onSwitch(m[1]); }
            yield chunk;
        }
    }
    for await (const chunk of filter(watch())) {
        if (announce) { yield announce; announce = null; }
        yield chunk;
    }
}
async function* tapFirstToken(stream, onFirst) {
    let first = true;
    for await (const chunk of stream) {
        if (first && chunk.length > 0 && !/^__model_source:[^_]*__$/.test(chunk)) { first = false; onFirst(); }
        yield chunk;
    }
}

/** One generateStream over a plan of raw steps, exactly as hedgeCues.test.ts feeds them (hedge on). */
async function generate(cueImpl, plan, opts = {}) {
    const events = [];            // what happened, in order
    const asked = [];
    let step = 0, seen = 0;       // `seen`: raw chunks handed over so far in the CURRENT raw stream (sentinel excluded)
    const hedgeRaw = async function* () {
        // the hedge asks its front; a step of 'error' fails the front and then the back (two asks) before any token
        let s = plan[step++];
        asked.push(FRONT);
        if (s === 'error') { s = plan[step++]; asked.push(BACK); if (s === 'error') throw new Error('got status: 503 Service Unavailable'); yield `__model_source:${BACK} (hedge)__`; }
        else yield `__model_source:${FRONT} (hedge)__`;
        seen = 0;
        const chunks = Array.isArray(s) ? s : s.thenFail;
        for (const c of chunks) { seen++; yield c; }
        if (!Array.isArray(s)) { events.push(`RAW THROWS after raw chunk ${seen}`); throw new Error('socket hang up'); }
    };
    let cuesSent = false, fallbackModel;
    const onCuesOnce = (c) => { if (cuesSent) { events.push(`(a second report dropped by the once-guard: ${show(c)})`); return; } cuesSent = true; events.push(`REPORT ${show(c)} during raw chunk ${seen}`); };
    const filtered = (raw) => stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(cueImpl(stripModelSentinel(raw), onCuesOnce, opts))), () => {}));
    let answering = 'gemini-3.1-flash-lite';
    const filteredAndNamed = (raw) => nameStallSwitch(raw, filtered, (m) => { answering = m; });
    async function* withVerbalFallback(primary) {
        let started = false;
        try {
            for await (const chunk of primary) { if (chunk && !started) { started = true; events.push(`STARTED (first non-empty chunk out of the chain: ${show(chunk.slice(0, 40))}) during raw chunk ${seen}`); } yield chunk; }
        } catch (err) {
            if (started) { events.push('failure AFTER started: re-thrown'); throw err; }
            fallbackModel = answering === FRONT ? BACK : FRONT;
            events.push(`failure BEFORE started: redirect to ${fallbackModel}`);
            yield `__model_source:${fallbackModel} (fallback)__`;
            yield* filteredAndNamed(hedgeRaw());
        }
    }
    const out = ['__model_source:gemini-3.1-flash-lite__'];
    try {
        const chain = tapFirstToken(cutAtWordBudget(withVerbalFallback(filteredAndNamed(hedgeRaw())), { ...SPOKEN_WORD_GUARD, onDone: (r) => events.push(`BUDGET words=${r.words} cut=${r.cut ? 'yes' : 'no'}`) }), () => events.push(`FIRST TOKEN during raw chunk ${seen}`));
        for await (const c of chain) out.push(c);
    } catch (error) {
        const msg = error?.message ?? String(error);
        out.push(fallbackModel ? `[No answer — both the primary model and the ${fallbackModel} fallback failed: ${msg.slice(0, 160)}]` : `[No answer — the answer model failed: ${msg.slice(0, 160)}]`);
    }
    const spoken = out.join('').replace(/__model_source:[^_]*__/g, '').trim();
    return { asked, events, spoken, pieces: out.filter((c) => !/^__model_source:[^_]*__$/.test(c)) };
}

const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight cuts that to about seven and a half.';
const CHUNKED = ['__CU', 'ES__\n1| thirty giga', 'bytes in float32\n2| int8, then shard\nTen million vectors take about ', 'thirty gigabytes. Quantizing to int eight cuts that ', 'to about seven and a half.'];
const DIES_AFTER_BLOCK = { thenFail: ['__CUES__\n1| first stream cue a\n2| first stream cue b\nTime: O(n)\n'] };
const DIES_AFTER_FIRST_WORDS = { thenFail: ['__CUES__\n1| first stream cue a\n', 'Ten million vectors '] };
const CASES = [
    ['A  front wins, chunked block', [CHUNKED]],
    ['A0 no block', [[PROSE]]],
    ['C  both legs 503, the redirect carries the block', ['error', 'error', CHUNKED]],
    ['D  closed its block, died with no prose escaping', [DIES_AFTER_BLOCK, CHUNKED]],
    ['D2 (the plan\'s new case) dies after its first prose chunk was shown', [DIES_AFTER_FIRST_WORDS, CHUNKED]],
    ['D3 (not in the plan) dies 2 characters into its prose', [{ thenFail: ['__CUES__\n1| first stream cue a\n', 'Te'] }, CHUNKED]],
    ['D4 (not in the plan) dies inside a preamble the line filter is still deciding', [{ thenFail: ['__CUES__\n1| first stream cue a\n', "I'm going to walk you "] }, CHUNKED]],
    ['D5 (not in the plan) dies inside the block, before any prose character', [{ thenFail: ['__CUES__\n1| first stream cue a\n', '2| second c'] }, CHUNKED]],
];

(async () => {
    for (const [name, plan] of CASES) {
        console.log(`\n=== ${name} ===`);
        for (const [label, impl] of [['today', built.stripCueBlock], ['after', stripCueBlockNew]]) {
            const r = await generate(impl, plan.slice());
            console.log(`  [${label}] asked ${show(r.asked)}`);
            for (const e of r.events) console.log(`      ${e}`);
            console.log(`      pieces ${r.pieces.length}: ${show(r.pieces.map((p) => p.length > 46 ? p.slice(0, 43) + '...' : p))}`);
            console.log(`      spoken === PROSE: ${r.spoken === PROSE};  spoken: ${show(r.spoken.length > 110 ? r.spoken.slice(0, 50) + ' ... ' + r.spoken.slice(-55) : r.spoken)}`);
        }
    }
    // D2's assertions, as the plan writes them, against both builds.
    console.log('\n=== D2, the plan\'s assertions one by one ===');
    for (const [label, impl] of [['today', built.stripCueBlock], ['after', stripCueBlockNew]]) {
        const cues = [];
        const r = await generate(impl, [DIES_AFTER_FIRST_WORDS, CHUNKED]);
        const reports = r.events.filter((e) => e.startsWith('REPORT'));
        console.log(`  [${label}] asked()==[front]: ${show(r.asked) === show([FRONT])};  reports: ${reports.length} -> ${reports.join(' | ')};  contains "Ten million": ${r.spoken.includes('Ten million')};  contains the error text: ${r.spoken.includes('[No answer — the answer model failed: socket hang up]')};  not "thirty gigabytes": ${!r.spoken.includes('thirty gigabytes')}`);
    }
})();
