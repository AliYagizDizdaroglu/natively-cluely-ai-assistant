// Task 3 review (Opus), throwaway. Independent check of the header's claim "no character [the ASCII-letter guard]
// admits changes the token count" (the M-a premise), for the real guard and for the \p{L}-only narrowing, over every
// code point in 8 contexts: is rawTok(s) (lower-cased) === tok(s) whenever the guard admits s?
//   node r9-align.mjs
const stripThousands = (s) => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s) => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
const guards = { 'real [\\p{L}\\p{M}]': /(?![\x00-\x7F])[\p{L}\p{M}]/u, '\\p{L} only': /(?![\x00-\x7F])\p{L}/u, 'no guard': null };
const ctx = (c) => [c, `a${c}b`, `A${c}B`, `${c}a`, `a${c}`, `x ${c} y`, `1${c}2`, `'${c}'`];
for (const [name, g] of Object.entries(guards)) {
    let admitted = 0; const bad = new Set();
    for (let cp = 0; cp <= 0x10ffff; cp++) {
        if (cp >= 0xd800 && cp <= 0xdfff) continue;
        const c = String.fromCodePoint(cp);
        let adm = false;
        for (const s of ctx(c)) {
            if (g && g.test(s)) continue;
            adm = true;
            const a = tok(s), b = rawTok(s).map((w) => w.toLowerCase());
            if (a.length !== b.length || a.some((w, i) => w !== b[i])) bad.add(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
        }
        if (adm) admitted++;
    }
    console.log(`${name}: ${admitted} code points admitted (surrogates skipped); misaligned: ${bad.size}${bad.size ? ` (${[...bad].slice(0, 10).join(', ')})` : ''}`);
}
