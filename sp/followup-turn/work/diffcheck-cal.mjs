// throwaway rule-8 calibration of (1) fill-section2.mjs's 12.4 diff check (normalizeForDiff) and (2) check-grader-questions.mjs's section 2 row checks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const FT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let ok = true;
const check = (n, p, d = '') => { ok &&= !!p; console.log(`${p ? 'OK ' : 'BAD'} ${n}${d ? `  [${d}]` : ''}`); };

// (1) extract normalizeForDiff from fill-section2.mjs
const src = fs.readFileSync(path.join(FT, 'fill-section2.mjs'), 'utf8');
const a = src.indexOf('function normalizeForDiff'), b = src.indexOf('\n}\n', a) + 2;
const NOTE_BEGIN = '<!-- I3-NOTE-BEGIN -->', NOTE_END = '<!-- I3-NOTE-END -->';
const normalizeForDiff = new Function('NOTE_BEGIN', 'NOTE_END', `${src.slice(a, b)}\nreturn normalizeForDiff;`)(NOTE_BEGIN, NOTE_END);
const reg = fs.readFileSync(path.join(FT, 'PREREGISTER-turn-followup.md'), 'utf8');
const filled = fs.readFileSync(path.join(FT, 'section2-filled.md'), 'utf8');
const same = (x, y) => { const p = normalizeForDiff(x), q = normalizeForDiff(y); return p.length === q.length && p.every((l, i) => l === q[i]); };
check('diff check: the real filled copy equals the registered file once §2 cells, the new rows, the block table and the I3 note are normalized away', same(reg, filled));
check('... a changed line in section 1 is a DIFFERENCE', !same(reg, filled.replace('## 1. Instrument', '## 1. Instrument (edited)')));
check('... a changed bar in section 7 is a DIFFERENCE', !same(reg, filled.replace(/ceil\(4R\/21\)/, 'ceil(5R/21)')) || !/ceil\(4R\/21\)/.test(filled));
check('... an edited first cell of a §2 row is a DIFFERENCE', !same(reg, filled.replace('| `followup-turn/gate-report-turn.mjs`', '| `followup-turn/gate-report-turn2.mjs`')));
check('... an added line OUTSIDE the I3 note (appended text) is a DIFFERENCE', !same(reg, `${filled}\nan extra paragraph\n`));
check('... a different sha256 in a hash cell is NOT a difference (that is what the table is for)', same(reg, filled.replace(/(gate-report-turn\.mjs )[0-9a-f]{64}/, '$1' + '0'.repeat(64))));
check('... a longer I3 note is NOT a difference', same(reg, filled.replace(NOTE_END, `- one more fact\n${NOTE_END}`)));

// (2) check-grader-questions: a TMP registration whose judge row / dispatch row is wrong must make it exit non-zero
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cgq-'));
const run = (prereg) => spawnSync(process.execPath, [path.join(FT, 'R', 'scripts', 'check-grader-questions.mjs')], { encoding: 'utf8', env: { ...process.env, TURN_PREREG: prereg } });
let r = run(path.join(FT, 'section2-filled.md'));
check('check-grader-questions on the filled registration: exit 0, both rows OK', r.status === 0 && /judge\.mjs sha256 \w+\.\.\.: section 2 row OK/.test(r.stdout) && /69? bytes|9064 bytes: OK/.test(r.stdout));
const flipRow = (rel) => { const m = new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} ([0-9a-f]{64})`).exec(filled); return filled.replace(m[0], `${rel} ${(m[1][0] === 'a' ? 'b' : 'a')}${m[1].slice(1)}`); };
for (const [name, rel] of [['judge.mjs', 'MAIN/electron/test/golden/interview60.judge.mjs'], ['dispatch text', '../validation-hour/h40d-grader-dispatch.txt']]) {
    const f = path.join(tmp, `${name.replace(/\W/g, '')}.md`); fs.writeFileSync(f, flipRow(rel));
    r = run(f);
    check(`... a flipped ${name} row: exit non-zero`, r.status !== 0, `exit ${r.status}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(ok ? 'DIFFCHECK / CGQ CALIBRATION OK' : 'DIFFCHECK / CGQ CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
