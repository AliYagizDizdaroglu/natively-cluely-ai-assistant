// Appends the 2026-10-01 router-day pointer to the 3.8 Live line of MEMORY.md (exact-match, refuses otherwise).
import fs from 'node:fs';
const F = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md';
const s = fs.readFileSync(F, 'utf8');
const anchor = 'compared against a 3.1-lite LOW cue-only text call; never a router that withholds the pipeline';
if (s.split(anchor).length !== 2) throw new Error('anchor not found once');
if (s.includes('ROUTER DAY 2026-10-01')) throw new Error('already added');
const add = '; ROUTER DAY 2026-10-01 (summary MAIN passes/2026-10-01-live-router-summary.md, bb41ad3): L38F same-session follow-ups on the earlier QUESTION 12/12 right but on the candidate\'s ANSWER answered 4/12 (bar FAILED: follow-ups stay on the pipeline), L38P pipeline consistent with its own answer 15/17 (12/18 at roster timing), L38H router + 3.5-lite HIGH: easy 12/12 right (Live 0.8 s), hard 10/10 routed, hard path 4-6/10 acceptable 0 wrong; 3.8/3.7 Flash unmeasurable on the free tier (2/20, 3/10 answered)';
fs.writeFileSync(F, s.replace(anchor, anchor + add));
console.log('MEMORY.md updated');
