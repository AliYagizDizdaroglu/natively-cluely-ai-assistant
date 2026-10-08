// LAB\flight\write-arming-rd.mjs (plan Task 18 step 5; SP\flight-eq\write-arming.mjs generalised: T is an argument, not a constant).
// Writes ARMING-flight-rd.md.tmp, then renames it into place in one step. The last line is "ARMING COMPLETE <stamp>" (local, +03, no fraction);
// the file is the arming record the precheck (rd-precheck.ps1, gate arming-record) and the launcher's rd-sha-lines read.
//
//   node write-arming-rd.mjs --t "yyyy-MM-dd HH:mm" --seal <64 hex> [--body <file>]
//       --t     the task time T, local (+03:00). fix2: at most now + 24 h, and T + 75 min must stay inside ONE quota day (resets 07:00Z = 10:00 local).
//               The lead is the existing one: arming must be done by T - 10 min (a T in the past is refused by it).
//       --seal  the sha256 (64 lowercase hex) of the registration, PREREGISTER-router-default.md: it must EQUAL the sha256 of that file as committed at
//               HEAD of MAIN (git show HEAD:electron/test/golden/passes/PREREGISTER-router-default.md; --root overrides MAIN, calibration), and the
//               body must quote it (the body seals the registration the record belongs to, as eq's body sealed its last amendment).
//       --body  the record body (default arming-body-rd.md beside this script): exactly one `T: <T>` line, the seal, and a `LEDGER-SUMMARY`
//               line from a fresh read of SP\quota-ledger-today.mjs --extra-requests <n> (spec 10.1: the arming record carries a fresh ledger
//               read) whose reset is the quota-day start of NOW, whose own now= is at most 30 minutes old, with extra=<n> (not unset) and
//               complete=yes, and whose headroom is >= 224 on 3.5-lite and >= 90 on 3.1-lite (1.5 x need 149 / 60).
//   Refuses, writing nothing, when: now is later than T - 10 min (the precheck would refuse the record: stamp > At - 4 min = T - 10); the gate
//   pattern read from rd-precheck.ps1 fails its two known answers (a fraction and a ':00' offset must fail, a whole second and '+03' must pass);
//   the body breaks any rule above; or the written last line fails the precheck's own pattern.
//   CALIBRATION ONLY (write-arming-rd-cal.mjs; no launcher or controller step passes them): --now <iso> the clock, --out <dir> where the record is
//   written, --precheck <file> the script the gate pattern is read from.
// Exit 0 = written; 2 = refused or bad arguments. Prints names, counts, hashes only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
const argv = process.argv.slice(2);
const VALUE_OPTS = ['--t', '--seal', '--body', '--now', '--out', '--precheck', '--root', '--error-log'];
argv.forEach((a, i) => { if (a.startsWith('--') && !VALUE_OPTS.includes(a)) refuse(`unknown option ${a}`); if (!a.startsWith('--') && !VALUE_OPTS.includes(argv[i - 1])) refuse(`unexpected argument ${a}`); });
for (const k of VALUE_OPTS) { const i = argv.indexOf(k); if (i >= 0 && (argv[i + 1] === undefined || argv[i + 1].startsWith('--'))) refuse(`${k} needs a value`); }
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };

// ---- fix4 H1 backstop: the launcher's error log must not exist at arming (a dry twin that really failed leaves it; a window-only dry failure does not write it)
const ERROR_LOG = opt('--error-log') ?? path.join(process.env.TEMP ?? os.tmpdir(), 'natively-rd-launcher-error.log');
if (fs.existsSync(ERROR_LOG)) refuse(`the launcher error log ${ERROR_LOG} exists: a launcher run failed for a real reason (a window-only dry failure writes none). Read it, fix the cause, delete it, then arm`);

