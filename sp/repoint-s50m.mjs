// repoint-s50m.mjs — copy every s50l-* analysis script to an s50m-* twin, rewriting the run
// directory and the verdict-file prefix. Order matters: the full run-dir string is replaced
// FIRST, otherwise the blanket s50l -> s50m rename would leave the old date in the path.
import fs from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const OLD_RUN = '2026-09-21T08-22-34-s50l';
const NEW_RUN = '2026-09-22T08-22-50-s50m';

const runDir = `C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/${NEW_RUN}`;
if (!fs.existsSync(runDir)) { console.error(`refusing: ${NEW_RUN} does not exist`); process.exit(2); }

const files = fs.readdirSync(S).filter((f) => f.startsWith('s50l-') && (f.endsWith('.mjs') || f.endsWith('.cmd')));
for (const f of files) {
    const out = f.replace(/^s50l-/, 's50m-');
    const text = fs.readFileSync(`${S}/${f}`, 'utf8').split(OLD_RUN).join(NEW_RUN).split('s50l').join('s50m');
    fs.writeFileSync(`${S}/${out}`, text, 'utf8');
    const stillOld = /2026-09-21T08-22-34/.test(text) || /s50l/.test(text);
    console.log(`${f} -> ${out}${stillOld ? '   !! still references s50l' : ''}`);
}
console.log(`\nrun dir now: ${NEW_RUN}`);
