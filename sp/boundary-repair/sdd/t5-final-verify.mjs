// Task 5 (throwaway): final state of MAIN. The three Task 5 files: size, full sha256, CR, BOM, valid UTF-8, stage == MAIN, and the
// brief-derived comparison; the original extractor snapshot; Tasks 1-4's files against their recorded hashes; the user's
// interview60.chains.json / interview60.report.md (size + mtime, for the record); a scan of MAIN for every file modified since the start of
// Task 5 (must be exactly the three); no leftover mirror trees / caches / temp outputs; the branch file. Read-only.
//   node t5-final-verify.mjs
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

console.log('Task 5 files in MAIN:');
const MINE = [G + 'interview60.turns-finals.mjs', G + 'interview60.turns-finals.test.ts', G + 'interview60.turns-fixture.mjs'];
for (const rel of MINE) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const s = fs.readFileSync(path.join(STAGE, rel));
    const cr = m.filter((x) => x === 13).length;
    const bom = m.length >= 3 && m[0] === 0xef && m[1] === 0xbb && m[2] === 0xbf;
    let utf8 = true; try { new TextDecoder('utf-8', { fatal: true }).decode(m); } catch { utf8 = false; }
    console.log(`  ${rel}\n    ${m.length} B  sha256 ${sha(m)}\n    ${[flag(cr === 0, `CR=${cr}`), flag(!bom, `BOM=${bom}`), flag(utf8, `valid UTF-8=${utf8}`), flag(Buffer.compare(m, s) === 0, 'stage == MAIN')].join(' | ')}`);
}
const brief = spawnSync(process.execPath, [path.join(HERE, 't5-verify-brief.mjs'), '--expect', 'test,module-v4,extractor', '--main'], { encoding: 'utf8' });
console.log('  brief comparison (t5-verify-brief.mjs --main): ' + flag(brief.status === 0, brief.stdout.trim().split('\n').pop()));
const orig = fs.readFileSync(path.join(HERE, 't5-orig', 'interview60.turns-fixture.mjs'));
console.log(`  extractor before Task 5 (snapshot): ${orig.length} B sha256 ${sha(orig).slice(0, 16)} ` + flag(orig.length === 5485 && sha(orig).startsWith('b142feb03124f33b'), 'is the 5,485 B file the brief starts from'));

console.log('Tasks 1-4 files (must be exactly as at the end of Task 4 fix round 1):');
const PRIOR = [
    ['electron/audio/deepgramBoundaryRepair.ts', 10743, 'd5ba4da0650e7531'],
    ['electron/audio/deepgramBoundaryRepair.test.ts', 13947, '6956aea35dfef746'],
    ['electron/audio/deepgramBoundaryRepair.fixtures.json', 22788, 'e65c6e74'],
    ['electron/audio/DeepgramStreamingSTT.ts', 16037, '70683d814ac6a27f'],
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 11766, 'e80e5373b7d7b291'],
    ['electron/audio/deepgramKeyterms.ts', 5801, 'b4431b9138d9688f'],
    ['electron/audio/deepgramKeyterms.test.ts', 3429, 'bfdd8a5d91f48da7'],
];
for (const [rel, size, want] of PRIOR) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    console.log(`  ${rel}: ${m.length} B sha256 ${sha(m).slice(0, 16)}  ` + flag(m.length === size && sha(m).startsWith(want), 'unchanged'));
}

console.log("The user's uncommitted files (never touched by Task 5; size + mtime for the record):");
for (const n of ['interview60.chains.json', 'interview60.report.md']) {
    const p = path.join(MAIN, G + n);
    if (fs.existsSync(p)) { const st = fs.statSync(p); console.log(`  ${G}${n}: ${st.size} B, mtime ${st.mtime.toISOString()}`); } else console.log(`  ${G}${n}: not present`);
}

// Every file in MAIN modified since Task 5 began (first write into MAIN was 22:47 local; threshold 22:40 local = 19:40Z).
const SINCE = Date.parse('2026-09-29T19:40:00.000Z');
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
console.log(`Files in MAIN modified since 22:40 local (node_modules, .git, dist*, .claude excluded): ${touched.length}`);
for (const f of touched) console.log(`  ${mine.has(f) ? 'mine ' : 'OTHER'} ${f}`);
console.log('  ' + flag(missing.length === 0, 'all three Task 5 files are among them') + ' | ' + (extra.length ? `NOTE: ${extra.length} file(s) not mine (another session/agent or the user)` : 'no other file modified'));

const left = fs.readdirSync(HERE).filter((n) => /^t5-mirror|^\.vitecache-t5/.test(n));
const temps = ['s50a-turns.check.json', 'after9-turns.check.json'].filter((n) => fs.existsSync(path.join(os.tmpdir(), n)));
console.log('Leftovers (mirror trees, vite caches under sdd\\; temp outputs in %TEMP%): ' + flag(left.length === 0 && temps.length === 0, [...left, ...temps].join(', ') || 'none'));
console.log(`MAIN's node_modules/vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
console.log(`Branch file: ${JSON.stringify(fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8'))}`);
console.log(bad ? `\n${bad} problem(s)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
