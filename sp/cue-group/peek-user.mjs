// Throwaway: how a captured user turn carries the question (head and tail of S1Q08F's user text).
import fs from 'node:fs';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke';
const P = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
const u = P.S1Q08F.user;
console.log(u.length, 'chars');
console.log(u.slice(0, 700));
console.log('\n......\n');
console.log(u.slice(-1400));
