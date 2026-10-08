// cues-smoke.mjs — throwaway: ONE live exercise of the new `--cues` captured arm on two
// s50l ids, run from the whole-turn worktree. Keys reach the child only through
// node --env-file (this script never reads, copies or prints them).
import { spawnSync } from 'node:child_process';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = MAIN + '/.claude/worktrees/whole-turn';
const RUN = MAIN + '/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l';
const only = process.argv[2] || 'S1Q02,S2Q05';
const tag = process.argv[3] || 'cues-smoke';

const args = [
    '--env-file=' + MAIN + '/.env',
    'electron/test/golden/interview60.answers.mjs',
    '--captured', RUN + '/interview60.prompts.json',
    '--only', only, '--cues', '--tag', tag, '--thinking', 'LOW',
];
const r = spawnSync(process.execPath, args, {
    cwd: WT,
    stdio: 'inherit',
    env: { ...process.env, NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2' },
});
console.log('cues-smoke exit=' + r.status);
process.exit(r.status ?? 1);
