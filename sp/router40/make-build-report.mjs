// Assembles BUILD-REPORT.md from the pieces' hashes and the calibration outputs in cal-out/ (run-all-cals.mjs + mutate-check.mjs write them). Throwaway; no network or model call.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha12 = (f) => createHash('sha256').update(fs.readFileSync(path.join(HERE, f))).digest('hex').slice(0, 12);
const read = (f) => fs.readFileSync(path.join(HERE, 'cal-out', f), 'utf8');
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const PIECES = [
    ['P9', 'pre-run-r40.mjs', ['pre-run-r40.mjs', 'cal-pre-run-r40.mjs'], 'pre-run-r40', 'the pre-run guard (tonight window, tonight line, machine, G sitting, 23:15 / flight-task deadline, same-harness guard, drift, ledger record, CAP\' 60)'],
    ['P2', 'run-r.mjs', ['run-r.mjs', 'mock-session-r.mjs', 'dry-check-r.mjs', 'cal-run-r.mjs'], 'run-r', 'the R runner (+ mock session + dry check)'],
    ['P3', 'read-r.mjs', ['read-r.mjs', 'cal-read-r.mjs'], 'read-r', "R's reader (nine classes)"],
    ['P4', 'lite-l.mjs', ['lite-l.mjs', 'cal-lite-l.mjs', 'cal-fake-fetch.mjs'], 'lite-l', 'the L runner (3.1-lite, write-ahead counter, cap)'],
    ['P5', 'grade/build-blind-r40.mjs', ['grade/build-blind-r40.mjs', 'grade/cal-build-blind-r40.mjs'], 'build-blind-r40', 'the blind grading batch builder'],
    ['P6', 'grade/launch-grader-r40.mjs', ['grade/launch-grader-r40.mjs', 'grade/cal-launch-grader-r40.mjs', 'grade/cal-fake-claude.mjs'], 'launch-grader-r40', 'the grader / classifier launcher'],
    ['P7', 'grade/audit-r40.mjs', ['grade/audit-r40.mjs', 'grade/cal-audit-r40.mjs'], 'audit-r40', 'the session audit (tools CLEAN, memory ABSENT, model PINNED)'],
    ['P8', 'grade/score-r40.mjs', ['grade/score-r40.mjs', 'grade/cal-score-r40.mjs'], 'score-r40', 'the scorer and the section 7 reading'],
    ['P1', 'l38base-dispatch.txt', ['l38base-dispatch.txt', 'cal-p1.mjs', 'grade/check-classify-r40.mjs'], 'p1', 'the l38base classifier dispatch + its calibration reader'],
];
const SUPPORT = ['r40-common.mjs', 'cal-util.mjs', 'run-all-cals.mjs', 'mutate-check.mjs', 'make-build-report.mjs'];
const skips = (name) => read(`${name}.cal.txt`).split('\n').map((l) => /^SKIP  (\S+) \| (.*) \| not run: (.*)$/.exec(l)).filter(Boolean).map((m) => ({ id: m[1], desc: m[2], why: m[3] }));
const parse = (name) => read(`${name}.cal.txt`).split('\n').map((l) => /^(PASS|FAIL)  (\S+) \| (.*) \| expected: (.*) \| actual: (.*)$/.exec(l)).filter(Boolean).map((m) => ({ ok: m[1] === 'PASS', id: m[2], desc: m[3], exp: m[4], act: m[5] }));
const rows = Object.fromEntries(PIECES.map((p) => [p[0], parse(p[3])]));
const total = Object.values(rows).reduce((a, r) => a + r.length, 0), passed = Object.values(rows).reduce((a, r) => a + r.filter((x) => x.ok).length, 0);
const mut = read('mutation-check.txt').trim().split('\n');
const mutSummary = mut.at(-1);
const L = [];
const w = (s = '') => L.push(s);
w('# router40 harness: BUILD REPORT');
w();
w(`Built 2026-10-05 (this file generated ${new Date().toISOString()} UTC) by a Sonnet 5.5 implementer, from \`PREREGISTER-router40.md\` + A1 to A7 (later wins: A7 > A6 > A5 > A4 > A3 > A2 > A1; A5 moved the run to tonight's window, A6 pinned thinking LOW, A7 made R/L sequential and grading all-or-nothing). Piece list = A3.6 as restored by A4. **No Gemini, Live, lite or Claude call of any kind was made**: every case ran on a mock, a stub fetch, the virtual clock of the dry mode, or the stand-in for the claude binary (\`cal-fake-claude.mjs\`, started through followup-turn's own \`TURN_FAKE_CLAUDE\` seam; the launcher in \`--calibration\` refuses to start without it). No key value was read or printed; no prompt or answer text was printed (the live40-r1 reader case compares in-process and prints counts). Nothing under \`SP\\flight-eq\\\` or MAIN was written; no app was started; no scheduled task was registered. The date gates refuse outside the window (section 3), nothing was bypassed.`);
w();
w('## 1. Verdict per piece');
w();
w('| piece | what | primary file (sha256/12) | cases | verdict |');
w('|---|---|---|---|---|');
for (const [id, main, , , what] of PIECES) { const r = rows[id]; const ok = r.every((x) => x.ok); w(`| ${id} | ${what} | \`${main}\` \`${sha12(main)}\` | ${r.filter((x) => x.ok).length}/${r.length} | **${ok ? 'PASS' : 'FAIL'}** |`); }
w();
w(`Total: **${passed}/${total}** known-answer cases PASS. Mutation check (section 5): **${mutSummary.replace('MUTATION CHECK: ', '')}**.`);
w();
w('## 2. Every file, with sha256/12');
w();
w('| piece | file | sha256/12 |');
w('|---|---|---|');
for (const [id, , files] of PIECES) for (const f of files) w(`| ${id} | \`${f}\` | \`${sha12(f)}\` |`);
for (const f of SUPPORT) w(`| support | \`${f}\` | \`${sha12(f)}\` |`);
w();
w('All under `SP\\router40\\`. Sources reused by anchored change (copied or imported, never edited in place): `live40\\run.mjs`, `mock-session.mjs`, `dry-check.mjs` -> P2; `l38r\\read.mjs` classes -> P3; `l38m\\pipeline.mjs` `ask()` + MAIN `interview60.answers.mjs` filter chain -> P4; `live40\\grade\\build-blind.mjs` -> P5; followup-turn `launch-grader.mjs` helpers (imported, `TURN_GRADING_DIR` set before the import) -> P6; `live40\\grade\\audit-tools.mjs` + FR `check-grader-memory.mjs` `scan` + `h40d-grader-models.mjs` -> P7; `live40\\grade\\score.mjs` -> P8; registration Appendix B -> P1. Re-run everything: `node run-all-cals.mjs` (about 35 s); `node mutate-check.mjs` (about 10 min).');
w();
w('## 3. The date gates refuse outside the window (proved, not bypassed)');
w();
w('A5 moved the run into tonight\'s window [2026-10-05 21:45, 23:15) local, so a genuine real invocation is a SAFE gate proof only when the real clock is outside it (inside, it would be the real run). Proof 1: stub-clock cases outside the window (21:44, 23:15, 2026-10-06 00:30 / 10:01) refuse at the date gate on every piece, before the key, any connect/request or any launch. Proof 2: genuine real invocations (no stubs, no `--calibration`) at the real clock the cal ran at; a case the cal could not run safely is listed as SKIPPED below, never counted as PASS.');
w();
const pick = (piece, ids) => rows[piece].filter((x) => ids.includes(x.id));
w('| case | expected | actual |');
w('|---|---|---|');
for (const x of [...pick('P9', ['D1', 'D4', 'D6', 'D7', 'X1', 'X2-L', 'X2-R', 'X3']), ...pick('P2', ['R15', 'R15d', 'R15e', 'R25']), ...pick('P4', ['P4m-7', 'P4m-9', 'P4m-10', 'P4m-11', 'P4n']), ...pick('P6', ['P6-5', 'P6-5b', 'P6-7b', 'P6-9', 'P6-10'])]) w(`| ${esc(x.id)}: ${esc(x.desc)} | ${esc(x.exp)} | ${esc(x.act)} |`);
w();
w('Real-clock cases not run (SKIPPED) in the cal runs recorded above:');
w();
w('| case | what | why not run |');
w('|---|---|---|');
for (const [, , , name] of PIECES) for (const x of skips(name)) w(`| ${esc(x.id)} | ${esc(x.desc)} | ${esc(x.why)} |`);
w();
w('A stub input in a real run exits 2 in P9, P2, P4 and P6 (cases X1, X1b, R25, P4n, P6-7, P6-7b).');
w();
w('## 4. Case tables (case -> expected -> actual), straight from `cal-out\\*.cal.txt`');
for (const [id, main, , name] of PIECES) {
    w();
    w(`### ${id} \`${main}\`  (${rows[id].filter((x) => x.ok).length}/${rows[id].length})`);
    w();
    w('| case | what | expected | actual | |');
    w('|---|---|---|---|---|');
    for (const x of rows[id]) w(`| ${esc(x.id)} | ${esc(x.desc)} | ${esc(x.exp)} | ${esc(x.act)} | ${x.ok ? 'PASS' : '**FAIL**'} |`);
}
w();
w('## 5. Calibration of the calibrations (rule 8): mutations a case must catch');
w();
w('Each row breaks ONE rule in a COPY of this folder (the copy\'s pieces are the ones the cal script spawns) and requires the named case(s) to FAIL; "CAUGHT" = every named case failed.');
w();
w('| result | mutation | must fail | actually failing |');
w('|---|---|---|---|');
for (const l of mut.slice(0, -1)) { const m = /^(CAUGHT|MISSED)\s+(\S+) \| (.*?) \| expected to fail: (.*?) \| actually failing: (.*)$/.exec(l); if (m) w(`| ${m[1]} | ${esc(m[2])} ${esc(m[3])} | ${esc(m[4])} | ${esc(m[5])} |`); else w(`| ? | ${esc(l)} | | |`); }
w();
w(`**${mutSummary}**`);
w();
w(fs.readFileSync(path.join(HERE, 'BUILD-REPORT.tail.md'), 'utf8').trimEnd());
fs.writeFileSync(path.join(HERE, 'BUILD-REPORT.md'), `${L.join('\n')}\n`, 'utf8');
console.log(`wrote BUILD-REPORT.md: ${passed}/${total} cases; ${mutSummary}`);
