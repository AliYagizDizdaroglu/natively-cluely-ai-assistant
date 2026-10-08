// Throwaway (2026-09-29): recover the NEW files' full contents from a review package (make-review-package.ps1
// shows a new file as one all-additions hunk), so two packages can be diffed with `diff -u`.
//   node unpack-package.mjs <package.txt> <outdir>
import fs from 'node:fs';
import path from 'node:path';
const [pkg, out] = process.argv.slice(2);
let cur = null, body = [], inHunk = false;
const flush = () => { if (cur) { fs.mkdirSync(path.dirname(path.join(out, cur)), { recursive: true }); fs.writeFileSync(path.join(out, cur), body.join('\n') + '\n'); console.log(`${cur}: ${body.length} lines`); } };
for (const l of fs.readFileSync(pkg, 'utf8').split(/\r?\n/)) { // the package is written by PowerShell: CRLF
    const m = l.match(/^===== (.+) =====$/);
    if (m) { flush(); cur = m[1]; body = []; inHunk = false; continue; }
    if (!cur) continue;
    if (l.startsWith('@@')) { inHunk = true; continue; }
    if (inHunk && l.startsWith('+')) body.push(l.slice(1));
    else if (inHunk && l.startsWith('\\')) continue; // "\ No newline at end of file"
}
flush();
