// LAB\flight\write-arming-rd-cal.mjs: calibration of write-arming-rd.mjs (plan Task 18 step 5). The REAL script runs as a child, with --out into
// LAB\flight\cal\arming-out (never the real record path ARMING-flight-rd.md, which this driver proves it did not touch) and --now fixing the clock.
// Each case is a known answer: the T windows (inclusive bounds), the T - 10 min refusal (the boundary second on each side), the body rules
// (one T: line, the registration seal, the fresh ledger read, headroom 224 / 90), the precheck gate pattern proven on its known answers (a
// mutant precheck file that accepts a fraction must be refused), and the written record's last line against the precheck's own pattern
// evaluated by PowerShell. Then a mutation suite (rule 8): copies of the script with one rule switched off, over the cases that must notice it.
//   node write-arming-rd-cal.mjs        writes write-arming-rd-cal.txt beside it; exit 0 only if every case reads as expected.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(HERE, 'write-arming-rd.mjs');
const PRECHECK = path.join(HERE, 'rd-precheck.ps1');
const WORK = path.join(HERE, 'cal', 'arming-out');
const REAL_RECORD = path.join(HERE, 'ARMING-flight-rd.md');
const OUT = path.join(HERE, 'write-arming-rd-cal.txt');
const shaOf = (f) => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : null);
const realBefore = shaOf(REAL_RECORD);
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

