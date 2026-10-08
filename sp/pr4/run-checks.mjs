// Reviewer's re-run of the offline self-checks; outputs ONLY into this pr4 folder (never over a recorded *.out.txt). No model call.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const FT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn';
const OUT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/pr4';
const env = { ...process.env, TURN_PREREG: path.join(FT, 'section2-filled.md') };
const STEPS = [
    ['gsc-full', ['R/scripts/grader-session-calibrate.mjs'], 'GRADER-SESSION CALIBRATION OK'],
    ['gsc-F', ['R/scripts/grader-session-calibrate.mjs', '--only', 'F'], 'GRADER-SESSION CALIBRATION OK'],
    ['decide-cal', ['R/legs-decide.mjs', '--calibrate'], 'CALIBRATION OK'],
    ['lg-dry', ['R/launch-grader.mjs', 'pilot', '--pilot', `${FT}/work/p15/pilot-blind-copy`, '--attempt', '2', '--dry-run'], 'permission rules:'],
    ['lg-dry-slot', ['R/launch-grader.mjs', 'blind-1.g1', '--dry-run'], 'permission rules:'],
    ['audit-pilot-a2', ['R/audit-graders.mjs', '--blind-dir', `${FT}/pilot-blind`, 'blind-1.g1=session:fde64205-5ecf-4ccf-ae04-7ec369464ddf'], 'AUDIT:'],
    ['audit-spike', ['R/audit-graders.mjs', '--blind-dir', `${FT}/work/spike-noadd`, 'blind-1.g1=session:8a49290e-d30e-4087-ac9a-933257bb1d98'], 'AUDIT:'],
];
for (const [name, args, marker] of STEPS) {
    const r = spawnSync(process.execPath, args.map((a, i) => (i === 0 ? path.join(FT, a) : a)), { encoding: 'utf8', env, cwd: FT, maxBuffer: 256 << 20 });
    const text = `${r.stdout}${r.stderr}`;
    fs.writeFileSync(path.join(OUT, `${name}.txt`), text);
    const hit = text.split('\n').find((l) => l.includes(marker));
    const bad = text.split('\n').filter((l) => /^BAD/.test(l)).length;
    const ok = text.split('\n').filter((l) => /^OK /.test(l)).length;
    console.log(`${name.padEnd(15)} exit ${r.status} OK ${ok} BAD ${bad}  ${hit ? hit.slice(0, 140) : `MARKER MISSING (${marker})`}`);
}
