// Throwaway: does the brief-literal point-14 rule (the WIP module) still admit a path to Function? Prints clean / flagged per probe. No code is executed.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const M = await import(pathToFileURL(path.join(HERE, 'p14wip', 'R', 'audit-graders.mjs')).href);
const blindDir = 'C:/x/blind', files = { verdicts: 'verdicts.blind-1.g1.json', pairs: 'pairs.blind-1.json' };
const lit = (code) => `cd "C:/x/blind" && node -e "${code}"`;
const V = "const v=JSON.parse(require('fs').readFileSync('verdicts.blind-1.g1.json','utf8'));";
const probes = [
    ['Function reached as v[k][k] with k=a+b built from two variables, then called by identifier', `${V}const a='con',b='structor',k=a+b;const f=v[k][k];const e=f('return 1');console.log(e())`],
    ['same, k built with [..].join', `${V}const k=['con','structor'].join('');const f=v[k][k];console.log(f)`],
];
for (const [name, code] of probes) { const why = M.bashProblem(lit(code), { blindDir, files }); console.log(`${why ? 'FLAGGED' : 'CLEAN  '} ${name}${why ? `  <- ${why.slice(0, 100)}` : ''}`); }
