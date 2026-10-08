import fs from 'node:fs';
const plan = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/plan/2026-10-04-turn-followup-build.md','utf8').replace(/\r\n/g,'\n');
const t6 = plan.slice(plan.indexOf('### Task 6:'), plan.indexOf('### Task 7:'));
const m = t6.match(/- \[ \] \*\*Step 1: Write the failing test\*\*\n\n```ts\n([\s\S]*?)\n```\n/);
if (!m) throw new Error('no match');
const out = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/IntelligenceEngine.earlierQuestion.test.ts';
if (fs.existsSync(out)) throw new Error('exists');
fs.writeFileSync(out, m[1] + '\n');
console.log('written', m[1].length);