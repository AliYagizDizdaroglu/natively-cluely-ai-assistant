// Task 9 Step 2: copy the 19 reviewed paths (WT at a32db47) + the plan into MAIN's working tree, LF endings.
// Refuses if WT HEAD is not a32db47 or WT is dirty. Prints path + sha256/12 only.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const WT = path.join(MAIN, '.claude', 'worktrees', 'eq-build');
const PLAN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-lab\\sp\\followup-turn\\plan\\2026-10-04-turn-followup-build.md';
const head = execFileSync('git', ['-C', WT, 'rev-parse', '--short', 'HEAD']).toString().trim();
const dirty = execFileSync('git', ['-C', WT, 'status', '--porcelain']).toString().trim();
if (head !== 'a32db47' || dirty) { console.log(`REFUSED: WT head ${head}, dirty=${!!dirty}`); process.exit(2); }
const P = ['electron/llm/earlierQuestionGate.ts', 'electron/llm/earlierQuestionGate.test.ts', 'electron/llm/earlierQuestion.ts', 'electron/llm/earlierQuestion.test.ts', 'electron/llm/earlierQuestion.parity.test.ts',
  'electron/llm/WhatToAnswerLLM.ts', 'electron/llm/WhatToAnswerLLM.earlierQuestion.test.ts', 'electron/llm/WhatToAnswerLLM.hedgeCues.test.ts',
  'electron/SessionTracker.ts', 'electron/SessionTracker.askedQuestions.test.ts', 'electron/IntelligenceEngine.ts', 'electron/IntelligenceEngine.earlierQuestion.test.ts', 'electron/IntelligenceManager.ts', 'electron/main.ts',
  'electron/services/turnDispatch.ts', 'electron/services/turnDispatch.test.ts',
  'electron/test/golden/earlierQuestionArm.mjs', 'electron/test/golden/earlierQuestionArm.test.ts', 'electron/test/golden/interview60.answers.mjs'];
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const pairs = P.map((p) => [path.join(WT, p), path.join(MAIN, p)]);
pairs.push([PLAN, path.join(MAIN, 'docs', 'superpowers', 'plans', '2026-10-04-turn-followup-build.md')]);
for (const [src, dst] of pairs) {
  if (!fs.existsSync(path.dirname(dst))) { console.log(`REFUSED: missing folder ${path.dirname(dst)}`); process.exit(2); }
  const t = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(dst, t);
  console.log(`${sha(Buffer.from(t))} ${path.relative(MAIN, dst)}${t.includes('\r') ? ' CR!' : ''}`);
}
console.log(`copied ${pairs.length}`);
