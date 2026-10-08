// F4 calibration of cue-material-eq.mjs (rev 7 §7 F4 + A1.1-A1.3 + A2.3 cases 1-8 + A3.2/A3.5 cases 9-12 + A4.1 cases 13-14 + A4.3 REG cases).
// Expectations are written in each check's name BEFORE the tool's answer is read. Synthetic fixtures carry invented cue strings only.
// Fixture exports are produced by the real b10 (E\eq-cues-export.mjs) and then forged for the refuse cases.
// Run: node cue-material-eq.cal.mjs > cue-material-eq.cal.txt   (the h40d case reads b10's own h40d calibration export + the h40d run folder; counts only)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const C = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(C), E = path.join(SP, 'flight-eq');
const TOOL = process.env.CME_TOOL ?? path.join(C, 'cue-material-eq.mjs');
const T = await import(pathToFileURL(TOOL).href);
const B10 = path.join(E, 'eq-cues-export.mjs');
const TMP = path.join(os.tmpdir(), process.env.CME_TOOL ? 'cue-eq-cal-mut' : 'cue-eq-cal');
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + String(detail).slice(0, 160) : ''}`); };
const w = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f); if (fs.statSync(s).isFile()) fs.copyFileSync(s, path.join(b, f)); } };

const B = Date.parse('2026-10-05T23:00:00.000Z');
const ts = (ms) => new Date(ms).toISOString();
const HEAD = 'a'.repeat(40);
const IDS = ['S1Q01', 'S1Q02', 'S1Q03'];
const idRe = /^S[12]Q(0[1-9]|10)F?$/;

// ---- fixture builders ------------------------------------------------------------------------------------------------
const armingPath = path.join(TMP, 'ARMING-fake.md');
w(armingPath, `# fake\n- Registered HEAD: ${HEAD}\n`);
const armingSha = sha(fs.readFileSync(armingPath));
const mkLauncher = (name, lines) => { const p = path.join(TMP, name); w(p, lines.join('\n') + '\n'); return p; };
const launcher = mkLauncher('launcher-good.log', [`ARMING sha256=${armingSha}`, `${ts(B - 3600000)} FLIGHT eq start`]);
const instrPath = path.join(TMP, 'instruments.sha256.txt');
const b10sha = sha(fs.readFileSync(B10));
w(instrPath, `2026-10-06T06:00:00+03 eq-cues-export.mjs sha256=${b10sha} cal=eq-cues-export.cal.txt:abc review=fake\n`);

function buildRun(name, v = {}) {
    const d = path.join(TMP, 'runs', name); fs.mkdirSync(d, { recursive: true });
    const items = [{ id: 'S1Q01', playedAt: B }, { id: 'S1Q02', playedAt: B + 80000 }, { id: 'S1Q03', playedAt: B + 160000 }].map((i) => ({ ...i, kind: 'spoken', clipSecs: 10, q: 'q' }));
    const L = [`${ts(B - 60000)} [LOG] [Answer] cues: ["before window one"]`, `${ts(B - 59000)} [LOG] [Answer] full: "probe answer before the window"`];
    const pairs = [];
    if (v.probe) {
        const pb = v.probe;
        L.push(`${ts(B - 10000)} [LOG] [Main] dispatch: answer source=whisper anchor="p" verdict=ok question="pq"`);
        if (!pb.noTurn) L.push(`${ts(B + pb.turnAt)} [LOG] [IntelligenceEngine] earlier question: gate=no-cue cue=none chars=0 turn=${pb.turnNum} ms=6`);
        L.push(`${ts(B + 3000)} [LOG] [Answer] cues: ["probe cue one","probe cue two"]`);
        L.push(`${ts(B + 3050)} [LOG] [Answer] cues trimmed: ["probe cue one"]`);
        L.push(`${ts(B + 3100)} [LOG] [Answer] full: "probe answer"`);
        if (pb.pairAt != null) pairs.push({ id: 'S1Q09', kind: 'spoken', dispatchedAt: ts(B + pb.pairAt), question: 'x', answer: 'x' });
    }
    items.forEach((it, k) => {
        const dt = it.playedAt + 12000, o = (v[it.id] ?? {});
        if (!o.noTurn && !v.noRosterTurns) L.push(`${ts(dt + 100)} [LOG] [IntelligenceEngine] earlier question: gate=no-cue cue=none chars=0 turn=${3 + k} ms=6`);
        L.push(`${ts(dt)} [LOG] [Main] dispatch: answer source=live anchor="a${k}" verdict=ok question="q${k}"`);
        pairs.push({ key: it.id, id: it.id, kind: 'spoken', level: 'x', topic: 'x', question: `what is topic ${k}?`, heard: 'x', source: 'live', verdict: 'ok', dispatchedAt: ts(dt), answer: `spoken answer ${k}`, extended: false, superseded: false });
        if (o.supersededFirst) { L.push(`${ts(dt + 3000)} [LOG] [Answer] cues: ["first stream cue ${k}"]`); L.push(`${ts(dt + 3010)} [LOG] [IntelligenceEngine] _what_to_say stream aborted by new generation`); }
        L.push(`${ts(dt + 5000)} [LOG] [Answer] cues: ${JSON.stringify([`cue one ${k}`, `cue two ${k}`])}`);
        L.push(`${ts(dt + 5001)} [LOG] [Answer] cues trimmed: ["cue one ${k}"]`);
        L.push(`${ts(dt + 9000)} [LOG] [Answer] full: ${JSON.stringify(`spoken answer ${k}`)}`);
        if (o.strayAfter) L.push(`${ts(dt + 14000)} [LOG] [Answer] cues: ["stray stream of ${it.id}"]`);
    });
    const text = L.join('\n') + '\n';
    w(path.join(d, 'natively_debug.log'), text);
    const off = Buffer.byteLength(L.slice(0, 2).join('\n') + '\n');
    w(path.join(d, 'interview60.timeline.json'), JSON.stringify({ startedAt: ts(B), endedAt: ts(B + 400000), startDebug: off, endDebug: Buffer.byteLength(text), startDiag: 0, endDiag: 0, items }));
    w(path.join(d, 'verbal-diag.log'), '');
    w(path.join(d, 'interview60.judge.pairs.json'), JSON.stringify({ model: 'x', rubric: 'x', items: pairs }));
    const jitems = Object.fromEntries(IDS.map((id, k) => [id, { id, correctness: k === 1 ? 0 : k === 2 ? 1 : 2 }]));
    w(path.join(d, 'interview60.judge.json'), JSON.stringify({ model: 'x', graderModel: 'claude-opus-5-5', items: jitems }));
    if (!v.noTwins) {
        w(path.join(d, 'interview60.prompts.json'), JSON.stringify(Object.fromEntries(IDS.map((id) => [id, { system: 's', user: 'u' }]))));
        for (const f of T.TWIN_FILES) {
            const tag = `${f.arm}-r${f.rep}`;
            w(path.join(d, f.src), JSON.stringify(Object.fromEntries(IDS.map((id, k) => [id, { id, spoken: (tag === 'captured-high-r1' && k === 2) ? '' : `twin ${tag} spoken ${k}`, cues: [`twin ${tag} cue a${k} $x$`, `twin ${tag} cue b${k}`] }]))));
            w(path.join(d, f.judge), JSON.stringify({ model: 'x', graderModel: v.judgeModel ?? 'claude-opus-5-5', items: Object.fromEntries(IDS.map((id, k) => [id, { id, correctness: 2 }])) }));
            w(path.join(d, f.pairs), JSON.stringify({ model: 'x', rubric: 'x', items: IDS.map((id, k) => ({ id, question: `what is topic ${k}?`, dispatchedAt: null })) }));
        }
    }
    const out = path.join(TMP, 'out', name);
    const r = spawnSync(process.execPath, [B10, d, '--out-dir', out, '--arming', armingPath, '--launcher-log', launcher, ...(v.noTwins ? ['--no-twins'] : []), ...(v.idRe ? ['--id-re', v.idRe] : [])], { encoding: 'utf8', env: { ...process.env, EQ_CAL_OVERRIDES: '1' } });
    return { d, out, code: r.status, b10out: r.stdout };
}

