// E\night-gates.cal.mjs - calibration driver for night-gates.ps1; writes E\night-gates-cal.txt (the name A2.10 P5 gives) and
// its copy E\night-gates.cal.txt. Fix round 1: tools-367-review N-I1/N-m1..N-m4 + A4-RECHECK m2.
// Fix round 2: tools-367-rereview NG-I1 = A5.5 N-m3 / A5 FINAL item 7: a policy override value present = FAIL updates.
// Every FAIL branch is driven by -FakeJson injection (and, for the powercfg parse, by a saved powercfg text); the machine's
// real power/update settings are only READ (never changed). The real reading is run last and printed (informative: it is the
// arming reading, not a calibration case), plus one comparison of the live powercfg text through the file path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const E = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(E, 'night-gates.ps1');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'night-gates-cal-'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const GATES = ['standby-ac', 'hibernate-ac', 'power', 'reboot', 'updates'];

function ps(script, args) {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { encoding: 'utf8' });
    const lines = (r.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    return { code: r.status, lines, err: (r.stderr ?? '').trim().slice(0, 300) };
}
const G0 = { standbyAcSec: 0, hibernateAcSec: 0, battery: [2], batteryFlag: 0, acLine: true, rebootPendingCbs: false, rebootRequiredWu: false,
    rebootParentMissing: null, pendingFileRename: false, activeHoursStart: 15, activeHoursEnd: 6, pauseUpdatesExpiry: null,
    pauseQualityUpdatesEnd: null, pauseFeatureUpdatesEnd: null, pausedQualityStatus: 1, pausedFeatureStatus: 1,
    policyNoAutoUpdate: 1, policyAUOptions: 2, policyOverrides: [] };
let seq = 0;
function fakeFile(over) { const f = path.join(TMP, `fake${++seq}.json`); fs.writeFileSync(f, JSON.stringify({ ...G0, ...over })); return f; }
const AT = '2026-10-05 21:00';
// absolute instants for the pause boundary, derived from THIS machine's zone exactly as the script derives it
const atInstant = (s) => { const [d, t] = s.split(' '); const [Y, M, D] = d.split('-').map(Number); const [h, m] = t.split(':').map(Number); return new Date(Y, M - 1, D, h, m).getTime(); };
const isoZ = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const plus5 = atInstant(AT) + 5 * 3600000;
const FAR = '2026-10-14T13:41:25Z';

// powercfg /q text, in the shape this machine prints (captured 2026-10-05, English labels), with the five hex values
// parametrised: Minimum, Maximum, increment, Current AC, Current DC.
const hx = (n) => '0x' + n.toString(16).padStart(8, '0');
const pcText = ({ min = 0, max = 0xffffffff, inc = 1, ac = 0, dc = 0 } = {}, drop = -1) => {
    const hexRows = [
        ['      Minimum Possible Setting: ', min], ['      Maximum Possible Setting: ', max], ['      Possible Settings increment: ', inc],
        ['    Current AC Power Setting Index: ', ac], ['    Current DC Power Setting Index: ', dc],
    ];
    const lines = [];
    hexRows.forEach(([l, v], i) => { if (i !== drop) lines.push(l + hx(v)); if (i === 2) lines.push('      Possible Settings units: Seconds'); });
    return 'Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)\n  GUID Alias: SCHEME_BALANCED\n  Subgroup GUID: 238c9fa8-0aad-41ed-83f4-97be242c8f20  (Sleep)\n    GUID Alias: SUB_SLEEP\n    Power Setting GUID: 29f6c1db-86da-48c5-9fdb-f2b67b1f44da  (Sleep after)\n      GUID Alias: STANDBYIDLE\n'
        + lines.join('\n') + '\n';
};
const tur = (ac) => `Güç Şeması GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Dengeli)\n    Güç Ayarı GUID: 29f6c1db-86da-48c5-9fdb-f2b67b1f44da  (Uyku zamanı)\n      En Düşük Olası Ayar: 0x00000000\n      En Yüksek Olası Ayar: 0xffffffff\n      Olası Ayarlar artışı: 0x00000001\n      Olası Ayarlar birimi: Saniye\n    Geçerli AC Güç Ayarı Dizini: ${hx(ac)}\n    Geçerli DC Güç Ayarı Dizini: 0x00000000\n`;
let tseq = 0;
const textFile = (s) => { const f = path.join(TMP, `pc${++tseq}.txt`); fs.writeFileSync(f, s, 'utf8'); return f; };

