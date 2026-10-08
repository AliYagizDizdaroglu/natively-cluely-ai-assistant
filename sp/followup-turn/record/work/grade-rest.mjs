// A3: blind-5..9 graded by fresh attempts a3 (replacement a4); a1/a2 were refused by the account rate limit before any output.
// Controller driver: launches the 18 graders in rounds blind-1 .. blind-9, g1 and g2 of a file together (A2 point 11, M-a: never
// more than 2 at once), each via R/launch-grader.mjs (point 15 flags). Logs every command + output to R/run.log. A slot whose
// launcher exits non-zero is listed for the ONE registered replacement (attempt 2), which this driver runs after the round.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const LOG = `${R}/run.log`;
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
const log = (s) => fs.appendFileSync(LOG, `${s}\n`);
function launch(slot, attempt) {
    return new Promise((resolve) => {
        const args = ['launch-grader.mjs', slot, '--attempt', String(attempt)];
        const p = spawn('node', args, { cwd: R });
        let out = '';
        p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
        p.on('close', (code) => {
            log(`[${stamp()}] grader -- (cwd ${R}) node ${args.join(' ')} -> exit ${code}\n${out.trimEnd()}`);
            const line = out.split('\n').find((l) => l.startsWith(`${slot} a${attempt}`)) ?? out.trim().split('\n').pop();
            console.log(`[${stamp()}] ${slot} a${attempt}: exit ${code} :: ${line}`);
            resolve(code);
        });
    });
}
const only = process.argv.slice(2).map(Number).filter(Boolean);
for (let n = 1; n <= 9; n++) {
    if (only.length && !only.includes(n)) continue;
    const slots = [`blind-${n}.g1`, `blind-${n}.g2`];
    const codes = await Promise.all(slots.map((s) => launch(s, 3)));
    const redo = slots.filter((s, i) => codes[i] !== 0);
    for (const s of redo) {
        const v = `${R}/blind/verdicts.${s}.json`;
        if (fs.existsSync(v)) {
            fs.mkdirSync(`${R}/../work/replaced`, { recursive: true });
            fs.renameSync(v, `${R}/../work/replaced/verdicts.${s}.a3.json`);
            log(`[${stamp()}] replacement: moved the failed attempt's verdicts.${s}.json to work/replaced/verdicts.${s}.a3.json before attempt 4`);
        }
    }
    if (redo.length) await Promise.all(redo.map((s) => launch(s, 4)));
}
console.log(`[${stamp()}] grade-all done`);
