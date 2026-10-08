import fs from 'fs'; import crypto from 'crypto';
const M='C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const W=M+'/.claude/worktrees/whole-turn';
const files=['electron/SessionTracker.ts','electron/IntelligenceEngine.ts','electron/services/interviewerTurn.ts','electron/llm/WhatToAnswerLLM.ts','electron/llm/TemporalContextBuilder.ts','electron/llm/followUpParent.ts','electron/main.ts','electron/services/questionReconcile.ts','electron/services/ChipDeduper.ts'];
const h=p=>{try{const b=fs.readFileSync(p);return crypto.createHash('sha1').update(b).digest('hex').slice(0,10)+' lines='+b.toString().split('\n').length}catch(e){return 'MISSING'}};
for(const f of files) console.log(f, h(M+'/'+f), '|', h(W+'/'+f));
console.log(fs.readFileSync(M+'/.git/HEAD','utf8'));
