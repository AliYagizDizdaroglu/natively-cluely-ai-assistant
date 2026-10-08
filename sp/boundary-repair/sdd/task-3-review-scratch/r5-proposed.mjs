// Task 3 review (Opus), throwaway. Read-only on MAIN (mirror tree as in r3-mutants.mjs).
// Calibrates the two PROPOSED test additions, both folded into existing v4 tests so the counts stay 68 / RED 10|58:
//   A. "twenty five" test + a same-first-letter digit merge ("version two" -> "v2"): only the digit rule refuses it.
//   B. résumé test + the DECOMPOSED spelling (e + U+0301): only the \p{M} half of the guard refuses it.
// Runs the proposed test file on: final, v3 (RED), digit rule dropped, \p{M} dropped. Then one rule-v4 probe.
//   node r5-proposed.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 't');
const AUDIO = path.join(TREE, 'electron', 'audio');
const CACHE = path.join(HERE, '.vc');
const finalModule = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
const v3Module = fs.readFileSync(path.join(HERE, '..', 't3-orig', 'deepgramBoundaryRepair.ts'), 'utf8');
const mainTest = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.test.ts'), 'utf8');
const once = (label, text, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`"${label}": expected exactly 1 occurrence, found ${n}`);
    return text.replace(oldS, () => newS);
};

const A_OLD = String.raw`        expect(play([at('we cut latency by twenty five last quarter', false, 0), at('We cut latency by 25', true, 100), at('last quarter. What changed?', true, 2100)]))
            .toBe('last quarter. What changed?');
    });`;
const A_NEW = String.raw`        expect(play([at('we cut latency by twenty five last quarter', false, 0), at('We cut latency by 25', true, 100), at('last quarter. What changed?', true, 2100)]))
            .toBe('last quarter. What changed?');
        // "92" and "25" also fail the first-letter test; "v2" keeps "version"'s first letter and is shorter, so only
        // the digit test refuses it (synthetic, like "put" for "cut"; v3 restored "two").
        expect(play([at('we shipped version two last week', false, 0), at('We shipped v2', true, 100), at('last week, then rolled it back.', true, 2100)]))
            .toBe('last week, then rolled it back.');
    });`;
const B_OLD = String.raw`        expect(play([at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
    });`;
const B_NEW = String.raw`        expect(play([at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
        // The same word DECOMPOSED ("e" + U+0301, escaped so no editor can normalise it): the \p{M} half of the guard.
        expect(play([at('tell me about your re\u0301sume\u0301 and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
    });`;
const proposed = once('B', once('A', mainTest, A_OLD, A_NEW), B_OLD, B_NEW);
fs.writeFileSync(path.join(HERE, 'r5-proposed.test.ts.txt'), proposed);
console.log(`proposed test file: ${Buffer.byteLength(proposed)} B (MAIN ${Buffer.byteLength(mainTest)} B); ASCII-only additions: ${/^[\x00-\x7F]*$/.test(A_NEW.slice(A_OLD.length - 8) + B_NEW.slice(B_OLD.length - 8))}; still NFC: ${proposed === proposed.normalize('NFC')}`);

const variants = [
    ['final (MAIN as is)', finalModule],
    ['v3 module (t3-orig) = the RED state', v3Module],
    ['digit rule dropped', once('digit', finalModule, ' && !/\\d/.test(finalTok)', '')],
    ['\\p{M} dropped from the guard', once('marks', finalModule, '[\\p{L}\\p{M}]', '\\p{L}')],
];

fs.mkdirSync(AUDIO, { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
fs.copyFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), path.join(AUDIO, 'deepgramBoundaryRepair.fixtures.json'));
fs.writeFileSync(path.join(AUDIO, 'deepgramBoundaryRepair.test.ts'), proposed);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
for (const [name, src] of variants) {
    fs.writeFileSync(path.join(AUDIO, 'deepgramBoundaryRepair.ts'), src);
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/deepgramBoundaryRepair.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const lines = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '').split('\n');
    const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
    const failed = [...new Set(lines.filter((l) => /^\s*(×|FAIL)\s.*>/.test(l)).map((l) => l.trim().replace(/\s\d+ms$/, '').split(' > ').pop()))];
    const received = lines.filter((l) => /^\s*(Expected|Received):/.test(l)).map((l) => l.trim()).slice(0, 4);
    console.log(`\n[${name}] ${summary}`);
    failed.forEach((f) => console.log(`   failed: ${f}`));
    if (name.includes('dropped')) received.forEach((l) => console.log(`   ${l}`));
}
spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
console.log(`\njunction removed: ${!fs.existsSync(nm)}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
if (!fs.existsSync(nm)) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
console.log(`mirror tree deleted: ${!fs.existsSync(TREE)}`);

// A sibling of DESIGN §8's "Q&A" residual? interim already in digits + spelled "percent", final "92%" (a STRICT cut).
const v4 = await import(pathToFileURL(path.join(BR, 'rule-v4.mjs')).href);
const r = v4.createRepair();
r.onTranscript('accuracy reaching 92 percent for each', false, 0);
r.onTranscript('accuracy reaching 92%.', true, 100);
console.log(`\nrule-v4 probe, interim "…92 percent for each", F1 "…92%.", F2 "For each …": ${JSON.stringify(r.onTranscript('For each of those metrics, define the unit of evaluation,', true, 2100))}`);