const SEAL = crypto.createHash('sha256').update('stub registration text').digest('hex');
// fix1 M2: a throwaway repo holding the registration as COMMITTED (the seal must equal its sha256), and an empty one (nothing committed)
import { execFileSync } from 'node:child_process';
const mkRepo = (name, files) => {
    const d = path.join(WORK, name);
    fs.mkdirSync(d, { recursive: true });
    const g = (...a) => execFileSync('git', ['--no-optional-locks', '-C', d, ...a], { stdio: ['ignore', 'pipe', 'pipe'] });
    g('init', '-q'); g('config', 'core.autocrlf', 'false');
    fs.writeFileSync(path.join(d, '.keep'), '');
    for (const [rel, text] of Object.entries(files)) { const p = path.join(d, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
    g('add', '-A'); g('-c', 'user.name=cal', '-c', 'user.email=cal@example.invalid', 'commit', '-q', '-m', 'stub');
    return d;
};
const ERRLOG_ABSENT = path.join(WORK, 'no-such-launcher-error.log');
const ERRLOG_PRESENT = path.join(WORK, 'launcher-error-present.log');
fs.writeFileSync(ERRLOG_PRESENT, 'behavioural guard failed - see flight-rd-dry.launcher.log\n');
const REPO = mkRepo('repo-registered', { 'electron/test/golden/passes/PREREGISTER-router-default.md': 'stub registration text' });
const REPO_OTHER = mkRepo('repo-other-text', { 'electron/test/golden/passes/PREREGISTER-router-default.md': 'a DIFFERENT registration text' });
const REPO_EMPTY = mkRepo('repo-empty', {});
const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);

// the quota-day start of an instant, as the ledger derives it
const resetOf = (ms) => { const DAY = 86400000, mid = Math.floor(ms / DAY) * DAY; return new Date(mid + 7 * 3600000 <= ms ? mid + 7 * 3600000 : mid - DAY + 7 * 3600000).toISOString(); };
const bodyFor = (T, nowIso, o = {}) => {
    const reset = o.reset ?? resetOf(Date.parse(nowIso));
    const h35 = o.h35 ?? 400, h31 = o.h31 ?? 450;
    const ledgerNow = o.ledgerNow ?? new Date(Date.parse(nowIso) - 5 * 60000).toISOString();
    const ledger = (r, a, b, ha, hb) => `LEDGER-SUMMARY reset=${r} now=${ledgerNow} cap=500 used35=${a} used31=${b} extra=${o.extra ?? '12'} headroom35=${ha} headroom31=${hb} complete=${o.ledgerComplete ?? 'yes'} oldest=${o.oldest ?? '2026-10-06T01:00:00.000Z'}`;
    const lines = ['# arming record (calibration stub)', ...(o.noT ? [] : [`T: ${o.T ?? T}`]), ...(o.twoT ? [`T: ${T}`] : []), `registration sha256: ${o.seal ?? SEAL}`,
        ...(o.noLedger ? [] : [ledger(reset, 500 - h35, 500 - h31, h35, h31)]), ...(o.twoLedger ? [ledger(reset, 1, 1, 499, 499)] : []),
        ...(o.complete ? ['ARMING COMPLETE 2026-10-07T20:00:00+03'] : [])];
    return `${lines.join('\n')}\n`;
};
let n = 0;
function run(id, name, { t, now, body, seal = SEAL, extra = [], precheck, noBody = false, noSeal = false, noT = false, root = REPO, errorLog = ERRLOG_ABSENT }, want) {
    const dir = path.join(WORK, `case-${String(++n).padStart(2, '0')}-${id}`);
    fs.mkdirSync(dir, { recursive: true });
    const bodyFile = path.join(dir, 'body.md');
    if (!noBody) fs.writeFileSync(bodyFile, body ?? bodyFor(t, now));
    const args = [...(noT ? [] : ['--t', t]), ...(noSeal ? [] : ['--seal', seal]), '--body', bodyFile, '--now', now, '--out', dir, '--root', root, '--error-log', errorLog, ...(precheck ? ['--precheck', precheck] : []), ...extra];
    const r = spawnSync(process.execPath, [globalThis.__TOOL ?? TOOL, ...args], { encoding: 'utf8', timeout: 60000 });
    const stdout = (r.stdout ?? '').trim();
    const rec = path.join(dir, 'ARMING-flight-rd.md');
    const why = [];
    if (r.status !== want.exit) why.push(`exit ${r.status}, wanted ${want.exit}`);
    for (const s of want.contains ?? []) if (!stdout.includes(s)) why.push(`stdout lacks ${JSON.stringify(s)}`);
    if (want.exit === 0) {
        if (!fs.existsSync(rec)) why.push('no record written');
        else {
            const text = fs.readFileSync(rec, 'utf8');
            const lines = text.replace(/\n+$/, '').split('\n');
            const stampWant = new Date(Date.parse(now) + 3 * 3600000).toISOString().slice(0, 19) + '+03';
            if (lines[lines.length - 1] !== `ARMING COMPLETE ${stampWant}`) why.push(`last line ${JSON.stringify(lines[lines.length - 1])}, wanted ARMING COMPLETE ${stampWant}`);
            if (!/^ARMING COMPLETE \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+03$/.test(lines[lines.length - 1])) why.push('the last line is not in the precheck\'s exact shape (independent regex)');
            if (lines.filter((l) => /^T: /.test(l)).length !== 1) why.push('the record does not hold exactly one T: line');
            if (!text.includes(SEAL)) why.push('the record lost the seal');
            if (fs.existsSync(`${rec}.tmp`)) why.push('a .tmp file was left behind');
        }
    } else {
        if (fs.existsSync(rec) || fs.existsSync(`${rec}.tmp`)) why.push('a record or .tmp was written on a refusal');
    }
    results.push({ id, good: why.length === 0 });
    log(`${why.length === 0 ? 'ok  ' : 'BAD '} ${id.padEnd(5)} ${name}`);
    log(`      exit ${r.status} :: ${clip(stdout.split(/\r?\n/).pop() ?? '(no output)', 260)}`);
    if (why.length) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
    return { r, dir, rec };
}
const REFUSED = (s) => ({ exit: 2, contains: ['REFUSED: ', s] });
const OK0 = { exit: 0, contains: ['WROTE ARMING-flight-rd.md'] };
const iso = (s) => `${s.replace(' ', 'T')}:00+03:00`;

log('write-arming-rd.mjs calibration (plan Task 18 step 5)');
log(`script under test: ${TOOL} sha256/12 ${shaOf(TOOL).slice(0, 12)}; the gate pattern is read from ${PRECHECK} sha256/12 ${shaOf(PRECHECK).slice(0, 12)}`);
log('every case: --out a case folder under LAB\\flight\\cal\\arming-out, --now a fixed instant, --body a stub; the real record path is never written');
log('');

// 1. the fallback T and the morning T
run('W1', 'the expected fallback: T 2026-10-07 23:00, now 22:30:00 -> written, last line = the stamp of now, one T: line, the seal kept', { t: '2026-10-07 23:00', now: iso('2026-10-07 22:30') }, OK0);
run('W2', 'the morning T: T 2026-10-07 08:00, now 07:40 -> written (the quota day is the 10-06 one: the body\'s ledger reset differs from W1\'s)', { t: '2026-10-07 08:00', now: iso('2026-10-07 07:40') }, OK0);
// 2. fix2: T is bounded by the quota day (T + 75 min inside one quota day, reset 10:00 local) and the horizon (now + 24 h); a T in the past by T - 10 min. No fixed windows.
for (const [id, t, nowS, what] of [['B1', '2026-10-07 08:44', '2026-10-07 08:20', 'the last T whose run ends before the reset'], ['B2', '2026-10-07 10:00', '2026-10-07 09:30', 'T exactly at the reset'], ['B3', '2026-10-08 00:00', '2026-10-07 00:00', 'exactly now + 24 h'], ['B4', '2026-10-08 08:44', '2026-10-08 08:00', 'the next day, the last T before the reset']]) {
    run(id, `T ${t} (${what}), now ${nowS} -> written (the bound is inclusive)`, { t, now: iso(nowS) }, OK0);
}
for (const [id, t, nowS, what, word] of [['O1', '2026-10-07 08:45', '2026-10-07 08:10', 'T + 75 min is exactly the reset', 'crosses the quota day reset'], ['O2', '2026-10-07 09:59', '2026-10-07 09:00', 'one minute before the reset: the run crosses it', 'crosses the quota day reset'], ['O3', '2026-10-08 08:45', '2026-10-08 08:00', 'the next day reset', 'crosses the quota day reset'],
    ['O4', '2026-10-08 00:01', '2026-10-07 00:00', 'one minute past now + 24 h', 'more than 24 h after now'], ['O5', '2026-10-09 03:00', '2026-10-07 22:30', 'two days ahead', 'more than 24 h after now'], ['O6', '2026-10-06 23:00', '2026-10-07 01:00', 'a T in the past', 'past T - 10 min'], ['O7', '2026-10-05 21:00', '2026-10-07 00:30', 'the eq hour T', 'past T - 10 min']]) {
    run(id, `T ${t} (${what}), now ${nowS} -> REFUSED (${word}), nothing written`, { t, now: iso(nowS) }, REFUSED(word));
}
run('O8', '--t with a trailing space', { t: '2026-10-07 23:00 ', now: iso('2026-10-07 22:30') }, REFUSED('--t must be "yyyy-MM-dd HH:mm"'));
run('O9', '--t an impossible time (25:00)', { t: '2026-10-07 25:00', now: iso('2026-10-07 22:30') }, REFUSED('--t 2026-10-07 25:00 is not a real calendar time'));
run('O10', '--t an impossible date (2026-02-30 23:00)', { t: '2026-02-30 23:00', now: iso('2026-10-07 22:30') }, REFUSED('--t 2026-02-30 23:00 is not a real calendar time'));
run('O11', '--t missing altogether', { t: '', noT: true, now: iso('2026-10-07 22:30') }, REFUSED('--t must be "yyyy-MM-dd HH:mm" (got undefined)'));
log('');

// 3. the refusal past T - 10 min: the boundary second on each side
run('P1', 'now exactly T - 10 min (22:50:00 for T 23:00) -> written (the precheck accepts a stamp up to At - 4 = T - 10)', { t: '2026-10-07 23:00', now: '2026-10-07T22:50:00+03:00' }, OK0);
run('P2', 'now T - 10 min + 1 s (22:50:01) -> REFUSED: past T - 10 min, nothing written', { t: '2026-10-07 23:00', now: '2026-10-07T22:50:01+03:00' }, REFUSED('past T - 10 min'));
run('P3', 'now one second before T - 10 min (22:49:59) -> written', { t: '2026-10-07 23:00', now: '2026-10-07T22:49:59+03:00' }, OK0);
run('P4', 'now after T itself', { t: '2026-10-07 23:00', now: iso('2026-10-07 23:05') }, REFUSED('past T - 10 min'));
run('P5', '--now junk', { t: '2026-10-07 23:00', now: 'junk', body: bodyFor('2026-10-07 23:00', '2026-10-07T22:30:00+03:00') }, REFUSED('--now junk is not an ISO instant'));
log('');

// 4. the body
const T0 = '2026-10-07 23:00', N0 = iso('2026-10-07 22:30');
run('Y1', 'the body names ANOTHER T', { t: T0, now: N0, body: bodyFor(T0, N0, { T: '2026-10-07 23:30' }) }, REFUSED(`body T: line is not ${T0}`));
run('Y2', 'the body has NO T: line', { t: T0, now: N0, body: bodyFor(T0, N0, { noT: true }) }, REFUSED('body must hold exactly one T: line'));
run('Y3', 'the body has TWO T: lines', { t: T0, now: N0, body: bodyFor(T0, N0, { twoT: true }) }, REFUSED('body must hold exactly one T: line'));
run('Y4', 'the body lacks the registration seal (it quotes another sha)', { t: T0, now: N0, body: bodyFor(T0, N0, { seal: 'a'.repeat(64) }) }, REFUSED('body lacks the registration seal'));
run('Y5', '--seal malformed (63 characters)', { t: T0, now: N0, seal: SEAL.slice(0, 63) }, REFUSED('--seal must be the registration\'s sha256'));
run('Y6', '--seal missing altogether', { t: T0, now: N0, noSeal: true }, REFUSED('--seal must be the registration\'s sha256'));
run('Y7', 'the body already holds an ARMING COMPLETE line (only the tool writes it)', { t: T0, now: N0, body: bodyFor(T0, N0, { complete: true }) }, REFUSED('body already holds an ARMING COMPLETE line'));
run('Y8', 'the body has NO LEDGER-SUMMARY line (no fresh read)', { t: T0, now: N0, body: bodyFor(T0, N0, { noLedger: true }) }, REFUSED('body must hold exactly one LEDGER-SUMMARY line'));
run('Y9', 'the body has TWO LEDGER-SUMMARY lines', { t: T0, now: N0, body: bodyFor(T0, N0, { twoLedger: true }) }, REFUSED('body must hold exactly one LEDGER-SUMMARY line'));
run('Y10', 'the ledger read is STALE: it is for the 2026-10-06 quota day, now is in the 2026-10-07 one', { t: T0, now: N0, body: bodyFor(T0, N0, { reset: '2026-10-06T07:00:00.000Z' }) }, REFUSED('is for the quota day starting 2026-10-06T07:00:00.000Z, but now is in the day starting 2026-10-07T07:00:00.000Z'));
run('Y11', 'headroom 223 on 3.5-lite (one below 224)', { t: T0, now: N0, body: bodyFor(T0, N0, { h35: 223 }) }, REFUSED('has headroom 223 on 3.5-lite and 450 on 3.1-lite'));
run('Y12', 'headroom 224 on 3.5-lite -> written (the bound is inclusive)', { t: T0, now: N0, body: bodyFor(T0, N0, { h35: 224 }) }, OK0);
run('Y13', 'headroom 89 on 3.1-lite (one below 90)', { t: T0, now: N0, body: bodyFor(T0, N0, { h31: 89 }) }, REFUSED('has headroom 400 on 3.5-lite and 89 on 3.1-lite'));
run('Y14', 'headroom 90 on 3.1-lite -> written', { t: T0, now: N0, body: bodyFor(T0, N0, { h31: 90 }) }, OK0);
run('Y15', 'the body file missing', { t: T0, now: N0, noBody: true }, REFUSED('cannot read the body'));
run('Y16', 'CRLF body line ends -> written, normalised, one T: line', { t: T0, now: N0, body: bodyFor(T0, N0).replace(/\n/g, '\r\n') }, OK0);
// fix1: M2 the seal against the COMMITTED registration, M3 the age of the ledger read, I1 extra / complete
run('Y17', 'M2: --seal is a valid sha256 and the body quotes it, but it is NOT the sha256 of the registration committed at HEAD', { t: T0, now: N0, seal: 'a'.repeat(64), body: bodyFor(T0, N0, { seal: 'a'.repeat(64) }) }, REFUSED('is not the sha256 of the registration committed at HEAD'));
run('Y18', 'M2: the registration committed at HEAD is a DIFFERENT text from the one the seal hashes (the repo holds another version)', { t: T0, now: N0, root: REPO_OTHER }, REFUSED('is not the sha256 of the registration committed at HEAD'));
run('Y19', 'M2: the registration is not committed at all in the repo', { t: T0, now: N0, root: REPO_EMPTY }, REFUSED('PREREGISTER-router-default.md is not committed at HEAD'));
run('Y20', 'M3: the ledger read is 31 minutes old at arming', { t: T0, now: N0, body: bodyFor(T0, N0, { ledgerNow: new Date(Date.parse(N0) - 31 * 60000).toISOString() }) }, REFUSED('more than 30 minutes before now'));
run('Y21', 'M3: the ledger read is exactly 30 minutes old -> written (the bound is inclusive)', { t: T0, now: N0, body: bodyFor(T0, N0, { ledgerNow: new Date(Date.parse(N0) - 30 * 60000).toISOString() }) }, OK0);
run('Y22', 'M3: the ledger read is dated 2 minutes in the future of now', { t: T0, now: N0, body: bodyFor(T0, N0, { ledgerNow: new Date(Date.parse(N0) + 2 * 60000).toISOString() }) }, REFUSED('in the future of now'));
run('Y23', 'I1: the ledger read was taken without --extra-requests (extra=unset)', { t: T0, now: N0, body: bodyFor(T0, N0, { extra: 'unset' }) }, REFUSED('extra=unset'));
run('Y24', 'I1: the ledger read says complete=no (the app logs do not cover the quota day)', { t: T0, now: N0, body: bodyFor(T0, N0, { ledgerComplete: 'no' }) }, REFUSED('complete=no'));
run('Y25', 'I1: the ledger read found no app log (oldest=none)', { t: T0, now: N0, body: bodyFor(T0, N0, { oldest: 'none' }) }, REFUSED('oldest=none'));
run('Y26', 'fix4 H1 backstop: the launcher error log EXISTS -> REFUSED, nothing written (a dry twin failed for a real reason)', { t: T0, now: N0, errorLog: ERRLOG_PRESENT }, REFUSED('the launcher error log'));
run('Y27', 'fix4 H1 backstop: the launcher error log is ABSENT (a window-only dry failure writes none) -> written', { t: T0, now: N0, errorLog: ERRLOG_ABSENT }, OK0);
log('');

// 5. the gate pattern: read from the precheck, proved on its two known answers; mutants of the precheck file
const pcText = fs.readFileSync(PRECHECK, 'utf8');
const gateLine = /'(\^ARMING COMPLETE [^']+)'/.exec(pcText)?.[1];
const mkPre = (name, text) => { const f = path.join(WORK, name); fs.writeFileSync(f, text); return f; };
run('G1', 'the REAL rd-precheck.ps1: its pattern, read by the tool, passes both known answers -> written', { t: T0, now: N0 }, OK0);
run('G2', 'a precheck whose pattern ACCEPTS a fractional second with a :00 offset (the 23:08 failure shape) -> REFUSED on the known answers', { t: T0, now: N0, precheck: mkPre('pre-loose.ps1', `$m = [regex]::Match($l, '^ARMING COMPLETE (\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}).*$')\n`) }, REFUSED('precheck pattern known answers'));
run('G3', 'a precheck whose pattern demands a +0300 offset (rejects the whole-second +03 form) -> REFUSED on the known answers', { t: T0, now: N0, precheck: mkPre('pre-strict.ps1', `$m = [regex]::Match($l, '^ARMING COMPLETE (\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})\\+0300$')\n`) }, REFUSED('precheck pattern known answers'));
run('G4', 'a precheck file with no ARMING COMPLETE pattern at all', { t: T0, now: N0, precheck: mkPre('pre-none.ps1', '# nothing here\n') }, REFUSED('gate pattern not found in rd-precheck.ps1'));
run('G5', 'a precheck file that does not exist', { t: T0, now: N0, precheck: path.join(WORK, 'no-such.ps1') }, REFUSED('cannot read'));
run('G6', 'the real record path is not written by any case (--out is always a case folder)', { t: T0, now: N0 }, OK0);
log('');

