// Throwaway: build every blinded pairs file for the 2026-09-17 bench (8 pairings x 3 reps x 2 halves).
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const HERE = __dirname;
const PAIRINGS = [
    ['control', 'think-low'], ['control', 'think-high'], ['control', 'bare'], ['control', 'bare-low'],
    ['control', 'bare-high'], ['control', 'gemma26-min'], ['gemma26-min', 'gemma26-min-bare'], ['bare', 'gemma26-min-bare'],
];
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
