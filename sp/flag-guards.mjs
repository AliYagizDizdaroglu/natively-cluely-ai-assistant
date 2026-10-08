// flag-guards.mjs — throwaway: exercise the three refusal paths of answers.mjs --cues/--no-cues
// from the whole-turn worktree. Every case must exit 2 BEFORE any request; nothing is written.
// Keys reach the child only through node --env-file (never read or printed here).
import { spawnSync } from 'node:child_process';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = MAIN + '/.claude/worktrees/whole-turn';
const PROMPTS = MAIN + '/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l/interview60.prompts.json';
const base = ['--env-file=' + MAIN + '/.env', 'electron/test/golden/interview60.answers.mjs'];
const cases = [
    ['cues without --captured', ['--cues', '--tag', 'x']],
    ['cues and no-cues together', ['--captured', PROMPTS, '--cues', '--no-cues', '--tag', 'x']],
    ['no-cues on a pre-cue capture (per-id refusal)', ['--captured', PROMPTS, '--only', 'S1Q02', '--no-cues', '--tag', 'x']],
    ['cues without --tag', ['--captured', PROMPTS, '--only', 'S1Q02', '--cues']],
];
let bad = 0;
for (const [name, extra] of cases) {
    const r = spawnSync(process.execPath, [...base, ...extra], {
        cwd: WT, encoding: 'utf8',
        env: { ...process.env, NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2' },
    });
    const out = (r.stdout + r.stderr).split('\n').filter((l) => l.trim()).slice(-3).join(' | ');
    const ok = r.status === 2;
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'BAD '} exit=${r.status}  ${name}\n      ${out}`);
}
process.exit(bad ? 1 : 0);