const writeHashes = (p, runDir, mut = {}) => {
    const rel = (f) => `cue-grading\\${f}`;
    const rows = [];
    const add = (file, role, relpath) => rows.push(`${sha(fs.readFileSync(file))}  ${relpath ?? file}  ${role}`);
    add(path.join(C, 'PREREGISTER-cue-grading-rev7.md'), 'REGISTRATION', rel('PREREGISTER-cue-grading-rev7.md'));
    for (const a of ['A1', 'A2', 'A3', 'A4']) add(path.join(C, `AMENDMENT-rev7-${a}.md`), 'AMENDMENT', rel(`AMENDMENT-rev7-${a}.md`));
    add(path.join(C, 'NOTE-flight-eq-export-2026-10-06.md'), 'INPUT', rel('NOTE-flight-eq-export-2026-10-06.md'));
    if (runDir && !mut.noPins) { add(path.join(runDir, 'interview60.judge.pairs.json'), 'INPUT'); add(path.join(runDir, 'interview60.timeline.json'), 'INPUT'); }
    const text = ['# fixture HASHES', ...rows].join('\n') + '\n';
    if (mut.bom) fs.writeFileSync(p, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]));
    else if (mut.latin) fs.writeFileSync(p, Buffer.from(text.replace(/\\/g, '\\'), 'latin1'));      // non-ASCII path characters become single bytes (not UTF-8)
    else fs.writeFileSync(p, text);
};

// forge: a copy of a built export with edits; returns the option set for verify
let caseNo = 0;
function opts(name, edit = {}) {
    const dir = path.join(TMP, 'cases', `${name.replace(/\W+/g, '_')}-${++caseNo}`); fs.mkdirSync(dir, { recursive: true });
    const src = edit.from;
    const exp = JSON.parse(fs.readFileSync(path.join(src.out, 'cues-export-eq.json'), 'utf8'));
    let comp = fs.readFileSync(path.join(src.out, 'cues-export-eq.completeness.txt'), 'utf8').trim().split('\n');
    let runDir = src.d;
    if (edit.cloneRun) { runDir = path.join(dir, 'run'); copyDir(src.d, runDir); edit.cloneRun(runDir); }
    exp.runDir = runDir.replace(/\\/g, '/');
    if (edit.exp) edit.exp(exp);
    if (edit.comp) comp = edit.comp(comp);
    w(path.join(dir, 'exp.json'), JSON.stringify(exp));
    w(path.join(dir, 'comp.txt'), comp.join('\n') + '\n');
    const hp = path.join(dir, 'HASHES.txt'); writeHashes(hp, runDir, edit.hashes ?? {});
    if (edit.afterHashes) edit.afterHashes(runDir, hp);
    let instr = instrPath;
    if (edit.instr !== undefined) { instr = path.join(dir, 'instr.txt'); w(instr, edit.instr); }
    let ar = armingPath, lg = launcher;
    if (edit.arming) { ar = path.join(dir, 'ARMING.md'); w(ar, edit.arming); }
    if (edit.launcher) { lg = path.join(dir, 'launcher.log'); w(lg, edit.launcher.replace('%SHA%', sha(fs.readFileSync(ar)))); }
    return { ...T.defaults(), hashesPath: hp, instrumentsPath: instr, b10Path: B10, exportPath: path.join(dir, 'exp.json'), completenessPath: path.join(dir, 'comp.txt'), armingPath: ar, launcherLogPath: lg, idRe: edit.idRe ?? idRe, outRoot: path.join(dir, 'material'), dir, ...(edit.o ?? {}) };
}
async function run(name, edit) {
    const o = opts(name, edit);
    try { const ctx = await T.verify(o); return { ok: true, ctx, o, text: ctx.out.join('\n') }; }
    catch (e) { return { ok: false, err: e.refusal ? e.message : `CRASH ${e?.name}`, o, refusal: !!e.refusal }; }
}
const refused = (r, re) => !r.ok && r.refusal && (re ? re.test(r.err) : true);
const withLines = (comp, add, rm = () => false) => { const last = comp.at(-1); const body = comp.slice(0, -1).filter((l) => !rm(l)); return [...body, ...add, last]; };

