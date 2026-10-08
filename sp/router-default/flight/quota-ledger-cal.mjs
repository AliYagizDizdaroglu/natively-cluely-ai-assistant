// LAB\flight\quota-ledger-cal.mjs: the known-answer check of SP\quota-ledger-today.mjs (spec 10.1, plan Task 18 step 1; fix1: B1 request markers, I1 .log.1 and coverage).
// 1. the quota-day start on each side of 07:00Z, and copies of the ledger with the stale premise / an off-by-one boundary read BAD;
// 2. THE REAL HOUR as the known answer (fix1 B1): the flight-eq hour's app log, preserved in cal-logs\ (a copy made before the next app start rotated it),
//    must read 42 front requests / 11 back requests (spec 10.1, verified here from the app's own per-request markers), plus its warm-ups; the OLD rule (count
//    every line naming a model: 394 / 131) must read BAD against that answer;
// 3. a synthetic tree for the rules (marker kinds, .log.1, coverage, --extra-requests), with a mutant per rule.
// The fixtures hold a meeting transcript: this driver prints COUNTS only, never a log line.
//   node quota-ledger-cal.mjs        writes quota-ledger-cal.txt beside it; exit 0 only if every case reads as expected.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(HERE, '..', '..');
const LEDGER = path.join(SP, 'quota-ledger-today.mjs');
const WORK = path.join(HERE, 'cal', 'ledger');
const FIX = path.join(HERE, 'cal-logs');
const OUT = path.join(HERE, 'quota-ledger-cal.txt');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 120000 });
const resetOf = (r) => /^reset (\S+) /m.exec(r.stdout ?? '')?.[1] ?? '(no reset line)';
const summaryOf = (r) => /^LEDGER-SUMMARY (.*)$/m.exec(r.stdout ?? '')?.[1] ?? '(no LEDGER-SUMMARY line)';
const field = (r, k) => new RegExp(`(?:^| )${k}=(\\S+)`).exec(summaryOf(r))?.[1];
const record = (id, name, good, detail) => { results.push({ id, good }); log(`${good ? 'ok  ' : 'BAD '} ${id.padEnd(4)} ${name}`); log(`      ${detail}`); };
const count = (file, re) => (fs.readFileSync(file, 'utf8').match(re) ?? []).length;

log('quota-ledger-cal.mjs: the quota-day start, the request markers and the coverage of quota-ledger-today.mjs');
log(`ledger under test: ${LEDGER}`);
log('');

// 1. known answers on each side of 07:00Z
const KNOWN = [
    ['K1', '--now 2026-10-07T06:59:59Z (one second before the reset)', '2026-10-07T06:59:59Z', '2026-10-06T07:00:00.000Z'],
    ['K2', '--now 2026-10-07T07:00:00Z (exactly the reset)', '2026-10-07T07:00:00Z', '2026-10-07T07:00:00.000Z'],
    ['K3', '--now 2026-10-07T07:00:01Z', '2026-10-07T07:00:01Z', '2026-10-07T07:00:00.000Z'],
    ['K4', '--now 2026-10-07T00:00:00Z (UTC midnight: the day before still counts)', '2026-10-07T00:00:00Z', '2026-10-06T07:00:00.000Z'],
    ['K5', '--now 2026-10-07T20:00:00Z (the evening fallback, 23:00 TST)', '2026-10-07T20:00:00Z', '2026-10-07T07:00:00.000Z'],
    ['K6', '--now 2026-10-08T06:59:59Z (the fallback hour after UTC midnight, 09:59 TST: still the 10-07 day)', '2026-10-08T06:59:59Z', '2026-10-07T07:00:00.000Z'],
];
log('KNOWN ANSWERS (the real script)');
for (const [id, name, now, want] of KNOWN) {
    const got = resetOf(run(LEDGER, ['--now', now, '--main', path.join(WORK, 'none')]));
    record(id, name, got === want, `reset reads ${got}, want ${want}`);
}
log('');