// case: [label, at, fake-overrides, expected {gate: 'OK'|'FAIL'} for all five gates (default all OK), exit code, extra]
//   extra: { text: <powercfg text>, lines: [exact output lines that must appear] }
const ok5 = Object.fromEntries(GATES.map((g) => [g, 'OK']));
const only = (...fails) => ({ ...ok5, ...Object.fromEntries(fails.map((g) => [g, 'FAIL'])) });
const INFO_DEFAULT = ['NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: none (also gate updates)',
    'NIGHT pause-status: INFO PausedQualityStatus=1 PausedFeatureStatus=1 (informational, not gated)'];
const CASES = [
    ['1 all-good fake (+ both INFO lines)', AT, {}, only(), 0, { lines: INFO_DEFAULT }],
    ['2 standby 0x384 (900 s) -> FAIL standby-ac', AT, { standbyAcSec: 0x384 }, only('standby-ac'), 1],
    ['3 hibernate nonzero (7200 s) -> FAIL hibernate-ac', AT, { hibernateAcSec: 7200 }, only('hibernate-ac'), 1],
    ['4 BatteryStatus 1 (discharging), AC line offline -> FAIL power', AT, { battery: [1], acLine: false }, only('power'), 1],
    ['4a NO battery (Win32_Battery empty) + BatteryFlag 128 + AC online -> OK power (the deliberate desktop signal)', AT, { battery: 'none', batteryFlag: 128, acLine: true }, only(), 0],
    ['4a1 no Win32_Battery instance but BatteryFlag 1 (OS reports a battery), AC online -> FAIL power (empty query is not "no battery")', AT, { battery: 'none', batteryFlag: 1, acLine: true }, only('power'), 1],
    ['4a2 no Win32_Battery instance, BatteryFlag unknown (null), AC online -> FAIL power', AT, { battery: 'none', batteryFlag: null, acLine: true }, only('power'), 1],
    ['4a3 no battery (flag 128) with AC line OFFLINE -> FAIL power (N-I1 C1)', AT, { battery: 'none', batteryFlag: 128, acLine: false }, only('power'), 1],
    ['4a4 no battery (flag 128) with AC line UNKNOWN -> FAIL power', AT, { battery: 'none', batteryFlag: 128, acLine: null }, only('power'), 1],
    ['4b BatteryStatus 6 (charging) with AC line online -> OK power', AT, { battery: [6], acLine: true }, only(), 0],
    ['4c BatteryStatus 6 with AC line offline -> FAIL power', AT, { battery: [6], acLine: false }, only('power'), 1],
    ['4d BatteryStatus 3 (fully charged) with AC line online -> OK power', AT, { battery: [3], acLine: true }, only(), 0],
    ['4e BatteryStatus 5 (low) even with AC line online -> FAIL power', AT, { battery: [5], acLine: true }, only('power'), 1],
    ['4f BatteryStatus 1 even with AC line online -> FAIL power (only 2 / charge states)', AT, { battery: [1], acLine: true }, only('power'), 1],
    ['4g Win32_Battery query FAILED (battery "error"), BatteryFlag 128, AC online -> FAIL power (A4-RECHECK m2)', AT, { battery: 'error', batteryFlag: 128, acLine: true }, only('power'), 1],
    ['4h BatteryStatus 2 with AC line OFFLINE -> FAIL power (A4.3b; N-I1 C2; flips the old build)', AT, { battery: [2], acLine: false }, only('power'), 1],
    ['4i BatteryStatus 2 with AC line UNKNOWN -> FAIL power', AT, { battery: [2], acLine: null }, only('power'), 1],
    ['4j two batteries [6,1], AC online -> FAIL power (every status must be acceptable)', AT, { battery: [6, 1], acLine: true }, only('power'), 1],
    ['4k two batteries [2,6], AC online -> OK power', AT, { battery: [2, 6], acLine: true }, only(), 0],
    ['5 CBS RebootPending -> FAIL reboot', AT, { rebootPendingCbs: true }, only('reboot'), 1],
    ['5a CBS parent key missing -> FAIL reboot (N-m1: a path typo must not read as "absent")', AT, { rebootParentMissing: 'Component Based Servicing' }, only('reboot'), 1,
        { lines: ['NIGHT reboot: FAIL parent registry key missing: Component Based Servicing (the pending-reboot flags cannot be read)'] }],
    ['5b WU Auto Update parent key missing -> FAIL reboot', AT, { rebootParentMissing: 'WindowsUpdate\\Auto Update' }, only('reboot'), 1],
    ['6 WU RebootRequired ONLY (A3 m13) -> FAIL reboot', AT, { rebootRequiredWu: true }, only('reboot'), 1],
    ['6a PendingFileRenameOperations only -> OK (printed, not gated)', AT, { pendingFileRename: true }, only(), 0],
    ['7 active 8->17, no pause, At 21:00 -> FAIL updates', AT, { activeHoursStart: 8, activeHoursEnd: 17 }, only('updates'), 1],
    ['8 active 8->17 + pause to 2026-10-07 (PauseUpdatesExpiryTime only) -> OK updates', AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: '2026-10-07T00:00:00Z' }, only(), 0],
    ['9 active 18->6, At 2026-10-06 01:00 -> OK (06:00 inclusive)', '2026-10-06 01:00', { activeHoursStart: 18, activeHoursEnd: 6 }, only(), 0],
    ['10 active 18->5, same At -> FAIL updates', '2026-10-06 01:00', { activeHoursStart: 18, activeHoursEnd: 5 }, only('updates'), 1],
    ['11 no ActiveHours values, no pause (A3 m13) -> FAIL updates', AT, { activeHoursStart: null, activeHoursEnd: null }, only('updates'), 1],
    ['12 no ActiveHours values + pause past At+5h (A3 m13) -> OK updates', AT, { activeHoursStart: null, activeHoursEnd: null, pauseUpdatesExpiry: '2026-10-07T00:00:00Z' }, only(), 0],
    ['12a only ActiveHoursStart missing, no pause -> FAIL updates', AT, { activeHoursStart: null, activeHoursEnd: 6 }, only('updates'), 1],
    [`13 pause expiry == At+5h exactly (${isoZ(plus5)}), active 8->17 -> FAIL (must be strictly greater)`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: isoZ(plus5) }, only('updates'), 1],
    [`13a pause expiry At+5h+1 s (${isoZ(plus5 + 1000)}), active 8->17 -> OK`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: isoZ(plus5 + 1000) }, only(), 0],
    [`13b PauseUpdatesExpiryTime far, PauseQualityUpdatesEndTime == At+5h exactly, active 8->17 -> FAIL (N-m2: the EARLIEST of the three counts)`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: FAR, pauseQualityUpdatesEnd: isoZ(plus5), pauseFeatureUpdatesEnd: FAR }, only('updates'), 1],
    [`13c Expiry far, PauseFeatureUpdatesEndTime At+1h, active 8->17 -> FAIL`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: FAR, pauseQualityUpdatesEnd: FAR, pauseFeatureUpdatesEnd: isoZ(atInstant(AT) + 3600000) }, only('updates'), 1],
    [`13d all three far, active 8->17 -> OK`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: FAR, pauseQualityUpdatesEnd: FAR, pauseFeatureUpdatesEnd: FAR }, only(), 0],
    [`13e only PauseQualityUpdatesEndTime present (At+5h+1 s), active 8->17 -> OK (whichever are present)`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseQualityUpdatesEnd: isoZ(plus5 + 1000) }, only(), 0],
    [`13f Expiry far but PauseFeatureUpdatesEndTime unparseable, active 8->17 -> FAIL`, AT, { activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: FAR, pauseFeatureUpdatesEnd: 'garbage' }, only('updates'), 1],
    ['14 active 19->6, At 19:30 (window starts 19:00 = active start) -> OK (inclusive)', '2026-10-05 19:30', { activeHoursStart: 19, activeHoursEnd: 6 }, only(), 0],
    ['14a active 20->6, At 19:30 -> FAIL updates', '2026-10-05 19:30', { activeHoursStart: 20, activeHoursEnd: 6 }, only('updates'), 1],
    ['15 active 15->1, At 20:00 (window ends 01:00 = active end) -> OK (inclusive)', '2026-10-05 20:00', { activeHoursStart: 15, activeHoursEnd: 1 }, only(), 0],
    ['15a active 15->0, At 20:00 -> FAIL updates', '2026-10-05 20:00', { activeHoursStart: 15, activeHoursEnd: 0 }, only('updates'), 1],
    ['16 two failures: standby + CBS reboot', AT, { standbyAcSec: 900, rebootPendingCbs: true }, only('standby-ac', 'reboot'), 1],
    ['17 all five failing', AT, { standbyAcSec: 900, hibernateAcSec: 7200, battery: [1], acLine: false, rebootPendingCbs: true, activeHoursStart: 8, activeHoursEnd: 17 }, only(...GATES), 1],
    ['i1 policy override values present (SetActiveHours, SetDisablePauseUXAccess), hours cover -> FAIL updates (A5.5 N-m3 / A5 item 7: a policy value = FAIL); the INFO lines still say so', AT,
        { policyOverrides: ['SetActiveHours', 'SetDisablePauseUXAccess'], policyNoAutoUpdate: null, policyAUOptions: null, pausedQualityStatus: 0, pausedFeatureStatus: null }, only('updates'), 1,
        { lines: ['NIGHT policy: INFO NoAutoUpdate=absent AUOptions=absent; override values present: SetActiveHours,SetDisablePauseUXAccess (also gate updates)',
            'NIGHT pause-status: INFO PausedQualityStatus=0 PausedFeatureStatus=absent (informational, not gated)'] }],
    ['i2 ConfigureDeadlineForQualityUpdates alone (a policy deadline value), hours cover -> FAIL updates (A5 item 7 known answer)', AT,
        { policyOverrides: ['ConfigureDeadlineForQualityUpdates'] }, only('updates'), 1,
        { lines: ['NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: ConfigureDeadlineForQualityUpdates (also gate updates)'] }],
    ['i2a a policy override value present, hours do NOT cover but a pause covers -> still FAIL updates (the override is an AND, not an alternative)', AT,
        { policyOverrides: ['AlwaysAutoRebootAtScheduledTime'], activeHoursStart: 8, activeHoursEnd: 17, pauseUpdatesExpiry: FAR }, only('updates'), 1],
    ['i3 clean: NoAutoUpdate=0 AUOptions=4 present (not override values), no override value -> OK all five; the INFO line prints them', AT,
        { policyNoAutoUpdate: 0, policyAUOptions: 4, policyOverrides: [] }, only(), 0,
        { lines: ['NIGHT policy: INFO NoAutoUpdate=0 AUOptions=4; override values present: none (also gate updates)'] }],
    // N-m1: the powercfg parse, from saved text (the same text serves STANDBYIDLE and HIBERNATEIDLE)
    ['tx1 saved powercfg text, AC 0 / DC 0 -> OK both sleep gates', AT, {}, only(), 0, { text: pcText(), lines: ['NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)'] }],
    ['tx2 saved text with AC edited to 0x00000384 -> FAIL standby-ac and hibernate-ac (the AC value, the 4th hex)', AT, {}, only('standby-ac', 'hibernate-ac'), 1,
        { text: pcText({ ac: 0x384 }), lines: ['NIGHT standby-ac: FAIL AC sleep timeout 0x00000384 (900 s)'] }],
    ['tx3 saved text with AC 0 and DC edited to 0x00000384 -> OK (DC is not AC)', AT, {}, only(), 0, { text: pcText({ dc: 0x384 }) }],
    ['tx4 saved text with the "increment" line missing (4 hex values) -> FAIL both (not exactly five = unreadable)', AT, {}, only('standby-ac', 'hibernate-ac'), 1,
        { text: pcText({}, 2), lines: ['NIGHT standby-ac: FAIL AC sleep timeout unreadable'] }],
    ['tx5 saved text with a 6th hex value (an extra Minimum line) -> FAIL both', AT, {}, only('standby-ac', 'hibernate-ac'), 1, { text: pcText().replace('      Possible Settings units', '      Extra Setting: 0x00000009\n      Possible Settings units') }],
    ['tx6 Turkish-labelled text (localised), AC 0x00000384 -> FAIL both (the parse is label-independent)', AT, {}, only('standby-ac', 'hibernate-ac'), 1, { text: tur(0x384), lines: ['NIGHT standby-ac: FAIL AC sleep timeout 0x00000384 (900 s)'] }],
    ['tx7 empty text -> FAIL both (unreadable)', AT, {}, only('standby-ac', 'hibernate-ac'), 1, { text: '' }],
];

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
let fails = 0;