// ---- leak check calibrated first ----------------------------------------------------------------------------------------
const leaks = (text, strs) => strs.filter((c) => c.length >= 8 && text.includes(c)).length;
check('leak checker: a text holding one cue string -> 1', leaks('x cue one 0 y', ['cue one 0']) === 1);
check('leak checker: clean text -> 0', leaks('nothing', ['cue one 0']) === 0);

// ---- build the base fixtures --------------------------------------------------------------------------------------------
const clean = buildRun('clean');
const probeOk = buildRun('probe', { probe: { turnAt: -9900, turnNum: 2 } });
check('fixture: b10 builds the clean run COMPLETE (exit 0)', clean.code === 0, clean.b10out?.split('\n').at(-4));
check('fixture: b10 builds tonight\'s probe shape COMPLETE with probe 1 (exit 0)', probeOk.code === 0 && /^probe \d+$/m.test(probeOk.b10out), probeOk.b10out?.split('\n').filter((l) => /EXPORT|probe/.test(l)).join('|'));
const lineOfProbe = Number(probeOk.b10out.match(/^probe (\d+)$/m)?.[1]);
const probeLog = fs.readFileSync(path.join(probeOk.d, 'natively_debug.log'), 'utf8').split('\n');

// ---- REG (A1.8, A4.3) ---------------------------------------------------------------------------------------------------
{
    let r = await run('REG good', { from: clean });
    check('REG: a good HASHES.txt (relative rows + absolute INPUT rows) -> accepted; first printed line is `REG <sha16>` of the registration', r.ok && /^REG [0-9a-f]{16}$/.test(r.ctx.out[0]) && r.ctx.out[0].slice(4) === sha(fs.readFileSync(path.join(C, 'PREREGISTER-cue-grading-rev7.md'))).slice(0, 16), r.err);
    r = await run('REG amendment edited', { from: clean, afterHashes: (rd, hp) => { const t = fs.readFileSync(hp, 'utf8').split('\n'); t[2] = t[2].replace(/^[0-9a-f]{64}/, '0'.repeat(64)); fs.writeFileSync(hp, t.join('\n')); } });
    check('REG: an amendment whose sha differs from its line -> refuse', refused(r, /hashes to/), r.err);
    r = await run('REG bom', { from: clean, hashes: { bom: true } });
    check('A4.3: HASHES.txt saved with a BOM -> refuse', refused(r, /BOM/), r.err);
    r = await run('REG legacy codepage', { from: clean, hashes: {}, afterHashes: (rd, hp) => { const t = fs.readFileSync(hp, 'utf8') + `${'0'.repeat(64)}  C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\x.json  INPUT\n`; fs.writeFileSync(hp, Buffer.from(t, 'latin1')); } });
    check('A4.3: the same absolute line with `Masaüstü` in a legacy code page (not UTF-8) -> refuse', refused(r, /UTF-8/), r.err);
    r = await run('REG absolute edited', { from: clean, afterHashes: (rd) => fs.appendFileSync(path.join(rd, 'interview60.judge.pairs.json'), ' ') });
    check('A4.3: an absolute-path INPUT line whose file was edited after hashing -> refuse', refused(r, /hashes to/), r.err);
    r = await run('REG pairs not pinned', { from: clean, hashes: { noPins: true } });
    check('A3.7: the run\'s pairs/timeline missing from HASHES.txt as INPUT rows -> refuse', refused(r, /INPUT row/), r.err);
    r = await run('REG CRLF', { from: clean, afterHashes: (rd, hp) => fs.writeFileSync(hp, fs.readFileSync(hp, 'utf8').replace(/\n/g, '\r\n')) });
    check('A4.3: HASHES.txt with CR line ends -> refuse', refused(r, /CR/), r.err);
    r = await run('REG malformed', { from: clean, afterHashes: (rd, hp) => fs.appendFileSync(hp, 'not a row\n') });
    check('A4.3: a line that does not split into <64 hex>  <path>  <role> -> refuse', refused(r, /does not split/), r.err);
    r = await run('REG no A4', { from: clean, afterHashes: (rd, hp) => fs.writeFileSync(hp, fs.readFileSync(hp, 'utf8').split('\n').filter((l) => !/A4\.md/.test(l)).join('\n')) });
    check('REG: a HASHES.txt with no row for AMENDMENT-rev7-A4.md -> refuse', refused(r, /A4/), r.err);
}

