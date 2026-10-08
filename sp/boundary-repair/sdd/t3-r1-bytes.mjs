// Throwaway (Task 3, fix round 1): show the raw bytes where the decomposed accent sits, to see what the Write and Edit tools
// did to a typed backslash-u sequence. Prints codepoints as U+XXXX for the non-printable ones and `\` as [BS].
//   node t3-r1-bytes.mjs
import fs from 'node:fs';
const BR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const show = (s) => [...s].map((c) => (c === '\\' ? '[BS]' : c.codePointAt(0) < 32 || c.codePointAt(0) > 126 ? `<U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}>` : c)).join('');
const look = (file, needle, before, after) => {
    const t = fs.readFileSync(file, 'utf8');
    let i = -1, n = 0;
    while ((i = t.indexOf(needle, i + 1)) !== -1) { n++; console.log(`  #${n} @${i}: ${show(t.slice(Math.max(0, i - before), i + needle.length + after))}`); }
    if (!n) console.log('  (needle not found)');
};
console.log('verifier, the comment line that says "the six characters":');
look(`${BR}/sdd/t3-r1-verify-stage.mjs`, 'six characters', 10, 24);
console.log('verifier, the M1_ADD string (two backslashes typed):');
look(`${BR}/sdd/t3-r1-verify-stage.mjs`, 'about your re', 0, 40);
console.log('staged test, the decomposed line after my Edit (single backslash typed):');
look(`${BR}/stage/electron/audio/deepgramBoundaryRepair.test.ts`, 'tell me about your re', 0, 30);
