// Known-answer cases of P9 (pre-run-r40.mjs), A3.6 re-based on A5 (tonight window, tonight line, info-only ledger), A6 (no P9 change) and A7 (sequential: same-harness guard restored; L 290 s; grading all-or-nothing; mid-line TONIGHT is not a line).
// Every FAIL case also asserts WHICH check failed, and a PASS base case guards against a case failing for another reason.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluate, REGISTRY, FILTER_PATH, FILTER_SHA16, remainingL, remainingR, gradeEstMs, allChainEsts } from './pre-run-r40.mjs';
import { calRun } from './cal-util.mjs';
import { R40, L40, TONIGHT_LINE as TL } from './r40-common.mjs';

const C = calRun('pre-run-r40');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-cal-p9-'));
const at = (h, m, d = 5) => new Date(2026, 9, d, h, m, 0);
const REAL = fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8');
// the real file minus every TONIGHT line (the cases add their own) and minus the "told" line where a case needs it absent
const RUL0 = REAL.split(/\r?\n/).filter((l) => !l.trim().startsWith('TONIGHT ')).join('\n');
const RUL_NO_TOLD = RUL0.split(/\r?\n/).filter((l) => !l.includes('CONTROLLER')).join('\n');
const F_OK = 'F 2026-10-06: 0 \u2014 G sitting: none today \u2014 nothing pending (calibration stub)';
const TONIGHT = `${RUL0}\n${TL}\n`;
const ledgerText = (n31, n35 = 0, files = []) => `quota day starts 2026-10-05T07:00:00.000Z\n\n1. app logs\n  natively_debug.log: last line none; 0 lines since the reset; lite mentions {"gemini-3.1-flash-lite":${n31},"gemini-3.5-flash-lite":${n35}}\n  x: absent\n\n2. files\n${files.map((f) => `  2026-10-05T08:00:00.000Z  1000  ${f}`).join('\n')}\n  ${files.length} file(s)\n`;
const L_EST = remainingL(46), R_EST = 26.6 * 60000;
const base = (arm = 'L', over = {}) => ({
    arm, now: at(22, 0), estMs: arm === 'L' ? L_EST : arm === 'R' ? R_EST : gradeEstMs(1), scope: { drift: true, ledger: true }, ownPid: 4242,
    rulingsText: TONIGHT, tasks: [], procs: [{ name: 'node.exe', pid: 4242, cmd: 'node cal-pre-run-r40.mjs' }, { name: 'explorer.exe', pid: 1, cmd: '' }],
    gsittingText: null, ledger: { exit: 0, text: ledgerText(0) }, judgeVersion: '8564ba96369a', armsComplete: { R: true, L: true }, ...over,
});
const run = async (ctx) => { const r = await evaluate(ctx); return { ...r, failed: r.checks.filter((c) => !c.ok).map((c) => c.name) }; };
/** A case: expect FAIL naming a check (substring) or PASS; extra() adds an exact-value assertion. */
async function kase(id, desc, ctx, expect, reason, extra) {
    const r = await run(ctx);
    let got = r.ok ? 'PASS' : `FAIL(${r.failed.map((n) => n.slice(0, 40)).join('; ')})`;
    let ok = expect === 'PASS' ? r.ok : !r.ok && (!reason || r.failed.some((n) => n.includes(reason)));
    let exp = expect === 'PASS' ? 'PASS' : `FAIL${reason ? ` at "${reason}"` : ''}`;
    if (extra) { const x = extra(r); exp += ` & ${x.exp}`; got += ` & ${x.act}`; ok = ok && x.ok; }
    C.check(id, desc, exp, got, ok);
    return r;
}
const cap60 = (r) => ({ ok: r.capPrime === 60, exp: "CAP' 60", act: `CAP' ${r.capPrime}` });

