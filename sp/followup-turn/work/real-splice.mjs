import fs from 'node:fs';
const f = 'R/scripts/grader-session-calibrate.mjs';
const L = fs.readFileSync(f, 'utf8').split('\n');
const i = L.findIndex((l) => l.includes('the 8 real s50l graders read CLEAN under the allowlist'));
if (i < 0 || !L[i + 1].includes('match the dispatch text 8/8') || !L[i + 2].includes('allowed Bash recorded')) throw new Error('anchors');
L.splice(i, 3, ...fs.readFileSync('work/real-checks.txt', 'utf8').trimEnd().split('\n'));
fs.writeFileSync(f, L.join('\n'));
console.log('ok');
