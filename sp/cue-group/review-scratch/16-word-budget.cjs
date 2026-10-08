// Item 7, one more stage behind the parser: cutAtWordBudget (the 200-word guard and the `[Answer] budget: words=`
// line). Today a one-paragraph cue answer reaches it as ONE piece; after the early close, in pieces. Is its output
// text and its onDone result (words, cut, allowance) the same for the same prose, whatever the pieces?
// Synthetic prose only: sentences of random length, some answers well past 200 words, some with no terminator,
// decimals ("3.5"), abbreviations ("e.g."), quotes after a terminator. The built function, the app's guard.
const { built } = require('./model.cjs');
const { cutAtWordBudget, SPOKEN_WORD_GUARD } = built;

let seed = 11;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const WORDS = ['shard', 'the', 'index', 'by', 'tenant', 'about', '3.5', 'percent', 'e.g.', 'a', 'queue', 'int8', 'vectors', 'and', 'then', 'replicas', '"quoted"', 'p99', 'ten', 'million'];
const ENDS = ['. ', '. ', '. ', '! ', '? ', '." ', '.) ', '.\n', '.\n\n', ' '];

function makeText() {
    const sentences = 1 + Math.floor(rnd() * 22);
    let t = '';
    for (let s = 0; s < sentences; s++) {
        const n = 1 + Math.floor(rnd() * (rnd() < 0.1 ? 120 : 22));
        const ws = [];
        for (let i = 0; i < n; i++) ws.push(pick(WORDS));
        t += ws.join(' ') + pick(ENDS);
    }
    return rnd() < 0.5 ? t.trimEnd() : t;
}
async function run(chunks) {
    async function* gen() { for (const c of chunks) yield c; }
    let out = '', done = null, calls = 0;
    for await (const p of cutAtWordBudget(gen(), { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; calls++; } })) out += p;
    return { out, done, calls };
}
const same = (a, b) => a.out === b.out && JSON.stringify(a.done) === JSON.stringify(b.done) && a.calls === b.calls;

(async () => {
    const st = { texts: 0, over200: 0, cutWhole: 0, charsDiff: 0, cutDiff: 0, runs: 0 };
    const ex = [];
    for (let t = 0; t < 6000; t++) {
        const text = makeText();
        st.texts++;
        const whole = await run([text]);
        if ((text.match(/\S+/g) || []).length > 200) st.over200++;
        if (whole.done.cut) st.cutWhole++;
        const chars = await run(text.split(''));
        st.runs++;
        if (!same(whole, chars)) { st.charsDiff++; if (ex.length < 4) ex.push({ feed: 'chars', words: (text.match(/\S+/g) || []).length, whole: whole.done, other: chars.done, wholeLen: whole.out.length, otherLen: chars.out.length }); }
        for (let c = 0; c < 3; c++) {
            const parts = []; let i = 0;
            while (i < text.length) { const len = 1 + Math.floor(rnd() * 40); parts.push(text.slice(i, i + len)); i += len; }
            const r = await run(parts);
            st.runs++;
            if (!same(whole, r)) { st.cutDiff++; if (ex.length < 4) ex.push({ feed: 'cut', words: (text.match(/\S+/g) || []).length, whole: whole.done, other: r.done, wholeLen: whole.out.length, otherLen: r.out.length }); }
        }
    }
    console.log(`texts ${st.texts} (${st.over200} over 200 words; ${st.cutWhole} cut by the guard when fed whole)`);
    console.log(`fed character by character vs whole: output or onDone result differs in ${st.charsDiff}`);
    console.log(`fed in random cuts of 1..40 characters vs whole (${st.texts * 3} runs): differs in ${st.cutDiff}`);
    for (const e of ex) console.log('   ' + JSON.stringify(e));
})();