// ---- b10 line, ARMING, LOG, the contract ---------------------------------------------------------------------------------
{
    let r = await run('clean', { from: clean });
    check('F4: a complete export -> accepted; in-app 3 on 3 ids, probe 0, superseded 0, turn lines 3', r.ok && /in-app entries 3 ids 3; superseded 0/.test(r.text) && /^probe 0/m.test(r.text) && /^turn lines 3$/m.test(r.text), r.err ?? r.text);
    check('F4: twins: six reps of 3 entries = records, cues equal', r.ok && (r.text.match(/ = records, cues equal/g) ?? []).length === 6);
    r = await run('instr missing', { from: clean, instr: '' });
    check('T1: the b10 line missing from instruments.sha256.txt -> refuse', refused(r, /missing from instruments/), r.err);
    r = await run('instr sha', { from: clean, instr: `x eq-cues-export.mjs sha256=${'1'.repeat(64)} cal=a review=b\n` });
    check('T1: that line\'s sha != the tool file\'s -> refuse', refused(r, /is not the tool file/), r.err);
    r = await run('head', { from: clean, exp: (e) => { e.registeredHead = 'b'.repeat(40); } });
    check('T1: registeredHead != the ARMING record\'s HEAD -> refuse', refused(r, /registeredHead/), r.err);
    r = await run('arming sha', { from: clean, launcher: `ARMING sha256=${'2'.repeat(64)}\n${ts(B - 3600000)} FLIGHT eq start\n` });
    check('T1: the ARMING file\'s sha != the launcher log\'s ARMING line -> refuse', refused(r, /ARMING/), r.err);
    r = await run('arming two later ok', { from: clean, launcher: `ARMING sha256=${'3'.repeat(64)}\n${ts(B - 7200000)} FLIGHT a\nARMING sha256=%SHA%\n${ts(B - 3600000)} FLIGHT eq start\n${ts(B + 1000)} later\nARMING sha256=${'4'.repeat(64)}\n` });
    check('U2: two ARMING lines, only the later (pre-start) one matches -> accept', r.ok, r.err);
    r = await run('arming earlier only', { from: clean, launcher: `ARMING sha256=%SHA%\n${ts(B - 7200000)} FLIGHT a\nARMING sha256=${'3'.repeat(64)}\n${ts(B - 3600000)} FLIGHT eq start\n` });
    check('U2: only the earlier ARMING line matches -> refuse', refused(r, /ARMING/), r.err);
    r = await run('arming two hex', { from: clean, arming: `- Registered HEAD: ${HEAD} and ${'c'.repeat(40)}\n`, launcher: `ARMING sha256=%SHA%\n${ts(B - 3600000)} FLIGHT eq start\n` });
    check('U2: a record with two 40-hex HEAD values -> refuse', refused(r, /40-hex/), r.err);
    r = await run('arming absent', { from: clean, launcher: `ARMING absent\n${ts(B - 3600000)} FLIGHT eq start\n` });
    check('U2: `ARMING absent` -> refuse', refused(r, /ARMING/), r.err);
    r = await run('log sha', { from: clean, comp: (c) => c.map((l) => l.replace(/^(LOG \S+ )[0-9a-f]{64}$/, `$1${'5'.repeat(64)}`)) });
    check('T2: the LOG sha != the log\'s -> refuse', refused(r, /LOG sha256/), r.err);
    r = await run('forbidden', { from: clean, exp: (e) => { e.entries[3].spoken = 'x'; } });
    check('F4: a forbidden field (`spoken`) -> refuse', refused(r, /forbidden/), r.err);
    r = await run('id outside', { from: clean, exp: (e) => { e.entries[0].id = 'S3Q01'; } });
    check('F4: an id outside S1+S2 -> refuse', refused(r, /outside the roster/), r.err);
    r = await run('twin cues', { from: clean, exp: (e) => { const t = e.entries.find((x) => x.arm === 'captured-high'); t.cues = ['changed cue text']; } });
    check('F4: a twin entry whose cues differ from its answer record -> refuse', refused(r, /cues differ/), r.err);
    r = await run('twin r4', { from: clean, exp: (e) => { const t = e.entries.find((x) => x.arm === 'captured-high'); t.src = 'interview60.answers.gemini-3.5-flash-lite_captured-high-r4.json'; } });
    check('T1: a twin entry with src = ...captured-high-r4.json -> refuse', refused(r, /six answer files/), r.err);
    r = await run('inapp cues', { from: clean, exp: (e) => { e.entries[0].cues = ['not what the log says']; } });
    check('T2: an in-app entry whose cues differ from its log line -> refuse', refused(r, /different cues/), r.err);
    const trimN = probeLog.findIndex((l) => /cues trimmed:/.test(l)) + 1;
    const cleanLog = fs.readFileSync(path.join(clean.d, 'natively_debug.log'), 'utf8').split('\n');
    const trimC = cleanLog.findIndex((l) => /cues trimmed:/.test(l)) + 1;
    r = await run('trimmed', { from: clean, exp: (e) => { e.entries[0].logLine = trimC; e.entries[0].cues = ['cue one 0']; } });
    check('F4: an entry whose logLine points at a `cues trimmed:` line -> refuse', refused(r, /not an in-window \[Answer\] cues/), r.err);
    r = await run('outside', { from: clean, exp: (e) => { e.entries[0].logLine = 1; e.entries[0].cues = ['before window one']; } });
    check('T2: a cues line timestamped outside window addressed by an entry -> refuse', refused(r, /not an in-window/), r.err);
    r = await run('missing+logline', { from: clean, exp: (e) => { e.entries[0].empty = 'missing'; e.entries[0].cues = []; } });
    check('T2: `empty: "missing"` with a non-null logLine -> refuse', refused(r, /missing|disagree/), r.err);
    r = await run('unnamed', { from: clean, exp: (e) => { e.entries.splice(1, 1); }, comp: (c) => c.map((l) => l.replace(/^in-app entries 3 ids 3$/, 'in-app entries 2 ids 2')) });
    check('T2: an in-window cues line neither addressed nor named -> refuse', refused(r, /neither addressed nor named/), r.err);
    r = await run('two entries', { from: clean, exp: (e) => { const a = e.entries[0]; e.entries.splice(1, 0, { ...a, id: 'S1Q02' }); }, comp: (c) => c.map((l) => l.replace(/^in-app entries 3 ids 3$/, 'in-app entries 4 ids 3')) });
    check('T2: one log line addressed by two entries -> refuse', refused(r), r.err);
    r = await run('dispatch null two entries', { from: clean, exp: (e) => { const a = e.entries[0]; e.entries.splice(1, 0, { ...a, dispatchedAt: null, empty: 'missing', cues: [], logLine: null }); }, comp: (c) => c.map((l) => l.replace(/^in-app entries 3 ids 3$/, 'in-app entries 4 ids 3')) });
    check('A1.1: an id with two in-app entries, one dispatchedAt null (a superseded stream exported as an entry) -> refuse', refused(r, /two-entry rule/), r.err);
    r = await run('incomplete 2', { from: clean, comp: (c) => [...c.slice(0, -1), 'EXPORT INCOMPLETE: S1Q01,S1Q02'] });
    check('F4: `EXPORT INCOMPLETE: a,b` -> 2 named exclusions (not FLT VOID)', r.ok && !r.ctx.fltVoid && r.ctx.excl.inapp.size === 2, r.err);
    r = await run('incomplete 3', { from: clean, comp: (c) => [...c.slice(0, -1), 'EXPORT INCOMPLETE: S1Q01,S1Q02,S1Q03'] });
    check('F4: `EXPORT INCOMPLETE: a,b,c` -> FLT VOID (export)', r.ok && r.ctx.fltVoid === true, r.err);
    r = await run('incomplete odd', { from: clean, comp: (c) => [...c.slice(0, -1), 'EXPORT INCOMPLETE: L12'] });
    check('an INCOMPLETE token that is not an id, a twin id or a file (L12) -> refuse (unexplained)', refused(r, /unexplained/), r.err);
}

