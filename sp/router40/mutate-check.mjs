// Calibration of the calibrations (rule 8): a mutated COPY of this folder must make the named case(s) FAIL, or the case proves nothing. Each mutation breaks one rule in one piece;
// the matching cal script runs against the copy (R40 follows the copy, so the pieces it spawns are the mutated ones). Prints mutation -> expected failing case(s) -> actual failing case(s).
// Throwaway; makes no network or model call (the cal scripts it runs never do).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2] ?? null;
const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        if (['runs', 'cal-out', 'blind'].includes(e.name) && from === HERE) continue;
        const a = path.join(from, e.name), b = path.join(to, e.name);
        if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
    }
};
const M = [
    // P9
    ['P9', 'a', 'pre-run-r40.mjs', "add('gsitting.log: no STEP without its end', o.length === 0", "add('gsitting.log: no STEP without its end', true", 'cal-pre-run-r40.mjs', ['G1']],
    ["P9", "b", "pre-run-r40.mjs", "local)`, inTonight,", "local)`, true,", "cal-pre-run-r40.mjs", ["D1","D4","D6","D7"]],
    ["P9", "b2", "pre-run-r40.mjs", "inTonight || now >= GATE_START", "true", "cal-pre-run-r40.mjs", ["GR10", "GR10b"]],
    ["P9", "d", "pre-run-r40.mjs", "rl.tonightCount === 1", "rl.tonightCount >= 0", "cal-pre-run-r40.mjs", ["T1","T4"]],
    ["P9", "d2", "pre-run-r40.mjs", "rl.tonightNear === 0", "true", "cal-pre-run-r40.mjs", ["T7"]],
    ["P9", "d3", "pre-run-r40.mjs", "l.trim().startsWith('TONIGHT ') && l.trim() !== TONIGHT_LINE", "l.includes('TONIGHT') && l.trim() !== TONIGHT_LINE", "cal-pre-run-r40.mjs", ["T9","T11"]],
    ["P9", "e", "pre-run-r40.mjs", "ac.R && ac.L, ", "true, ", "cal-pre-run-r40.mjs", ["GR2","GR3"]],
    ["P9", "g", "pre-run-r40.mjs", "cap ?? Infinity);", "Infinity);", "cal-pre-run-r40.mjs", ["FT4","D5"]],
    ["P9", "h", "pre-run-r40.mjs", "now.getUTCDate(), 7, 0, 0", "now.getUTCDate(), 8, 0, 0", "cal-pre-run-r40.mjs", ["D2"]],
    ["P9", "i", "pre-run-r40.mjs", "isNode(p) && p.pid !== own &&", "isNode(p) &&", "cal-pre-run-r40.mjs", ["S9"]],
    ["P9", "i2", "pre-run-r40.mjs", "const pieces = ['run-r', 'lite-l', 'launch-grader-r40'];", "const pieces = ['run-r'];", "cal-pre-run-r40.mjs", ["S1","S4","S6","S7"]],
    ["P9", "k", "pre-run-r40.mjs", "remainingL = (laterItems) => 290000", "remainingL = (laterItems) => 120000", "cal-pre-run-r40.mjs", ["E1"]],
    ["P9", "l", "pre-run-r40.mjs", "gradeEstMs = (launchesLeft) => launchesLeft * 25", "gradeEstMs = (launchesLeft) => 1 * 25", "cal-pre-run-r40.mjs", ["E2"]],
    ["P9", "m", "pre-run-r40.mjs", "res.capPrime = TONIGHT_CAP;", "", "cal-pre-run-r40.mjs", ["B-L","D2"]],
    ["P9", "n", "pre-run-r40.mjs", "realMs: chainRealMs(secs)", "realMs: chainEstMs(secs)", "cal-pre-run-r40.mjs", ["E3"]],
    ['P9', 'c', 'pre-run-r40.mjs', " || (isPs(p) && has(p, 'eq-gsitting'))", '', 'cal-pre-run-r40.mjs', ['G3b']],
    ['P9', 'f', 'pre-run-r40.mjs', 'Math.min(...all) - MIN30', 'Math.min(...all)', 'cal-pre-run-r40.mjs', ['FT1', 'FT6']],
    ['P9', 'j', 'pre-run-r40.mjs', 'if (stubs.length && !cal)', 'if (false)', 'cal-pre-run-r40.mjs', ['X1']],
    // P2
    ['P2', 'a', 'run-r.mjs', "let g = await guardNow(`${chain.chain}#1`, est, sessions.length, { drift: false, ledger: false });", 'let g = start;', 'cal-run-r.mjs', ['R10', 'R12']],
    ['P2', 'b', 'run-r.mjs', "g = await guardNow(`${chain.chain}#2 (retry)`, est, sessions.length, { drift: false, ledger: false });", 'g = start;', 'cal-run-r.mjs', ['R13']],
    ['P2', 'c', 'run-r.mjs', 'health.abnormalAttempts >= 6', 'health.abnormalAttempts >= 7', 'cal-run-r.mjs', ['R21']],
    ['P2', 'd', 'run-r.mjs', "const renamed = !complete && NAME === 'router40-R';", 'const renamed = false;', 'cal-run-r.mjs', ['R23']],
    ['P2', 'e', 'run-r.mjs', 'if (CONNECT_MODEL !== MODEL) {', 'if (false) {', 'cal-run-r.mjs', ['R9']],
    ['P2', 'f', 'run-r.mjs', 'if (set.length && !DRY)', 'if (false)', 'cal-run-r.mjs', ['R25']],
    ['P2', 'g', 'run-r.mjs', "if (!start.ok) {", 'if (false) {', 'cal-run-r.mjs', ['R14', 'R15', 'R16']],
    ['P2', 'h', 'run-r.mjs', 'QUIET_AFTER_TURN_MS = 6000', 'QUIET_AFTER_TURN_MS = 4000', 'cal-run-r.mjs', ['R1']],
    ["P2", "i", "run-r.mjs", "[c.chain, remainingR(EST_ARR, i)]", "[c.chain, 0]", "cal-run-r.mjs", ["R10","R15b"]],
    // P3
    ['P3', 'a', 'read-r.mjs', "else if (toks.slice(-3).includes('hard')) why = 'hard among the last 3 words';", '', 'cal-read-r.mjs', ['P3a-8']],
    ['P3', 'b', 'read-r.mjs', 'rec.turns.some((t, i) => i > 0 &&', 'rec.turns.some((t, i) => i > 5 &&', 'cal-read-r.mjs', ['P3a-9']],
    ['P3', 'c', 'read-r.mjs', 'if (w > REGISTERED[variant].tooLong)', 'if (w >= REGISTERED[variant].tooLong)', 'cal-read-r.mjs', ['P3a-13']],
    ['P3', 'd', 'read-r.mjs', 'if (rec.earlyWords >= 1)', 'if (rec.earlyWords >= 99)', 'cal-read-r.mjs', ['P3a-20']],
    ['P3', 'e', 'read-r.mjs', "else if (toks.slice(0, 12).includes('hard'))", "else if (toks.slice(0, 2).includes('hard'))", 'cal-read-r.mjs', ['P3a-5']],
    ['P3', 'f', 'read-r.mjs', "if (!rec.lastTurnTerminated) return", "if (false) return", 'cal-read-r.mjs', ['P3a-18', 'P3a-19']],
    // P4
    ['P4', 'a', 'lite-l.mjs', 'if (counterLines() >= cap)', 'if (counterLines() > cap)', 'cal-lite-l.mjs', ['P4b']],
    ['P4', 'b', 'lite-l.mjs', 'Math.min(S.cap ?? Infinity, capArg, capPrime)', 'Math.min(capArg, capPrime)', 'cal-lite-l.mjs', ['P4h']],
    ['P4', 'c', 'lite-l.mjs', 'r.modelVersion == null || !r.modelVersion.startsWith(MODEL)', 'false', 'cal-lite-l.mjs', ['P4i', 'P4i-2']],
    ['P4', 'd', 'lite-l.mjs', 'MAX_ATTEMPTS = 3', 'MAX_ATTEMPTS = 2', 'cal-lite-l.mjs', ['P4c']],
    ['P4', 'e', 'lite-l.mjs', 'if (!g.ok) finish(3,', 'if (false) finish(3,', 'cal-lite-l.mjs', ['P4m-1', 'P4m-2']],
    ['P4', 'f', 'lite-l.mjs', 'HOLE_STOP = 3', 'HOLE_STOP = 99', 'cal-lite-l.mjs', ['P4x-1']],
    ['P4', 'g', 'lite-l.mjs', "if (seg !== MODEL) refuse(2,", "if (false) refuse(2,", 'cal-lite-l.mjs', ['P4f-2']],
    ['P4', 'h', 'lite-l.mjs', "if (flag('--model')) refuse(2,", "if (false) refuse(2,", 'cal-lite-l.mjs', ['P4e']],
    ['P4', 'i', 'lite-l.mjs', 'if (S.records[id]) continue;', '', 'cal-lite-l.mjs', ['P4r']],
    ['P4', 'j', 'lite-l.mjs', "if (!takeLock()) refuse(", "if (false) refuse(", 'cal-lite-l.mjs', ['P4k']],
    ['P4', 'k', 'lite-l.mjs', "if (!DRY && !CAL && stubs.length) refuse(", "if (false) refuse(", 'cal-lite-l.mjs', ['P4j', 'P4n']],
    ['P4', 'l', 'lite-l.mjs', "const attemptTimeout = CAL && argOf(argv, '--attempt-timeout-ms')", "const attemptTimeout = false && argOf(argv, '--attempt-timeout-ms')", 'cal-lite-l.mjs', ['P4m-4']],
    ["P4", "m", "r40-common.mjs", "THINKING_LEVEL = 'LOW'", "THINKING_LEVEL = 'HIGH'", "cal-lite-l.mjs", ["P4t-1","P4t-2","P4m-13"]],
    ["P4", "n", "lite-l.mjs", "thinkingConfig: { thinkingLevel: THINKING_LEVEL } };", "thinkingConfig: { thinkingLevel: \"HIGH\" } };", "cal-lite-l.mjs", ["P4t-1"]],
    ["P4", "n2", "lite-l.mjs", "thinkingConfig: { thinkingLevel: THINKING_LEVEL } };", "};", "cal-lite-l.mjs", ["P4t-1"]],
    ["P4", "o", "lite-l.mjs", "estMs: remainingL(later),", "estMs: 120000,", "cal-lite-l.mjs", ["P4m-1"]],
    ["P4", "p", "lite-l.mjs", "+ clockSteps * clockStepMs", "", "cal-lite-l.mjs", ["P4m-8"]],
    ["P4", "q", "lite-l.mjs", "outcome = { ok: { thinking: THINKING_LEVEL, ", "outcome = { ok: { ", "cal-lite-l.mjs", ["P4m-13"]],
    // P5
    ['P5', 'a', 'grade/build-blind-r40.mjs', "if (R_NAME !== 'router40-R') refuse(", 'if (false) refuse(', 'grade/cal-build-blind-r40.mjs', ['P5-11', 'P5-12']],
    ['P5', 'b', 'grade/build-blind-r40.mjs', "shuffle(flat, rng(SEED));", '', 'grade/cal-build-blind-r40.mjs', ['P5-9']],
    ['P5', 'c', 'grade/build-blind-r40.mjs', "const sizes = [12, 12, 12, 11];", 'const sizes = [12, 12, 11, 12];', 'grade/cal-build-blind-r40.mjs', ['P5-3', 'P5-5']],
    ['P5', 'd', 'grade/build-blind-r40.mjs', "if (rRun.complete !== true) refuse(", 'if (false) refuse(', 'grade/cal-build-blind-r40.mjs', ['P5-14']],
    // P6
    ['P6', 'a', 'grade/launch-grader-r40.mjs', 'out[idx[0] + 1] = PIN;', "out[idx[0] + 1] = 'opus';", 'grade/cal-launch-grader-r40.mjs', ['P6-1', 'P6-4']],
    ['P6', 'b', 'grade/launch-grader-r40.mjs', 'if (!g.ok) refuse(3,', 'if (false) refuse(3,', 'grade/cal-launch-grader-r40.mjs', ['P6-5b', 'P6-6', 'P6-15', 'P6-20', 'P6-20c']],
    ['P6', 'c', 'grade/launch-grader-r40.mjs', 'if (liveSlots) refuse(', 'if (false) refuse(', 'grade/cal-launch-grader-r40.mjs', ['P6-3']],
    ['P6', 'd', 'grade/launch-grader-r40.mjs', "if (fs.existsSync(cwd)) refuse(2,", "if (false) refuse(2,", 'grade/cal-launch-grader-r40.mjs', ['P6-2']],
    ['P6', 'e', 'grade/launch-grader-r40.mjs', "if (!DRY && !CAL && stubs.length) refuse(", "if (false) refuse(", 'grade/cal-launch-grader-r40.mjs', ['P6-7']],
    ['P6', 'f', 'grade/launch-grader-r40.mjs', "if (CAL && !process.env.TURN_FAKE_CLAUDE) refuse(", "if (false) refuse(", 'grade/cal-launch-grader-r40.mjs', ['P6-8']],
    ["P6", "g", "grade/launch-grader-r40.mjs", "const launchesLeft = tonight ? Math.max(1, 10 - launched) : 1;", "const launchesLeft = 1;", "grade/cal-launch-grader-r40.mjs", ["P6-15"]],
    // P7
    ['P7', 'a', 'grade/audit-r40.mjs', 'if (/keyhold|key\\.json/i.test(text))', 'if (false)', 'grade/cal-audit-r40.mjs', ['P7-8']],
    ['P7', 'b', 'grade/audit-r40.mjs', "if (!ALLOWED_TOOLS.has(c.name)) flags.push(", "if (false) flags.push(", 'grade/cal-audit-r40.mjs', ['P7-1', 'P7-5']],
    ['P7', 'c', 'grade/audit-r40.mjs', "return { pinned: r.status === 0,", "return { pinned: true,", 'grade/cal-audit-r40.mjs', ['P7-11']],
    // P8
    ['P8', 'a', 'grade/score-r40.mjs', 'afAnswered >= 1 || wrongR > wrongL)', 'afAnswered >= 1 || wrongR > wrongL + 1)', 'grade/cal-score-r40.mjs', ['S-3']],
    ['P8', 'b', 'grade/score-r40.mjs', 'lead < 1000', 'lead <= 1000', 'grade/cal-score-r40.mjs', ['S-6b']],
    ['P8', 'c', 'grade/score-r40.mjs', 'accR <= accL - 3', 'accR < accL - 3', 'grade/cal-score-r40.mjs', ['S-4']],
    ['P8', 'd', 'grade/score-r40.mjs', 'easyCaught < 10', 'easyCaught < 9', 'grade/cal-score-r40.mjs', ['S-5']],
    ['P8', 'e', 'grade/score-r40.mjs', 'M >= 3', 'M >= 4', 'grade/cal-score-r40.mjs', ['S-7']],
    ['P8', 'f', 'grade/score-r40.mjs', "g1.correctness === 2 && g.g1.on_topic === 2 && g.g2.correctness === 2 && g.g2.on_topic === 2", "g1.correctness === 2 && g.g1.on_topic === 2 && g.g2.correctness === 2", 'grade/cal-score-r40.mjs', ['S-def-1']],
    ['P8', 'g', 'grade/score-r40.mjs', '(g.g1.correctness === 0 || g.g2.correctness === 0)', '(g.g1.correctness === 0 && g.g2.correctness === 0)', 'grade/cal-score-r40.mjs', ['S-def-2', 'S-3b']],
    // A8.4 (steps 2, 4, 5, 6)
    ["P9","o","pre-run-r40.mjs","inTonight || now >= GATE_START","inTonight || now > GATE_START","cal-pre-run-r40.mjs",["GR11"]],
    ["P9","p","r40-common.mjs","new Date(2026, 9, 6, 4, 15, 0)","new Date(2026, 9, 6, 10, 0, 0)","cal-pre-run-r40.mjs",["GR5","GR11","GR12"]],
    ["P6","h","r40-common.mjs","new Date(2026, 9, 6, 4, 15, 0)","new Date(2026, 9, 6, 10, 0, 0)","grade/cal-launch-grader-r40.mjs",["P6-5","P6-20b","P6-20d","P6-20e"]],
    ["P6","i","r40-common.mjs","new Date(2026, 9, 6, 4, 15, 0)","new Date(2026, 9, 6, 3, 0, 0)","grade/cal-launch-grader-r40.mjs",["P6-20","P6-20c"]],
    ["P9","q","pre-run-r40.mjs","if (arm === 'grade') { const ac","if (arm === 'grade' && tonightArm) { const ac","cal-pre-run-r40.mjs",["GR9","GR13","GR13b"]],
    ["P3","g","read-r.mjs","mine.slice(ci + 1, di < 0 ? undefined : di)","mine.slice(ci + 1)","cal-read-r.mjs",["P3c-L1","P3c-L2","P3c-L3","P3c-L4"]],
    ["P3","h","read-r.mjs","ans.turns.length >= segs.length","ans.turns.length === segs.length","cal-read-r.mjs",["P3c-L4"]],
    ["P5","e","grade/build-blind-r40.mjs","readRSha256: crypto.createHash('sha256')","readRSha256: crypto.createHash('sha1')","grade/cal-build-blind-r40.mjs",["P5-17"]],
    ["P7","d","grade/audit-r40.mjs","if (recordFile) {","if (false) {","grade/cal-audit-r40.mjs",["P7-18"]],
    ["P7","e","grade/audit-r40.mjs","clean: v.found && v.clean === true","clean: true","grade/cal-audit-r40.mjs",["P7-18","P7-19"]],
    ["P8","h","grade/score-r40.mjs","if (gradingProblems.length) gradingOk = false;","","grade/cal-score-r40.mjs",["S-A1","S-A2","S-A3","S-A4","S-A5","S-A6","S-A7","S-A9"]],
    ["P8", "i", "grade/score-r40.mjs", "const mine = l ? audits.filter((r) => r && r.tag === slot && r.session === l.session_id) : [];", "const mine = audits.filter((r) => r && r.tag === slot);", "grade/cal-score-r40.mjs", ["S-A4", "S-A8"]],
    ["P8", "j", "grade/score-r40.mjs", "else if (!mine.length) out.push(", "else if (false) out.push(", "grade/cal-score-r40.mjs", ["S-A5", "S-A6"]],
    ["P8","k","grade/score-r40.mjs","return { ok: rec.readRSha256 === now,","return { ok: true,","grade/cal-score-r40.mjs",["S-F2","S-F4"]],
    ["P8","m","grade/score-r40.mjs","a.memory === 'ABSENT'","true","grade/cal-score-r40.mjs",["S-A2"]],
    ["P8","n","grade/score-r40.mjs","a.pinned === true","true","grade/cal-score-r40.mjs",["S-A3"]],
    ["P8", "o", "grade/score-r40.mjs", "!mine.every((a) =>", "!mine.slice(-1).every((a) =>", "grade/cal-score-r40.mjs", ["S-A8b"]],
    ["P8", "p", "grade/score-r40.mjs", "return { ok: rec.readerOutputSha256 === now,", "return { ok: true,", "grade/cal-score-r40.mjs", ["S-F6"]],
    ["P8", "q", "grade/score-r40.mjs", "if (!rec?.readerOutputSha256) return { ok: false,", "if (!rec?.readerOutputSha256) return { ok: true,", "grade/cal-score-r40.mjs", ["S-F7"]],
    ["P5", "f", "grade/build-blind-r40.mjs", "readerOutputSha256: readerOutputSha(rows),", "", "grade/cal-build-blind-r40.mjs", ["P5-18"]],
    // live defect: --setting-sources project,local on every claude launch
    ["P6","j","grade/launch-grader-r40.mjs","const out = [...args, '--setting-sources', 'project,local'];","const out = [...args];","grade/cal-launch-grader-r40.mjs",["P6-1d","P6-4c","P6-11b","P6-14b"]],
    ["P6","k","grade/launch-grader-r40.mjs","'--setting-sources', 'project,local']","'--setting-sources', 'user,project,local']","grade/cal-launch-grader-r40.mjs",["P6-1d","P6-4c","P6-11b","P6-14b"]],
    // P1
    ['P1', 'a', 'grade/check-classify-r40.mjs', "m.cls === 'simple' ? 'EASY' : 'HARD'", "m.cls === 'simple' ? 'HARD' : 'EASY'", 'cal-p1.mjs', ['P1-3']],
];
const out = [];
let bad = 0;
for (const [piece, tag, file, find, repl, cal, expect] of M) {
    const name = `${piece}${tag}`;
    if (only && !name.startsWith(only)) continue;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-mut-'));
    copyDir(HERE, tmp);
    const p = path.join(tmp, file);
    let s = fs.readFileSync(p, 'utf8');
    const n = s.split(find).length - 1;
    if (n < 1) { out.push(`MUTATION ${name}: the text to mutate was NOT FOUND in ${file} (a stale mutation)`); console.log(out.at(-1)); bad++; fs.rmSync(tmp, { recursive: true, force: true }); continue; }
    s = s.split(find).join(repl);
    fs.writeFileSync(p, s);
    const r = spawnSync(process.execPath, [path.join(tmp, cal)], { encoding: 'utf8', maxBuffer: 64 << 20, cwd: tmp, env: { ...process.env, R40_MUTATION_RUN: '1' } });
    const failing = [...r.stdout.matchAll(/^FAIL\s+(\S+) \|/gm)].map((m) => m[1]);
    const completed = /cases PASS/.test(r.stdout); // a cal that crashed before its summary proves nothing
    const ok = completed && expect.every((id) => failing.includes(id));
    if (!ok) bad++;
    out.push(`${ok ? 'CAUGHT ' : 'MISSED '} ${name} | ${file}: "${find.slice(0, 48)}${find.length > 48 ? '...' : ''}" -> "${repl.slice(0, 30)}${repl.length > 30 ? '...' : ''}" | expected to fail: ${expect.join(',')} | actually failing: ${failing.length ? failing.join(",") : `none (exit ${r.status})`}${completed ? "" : " [CAL CRASHED: no summary line]"}`);
    console.log(out.at(-1));
    fs.rmSync(tmp, { recursive: true, force: true });
}
const summary = `MUTATION CHECK: ${out.length - bad}/${out.length} mutations caught${bad ? ` -- ${bad} NOT CAUGHT` : ''}`;
console.log(summary);
fs.mkdirSync(path.join(HERE, 'cal-out'), { recursive: true });
if (!only) fs.writeFileSync(path.join(HERE, 'cal-out', 'mutation-check.txt'), `${out.join('\n')}\n${summary}\n`, 'utf8');
process.exit(bad ? 1 : 0);