// 6. the usage rules and the written record against the precheck's pattern, evaluated by PowerShell (the engine the gate runs in)
{
    const r = spawnSync(process.execPath, [TOOL, '--t', T0, '--seal', SEAL, '--bogus', 'x'], { encoding: 'utf8' });
    const good = r.status === 2 && /^REFUSED: unknown option --bogus/.test(r.stdout);
    results.push({ id: 'U1', good }); log(`${good ? 'ok  ' : 'BAD '} U1    an unknown option is refused (${clip(r.stdout.trim(), 100)})`);
    const dir = path.join(WORK, 'ps-gate');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'body.md'), bodyFor(T0, N0));
    const w = spawnSync(process.execPath, [TOOL, '--t', T0, '--seal', SEAL, '--body', path.join(dir, 'body.md'), '--now', N0, '--out', dir, '--root', REPO], { encoding: 'utf8' });
    const last = fs.readFileSync(path.join(dir, 'ARMING-flight-rd.md'), 'utf8').replace(/\n+$/, '').split('\n').pop();
    const psScript = path.join(dir, 'gate.ps1');
    fs.writeFileSync(psScript, `\uFEFF$src = Get-Content -LiteralPath '${PRECHECK}' -Raw -Encoding UTF8\n$gm = [regex]::Match($src, '\\[regex\\]::Match\\(\\$lastLine, ''(\\^ARMING COMPLETE [^'']+)''\\)')\nif (-not $gm.Success) { Write-Output 'NOGATE'; exit 3 }\n$m = [regex]::Match('${last}', $gm.Groups[1].Value)\nWrite-Output ('GATE ' + $m.Success)\n$bad = [regex]::Match('ARMING COMPLETE 2026-10-07T22:08:17.455+03:00', $gm.Groups[1].Value)\nWrite-Output ('KNOWN-BAD ' + $bad.Success)\n`, 'utf8');
    const p = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', psScript], { encoding: 'utf8' });
    const ok = w.status === 0 && /^GATE True$/m.test(p.stdout ?? '') && /^KNOWN-BAD False$/m.test(p.stdout ?? '');
    results.push({ id: 'U2', good: ok });
    log(`${ok ? 'ok  ' : 'BAD '} U2    the written last line "${last}" matches the precheck's OWN [regex]::Match pattern evaluated by PowerShell (.NET), and the 23:08 shape does not (${(p.stdout ?? '').trim().replace(/\r?\n/g, ' | ')})`);
}
log('');

