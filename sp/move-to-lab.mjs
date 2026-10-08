// The ASAP move (agenda 2026-10-04 00:02): copies this scratchpad into <Desktop>\natively-lab\sp\ and re-points the scratchpad's
// absolute path inside SCRIPTS (.mjs .js .ps1 .cmd .bat .sh) to the new folder, so they run from there. Data files (.json, .md,
// .txt, .log, answer/verdict files) are copied byte-for-byte: they are records, and their recorded paths stay true to history.
// Refuses if natively-lab\sp already exists. readdirSync + copyFileSync (cpSync fails on the non-ASCII path). Prints counts.
import fs from 'node:fs';
import path from 'node:path';
const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const LAB = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-lab';
const DST = `${LAB}/sp`;
if (fs.existsSync(DST)) { console.log(`REFUSED: ${DST} exists`); process.exit(2); }
const forms = (p) => [p, p.replace(/\//g, '\\'), p.replace(/\//g, '\\\\')];
const [srcF, srcB, srcBB] = forms(SRC), [dstF, dstB, dstBB] = forms(DST);
const SCRIPT = /\.(mjs|js|cjs|ps1|cmd|bat|sh)$/i;
let files = 0, bytes = 0, links = 0, repointed = 0, failed = 0;
function walk(s, d) {
    fs.mkdirSync(d, { recursive: true });
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
        const sp = path.join(s, e.name), dp = path.join(d, e.name);
        const st = fs.lstatSync(sp);
        if (st.isSymbolicLink()) { links++; continue; }
        if (st.isDirectory()) { walk(sp, dp); continue; }
        try {
            if (SCRIPT.test(e.name) && st.size < 4 << 20) {
                const t = fs.readFileSync(sp, 'utf8');
                const u = t.split(srcBB).join(dstBB).split(srcB).join(dstB).split(srcF).join(dstF);
                if (u !== t) repointed++;
                fs.writeFileSync(dp, u);
            } else fs.copyFileSync(sp, dp);
            files++; bytes += st.size;
        } catch { failed++; }
    }
}
walk(SRC, DST);
fs.writeFileSync(`${SRC}/MOVED-TO-NATIVELY-LAB.txt`, `${new Date().toISOString()} this scratchpad was copied to ${DST}; new work lives there (AGENDA.md master included). This folder is kept unchanged as the record of the runs made from it.\n`);
console.log(`copied ${files} files, ${(bytes / 1048576).toFixed(1)} MB; scripts re-pointed ${repointed}; links skipped ${links}; failed ${failed}; -> ${DST}`);
