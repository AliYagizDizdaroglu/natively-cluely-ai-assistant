// Throwaway: note the two Gemma arms added to the 2026-09-17 bench in the thinking-flights memory.
const fs = require('fs');
const f = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/project_thinking_flights.md';
let s = fs.readFileSync(f, 'utf8');
const before = s;
s = s.replace(
    'arms think-low, think-high, bare, bare-low, bare-high x3 reps, ~360 lite calls, resumable, exit 3 on 429; log bench-thinking.log). Session cron 12:37 grades (bench-pairs per rep/half, Opus graders, bench-score, bench-perq).',
    'arms think-low, think-high, bare, bare-low, bare-high, then gemma26-min (39 ids, gemma-4-26b-a4b-it at the app\'s MINIMAL/0.3/4096 on app bytes) and gemma26-min-bare (19 mains) — x3 reps, ~360 lite + ~174 Gemma calls, resumable, exit 3 on 429; log bench-thinking.log). Session cron 12:37 (eaf279ff) grades 8 pairings: control vs each lite arm and vs gemma26-min, gemma26-min vs gemma26-min-bare (app tax on Gemma), bare vs gemma26-min-bare (bare vs bare). Readiness verified 00:50: task Ready 10:05, main f0c6c2d, dist built after source, no app, both quotas 200, control reps 39/39/39.'
);
fs.writeFileSync(f, s);
console.log(before === s ? 'memory NOT changed' : 'memory updated');
