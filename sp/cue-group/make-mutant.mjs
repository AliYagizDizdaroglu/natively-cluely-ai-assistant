// Throwaway: copy WhatToAnswerLLM.ts to WhatToAnswerLLM.mutant.ts with the cue once-guard removed,
// so the merge check can prove its "reports exactly once across the fallback" assertion CAN fail.
// usage (cwd = the worktree root): node <this>
import fs from 'node:fs';

const SRC = 'electron/llm/WhatToAnswerLLM.ts';
const OUT = 'electron/llm/WhatToAnswerLLM.mutant.ts';
const text = fs.readFileSync(SRC, 'utf8');
const guard = `                let cuesSent = false;
                const onCuesOnce = (c: string[]) => {
                    if (cuesSent) return;
                    cuesSent = true;
                    onCues?.(c);
                };
`;
const mutated = `                const onCuesOnce = (c: string[]) => { onCues?.(c); };   // MUTANT: no once-guard
`;
const at = text.indexOf(guard);
if (at < 0 || text.indexOf(guard, at + 1) >= 0) throw new Error('the once-guard block was not found exactly once');
fs.writeFileSync(OUT, text.replace(guard, mutated), 'utf8');
console.log(`wrote ${OUT}`);