function verdictOf(res) {
    const got = {};
    for (const l of res.lines) { const m = /^NIGHT (standby-ac|hibernate-ac|power|reboot|updates): (OK|FAIL)\b/.exec(l); if (m) got[m[1]] = m[2]; }
    const last = res.lines[res.lines.length - 1] ?? '';
    return { got, last };
}
function expectedLast(exp) {
    const f = GATES.filter((g) => exp[g] === 'FAIL');
    return f.length ? `NIGHT GATES FAILED (${f.length}): ${f.join(', ')}` : 'NIGHT GATES OK';
}
function runCase(script, c) {
    const [, at, over, , , extra] = c;
    const args = ['-At', at, '-FakeJson', fakeFile(over)];
    if (extra?.text !== undefined) args.push('-PowercfgTextFile', textFile(extra.text));
    return ps(script, args);
}
function passes(res, c) {
    const exp = c[3], code = c[4], extra = c[5];
    const { got, last } = verdictOf(res);
    return res.code === code && GATES.every((g) => got[g] === exp[g]) && last === expectedLast(exp)
        && (extra?.lines ?? []).every((l) => res.lines.includes(l));
}
function paramCheck(script) {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `$e=$null;$t=$null;$a=[System.Management.Automation.Language.Parser]::ParseFile('${script.replace(/'/g, "''")}',[ref]$t,[ref]$e);($a.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath }) -join ','`], { encoding: 'utf8' });
    const names = r.stdout.trim().split(',').filter(Boolean);
    const atLike = names.filter((x) => x.toLowerCase().startsWith('at'));
    return { names, ok: atLike.length === 1 && atLike[0] === 'At' };
}

