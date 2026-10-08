// Stages two docs sets into MAIN's passes/ (copy only, byte-checked, CR refused, never overwrites) and writes the
// path lists for commit-main-paths.ps1:
//   fq   -> the earlier-questions replay note + evidence folder WITHOUT the three files that carry the profile
//   live -> the L38R / L38F / L38P notes and their pre-registrations
//   node stage-docs-main.mjs fq|live
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SP = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const PASSES = 'electron/test/golden/passes';
const which = process.argv[2];
const jobs = [];
if (which === 'fq') {
    const EV = path.join(SP, 'followup-questions', 'evidence');
    const SKIP = new Set(['prompts.A.json', 'prompts.B.json', 's50m-gated.json']);   // carry the profile (CONTEXT/Email)
    jobs.push([path.join(SP, 'followup-questions', '2026-10-01-followup-questions-result.md'), `${PASSES}/2026-10-01-followup-questions-result.md`]);
    for (const f of fs.readdirSync(EV)) {
        if (f === 'blind') { for (const b of fs.readdirSync(path.join(EV, 'blind'))) jobs.push([path.join(EV, 'blind', b), `${PASSES}/2026-10-01-followup-questions/blind/${b}`]); continue; }
        if (SKIP.has(f) || f === '2026-10-01-followup-questions-result.md') continue;
        jobs.push([path.join(EV, f), `${PASSES}/2026-10-01-followup-questions/${f}`]);
    }
} else if (which === 'live') {
    for (const [dir, tag] of [['l38r', 'l38r'], ['l38f', 'l38f'], ['l38p', 'l38p']]) {
        jobs.push([path.join(SP, dir, `2026-10-01-${tag}-result.md`), `${PASSES}/2026-10-01-${tag}-result.md`]);
        jobs.push([path.join(SP, dir, `PREREGISTER-${tag}.md`), `${PASSES}/PREREGISTER-${tag}.md`]);
    }
} else { console.log('usage: fq|live'); process.exit(2); }
let bad = 0;
for (const [src, rel] of jobs) {
    const buf = fs.readFileSync(src);
    if (buf.includes(13)) { console.log(`REFUSED ${rel}: CR byte`); bad++; }
    if (/CONTEXT:\n|"Email:|\nEmail:/.test(buf.toString('utf8'))) { console.log(`REFUSED ${rel}: looks like it carries the profile`); bad++; }
    if (fs.existsSync(path.join(MAIN, rel))) { console.log(`REFUSED ${rel}: exists in MAIN`); bad++; }
}
if (bad) { console.log('nothing copied'); process.exit(2); }
for (const [src, rel] of jobs) {
    fs.mkdirSync(path.dirname(path.join(MAIN, rel)), { recursive: true });
    fs.copyFileSync(src, path.join(MAIN, rel));
    if (Buffer.compare(fs.readFileSync(src), fs.readFileSync(path.join(MAIN, rel))) !== 0) { console.log(`MISMATCH ${rel}`); process.exit(3); }
}
fs.writeFileSync(path.join(SP, `paths-${which}.txt`), jobs.map(([, rel]) => rel).join('\n') + '\n');
console.log(`${which}: ${jobs.length} files copied byte-equal; list in paths-${which}.txt`);
