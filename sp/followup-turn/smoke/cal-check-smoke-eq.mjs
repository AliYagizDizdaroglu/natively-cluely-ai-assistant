// Calibration of check-smoke-eq.mjs against SYNTHETIC logs (plan Task 10 Step 2). No app, no model, no
// network. Writes its throwaway logs to a temp dir it deletes, runs the checker as a child process and
// compares exit code + the named output line with the expected one. Prints case -> expected -> actual.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const CLIPS = path.join(MAIN, 'electron', 'test', 'golden', 'scenario50-tts-local');
const txt = (id) => { for (const d of [CLIPS, path.join(HERE, 'clips')]) { const p = path.join(d, `${id}.txt`); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } throw new Error(`${id}.txt`); };
const T0 = Date.parse('2026-10-05T10:00:00.000Z');
const IDS = ['S1Q04', 'S1Q04F', 'S1Q06', 'S1Q06F', 'WHY'];
const STARTS = [0, 164_000, 340_000, 504_000, 560_000];   // startedMs offsets (each clip >= 14 s after the previous)
const BASE_DIAG = {
    S1Q04: { gate: 'no-cue', cue: 'none', chars: 0, turn: 1 }, S1Q04F: { gate: 'block', cue: 'constraint', chars: 300, turn: 2 },
    S1Q06: { gate: 'no-cue', cue: 'none', chars: 0, turn: 3 }, S1Q06F: { gate: 'block', cue: 'pronoun', chars: 280, turn: 4 },
    WHY: { gate: 'parent-in-prompt', cue: 'short', chars: 0, turn: 5 },
};
const iso = (ms) => new Date(ms).toISOString();
function build({ mode = 'on', diag = BASE_DIAG, dropPinned = [], dropDiag = [], startup, extra = [], answers = 5, ids = IDS }) {
    const L = [];
    L.push(`${iso(T0 - 5000)} [LOG] ${startup ?? `[Main] earlier question: ${mode}`}`);
    ids.forEach((id, i) => {
        const at = T0 + STARTS[i] + 6000;
        if (!dropPinned.includes(id)) L.push(`${iso(at)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question ${JSON.stringify(txt(id).trim())}`);
        const d = diag[id];
        if (d && !dropDiag.includes(id)) L.push(`${iso(at + 1)} [LOG] [IntelligenceEngine] earlier question: gate=${d.gate} cue=${d.cue} chars=${d.chars} turn=${d.turn} ms=${d.ms ?? 1}`);
        if (i < answers) L.push(`${iso(at + 4000)} [LOG] [Answer] full: ${JSON.stringify('an answer')}`);
    });
    L.push(...extra);
    return { log: L.join('\n') + '\n', played: { played: ids.map((id, i) => ({ id, startedMs: T0 + STARTS[i], endedMs: T0 + STARTS[i] + 3000 })) } };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eqcal-'));
let fails = 0, n = 0;
function run(name, spec, mode, expect) {
    n++;
    const { log, played } = build({ mode, ...spec });
    const lp = path.join(tmp, `c${n}.log`), pp = path.join(tmp, `c${n}.json`);
    fs.writeFileSync(lp, log); fs.writeFileSync(pp, JSON.stringify(played));
    const r = spawnSync(process.execPath, [path.join(HERE, 'check-smoke-eq.mjs'), lp, pp, '--mode', mode], { encoding: 'utf8' });
    const out = r.stdout + r.stderr;
    const okExit = r.status === expect.exit;
    const missing = expect.has.filter((s) => !out.includes(s));
    const ok = okExit && missing.length === 0;
    if (!ok) fails++;
    const first = out.split('\n').find((l) => /CHECK (CLEAN|FAILED)/.test(l)) ?? '(none)';
    const hit = (out.match(/^  - .*$/gm) ?? []).join(' | ');
    console.log(`${ok ? 'OK  ' : 'BAD '} ${name}\n      expected exit ${expect.exit}, output has ${JSON.stringify(expect.has)}\n      actual   exit ${r.status}: ${first}${hit ? ' :: ' + hit : ''}${missing.length ? '  MISSING ' + JSON.stringify(missing) : ''}`);
}
const withDiag = (id, d) => ({ ...BASE_DIAG, [id]: { ...BASE_DIAG[id], ...d } });
// --- the cases Step 2 lists
run('clean five pinned + five diag + five answers', {}, 'on', { exit: 0, has: ['CHECK CLEAN: 5/5 exercised, 5 answers, mode on', 'S1Q04F: gate=block cue=constraint chars=300 turn=2', 'WHY: gate=parent-in-prompt cue=short chars=0 turn=5'] });
run('S1Q04F gate=block flipped to gate=no-cue', { diag: withDiag('S1Q04F', { gate: 'no-cue', cue: 'none', chars: 0 }) }, 'on', { exit: 1, has: ['CHECK FAILED', 'S1Q04F: gate=no-cue, want block'] });
run('S1Q06F pinned line dropped', { dropPinned: ['S1Q06F'] }, 'on', { exit: 1, has: ['S1Q06F: NOT EXERCISED'] });
run('WHY given gate=block cue=short chars=132', { diag: withDiag('WHY', { gate: 'block', cue: 'short', chars: 132 }) }, 'on', { exit: 1, has: ['WHY: gate=block, want parent-in-prompt'] });
run('WHY pinned line dropped', { dropPinned: ['WHY'] }, 'on', { exit: 1, has: ['WHY: NOT EXERCISED'] });
run('mode off, one diag line present', { ids: ['S1Q04', 'S1Q04F'], diag: { S1Q04: BASE_DIAG.S1Q04 }, answers: 2 }, 'off', { exit: 1, has: ['S1Q04: a diag line with the flag unset', 'flag off: an earlier-question diag line exists'] });
// --- extra calibration: the control and the other branches
run('mode off, clean (no diag lines)', { ids: ['S1Q04', 'S1Q04F'], diag: {}, answers: 2 }, 'off', { exit: 0, has: ['CHECK CLEAN: 2/2 exercised, 2 answers, mode off'] });
run('mode on log read with startup line off', { startup: '[Main] earlier question: off' }, 'on', { exit: 1, has: ['startup line is'] });
run('no startup line at all', { startup: '[Main] something else' }, 'on', { exit: 1, has: ['no [Main] earlier question startup line'] });
run('S1Q04F chars=100 (outside 200..578)', { diag: withDiag('S1Q04F', { chars: 100 }) }, 'on', { exit: 1, has: ['S1Q04F: chars=100 outside 200..578'] });
run('S1Q04F chars=579 (outside 200..578)', { diag: withDiag('S1Q04F', { chars: 579 }) }, 'on', { exit: 1, has: ['chars=579 outside'] });
run('S1Q04F chars=578 (the max, inside)', { diag: withDiag('S1Q04F', { chars: 578 }) }, 'on', { exit: 0, has: ['CHECK CLEAN'] });
run('S1Q06F cue=constraint instead of pronoun', { diag: withDiag('S1Q06F', { cue: 'constraint' }) }, 'on', { exit: 1, has: ['S1Q06F: cue=constraint, want pronoun'] });
run('turn ids not increasing', { diag: withDiag('S1Q06', { turn: 9 }) }, 'on', { exit: 1, has: ['turn ids not increasing: 1,2,9,4,5'] });
run('turn=none on a main', { diag: withDiag('S1Q04', { turn: 'none' }) }, 'on', { exit: 1, has: ['S1Q04: turn=none is not a turn id'] });
run('WHY chars=5 on a parent-in-prompt', { diag: withDiag('WHY', { chars: 5 }) }, 'on', { exit: 1, has: ['WHY: chars=5 on a parent-in-prompt'] });
run('a pinned line without its diag line', { dropDiag: ['S1Q04F'] }, 'on', { exit: 1, has: ['S1Q04F: pinned but no earlier-question diag line'] });
run('only 4 answers for 5 clips', { answers: 4 }, 'on', { exit: 1, has: ['4 answers for 5 clips'] });
run('a CRITICAL unhandled rejection in the segment', { extra: [`${iso(T0 + 100_000)} [ERROR] [CRITICAL] Unhandled Rejection at: Promise`] }, 'on', { exit: 1, has: ['CRITICAL unhandled rejection'] });
run('slow build ms=120 is a note, not a failure', { diag: withDiag('S1Q04', { ms: 120 }) }, 'on', { exit: 0, has: ['S1Q04: ms=120 (slow build)', 'CHECK CLEAN'] });
// no-arguments / bad mode usage
const u = spawnSync(process.execPath, [path.join(HERE, 'check-smoke-eq.mjs')], { encoding: 'utf8' });
n++; const uok = u.status === 2 && u.stderr.includes('usage:'); if (!uok) fails++;
console.log(`${uok ? 'OK  ' : 'BAD '} no arguments -> usage\n      expected exit 2 + usage; actual exit ${u.status}`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nCALIBRATION ${fails ? 'FAILED' : 'OK'}: ${n - fails}/${n} cases behaved as expected`);
process.exit(fails ? 1 : 0);