try {
    log(`night-gates calibration  ${new Date().toISOString()}`);
    log(`script sha256 ${sha(SCRIPT)}`);
    log(`driver sha256 ${sha(fileURLToPath(import.meta.url))}`);
    const head = fs.readFileSync(SCRIPT).subarray(0, 3);
    const bomOk = head[0] === 0xEF && head[1] === 0xBB && head[2] === 0xBF;
    const pf = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${SCRIPT.replace(/'/g, "''")}',[ref]$t,[ref]$e);$e.Count`], { encoding: 'utf8' });
    const nonAscii = [...fs.readFileSync(SCRIPT)].slice(3).filter((b) => b > 127).length;
    log(`UTF-8 BOM ${bomOk ? 'present' : 'ABSENT (FAIL)'}; ParseFile errors ${pf.stdout.trim()} (expected 0); non-ASCII bytes after the BOM ${nonAscii}`);
    if (!bomOk || pf.stdout.trim() !== '0') fails++;
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const mut = src.match(/Set-ItemProperty|New-ItemProperty|Remove-Item|Remove-ItemProperty|Set-Content|Out-File|Set-Service|Restart-Computer|Stop-Computer|Disable-|Enable-|reg(\.exe)?\s+(add|delete)|powercfg(\.exe)?\s+\/(?!q\b)/gi);
    const pcfg = [...src.matchAll(/powercfg\.exe\s+(\S+)/gi)].map((m) => m[1]);
    log(`read-only scan: mutating-verb matches ${mut ? mut.length : 0} (expected 0); every powercfg call's first argument: ${pcfg.join(' ')} (expected only /q)`);
    if (mut || pcfg.some((a) => a !== '/q')) fails++;
    const pc = paramCheck(SCRIPT);
    log(`parameter names: ${pc.names.join(', ')}; names starting with "At" (case-insensitively): ${pc.names.filter((x) => x.toLowerCase().startsWith('at')).join(', ')} (expected exactly "At", N-m4)  => ${pc.ok ? 'PASS' : 'FAIL'}`);
    if (!pc.ok) fails++;
    log(`machine zone for At: ${Intl.DateTimeFormat().resolvedOptions().timeZone}, offset ${-new Date().getTimezoneOffset() / 60} h (the pause boundary cases derive their instants from it)`);
    log('');

    for (const c of CASES) {
        const res = runCase(SCRIPT, c);
        const exp = c[3];
        const pass = passes(res, c);
        if (!pass) fails++;
        log(`${c[0]}   [At ${c[1]}]`);
        log(`   expected: ${GATES.map((g) => `${g}=${exp[g]}`).join(' ')} | ${expectedLast(exp)} (exit ${c[4]})${c[5]?.lines ? ` | lines present: ${c[5].lines.length}` : ''}`);
        for (const l of res.lines) log(`   actual  : ${l}`);
        log(`   exit ${res.code}${res.err ? ' STDERR ' + res.err : ''} => ${pass ? 'PASS' : 'FAIL'}`);
    }

    log('');
    log('Refusals (exit 2, no gate lines):');
    const bad = [
        ['bad -At "garbage"', ['-At', 'garbage', '-FakeJson', fakeFile({})]],
        ['bad -At "2026-10-05 25:00"', ['-At', '2026-10-05 25:00', '-FakeJson', fakeFile({})]],
        ['bad -At "2026-10-5 21:00" (not zero padded)', ['-At', '2026-10-5 21:00', '-FakeJson', fakeFile({})]],
        ['bad -At "2026-02-30 21:00"', ['-At', '2026-02-30 21:00', '-FakeJson', fakeFile({})]],
        ['no -At at all', ['-FakeJson', fakeFile({})]],
        ['-FakeJson file missing', ['-At', AT, '-FakeJson', path.join(TMP, 'nope.json')]],
        ['-PowercfgTextFile missing', ['-At', AT, '-FakeJson', fakeFile({}), '-PowercfgTextFile', path.join(TMP, 'nope.txt')]],
    ];
    for (const k of ['rebootRequiredWu', 'batteryFlag', 'rebootParentMissing', 'pauseQualityUpdatesEnd', 'policyOverrides']) {
        const f = path.join(TMP, `nokey-${k}.json`); const nk = { ...G0 }; delete nk[k]; fs.writeFileSync(f, JSON.stringify(nk));
        bad.push([`-FakeJson lacks key ${k}`, ['-At', AT, '-FakeJson', f]]);
    }
    const badJ = path.join(TMP, 'bad.json'); fs.writeFileSync(badJ, '{nope');
    bad.push(['-FakeJson is not JSON', ['-At', AT, '-FakeJson', badJ]]);
    bad.push(['-FakeJson battery is a string other than none/error', ['-At', AT, '-FakeJson', fakeFile({ battery: 'weird' })]]);
    for (const [label, args] of bad) {
        const res = ps(SCRIPT, args);
        const pass = res.code === 2 && !res.lines.some((l) => /^NIGHT (standby|hibernate|power|reboot|updates)/.test(l)) && res.lines.some((l) => l.startsWith('NIGHT usage error:'));
        if (!pass) fails++;
        log(`  ${label}: exit ${res.code}, first line "${res.lines[0] ?? ''}" => ${pass ? 'PASS' : 'FAIL'}`);
    }

    // Mutants: one edit each in a copy of the script; the targeted case must then read differently from its expectation.
    log('');
    log('Mutants (a copy of the script with one edit; the targeted case must NOT pass, i.e. the case can see the branch):');
    const MUTS = [
        ['standby test -eq 0 -> -ge 0', /\$rd\.standbyAcSec\s+-eq 0\)/, '$rd.standbyAcSec -ge 0)', '2'],
        ['hibernate test -eq 0 -> -ge 0', /\$rd\.hibernateAcSec\s+-eq 0\)/, '$rd.hibernateAcSec -ge 0)', '3'],
        ['reboot ignores WU RebootRequired', '-not ($rd.rebootPendingCbs -or $rd.rebootRequiredWu)', '-not ($rd.rebootPendingCbs)', '6'],
        ['reboot ignores a missing parent key (N-m1)', 'if ($rd.rebootParentMissing) {', 'if ($false) {', '5a'],
        ['active-hours end exclusive ($to -lt $winEnd)', '$to -le $winEnd', '$to -lt $winEnd', '9'],
        ['active-hours start exclusive ($winStart -lt $from)', '$winStart -le $from', '$winStart -lt $from', '14'],
        ['pause test -gt -> -ge', '$earliest -gt $paHi', '$earliest -ge $paHi', '13'],
        ['pause reads PauseUpdatesExpiryTime only, not the earliest of the three (N-m2)', '$pePresent = @($pauseVals.Keys | Where-Object { $pauseVals[$_] })', '$pePresent = @(\'PauseUpdatesExpiryTime\' | Where-Object { $pauseVals[$_] })', '13b'],
        ['power: any status accepted when AC line online', '$chargeAc -notcontains $_', '$false', '4f'],
        ['power: the AC-online requirement removed (the A2-literal status-2 path, N-I1 C2)', 'if ($rd.acLine -ne $true) {', 'if ($false) {', '4h'],
        ['power: a failed Win32_Battery query read as "no battery" (N-I1 C1 / A4-RECHECK m2)', 'elseif ($rd.batteryQueryError) {', 'elseif ($false) {', '4g'],
        ['power: an empty query accepted without BatteryFlag 128', 'if ($rd.batteryFlag -eq 128) {', 'if ($true) {', '4a1'],
        ['powercfg: "exactly five hex values" relaxed to "at least four"', '$hexes.Count -ne 5', '$hexes.Count -lt 4', 'tx4'],
        ['powercfg: the AC value taken from the Minimum hex ($hexes[0])', '$hexes[3].Value', '$hexes[0].Value', 'tx2'],
        ['powercfg: the AC value taken from the DC hex ($hexes[4])', '$hexes[3].Value', '$hexes[4].Value', 'tx3'],
        ['updates ignores the policy override values (NG-I1; the old build)', '$ovOk = (@($rd.policyOverrides).Count -eq 0)', '$ovOk = $true', 'i1'],
        ['updates ignores the policy override values (NG-I1; the old build), single-value case', '$ovOk = (@($rd.policyOverrides).Count -eq 0)', '$ovOk = $true', 'i2'],
        ['updates ignores the policy override values (NG-I1), override as an alternative to the hours/pause (OR instead of AND)', '(($hoursOk -or $pauseOk) -and $ovOk)', '($hoursOk -or $pauseOk -or -not $ovOk)', 'i2a'],
        ['the policy INFO line removed (N-m3)', 'Write-Output (\'NIGHT policy: INFO', '$null = (\'NIGHT policy: INFO', 'i1'],
        ['the pause-status INFO line removed (N-m3)', 'Write-Output (\'NIGHT pause-status: INFO', '$null = (\'NIGHT pause-status: INFO', 'i1'],
    ];
    for (const [label, from, to, idx] of MUTS) {
        const hit = from instanceof RegExp ? from.test(src) : src.includes(from);
        if (!hit) { log(`  MUTANT ANCHOR NOT FOUND: ${label}`); fails++; continue; }
        const mp = path.join(TMP, 'mutant.ps1');
        const mutated = src.replace(from, () => to).replace(/^﻿/, '');
        fs.writeFileSync(mp, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(mutated, 'utf8')]));
        const target = CASES.find((x) => x[0].split(' ')[0] === idx);
        if (!target) throw new Error(`no case ${idx}`);
        const res = runCase(mp, target);
        const differs = !passes(res, target);
        if (!differs) fails++;
        log(`  ${label}: case "${target[0].slice(0, 60)}" now reads ${verdictOf(res).last} (exit ${res.code}) => ${differs ? 'FLIPPED (calibrated)' : 'DID NOT FLIP (FAIL)'}`);
    }
    // N-m4: the parameter-name scan must see a rename back to $AtText
    {
        const mp = path.join(TMP, 'mutant-at.ps1');
        const mutated = src.replace(/^﻿/, '').replace(/\$At\b/g, '$AtText');
        fs.writeFileSync(mp, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(mutated, 'utf8')]));
        const m = paramCheck(mp);
        if (m.ok) fails++;
        log(`  parameter renamed back to $AtText: parameter names ${m.names.join(', ')} => the scan reads ${m.ok ? 'OK (DID NOT FLIP, FAIL)' : 'FAIL (FLIPPED, calibrated)'}`);
    }
} finally {
    fs.rmSync(TMP, { recursive: true, force: true });
}

