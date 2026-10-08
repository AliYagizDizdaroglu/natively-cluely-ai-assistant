// throwaway: splices work/sectionC.txt into R/scripts/grader-session-calibrate.mjs at the //@@SECTION-C@@ marker (after fixing three lines)
import fs from 'node:fs';
const f = 'R/scripts/grader-session-calibrate.mjs';
let s = fs.readFileSync(f, 'utf8');
let c = fs.readFileSync('work/sectionC.txt', 'utf8');
const rep = (a, b) => { if (c.split(a).length !== 2) throw new Error(`anchor ${a.slice(0, 50)}`); c = c.replace(a, () => b); };
const lines = c.split('\n');
const fix = (startsWith, to) => { const i = lines.findIndex((l) => l.includes(startsWith)); if (i < 0) throw new Error(`no line ${startsWith}`); lines[i] = to; };
fix("['template literal',", "        ['template literal', V + 'console.log(' + '`x`' + ')'],");
fix("['$ expansion',", "        ['$ expansion', V + 'console.log($HOME)'],");
fix("['a backtick',", "        ['a backtick', V + 'console.log(1)' + '`id`'],");
fix("r = cli('audit-graders.mjs', realArgs.filter(", "    r = cli('audit-graders.mjs', ['--blind-dir', s50lBlind, '--rubric', RUBRIC, '--session', SESSION, '--no-dispatch-check', ...real]);");
c = lines.join('\n');
if (!s.includes('//@@SECTION-C@@')) throw new Error('marker missing');
s = s.replace('//@@SECTION-C@@', () => c);
fs.writeFileSync(f, s);
console.log('spliced');
