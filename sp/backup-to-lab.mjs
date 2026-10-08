// Backup copy of this scratchpad into <Desktop>\natively-lab\scratchpad-<stamp>\ (a COPY: the scratchpad stays the live
// working copy until tonight's run is committed). readdirSync + copyFileSync (fs.cpSync exits silently on the
// non-ASCII Masaüstü path). Skips symlinks/junctions. Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
const SRC = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DESK = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc';
if (!fs.existsSync(DESK)) { console.log('REFUSED: desktop path not found'); process.exit(2); }
const LAB = path.join(DESK, 'natively-lab');
fs.mkdirSync(LAB, { recursive: true });
const stamp = new Date().toLocaleString('sv-SE', { hour12: false }).replace(/[: ]/g, '-');
const DST = path.join(LAB, `scratchpad-${stamp}`);
let files = 0, bytes = 0, skipped = 0, failed = 0;
function walk(s, d) {
    fs.mkdirSync(d, { recursive: true });
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
        const sp = path.join(s, e.name), dp = path.join(d, e.name);
        const st = fs.lstatSync(sp);
        if (st.isSymbolicLink()) { skipped++; continue; }
        if (st.isDirectory()) walk(sp, dp);
        else { try { fs.copyFileSync(sp, dp); files++; bytes += st.size; } catch { failed++; } }
    }
}
walk(SRC, DST);
console.log(`copied ${files} files, ${(bytes / 1048576).toFixed(1)} MB to natively-lab\\scratchpad-${stamp}; links skipped ${skipped}; failed ${failed}`);
