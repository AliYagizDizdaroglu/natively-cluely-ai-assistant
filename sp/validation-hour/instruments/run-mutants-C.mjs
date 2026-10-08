// Rule 8 in its strongest form ("break the code and watch it fail"): for each mutant, copy the three brief-C instruments to
// instruments\C-mut\<mNN>\, apply ONE deliberate bug (a textual replacement that must match exactly once), run run-cal-C.mjs against
// the COPY (CAL_INSTRUMENT_DIR / CAL_OUT_DIR), and record whether the calibration noticed: KILLED (one or more cases read NOT as
// expected) or SURVIVED (the calibration cannot see that bug). The real instruments and their saved calibration are never touched.
// Three lanes (one per instrument) run in parallel; each lane owns its own fixture folder, so they do not collide.
//
//   node run-mutants-C.mjs            writes instruments\mutants-C.out.txt
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // VH\instruments
const VH = path.dirname(HERE);
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const FILES = { grader: 'h40d-grader-models.mjs', hascuerule: 'h40d-hascuerule-check.mjs', rule3: 'h40d-rule3.mjs' };

const M = (lane, name, from, to, why) => ({ lane, name, file: FILES[lane], from, to, why });
const mutants = [
    // ---- rule 3 / the noise reading
    M('rule3', 'noise-threshold-2', "gap <= 1 ? 'MET' : 'NOT MET'", "gap <= 2 ? 'MET' : 'NOT MET'", 'the noise condition allows 2 below instead of 1'),
    M('rule3', 'noise-gap-sign', 'const gap = lowest - inShared;', 'const gap = inShared - lowest;', 'the gap is taken the wrong way round'),
    M('rule3', 'noise-lowest-is-max', 'const lowest = Math.min(...twin);', 'const lowest = Math.max(...twin);', 'compares with the best cue rep, not the lowest'),
    M('rule3', 'noise-shared-some', 'maps.every((m) => m.has(id))', 'maps.some((m) => m.has(id))', 'shared ids = in ANY rep instead of ALL three'),
    M('rule3', 'excluded-without-R09F', "const EXCLUDED = ['R02F', 'R04F', 'R09F', 'R11F', 'R13F'];", "const EXCLUDED = ['R02F', 'R04F', 'R11F', 'R13F'];", 'R09F is no longer excluded from 3b'),
    M('rule3', 'floor-34', 'floor: 35,', 'floor: 34,', 'the default floor drifts to 34'),
    M('rule3', 'best-is-first', ".sort((a, b) => RANK[b] - RANK[a])[0] ?? 'unanswered'", "[0] ?? 'unanswered'", '3a takes an item\'s FIRST answer, not its best'),
    M('rule3', '3b-best-only', "as.filter((a) => a.verdict === 'wrong').map", "as.filter((a) => a.verdict === 'wrong' && best(id) === 'wrong').map", '3b counts only an item\'s best answer, not every delivered answer'),
    M('rule3', 'star-some', 'const allBelow = ranks.every((x) => x > rk);', 'const allBelow = ranks.some((x) => x > rk);', 'the table flags in-app below ANY twin, not all three'),
    M('rule3', 'nocue-always-absent', "const noCueAbsent = fam.nocue.every((r) => r.state === 'absent');", 'const noCueAbsent = true;', 'the no-cue column never shows data'),
    M('rule3', 'notmerged-as-absent', "return { tag, state: fs.existsSync(inRun(`interview60.answers.${tag}.json`)) ? 'NOT MERGED' : 'absent', j: null };", "return { tag, state: 'absent', j: null };", 'NOT MERGED and absent are not told apart'),
    M('rule3', 'exit-always-0', 'process.exitCode = ok3a && ok3b ? 0 : 1;', 'process.exitCode = 0;', 'a failing reading exits 0'),
    M('rule3', 'pin-always-match', "${inApp.graderModel === GRADER_PIN.model ? 'MATCH' : 'DIFFERS'}", '${\'MATCH\'}', 'the grader-model pin line cannot say DIFFERS'),
    M('rule3', 'roster-check-off', 'if (roster.length !== 45 || EXCLUDED.some((id) => !roster.includes(id))) {', 'if (false) {', 'a non-holdout40 run folder is read as if it were'),
    M('rule3', 'leak-gated-reasons', "const why = (w) => (opts.reasons ? ` (${w.reason})` : '');", 'const why = (w) => ` (${w.reason})`;', 'the grader reason text leaks into the 3b line'),
    M('rule3', 'leak-notacceptable-reasons', "${opts.reasons ? '  ' + a.reason : ''}", "${'  ' + a.reason}", 'the reason text leaks into the not-acceptable list'),
    // ---- hasCueRule check
    M('hascuerule', 'count-blind', 'const expected = ids.length > 0 && carry === ids.length;', 'const expected = has;', 'the independent count is blinded (it just echoes hasCueRule)'),
    M('hascuerule', 'mutate-noop', 'captured[first].system = String(captured[first].system).split(MARK).join(\'\');', 'void 0;', '--mutate-one strips nothing'),
    M('hascuerule', 'mark-literal', "const MARK = '[CUES FIRST]';", "const MARK = '[CUE FIRST]';", "the check's own mark literal is wrong"),
    M('hascuerule', 'exit-swapped', 'process.exitCode = has ? 0 : 1;', 'process.exitCode = has ? 1 : 0;', 'true and false exit codes swapped'),
    M('hascuerule', 'no-export-check', "if (typeof mod[name] !== 'function') {", 'if (false) {', 'a flight module without hasCueRule is not refused'),
    M('hascuerule', 'leak-prompt', 'console.log(`hasCueRule: ${has}`);', 'console.log(`hasCueRule: ${has}`); console.log(String(Object.values(captured)[0].system).slice(0, 40));', 'a slice of a captured prompt is printed'),
    // ---- grader pin
    M('grader', 'pin-includes', 'real.length === 1 && real[0] === PIN', 'real.includes(PIN)', 'a transcript that holds the pinned model AND another reads PINNED'),
    M('grader', 'synthetic-as-model', 'if (m === SYNTHETIC) synthetic++;', 'if (false) synthetic++;', 'rate-limit placeholders count as a second model (h40c-grader-models.mjs behaviour)'),
    M('grader', 'no-search', 'if (!list.length) {', 'if (false) {', 'the search over every session is disabled'),
    M('grader', 'empty-not-ignored', 'list = all.filter((p) => fs.statSync(p.file).size > 0);', 'list = all;', 'empty .output placeholders are not ignored'),
    M('grader', 'exit-always-0', 'process.exitCode = 1;', 'process.exitCode = 0;', 'a failed pin exits 0'),
    M('grader', 'missing-ignored', 'const missing = results.filter((r) => !r.found);', 'const missing = [];', 'an agent with no transcript does not stop the pin'),
];

