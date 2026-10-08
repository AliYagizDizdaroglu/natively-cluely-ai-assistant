// L20d spec-author self-check: the pre-registration's code block equals instruction.txt; each registered swap
// anchor matches l20c/run.mjs exactly once at the stated line; document length against L20c's.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const doc = fs.readFileSync(`${SP}/l20d/PREREGISTER-l20d.md`, 'utf8').replace(/\r\n/g, '\n');
const ins = fs.readFileSync(`${SP}/l20d/instruction.txt`, 'utf8').replace(/\r\n/g, '\n');
const block = doc.match(/```\n([\s\S]*?)```/)[1];
console.log('code block == instruction.txt:', block === ins);
const sha = createHash('sha256').update(ins).digest('hex');
console.log('sha256 in doc matches file:', doc.includes(sha), sha);
const run = fs.readFileSync(`${SP}/l20c/run.mjs`, 'utf8').replace(/\r\n/g, '\n');
const lines = run.split('\n');
const anchors = [
    [1, '// L20 runner (see PREREGISTER-l20.md)'],
    [13, "import { createRequire } from 'node:module';"],
    [16, "/scratchpad/l20c';"],
    [31, 'const LIVE_MODE = `[LIVE MODE]'],
    [36, '[END LIVE MODE]`;'],
    [42, 'return `${p.system}\\n\\n${p.user.slice(a, b).trim()}\\n\\n${LIVE_MODE}`;'],
    [74, 'const outFile = `${HERE}/runs/live38-r${REP}.json`;'],
    [76, "level: 'none',"],
];
let bad = 0;
for (const [ln, a] of anchors) {
    const n = run.split(a).length - 1, at = lines.findIndex((l) => l.includes(a)) + 1;
    const ok = n === 1 && at === ln;
    if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'BAD'} line ${ln} (found at ${at}, ${n} match): ${a.slice(0, 60)}`);
}
const l20c = fs.readFileSync(`${SP}/l20c/PREREGISTER-l20c.md`, 'utf8');
console.log(`length: l20d ${doc.split('\n').length} lines / ${doc.length} chars; l20c ${l20c.split('\n').length} lines / ${l20c.length} chars`);
process.exit(bad || block !== ins ? 1 : 0);
