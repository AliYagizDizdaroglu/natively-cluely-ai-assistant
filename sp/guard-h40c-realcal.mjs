// Throwaway: calibrate guard-h40c.mjs against the REAL dist-electron (built 18:52:59 from da28f25's
// tree). Runs the guard as a child with cwd = MAIN and five environments; never starts the app.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const base = { NATIVELY_STT_PROVIDER: 'deepgram', NATIVELY_ROSTER: 'holdout40', NATIVELY_SCENARIOS: '', NATIVELY_GEMINI_THINKING_LEVEL: '', NATIVELY_VERBAL_PRIMARY_MODEL: '', NATIVELY_VERBAL_HEDGE: '1', NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '', NATIVELY_FOLLOWUP_PARENT: '' };
const cases = [
    ['correct launcher env', {}, 'pass'],
    ['hedge flag unset', { NATIVELY_VERBAL_HEDGE: '' }, 'fail'],
    ['follow-up flag on', { NATIVELY_FOLLOWUP_PARENT: '1' }, 'fail'],
    ['trigger override 1 ms', { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '1' }, 'fail'],
    ['primary model override', { NATIVELY_VERBAL_PRIMARY_MODEL: 'gemini-3.5-flash-lite' }, 'fail'],
];
const out = [];
let ok = true;
for (const [name, over, want] of cases) {
    const env = { ...process.env, ...base, ...over };
    for (const [k, v] of Object.entries(env)) if (v === '') delete env[k];
    const r = spawnSync(process.execPath, [`${SP}/guard-h40c.mjs`], { cwd: MAIN, env, encoding: 'utf8' });
    const text = `${r.stdout}${r.stderr}`.trim().split('\n').slice(-2).join(' | ');
    const got = r.status === 0 ? 'pass' : 'fail';
    if (got !== want) ok = false;
    out.push(`${got === want ? 'ok  ' : 'BAD '} ${name}: exit ${r.status} (${got}, want ${want}) :: ${text.slice(0, 300)}`);
}
out.push(ok ? 'REAL-DIST CALIBRATION OK 5/5' : 'REAL-DIST CALIBRATION FAILED');
fs.writeFileSync(`${SP}/guard-h40c-realcal.txt`, out.join('\n') + '\n');
console.log(out.join('\n'));
process.exit(ok ? 0 : 1);
