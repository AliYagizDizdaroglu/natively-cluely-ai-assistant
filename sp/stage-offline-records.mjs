// Throwaway: stages the four offline pass records (ET10, ET10b, L20, L20b) for MAIN's passes/ in h40c's layout —
// PREREGISTER-<name>.md verbatim + <date>-<name>-result.md verbatim — LF-only (commit-main-paths.ps1 refuses CR).
// L20b's result copy gets ONE appended, labelled times-only note (the pre-registration itself is never edited).
//   node stage-offline-records.mjs            -> SP/stage-docs/electron/test/golden/passes/
//   node stage-offline-records.mjs --to-main  -> copies the staged files into MAIN (only after br1 has ended)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const SP = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(SP, 'stage-docs', 'electron', 'test', 'golden', 'passes');
const MAP = [
    ['et10/PREREGISTER-et10.md', 'PREREGISTER-et10.md'],
    ['et10/RESULT.md', '2026-09-27-et10-result.md'],
    ['et10/PREREGISTER-et10b.md', 'PREREGISTER-et10b.md'],
    ['et10/RESULT2.md', '2026-09-28-et10b-result.md'],
    ['l20/PREREGISTER-l20.md', 'PREREGISTER-l20.md'],
    ['l20/NOTES-l20.md', '2026-09-28-l20-result.md'],
    ['l20b/PREREGISTER-l20b.md', 'PREREGISTER-l20b.md'],
    ['l20b/RESULT-l20b.md', '2026-09-29-l20b-result.md'],
];
const L20B_NOTE = `

---

Times-only note (added 2026-09-30, when this record was committed; the pre-registration is unchanged): the
pre-registration's header says it was written "~17:25 local". That time was an estimate. The file's mtime is
2026-09-29 17:17:32 local: written while the pre-flight health probe was still running (started 17:16:22, its
result written 17:21:23, \`l20/health/2026-09-29T14-16-22-775Z.json\`) and before the runs launched ~17:23
(NOTES-l20b.md), which is what its header claims.
`;
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const TO_MAIN = process.argv.includes('--to-main');
if (!TO_MAIN) {
    fs.mkdirSync(STAGE, { recursive: true });
    for (const [src, dst] of MAP) {
        let text = fs.readFileSync(path.join(SP, src), 'utf8').replace(/\r\n/g, '\n');
        if (text.includes('\r')) throw new Error(`${src} has a bare CR`);
        if (dst === '2026-09-29-l20b-result.md') text = text.replace(/\n*$/, '') + L20B_NOTE;
        fs.writeFileSync(path.join(STAGE, dst), text);
        console.log(`${dst.padEnd(30)} ${String(Buffer.byteLength(text)).padStart(6)} bytes  sha256/12 ${sha(text)}  <- ${src}`);
    }
} else {
    const DEST = path.join(MAIN, 'electron', 'test', 'golden', 'passes');
    for (const [, dst] of MAP) {
        const to = path.join(DEST, dst);
        if (fs.existsSync(to)) throw new Error(`${to} already exists; not overwriting`);
    }
    for (const [, dst] of MAP) { fs.copyFileSync(path.join(STAGE, dst), path.join(DEST, dst)); console.log(`copied ${dst}  sha256/12 ${sha(fs.readFileSync(path.join(DEST, dst)))}`); }
}