const src = fs.readFileSync(LEDGER, 'utf8');
const mutate = (name, find, repl) => {
    if (!src.includes(find)) throw new Error(`calibration bug: the text to break is not in the ledger: ${find}`);
    const f = path.join(WORK, `${name}.mjs`);
    fs.writeFileSync(f, src.replace(find, () => repl));
    return f;
};
const STALE = mutate('stale-reset', 'const DAY_START = midnight + 7 * 3600000 <= NOW ? midnight + 7 * 3600000 : midnight - DAY_MS + 7 * 3600000;', 'const DAY_START = Date.parse("2026-10-05T07:00:00Z");');
const OFF1 = mutate('boundary-exclusive', 'midnight + 7 * 3600000 <= NOW ?', 'midnight + 7 * 3600000 < NOW ?');
log('MUTANTS (rule 8: each must turn a known answer BAD, else the known answers prove nothing)');
for (const [id, file, caseId, now, want] of [['X1', STALE, 'K1', KNOWN[0][2], KNOWN[0][3]], ['X2', STALE, 'K2', KNOWN[1][2], KNOWN[1][3]], ['X3', OFF1, 'K2', KNOWN[1][2], KNOWN[1][3]]]) {
    const got = resetOf(run(file, ['--now', now, '--main', path.join(WORK, 'none')]));
    record(id, `${path.basename(file)} on ${caseId}: the known answer must NOT hold`, got !== want, `reset reads ${got}; the right answer would be ${want}`);
}
log('');

