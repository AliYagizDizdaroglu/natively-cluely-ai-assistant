// Throwaway: replace the NATIVELY_FLIGHT_COMMIT placeholder in both h40c launchers with MAIN's HEAD (the
// registered pre-registration commit), keeping each file's line endings byte for byte.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const head = execFileSync('git', ['-C', MAIN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const subject = execFileSync('git', ['-C', MAIN, 'log', '-1', '--format=%s'], { encoding: 'utf8' }).trim();
if (!subject.startsWith('probe(flight): pre-register h40c')) { console.error(`REFUSED: HEAD is not the pre-registration commit (${subject})`); process.exit(1); }
const PH = 'set NATIVELY_FLIGHT_COMMIT=REPLACE_WITH_FINAL_HEAD_BEFORE_ARMING';
for (const n of ['launch-h40c.cmd', 'launch-h40c-dry.cmd']) {
    const p = `${SP}/${n}`;
    const t = fs.readFileSync(p, 'latin1');
    if (!t.includes(PH)) { console.error(`${n}: placeholder not found`); process.exit(1); }
    fs.writeFileSync(p, t.replace(PH, `set NATIVELY_FLIGHT_COMMIT=${head}`), 'latin1');
    const back = fs.readFileSync(p, 'latin1');
    console.log(`${n}: pinned to ${head}; CRLF lines ${(back.match(/\r\n/g) || []).length}, bare LF ${(back.match(/(?<!\r)\n/g) || []).length}`);
}
