// Throwaway (Task 3): independent re-check of the controller's ruling premise — "no character the NON_ASCII_LETTER guard
// admits makes tok() and rawTok() disagree" — over EVERY code point 0..0x10FFFF, in several contexts, comparing token for token
// (a stronger property than "same count"). Calibrated: the identical scan with NO guard must find offenders (U+0130 and U+212A
// at least), otherwise the scan could not tell the difference. tok/rawTok/NON_ASCII_LETTER are copied from the module.
//   node t3-align-claim.mjs
const stripThousands = (s) => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s) => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
const NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u;
const CONTEXTS = [(c) => c, (c) => `a${c}b`, (c) => `A${c}B`, (c) => `ab ${c}`, (c) => `${c} ab`, (c) => `1${c}1`, (c) => `x'${c}'y`, (c) => `Ab${c}Cd Ef${c}`];
const aligned = (s) => JSON.stringify(tok(s)) === JSON.stringify(rawTok(s).map((t) => t.toLowerCase()));

function scan(guard) {
    let total = 0, refused = 0, admitted = 0, admittedScalar = 0;
    const offenders = [];
    for (let cp = 0; cp <= 0x10FFFF; cp++) {
        total++;
        const c = String.fromCodePoint(cp);
        if (guard && guard.test(c)) { refused++; continue; }
        admitted++;
        if (!(cp >= 0xD800 && cp <= 0xDFFF)) admittedScalar++;
        if (!CONTEXTS.every((f) => aligned(f(c)))) offenders.push(cp);
    }
    return { total, refused, admitted, admittedScalar, offenders };
}
const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

console.log(`node ${process.version}, Unicode ${process.versions.unicode}, ICU ${process.versions.icu}`);
const real = scan(NON_ASCII_LETTER);
console.log(`WITH the NON_ASCII_LETTER guard: ${real.total} code points, ${real.refused} refused, ${real.admitted} admitted (${real.admittedScalar} excluding lone surrogates) — misaligned among the admitted: ${real.offenders.length}${real.offenders.length ? ' -> ' + real.offenders.slice(0, 20).map(hex).join(' ') : ''}`);
const none = scan(null);
console.log(`CALIBRATION, NO guard at all: ${none.admitted} admitted, misaligned: ${none.offenders.length} -> ${none.offenders.slice(0, 20).map((c) => `${hex(c)} ${JSON.stringify(String.fromCodePoint(c))}`).join(', ')}`);
const must = [0x130, 0x212A];
const calibrated = must.every((cp) => none.offenders.includes(cp));
console.log(`calibration finds U+0130 (İ) and U+212A (Kelvin sign): ${calibrated ? 'yes' : 'NO'}; each offender is refused by the real guard: ${none.offenders.every((cp) => NON_ASCII_LETTER.test(String.fromCodePoint(cp))) ? 'yes' : 'NO'}`);
process.exit(real.offenders.length === 0 && calibrated ? 0 : 1);
