// Task 5 fix round 1 (throwaway): run ONE (test file, module) pair in a mirror tree and print vitest's own summary lines.
//   node t5f1-run.mjs --name <label> [--runs] --test <test file> --module <module file> [--expect "<text the Tests line must contain>"]
// --runs puts copies of the two committed fixtures and their run logs into the mirror; without it the mirror is "a clean checkout"
// (no interview60.runs/ at all). MAIN is only read. Exit 1 when --expect is given and the Tests line does not contain it.
import fs from 'node:fs';
import path from 'node:path';
import { makeMirror, MOD_REL, TEST_REL } from './t5f1-lib.mjs';
const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const name = arg('--name'), testFile = arg('--test'), modFile = arg('--module'), expect = arg('--expect');
if (!name || !testFile || !modFile) { console.log('usage: node t5f1-run.mjs --name <label> [--runs] --test <file> --module <file> [--expect "<text>"]'); process.exit(2); }
const mirror = makeMirror(`t5f1-m-${name}`, { runs: process.argv.includes('--runs') });
let bad = 0;
try {
    mirror.put(TEST_REL, fs.readFileSync(path.resolve(testFile)));
    mirror.put(MOD_REL, fs.readFileSync(path.resolve(modFile)));
    const r = mirror.runVerbose();
    console.log(`[${name}] test ${path.basename(testFile)} (${fs.statSync(testFile).size} B) + module ${path.basename(modFile)} (${fs.statSync(modFile).size} B), ${process.argv.includes('--runs') ? 'WITH' : 'WITHOUT'} interview60.runs/`);
    console.log(r.filesLine);
    console.log(r.testsLine);
    for (const t of r.tests) console.log(`  ${t.mark} ${t.title}`);
    // the first error line of every failure block, as vitest printed it
    const lines = r.text.split('\n');
    lines.forEach((l, i) => { if (/^\s*FAIL\s/.test(l)) { const e = lines.slice(i + 1, i + 8).find((x) => /(Error|error):/.test(x)); if (e) console.log(`  failure: ${e.trim().slice(0, 900)}`); } });
    // where in the test file each failing assertion sits (vitest's own "file:line:col" pointers)
    for (const l of lines) if (/turns-finals\.test\.ts:\d+:\d+/.test(l) && /^\s*❯/.test(l)) console.log(`  at: ${l.trim().replace(/^❯\s*/, '')}`);
    if (expect && !r.testsLine.includes(expect)) { bad++; console.log(`UNEXPECTED: the Tests line does not contain ${JSON.stringify(expect)}`); }
    else if (expect) console.log(`as expected: the Tests line contains ${JSON.stringify(expect)}`);
} finally {
    console.log(mirror.dispose());
}
process.exit(bad ? 1 : 0);