log('');
log('REAL MACHINE reading (read-only; informative, this is the arming reading, not a calibration case):');
for (const at of ['2026-10-05 19:30', '2026-10-05 21:00', '2026-10-06 01:00']) {
    const res = ps(SCRIPT, ['-At', at]);
    log(`  powershell -File night-gates.ps1 -At '${at}'   (exit ${res.code})`);
    for (const l of res.lines) log(`    ${l}`);
    if (res.code !== 0) { log('    (real reading did not pass: informative, not a calibration failure)'); }
}
{
    // the live powercfg text through the file path must read the same sleep timeouts as the live script (the real parse boundary)
    const t = spawnSync('powercfg.exe', ['/q', 'SCHEME_CURRENT', 'SUB_SLEEP', 'STANDBYIDLE'], { encoding: 'utf8' }).stdout ?? '';
    const hexCount = (t.match(/0x[0-9a-fA-F]{8}/g) ?? []).length;
    const tf = path.join(os.tmpdir(), `night-gates-live-${process.pid}.txt`);
    fs.writeFileSync(tf, t, 'utf8');
    try {
        const live = ps(SCRIPT, ['-At', '2026-10-05 21:00']);
        const viaFile = ps(SCRIPT, ['-At', '2026-10-05 21:00', '-PowercfgTextFile', tf]);
        const pick = (r) => r.lines.find((l) => l.startsWith('NIGHT standby-ac:')) ?? '(none)';
        const same = pick(live) === pick(viaFile) && hexCount === 5;
        if (!same) fails++;
        log(`LIVE powercfg text (${hexCount} hex values) through -PowercfgTextFile vs the live script, standby-ac line: ${pick(viaFile)} | ${pick(live)} => ${same ? 'PASS (identical)' : 'FAIL'}`);
    } finally { fs.rmSync(tf, { force: true }); }
}
log('');
log(fails ? `CALIBRATION FAILED (${fails})` : 'CALIBRATION PASSED');
const txt = out.join('\n') + '\n';
fs.writeFileSync(path.join(E, 'night-gates-cal.txt'), txt, 'utf8');
fs.writeFileSync(path.join(E, 'night-gates.cal.txt'), txt, 'utf8');
process.exit(fails ? 1 : 0);
