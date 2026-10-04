// The controller's gate, AMENDMENT-A2 point 12 (a)-(h), written to R/run.log in order, each with its full command and output.
// Stops at the first gate that does not read as registered: writes `GATE FAILED (A2.12 <letter>): <why>` and exits 2.
// (g) builds the final registration = section2-filled.md (fill-section2.mjs output, which carries A1) + the A2 text appended,
// writes it OVER PREREGISTER-turn-followup.md, hashes it, then runs fill-section2 again to prove section 2 still verifies.
//   node gate.mjs --review <n>      (n = the PREP-REVIEW number whose first line reads exactly "VERDICT: READY")
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const FT = 'C:/Users/sotka/AppData/Local/Temp/claude/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/scratchpad/followup-turn';
const R = `${FT}/R`, LOG = `${R}/run.log`, PROJ = 'C:/Users/sotka/.claude/projects';
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
const log = (s) => fs.appendFileSync(LOG, `${s}\n`);
const fail = (letter, why) => { log(`[${stamp()}] GATE FAILED (A2.12 ${letter}): ${why}`); console.log(`GATE FAILED (A2.12 ${letter}): ${why}`); process.exit(2); };
function run(letter, args, { cwd = FT, expect = [], expectExit = 0, env = {} } = {}) {
    let out, code = 0;
    try { out = execFileSync('node', args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
    const envs = Object.entries(env).map(([k, v]) => `${k}=${v} `).join('');
    log(`[${stamp()}] gate ${letter} -- (cwd ${cwd}) ${envs}node ${args.join(' ')} -> exit ${code}\n${out.trimEnd()}`);
    const missing = expect.filter((m) => !(m instanceof RegExp ? m.test(out) : out.includes(m)));
    if (code !== expectExit || missing.length) fail(letter, `exit ${code} (expected ${expectExit}); missing ${JSON.stringify(missing.map(String))}`);
    console.log(`gate ${letter}: ${path.basename(args[0])} OK`);
    return out;
}
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const n = process.argv[process.argv.indexOf('--review') + 1];
if (!/^\d+$/.test(n ?? '')) { console.log('usage: node gate.mjs --review <n>'); process.exit(2); }
log(`\n[${stamp()}] ===== GATE RUN (A2.12 a-h) =====`);
// (a)
const deleg = fs.readFileSync(`${FT}/USER-DELEGATION.txt`, 'utf8').trim();
if (!deleg.includes(`"do the run tonight regardless, as long as it's verified ready, dont wait for me ok"`)) fail('a', 'USER-DELEGATION.txt does not hold the verbatim quote');
log(`[${stamp()}] USER DELEGATION 2026-10-03 22:52:10: "do the run tonight regardless, as long as it's verified ready, dont wait for me ok"  (from ${FT}/USER-DELEGATION.txt: ${deleg})`);
// (b)
const rev = fs.readFileSync(`${FT}/PREP-REVIEW-${n}.md`, 'utf8').split(/\r?\n/)[0];
if (rev.trim() !== 'VERDICT: READY') fail('b', `PREP-REVIEW-${n}.md first line is "${rev}"`);
log(`[${stamp()}] PREP-REVIEW-${n} READY: ${rev}`);
log(`[${stamp()}] Minor rulings by id: PREP-REVIEW-2 Minors -> as ruled in A2 point 6; PREP-REVIEW-3 M-a -> closed (point 15); PREP-REVIEW-4 I-1 -> fixed (text route, A2 12(c) revision 2026-10-04 00:18, confirmed by PREP-REVIEW-${n}); PREP-REVIEW-4 M-1 -> accepted residual; M-2 -> fixed (superseded markers on points 1(c), 11(c)); M-3 -> accepted residual (every audit command pasted verbatim, none carries the flag); M-4 -> accepted residual; PREP-REVIEW-5 M-5 (12(c) 23:52 sentence and point 15 lines 419/426 say "section C" where the default-mode controls sit in section F) -> accepted residual: the 00:18 revision of 12(c) names section F and R/audit-graders.point15.out.txt explicitly and replaces the 23:52 sentence.`);
// (c) -- A2 point 16: fill-section2 first; e2e-synthetic and runner-selftest verify section 2 of TURN_PREREG = section2-filled.md
run('c', [`${FT}/fill-section2.mjs`], { expect: ['VERIFIES', 'DIFF CHECK (12.4) OK'] });
const FILLED_ENV = { TURN_PREREG: `${FT}/section2-filled.md` };
run('c', [`${FT}/earlierQuestion.ref.test.mjs`], { expect: [/EARLIER-QUESTION REF TESTS: \d+\/\d+ passed/] });
run('c', [`${R}/legs-decide.mjs`, '--calibrate'], { cwd: R, expect: ['CALIBRATION OK'] });
run('c', [`${R}/scripts/mutate-decide.mjs`], { cwd: R, expect: ['EVERY MUTANT CAUGHT'] });
run('c', [`${R}/scripts/e2e-synthetic.mjs`], { cwd: R, env: FILLED_ENV, expect: ['E2E OK'] });
run('c', [`${R}/scripts/runner-selftest.mjs`], { cwd: R, env: FILLED_ENV, expect: ['RUNNER SELF-TEST OK'] });
run('c', [`${R}/scripts/grader-session-calibrate.mjs`], { cwd: R, expect: ['GRADER-SESSION CALIBRATION OK'] });
const p15 = fs.readFileSync(`${R}/audit-graders.point15.out.txt`, 'utf8');
if (!/fde64205-5ecf-4ccf[^\n]*clean; bash=\[\]; dispatch=match/.test(p15)) fail('c', 'point15 out file lacks the pilot attempt 2 clean line');
log(`[${stamp()}] gate c -- outputs named: R/audit-graders.point15.out.txt (sha256 ${sha(`${R}/audit-graders.point15.out.txt`)}; section F + pilot attempt 2 record), R/check-grader-memory.probe2.out.txt (sha256 ${sha(`${R}/check-grader-memory.probe2.out.txt`)}); R/audit-graders.negative-control.out.txt = WITHDRAWN-mode record only (A2 12(c) 00:18)`);
// (d)
run('d', [`${R}/h40d-grader-models.mjs`, '--projects', PROJ, 'probe=session:011ca16e-5258-4124-92fb-3ea525dc85a7'], { cwd: R, expect: [/PINNED/, 'claude-opus-5-5'] });
run('d', [`${R}/check-grader-memory.mjs`, '--projects', PROJ, 'probe2=session:011ca16e-5258-4124-92fb-3ea525dc85a7', 'a9d=a9d35e8deacac3eff'], { cwd: R, expectExit: 1, expect: [/probe2: ABSENT\s+projectMemory=0 claudeMem=0/, /a9d: LOADED/] });
// (e)
run('e', [`${R}/check-grader-memory.mjs`, '--projects', PROJ, 'cwdprobe-1=session:9a33b8ac-f385-4555-8bfb-a6cec2046799', 'cwdprobe-2=session:882eefbb-c300-469b-ba1a-6d42664f985e'], { cwd: R, expect: [/cwdprobe-1: ABSENT\s+projectMemory=0 claudeMem=0/, /cwdprobe-2: ABSENT\s+projectMemory=0 claudeMem=0/] });
const probes = fs.readFileSync(`${R}/grader-cwd.launches.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
for (const t of ['cwdprobe-1', 'cwdprobe-2']) { const p = probes.find((x) => x.slot === t && x.exit === 0); if (!p || p.slugJsonl !== 1) fail('e', `${t}: no exit-0 line with slugJsonl 1`); }
log(`[${stamp()}] gate e -- R/grader-cwd.launches.jsonl: cwdprobe-1 and cwdprobe-2 exit 0, slugJsonl 1 (point 15 M-1: run under the pre-point-15 flags; accepted residual)`);
// (f)
const pc = fs.readFileSync(`${R}/pilot-a2.console.txt`, 'utf8');
const argv = pc.split('\n').find((l) => l.startsWith('claude -p'));
const pl = pc.split('\n').find((l) => l.startsWith('pilot a2'));
const m = /session (\S+) model (\S+) exit 0 .* memory ABSENT projectMemory=0 claudeMem=0 tools \{"Read":\d+,"Write":\d+\} verdicts file valid/.exec(pl ?? '');
if (!m || m[2] !== 'claude-opus-5-5' || !argv || /Bash|--add-dir/.test(argv.replace(/^claude -p "[\s\S]*?" --model/, '--model'))) fail('f', 'pilot attempt 2 line or flags do not read as registered');
const aud = run('f', [`${R}/audit-graders.mjs`, '--blind-dir', `${FT}/pilot-blind`, '--projects', PROJ, `blind-1.g1=session:${m[1]}`], { cwd: R, expect: [/clean; bash=\[\]; dispatch=match/, 'AUDIT: all graders clean'] });
const flags = argv.slice(argv.indexOf('--model'));
log(`[${stamp()}] PILOT OK session=${m[1]} attempt=2 model=claude-opus-5-5 verdicts=valid memory=ABSENT audit=clean(no-bash) dispatch=match flags: ${flags}`);
// (g)
run('g', [`${FT}/fill-section2.mjs`], { expect: ['VERIFIES', 'DIFF CHECK (12.4) OK'] });
const PRE = `${FT}/PREREGISTER-turn-followup.md`;
const before = sha(PRE);
const filled = fs.readFileSync(`${FT}/section2-filled.md`, 'utf8');
const a2 = fs.readFileSync(`${FT}/AMENDMENT-A2.md`, 'utf8');
fs.copyFileSync(PRE, `${FT}/work/PREREGISTER-turn-followup.pre-gate.${before.slice(0, 12)}.md`);
const final = `${filled.replace(/\s*$/, '')}\n\n${a2.replace(/\s*$/, '')}\n`;
fs.writeFileSync(PRE, final);
run('g', [`${FT}/fill-section2.mjs`], { expect: ['VERIFIES'] });
const after = fs.readFileSync(PRE, 'utf8');
if (!after.startsWith(filled.replace(/\s*$/, '')) || !after.includes(a2.trim().split('\n')[0])) fail('g', 'the final registration is not section2-filled.md + A2');
const h = sha(PRE), lwt = fs.statSync(PRE).mtime.toLocaleString('sv-SE', { hour12: false });
log(`[${stamp()}] PREREGISTER-turn-followup.md sha256 ${h} LastWriteTime ${lwt} (was ${before}; = section2-filled.md [registered text + section 2 filled + dated I3 note, DIFF CHECK (12.4) OK against the registered text, which holds A1 on the reviewed 1cec308c...] + AMENDMENT-A2.md appended verbatim; pre-gate copy work/PREREGISTER-turn-followup.pre-gate.${before.slice(0, 12)}.md)`);
log(`[${stamp()}] DELEGATED OK ${h} under A2.12 (user delegation 2026-10-03 22:52:10)`);
// (h)
// day-pre writes its step lines to run.log itself; the markers are checked in what it appended plus its stdout.
const off = fs.statSync(LOG).size;
run('h', [`${R}/day-pre.mjs`, '--approved', h], { cwd: R });
const appended = fs.readFileSync(LOG, 'utf8').slice(off);
const want = ['EQUALS the approved hash', /interview60\.answers\.\* files in [^\n]*: none; STOPPED-\*\.txt markers: none/, /headroom gemini-3\.5-flash-lite[^\n]*needs >= 290: OK/, /headroom gemini-3\.1-flash-lite[^\n]*needs >= 98: OK/, 'preconditions 6.1-6.8 all hold'];
const miss = want.filter((m) => !(m instanceof RegExp ? m.test(appended) : appended.includes(m)));
if (miss.length) fail('h', `day-pre lines missing: ${JSON.stringify(miss.map(String))}`);
log(`[${stamp()}] GATES PASSED (A2.12 a-h) hash ${h}`);
console.log(`GATES PASSED (A2.12 a-h) hash ${h}`);
