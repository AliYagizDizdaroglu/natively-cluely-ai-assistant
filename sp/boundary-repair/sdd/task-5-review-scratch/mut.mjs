// Mutation check of MAIN's interview60.turns-finals.test.ts: the test file runs unchanged (root = MAIN,
// cwd = OS temp); only its module import is aliased to a single-edit mutant written here.
//   node mut.mjs [root] [testFilter]   (defaults: MAIN and the real test file)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
const ROOT = process.argv[2] ?? MAIN;
const FILTER = process.argv[3] ?? 'electron/test/golden/interview60.turns-finals.test.ts';
const SRC = fs.readFileSync(process.env.T5_SRC ?? path.join(MAIN, 'electron/test/golden/interview60.turns-finals.mjs'), 'utf8');
const DIR = path.join(HERE, 'mut');
fs.mkdirSync(DIR, { recursive: true });

const edit = (from, to) => { const n = SRC.split(from).length - 1; if (n !== 1) throw new Error(`edit hits ${n} places: ${from}`); return SRC.replace(from, to); };
const MUTANTS = [
    ['copy', 'identical copy (alias control)', SRC, ''],
    ['canary', 'throws on import (alias is live)', `throw new Error('T5 CANARY');\n${SRC}`, 'COLLECT'],
    ['two-up', 'pairs a final with the line two below it', edit('lines[i + 1]?.match(REPAIR)', 'lines[i + 2]?.match(REPAIR)'), 'T1 T2 T3'],
    ['up-to-two', 'repair taken from line +1 or +2', edit('lines[i + 1]?.match(REPAIR)', '(lines[i + 1]?.match(REPAIR) ?? lines[i + 2]?.match(REPAIR))'), 'T1 T2 T3'],
    ['line-above', 'repair taken from the line above', edit('lines[i + 1]?.match(REPAIR)', 'lines[i - 1]?.match(REPAIR)'), 'T1 T2'],
    ['ignore-repair', 'repair line ignored', edit('const rep = lines[i + 1]?.match(REPAIR);', 'const rep = null;'), 'T1 T2'],
    ['appended', 'restored appended, not prepended', edit('`${unq(rep[1])} ${unq(m[2])}`', '`${unq(m[2])} ${unq(rep[1])}`'), 'T1 T2'],
    ['interims', 'interims parsed as finals', edit('isFinal=true', 'isFinal=\\w+'), 'T1 P1 P2'],
    ['no-empty', 'no empty-text filter', edit('if (text && at >= sinceMs)', 'if (at >= sinceMs)'), 'T1 P1 P2'],
    ['no-since', 'no since filter', edit('if (text && at >= sinceMs)', 'if (text)'), 'T2 P1 P2'],
    ['no-trim', 'no .trim()', edit(': unq(m[2])).trim();', ': unq(m[2]));'), ''],
    ['gt-since', '`>` for `>=` at since', edit('at >= sinceMs', 'at > sinceMs'), ''],
    ...(process.env.T5_SET === 'd' ? [
        ['no-orphan-throw', 'D: orphan check removed', edit("            if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw new Error(`finalsFrom: line ${i + 1} is a boundary repair with no final directly above it`);\n", ''), 'R'],
        ['no-before-check', 'D: before-text check removed', edit("        if (rep && !lines[i + 1].includes(`before \"${m[2].slice(0, 40)}\"`)) throw new Error(`finalsFrom: line ${i + 2} is a boundary repair for another final than line ${i + 1}`);\n", ''), 'R'],
        ['weak-orphan', 'D: orphan refused only under a repair', edit("!FINAL.test(lines[i - 1] ?? '')", "REPAIR.test(lines[i - 1] ?? '')"), 'R'],
    ] : []),
];
const only = process.env.T5_ONLY?.split(',');
const ids = (name) => name.includes('a final directly followed') ? 'T1' : name.includes('keeps interims') ? 'T2' : name.includes('not the very next line') ? 'T3'
    : name.includes('s50a') ? 'P1' : name.includes('after9') ? 'P2' : name.includes('refuses') ? 'R' : name.includes('pads') ? 'W' : `?(${name.slice(0, 40)})`;
for (const [id, what, text, predicted] of MUTANTS) {
    if (only && !only.includes(id)) continue;
    const file = path.join(DIR, `${id}.mjs`);
    fs.writeFileSync(file, text);
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', ROOT, '--config', path.join(HERE, 'vc.mjs'), FILTER, '--reporter', 'verbose'],
        { cwd: os.tmpdir(), encoding: 'utf8', env: { ...process.env, T5_MUTANT: file.replace(/\\/g, '/'), T5_CACHE: path.join(HERE, '.vc').replace(/\\/g, '/') }, timeout: 180000 });
    const out = `${r.stdout}\n${r.stderr}`;
    const failed = [], passed = [], skipped = [];
    for (const line of out.split('\n')) {
        const m = line.match(/^\s*([✓×↓])\s+\S+\.test\.ts\s+>\s+.*?>\s+(.*?)(?:\s+\d+ms)?\s*$/);
        if (m) (m[1] === '✓' ? passed : m[1] === '×' ? failed : skipped).push(ids(m[2]));
    }
    const summary = out.split('\n').filter((l) => /^\s*(Test Files|Tests)\s/.test(l)).map((l) => l.trim()).join(' | ');
    if (process.env.T5_GREP) for (const l of out.split('\n')) if (new RegExp(process.env.T5_GREP).test(l)) console.log(`    | ${l.trim().slice(0, 200)}`);
    const collect = /T5 CANARY|Failed to (load|resolve)|no tests/.test(out) && !passed.length && !failed.length;
    const got = collect ? 'COLLECT' : failed.sort().join(' ');
    console.log(`${id.padEnd(13)} ${what.padEnd(42)} failing: ${(got || '-').padEnd(10)} predicted: ${(predicted || '-').padEnd(10)} ${got === predicted ? 'AS PREDICTED' : 'UNEXPECTED'}${skipped.length ? `  skipped: ${skipped.join(' ')}` : ''}  [${summary}]`);
}