// ---- superseded lines: U3 (A1.3), A3.2 + A4.1 ----------------------------------------------------------------------------
{
    const sup = buildRun('sup', { S1Q02: { supersededFirst: true } });
    check('fixture: b10 names one `superseded` line for the S1Q02 stream (exit 0)', sup.code === 0 && /^superseded \d+$/m.test(sup.b10out), sup.b10out?.split('\n').filter((l) => /EXPORT|superseded/.test(l)).join('|'));
    let r = await run('sup ok', { from: sup });
    check('F4: an in-window non-empty cues line named `superseded <n>` -> counts reconcile (present 4 = 3 + 1 + 0), no refusal', r.ok && /cueBlocks present 4 = entries 3 \+ superseded 1 \+ probe 0: OK/.test(r.text), r.err ?? r.text);
    r = await run('sup unnamed', { from: sup, comp: (c) => withLines(c, [], (l) => /^superseded \d+$/.test(l)) });
    check('F4: the same line neither addressed nor named -> refuse', refused(r, /neither addressed nor named/), r.err);
    const stray = buildRun('stray', { S1Q01: { strayAfter: true } });
    const strayN = Number((fs.readFileSync(path.join(stray.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /stray stream/.test(l)) + 1));
    r = await run('superseded outside', { from: sup, comp: (c) => withLines(c, ['superseded 1']) });
    check('rev 7 §1F: a `superseded <n>` naming a line outside the window (not an in-window cues line) -> refuse', refused(r, /not an in-window/), r.err);
    r = await run('U3 false superseded', { from: stray, comp: (c) => withLines(c, [`superseded ${strayN}`], (l) => /^undelivered /.test(l)).map((l) => l.replace(/^EXPORT INCOMPLETE:.*$/, 'EXPORT COMPLETE')) });
    check('U3: a delivered line named `superseded` with no later addressed line for that id -> refuse', refused(r, /U3/), r.err);
    // case 12: tonight's shape named `superseded` instead of `probe` (the line sits inside S1Q01's play window; S1Q01's own line follows)
    r = await run('case 12', { from: probeOk, comp: (c) => withLines(c, [`superseded ${lineOfProbe}`], (l) => /^probe \d+$/.test(l) || /^full lines exempt/.test(l)) });
    check('A3.2 (case 12): tonight\'s shape named `superseded` -> refuse (its turn started before window.startedAt), U3 alone would accept', refused(r, /A3\.2/) && /turn started before/.test(r.err), r.err);
    // case 13: turn lines present, none before the superseded line
    const c13 = buildRun('c13', { S1Q01: { supersededFirst: true, noTurn: true } });
    const c13n = Number((fs.readFileSync(path.join(c13.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /first stream cue 0/.test(l)) + 1));
    r = await run('case 13', { from: c13, comp: (c) => withLines(c, [`superseded ${c13n}`], (l) => /^undelivered /.test(l)).map((l) => l.replace(/^EXPORT INCOMPLETE:.*$/, 'EXPORT COMPLETE')) });
    check('A4.1 (case 13): a log with turn lines and no turn line before the `superseded <n>` line -> refuse', refused(r, /none lies before/), r.err);
    // case 14: 0 turn lines, valid U3
    const c14 = buildRun('c14', { noRosterTurns: true, S1Q02: { supersededFirst: true } });
    r = await run('case 14', { from: c14 });
    check('A4.1 (case 14): an h40d-shaped log (0 turn lines) with a valid U3 `superseded` line -> accept, "turn lines 0: A3.2 not applied"', r.ok && /^turn lines 0: A3.2 not applied$/m.test(r.text) && /superseded 1 /.test(r.text) && /^probe 0$/m.test(r.text), r.err ?? r.text);
    r = await run('A3.2 inside', { from: sup });
    check('A3.2: a `superseded` line whose turn starts inside the window with turn lines present -> accepted', r.ok);
}

// ---- probes: A2.3 cases 1-7, 9-11 ------------------------------------------------------------------------------------------
{
    let r = await run('case 1', { from: probeOk });
    check('A2.3 case 1: tonight\'s shape (turn before startedAt, N 2 < N_first 3, non-empty unaddressed line named `probe`) -> accept, probe 1, present 4 = 3 + 0 + 1', r.ok && /^probe 1 \[line \d+ turn 2 offset 3\.000 s\] N_first 3$/m.test(r.text) && /cueBlocks present 4 = entries 3 \+ superseded 0 \+ probe 1: OK/.test(r.text), r.err ?? r.text);
    const inside = buildRun('inside', { probe: { turnAt: 1000, turnNum: 2 } });
    const insideN = Number((fs.readFileSync(path.join(inside.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /probe cue one/.test(l) && /cues: /.test(l)) + 1));
    const nameProbe = (n) => (c) => withLines(c, [`probe ${n}`, 'full lines exempt (probe) 1'], (l) => /^undelivered /.test(l)).map((l) => l.replace(/^EXPORT INCOMPLETE:.*$/, 'EXPORT COMPLETE')).filter((l, i, a) => !(/^full lines exempt \(probe\) 0$/.test(l)));
    r = await run('case 2', { from: inside, comp: nameProbe(insideN) });
    check('A2.3 case 2: a line named `probe` whose turn starts inside the window -> refuse', refused(r, /started inside the window/), r.err);
    const addr = buildRun('addr', { probe: { turnAt: -9900, turnNum: 2, turnOnly: true }, S1Q01: { noTurn: true } });
    r = await run('case 3', { from: clean, comp: (c) => withLines(c, [`probe ${Number(fs.readFileSync(path.join(clean.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /cue one 0/.test(l) && /cues: /.test(l)) + 1)}`, 'full lines exempt (probe) 1'], (l) => /^full lines exempt/.test(l)) });
    check('A2.3 case 3: a `probe` line that an entry addresses -> refuse', refused(r, /named and also addressed/), r.err);
    const fullN = probeLog.findIndex((l) => /\[Answer\] full: "probe answer"/.test(l)) + 1;
    r = await run('case 4 full', { from: probeOk, comp: (c) => c.map((l) => l.replace(/^probe \d+$/, `probe ${fullN}`)) });
    check('A2.3 case 4 (M3): a `probe <n>` whose line is the paired `full:` line -> refuse', refused(r, /not an in-window \[Answer\] cues/), r.err);
    const trimN = probeLog.findIndex((l) => /cues trimmed:/.test(l)) + 1;
    r = await run('case 4 trimmed', { from: probeOk, comp: (c) => c.map((l) => l.replace(/^probe \d+$/, `probe ${trimN}`)) });
    check('A2.3 case 4 (M3): a `probe <n>` whose line is a `cues trimmed:` line -> refuse', refused(r, /not an in-window \[Answer\] cues/), r.err);
    r = await run('case 5', { from: probeOk, cloneRun: (rd) => { const p = path.join(rd, 'interview60.judge.pairs.json'); const j = JSON.parse(fs.readFileSync(p, 'utf8')); j.items.push({ id: 'S1Q09', dispatchedAt: ts(B - 1000), question: 'x', answer: 'x' }); fs.writeFileSync(p, JSON.stringify(j)); } });
    check('A2.3 case 5 (M1): case 1 plus one judge pair dispatchedAt before startedAt -> refuse', refused(r, /before window\.startedAt/), r.err);
    const eqN = buildRun('eqN', { probe: { turnAt: -9900, turnNum: 3 } });
    const eqNn = Number((fs.readFileSync(path.join(eqN.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /probe cue one/.test(l) && /cues: /.test(l)) + 1));
    r = await run('case 6a', { from: eqN, comp: nameProbe(eqNn) });
    check('A2.3 case 6 (M2): N equal to N_first (derived from the fixture log) -> refuse', refused(r, /not lower than N_first/), r.err);
    const noRoster = buildRun('noRoster', { noRosterTurns: true, probe: { turnAt: -9900, turnNum: 2 } });
    const nrn = Number((fs.readFileSync(path.join(noRoster.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /probe cue one/.test(l) && /cues: /.test(l)) + 1));
    r = await run('case 6b', { from: noRoster, comp: nameProbe(nrn) });
    check('A2.3 case 6 (M2): a fixture log with no turn line at or after the earliest pairs dispatchedAt -> refuse', refused(r, /N_first underivable/), r.err);
    r = await run('case 7', { from: probeOk, comp: (c) => withLines(c, [], (l) => /^probe \d+$/.test(l) || /^full lines exempt/.test(l)) });
    check('A2.3 case 7: the probe line neither addressed nor named -> refuse', refused(r, /neither addressed nor named/), r.err);
    r = await run('case 9', { from: probeOk, comp: (c) => c.map((l) => l.replace(/^probe \d+$/, 'probe 1')) });
    check('A3.5 case 9: a `probe <n>` naming a cues line timestamped outside window -> refuse', refused(r, /not an in-window/), r.err);
    const noTurn = buildRun('noTurn', { probe: { noTurn: true } });
    const ntn = Number((fs.readFileSync(path.join(noTurn.d, 'natively_debug.log'), 'utf8').split('\n').findIndex((l) => /probe cue one/.test(l) && /cues: /.test(l)) + 1));
    r = await run('case 10', { from: noTurn, comp: nameProbe(ntn) });
    check('A3.5 case 10: a `probe <n>` with no turn line before n -> refuse (criterion 2)', refused(r, /no turn line before it/), r.err);
    const supP = buildRun('supP', { S1Q02: { supersededFirst: true } });
    const supN = Number(supP.b10out.match(/^superseded (\d+)$/m)[1]);
    r = await run('case 11a', { from: supP, comp: (c) => withLines(c, [`probe ${supN}`, 'full lines exempt (probe) 1'], (l) => /^full lines exempt/.test(l)) });
    check('A3.5 case 11: the same n as both `superseded n` and `probe n` -> refuse', refused(r, /both superseded and probe/), r.err);
    r = await run('case 11b', { from: probeOk, comp: (c) => withLines(c, [`probe ${lineOfProbe}`]) });
    check('A3.5 case 11: `probe n` named twice -> refuse', refused(r, /names a line twice/), r.err);
    r = await run('exempt missing', { from: probeOk, comp: (c) => c.filter((l) => !/^full lines exempt/.test(l)) });
    check('A2.1 M3: a probe line without the exempt-full-line count -> refuse', refused(r, /exempts/), r.err);
    r = await run('A4 gate', { from: clean });
    check('A4.1: with no probe line, N_first and criterion 5 are not evaluated (a run with turn lines after every pair still accepts; no "N_first" printed)', r.ok && !/N_first/.test(r.text));
    r = await run('A4 gate pair before', { from: clean, cloneRun: (rd) => { const p = path.join(rd, 'interview60.judge.pairs.json'); const j = JSON.parse(fs.readFileSync(p, 'utf8')); j.items.push({ id: 'S1Q09', dispatchedAt: ts(B - 1000), question: 'x', answer: 'x' }); fs.writeFileSync(p, JSON.stringify(j)); } });
    check('A4.1: criterion 5 is run-level only when a probe line exists: a pre-window pair with probe 0 -> not a refusal on this ground', r.ok || !/before window\.startedAt/.test(r.err ?? ''), r.err);
}

// ---- h40d: case 8 (A1.1 known answer under A3.2 + A4.1) ----------------------------------------------------------------------
{
    const MAINRUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
    const H40D = `${MAINRUNS}/2026-10-02T11-39-41-h40d`;
    const hOut = path.join(E, 'b10cal-out', 'h40d');
    const fromH = { out: hOut, d: H40D };
    if (!fs.existsSync(path.join(hOut, 'cues-export-eq.json'))) check('h40d: b10\'s calibration export exists', false);
    else {
        // b10's h40d export is the build under the new b10; rebuild it so the completeness file carries the A2 lines (counts only)
        const outH = path.join(TMP, 'out', 'h40d');
        const l = mkLauncher('l-h40d.log', [`ARMING sha256=${armingSha}`, `2000-01-01T00:00:00.000Z FLIGHT h40d start`]);
        const rb = spawnSync(process.execPath, [B10, H40D, '--out-dir', outH, '--arming', armingPath, '--launcher-log', l, '--id-re', '^R\\d{2}F?\\d?$'], { encoding: 'utf8', env: { ...process.env, EQ_CAL_OVERRIDES: '1' } });
        check('h40d: b10 rebuilds its calibration export COMPLETE (exit 0)', rb.status === 0, rb.status);
        const r = await run('case 8', { from: { out: outH, d: H40D }, idRe: /^R\d{2}F?\d?$/, launcher: `ARMING sha256=%SHA%\n2000-01-01T00:00:00.000Z FLIGHT h40d start\n`, arming: `- Registered HEAD: ${HEAD}\n` });
        check('A2.3 case 8 / A4.1: h40d -> in-app 44, ids 44, superseded 1, outside window 2, probe 0, `turn lines 0: A3.2 not applied`', r.ok && /in-app entries 44 ids 44; superseded 1 \(\d+\); outside window cues 2 full 2/.test(r.text) && /^probe 0$/m.test(r.text) && /^turn lines 0: A3.2 not applied$/m.test(r.text), r.err ?? r.text.split('\n').filter((x) => /in-app|probe|turn/.test(x)).join(' | '));
        if (r.ok) console.log('--- evidence: h40d consumer output (counts only) ---\n' + r.text + '\n--- end ---');
        else console.log(`--- h40d refused: ${r.err}`);
    }
}

// ---- assembly (F4: writes cues.blind-11..24, keys, sets.flight.json, manifest slots) -------------------------------------------
{
    const trimP = path.join(TMP, 'trim.cjs'); w(trimP, "exports.trimCues = (c, a, b) => ({ cues: c.map((x) => x.replace(/ \\$x\\$/g, '')).slice(0, b) });\n");
    const insA = path.join(TMP, 'A.md'), insB = path.join(TMP, 'B.md'); w(insA, 'A'); w(insB, 'B');
    const pip = path.join(TMP, 'pipeline-ids.txt'); w(pip, 'S1Q01\n');
    const base = { trimPath: trimP, trimSha: sha(fs.readFileSync(trimP)), instructionA: insA, instructionB: insB, pipelinePath: pip };
    const doAssemble = async (name, extra = {}, edit = {}) => { const o = { ...opts(name, { from: clean, ...edit }), ...base, ...extra }; try { const ctx = await T.verify(o); const out = T.assemble(ctx, o); return { ok: true, out, o }; } catch (e) { return { ok: false, err: e.refusal ? e.message : `CRASH ${e?.stack}`, o }; } };
    const a1 = await doAssemble('assemble');
    check('F4: a complete export assembles (no refusal)', a1.ok, a1.err);
    if (a1.ok) {
        const kd = path.join(a1.o.outRoot, 'keyhold'), bd = path.join(a1.o.outRoot, 'blind');
        const files = fs.readdirSync(bd).filter((f) => /^cues\.blind-\d+\.json$/.test(f)).sort();
        check('F4: exactly the 14 files cues.blind-11 ... cues.blind-24', files.join() === Array.from({ length: 14 }, (_, i) => `cues.blind-${11 + i}.json`).join(), files.join());
        const sets = JSON.parse(fs.readFileSync(path.join(kd, 'sets.flight.json'), 'utf8')).assignment;
        const bodies = Object.fromEntries(files.map((f) => [Number(f.match(/\d+/)[0]), JSON.parse(fs.readFileSync(path.join(bd, f), 'utf8'))]));
        const cnt = (set, cond) => Object.entries(sets).filter(([, v]) => v.set === set && v.condition === cond).map(([n]) => bodies[n].blocks.length);
        check('F4: FLT-INAPP A 3 / B 3; FLT-TWINS-H 3 files per condition of 3 blocks; FLT-TWINS-L likewise', cnt('FLT-INAPP', 'A').join() === '3' && cnt('FLT-INAPP', 'B').join() === '3' && cnt('FLT-TWINS-H', 'A').join() === '3,3,3' && cnt('FLT-TWINS-H', 'B').join() === '3,3,3' && cnt('FLT-TWINS-L', 'A').join() === '3,3,3' && cnt('FLT-TWINS-L', 'B').join() === '3,3,3', JSON.stringify(Object.values(sets).map((v) => `${v.set}${v.rep ?? ''}${v.condition}`)));
        check('F4: A files carry no `answer`; B files carry one on every block; ids are neutral (b01..) and no roster id appears in any blind file', Object.entries(sets).every(([n, v]) => bodies[n].blocks.every((b) => (v.condition === 'B') === ('answer' in b) && /^b\d\d$/.test(b.id))) && !files.some((f) => /S[12]Q\d\d/.test(fs.readFileSync(path.join(bd, f), 'utf8'))));
        const tw = Object.entries(sets).find(([, v]) => v.set === 'FLT-TWINS-H' && v.rep === 1 && v.condition === 'B')[0];
        check('F4: twin blocks pass through trimCues (the `$x$` notation is gone) and an empty `spoken` reads `no answer` in B', !JSON.stringify(bodies[tw]).includes('$x$') && bodies[tw].blocks.some((b) => b.answer === 'no answer'));
        const man = JSON.parse(fs.readFileSync(path.join(kd, 'manifest.json'), 'utf8'));
        check('F4: the manifest holds 28 slots blind-N.g1/g2, each with blind, verdicts and instruction, no set name', Object.keys(man.slots).length === 28 && Object.values(man.slots).every((s) => s.blind && s.verdicts && s.instruction && !('set' in s)));
        const keys = fs.readdirSync(kd).filter((f) => /^key\.blind-\d+\.json$/.test(f));
        check('F4: 14 key files in keyhold, none in blind', keys.length === 14 && !fs.readdirSync(bd).some((f) => /^key\./.test(f)));
        const out = a1.out.join('\n');
        check('F4: the printed counts carry no cue, answer or question text', leaks(out, ['cue one 0', 'spoken answer 0', 'what is topic 0?', 'twin captured-high-r1 cue']) === 0);
        check('F4: classes printed: FLT-INAPP pipeline 1, inherited 1 (S1Q02), partly-correct 1 (S1Q03)', /classes FLT-INAPP: pipeline 1 inherited 1 partly-correct 1/.test(out), out.split('\n').filter((l) => /classes/.test(l)).join('|'));
        const again = await doAssemble('assemble-again', {}, {});
        check('F4: re-running into a fresh root gives byte-identical blind files (seeded, deterministic)', again.ok && files.every((f) => fs.readFileSync(path.join(bd, f), 'utf8') === fs.readFileSync(path.join(again.o.outRoot, 'blind', f), 'utf8')) && fs.readFileSync(path.join(kd, 'sets.flight.json'), 'utf8') === fs.readFileSync(path.join(again.o.outRoot, 'keyhold', 'sets.flight.json'), 'utf8'));
        const second = await doAssemble('assemble-twice', { outRoot: a1.o.outRoot });
        check('F4: assembling again into the same root -> refuse (a blind file / manifest slot already exists)', !second.ok && /already exists/.test(second.err), second.err);
    }
    const preMan = path.join(TMP, 'preman'); fs.mkdirSync(path.join(preMan, 'keyhold'), { recursive: true });
    fs.writeFileSync(path.join(preMan, 'keyhold', 'manifest.json'), JSON.stringify({ slots: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`blind-${11 + i}.g1`, { blind: 'x', verdicts: 'x', instruction: 'x' }])) }));
    const pm = await doAssemble('slot exists', { outRoot: preMan });
    check('§3: a manifest that already holds a slot name the tool would write -> refuse, nothing written', !pm.ok && /manifest slot .* already exists/.test(pm.err) && !fs.existsSync(path.join(preMan, 'blind')) || (!pm.ok && /manifest slot .* already exists/.test(pm.err)), pm.err);
    const nj = await doAssemble('judge missing', {}, { cloneRun: (rd) => fs.rmSync(path.join(rd, 'interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json')) });
    check('F4: a missing judge file -> refuse', !nj.ok && /judge file missing/.test(nj.err), nj.err);
    const mm = buildRun('wrongModel', { judgeModel: 'claude-sonnet-x' });
    const wm = await doAssemble('judge model', {}, { from: mm });
    check('F4: a judge file merged under another model -> refuse', !wm.ok && /another model/.test(wm.err), wm.err);
    const tq = await doAssemble('twin pairs disagree', {}, { cloneRun: (rd) => { const p = path.join(rd, 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low.json'); const j = JSON.parse(fs.readFileSync(p, 'utf8')); j.items[0].question = 'a different question'; fs.writeFileSync(p, JSON.stringify(j)); } });
    check('F4: a twin pairs file that disagrees on an id\'s question -> refuse', !tq.ok && /disagrees/.test(tq.err), tq.err);
    const nt = await doAssemble('no trim', { trimPath: null, trimSha: null });
    check('F4: no display pin (trim module + sha) -> refuse', !nt.ok && /display pin/.test(nt.err), nt.err);
    const bt = await doAssemble('bad trim sha', { trimSha: '0'.repeat(64) });
    check('F4: a trim module whose sha is not the recorded pin -> refuse', !bt.ok && /pin/.test(bt.err), bt.err);
    const ex = await doAssemble('excluded', {}, { comp: (c) => [...c.slice(0, -1), 'EXPORT INCOMPLETE: S1Q02,captured-high-r2:S1Q01,file:captured-low-r3'] });
    check('F4: INCOMPLETE naming 1 in-app id, 1 twin id and 1 twin file -> assembled with those excluded (A 2 for FLT-INAPP; r2 2 blocks; low r3 0)', ex.ok && /set FLT-INAPP: A 2 B 2/.test(ex.out.join('\n')) && /set FLT-TWINS-H r2: A 2 B 2/.test(ex.out.join('\n')) && /set FLT-TWINS-L r3: A 0 B 0/.test(ex.out.join('\n')), ex.err ?? ex.out?.filter((l) => /^set/.test(l)).join('|'));
}

console.log(`\nF4 CALIBRATION: ${pass} PASS, ${fail} FAIL of ${pass + fail}`);
process.exit(fail ? 1 : 0);
