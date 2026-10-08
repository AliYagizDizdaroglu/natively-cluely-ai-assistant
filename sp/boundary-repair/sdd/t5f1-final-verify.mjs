// Task 5 fix round 1 (throwaway): final state of MAIN after the fix round. The two files this round changed: size, full sha256, CR, BOM,
// valid UTF-8, stage == MAIN, and the derivation from task-5-fix1.md (t5f1-verify-fix.mjs --main); the extractor (unchanged this round)
// still carries its round-0 hash; Tasks 1-4's files against their recorded hashes; the user's uncommitted files (size + mtime); a walk of
// MAIN for every file modified since the fix round began (must be exactly the two); no leftover mirror trees / caches / temp outputs;
// the branch file. Read-only.
//   node t5f1-final-verify.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const sha = (b) => createHash('sha256').update(b).digest('hex');
let bad = 0;
const flag = (ok, msg) => { if (!ok) bad++; return ok ? msg : `PROBLEM: ${msg}`; };

console.log('The two files changed in fix round 1, in MAIN:');
const MINE = [G + 'interview60.turns-finals.mjs', G + 'interview60.turns-finals.test.ts'];
for (const rel of MINE) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const s = fs.readFileSync(path.join(STAGE, rel));
    const cr = m.filter((x) => x === 13).length;
    const bom = m.length >= 3 && m[0] === 0xef && m[1] === 0xbb && m[2] === 0xbf;
    let utf8 = true; try { new TextDecoder('utf-8', { fatal: true }).decode(m); } catch { utf8 = false; }
    console.log(`  ${rel}\n    ${m.length} B  sha256 ${sha(m)}\n    ${[flag(cr === 0, `CR=${cr}`), flag(!bom, `BOM=${bom}`), flag(utf8, `valid UTF-8=${utf8}`), flag(Buffer.compare(m, s) === 0, 'stage == MAIN')].join(' | ')}`);
}
const fix = spawnSync(process.execPath, [path.join(HERE, 't5f1-verify-fix.mjs'), '--expect', 'test,module', '--main'], { encoding: 'utf8' });
console.log('  derivation from task-5-fix1.md (t5f1-verify-fix.mjs --main): ' + flag(fix.status === 0, fix.stdout.trim().split('\n').pop()));

const X = fs.readFileSync(path.join(MAIN, G + 'interview60.turns-fixture.mjs'));
console.log(`The extractor (not changed this round): ${X.length} B sha256 ${sha(X).slice(0, 16)} ` + flag(X.length === 5470 && sha(X).startsWith('cfd7c87666393bb8'), 'as at the end of round 0'));

console.log('Tasks 1-4 files. Five are as at the end of round 0 of Task 5 (22:55-23:01). The two adapter files were changed by someone else (mtimes 23:06:45 and\n23:08:21 local: before this round began, never by Task 5; the change adds the adjacency comment at :244 and the test at :220); their current bytes are recorded:');
const PRIOR = [
    ['electron/audio/deepgramBoundaryRepair.ts', 10743, 'd5ba4da0650e7531', ''],
    ['electron/audio/deepgramBoundaryRepair.test.ts', 13947, '6956aea35dfef746', ''],
    ['electron/audio/deepgramBoundaryRepair.fixtures.json', 22788, 'e65c6e74', ''],
    ['electron/audio/DeepgramStreamingSTT.ts', 16236, '57292516fc495df1', ' (was 16,037 B 70683d81 at the end of round 0)'],
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 13838, '2f3eb860c6142415', ' (was 11,766 B e80e5373 at the end of round 0)'],
    ['electron/audio/deepgramKeyterms.ts', 5801, 'b4431b9138d9688f', ''],
    ['electron/audio/deepgramKeyterms.test.ts', 3429, 'bfdd8a5d91f48da7', ''],
];
for (const [rel, size, want, note] of PRIOR) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const mt = fs.statSync(path.join(MAIN, rel)).mtime;
    console.log(`  ${rel}: ${m.length} B sha256 ${sha(m).slice(0, 16)}, mtime ${mt.toISOString()}${note}  ` + flag(m.length === size && sha(m).startsWith(want), 'as recorded'));
}

console.log("The user's uncommitted files (size + mtime, for the record):");
for (const n of ['interview60.chains.json', 'interview60.report.md']) {
    const p = path.join(MAIN, G + n);
    if (fs.existsSync(p)) { const st = fs.statSync(p); console.log(`  ${G}${n}: ${st.size} B, mtime ${st.mtime.toISOString()}`); } else console.log(`  ${G}${n}: not present`);
}

// Every file in MAIN modified since the fix round began (first write into MAIN 23:33 local; threshold 23:25 local = 20:25Z).
const SINCE = Date.parse('2026-09-29T20:25:00.000Z');
const SKIP = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'release', 'out', '.vite', '.claude']);
const touched = [];
(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name)); continue; }
        const p = path.join(dir, e.name);
        try { if (fs.statSync(p).mtimeMs >= SINCE) touched.push(path.relative(MAIN, p).replace(/\\/g, '/')); } catch { /* vanished */ }
    }
})(MAIN);
touched.sort();
const mine = new Set(MINE);
const extra = touched.filter((f) => !mine.has(f));
const missing = MINE.filter((f) => !touched.includes(f));
console.log(`Files in MAIN modified since 23:25 local (node_modules, .git, dist*, .claude excluded): ${touched.length}`);
for (const f of touched) console.log(`  ${mine.has(f) ? 'mine ' : 'OTHER'} ${f}`);
console.log('  ' + flag(missing.length === 0, 'both fix-round files are among them') + ' | ' + (extra.length ? `NOTE: ${extra.length} file(s) not mine (another session/agent or the user)` : 'no other file modified'));

const left = fs.readdirSync(HERE).filter((n) => /^t5-mirror|^\.vitecache-t5|^t5f1-m-|^t5f1-mut-/.test(n));
const temps = ['s50a-turns.check.json', 'after9-turns.check.json'].filter((n) => fs.existsSync(path.join(os.tmpdir(), n)));
console.log('Leftovers (mirror trees, vite caches under sdd\\; temp outputs in %TEMP%): ' + flag(left.length === 0 && temps.length === 0, [...left, ...temps].join(', ') || 'none'));
console.log(`MAIN's node_modules/vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
console.log(`Branch file: ${JSON.stringify(fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8'))}`);
console.log(bad ? `\n${bad} problem(s)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
