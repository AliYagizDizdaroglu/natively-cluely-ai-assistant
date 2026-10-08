// Task 5 fix round 1 (throwaway): write two single-edit mutants of the ROUND-0 module (sdd\t5f1-orig, the module F2 and F3 are checked
// against) to sdd\t5f1-steps\, so t5f1-run.mjs can run them with vitest's own verbose reporter (its printed `Tests` lines are what the
// report quotes): mut.m0-gt.mjs (`at >= sinceMs` -> `at > sinceMs`) and mut.m0-noempty.mjs (the `text &&` condition dropped).
// MAIN is never touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const m0 = fs.readFileSync(path.join(HERE, 't5f1-orig', 'interview60.turns-finals.mjs'), 'utf8');
const once = (label, oldS, newS) => {
    const n = m0.split(oldS).length - 1;
    if (n !== 1) throw new Error(`${label}: expected exactly 1 occurrence of ${JSON.stringify(oldS)}, found ${n}`);
    return m0.replace(oldS, () => newS);
};
fs.mkdirSync(path.join(HERE, 't5f1-steps'), { recursive: true });
fs.writeFileSync(path.join(HERE, 't5f1-steps', 'mut.m0-gt.mjs'), once('gt', 'at >= sinceMs', 'at > sinceMs'));
fs.writeFileSync(path.join(HERE, 't5f1-steps', 'mut.m0-noempty.mjs'), once('noempty', 'if (text && at >= sinceMs)', 'if (at >= sinceMs)'));
for (const n of ['mut.m0-gt.mjs', 'mut.m0-noempty.mjs']) console.log(`${n}: ${fs.statSync(path.join(HERE, 't5f1-steps', n)).size} B`);
