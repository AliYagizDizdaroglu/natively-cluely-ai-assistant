// Throwaway: prove the flight's focused-arm skip on two rosters through its own --dry-run.
// The flight aborts without a .env beside package.json (an existence check at flight.mjs:252;
// dry mode never reads it), so an EMPTY one exists for the duration of the two runs and is
// removed in finally. Refuses to touch a .env that already exists.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const env = path.join(PROJ, '.env');
if (fs.existsSync(env)) throw new Error('.env already exists in the worktree — not touching it');
fs.writeFileSync(env, '');
try {
    const runs = [
        ['dryskip', {}],
        ['dryfocus', { NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2' }],
    ];
    for (const [label, extra] of runs) {
        let out = '';
        let code = 0;
        try {
            out = execFileSync(process.execPath, ['electron/test/golden/interview60.flight.mjs', label, '--dry-run'], {
                cwd: PROJ, env: { ...process.env, ...extra }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (e) {
            code = e.status;
            out = (e.stdout ?? '') + (e.stderr ?? '');
        }
        fs.writeFileSync(path.join(OUT, `${label}.out`), out);
        const lines = out.split('\n').filter((l) => /FLIGHT|ROSTER|FOCUSED|answers\.mjs|DONE|ABORT|Error/.test(l));
        console.log(`== ${label} exit=${code}  (${out.split('\n').length} lines, full log in ${label}.out)`);
        console.log(lines.map((l) => l.replace(/^\S+ /, '')).join('\n'));
    }
} finally {
    fs.rmSync(env, { force: true });
    console.log('.env removed:', !fs.existsSync(env));
}
