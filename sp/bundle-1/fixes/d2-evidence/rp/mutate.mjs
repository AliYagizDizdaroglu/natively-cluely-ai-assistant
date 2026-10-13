// D2 calibration: break each clause of the absorb rule, run the late-final tests, restore. Prints which tests go red.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/.claude/wt-d1';
const SRC = `${WT}/electron/services/interviewerTurn.ts`;
const VITEST = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/node_modules/vitest/vitest.mjs';
const orig = fs.readFileSync(SRC, 'utf8');
const COND = "prov.onsetAt < lc.closedAt && lc.answeredAt !== null && !lc.voiceAfterDispatch && prov.textSinceAt < lc.closedAt";
if (!orig.includes(COND)) throw new Error('condition not found');
const muts = {
  'onset < -> <=': COND.replace('prov.onsetAt < lc.closedAt', 'prov.onsetAt <= lc.closedAt'),
  'drop answered clause': COND.replace(' && lc.answeredAt !== null', ''),
  'drop voice clause': COND.replace(' && !lc.voiceAfterDispatch', ''),
  'drop textSince clause': COND.replace(' && prov.textSinceAt < lc.closedAt', ''),
  'rev-1 style (onset < close only, answered kept)': 'prov.onsetAt < lc.closedAt && lc.answeredAt !== null',
  'rev-1 literal (onset < close, dispatched-only: answered/voice/textSince all dropped)': 'prov.onsetAt < lc.closedAt',
};
const runTests = () => {
  try { execFileSync('node', [VITEST, 'run', 'electron/services/interviewerTurn.lateFinal.test.ts', '--root', WT, '--reporter=json'], { cwd: WT, encoding: 'utf8', maxBuffer: 1 << 26 }); return null; }
  catch (e) { return e.stdout; }
};
try {
  for (const [name, repl] of Object.entries(muts)) {
    fs.writeFileSync(SRC, orig.replace(COND, repl));
    const out = runTests();
    const failed = out ? JSON.parse(out.slice(out.indexOf('{'))).testResults.flatMap((f) => f.assertionResults.filter((a) => a.status === 'failed').map((a) => a.title.split(':')[0])) : [];
    console.log(`${name}: ${failed.length ? 'RED -> ' + failed.join(' | ') : 'NOT DETECTED (all green)'}`);
  }
} finally { fs.writeFileSync(SRC, orig); }
console.log('restored:', fs.readFileSync(SRC, 'utf8') === orig);
