// throwaway: the final pass over EVERY self-check, each output saved over its recorded *.out.txt (UTF-8), then fill-section2 last.
// TURN_PREREG = section2-filled.md for every step (the registered file's own section 2 is still empty until the controller adopts the filled one).
// Prints one line per step: exit code, the expected marker line.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const FT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SESSION = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const MAIN_TOP = 'dea53624-07b8-4126-a43f-b9c49064cfff';
const SPD = path.dirname(FT).replace(/\\/g, '/');
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const fill = () => spawnSync(process.execPath, [path.join(FT, 'fill-section2.mjs')], { encoding: 'utf8', cwd: FT });
const f0 = fill();
if (f0.status !== 0) { console.log('fill-section2 (pre) failed'); process.exit(1); }
const env = { ...process.env, TURN_PREREG: path.join(FT, 'section2-filled.md') };
const STEPS = [
    ['ref-test', 'earlierQuestion.ref.test.out.txt', ['earlierQuestion.ref.test.mjs'], 'EARLIER-QUESTION REF TESTS: '],
    ['stamp', 'stamp-turn.out.txt', ['stamp-turn.mjs'], 'STAMP OK'],
    ['decide-cal', 'R/scripts/legs-decide-calibrate.out.txt', ['R/legs-decide.mjs', '--calibrate'], 'CALIBRATION OK'],
    ['mutate', 'R/scripts/mutate-decide.out.txt', ['R/scripts/mutate-decide.mjs'], 'EVERY MUTANT CAUGHT'],
    ['e2e', 'R/scripts/e2e-synthetic.out.txt', ['R/scripts/e2e-synthetic.mjs'], 'E2E OK'],
    ['runner', 'R/scripts/runner-selftest.out.txt', ['R/scripts/runner-selftest.mjs'], 'RUNNER SELF-TEST OK'],
    ['gsc', 'R/scripts/grader-session-calibrate.out.txt', ['R/scripts/grader-session-calibrate.mjs'], 'GRADER-SESSION CALIBRATION OK'],
    ['gsc-C', 'R/audit-graders.negative-control.out.txt', ['R/scripts/grader-session-calibrate.mjs', '--only', 'C'], 'GRADER-SESSION CALIBRATION OK', 'node R/scripts/grader-session-calibrate.mjs --only C'],
    ['gsc-B', 'R/check-grader-memory.probe2.out.txt', ['R/scripts/grader-session-calibrate.mjs', '--only', 'B'], 'GRADER-SESSION CALIBRATION OK', 'node R/scripts/grader-session-calibrate.mjs --only B'],
    ['gsc-F', 'R/audit-graders.point15.out.txt', ['R/scripts/grader-session-calibrate.mjs', '--only', 'F'], 'GRADER-SESSION CALIBRATION OK', 'node R/scripts/grader-session-calibrate.mjs --only F'],
    ['lg-dry-pilot', 'R/launch-grader.pilot-a2.dry-run.out.txt', ['R/launch-grader.mjs', 'pilot', '--pilot', `${FT.replace(/\\/g, '/')}/work/p15/pilot-blind-copy`, '--attempt', '2', '--dry-run'], 'permission rules:', 'node R/launch-grader.mjs pilot --pilot <F>/work/p15/pilot-blind-copy --attempt 2 --dry-run   (NO model call; the copy holds ONLY pairs.blind-1.json of F\\pilot-blind, because F\\pilot-blind itself already holds verdicts.blind-1.g1.json from attempt 1 and the launcher REFUSES a dry-run there until the controller moves it away: "already exists ... move the earlier attempt\'s verdicts away")'],
    ['cgq','R/scripts/check-grader-questions.out.txt', ['R/scripts/check-grader-questions.mjs'], 'instrument 8564ba96369a (pre-registered 8564ba96369a) OK'],
    ['dry-front', 'R/scripts/followup-turn-run.dry-front.out.txt', ['R/scripts/followup-turn-run.mjs', '--leg', 'front', '--dry-run'], 'DRY RUN: 140 calls'],
    ['dry-back', 'R/scripts/followup-turn-run.dry-back.out.txt', ['R/scripts/followup-turn-run.mjs', '--leg', 'back', '--dry-run'], 'DRY RUN: 48 calls'],
    // instrument runs on the real transcripts, re-recorded with the A2 tools (not self-checks)
    ['audit-noflag', 'R/audit-graders.out.txt', ['R/audit-graders.mjs', '--blind-dir', `${SPD}/followup-questions-s50l/blind`, '--session', SESSION, ...['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c']], 'AUDIT: FLAGGED', 'node R/audit-graders.mjs --blind-dir <SP>/followup-questions-s50l/blind --session 9c5886c7-... blind-1.g1=addb84e6bd55778d5 ... blind-4.g2=aa85ea6faa528f27c   (DEFAULT mode, point 15: graders have no Bash -- the 8 real s50l graders are a HISTORICAL shape, flagged by design)'],
    ['audit-flag', 'R/audit-graders.allow-validation-bash.out.txt', ['R/audit-graders.mjs', '--allow-validation-bash', '--blind-dir', `${SPD}/followup-questions-s50l/blind`, '--session', SESSION, ...['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c']], 'AUDIT: all graders clean', 'node R/audit-graders.mjs --allow-validation-bash --blind-dir <SP>/followup-questions-s50l/blind --session 9c5886c7-... (the same 8 graders; WITHDRAWN mode, kept as the historical record only -- point 15)'],
    ['mem-real', 'R/check-grader-memory.out.txt', ['R/check-grader-memory.mjs', '--session', SESSION, 'probe=a9d35e8deacac3eff', `top=session:${MAIN_TOP}`], 'MEMORY CHECK: at least one transcript LOADED', 'node R/check-grader-memory.mjs --session 9c5886c7-... probe=a9d35e8deacac3eff top=session:dea53624-07b8-4126-a43f-b9c49064cfff'],
    ['models-real', 'R/h40d-grader-models.out.txt', ['R/h40d-grader-models.mjs', '--session', SESSION, 'probe=a9d35e8deacac3eff', `top=session:${MAIN_TOP}`], 'ALL GRADERS claude-opus-5-5', 'node R/h40d-grader-models.mjs --session 9c5886c7-... probe=a9d35e8deacac3eff top=session:dea53624-07b8-4126-a43f-b9c49064cfff'],
];
for (const [name, out, args, marker, header] of STEPS) {
    if (only && !only.has(name)) continue;
    const r = spawnSync(process.execPath, args.map((a, i) => (i === 0 ? path.join(FT, a) : a)), { encoding: 'utf8', env, cwd: FT, maxBuffer: 256 << 20 });
    const text = `${r.stdout}${r.stderr}`;
    fs.writeFileSync(path.join(FT, out), header ? `# command: ${header}\n${text}` : text);
    const hit = text.split('\n').find((l) => l.includes(marker));
    console.log(`${name.padEnd(13)} exit ${r.status}  ${hit ? `marker: ${hit.slice(0, 110)}` : `MARKER MISSING (${marker})`}`);
}
if (!only || (only.has('gsc-F') && only.has('lg-dry-pilot'))) {
    const dry = fs.readFileSync(path.join(FT, 'R/launch-grader.pilot-a2.dry-run.out.txt'), 'utf8');
    const argvLine = dry.split('\n').find((l) => l.startsWith('claude -p ')) ?? '';
    const toolsArg = /--tools (\S+)/.exec(argvLine)?.[1];
    const footer = [
        '',
        '=== launcher dry-run, pilot --attempt 2 (full text in R/launch-grader.pilot-a2.dry-run.out.txt; NO model call) ===',
        `argv --tools value: ${toolsArg}`,
        `occurrences of "Bash" in the dry-run output: ${(dry.match(/Bash/g) ?? []).length} (only the "# command:" note, if any, may name it; the argv and the rules: ${((argvLine + dry.split('\n').find((l) => l.startsWith('permission rules:'))).match(/Bash/g) ?? []).length})`,
        `occurrences of "--add-dir" in the dry-run output: ${(dry.match(/--add-dir/g) ?? []).length}`,
        `allowed-tools rules: ${(dry.split('\n').find((l) => l.startsWith('permission rules:')) ?? '').split(' | ').map((x) => x.replace(/^permission rules: /, '').split('(')[0]).join(', ')}`,
        '',
        '=== NOT run by this engineer (each is a model call; the controller runs them before the gate) ===',
        '- pilot --attempt 2 with the real launcher (gate f): exit 0, ABSENT, PINNED, verdicts valid, audit clean (no Bash), dispatch=match',
        '- the negative probe re-run: an outside read DENIED',
        'Evidence in hand, both audited above from their real transcripts: the spike 8a49290e (clean; Read x3, Write x1, exit 0) and the negative probe f8d13b32 (FLAGGED; a Read outside the cwd, DENIED).',
        'Not covered: a real Edit-tool call by a grader (the spike wrote with Write); the exact is_error text of a denied Write / Edit (only a denied Read was observed; the audit accepts any is_error permission / denied message, a toolDenialKind or a permission_denials list).',
        '',
    ].join('\n');
    fs.appendFileSync(path.join(FT, 'R/audit-graders.point15.out.txt'), footer);
}
const f1 = fill();
fs.writeFileSync(path.join(FT, 'fill-section2.out.txt'), f1.stdout + f1.stderr);
console.log(`fill-section2 exit ${f1.status}`);
console.log(f1.stdout.split('\n').slice(0, 3).join('\n'));