// 2. the real hour: the flight-eq app log
const EQ = path.join(FIX, 'eq-natively_debug.log'), EQ1 = path.join(FIX, 'eq-natively_debug.log.1');
const put = (dir, rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); if (typeof text === 'string') fs.writeFileSync(f, text); else fs.copyFileSync(text.copy, f); };
const eqMain = path.join(WORK, 'eq-main-only'), eqBoth = path.join(WORK, 'eq-both');
put(eqMain, 'natively_debug.log', { copy: EQ });
put(eqBoth, 'natively_debug.log', { copy: EQ }); put(eqBoth, 'natively_debug.log.1', { copy: EQ1 });
const fronts = count(EQ, /\[LLMHelper\] verbal hedge: front=gemini-3\.5-flash-lite back=gemini-3\.1-flash-lite trigger=/g);
const backs = count(EQ, /\[LLMHelper\] verbal hedge: back started at /g);
const warm35 = count(EQ, /\[LLMHelper\] gemini-3\.5-flash-lite (?:warmed up in |warmup failed)/g), warm31 = count(EQ, /\[LLMHelper\] gemini-3\.1-flash-lite (?:warmed up in |warmup failed)/g);
const lines35 = count(EQ, /gemini-3\.5-flash-lite/g), lines31 = count(EQ, /gemini-3\.1-flash-lite/g);
record('E0', 'the fixture itself: the app\'s per-request markers in the flight-eq hour log (an independent count, no ledger involved): 42 front starts and 11 back starts (spec 10.1), against the 394 / 131 lines that name a model', fronts === 42 && backs === 11 && lines35 === 394, `front starts ${fronts}, back starts ${backs}, warm-ups ${warm35} (3.5) and ${warm31} (3.1), lines naming 3.5-lite ${lines35}, naming 3.1-lite ${lines31}`);
const NOW_EQ = '2026-10-06T06:59:00Z';
{
    const r = run(LEDGER, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', '0']);
    record('E1', 'the flight-eq hour through the real ledger (main log only, quota day from 2026-10-05T07:00Z): requests sent = 42 + 1 warm-up on 3.5-lite and 11 + 7 warm-ups on 3.1-lite, NOT 394 / 131', field(r, 'used35') === String(42 + warm35) && field(r, 'used31') === String(11 + warm31) && field(r, 'extra') === '0', summaryOf(r));
    const r2 = run(LEDGER, ['--now', NOW_EQ, '--main', eqBoth, '--extra-requests', '0']);
    const f2 = count(EQ1, /verbal hedge: front=gemini-3\.5-flash-lite /g), w35b = count(EQ1, /\[LLMHelper\] gemini-3\.5-flash-lite (?:warmed up in |warmup failed)/g), w31b = count(EQ1, /\[LLMHelper\] gemini-3\.1-flash-lite (?:warmed up in |warmup failed)/g);
    record('E2', 'the same with the rotated .log.1 (the session before it, 2026-10-05T14:49Z..): its requests are added (fix1 I1)', field(r2, 'used35') === String(42 + warm35 + f2 + w35b) && field(r2, 'used31') === String(11 + warm31 + w31b), `${summaryOf(r2)} (.log.1 adds ${f2 + w35b} on 3.5-lite and ${w31b} on 3.1-lite)`);
    const r3 = run(LEDGER, ['--now', '2026-10-06T12:00:00Z', '--main', eqBoth, '--extra-requests', '0']);
    record('E3', 'the next quota day (reset 2026-10-06T07:00Z, after the whole hour): zero requests, complete=yes', field(r3, 'used35') === '0' && field(r3, 'used31') === '0' && field(r3, 'complete') === 'yes', summaryOf(r3));
    const r4 = run(LEDGER, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', '40']);
    record('E4', '--extra-requests 40 is charged to BOTH models and shown as extra=40', field(r4, 'used35') === String(42 + warm35 + 40) && field(r4, 'used31') === String(11 + warm31 + 40) && field(r4, 'extra') === '40', summaryOf(r4));
    const r5 = run(LEDGER, ['--now', NOW_EQ, '--main', eqMain]);
    record('E5', 'without --extra-requests the summary says extra=unset (r7 and write-arming refuse it)', field(r5, 'extra') === 'unset', summaryOf(r5));
    const r6 = run(LEDGER, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', 'abc']);
    record('E6', '--extra-requests abc is refused (exit 2)', r6.status === 2, `exit ${r6.status}`);
    // the old rule, as a mutant: count every line naming a model, as the ledger did before fix1
    const OLD = mutate('old-line-counting', "const f = MARK_FRONT.exec(l);\n        if (f) { bump(counts, f[1]); bump(sent, f[1]); lastBack = f[2]; }\n        else if (MARK_BACK.test(l)) { bump(counts, lastBack); bump(sent, lastBack); }\n        else { const w = MARK_WARM.exec(l); if (w) { bump(counts, w[1]); bump(sent, w[1]); } }\n        for (const m of l.matchAll(LITE)) bump(mentions, m[0]);",
        "for (const m of l.matchAll(LITE)) { bump(mentions, m[0]); bump(counts, m[0]); bump(sent, m[0]); }");
    const o = run(OLD, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', '0']);
    record('X4', 'MUTANT: the OLD line-counting rule on the same hour must read BAD against the known answer (it reads 394 / 131)', !(field(o, 'used35') === String(42 + warm35) && field(o, 'used31') === String(11 + warm31)), summaryOf(o));
    const noFront = mutate('no-front-marker', 'if (f) { bump(counts, f[1]); bump(sent, f[1]); lastBack = f[2]; }', 'if (f) { lastBack = f[2]; }');
    const nf = run(noFront, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', '0']);
    record('X5', 'MUTANT: front starts not counted -> E1 reads BAD', field(nf, 'used35') !== String(42 + warm35), summaryOf(nf));
    const noBack = mutate('no-back-marker', 'else if (MARK_BACK.test(l)) { bump(counts, lastBack); bump(sent, lastBack); }', 'else if (MARK_BACK.test(l)) { }');
    const nb = run(noBack, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', '0']);
    record('X6', 'MUTANT: back starts not counted -> E1 reads BAD', field(nb, 'used31') !== String(11 + warm31), summaryOf(nb));
    const noWarm = mutate('no-warm-markers', 'else { const w = MARK_WARM.exec(l); if (w) { bump(counts, w[1]); bump(sent, w[1]); } }', '');
    const nw = run(noWarm, ['--now', NOW_EQ, '--main', eqMain, '--extra-requests', '0']);
    record('X7', 'MUTANT: warm-ups not counted -> E1 reads BAD', field(nw, 'used35') !== String(42 + warm35) && field(nw, 'used31') !== String(11 + warm31), summaryOf(nw));
    const noOne = mutate('no-log1', 'const files = [`${loc}/natively_debug.log`, `${loc}/natively_debug.log.1`];', 'const files = [`${loc}/natively_debug.log`];');
    const n1 = run(noOne, ['--now', NOW_EQ, '--main', eqBoth, '--extra-requests', '0']);
    record('X8', 'MUTANT: .log.1 not read -> E2 reads BAD', field(n1, 'used35') !== field(r2, 'used35'), summaryOf(n1));
}
log('');

// 3. a synthetic tree: marker kinds, locations, .log.1, coverage
const ST = path.join(WORK, 'tree');
const L = (iso, text) => `${iso} [LOG] ${text}`;
const F = (iso, front = 'gemini-3.5-flash-lite', back = 'gemini-3.1-flash-lite') => L(iso, `[LLMHelper] verbal hedge: front=${front} back=${back} trigger=5000ms`);
put(ST, 'natively_debug.log', [
    L('2026-10-06T00:00:00.000Z', '=== Natively session start'),
    F('2026-10-06T06:59:59.000Z'),                                                   // before the reset: not counted
    F('2026-10-06T07:00:00.000Z'),                                                   // AT the reset: 3.5 +1
    L('2026-10-06T07:00:02.000Z', '[LLMHelper] verbal hedge: back started at 5003ms reason=trigger'),   // 3.1 +1
    L('2026-10-06T07:00:03.000Z', '[LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 5100ms; other=aborted'),   // not a request
    L('2026-10-06T07:00:04.000Z', '[LLMHelper] gemini-3.5-flash-lite usage: thinking=HIGH thoughts=1 out=2 in=3'),   // not a request
    L('2026-10-06T07:00:05.000Z', '[Main] answer source: gemini-3.5-flash-lite (hedge)'),                              // not a request
    L('2026-10-06T08:00:00.000Z', '[LLMHelper] gemini-3.1-flash-lite warmed up in 900ms'),    // 3.1 +1
    L('2026-10-06T08:00:01.000Z', '[LLMHelper] gemini-3.5-flash-lite warmup failed (non-critical): x'),   // 3.5 +1
    'a continuation line without a timestamp, verbal hedge: back started at 1ms',   // no stamp: ignored
].join('\n') + '\n');
put(ST, '.claude/worktrees/live-router/natively_debug.log.1', [
    L('2026-10-06T05:00:00.000Z', '=== Natively session start'),
    F('2026-10-06T09:00:00.000Z', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'),                // 3.5 +1 (from .log.1)
].join('\n') + '\n');
put(ST, '.claude/worktrees/live-router/natively_debug.log', [
    L('2026-10-06T09:30:00.000Z', '=== Natively session start'),
    L('2026-10-06T09:30:01.000Z', '[LLMHelper] verbal hedge: back started at 6000ms reason=front-error'),   // 3.1 +1
].join('\n') + '\n');
const NOW_S = '2026-10-06T12:00:00Z';
{
    const r = run(LEDGER, ['--now', NOW_S, '--main', ST, '--extra-requests', '0']);
    record('S1', 'synthetic: front starts, back starts, warm-ups (ok and failed) counted ONE each; won-by, usage, answer-source lines and a stamp-less line are not; the line before the reset is not; MAIN log + live-router .log.1 + live-router log all read (3.5: 1 + 1 + 1, 3.1: 1 + 1 + 1)', field(r, 'used35') === '3' && field(r, 'used31') === '3', summaryOf(r));
    record('S2', 'the lines are NOT requests: the same tree names a lite model on far more lines than it sent requests', /"gemini-3\.5-flash-lite":[4-9]\d*|"gemini-3\.5-flash-lite":\d{2,}/.test(r.stdout) || /mentions .*"gemini-3\.5-flash-lite":(\d+)/.test(r.stdout) && Number(/mentions .*"gemini-3\.5-flash-lite":(\d+)/.exec(r.stdout)[1]) > 3, (/^mentions .*$/m.exec(r.stdout) ?? ['(none)'])[0]);
    record('S3', 'coverage: MAIN\'s log starts 2026-10-06T00:00Z, before the reset; the live-router chain starts at 05:00Z, before the reset: complete=yes', field(r, 'complete') === 'yes', summaryOf(r));
    const lost = path.join(WORK, 'tree-lost');
    put(lost, 'natively_debug.log', [L('2026-10-06T08:00:00.000Z', '=== Natively session start'), F('2026-10-06T08:01:00.000Z')].join('\n') + '\n');
    const rl = run(LEDGER, ['--now', NOW_S, '--main', lost, '--extra-requests', '0']);
    record('C1', 'coverage: a log with lines in the quota day whose oldest stamp (08:00Z) is AFTER the reset (07:00Z) and no .log.1: complete=no (the earlier part of the day may be rotated away)', field(rl, 'complete') === 'no' && field(rl, 'oldest') === '2026-10-06T08:00:00.000Z', summaryOf(rl));
    put(lost, 'natively_debug.log.1', [L('2026-10-06T06:00:00.000Z', '=== Natively session start'), F('2026-10-06T06:30:00.000Z')].join('\n') + '\n');
    const rl2 = run(LEDGER, ['--now', NOW_S, '--main', lost, '--extra-requests', '0']);
    record('C2', 'coverage: the same with a .log.1 that starts at 06:00Z: complete=yes, oldest=06:00Z', field(rl2, 'complete') === 'yes' && field(rl2, 'oldest') === '2026-10-06T06:00:00.000Z', summaryOf(rl2));
    const idle = path.join(WORK, 'tree-idle');
    put(idle, 'natively_debug.log', [L('2026-10-05T10:00:00.000Z', '=== Natively session start'), F('2026-10-05T10:01:00.000Z')].join('\n') + '\n');
    const ri = run(LEDGER, ['--now', NOW_S, '--main', idle, '--extra-requests', '0']);
    record('C3', 'coverage: a log whose every line is BEFORE the reset (the app did not run in the day): used 0, complete=yes', field(ri, 'used35') === '0' && field(ri, 'complete') === 'yes', summaryOf(ri));
    const rn = run(LEDGER, ['--now', NOW_S, '--main', path.join(WORK, 'no-such-tree'), '--extra-requests', '0']);
    record('C4', 'no log anywhere: used 0, oldest=none (the guard refuses a read with no log at all)', field(rn, 'used35') === '0' && field(rn, 'oldest') === 'none' && /absent/.test(rn.stdout ?? ''), summaryOf(rn));
    const noCov = mutate('no-coverage', 'const lost = today.length > 0 && oldest > DAY_START;', 'const lost = false;');
    const nc = run(noCov, ['--now', NOW_S, '--main', lost.replace('tree-lost', 'tree-lost2'), '--extra-requests', '0']);
    fs.rmSync(path.join(lost, 'natively_debug.log.1'));
    const nc2 = run(noCov, ['--now', NOW_S, '--main', lost, '--extra-requests', '0']);
    record('X9', 'MUTANT: coverage never flagged -> C1 reads BAD', field(nc2, 'complete') !== 'no', summaryOf(nc2));
}
log('');

// 4. ledger-fix5: the run copies the harness keeps (<loc>/electron/test/golden/interview60.runs/*/natively_debug.log), merged with the live logs by line identity
log('RUN COPIES (ledger-fix5): merged by line identity, complete over the union');
{
    const RUNS = 'electron/test/golden/interview60.runs';
    const Wm = (iso) => L(iso, '[LLMHelper] gemini-3.1-flash-lite warmed up in 900ms');
    const liveLines = [L('2026-10-06T08:00:00.000Z', '=== Natively session start'), F('2026-10-06T08:01:00.000Z'), Wm('2026-10-06T08:02:00.000Z')];
    const copyLines = [L('2026-10-06T06:00:00.000Z', '=== Natively session start'), F('2026-10-06T08:01:00.000Z'), Wm('2026-10-06T08:02:00.000Z'), F('2026-10-06T08:30:00.000Z')];
    const mk = (name, live, copy) => { const d = path.join(WORK, name); fs.rmSync(d, { recursive: true, force: true }); if (live) put(d, 'natively_debug.log', live.join('\n') + '\n'); if (copy) put(d, RUNS + '/run-a/natively_debug.log', copy.join('\n') + '\n'); fs.mkdirSync(d, { recursive: true }); return d; };
    const rd = (d, script = LEDGER) => run(script, ['--now', NOW_S, '--main', d, '--extra-requests', '0']);
    const live = mk('rc-live', liveLines, null);
    const both = mk('rc-both', liveLines, copyLines);
    const alone = mk('rc-alone', null, copyLines);
    const dup = mk('rc-dup', [...liveLines, F('2026-10-06T08:01:00.000Z')], copyLines);   // the 08:01 front line twice in the live log, once in the copy
    const rl = rd(live), rb = rd(both), ra = rd(alone), rdp = rd(dup);
    record('R0', 'control, no run copy: the live log alone (starts 08:00Z, after the reset) reads used35=1 used31=1 complete=no', field(rl, 'used35') === '1' && field(rl, 'used31') === '1' && field(rl, 'complete') === 'no', summaryOf(rl));
    record('R1', 'a line present in BOTH the live log and a run copy counts ONCE: the front (08:01) and the warm-up (08:02) are in both, the copy adds one front at 08:30 -> used35=2 used31=1', field(rb, 'used35') === '2' && field(rb, 'used31') === '1', summaryOf(rb));
    record('R2', 'a run copy restores complete=yes (it holds a 06:00Z line, before the reset): complete=yes, oldest=06:00Z, the same counts as R1', field(rb, 'complete') === 'yes' && field(rb, 'oldest') === '2026-10-06T06:00:00.000Z', summaryOf(rb));
    record('R3', 'a run copy ALONE (no live log at all) is read: used35=2 used31=1 complete=yes', field(ra, 'used35') === '2' && field(ra, 'used31') === '1' && field(ra, 'complete') === 'yes', summaryOf(ra));
    record('R4', 'two genuinely identical lines inside ONE source both stay (a multiset union, not a set): the 08:01 front twice in the live log, once in the copy -> used35=3 (2 + the 08:30 one), not 2', field(rdp, 'used35') === '3', summaryOf(rdp));
    const sum = mutate('dedup-summed', 'if (n > (union.get(line) ?? 0)) union.set(line, n);', 'union.set(line, (union.get(line) ?? 0) + n);');
    const ms = rd(both, sum);
    record('X10', 'MUTANT: the sources are SUMMED instead of merged (no de-duplication) -> R1 double-counts (used35=3 ... ) and reads BAD', field(ms, 'used35') !== '2' && field(ms, 'used31') !== '1', summaryOf(ms));
    const set = mutate('dedup-set', 'if (n > (union.get(line) ?? 0)) union.set(line, n);', 'union.set(line, 1);');
    const mt = rd(dup, set);
    record('X11', 'MUTANT: merged as a SET (identical lines inside one file collapse) -> R4 reads BAD', field(mt, 'used35') !== '3', summaryOf(mt));
    const nocopy = mutate('no-run-copies', 'files.push(cf); copies++;', 'copies++;');
    const mn = rd(both, nocopy);
    record('X12', 'MUTANT: run copies not read -> R2 and R3 read BAD (complete=no, no copy-only lines)', field(mn, 'complete') === 'no' && field(rd(alone, nocopy), 'used35') !== '2', summaryOf(mn));
    // the real logs: informational (the live logs change at every app start), the reading as of the build of this fix
    const REAL_MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    const rr = run(LEDGER, ['--now', '2026-10-06T23:03:00Z', '--main', REAL_MAIN, '--extra-requests', '0']);
    log(`INFO real logs at --now 2026-10-06T23:03:00Z (not a gate: the live logs change at every app start; read 100/10/yes when ledger-fix5 was built): ${summaryOf(rr).replace(/ now=\S+/, '')}`);
}
log('');

const bad = results.filter((r) => !r.good);
log(bad.length ? `QUOTA LEDGER CAL: FAILED (${bad.map((b) => b.id).join(', ')})` : `QUOTA LEDGER CAL: OK ${results.length}/${results.length}`);
fs.writeFileSync(OUT, out.join('\n') + '\n');
process.exit(bad.length ? 1 : 0);