mutants.forEach((m, i) => { m.id = `m${String(i + 1).padStart(2, '0')}`; });
const mk = (...p) => { const d = path.join(...p); fs.mkdirSync(d, { recursive: true }); return d; };

function runMutant(m) {
    return new Promise((resolve) => {
        // short folder names (C-mut\mNN): the full path must stay under MAX_PATH for PowerShell 5.1; builder B owns instruments\mutants\
        const dir = mk(HERE, 'C-mut', m.id);
        for (const f of Object.values(FILES)) fs.copyFileSync(path.join(VH, f), path.join(dir, f));
        const file = path.join(dir, m.file);
        const text = fs.readFileSync(file, 'utf8');
        const n = text.split(m.from).length - 1;
        if (n !== 1) { resolve({ ...m, status: `PATTERN MATCHED ${n} TIMES (needs exactly 1): mutant not run` }); return; }
        fs.writeFileSync(file, text.replace(m.from, () => m.to), 'utf8');
        const child = spawn(NODE, [path.join(HERE, 'run-cal-C.mjs'), m.lane], { env: { ...process.env, CAL_INSTRUMENT_DIR: dir, CAL_OUT_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { out += d; });
        child.on('close', (code) => {
            // a leak mutant's calibration output holds the leaked text on purpose: never keep a mutant's -cal.txt
            for (const f of fs.readdirSync(dir)) if (/^h40d-.*-cal\.txt$/.test(f)) fs.rmSync(path.join(dir, f));
            const failed = [...out.matchAll(/NOT AS EXPECTED: ([^\r\n]+)/g)].map((x) => x[1]).join('; ');
            const extra = [/cross-check against noise-gap\.mjs: DIFFERENT/.test(out) ? 'noise-gap cross-check' : '', /byte-identical: false/.test(out) ? 'relocated copy' : ''].filter(Boolean).join(', ');
            const killed = code !== 0;
            resolve({ ...m, status: killed ? `KILLED by ${failed || '(runner exit ' + code + ')'}${extra ? ' + ' + extra : ''}` : 'SURVIVED' });
        });
    });
}

const lanes = ['rule3', 'hascuerule', 'grader'].map(async (lane) => {
    const rows = [];
    for (const m of mutants.filter((x) => x.lane === lane)) {
        const r = await runMutant(m);
        rows.push(r);
        console.log(`${lane} / ${m.name}: ${r.status}`);
    }
    return rows;
});
const all = (await Promise.all(lanes)).flat();
const killed = all.filter((r) => r.status.startsWith('KILLED')).length;
const lines = [
    'Mutation test of the brief-C calibration (rule 8: break the code, watch the calibration fail)',
    `written by instruments\\run-mutants-C.mjs on ${new Date().toISOString()}`,
    '',
    ...all.map((r) => `${r.id} ${r.lane.padEnd(10)} ${r.name.padEnd(28)} ${r.status}\n    bug: ${r.why}`),
    '',
    `SUMMARY: ${killed} of ${all.length} mutants KILLED${killed === all.length ? '' : `; SURVIVORS: ${all.filter((r) => !r.status.startsWith('KILLED')).map((r) => r.name).join(', ')}`}`,
    '',
];
fs.writeFileSync(path.join(HERE, 'mutants-C.out.txt'), lines.join('\n'), 'utf8');
console.log(lines[lines.length - 2]);
process.exitCode = killed === all.length ? 0 : 1;
