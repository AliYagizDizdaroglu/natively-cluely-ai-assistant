// Part B item 1: is the PLAN'S rule right for every input and every chunking? My copy of the plan's code (N, W) against
// the built stripSuggestionBlock (O) and the built extractSuggestions (WO). Properties, as the brief lists them:
//   (a) answer first (non-blank text before the first sentinel, or no sentinel): N.out === O.out and the offers are
//       identical, for every chunking; and the whole-string functions agree (W === WO)
//   (b) the sentinel never reaches the output
//   (c) offers only (the whole-string answer is blank): nothing but whitespace is shown
//   (d) the callback fires exactly once
//   (e) streaming equals the whole-string function for every chunking: N.out.trim() === W.answer.trim(), offers equal
// Two generators: exhaustive over token sequences (so the sentinel and its prefixes occur), and random with richer tokens.
const M = require('./offers-model.cjs');
const { built } = M;
const ch = (n) => String.fromCharCode(n);
const LS = ch(0x2028);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (x) => JSON.stringify(x);

async function run(strip, chunks, opts) {
    let sugg = null, calls = 0, out = '';
    async function* source() { for (const c of chunks) yield c; }
    for await (const p of strip(source(), (s) => { sugg = s; calls++; }, opts)) out += p;
    return { out, sugg, calls };
}
const quiet = async (fn) => { const o = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = o; } };
const cutBy = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };

const st = { texts: 0, runs: 0, leadTexts: 0, a: 0, aWhole: 0, b: 0, c: 0, d: 0, e: 0, eOffers: 0, chunkVar: 0 };
const ex = { a: [], aWhole: [], b: [], c: [], d: [], e: [], eOffers: [], chunkVar: [] };
const note = (k, o) => { st[k]++; if (ex[k].length < 5) ex[k].push(o); };

async function check(text, cuts) {
    st.texts++;
    const i = text.indexOf('__MORE__');
    const answerFirst = i === -1 || text.slice(0, i).trim() !== '';
    if (!answerFirst) st.leadTexts++;
    const W = M.extractSuggestionsNew(text), WO = built.extractSuggestions(text);
    if (answerFirst && !eq(W, WO)) note('aWhole', { text, W, WO });
    let firstN = null;
    for (const chunks of cuts) {
        st.runs++;
        const N = await run(M.stripSuggestionBlockNew, chunks);
        const O = await quiet(() => run(built.stripSuggestionBlock, chunks));
        if (N.calls !== 1) note('d', { chunks, calls: N.calls });
        if (answerFirst && (N.out !== O.out || !eq(N.sugg, O.sugg))) note('a', { chunks, N, O });
        if (N.out.includes('__MORE__')) note('b', { chunks, out: N.out });
        if (W.answer.trim() === '' && N.out.trim() !== '') note('c', { chunks, out: N.out, W });
        if (N.out.trim() !== W.answer.trim()) note('e', { chunks, out: N.out, W });
        if (!eq(N.sugg, W.suggestions)) note('eOffers', { chunks, sugg: N.sugg, W });
        if (firstN && (firstN.out !== N.out || !eq(firstN.sugg, N.sugg))) note('chunkVar', { text, first: firstN, other: N, chunks });
        firstN = firstN ?? N;
    }
}

(async () => {
    // ---------- exhaustive over token sequences ----------
    const TOK = ['__MORE__', '\n', '1| a', '2| b', 'x', ' ', '_', '1', '|', '\r'];
    function* seqs(len, p = []) { if (p.length === len) { yield p; return; } for (const t of TOK) yield* seqs(len, p.concat([t])); }
    for (let len = 1; len <= 5; len++) for (const s of seqs(len)) {
        const text = s.join('');
        await check(text, [[text], text.split(''), cutBy(text, 2), cutBy(text, 3), cutBy(text, 5), s]);
    }
    console.log(`--- exhaustive: every sequence of 1..5 tokens from ${show(TOK)}; 6 chunkings each (whole, chars, 2, 3, 5, by token) ---`);
    console.log(`texts ${st.texts} (${st.leadTexts} with a leading block), runs ${st.runs}`);
    const report = () => {
        console.log(`(a) answer first: streaming differs from the BUILT filter ${st.a}; whole-string differs from the BUILT function ${st.aWhole}`);
        console.log(`(b) the sentinel in the output ${st.b};  (c) offers only but something shown ${st.c};  (d) callback not exactly once ${st.d}`);
        console.log(`(e) streaming vs whole-string: answer differs ${st.e}, offers differ ${st.eOffers};  output differs between chunkings of one text ${st.chunkVar}`);
        for (const k of Object.keys(ex)) for (const e of ex[k]) console.log(`   [${k}] ${show(e).slice(0, 400)}`);
    };
    report();

    // ---------- random, richer tokens ----------
    for (const k of Object.keys(st)) st[k] = 0;
    for (const k of Object.keys(ex)) ex[k].length = 0;
    let seed = 20260930;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const RT = ['__MORE__', '__MORE__', '__MORE__\n', '\n__MORE__\n', '__MO', 'RE__', '__', '_', '\n', '\n', '\r\n', ' ', '  ', '\t', '1| one offer', '2| two offers', '3|', '4', '10 million vectors fit. ', 'Ten million vectors. ', 'Answer first. ', '1. First', '- a bullet', '"quoted"', '1| "', '2|\rc d', '5 |  spaced', 'x', '__CUES__', '__init__', LS, '|', '12'];
    for (let t = 0; t < 60000; t++) {
        let text = rnd() < 0.6 ? pick(['__MORE__\n', '\n__MORE__\n', ' __MORE__\n1| a b\n', '__MORE__', '__MORE__ 1| a b\n']) : '';
        const k = 1 + Math.floor(rnd() * 9);
        for (let i = 0; i < k; i++) text += pick(RT);
        const cuts = [[text], text.split('')];
        for (let c = 0; c < 4; c++) { const parts = []; let i = 0; while (i < text.length) { const len = 1 + Math.floor(rnd() * 9); parts.push(text.slice(i, i + len)); i += len; } cuts.push(parts); }
        await check(text, cuts);
    }
    console.log(`\n--- random: 60000 texts from ${RT.length} tokens, 6 chunkings each (whole, chars, 4 random) ---`);
    console.log(`texts ${st.texts} (${st.leadTexts} with a leading block), runs ${st.runs}`);
    report();
})();
