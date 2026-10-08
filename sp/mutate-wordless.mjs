// THROWAWAY — rule 8: does the new machine test fail when wordlessFinal does nothing?
// Patch the method body to a bare return, run the test file, restore the file whatever happens.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const FILE = `${WT}/electron/services/interviewerTurn.ts`;
const original = fs.readFileSync(FILE, 'utf8');
const marker = 'turn.lastSpeechAt = Math.min(turn.lastSpeechAt, turn.dispatched.at);';
if (!original.includes(marker)) throw new Error('marker not found — the implementation moved');
fs.writeFileSync(FILE, original.replace(marker, 'return; // MUTANT'));
try {
    const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'electron/services/interviewerTurn.test.ts'], { cwd: WT, encoding: 'utf8' });
    const lines = (r.stdout + r.stderr).split('\n').filter((l) => /×|Tests |expected/.test(l));
    console.log(lines.join('\n'));
} finally {
    fs.writeFileSync(FILE, original);
    console.log('restored:', fs.readFileSync(FILE, 'utf8') === original);
}
