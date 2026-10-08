// THROWAWAY: re-score the stored Live and Deepgram outputs with a FORM-INSENSITIVE
// entity check.
//
// The first check used /\b800\b/ and friends. Deepgram writes "eight hundred
// milliseconds" and "p 99"; the facts were all present and the check called them lost.
// It was measuring surface form, not fidelity, so its Deepgram-vs-Live comparison
// meant nothing. Normalise first: number words to digits, spacing out of acronyms.
//
// CALIBRATION: the normaliser is run against strings whose answer is known — including
// NEGATIVE cases, where a genuinely wrong value must still read as lost.
import fs from 'node:fs';
import path from 'node:path';

const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));

const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** "eight hundred" -> "800", "ninety nine" -> "99", "4,000" -> "4000", "s l a" -> "sla". */
export function normalise(s) {
    let t = ' ' + s.toLowerCase() + ' ';
    t = t.replace(/(\d),(\d)/g, '$1$2');                       // 4,000 -> 4000
    // number words, longest first: "<unit> hundred" then bare units
    t = t.replace(new RegExp(`\\b(${Object.keys(UNITS).join('|')})\\s+hundred\\b`, 'g'), (_m, w) => String(UNITS[w] * 100));
    t = t.replace(/\bhundred\b/g, '100');
    t = t.replace(new RegExp(`\\b(${Object.keys(UNITS).join('|')})\\s+(${Object.keys(UNITS).join('|')})\\b`, 'g'),
        (m, a, b) => (UNITS[a] >= 20 && UNITS[b] < 10 ? String(UNITS[a] + UNITS[b]) : m));
    t = t.replace(new RegExp(`\\b(${Object.keys(UNITS).join('|')})\\b`, 'g'), (_m, w) => String(UNITS[w]));
    t = t.replace(/\bap\s*(\d)/g, 'p $1');                      // Deepgram's "AP99" / "AP 99"
    t = t.replace(/\bp\s+(\d)/g, 'p$1');                        // "p 99" -> "p99"
    t = t.replace(/\bs\s*l\s*a+\b/g, 'sla');                    // "S L A", "SLAA"
    t = t.replace(/(\d)\s*(ms|milliseconds?)\b/g, '$1');        // strip the unit
    return t.replace(/\s+/g, ' ');
}

/** Facts that must survive, matched against the NORMALISED text. */
const FACTS = {
    'p99': (t) => /\bp99\b/.test(t),
    '800': (t) => /\b800\b/.test(t),
    '500': (t) => /\b500\b/.test(t),
    '4000 rps': (t) => /\b4000\b/.test(t),
    'SLA (not SLO)': (t) => /\bsla\b/.test(t) && !/\bslo\b/.test(t),
};

// ── CALIBRATION ────────────────────────────────────────────────────────────
const CASES = [
    ['p 99 latency of eight hundred milliseconds against an SLA of 500 at 4,000 rps', 0, 'words + spaced p99 + SLAA form'],
    ['AP99 of eight hundred ms against an SLA of five hundred, at about 4,000 requests', 0, 'Deepgram merged form'],
    ['P99 of 800 milliseconds against an SLO of 500 at 4,000 requests', 1, 'SLO substitution must STILL read as lost'],
    ['P99 latency against an SLA at 4,000 requests per second', 2, 'both numbers genuinely absent'],
    ['how would you bring it back under the SLA?', 4, 'only the acronym survives'],
];
let bad = 0;
console.log('CALIBRATION of the normaliser (expected losses vs measured)');
for (const [text, want, why] of CASES) {
    const t = normalise(text);
    const lost = Object.entries(FACTS).filter(([, f]) => !f(t)).map(([n]) => n);
    const ok = lost.length === want;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} want ${want} lost, got ${lost.length} [${lost.join(', ')}]   ${why}`);
}
if (bad) { console.log(`\n${bad} calibration case(s) failed — the normaliser is not trustworthy, stopping.`); process.exit(1); }

// ── RE-SCORE ───────────────────────────────────────────────────────────────
const live = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'bench-shapes-out.json'), 'utf8'));
const dg = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'bench-deepgram-out.json'), 'utf8'));
const lostIn = (text) => Object.entries(FACTS).filter(([, f]) => !f(normalise(text || ''))).map(([n]) => n);

console.log('\nshape         LIVE lost                        DEEPGRAM lost');
let lv = 0, dv = 0;
for (const l of live) {
    const d = dg.find((x) => x.id === l.id);
    const a = lostIn(l.heard), b = lostIn(d?.text);
    lv += a.length; dv += b.length;
    console.log(`${l.id.padEnd(13)} ${(a.length ? a.join(', ') : 'none').padEnd(32)} ${b.length ? b.join(', ') : 'none'}`);
}
console.log(`\ntotal fact losses:  Live ${lv}   Deepgram ${dv}   (over ${live.length} shapes x ${Object.keys(FACTS).length} facts)`);
console.log(dv < lv
    ? '=> the TRANSCRIPT is the faithful record. Once a Live claim is corroborated, building the\n   answer from the transcript repairs fact fidelity for ANY question.'
    : dv === lv ? '=> the two are equally faithful — entity repair is not the lever.'
        : '=> Live is the more faithful record; the transcript is not the repair.');

// Do the two sources ever fail on the SAME fact of the SAME shape? If not, the pair
// carries every fact and the fix is to give the answer BOTH, not to pick one.
let both = 0, unionLost = [];
for (const l of live) {
    const d = dg.find((x) => x.id === l.id);
    const a = new Set(lostIn(l.heard)), b = new Set(lostIn(d?.text));
    for (const f of a) if (b.has(f)) { both++; unionLost.push(`${l.id}:${f}`); }
}
console.log(`\nfacts lost by BOTH sources on the same shape: ${both}${both ? ' (' + unionLost.join(', ') + ')' : ''}`);
console.log(both === 0
    ? '=> the two sources are COMPLEMENTARY: every fact survives in at least one of them.\n   The app already computes both (reconcileLiveQuestion returns Live text AND the\n   transcript anchor) and then discards one. Giving the answer both recovers 100%.'
    : '=> some facts are lost by both; the union is not a complete repair.');
