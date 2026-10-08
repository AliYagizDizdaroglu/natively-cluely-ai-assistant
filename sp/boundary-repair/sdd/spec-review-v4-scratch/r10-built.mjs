// Re-review of the v4 revision, part 3: does check-v4.mjs --module (what check-v4-built.mjs runs) tell a wrong
// BUILT module from the reference? Candidates are CommonJS .js files built exactly like MAIN's build
// (esbuild, format cjs, platform node, target node20, no bundling) from (a) the revised plan's module, (b) MAIN's
// current v3 module, (c) single-change mutants of (a). Also: the loader on a real Masaüstü dist path.
// check-v4.mjs writes nothing; every file here lands in this scratch folder.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const CHECK = path.resolve(HERE, '../../check-v4.mjs');
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const PLAN = fs.readFileSync(path.resolve(HERE, '../../PLAN-v4.md'), 'utf8');
const planTs = [...PLAN.matchAll(/^[ ]*```(\w*)\n([\s\S]*?)^[ ]*```/gm)].map((m) => m[2]).find((b) => b.includes('Puts back the word(s)'));
const build = (ts, dir) => {
    const js = esbuild.transformSync(ts, { loader: 'ts', format: 'cjs', platform: 'node', target: 'node20' }).code;
    const p = path.join(HERE, 'built', dir, 'deepgramBoundaryRepair.js');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, js);
    return p;
};
const mutate = (label, a, b) => { if (!planTs.includes(a)) throw new Error(`mutant ${label}: anchor not found`); return planTs.replace(a, b); };
const candidates = [
    ['rule-v4.mjs itself (calibration: EQUIVALENT)', path.resolve(HERE, '../../rule-v4.mjs'), 'EQUIVALENT'],
    ['shim-v3.mjs (calibration: NOT)', path.resolve(HERE, '../../shim-v3.mjs'), 'NOT'],
    ['plan module, CJS .js like the build', build(planTs, 'plan'), 'EQUIVALENT'],
    ['MAIN current v3 module, CJS .js', build(fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8'), 'main-v3'), 'NOT'],
    ['m1 no non-ASCII guard', build(mutate('m1', ' && !NON_ASCII_LETTER.test(lastInterim)', ''), 'm1'), 'NOT'],
    ['m2 clear() keeps the latest interim', build(mutate('m2', 'cut = null;\n            lastInterim = null;\n        },', 'cut = null;\n        },'), 'm2'), 'NOT'],
    ['m3 speechFinal ignored', build(mutate('m3', 'if (lastInterim && !speechFinal && ', 'if (lastInterim && '), 'm3'), 'NOT'],
    ['m4 speechFinal on F2 blocks its repair', build(mutate('m4', 'if (remembered && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {', 'if (remembered && !speechFinal && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {'), 'm4'), 'NOT'],
    ['m5 guard tested on the final, not the interim', build(mutate('m5', '!NON_ASCII_LETTER.test(lastInterim)', '!NON_ASCII_LETTER.test(text)'), 'm5'), 'NOT'],
    ['m6 window 4000 ms', build(mutate('m6', 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 4000;'), 'm6'), 'NOT'],
    ['m7 re-spelling must be strictly shorter', build(mutate('m7', 'finalTok.length <= interimTok.length', 'finalTok.length < interimTok.length'), 'm7'), 'NOT'],
    ['m8 clear() is a no-op', build(mutate('m8', 'cut = null;\n            lastInterim = null;\n        },', '},'), 'm8'), 'NOT'],
    ['m9 alignment guard dropped', build(mutate('m9', ' && raw.length === iw.length', ''), 'm9'), 'NOT'],
    ['m10 first-letter rule dropped', build(mutate('m10', 'finalTok[0] === interimTok[0] && ', ''), 'm10'), 'NOT'],
];
const dist = path.join(MAIN, 'dist-electron/electron/audio/deepgramKeyterms.js');
if (fs.existsSync(dist)) candidates.push(['loader on a real Masaüstü dist path (keyterms: no factory expected)', dist, 'LOADS']);
for (const [label, file, want] of candidates) {
    const r = spawnSync(process.execPath, [CHECK, '--module', file], { encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}${r.stderr}`;
    const verdict = out.split('\n').find((l) => /^(EQUIVALENT|NOT EQUIVALENT)/.test(l)) ?? `(no verdict; exit ${r.status}) ${out.split('\n').filter((l) => /FAIL|Error/.test(l)).slice(0, 2).join(' | ').slice(0, 160)}`;
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.replace(/^FAIL\s+/, '').replace(/ — .*/, '').slice(0, 70));
    const got = /^EQUIVALENT/.test(verdict) ? 'EQUIVALENT' : /^NOT EQUIVALENT/.test(verdict) ? 'NOT' : /exports no createBoundaryRepair/.test(out) ? 'LOADS' : 'ERROR';
    console.log(`${got === want ? 'AS EXPECTED' : 'UNEXPECTED '} ${label}: ${verdict.slice(0, 110)}${got === 'NOT' ? `\n      caught by: ${fails.join(' | ')}` : ''}`);
}