// ---- the A7 estimates themselves (m1, m5) ----
C.check('E1', 'remainingL(46) = 290 s + 46 x 40 s', '2130 s', `${remainingL(46) / 1000} s`, remainingL(46) === 2130000);
C.check('E2', 'gradeEstMs(10) = 250 min; gradeEstMs(1) = 25 min', '250 min and 25 min', `${gradeEstMs(10) / 60000} and ${gradeEstMs(1) / 60000} min`, gradeEstMs(10) === 250 * 60000 && gradeEstMs(1) === 25 * 60000);
{ const e = allChainEsts(); const rem = remainingR(e, 0); const sumReal = e.reduce((a, c) => a + c.realMs, 0);
  C.check('E3', 'sum of the 31 realistic chain estimates is about 26.9 min (A7; A5 says live40 measured 26.6); remainingR(0) = worst-case chain 1 + the other 30 realistic', 'realistic sum 26.0..27.5 min and remainingR = est0 + realistic rest', `realistic sum ${(sumReal / 60000).toFixed(2)} min; remainingR ${(rem / 60000).toFixed(2)} min`, rem === e[0].estMs + (sumReal - e[0].realMs) && sumReal / 60000 > 26 && sumReal / 60000 < 27.5); }

// ---- base cases ----
await kase('B-L', 'base bundle, arm L, 2026-10-05 22:00, tonight line, est 2130 s', base('L'), 'PASS', null, cap60);
await kase('B-R', 'base bundle, arm R, 22:00, est 26.6 min', base('R'), 'PASS');
await kase('B-G', 'base bundle, arm grade, 22:30, both arms complete, est 25 min (a last launch)', base('grade', { now: at(22, 30) }), 'PASS');

// ---- date / window (A5.1, A5.6) ----
await kase('D1', '--arm L now 2026-10-05T21:44', base('L', { now: at(21, 44) }), 'FAIL', 'date gate');
await kase('D2', '--arm L now 2026-10-05T22:00 with the tonight line: PASS, CAP\' 60, quota window 2026-10-05T07:00Z', base('L'), 'PASS', null, (r) => ({ ok: r.capPrime === 60 && r.quotaStart === '2026-10-05T07:00:00.000Z', exp: "CAP' 60, window 2026-10-05T07:00:00.000Z", act: `CAP' ${r.capPrime}, window ${r.quotaStart}` }));
await kase('D3', '--arm R now 22:00, est 31 min', base('R', { estMs: 31 * 60000 }), 'PASS');
await kase('D4', '--arm R now 2026-10-05T23:15 (window end is exclusive)', base('R', { now: at(23, 15) }), 'FAIL', 'date gate (R');
await kase('D5', '--arm L now 23:14, est 290 s', base('L', { now: at(23, 14), estMs: 290000 }), 'FAIL', 'now + est < deadline');
await kase('D6', '--arm R now 2026-10-06T10:01 (tomorrow is not the R window)', base('R', { now: at(10, 1, 6) }), 'FAIL', 'date gate (R');
await kase('D7', '--arm L now 2026-10-06T00:30', base('L', { now: at(0, 30, 6) }), 'FAIL', 'date gate (L');
await kase('D8', '--arm R now 21:44', base('R', { now: at(21, 44) }), 'FAIL', 'date gate (R');
await kase('D9', '--arm L 22:00 start check needs 290 + 46 x 40 s: now 22:40 FAIL, 22:39 est 35.5 min PASS? (22:39 + 35.5 min = 23:14.5)', base('L', { now: at(22, 40) }), 'FAIL', 'now + est < deadline');
await kase('D10', '--arm L now 22:39 est 2130 s (negative control for D9: 23:14:30 < 23:15)', base('L', { now: at(22, 39) }), 'PASS');
await kase('D11', 'quota window recorded for L: a real-shaped now of 2026-10-07T00:00 fails on the date gate and the window row', base('L', { now: at(0, 0, 7) }), 'FAIL', 'date gate (L');