// 7. mutation suite (rule 8): one rule switched off in a copy of the script, run over the cases that must notice it
const src = fs.readFileSync(TOOL, 'utf8');
const MUTANTS = [
    ['quota-day-not-checked', ['if (quotaDay(tMs) !== quotaDay(tMs + 75 * 60000)) refuse(', 'if (false) refuse('], ['O1', 'O2', 'O3']],
    ['run-length-75-to-60', ['quotaDay(tMs + 75 * 60000)', 'quotaDay(tMs + 60 * 60000)'], ['O1', 'O3']],
    ['run-length-75-to-90', ['quotaDay(tMs + 75 * 60000)', 'quotaDay(tMs + 90 * 60000)'], ['B1', 'B4']],
    ['quota-reset-hour-moved (07Z -> 06Z)', ['(ms - 7 * 3600000)', '(ms - 6 * 3600000)'], ['B1', 'O2']],
    ['horizon-not-checked', ['if (tMs > nowMs + 24 * 3600000) refuse(', 'if (false) refuse('], ['O4', 'O5']],
    ['horizon-bound-exclusive', ['tMs > nowMs + 24 * 3600000', 'tMs >= nowMs + 24 * 3600000'], ['B3']],
    ['horizon-23-h', ['tMs > nowMs + 24 * 3600000', 'tMs > nowMs + 23 * 3600000'], ['B3']],
    ['past-T-minus-10-not-checked', ['if (nowMs > tMs - 10 * 60000) refuse(', 'if (false) refuse('], ['P2', 'P4']],
    ['T-minus-10-boundary-exclusive', ['if (nowMs > tMs - 10 * 60000) refuse(', 'if (nowMs >= tMs - 10 * 60000) refuse('], ['P1']],
    ['T-minus-5-instead (the bound moved)', ['if (nowMs > tMs - 10 * 60000) refuse(', 'if (nowMs > tMs - 5 * 60000) refuse('], ['P2']],
    ['known-answers-not-proved', ['if (PGATE.test(\'ARMING COMPLETE 2026-10-07T22:08:17.455+03:00\') || !PGATE.test(\'ARMING COMPLETE 2026-10-07T22:41:07+03\')) refuse(', 'if (false) refuse('], ['G2', 'G3']],
    ['gate-pattern-not-found-ignored', ["if (!pre) refuse('gate pattern not found in rd-precheck.ps1');", 'if (!pre) { /* ignored */ }'], ['G4']],
    ['T-line-not-checked', ['if (!new RegExp(`^T: ${T_TEXT}$`, \'m\').test(body)) refuse(', 'if (false) refuse('], ['Y1']],
    ['T-line-count-not-checked', ["if ((body.match(/^T: /gm) ?? []).length !== 1) refuse(", 'if (false) refuse('], ['Y2', 'Y3']],
    ['seal-not-checked', ['if (!body.includes(SEAL)) refuse(', 'if (false) refuse('], ['Y4']],
    ['seal-format-not-checked', ["if (!/^[0-9a-f]{64}$/.test(SEAL ?? '')) refuse(", 'if (false) refuse('], ['Y5', 'Y6']],
    ['existing-ARMING-COMPLETE-allowed', ["if (/^ARMING COMPLETE/m.test(body)) refuse(", 'if (false) refuse('], ['Y7']],
    ['ledger-line-not-required', ['if (led.length !== 1) refuse(', 'if (false && led.length !== 1) refuse('], ['Y8', 'Y9']],
    ['ledger-staleness-not-checked', ['if (led[0][1] !== expectReset) refuse(', 'if (false) refuse('], ['Y10']],
    ['seal-not-compared-with-the-commit (M2)', ['if (COMMITTED_SHA !== SEAL) refuse(', 'if (false) refuse('], ['Y17', 'Y18']],
    ['uncommitted-registration-ignored (M2)', ["} catch (e) { refuse(`PREREGISTER-router-default.md is not committed at HEAD in ${ROOT}: commit the registration first`); }", '} catch (e) { committed = Buffer.from(\'stub registration text\'); }'], ['Y19']],
    ['ledger-age-not-checked (M3)', ['if (nowMs - readAt > 30 * 60000) refuse(', 'if (false) refuse('], ['Y20']],
    ['ledger-age-bound-exclusive (M3)', ['if (nowMs - readAt > 30 * 60000) refuse(', 'if (nowMs - readAt >= 30 * 60000) refuse('], ['Y21']],
    ['ledger-future-not-checked (M3)', ['if (readAt > nowMs + 60000) refuse(', 'if (false) refuse('], ['Y22']],
    ['extra-unset-allowed (I1)', ["if (led[0][6] === 'unset') refuse(", 'if (false) refuse('], ['Y23']],
    ['error-log-not-checked (H1 backstop)', ['if (fs.existsSync(ERROR_LOG)) refuse(', 'if (false) refuse('], ['Y26']],
    ['incomplete-logs-allowed (I1)', ["if (led[0][9] !== 'yes' || led[0][10] === 'none') refuse(", 'if (false) refuse('], ['Y24', 'Y25']],
    ['ledger-headroom-not-checked', ['if (h35 < 224 || h31 < 90) refuse(', 'if (false) refuse('], ['Y11', 'Y13']],
    ['ledger-35-bound-exclusive', ['if (h35 < 224 || h31 < 90) refuse(', 'if (h35 <= 224 || h31 < 90) refuse('], ['Y12']],
    ['ledger-31-bound-exclusive', ['if (h35 < 224 || h31 < 90) refuse(', 'if (h35 < 224 || h31 <= 90) refuse('], ['Y14']],
    ['stamp-with-fraction (the 23:08 failure)', ["new Date(ms + 3 * 3600000).toISOString().slice(0, 19) + '+03'", "new Date(ms + 3 * 3600000).toISOString().slice(0, 23) + '+03:00'"], ['W1']],
    ['tmp-left-behind', ["fs.renameSync(tmp, path.join(outDir, 'ARMING-flight-rd.md'));", "fs.copyFileSync(tmp, path.join(outDir, 'ARMING-flight-rd.md'));"], ['W1']],
];
log('MUTATION SUITE (rule 8): a copy of the script with ONE rule switched off, run over the cases that must notice it. "caught" = every listed case turned BAD and W1 stayed ok (for the two mutants that break the WRITTEN record itself, W1 is the case that must turn BAD).');
const FLIPS_W1 = new Set(['stamp-with-fraction (the 23:08 failure)', 'tmp-left-behind']);
let mutantsCaught = 0;
// the mutants re-run table rows (ids as in the cases above, same inputs). A table row that is WRONG would turn BAD on every mutant and so make it look caught
// for nothing, so the first step is a CONTROL: every row against the REAL script, each must read as expected (rule 8: calibrate the calibration).
const TABLE = {
    W1: [{ t: '2026-10-07 23:00', now: iso('2026-10-07 22:30') }, OK0],
    B1: [{ t: '2026-10-07 08:44', now: iso('2026-10-07 08:20') }, OK0], B2: [{ t: '2026-10-07 10:00', now: iso('2026-10-07 09:30') }, OK0], B3: [{ t: '2026-10-08 00:00', now: iso('2026-10-07 00:00') }, OK0], B4: [{ t: '2026-10-08 08:44', now: iso('2026-10-08 08:00') }, OK0],
    O1: [{ t: '2026-10-07 08:45', now: iso('2026-10-07 08:10') }, REFUSED('crosses the quota day reset')], O2: [{ t: '2026-10-07 09:59', now: iso('2026-10-07 09:00') }, REFUSED('crosses the quota day reset')], O3: [{ t: '2026-10-08 08:45', now: iso('2026-10-08 08:00') }, REFUSED('crosses the quota day reset')],
    O4: [{ t: '2026-10-08 00:01', now: iso('2026-10-07 00:00') }, REFUSED('more than 24 h after now')], O5: [{ t: '2026-10-09 03:00', now: iso('2026-10-07 22:30') }, REFUSED('more than 24 h after now')], O6: [{ t: '2026-10-06 23:00', now: iso('2026-10-07 01:00') }, REFUSED('past T - 10 min')], O7: [{ t: '2026-10-05 21:00', now: iso('2026-10-07 00:30') }, REFUSED('past T - 10 min')],
    P1: [{ t: T0, now: '2026-10-07T22:50:00+03:00' }, OK0], P2: [{ t: T0, now: '2026-10-07T22:50:01+03:00' }, REFUSED('past T - 10 min')], P4: [{ t: T0, now: iso('2026-10-07 23:05') }, REFUSED('past T - 10 min')],
    Y1: [{ t: T0, now: N0, body: bodyFor(T0, N0, { T: '2026-10-07 23:30' }) }, REFUSED('body T: line')], Y2: [{ t: T0, now: N0, body: bodyFor(T0, N0, { noT: true }) }, REFUSED('exactly one T')], Y3: [{ t: T0, now: N0, body: bodyFor(T0, N0, { twoT: true }) }, REFUSED('exactly one T')],
    Y4: [{ t: T0, now: N0, body: bodyFor(T0, N0, { seal: 'a'.repeat(64) }) }, REFUSED('body lacks')], Y5: [{ t: T0, now: N0, seal: SEAL.slice(0, 63) }, REFUSED('--seal must be the registration\'s sha256')], Y6: [{ t: T0, now: N0, noSeal: true }, REFUSED('--seal must be the registration\'s sha256')],
    Y7: [{ t: T0, now: N0, body: bodyFor(T0, N0, { complete: true }) }, REFUSED('already holds')], Y8: [{ t: T0, now: N0, body: bodyFor(T0, N0, { noLedger: true }) }, REFUSED('LEDGER-SUMMARY')], Y9: [{ t: T0, now: N0, body: bodyFor(T0, N0, { twoLedger: true }) }, REFUSED('LEDGER-SUMMARY')],
    Y10: [{ t: T0, now: N0, body: bodyFor(T0, N0, { reset: '2026-10-06T07:00:00.000Z' }) }, REFUSED('stale read')], Y11: [{ t: T0, now: N0, body: bodyFor(T0, N0, { h35: 223 }) }, REFUSED('headroom')], Y12: [{ t: T0, now: N0, body: bodyFor(T0, N0, { h35: 224 }) }, OK0],
    Y13: [{ t: T0, now: N0, body: bodyFor(T0, N0, { h31: 89 }) }, REFUSED('headroom')], Y14: [{ t: T0, now: N0, body: bodyFor(T0, N0, { h31: 90 }) }, OK0],
    Y17: [{ t: T0, now: N0, seal: 'a'.repeat(64), body: bodyFor(T0, N0, { seal: 'a'.repeat(64) }) }, REFUSED('is not the sha256 of the registration committed at HEAD')], Y18: [{ t: T0, now: N0, root: REPO_OTHER }, REFUSED('is not the sha256 of the registration committed at HEAD')], Y19: [{ t: T0, now: N0, root: REPO_EMPTY }, REFUSED('is not committed at HEAD')],
    Y20: [{ t: T0, now: N0, body: bodyFor(T0, N0, { ledgerNow: new Date(Date.parse(N0) - 31 * 60000).toISOString() }) }, REFUSED('more than 30 minutes')], Y21: [{ t: T0, now: N0, body: bodyFor(T0, N0, { ledgerNow: new Date(Date.parse(N0) - 30 * 60000).toISOString() }) }, OK0], Y22: [{ t: T0, now: N0, body: bodyFor(T0, N0, { ledgerNow: new Date(Date.parse(N0) + 2 * 60000).toISOString() }) }, REFUSED('in the future')],
    Y23: [{ t: T0, now: N0, body: bodyFor(T0, N0, { extra: 'unset' }) }, REFUSED('extra=unset')], Y24: [{ t: T0, now: N0, body: bodyFor(T0, N0, { ledgerComplete: 'no' }) }, REFUSED('complete=no')], Y25: [{ t: T0, now: N0, body: bodyFor(T0, N0, { oldest: 'none' }) }, REFUSED('oldest=none')],
    Y26: [{ t: T0, now: N0, errorLog: ERRLOG_PRESENT }, REFUSED('the launcher error log')],
    G2: [{ t: T0, now: N0, precheck: path.join(WORK, 'pre-loose.ps1') }, REFUSED('precheck pattern known answers')], G3: [{ t: T0, now: N0, precheck: path.join(WORK, 'pre-strict.ps1') }, REFUSED('precheck pattern known answers')], G4: [{ t: T0, now: N0, precheck: path.join(WORK, 'pre-none.ps1') }, REFUSED('gate pattern not found')],
};