// ---- T: format, a real calendar time, quota day and horizon (+03:00, as the guard reads it)
const T_TEXT = opt('--t');
const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(T_TEXT ?? '');
if (!m) refuse(`--t must be "yyyy-MM-dd HH:mm" (got ${JSON.stringify(T_TEXT)})`);
const instant = (y, mo, d, h, mi) => {
    const ms = Date.UTC(y, mo - 1, d, h - 3, mi);
    const b = new Date(ms + 3 * 3600000);
    return b.getUTCFullYear() === y && b.getUTCMonth() === mo - 1 && b.getUTCDate() === d && b.getUTCHours() === h && b.getUTCMinutes() === mi ? ms : NaN;
};
const tMs = instant(...m.slice(1).map(Number));
if (!Number.isFinite(tMs)) refuse(`--t ${T_TEXT} is not a real calendar time`);
const quotaDay = (ms) => Math.floor((ms - 7 * 3600000) / 86400000);
if (quotaDay(tMs) !== quotaDay(tMs + 75 * 60000)) refuse(`--t ${T_TEXT} + 75 min (the run's expected end) crosses the quota day reset at 10:00 local (07:00Z): the run must stay inside one quota day`);

// ---- the clock, and the refusal past T - 10 min
let nowMs = Date.now();
if (opt('--now') !== undefined) { nowMs = Date.parse(opt('--now')); if (!Number.isFinite(nowMs)) refuse(`--now ${opt('--now')} is not an ISO instant`); }
if (nowMs > tMs - 10 * 60000) refuse(`past T - 10 min (T ${T_TEXT}): the precheck would refuse a record stamped now`);
if (tMs > nowMs + 24 * 3600000) refuse(`--t ${T_TEXT} is more than 24 h after now`);
// rd-precheck.ps1 accepts exactly yyyy-MM-ddTHH:mm:ss+03 (no fraction, no ':00' offset); the eq 23:08 record failed on this.
const local = (ms) => new Date(ms + 3 * 3600000).toISOString().slice(0, 19) + '+03';
const STAMP = local(nowMs);

// ---- the seal
const SEAL = opt('--seal');
if (!/^[0-9a-f]{64}$/.test(SEAL ?? '')) refuse('--seal must be the registration\'s sha256: 64 lowercase hex characters');
// fix1 M2: the seal is checked against the registration AS COMMITTED at the checkout's HEAD (the text the launcher's rd-sha-lines prints at T),
// never taken on the caller's word. --root is MAIN (found by wildcard like the other tools) unless the calibration points it at a stub repo.
const findMain = () => {
    const od = path.join(os.homedir(), 'OneDrive');
    for (const d of fs.readdirSync(od)) {
        if (!d.startsWith('Masa')) continue;
        const cand = path.join(od, d, 'natively-cluely-ai-assistant');
        if (fs.existsSync(path.join(cand, '.git'))) return cand;
    }
    return null;
};
const ROOT = opt('--root') ?? findMain();
if (!ROOT) refuse('MAIN not found under OneDrive: pass --root');
let committed;
try {
    committed = execFileSync('git', ['--no-optional-locks', '-C', ROOT, 'show', 'HEAD:electron/test/golden/passes/PREREGISTER-router-default.md'], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
} catch (e) { refuse(`PREREGISTER-router-default.md is not committed at HEAD in ${ROOT}: commit the registration first`); }
const COMMITTED_SHA = crypto.createHash('sha256').update(committed).digest('hex');
if (COMMITTED_SHA !== SEAL) refuse(`--seal ${SEAL.slice(0, 12)}... is not the sha256 of the registration committed at HEAD (${COMMITTED_SHA.slice(0, 12)}...)`);

// ---- the gate pattern: read from the precheck itself, then proved on two known answers before anything is written
const precheckFile = opt('--precheck') ?? path.join(HERE, 'rd-precheck.ps1');
let precheckText;
try { precheckText = fs.readFileSync(precheckFile, 'utf8'); } catch (e) { refuse(`cannot read ${precheckFile}: ${e.code ?? e.message}`); }
const pre = precheckText.match(/'(\^ARMING COMPLETE [^']+)'/);
if (!pre) refuse('gate pattern not found in rd-precheck.ps1');
const PGATE = new RegExp(pre[1]);
if (PGATE.test('ARMING COMPLETE 2026-10-07T22:08:17.455+03:00') || !PGATE.test('ARMING COMPLETE 2026-10-07T22:41:07+03')) refuse('precheck pattern known answers: a fractional second with a :00 offset must FAIL and a whole second with +03 must PASS');
if (!PGATE.test(`ARMING COMPLETE ${STAMP}`)) refuse(`stamp ${STAMP} does not match the precheck gate`);

