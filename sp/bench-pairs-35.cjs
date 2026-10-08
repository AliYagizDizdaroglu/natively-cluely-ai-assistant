// Throwaway: build the blinded pairs files for the 2026-09-18 3.5-lite bench (3 pairings x 3 reps x 2 halves).
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const HERE = __dirname;
const PAIRINGS = [['think-low', 'think35-medium'], ['think-low', 'think35-high'], ['control', 'think35-high']];
const built = [];
for (const [a, b] of PAIRINGS) for (const rep of [1, 2, 3]) for (const half of [1, 2]) {
    const out = execFileSync(process.execPath, [path.join(HERE, 'bench-pairs.mjs'), '--a', a, '--arep', String(rep), '--b', b, '--brep', String(rep), '--half', String(half)], { encoding: 'utf8' });
    const tag = `${a}r${rep}-vs-${b}r${rep}.h${half}`;
    const f = path.join(HERE, 'bench', `pairs.${tag}.json`);
    const n = JSON.parse(fs.readFileSync(f, 'utf8')).items.length;
    built.push(`${tag} ${n} items`);
    process.stdout.write(out.trim() ? out.trim().split('\n').pop() + '\n' : '');
}
console.log(built.join('\n'));
console.log(`built ${built.length} pairs files`);
