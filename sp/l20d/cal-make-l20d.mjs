// Rule-8 calibration of make-l20d.mjs: it must answer differently when the thing it checks is wrong. Every case runs
// make-l20d.mjs (or a mutated copy of it) in cal-make/, with --out/--items-out pointing into cal-make/, so the real
// run.mjs, items.json and instruction.txt are never touched.
//   1. the real inputs -> 'AS REGISTERED' (10 removed, 9 added), and the system `diff` agrees (10 '<' lines, 9 '>' lines);
//   2. each of the seven anchors damaged in a copy of l20c/run.mjs -> REFUSED naming that swap;
//   3. an anchor that matches twice -> REFUSED (found 2);
//   4. an extra swap (an eighth, one changed constant) smuggled into a copy of make-l20d.mjs -> 'DIFFERS' (11/10);
//   5. a one-byte-different instruction -> REFUSED; a pre-registration that does not name the hash -> REFUSED;
//   6. items: 18 pairs, a repeated id, 4 hard pairs, a pair of three -> REFUSED; the good copy is byte-identical.
//   node cal-make-l20d.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const D = `${SP}/l20d/cal-make`;
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(D, { recursive: true });
let ok = true;
const check = (name, cond, extra = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : `  ${extra}`}`); };
const make = (args, script = `${SP}/l20d/make-l20d.mjs`) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };
const base = (extra = {}) => { const o = { '--src': `${SP}/l20c/run.mjs`, '--out': `${D}/run.out.mjs`, '--items-src': `${SP}/et38/items.json`, '--items-out': `${D}/items.out.json`, '--instruction': `${SP}/l20d/instruction.txt`, '--prereg': `${SP}/l20d/PREREGISTER-l20d.md`, ...extra }; return Object.entries(o).flat(); };
const src = fs.readFileSync(`${SP}/l20c/run.mjs`, 'utf8');

// 1. the real inputs
let r = make(base());
check('real inputs: exit 0 and "RUNNER AS REGISTERED (10 lines removed, 9 added"', r.code === 0 && /RUNNER AS REGISTERED \(10 lines removed, 9 added/.test(r.out), r.out.slice(-300));
check('real inputs: run.mjs written to cal-make is byte-identical to the real l20d/run.mjs', fs.readFileSync(`${D}/run.out.mjs`).equals(fs.readFileSync(`${SP}/l20d/run.mjs`)));
const d = spawnSync('diff', [`${SP}/l20c/run.mjs`, `${D}/run.out.mjs`], { encoding: 'utf8' });
const dl = (d.stdout ?? '').split('\n');
check(`independent: the system diff shows ${dl.filter((l) => l.startsWith('< ')).length} lines removed and ${dl.filter((l) => l.startsWith('> ')).length} added (want 10 and 9)`, dl.filter((l) => l.startsWith('< ')).length === 10 && dl.filter((l) => l.startsWith('> ')).length === 9, String(d.error ?? ''));
check('items.json: byte-identical to et38/items.json, 19 pairs / 38 ids / hard 5 / normal 14 printed', fs.readFileSync(`${D}/items.out.json`).equals(fs.readFileSync(`${SP}/et38/items.json`)) && /19 pairs, 38 distinct ids, hard 5 pairs \(10 items\), normal 14 pairs \(28 items\)/.test(r.out));

// 2. each anchor damaged
const damage = [
    ['1 header anchor', '// L20 runner (see PREREGISTER-l20.md)', '// L20 runner (see PREREGISTER-l21.md)'],
    ['2 createRequire import', 'import { createRequire } from \'node:module\';', 'import { createRequire as cr } from \'node:module\';'],
    ['3 folder', '/scratchpad/l20c\';', '/scratchpad/l20x\';'],
    ['4 LIVE MODE block', 'reply with exactly what the candidate', 'reply with exactly when the candidate'],
    ['5 return line', '${p.user.slice(a, b).trim()}\\n\\n${LIVE_MODE}`;', '${p.user.slice(a, b).trim()}\\n${LIVE_MODE}`;'],
    ['6 run file name', 'runs/live38-r${REP}.json', 'runs/live39-r${REP}.json'],
    ['7 level none', 'level: \'none\',', 'level: \'nonee\','],
];
for (const [name, from, to] of damage) {
    if (src.split(from).length !== 2) { check(`damage ${name}: the anchor is in the source once (cal setup)`, false); continue; }
    fs.writeFileSync(`${D}/src-damaged.mjs`, src.replace(from, () => to));
    r = make(base({ '--src': `${D}/src-damaged.mjs` }));
    const swapNo = name[0];
    check(`damaged anchor ${name} -> REFUSED naming swap ${swapNo}, found 0`, r.code === 1 && new RegExp(`REFUSED: swap ${swapNo}: expected its anchor to match exactly once, found 0`).test(r.out), r.out.slice(0, 200));
}

// 3. an anchor twice
fs.writeFileSync(`${D}/src-twice.mjs`, `${src}\n// level: 'none',\n`);
r = make(base({ '--src': `${D}/src-twice.mjs` }));
check('an anchor matching twice -> REFUSED (swap 7, found 2)', r.code === 1 && /REFUSED: swap 7: .*found 2/.test(r.out), r.out.slice(0, 200));

