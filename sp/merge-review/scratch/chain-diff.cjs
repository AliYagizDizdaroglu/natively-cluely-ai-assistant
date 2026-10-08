// Throwaway, read-only: MAIN's built filter chain (0ef42a0 build) against the cue build's chain
// (whole-turn dist, = 8a13abb code) on synthetic replies that carry NO cue block and whose
// offers (if any) FOLLOW spoken text — the replies MAIN's users get today. Expected: identical
// shown text and identical offers at every chunking. Also checks the negotiation-card JSON and
// the intro shortcut shapes. No network, no writes. Prints counts and the first mismatches.
const path = require('path');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const O = require(path.join(MAIN, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const N = require(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));

let seed = Number(process.argv[2] ?? 20261001) >>> 0;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const PIECES = [
    'Ten million vectors take about thirty gigabytes.', 'I would shard by tenant.', 'The p99 is 40 ms.',
    'Use __init__ for setup.', 'snake_case names', '$5 million', '$O(\\log n)$', '**bold** move', '*incremental* effect',
    '`ModelLatency`', '1. First point', '- a bullet', 'Time: O(n)', "I'll explain the ring as a hash space.",
    '10 million | shards', '2| looks like an offer', '3 things matter.', '2024 was the year.', 'x', '',
    '```python\nprint(1)\n```', 'Are you asking about latency?', 'So, in short, yes.', '__', '_', '__MOR', '__CU',
];
function reply() {
    const n = 1 + Math.floor(rnd() * 6);
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(pick(PIECES));
    let text = parts.join(pick([' ', '\n', '\n\n', ' ']));
    if (!text.trim()) text = 'Answer.';
    // never a cue block at the head, never a leading offers block: prose first
    text = (rnd() < 0.3 ? pick(['\n', '  ', '\r\n']) : '') + 'Answer: ' + text;
    if (rnd() < 0.4) text += `${pick(['\n', '\n\n', ' '])}__MORE__\n1| ${pick(['cold start', 'GPU pools'])}\n${rnd() < 0.5 ? '2| sharding\n' : ''}`;
    return text;
}
const cut = (t, size) => { const o = []; for (let i = 0; i < t.length; i += size) o.push(t.slice(i, i + size)); return o; };
async function* src(chunks) { for (const c of chunks) yield c; }

async function oldChain(chunks) {
    let offers = null, out = '';
    for await (const p of O.stripSpokenNotation(O.stripSuggestionBlock(O.filterVerbalLines(O.filterCodeFences(src(chunks))), (o) => { offers = o; }))) out += p;
    return { out, offers };
}
async function newChain(chunks) {
    let offers = null, cues = null, out = '', reports = 0;
    for await (const p of N.stripSpokenNotation(N.stripSuggestionBlock(N.filterVerbalLines(N.filterCodeFences(N.stripCueBlock(src(chunks), (c) => { cues = c; reports++; }))), (o) => { offers = o; }))) out += p;
    return { out, offers, cues, reports };
}

(async () => {
    const origWarn = console.warn; console.warn = () => {};   // filterCodeFences' fence line
    const CASES = Number(process.argv[3] ?? 3000);
    let n = 0, bad = 0, cueReportsBad = 0; const firsts = [];
    for (let i = 0; i < CASES; i++) {
        const text = reply();
        for (const size of [1, 3, 7, 40]) {
            n++;
            const a = await oldChain(cut(text, size));
            const b = await newChain(cut(text, size));
            const same = a.out === b.out && JSON.stringify(a.offers) === JSON.stringify(b.offers);
            if (!same) { bad++; if (firsts.length < 5) firsts.push({ size, text: JSON.stringify(text).slice(0, 160), old: JSON.stringify(a.out).slice(0, 120), neu: JSON.stringify(b.out).slice(0, 120), oo: JSON.stringify(a.offers), no: JSON.stringify(b.offers) }); }
            if (b.reports !== 1 || JSON.stringify(b.cues) !== '[]') cueReportsBad++;
        }
    }
    // Knowledge short-circuit shapes: the negotiation card (one JSON object) and an intro paragraph.
    const card = JSON.stringify({ __negotiationCoaching: { tacticalNote: 'Anchor at $185k.\nThen pause.', exactScript: 'I was thinking $185,000.' } });
    const intro = "I'm a backend engineer with six years in payments.\nMost recently I led the ledger rewrite.";
    const shapes = [];
    for (const [name, t] of [['card', card], ['intro', intro]]) for (const size of [1, 5, 1000]) {
        const a = await oldChain(cut(t, size)), b = await newChain(cut(t, size));
        shapes.push(`${name}@${size}: ${a.out === b.out && JSON.stringify(a.offers) === JSON.stringify(b.offers) ? 'same' : 'DIFF'} cues=${JSON.stringify(b.cues)} reports=${b.reports}`);
    }
    console.warn = origWarn;
    console.log(`no-cue, answer-first replies: ${n} streams, ${bad} differ from MAIN's chain; cue reports != exactly one [] : ${cueReportsBad}`);
    for (const f of firsts) console.log('  DIFF', JSON.stringify(f));
    console.log(shapes.join('\n'));
})();
