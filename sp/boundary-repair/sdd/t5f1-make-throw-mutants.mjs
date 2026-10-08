// Task 5 fix round 1 (throwaway): write the two "one throw removed" mutants of the final module (sdd\t5f1-steps\mod.m1.mjs) to
// sdd\t5f1-steps\mut.nothrow1.mjs / mut.nothrow2.mjs, so t5f1-run.mjs can run each and show WHICH assertion of the refusal test fails.
// Each mutant is the final module with exactly ONE line (the whole `throw` statement's line) removed. MAIN is never touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const m1 = fs.readFileSync(path.join(HERE, 't5f1-steps', 'mod.m1.mjs'), 'utf8').split('\n');
const drop = (needle) => {
    const hits = m1.filter((l) => l.includes(needle));
    if (hits.length !== 1) throw new Error(`expected exactly one line containing ${JSON.stringify(needle)}, found ${hits.length}`);
    return m1.filter((l) => !l.includes(needle)).join('\n');
};
fs.writeFileSync(path.join(HERE, 't5f1-steps', 'mut.nothrow1.mjs'), drop('is a boundary repair with no final directly above it'));
fs.writeFileSync(path.join(HERE, 't5f1-steps', 'mut.nothrow2.mjs'), drop('is a boundary repair for another final than line'));
for (const n of ['mut.nothrow1.mjs', 'mut.nothrow2.mjs']) console.log(`${n}: ${fs.statSync(path.join(HERE, 't5f1-steps', n)).size} B`);