// ---- the body
const bodyFile = opt('--body') ?? path.join(HERE, 'arming-body-rd.md');
let raw;
try { raw = fs.readFileSync(bodyFile, 'utf8'); } catch (e) { refuse(`cannot read the body ${bodyFile}: ${e.code ?? e.message}`); }
const body = raw.replace(/\r\n/g, '\n').replace(/\n+$/, '');
if ((body.match(/^T: /gm) ?? []).length !== 1) refuse('body must hold exactly one T: line');
if (!new RegExp(`^T: ${T_TEXT}$`, 'm').test(body)) refuse(`body T: line is not ${T_TEXT}`);
if (/^ARMING COMPLETE/m.test(body)) refuse('body already holds an ARMING COMPLETE line: only this tool writes it');
if (!body.includes(SEAL)) refuse(`body lacks the registration seal ${SEAL.slice(0, 12)}...`);
const led = [...body.matchAll(/^LEDGER-SUMMARY reset=(\S+) now=(\S+) cap=(\d+) used35=(\d+) used31=(\d+) extra=(\d+|unset) headroom35=(-?\d+) headroom31=(-?\d+) complete=(yes|no) oldest=(\S+)$/gm)];
if (led.length !== 1) refuse(`body must hold exactly one LEDGER-SUMMARY line in the ledger's own shape (found ${led.length}): paste the output of a fresh quota-ledger-today.mjs read taken with --extra-requests <n>`);
{
    // fix1 I1 / M3: the read must say how many script requests it added (extra=<n>, not unset), must be complete, and must be at most 30 minutes old
    if (led[0][6] === 'unset') refuse('the body\'s ledger read was taken without --extra-requests (extra=unset): the requests made by scripts (probes, bare arms) are in no app log and must be counted from the smoke and probe records');
    if (led[0][9] !== 'yes' || led[0][10] === 'none') refuse(`the body's ledger read has complete=${led[0][9]} oldest=${led[0][10]}: the app logs do not cover the quota day`);
    const readAt = Date.parse(led[0][2]);
    if (!Number.isFinite(readAt)) refuse('the body\'s ledger read has no valid now= instant');
    if (readAt > nowMs + 60000) refuse(`the body's ledger read is dated ${led[0][2]}, in the future of now`);
    if (nowMs - readAt > 30 * 60000) refuse(`the body's ledger read was taken at ${led[0][2]}, more than 30 minutes before now: take a fresh one`);
    const DAY = 86400000, midnight = Math.floor(nowMs / DAY) * DAY;
    const expectReset = new Date(midnight + 7 * 3600000 <= nowMs ? midnight + 7 * 3600000 : midnight - DAY + 7 * 3600000).toISOString();
    if (led[0][1] !== expectReset) refuse(`the body's ledger read is for the quota day starting ${led[0][1]}, but now is in the day starting ${expectReset}: a stale read`);
    const [h35, h31] = [+led[0][7], +led[0][8]];
    if (h35 < 224 || h31 < 90) refuse(`the body's ledger read has headroom ${h35} on 3.5-lite and ${h31} on 3.1-lite, below 224 and 90 (1.5 x the need): the run moves to the fallback`);
}

// ---- write, rename, read back
const text = `${body}\n\nARMING COMPLETE ${STAMP}\n`;
const outDir = path.resolve(opt('--out') ?? HERE);
const tmp = path.join(outDir, 'ARMING-flight-rd.md.tmp');
fs.writeFileSync(tmp, text);
fs.renameSync(tmp, path.join(outDir, 'ARMING-flight-rd.md'));
const last = fs.readFileSync(path.join(outDir, 'ARMING-flight-rd.md'), 'utf8').replace(/\n+$/, '').split('\n').pop();
if (!PGATE.test(last)) refuse(`written last line fails the precheck pattern: ${last} -- fix before the precheck`);
console.log(`WROTE ARMING-flight-rd.md (${text.length} bytes), T ${T_TEXT}, last line: ARMING COMPLETE ${STAMP}`);