{
    const sink = console.log;
    const wrong = [];
    console.log = () => {};
    try {
        for (const [id, [spec, want]] of Object.entries(TABLE)) {
            const lg = out.length;
            run(`${id}~control`, id, spec, want);
            if (!results.pop().good) wrong.push(id);
            out.length = lg;
        }
    } finally { console.log = sink; }
    results.push({ id: 'mutant-table-control', good: wrong.length === 0 });
    log(`${wrong.length === 0 ? 'ok  ' : 'BAD '} CONTROL: all ${Object.keys(TABLE).length} table rows read as expected against the REAL script${wrong.length ? `; WRONG ROWS: ${wrong.join(', ')}` : ''}`);
}
for (const [name, [find, repl], mustTurnBad] of MUTANTS) {
    if (!src.includes(find)) throw new Error(`calibration bug: mutant "${name}": the text to switch off was not found: ${find}`);
    const mf = path.join(HERE, `write-arming-rd.mut${results.length}.mjs`);
    fs.writeFileSync(mf, src.replace(find, () => repl));
    globalThis.__TOOL = mf;
    const sink = console.log;
    console.log = () => {};
    const v = [];
    try {
        for (const id of FLIPS_W1.has(name) ? ['W1'] : ['W1', ...mustTurnBad]) {
            const [spec, want] = TABLE[id];
            const lg = out.length;
            run(`${id}~m`, id, spec, want);
            v.push({ id, good: results.pop().good });
            out.length = lg;       // the silent run's case line is dropped from the output file
        }
    } finally { console.log = sink; globalThis.__TOOL = undefined; fs.rmSync(mf, { force: true }); }
    const w1 = v.find((x) => x.id === 'W1').good;
    const turned = v.filter((x) => !x.good).map((x) => x.id);
    const missed = mustTurnBad.filter((id) => !turned.includes(id));
    const caught = FLIPS_W1.has(name) ? !w1 : (w1 && missed.length === 0);
    if (caught) mutantsCaught++;
    results.push({ id: `mutant:${name.split(' ')[0]}`, good: caught });
    log(`${caught ? 'ok  ' : 'BAD '} ${name}`);
    log(`      cases that turned BAD: [${turned.join(', ')}] (must be [${mustTurnBad.join(', ')}]); W1 ${w1 ? 'stayed ok' : 'turned BAD'}${missed.length ? `; NOT NOTICED: ${missed.join(', ')}` : ''}`);
}
log('');

const realAfter = shaOf(REAL_RECORD);
log(`CLEAN-UP: the real record ${REAL_RECORD}: ${realBefore === realAfter ? 'untouched' : 'CHANGED'} (${realBefore ? 'existed' : 'absent'} before and after)`);
results.push({ id: 'real-record', good: realBefore === realAfter });
const bads = results.filter((x) => !x.good);
log(bads.length ? `WRITE-ARMING CALIBRATION: FAILED (${bads.map((b) => b.id).join(', ')})` : `WRITE-ARMING CALIBRATION OK ${results.length}/${results.length} (${MUTANTS.length} mutants, ${mutantsCaught} caught)`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length ? 1 : 0);
