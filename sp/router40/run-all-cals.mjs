// Runs every router40 known-answer script in order (the order of A3.6's piece list) and prints one summary line each. No network or model call.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CALS = [['P9', 'cal-pre-run-r40.mjs'], ['P2', 'cal-run-r.mjs'], ['P3', 'cal-read-r.mjs'], ['P4', 'cal-lite-l.mjs'], ['P5', 'grade/cal-build-blind-r40.mjs'], ['P6', 'grade/cal-launch-grader-r40.mjs'], ['P7', 'grade/cal-audit-r40.mjs'], ['P8', 'grade/cal-score-r40.mjs'], ['P1', 'cal-p1.mjs']];
let bad = 0; const lines = [];
for (const [piece, f] of CALS) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(HERE, f)], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const last = r.stdout.trim().split('\n').at(-1);
    const fails = [...r.stdout.matchAll(/^FAIL\s+(\S+)/gm)].map((m) => m[1]);
    if (r.status !== 0) bad++;
    lines.push(`${r.status === 0 ? 'PASS' : 'FAIL'}  ${piece.padEnd(3)} ${f.padEnd(34)} ${last}  (${((Date.now() - t0) / 1000).toFixed(1)} s)${fails.length ? `  failing: ${fails.join(',')}` : ''}`);
    console.log(lines.at(-1));
}
const summary = bad ? `${bad} piece(s) FAILED` : 'ALL PIECES PASS';
console.log(summary);
fs.mkdirSync(path.join(HERE, 'cal-out'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'cal-out', 'ALL.txt'), `${lines.join('\n')}\n${summary}\n`, 'utf8');
process.exit(bad ? 1 : 0);
