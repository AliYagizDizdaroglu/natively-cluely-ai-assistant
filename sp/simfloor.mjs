import fs from 'fs';
const LOG = process.argv[2];
const raw = fs.readFileSync(LOG, 'utf8');
const blocks = raw.split('=== generateStream invoked ===').slice(1);
const answers = [];
for (const b of blocks) {
    if (!/isCoding: false/.test(b)) continue;
    const chunks = [];
    for (const line of b.split(/\r?\n/)) {
        const m = line.match(/^\[[^\]]+\]   chunk #\d+: (.*)$/);
        if (!m) continue;
        let s = m[1];
        const marker = s.lastIndexOf(' (lineBuffer pre: ');
        if (marker > 0) s = s.slice(0, marker);
        try { chunks.push(JSON.parse(s)); } catch { /* skip unparseable */ }
    }
    if (chunks.length) answers.push(chunks.join(''));
}
const countWords = (s) => (s.match(/\S+/g) ?? []).length;
const SENTENCE_END = /[.!?]["'”’)\]]*(?=\s)/;
function sentences(text) {
    const out = [];
    let t = text;
    for (;;) {
        const m = SENTENCE_END.exec(t);
        if (!m) { if (t.trim()) out.push(t); break; }
        const end = m.index + m[0].length;
        out.push(t.slice(0, end));
        t = t.slice(end);
    }
    return out;
}
function simulate(text, limit, floor) {
    let emitted = 0, mode = 'stream', cut = false;
    for (const s of sentences(text)) {
        const n = countWords(s);
        if (n === 0) continue;
        if (mode === 'stream') {
            emitted += n;
            if (emitted >= 2 * limit) { cut = true; break; }
            if (emitted >= floor) mode = 'buffer';
        } else {
            if (emitted + n > limit) { cut = true; break; }
            emitted += n;
        }
    }
    return { words: emitted, cut };
}
const stats = (arr) => {
    const a = [...arr].sort((x, y) => x - y);
    return { n: a.length, p50: a[Math.floor(a.length * .5)], p90: a[Math.floor(a.length * .9)], max: a[a.length - 1] };
};
// strip markdown-ish lines the way filterVerbalLines roughly does (bullets, Time:/Space:, headings)
const clean = (t) => t.split('\n').filter((l) => !/^\s*([-*•]|#{1,6}\s|Time:|Space:|Why:|\d+\.\s)/.test(l)).join('\n');
for (const floor of [40, 80]) {
    const res = answers.map((t) => simulate(clean(t), 80, floor));
    const w = res.map((r) => r.words);
    const s = stats(w);
    console.log(`floor ${floor}: n=${s.n} p50=${s.p50} p90=${s.p90} max=${s.max} cut=${res.filter((r) => r.cut).length} cutUnder80=${res.filter((r) => r.cut && r.words < 80).length} over80=${w.filter((x) => x > 80).length} over100=${w.filter((x) => x > 100).length} over130=${w.filter((x) => x > 130).length}`);
}
const rawW = answers.map((t) => countWords(clean(t)));
const rs = stats(rawW);
console.log(`raw available in log (truncated at the floor-40 cut): n=${rs.n} p50=${rs.p50} p90=${rs.p90} max=${rs.max} over130=${rawW.filter((x) => x > 130).length}`);
const r80 = answers.map((t) => simulate(clean(t), 80, 80));
console.log('floor80 results under 80 words (raw ran out — lower bounds):', r80.filter((r) => r.words < 80).length, 'of', r80.length);
console.log('floor80 word list:', r80.map((r) => r.words).sort((a, b) => a - b).join(' '));
