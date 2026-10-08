// Final review (throwaway): probes on the reference rule-v4.mjs (event-for-event equal to the shipped module, check-v4 --module):
// (1) what a restored token with punctuation inside it looks like; (2) the header's alignment claim on EVERY Unicode code point.
import { createRepair, tok, NON_ASCII_LETTER } from '../../rule-v4.mjs';
const play = (events) => { const r = createRepair(); let last; for (const [t, f, at] of events) last = r.onTranscript(t, f, at); return last; };
const probes = [
    ['decimal', 'we measured a latency of 4.1 seconds at peak', 'We measured a latency of', 'seconds at peak.'],
    ['percent', 'we cut the error rate by 50% last quarter', 'We cut the error rate by', 'last quarter.'],
    ['hyphen', 'explain deterministic tie-breaking for equal scores', 'Explain deterministic', 'for equal scores.'],
    ['c++', 'have you shipped C++ services in production', 'Have you shipped', 'services in production?'],
    ['thousands', 'it serves 10,000 requests per second today', 'It serves', 'requests per second today.'],
];
console.log('(1) restored tokens with punctuation inside (rule-v4 == the module):');
for (const [name, I, F1, F2] of probes) {
    const r = play([[I, false, 0], [F1, true, 100], [F2, true, 2000]]);
    console.log(`  ${name.padEnd(9)} interim "${I}" -> restored ${JSON.stringify(r.restored)} -> "${r.text}"`);
}
// (2) Header claim (deepgramBoundaryRepair.ts:28-30): with no non-ASCII letter/mark, rawTok() stays index-aligned with tok().
// Per code point c (not a letter/mark outside ASCII), in three contexts, compare tok(s) with rawTok(s) lowercased.
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];
let admitted = 0, bad = [];
for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const c = String.fromCodePoint(cp);
    if (NON_ASCII_LETTER.test(c)) continue;
    admitted++;
    for (const s of [`ab${c}cd`, `${c}`, `x ${c} y`, `1${c}2`]) {
        const a = tok(s), b = rawTok(s).map((w) => w.toLowerCase());
        if (a.length !== b.length || a.some((w, i) => w !== b[i])) { bad.push(`U+${cp.toString(16).toUpperCase().padStart(4, '0')} in ${JSON.stringify(s)}: tok ${JSON.stringify(a)} raw ${JSON.stringify(b)}`); break; }
    }
}
console.log(`(2) code points admitted by the non-ASCII guard: ${admitted}; misaligned tok/rawTok: ${bad.length}`);
for (const b of bad.slice(0, 10)) console.log('    ' + b);
// calibration of (2): a letter the guard REFUSES does misalign (so the comparison can see a misalignment at all)
const s = 'Peki İzmir'; console.log(`    calibration: "İzmir" tok ${JSON.stringify(tok(s))} raw ${JSON.stringify(rawTok(s).map((w) => w.toLowerCase()))} (guard refuses it: ${NON_ASCII_LETTER.test(s)})`);