// 4. an eighth swap smuggled into a copy of the make script
const mk = fs.readFileSync(`${SP}/l20d/make-l20d.mjs`, 'utf8');
const marker = '    [\'level: \\\'none\\\',\', \'level: \\\'none\\\', instruction: INSTRUCTION_SHA256,\'],\n];';
if (mk.split(marker).length !== 2) check('cal setup: the swap-list end is in make-l20d.mjs once', false);
else {
    fs.writeFileSync(`${D}/make-8swaps.mjs`, mk.replace(marker, () => '    [\'level: \\\'none\\\',\', \'level: \\\'none\\\', instruction: INSTRUCTION_SHA256,\'],\n    [\'const CHUNK = 1920;\', \'const CHUNK = 1921;\'],\n];'));
    r = make(base(), `${D}/make-8swaps.mjs`);
    check('an eighth swap (CHUNK 1920 -> 1921) -> "RUNNER DIFFERS ... removed 11/10, added 10/9", exit 1', r.code === 1 && /RUNNER DIFFERS FROM THE REGISTERED CHANGE \(removed 11\/10, added 10\/9/.test(r.out), r.out.slice(-250));
}

// 5. instruction and pre-registration
const ins = fs.readFileSync(`${SP}/l20d/instruction.txt`);
const flipped = Buffer.from(ins); flipped[0] = flipped[0] ^ 1;           // one byte
fs.writeFileSync(`${D}/instruction.flipped.txt`, flipped);
r = make(base({ '--instruction': `${D}/instruction.flipped.txt` }));
check('a one-byte-different instruction -> REFUSED (sha256 differs), exit 1', r.code === 1 && /REFUSED: .*has sha256 [0-9a-f]{64}, not the registered e29bf381/.test(r.out), r.out.slice(0, 200));
fs.writeFileSync(`${D}/prereg.nohash.md`, fs.readFileSync(`${SP}/l20d/PREREGISTER-l20d.md`, 'utf8').replace('e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f', 'x'));
r = make(base({ '--prereg': `${D}/prereg.nohash.md` }));
check('a pre-registration that does not name the hash -> REFUSED', r.code === 1 && /must name the instruction's sha256 exactly once/.test(r.out), r.out.slice(0, 200));

// 6. items
const items = JSON.parse(fs.readFileSync(`${SP}/et38/items.json`, 'utf8'));
const bad = {
    '18 pairs': { ...items, pairs: items.pairs.slice(1) },
    'a repeated id': { ...items, pairs: [[items.pairs[0][0], items.pairs[0][0]], ...items.pairs.slice(1)] },
    '4 hard pairs': { ...items, hard: items.hard.slice(1), normal: [...items.normal, items.hard[0]].slice(0, 14) },
    'a pair of three': { ...items, pairs: [[...items.pairs[0], 'S9Q99'], ...items.pairs.slice(1)] },
};
for (const [name, j] of Object.entries(bad)) {
    fs.writeFileSync(`${D}/items.bad.json`, JSON.stringify(j));
    r = make(base({ '--items-src': `${D}/items.bad.json`, '--items-out': `${D}/items.bad.out.json` }));
    check(`items with ${name} -> REFUSED`, r.code === 1 && /REFUSED: items/.test(r.out), r.out.slice(0, 200));
}
console.log(ok ? 'MAKE-L20D CALIBRATION OK' : 'MAKE-L20D CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
