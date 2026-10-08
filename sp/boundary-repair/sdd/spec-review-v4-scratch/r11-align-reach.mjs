// Can v2's alignment guard (rawTok(I).length !== tok(I).length) still fire once the non-ASCII-letter guard has
// passed the interim? Brute force over every code point: for each character the NON_ASCII_LETTER regex lets
// through, embed it in ASCII words and compare the two tokenisers' counts (and token-for-token alignment).
// Calibration: 'İ' (U+0130), which the regex refuses, must show the misalignment when tested unguarded.
import * as v4 from '../../rule-v4.mjs';
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];
const misaligned = (s) => { const a = v4.tok(s), b = rawTok(s); return a.length !== b.length || a.some((w, i) => w !== b[i].toLowerCase()); };
const probeStrings = (c) => [`ab${c}cd ef`, `${c}ab cd`, `ab ${c} cd`, `AB${c}CD`, `a${c}${c}b`];
console.log(`calibration U+0130 unguarded: misaligned=${probeStrings('İ').some(misaligned)}; refused by the guard: ${v4.NON_ASCII_LETTER.test('İ')}`);
let passed = 0, hits = [];
for (let cp = 0x80; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const c = String.fromCodePoint(cp);
    if (v4.NON_ASCII_LETTER.test(c)) continue;          // refused before the alignment guard is reached
    passed++;
    if (probeStrings(c).some(misaligned)) hits.push(`U+${cp.toString(16).toUpperCase()}`);
}
console.log(`code points the guard lets through: ${passed}; of those, ones that misalign tok vs rawTok: ${hits.length}${hits.length ? ` (${hits.slice(0, 20).join(', ')})` : ''}`);