// ---- grading (A5.5 + A7 m5) ----
await kase('GR1', '--arm grade now 22:30, both arms complete, est 250 min (all 10 launches) -> FAIL (A7 m5)', base('grade', { now: at(22, 30), estMs: gradeEstMs(10) }), 'FAIL', 'now + est < deadline');
await kase('GR2', '--arm grade now 22:30 with L incomplete (est 25 min)', base('grade', { now: at(22, 30), armsComplete: { R: true, L: false } }), 'FAIL', 'both arms complete');
await kase('GR3', '--arm grade now 22:30 with R incomplete', base('grade', { now: at(22, 30), armsComplete: { R: false, L: true } }), 'FAIL', 'both arms complete');
await kase('GR4', '--arm grade now 22:55 (est 25 min -> 23:20)', base('grade', { now: at(22, 55) }), 'FAIL', 'now + est < deadline');
await kase('GR5', '--arm grade now 2026-10-06T09:59', base('grade', { now: at(9, 59, 6), rulingsText: `${RUL0}\n${F_OK}\n` }), 'FAIL', 'date gate');
await kase('GR6', '--arm grade now 2026-10-06T10:01 with a valid F line (tomorrow rules)', base('grade', { now: at(10, 1, 6), rulingsText: `${RUL0}\n${F_OK}\n`, estMs: gradeEstMs(1) }), 'PASS');
await kase('GR7', '--arm grade now 2026-10-06T10:01 with NO F line', base('grade', { now: at(10, 1, 6), rulingsText: RUL0 }), 'FAIL', 'exactly one valid F line');
await kase('GR8', '--arm grade 10-06T10:01: the tonight line alone does not stand in for the F line', base('grade', { now: at(10, 1, 6), rulingsText: TONIGHT }), 'FAIL', 'exactly one valid F line');
await kase('GR9', '--arm grade 10-06T10:01: arms-complete is not checked tomorrow (A5.5: only tonight)', base('grade', { now: at(10, 1, 6), rulingsText: `${RUL0}\n${F_OK}\n`, armsComplete: { R: false, L: false } }), 'PASS');

