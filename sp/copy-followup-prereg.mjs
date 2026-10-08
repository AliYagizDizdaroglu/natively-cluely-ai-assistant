// Throwaway: copy the follow-up earlier-questions pre-registration and its design into MAIN's passes/,
// byte for byte, refusing to overwrite an existing file; print each file's source mtime (the
// pre-registration timestamp), sha256 of source and copy, size, and CR/BOM checks (the commit helper
// refuses blobs with CR).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-context';
const DST = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const pairs = [
    ['PREREGISTER-followup-questions.md', 'PREREGISTER-followup-questions.md'],
    ['2026-09-28-followup-question-context-design.md', '2026-09-28-followup-question-context-design.md'],
];
for (const [s, d] of pairs) {
    const src = `${SRC}/${s}`, dst = `${DST}/${d}`;
    const b = fs.readFileSync(src);
    const st = fs.statSync(src);
    const cr = b.filter((x) => x === 13).length;
    const bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    if (fs.existsSync(dst)) { console.log(`REFUSED: ${d} already exists in passes/`); process.exit(2); }
    if (cr) { console.log(`REFUSED: ${s} holds ${cr} CR bytes`); process.exit(3); }
    fs.copyFileSync(src, dst);
    const c = fs.readFileSync(dst);
    console.log(`${d}: source mtime ${st.mtime.toISOString()} | ${b.length} bytes | BOM ${bom} | sha256 src ${sha(b).slice(0, 16)} copy ${sha(c).slice(0, 16)} ${sha(b) === sha(c) ? 'IDENTICAL' : 'DIFFERENT'}`);
}
