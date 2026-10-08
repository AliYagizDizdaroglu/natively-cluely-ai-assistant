// Throwaway (task 1): is tok() index-aligned with rawTok() on every character? (The module reads Traw[0..k) using indexes from tok().)
// Scans every BMP code point c: builds "w c w" and compares the token counts of the two tokenisers (same regexes as the module and the reference).
import path from 'node:path';
import { createRequire } from 'node:module';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const strip = (s) => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s) => strip(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => strip(s).match(/[A-Za-z0-9']+/g) ?? [];
const bad = [];
for (let cp = 0; cp <= 0xffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const s = `ab ${String.fromCharCode(cp)}xy cd`;
    if (tok(s).length !== rawTok(s).length) bad.push(`U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${JSON.stringify(String.fromCharCode(cp))} tok=${JSON.stringify(tok(s))} rawTok=${JSON.stringify(rawTok(s))}`);
}
console.log(`BMP code points where tok and rawTok disagree on the token count: ${bad.length}`);
for (const b of bad) console.log('  ' + b);

// the consequence, end to end, through the built module: an interim spelling "İstanbul" (U+0130)
const { createBoundaryRepair } = createRequire(import.meta.url)(path.join(SP, 't1/built/deepgramBoundaryRepair.cjs'));
const r = createBoundaryRepair();
r.onTranscript('we flew to \u0130stanbul last summer and loved it', false, 0);
r.onTranscript('we flew to', true, 10);
console.log('F2 in:  "last summer and loved it"');
console.log('F2 out:', JSON.stringify(r.onTranscript('last summer and loved it', true, 900)));