// ---- the tonight line (A5.3, A7 m7) ----
await kase('T1', 'no tonight line (R, L)', base('L', { rulingsText: RUL0 }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T1b', 'no tonight line, arm R', base('R', { rulingsText: RUL0 }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T2', 'the exact tonight line once', base('L'), 'PASS');
await kase('T3', 'the exact line ending in CRLF', base('L', { rulingsText: `${RUL0.replace(/\n/g, '\r\n')}\r\n${TL}\r\n` }), 'PASS');
await kase('T4', 'two exact tonight lines', base('L', { rulingsText: `${TONIGHT}${TL}\n` }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T5', 'TONIGHT 2026-10-06: ... (wrong date, no exact line)', base('L', { rulingsText: `${RUL0}\nTONIGHT 2026-10-06: flight-eq not armed; G sitting none\n` }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T6', 'TONIGHT 2026-10-05: flight-eq armed ...', base('L', { rulingsText: `${RUL0}\nTONIGHT 2026-10-05: flight-eq armed; G sitting none\n` }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T7', 'the exact line + a near-miss TONIGHT line', base('L', { rulingsText: `${TONIGHT}TONIGHT 2026-10-05: flight-eq armed\n` }), 'FAIL', 'no near-miss TONIGHT line');
await kase('T8', 'R tonight without the 17:58 "told" line (A5.3: that row is gone for R)', base('R', { rulingsText: `${RUL_NO_TOLD}\n${TL}\n` }), 'PASS');
await kase('T9', 'A7 m7: the exact line + a ruling line with TONIGHT mid-line -> PASS (one line counted)', base('L', { rulingsText: `${TONIGHT}USER 22:00: ok, run it TONIGHT as planned\n` }), 'PASS', null, () => ({ ok: true, exp: 'one counted', act: 'one counted' }));
await kase('T10', 'A7 m7: only a mid-line TONIGHT and no exact line -> FAIL (not counted)', base('L', { rulingsText: `${RUL0}\nUSER 22:00: ok, run it TONIGHT as planned\n` }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T11', 'A7 m7: a mid-line TONIGHT is not a near miss either', base('L', { rulingsText: `${TONIGHT}note TONIGHT 2026-10-05: flight-eq armed\n` }), 'PASS');
await kase('T12', 'the exact line with trailing text on the same line', base('L', { rulingsText: `${RUL0}\n${TL} (and more)\n` }), 'FAIL', 'exactly one exact TONIGHT line');
await kase('T13', 'the F line is NOT required for R or L tonight (no F line anywhere)', base('L'), 'PASS');
await kase('T14', 'a malformed F line does not block R/L tonight', base('R', { rulingsText: `${TONIGHT}F 2026-10-05: 0 - G sitting: none today - x\n` }), 'PASS');

// ---- ledger: recorded, gates nothing (A5.4) ----
await kase('K1', 'stub ledger exit 1 tonight: L still PASS, the failure recorded', base('L', { ledger: { exit: 1, text: ledgerText(0) } }), 'PASS', null, (r) => ({ ok: r.ledger?.exit === 1 && r.info.some((i) => /FAILED/.test(i)), exp: 'recorded exit 1 + FAILED note', act: `exit ${r.ledger?.exit}; note ${r.info.some((i) => /FAILED/.test(i))}` }));
await kase('K2', 'ledger with 3.1-lite 40 and 3.5-lite 7 mentions: both recorded, CAP\' 60', base('L', { ledger: { exit: 0, text: ledgerText(40, 7) } }), 'PASS', null, (r) => ({ ok: r.ledger?.n31 === 40 && r.ledger?.n35 === 7 && r.capPrime === 60, exp: "n31 40, n35 7, CAP' 60", act: `n31 ${r.ledger?.n31}, n35 ${r.ledger?.n35}, CAP' ${r.capPrime}` }));
await kase('K3', 'U=490 (would have refused under A2): still PASS tonight, CAP\' 60', base('L', { ledger: { exit: 0, text: ledgerText(490, 0) } }), 'PASS', null, cap60);
await kase('K4', 'a ledger text with no count line: PASS, recorded as no count line', base('L', { ledger: { exit: 0, text: 'quota day starts x\n' } }), 'PASS', null, (r) => ({ ok: r.info.some((i) => /no count line/.test(i)), exp: 'info says no count line', act: `${r.info.some((i) => /no count line/.test(i))}` }));
await kase('K5', 'listed answers files in the ledger: counted as listed files only', base('L', { ledger: { exit: 0, text: ledgerText(0, 0, ['SP/other/a.answers.json', 'SP/other/b.mjs']) } }), 'PASS', null, (r) => ({ ok: r.ledger?.files === 2, exp: 'listed files 2', act: `listed files ${r.ledger?.files}` }));

// ---- flight tasks (A5.2) ----
const flight = (next, state = 'Ready') => [{ name: 'Natively-flight-eq', state, nextRun: next }];
await kase('FT1', 'Natively-flight-eq NextRunTime 23:00, now 22:00, est 40 min (deadline 22:30)', base('L', { tasks: flight(at(23, 0)), estMs: 40 * 60000 }), 'FAIL', 'now + est < deadline');
await kase('FT2', 'the same task at 23:30, now 22:00, est 40 min (deadline 23:00)', base('L', { tasks: flight(at(23, 30)), estMs: 40 * 60000 }), 'PASS');
await kase('FT3', '23:30, now 22:30, est 40 min (23:10 is past 23:00)', base('L', { now: at(22, 30), tasks: flight(at(23, 30)), estMs: 40 * 60000 }), 'FAIL', 'now + est < deadline');
await kase('FT4', 'no task, now 22:40, est 40 min (the 23:15 cap alone)', base('L', { now: at(22, 40), estMs: 40 * 60000 }), 'FAIL', 'now + est < deadline');
await kase('FT5', 'a flight task Running', base('L', { tasks: flight(null, 'Running') }), 'FAIL', 'no Natively-* task Running');
await kase('FT6', 'tasks at 23:40 and 23:50 -> deadline 23:10 (the min, minus 30 min)', base('L', { tasks: [{ name: 'Natively-a', state: 'Ready', nextRun: at(23, 40) }, { name: 'Natively-b', state: 'Ready', nextRun: at(23, 50) }] }), 'PASS', null, (r) => ({ ok: r.deadline === +at(23, 10), exp: 'deadline 23:10 local', act: `deadline ${new Date(r.deadline).toTimeString().slice(0, 5)} local` }));
await kase('FT7', 'a far task (next day 12:00): the deadline is the 23:15 cap', base('L', { tasks: [{ name: 'Natively-z', state: 'Ready', nextRun: at(12, 0, 6) }] }), 'PASS', null, (r) => ({ ok: r.deadline === +at(23, 15), exp: 'deadline 23:15 local', act: `deadline ${new Date(r.deadline).toTimeString().slice(0, 5)} local` }));

// ---- guards: machine state, G sitting ----
await kase('G1', 'stub gsitting.log with an open STEP', base('L', { gsittingText: '2026-10-05 22:00 STEP arm-3 start\n2026-10-05 22:05 STEP arm-2 start\n2026-10-05 22:06 STEP arm-2 end\n' }), 'FAIL', 'no STEP without its end');
await kase('G1b', 'gsitting.log with every STEP ended (negative control)', base('L', { gsittingText: '2026-10-05 22:00 STEP arm-3 start\n2026-10-05 22:05 STEP arm-3 end\n' }), 'PASS');
await kase('G2', 'a node argv containing eq-gsitting', base('L', { procs: [{ name: 'node.exe', pid: 7, cmd: 'node C:\\x\\eq-gsitting.mjs' }] }), 'FAIL', 'G sitting not running');
await kase('G3', 'a node argv containing interview60.answers.mjs', base('L', { procs: [{ name: 'node.exe', pid: 7, cmd: 'node interview60.answers.mjs --arm A' }] }), 'FAIL', 'G sitting not running');
await kase('G3b', 'a powershell.exe argv containing eq-gsitting', base('L', { procs: [{ name: 'powershell.exe', pid: 7, cmd: 'powershell -File eq-gsitting.ps1' }] }), 'FAIL', 'G sitting not running');
// tomorrow's grading keeps the F line's G-sitting field (A2/A3)
const FT_ = (g) => `${RUL0}\nF 2026-10-06: 0 \u2014 G sitting: ${g} \u2014 x\n`;
const tmr = (over) => base('grade', { now: at(10, 1, 6), estMs: gradeEstMs(1), ...over });
await kase('G4', 'tomorrow grade: F says done, gsitting.log missing', tmr({ rulingsText: FT_('done'), gsittingText: null }), 'FAIL', 'gsitting.log readable');
await kase('G4b', 'tomorrow grade: F says pending from 14:00, gsitting.log missing', tmr({ rulingsText: FT_('pending from 14:00'), gsittingText: null }), 'FAIL', 'gsitting.log readable');
await kase('G5', 'tomorrow grade: pending from 11:00 with now 10:40 (deadline 10:30, est 25 min)', tmr({ now: at(10, 40, 6), rulingsText: FT_('pending from 11:00'), gsittingText: '' }), 'FAIL', 'now + est < deadline');
await kase('G5b', 'tomorrow grade: pending from 11:00 with now 10:01 (negative control: 10:26 < 10:30)', tmr({ rulingsText: FT_('pending from 11:00'), gsittingText: '' }), 'PASS');
await kase('G7', 'a stub task Running (non-flight name)', base('L', { tasks: [{ name: 'Natively-smoke-eq', state: 'Running', nextRun: null }] }), 'FAIL', 'no Natively-* task Running');
await kase('G8', 'a stub process list with electron.exe', base('L', { procs: [{ name: 'electron.exe', pid: 9, cmd: '' }] }), 'FAIL', 'no electron.exe');
await kase('G9', 'a stub process list with tail.exe', base('L', { procs: [{ name: 'tail.exe', pid: 9, cmd: '' }] }), 'FAIL', 'no tail.exe');

// ---- A7 m4: sequential, never concurrent (A3.4 m6 restored) ----
const node = (cmd, pid = 9) => ({ name: 'node.exe', pid, cmd });
await kase('S1', 'arm R with a lite-l.mjs process', base('R', { procs: [node('node C:\\x\\router40\\lite-l.mjs --cap 60')] }), 'FAIL', 'no other router40 harness');
await kase('S2', 'arm R with another run-r.mjs process', base('R', { procs: [node('node C:\\x\\router40\\run-r.mjs --name router40-R')] }), 'FAIL', 'no other router40 harness');
await kase('S3', 'arm L with a run-r.mjs process', base('L', { procs: [node('node C:\\x\\router40\\run-r.mjs --name router40-R')] }), 'FAIL', 'no other router40 harness');
await kase('S4', 'arm L with another lite-l.mjs process', base('L', { procs: [node('node C:\\x\\router40\\lite-l.mjs --cap 60')] }), 'FAIL', 'no other router40 harness');
await kase('S5', 'arm grade with a run-r.mjs process', base('grade', { now: at(22, 30), procs: [node('node C:\\x\\router40\\run-r.mjs')] }), 'FAIL', 'no other router40 harness');
await kase('S6', 'arm grade with a lite-l.mjs process', base('grade', { now: at(22, 30), procs: [node('node C:\\x\\router40\\lite-l.mjs')] }), 'FAIL', 'no other router40 harness');
await kase('S7', 'arm grade with another launch-grader-r40.mjs process', base('grade', { now: at(22, 30), procs: [node('node C:\\x\\router40\\grade\\launch-grader-r40.mjs blind-1.g1')] }), 'FAIL', 'no other router40 harness');
await kase('S8', 'arm R with a launch-grader-r40.mjs process', base('R', { procs: [node('node C:\\x\\router40\\grade\\launch-grader-r40.mjs --classify c3')] }), 'FAIL', 'no other router40 harness');
await kase('S9', 'the same argv under OWN pid (excluded)', base('L', { procs: [node('node C:\\x\\router40\\lite-l.mjs --cap 60', 4242)] }), 'PASS');
await kase('S10', 'a node process that merely mentions another script (no harness piece) does not refuse', base('R', { procs: [node('node C:\\x\\other\\viewer.mjs')] }), 'PASS');

// ---- drift (m7) ----
const victim = path.join(TMP, 'items.copy.json');
fs.copyFileSync(`${L40}/items.json`, victim);
const reg = (extra) => REGISTRY.map((r) => (r.label === 'live40/items.json' ? { ...r, path: victim } : r)).concat(extra ?? []);
await kase('H0', 'a temp copy of a section-0 file, unchanged (negative control)', base('L', { registry: reg() }), 'PASS');
fs.appendFileSync(victim, ' ');
await kase('H1', 'a changed section-0 hash (temp copy of items.json + 1 space)', base('L', { registry: reg() }), 'FAIL', 'hash live40/items.json');
const filterCopy = path.join(TMP, 'filter.copy.js');
fs.copyFileSync(FILTER_PATH, filterCopy);
fs.appendFileSync(filterCopy, '\n');
await kase('H2', 'a changed filter hash (temp copy + 1 newline)', base('L', { registry: REGISTRY.map((r) => (r.sha16 === FILTER_SHA16 ? { ...r, path: filterCopy } : r)) }), 'FAIL', 'hash MAIN dist verbalStreamFilter');
await kase('H3', 'a changed judge instrument version', base('L', { judgeVersion: '000000000000' }), 'FAIL', 'judge instrument');
await kase('H4', 'drift also checked at R start for its inputs (changed items.json copy)', base('R', { registry: reg() }), 'FAIL', 'hash live40/items.json');

// ---- real mode (A3 guard 7): a stub input in a real run exits 2 before anything ----
const cli = (args) => spawnSync(process.execPath, [`${R40}/pre-run-r40.mjs`, ...args], { encoding: 'utf8' });
let r = cli(['--arm', 'L', '--now', '2026-10-05T22:00']);
C.check('X1', 'real mode with --now 2026-10-05T22:00', 'exit 2', `exit ${r.status}`, r.status === 2 && /stub input/.test(r.stdout));
r = cli(['--arm', 'grade', '--stub-arms', 'R,L']);
C.check('X1b', 'real mode with --stub-arms', 'exit 2', `exit ${r.status}`, r.status === 2 && /stub input/.test(r.stdout));
// the REAL clock decides the gate row: the case is calibrated for both sides of the window (expected value computed from the clock, the row read from the output)
const real = new Date(), inWin = +real >= +new Date(2026, 9, 5, 21, 45, 0) && +real < +new Date(2026, 9, 5, 23, 15, 0);
for (const arm of ['L', 'R']) {
    r = cli(['--arm', arm]);
    const pass = new RegExp(`^PASS  date gate \\(${arm}`, 'm').test(r.stdout), fail = new RegExp(`^FAIL  date gate \\(${arm}`, 'm').test(r.stdout);
    C.check(`X2-${arm}`, `real mode, arm ${arm}, no stubs, real clock ${inWin ? 'INSIDE' : 'OUTSIDE'} the window`, inWin ? 'date gate row PASS' : 'date gate row FAIL and exit 1', `gate ${pass ? 'PASS' : fail ? 'FAIL' : 'absent'}; exit ${r.status}`, inWin ? pass : fail && r.status === 1);
}
r = cli(['--arm', 'grade']);
C.check('X3', 'real mode, arm grade, no stubs (before 2026-10-06 10:00: the date gate, or inside the window the 250 min estimate, must FAIL)', 'exit 1', `exit ${r.status}`, r.status === 1);
// the CLI with a calibration stub bundle: PASS path end to end (stub files on disk)
fs.writeFileSync(path.join(TMP, 'rul.txt'), TONIGHT);
fs.writeFileSync(path.join(TMP, 'tasks.json'), '[]');
fs.writeFileSync(path.join(TMP, 'procs.json'), JSON.stringify([{ name: 'explorer.exe', pid: 1, cmd: '' }]));
fs.writeFileSync(path.join(TMP, 'ledger.txt'), ledgerText(3, 1));
const stubArgs = ['--calibration', '--stub-rulings', path.join(TMP, 'rul.txt'), '--stub-tasks', path.join(TMP, 'tasks.json'), '--stub-procs', path.join(TMP, 'procs.json'), '--stub-ledger', path.join(TMP, 'ledger.txt'), '--stub-gsitting', path.join(TMP, 'none.log')];
r = cli(['--arm', 'L', '--now', '2026-10-05T22:00', ...stubArgs]);
const judgeReal = /instrument graderPromptVersion/.test(r.stdout) && !/FAIL  judge/.test(r.stdout);
C.check('X5', 'CLI --calibration, arm L 22:00, full stub bundle (real hashes, real judge instrument import)', "exit 0, CAP' 60, ledger recorded (3 and 1 mentions)", `exit ${r.status}; ${(r.stdout.match(/CAP' \d+\s+\(/) ?? ['no CAP'])[0]}; ledger ${/3\.1-lite mentions 3, 3\.5-lite mentions 1/.test(r.stdout)}; judge ${judgeReal}`, r.status === 0 && /CAP' 60/.test(r.stdout) && /3\.1-lite mentions 3, 3\.5-lite mentions 1/.test(r.stdout) && judgeReal);
r = cli(['--arm', 'L', '--now', '2026-10-05T22:40', ...stubArgs]);
C.check('X6', 'CLI arm L at 22:40 (default est 2130 s runs past 23:15)', 'exit 1', `exit ${r.status}`, r.status === 1 && /FAIL  now \+ est/.test(r.stdout));
r = cli(['--arm', 'grade', '--now', '2026-10-05T22:30', '--stub-arms', 'R,L', ...stubArgs]);
C.check('X7', 'CLI arm grade 22:30, both arms complete, default est (10 launches = 250 min) -> FAIL (A7 m5)', 'exit 1 at the est row, est 15000 s', `exit ${r.status}; est ${(r.stdout.match(/est (\d+) s\)/) ?? [0, '?'])[1]}`, r.status === 1 && /est 15000 s\)/.test(r.stdout) && /FAIL  now \+ est/.test(r.stdout));
r = cli(['--arm', 'R', '--now', '2026-10-05T22:00', '--only', 'C02', ...stubArgs]);
C.check('X8', 'CLI arm R --only C02 at 22:00 (smoke)', 'exit 0', `exit ${r.status}`, r.status === 0);
fs.rmSync(TMP, { recursive: true, force: true });
C.finish();
