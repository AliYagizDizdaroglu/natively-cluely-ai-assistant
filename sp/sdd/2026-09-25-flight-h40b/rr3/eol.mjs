// Throwaway: count LF / CRLF / lone CR per file, and in the two review packages.
import { readFileSync } from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/knowledge';
const SDD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sdd/2026-09-25-flight-h40b';
for (const p of [SDD + '/rr3/head.ts', SDD + '/rr3/head.test.ts', MAIN + '/IntentClassifier.ts', MAIN + '/IntentClassifier.test.ts', SDD + '/review-task1-fix2.diff', SDD + '/review-task1-fix3.diff']) {
    const b = readFileSync(p);
    let lf = 0, crlf = 0, cr = 0;
    for (let i = 0; i < b.length; i++) {
        if (b[i] === 0x0a) { lf++; if (i > 0 && b[i - 1] === 0x0d) crlf++; }
        if (b[i] === 0x0d) cr++;
    }
    const bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    console.log(p.split('/').pop().padEnd(28), 'bytes', String(b.length).padStart(6), 'LF', String(lf).padStart(4), 'CRLF', String(crlf).padStart(4), 'CR', String(cr).padStart(4), 'BOM', bom, 'endsWithLF', b[b.length - 1] === 0x0a);
}
// Calibration: a known CRLF buffer must count as CRLF.
const cal = Buffer.from('a\r\nb\r\n');
let c = 0; for (let i = 1; i < cal.length; i++) if (cal[i] === 0x0a && cal[i - 1] === 0x0d) c++;
console.log('calibration: CRLF count in "a\\r\\nb\\r\\n" =', c, '(want 2)');
