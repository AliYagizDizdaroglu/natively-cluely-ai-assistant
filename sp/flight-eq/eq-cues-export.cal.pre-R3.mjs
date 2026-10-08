// Known-answer calibration of E\eq-cues-export.mjs (b10). Output: eq-cues-export.cal.txt (run: node eq-cues-export.cal.mjs > eq-cues-export.cal.txt).
// Expected values are written from the registration §7.b10, NOTE-b10-rev7-A1 (h40d: 44 entries / 44 ids / 1 superseded line /
// 2 cue lines outside the window / 0 empties / twins 44 per rep), A4.3a, A5.4 and cue-grading rev 7 + rev7-A1 - never from the
// tool's own output. Cue text is never printed: every stdout is checked for leaks against the export's own cue strings.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const TOOL = process.env.B10_TOOL ?? path.join(E, 'eq-cues-export.mjs');
const MAINRUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const H40D = `${MAINRUNS}/2026-10-02T11-39-41-h40d`;
const CUESMOKE = `${MAINRUNS}/2026-10-01T02-37-41-cuesmoke`;
const TMP = path.join(E, process.env.B10_TOOL ? 'b10cal-tmp-mut' : 'b10cal-tmp');
const OUT = path.join(E, process.env.B10_TOOL ? 'b10cal-out-mut' : 'b10cal-out');
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const T = await import(pathToFileURL(TOOL).href);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

let pass = 0, fail = 0;
const say = (s) => console.log(s);
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`); };
const spawnWith = (env) => (args) => { const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: { ...process.env, ...env } }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };
const spawnTool = spawnWith({ EQ_CAL_OVERRIDES: '1' });          // the override flags are refused without this marker (m7)
const spawnPlain = spawnWith({ EQ_CAL_OVERRIDES: '' });

// leak checker, calibrated first: a stdout containing a cue string of >= 8 chars must be caught; a clean one must not
const leaks = (text, cues) => cues.filter((c) => c.length >= 8 && text.includes(c)).length;
{
    const c = ['thirty gigabytes in float32', 'int8, then shard'];
    check('leak checker: clean text -> 0', leaks('EXPORT COMPLETE in-app entries 44', c) === 0);
    check('leak checker: one cue inserted -> 1', leaks('x thirty gigabytes in float32 y', c) === 1);
}
const allCues = (jsonPath) => JSON.parse(fs.readFileSync(jsonPath, 'utf8')).entries.flatMap((e) => e.cues);

// ---- fixtures: an ARMING record, a launcher log that matches it ---------------------------------------------------
const REAL_HEAD = '56bda9eb64b65a190c73788b5f86a550f6809f6a';
const fakeArming = path.join(TMP, 'ARMING-fake.md');
fs.writeFileSync(fakeArming, `# fake arming record (calibration)\n- Registered HEAD: ${REAL_HEAD} (= e0056c4 + 56bda9e)\nT: 2026-10-06 03:00\n`);
const fakeSha = sha(fs.readFileSync(fakeArming));
const mkLauncher = (name, lines) => { const p = path.join(TMP, name); fs.writeFileSync(p, lines.join('\r\n') + '\r\n'); return p; };
const goodLauncher = mkLauncher('launcher-good.log', ['=== LAUNCHER eq start ===', 'ARMING absent', '=== LAUNCHER eq start ===', `ARMING sha256=${fakeSha}`, '2000-01-01T00:00:00.000Z FLIGHT eq start']);

// ---- 1. the ARMING / launcher-log checks (A5.4 point 1; rev7-A1 U2 cases) ---------------------------------------------
const START = Date.parse('2026-10-02T10:33:52.110Z');
const arm = (o) => { try { return { ok: true, v: T.armingCheck({ startedMs: START, ...o }) }; } catch (e) { return { ok: false, m: e.message }; } };
{
    const r = arm({ armingPath: fakeArming, launcherLogPath: goodLauncher });
    check('arming: matching ARMING line -> accepted, head = the single 40-hex', r.ok && r.v.head === REAL_HEAD && r.v.armingSha === fakeSha);
    const twoLines = mkLauncher('launcher-two-later-ok.log', ['ARMING sha256=' + '0'.repeat(64), '2000-01-01T00:00:00.000Z x', `ARMING sha256=${fakeSha}`, '2000-01-02T00:00:00.000Z y']);
    check('arming: two ARMING lines, only the LATER (pre-start) matches -> accepted', arm({ armingPath: fakeArming, launcherLogPath: twoLines }).ok);
    const earlierOnly = mkLauncher('launcher-earlier-only.log', [`ARMING sha256=${fakeSha}`, '2000-01-01T00:00:00.000Z x', 'ARMING sha256=' + '0'.repeat(64), '2000-01-02T00:00:00.000Z y']);
    check('arming: only the EARLIER matches -> refused', !arm({ armingPath: fakeArming, launcherLogPath: earlierOnly }).ok);
    const afterStart = mkLauncher('launcher-after-start.log', ['ARMING sha256=' + '0'.repeat(64), '2000-01-01T00:00:00.000Z x', '2999-01-01T00:00:00.000Z later launch', `ARMING sha256=${fakeSha}`]);
    check('arming: the matching line sits after the run start (a later launch) -> refused', !arm({ armingPath: fakeArming, launcherLogPath: afterStart }).ok);
    check('arming: ARMING absent -> refused', !arm({ armingPath: fakeArming, launcherLogPath: mkLauncher('l-absent.log', ['ARMING absent', '2000-01-01T00:00:00.000Z x']) }).ok);
    check('arming: no ARMING line at all -> refused', !arm({ armingPath: fakeArming, launcherLogPath: mkLauncher('l-none.log', ['2000-01-01T00:00:00.000Z x']) }).ok);
    const twoHex = path.join(TMP, 'ARMING-two-hex.md');
    fs.writeFileSync(twoHex, `- Registered HEAD: ${REAL_HEAD} then ${'a'.repeat(40)}\n`);
    check('arming: record with two 40-hex HEAD values -> refused', !arm({ armingPath: twoHex, launcherLogPath: mkLauncher('l-twohex.log', [`ARMING sha256=${sha(fs.readFileSync(twoHex))}`, '2000-01-01T00:00:00.000Z x']) }).ok);
    const noHead = path.join(TMP, 'ARMING-nohead.md'); fs.writeFileSync(noHead, '- nothing here\n');
    check('arming: record with no Registered HEAD line -> refused', !arm({ armingPath: noHead, launcherLogPath: goodLauncher }).ok);
    check('arming: missing record -> refused', !arm({ armingPath: path.join(TMP, 'nope.md'), launcherLogPath: goodLauncher }).ok);
    const edited = path.join(TMP, 'ARMING-edited.md'); fs.writeFileSync(edited, fs.readFileSync(fakeArming, 'utf8') + 'edited after the launcher read it\n');
    check('arming: record edited after the launcher printed its sha -> refused', !arm({ armingPath: edited, launcherLogPath: goodLauncher }).ok);
}

// ---- 2. the contract validator (forbidden fields, keys, ids, duplicates, the two-entry rule) -------------------------
const good = () => ({ schema: 'cues-export-eq/1', runDir: 'C:/x', registeredHead: REAL_HEAD, window: { startedAt: '2026-10-05T23:00:00.000Z', endedAt: '2026-10-06T00:00:00.000Z' }, entries: [
    { id: 'S1Q04', arm: 'inapp', rep: null, dispatchedAt: '2026-10-05T23:01:00.000Z', cues: ['a cue'], empty: null, logLine: 5 },
    { id: 'S1Q04F', arm: 'captured-high', rep: 2, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json', cues: ['b cue'], empty: null, dispatchedAt: null, logLine: null }] });
const val = (o) => { try { T.validateExport(o); return null; } catch (e) { return e.message; } };
{
    check('validator: a good object passes', val(good()) === null);
    const f = (mut, re, name) => { const o = good(); mut(o); const m = val(o); check(name, m !== null && re.test(m), m ?? 'NOT refused'); };
    f((o) => { o.entries[0].answer = 'x'; }, /forbidden field answer/, 'validator: an in-app entry with `answer` -> refused (forbidden field)');
    f((o) => { o.entries[1].spoken = 'x'; }, /forbidden field spoken/, 'validator: a twin entry with `spoken` -> refused');
    f((o) => { o.entries[0].question = 'x'; }, /forbidden field question/, 'validator: `question` -> refused');
    f((o) => { o.entries[0].reason = 'x'; }, /forbidden field reason/, 'validator: `reason` -> refused');
    f((o) => { o.entries[0].score = 2; }, /forbidden field score/, 'validator: a score -> refused');
    f((o) => { o.extra = 1; }, /top-level keys/, 'validator: a sixth top-level key -> refused');
    f((o) => { delete o.window; }, /top-level keys/, 'validator: a missing top-level key -> refused');
    f((o) => { o.schema = 'cues-export-eq/2'; }, /schema/, 'validator: wrong schema -> refused');
    f((o) => { o.registeredHead = 'abc'; }, /registeredHead/, 'validator: registeredHead not 40 hex -> refused');
    f((o) => { o.entries[0].id = 'R04'; }, /outside the roster/, 'validator: an id outside the 40 S1+S2 ids -> refused');
    f((o) => { o.entries[0].id = 'S3Q01'; }, /outside the roster/, 'validator: S3Q01 -> refused');
    f((o) => { delete o.entries[0].logLine; }, /keys are not exactly/, 'validator: an in-app entry missing `logLine` -> refused');
    f((o) => { o.entries[1].src = 'interview60.answers.gemini-3.5-flash-lite_captured-minimal.json'; }, /six answer files/, 'validator: a twin src that is not one of the six -> refused');
    f((o) => { o.entries[0].arm = 'inapp2'; }, /arm/, 'validator: an unknown arm -> refused');
    f((o) => { o.entries.push({ ...o.entries[0] }); }, /duplicate in-app/, 'validator: a duplicate (id, dispatchedAt) in-app pair -> refused');
    f((o) => { o.entries.push({ ...o.entries[1] }); }, /duplicate twin/, 'validator: a duplicate (id, arm, rep) twin triple -> refused');
    f((o) => { o.entries.push({ ...o.entries[0], dispatchedAt: null }); }, /two-entry|dispatchedAt null/, 'validator: an id with two in-app entries, one dispatchedAt null (a superseded stream exported as a 2nd entry) -> refused');
    f((o) => { o.entries[0].empty = 'missing'; o.entries[0].cues = []; }, /missing/, 'validator: empty "missing" with a logLine -> refused');
    f((o) => { o.entries[0].cues = []; }, /disagree/, 'validator: empty null with cues [] -> refused');
    f((o) => { o.entries[0].rep = 1; }, /rep must be null/, 'validator: in-app rep not null -> refused');
}

// ---- 3. selfCheck: a twin entry whose cues differ from its record -> refused; an in-app logLine off by one -> refused -------
{
    const d = path.join(TMP, 'selfcheck'); fs.mkdirSync(d, { recursive: true });
    const src = 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json';
    fs.writeFileSync(path.join(d, src), JSON.stringify({ S1Q04F: { id: 'S1Q04F', cues: ['b cue'], spoken: 'x' } }));
    const lines = ['x', '2026-10-05T23:01:02.000Z [LOG] [Answer] cues: ["a cue"]', 'y'];
    const ok = good(); ok.entries[0].logLine = 2;
    const run = (o) => { try { T.selfCheck(o, { runDir: d, lines }); return null; } catch (e) { return e.message; } };
    check('selfCheck: faithful export -> passes', run(ok) === null);
    const bad = good(); bad.entries[0].logLine = 2; bad.entries[1].cues = ['changed cue'];
    const m1 = run(bad); check('selfCheck: twin entry cues differ from its record -> refuses', m1 !== null && /differ from its record/.test(m1), m1 ?? 'NOT refused');
    const off = good(); off.entries[0].logLine = 3; const m2 = run(off);
    check('selfCheck: in-app logLine off by one -> refuses', m2 !== null && /does not address/.test(m2), m2 ?? 'NOT refused');
    const dif = good(); dif.entries[0].logLine = 2; dif.entries[0].cues = ['other'];
    const m3 = run(dif); check('selfCheck: logLine parses to different cues -> refuses', m3 !== null && /different cues/.test(m3), m3 ?? 'NOT refused');
}

// wiring: the self-check and the contract validator are actually CALLED by the build (a behavioural flip is impossible while the build is correct)
check('wiring: buildExport calls validateExport and selfCheck before anything is written', T.buildExport.toString().includes('validateExport(obj') && T.buildExport.toString().includes('selfCheck(obj'));

// ---- 4. synthetic run dirs in the app's line shape -----------------------------------------------------------------------
// three roster items; each: dispatch line, pinned line, [cues], (optional signature), full. Times are UTC ISO.
const B = Date.parse('2026-10-05T23:00:00.000Z');
const ts = (ms) => new Date(ms).toISOString();
function mkRun(name, variant = {}) {
    const d = path.join(TMP, name); fs.mkdirSync(d, { recursive: true });
    const items = [{ id: 'S1Q01', playedAt: B + 5000, clipSecs: 10 }, { id: 'S1Q02', playedAt: B + 80000, clipSecs: 10 }, { id: 'S1Q03', playedAt: B + 160000, clipSecs: 10 }].map((i) => ({ ...i, kind: 'spoken', q: 'q' }));
    const L = [];
    L.push(`${ts(B - 60000)} [LOG] [Answer] cues: ["before window one"]`);                          // outside the window
    L.push(`${ts(B - 59000)} [LOG] [Answer] full: "probe answer before the window"`);
    const pairs = [];
    items.forEach((it, k) => {
        const dt = it.playedAt + 12000;
        L.push(`${ts(dt)} [LOG] [Main] dispatch: answer source=live anchor="a${k}" verdict=ok question="q${k}"`);
        pairs.push({ id: it.id, kind: 'spoken', dispatchedAt: ts(dt) });
        const v = variant[it.id] ?? {};
        if (v.sig) L.push(`${ts(dt + 100)} [LOG] ${v.sig}`);
        if (v.supersededFirst) { L.push(`${ts(dt + 3000)} [LOG] [Answer] cues: ["first stream cue ${k}"]`); L.push(`${ts(dt + 3010)} [LOG] [IntelligenceEngine] _what_to_say stream aborted by new generation`); }
        if (v.rawCues) L.push(`${ts(dt + 5000)} [LOG] [Answer] cues: ${v.rawCues}`);
        else if (v.cues !== null) L.push(`${ts(dt + 5000)} [LOG] [Answer] cues: ${JSON.stringify(v.cues ?? [`cue one ${k}`, `cue two ${k}`])}`);
        L.push(`${ts(dt + 9000)} [LOG] [Answer] full: ${JSON.stringify(v.full ?? `a spoken answer ${k}`)}`);
        if (v.strayAfter) L.push(`${ts(dt + 14000)} [LOG] [Answer] cues: ["stray stream of ${it.id}"]`);
        if (v.trailing) L.push(`${ts(dt + 20000)} [LOG] [Answer] cues: ["trailing stream ${k}"]`);
    });
    const text = L.join(variant.crlf ? '\r\n' : '\n') + (variant.crlf ? '\r\n' : '\n');
    fs.writeFileSync(path.join(d, 'natively_debug.log'), text);
    // metrics.mjs reads the run window by byte offsets: the two pre-window lines sit before startDebug
    const off = Buffer.byteLength(L.slice(0, 2).join(variant.crlf ? '\r\n' : '\n') + (variant.crlf ? '\r\n' : '\n'));
    fs.writeFileSync(path.join(d, 'interview60.timeline.json'), JSON.stringify({ startedAt: ts(B), endedAt: ts(B + 400000), startDebug: off, endDebug: Buffer.byteLength(text), startDiag: 0, endDiag: 0, items }));
    if (!variant.noDiag) fs.writeFileSync(path.join(d, 'verbal-diag.log'), '');
    fs.writeFileSync(path.join(d, 'interview60.judge.pairs.json'), JSON.stringify({ model: 'x', rubric: 'x', items: pairs }));
    return d;
}
const launcherFor = (startIso) => mkLauncher(`l-${startIso.replace(/[^0-9]/g, '')}.log`, [`ARMING sha256=${fakeSha}`, `${ts(B - 3600000)} FLIGHT eq start`]);
const syn = (name, variant = {}, extra = []) => {
    const d = mkRun(name, variant);
    const r = spawnTool([d, '--out-dir', path.join(OUT, name), '--arming', fakeArming, '--launcher-log', launcherFor('syn'), '--no-twins', ...extra]);
    const outTxt = fs.existsSync(path.join(OUT, name, 'cues-export-eq.completeness.txt')) ? fs.readFileSync(path.join(OUT, name, 'cues-export-eq.completeness.txt'), 'utf8').trim().split('\n') : null;
    const exp = fs.existsSync(path.join(OUT, name, 'cues-export-eq.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, name, 'cues-export-eq.json'), 'utf8')) : null;
    return { ...r, txt: outTxt, exp };
};
{
    const r = syn('syn-clean');
    check('synthetic clean: 3 in-app entries on 3 ids, EXPORT COMPLETE, exit 0', r.code === 0 && r.exp?.entries.filter((e) => e.arm === 'inapp').length === 3 && r.txt.at(-1) === 'EXPORT COMPLETE', `exit ${r.code}`);
    check('synthetic clean: the pre-window cue + full lines are outside (1 cue line, 1 full line)', /cue lines in window 3 outside window 1/.test(r.out) && /full lines in window 3 outside window 1/.test(r.out));
    check('synthetic clean: every entry joined to its pair (dispatchedAt non-null)', r.exp.entries.every((e) => e.dispatchedAt !== null) && r.exp.entries.map((e) => e.id).join() === 'S1Q01,S1Q02,S1Q03');
    check('synthetic clean: stdout carries no cue text', leaks(r.out, allCues(path.join(OUT, 'syn-clean', 'cues-export-eq.json'))) === 0);

    // the registered case: one empty block beside a failed answer -> named, kept, COMPLETE
    const f = syn('syn-empty-failed', { S1Q02: { cues: [], full: 'Could you repeat that? I want to make sure I address your question properly.' } });
    const e2 = f.exp?.entries.find((e) => e.id === 'S1Q02');
    check('synthetic: an empty block `[]` beside a failed answer -> entry kept with empty "failed", NAMED, COMPLETE', f.code === 0 && e2?.empty === 'failed' && e2.cues.length === 0 && e2.logLine !== null && f.txt.includes('empty S1Q02 failed kind=failed') && f.txt.at(-1) === 'EXPORT COMPLETE', f.txt?.filter((l) => l.startsWith('empty')).join(' | '));
    // knowledge short-circuit: no cues line, signature -> missing + named kind knowledge, COMPLETE
    const k = syn('syn-knowledge', { S1Q02: { cues: null, sig: '[LLMHelper] Knowledge mode (stream): returning generated intro response' } });
    const k2 = k.exp?.entries.find((e) => e.id === 'S1Q02');
    check('synthetic: knowledge short-circuit (no cues line) -> empty "missing", logLine null, kind=knowledge, COMPLETE', k.code === 0 && k2?.empty === 'missing' && k2.logLine === null && k.txt.includes('empty S1Q02 missing kind=knowledge') && k.txt.at(-1) === 'EXPORT COMPLETE');
    const c = syn('syn-coding', { S1Q02: { cues: null, sig: '[Main] screen reference: captured 1 image(s)' } });
    check('synthetic: coding route (screen reference line, no cues line) -> kind=coding, COMPLETE', c.code === 0 && c.txt.includes('empty S1Q02 missing kind=coding') && c.txt.at(-1) === 'EXPORT COMPLETE');
    // the registered case: one missing cues line (no signature) -> INCOMPLETE naming the id
    const m = syn('syn-missing', { S1Q02: { cues: null } });
    check('synthetic: one missing cues line, no signature -> EXPORT INCOMPLETE: S1Q02, exit 1', m.code === 1 && m.txt.at(-1) === 'EXPORT INCOMPLETE: S1Q02', m.txt?.at(-1));
    // a superseded stream: 4 cue lines for 3 answers -> 3 entries + one `superseded <n>` line
    const s = syn('syn-superseded', { S1Q02: { supersededFirst: true } });
    const supLine = s.txt?.filter((l) => /^superseded \d+$/.test(l));
    check('synthetic: a superseded stream -> exactly one `superseded <logLine>` line, still 3 entries (never exported as an entry), COMPLETE', s.code === 0 && supLine.length === 1 && s.exp.entries.length === 3 && s.txt.at(-1) === 'EXPORT COMPLETE', supLine?.join());
    const supN = Number(supLine?.[0]?.split(' ')[1]);
    const supLog = fs.readFileSync(path.join(TMP, 'syn-superseded', 'natively_debug.log'), 'utf8').split('\n');
    check('synthetic: the named line is the first stream\'s cues line (checked on the log)', /\[Answer\] cues: \["first stream cue 1"\]$/.test(supLog[supN - 1] ?? ''));
    check('synthetic: the cues exported for that answer are the SECOND stream\'s', JSON.stringify(s.exp.entries.find((e) => e.id === 'S1Q02').cues) === JSON.stringify(['cue one 1', 'cue two 1']));
    // a cues line that is never followed by a delivered answer -> undelivered, INCOMPLETE
    const u = syn('syn-undelivered', { S1Q03: { trailing: true } });
    check('synthetic: an in-window cues line with no delivered answer after it -> undelivered, EXPORT INCOMPLETE', u.code === 1 && u.txt.some((l) => /^undelivered \d+ S1Q03$/.test(l)) && /^EXPORT INCOMPLETE: /.test(u.txt.at(-1)));
    // CRLF log -> refuse (rev7-A1: a CRLF log fails closed)
    const cr = syn('syn-crlf', { crlf: true });
    check('synthetic: a CRLF debug log -> EXPORT REFUSED, exit 2, nothing written', cr.code === 2 && /REFUSED: the debug log has CR/.test(cr.out) && cr.exp === null, cr.out.trim().slice(0, 90));
    // an id outside the roster: the pairs file says R99 for one dispatch
    const badDir = mkRun('syn-badid'); const pp = path.join(badDir, 'interview60.judge.pairs.json'); const pj = JSON.parse(fs.readFileSync(pp, 'utf8')); pj.items[1].id = 'R99'; fs.writeFileSync(pp, JSON.stringify(pj));
    const bi = spawnTool([badDir, '--out-dir', path.join(OUT, 'syn-badid'), '--arming', fakeArming, '--launcher-log', launcherFor('syn'), '--no-twins']);
    check('synthetic: a pairs id outside the 40 S1+S2 ids -> EXPORT REFUSED (exit 2)', bi.code === 2 && /outside the roster/.test(bi.out), bi.out.trim().slice(0, 90));
    // an unmatched ARMING sha at the CLI: refused before anything is written
    const am = spawnTool([mkRun('syn-arming'), '--out-dir', path.join(OUT, 'syn-arming'), '--arming', fakeArming, '--launcher-log', mkLauncher('l-bad.log', ['ARMING sha256=' + '1'.repeat(64), `${ts(B - 1000)} x`]), '--no-twins']);
    check('synthetic: launcher ARMING sha unequal to the record -> EXPORT REFUSED (exit 2)', am.code === 2 && /ARMING/.test(am.out));
    // twins: a synthetic folder with one twin file whose record has no cues field + one transient
    const tw = mkRun('syn-twins');
    const mkTwin = (src, recs) => fs.writeFileSync(path.join(tw, src), JSON.stringify(recs));
    for (const f of T.TWIN_FILES) mkTwin(f.src, { S1Q01: { id: 'S1Q01', cues: ['t cue a'], spoken: 'x' }, S1Q02: { id: 'S1Q02', cues: [], spoken: 'x' }, S1Q03: { id: 'S1Q03', transientError: '429' } });
    const tr = spawnTool([tw, '--out-dir', path.join(OUT, 'syn-twins'), '--arming', fakeArming, '--launcher-log', launcherFor('syn')]);
    const te = JSON.parse(fs.readFileSync(path.join(OUT, 'syn-twins', 'cues-export-eq.json'), 'utf8')).entries.filter((e) => e.arm !== 'inapp');
    check('synthetic twins: 6 files x 3 records = 18 twin entries; `[]` -> "empty"; transientError -> "absent"', te.length === 18 && te.filter((e) => e.empty === 'empty').length === 6 && te.filter((e) => e.empty === 'absent').length === 6 && te.filter((e) => e.empty === null).length === 6, `exit ${tr.code}`);
    check('synthetic twins: answered ids = the records without transientError (2 per rep) and entries match -> COMPLETE', tr.code === 0 && /twin captured-high-r2 entries 3 asked 3 \(timeline items\) absent S1Q03/.test(tr.out) && /EXPORT COMPLETE/.test(tr.out), tr.out.split('\n').filter((l) => /^twin captured-high-r2|EXPORT/.test(l)).join(' | '));
    fs.unlinkSync(path.join(tw, T.TWIN_FILES[1].src));
    const tm = spawnTool([tw, '--out-dir', path.join(OUT, 'syn-twins-missing'), '--arming', fakeArming, '--launcher-log', launcherFor('syn')]);
    check('synthetic twins: a missing twin file -> named MISSING FILE and EXPORT INCOMPLETE: file:captured-high-r2', tm.code === 1 && /twin captured-high-r2 MISSING FILE/.test(tm.out) && /EXPORT INCOMPLETE: file:captured-high-r2/.test(tm.out));
}

// ---- 4b. the review's fixes (B2, I1, I2, I3, m7) ------------------------------------------------------------------------------------
{
    // B2: ONE malformed `[Answer] cues:` line -> a named refusal, no cue text anywhere, nothing written; shown with a leak scan of the output
    const b = syn('syn-malformed-cue', { S1Q02: { rawCues: '["SECRETCUETEXT" broken]' } });
    check('B2: a malformed `[Answer] cues:` line -> EXPORT REFUSED naming the log line, exit 2, nothing written', b.code === 2 && /^EXPORT REFUSED: unparseable \[Answer\] cues: line at log line \d+/m.test(b.out) && b.exp === null, b.out.trim().slice(0, 110));
    check('B2: leak scan of that output (and of every file the run could have written): 0 hits for the cue text', leaks(b.out, ['SECRETCUETEXT broken', 'SECRETCUETEXT']) === 0 && !b.out.includes('SECRETCUETEXT') && !fs.existsSync(path.join(OUT, 'syn-malformed-cue')));
    const sec = Object.assign(new SyntaxError('Unexpected token S in JSON SECRETCUETEXT'), {});
    check('B2: safeErr prints the class and file:line only, never the message', !T.safeErr(sec).includes('SECRETCUETEXT') && /^SyntaxError at \S+:\d+$/.test(T.safeErr(sec)), T.safeErr(sec));
    // B2: a malformed twin file and a malformed pairs file: class + file name only
    const tw = mkRun('syn-badtwin');
    fs.writeFileSync(path.join(tw, T.TWIN_FILES[0].src), '{"S1Q01": {"id": "S1Q01", "cues": ["SECRETCUETEXT');
    const bt = spawnTool([tw, '--out-dir', path.join(OUT, 'syn-badtwin'), '--arming', fakeArming, '--launcher-log', launcherFor('syn')]);
    check('B2: a malformed twin answer file -> REFUSED naming the file and the error class (SyntaxError), no text of it', bt.code === 2 && /twin answer file \(interview60\.answers\.gemini-3\.5-flash-lite_captured-high\.json\) is not readable JSON \(SyntaxError\)/.test(bt.out) && !bt.out.includes('SECRETCUETEXT'), bt.out.trim().slice(0, 130));
    // I1: a short twin file reads INCOMPLETE (asked ids from an independent source)
    const sh = mkRun('syn-shorttwin');
    for (const f of T.TWIN_FILES) fs.writeFileSync(path.join(sh, f.src), JSON.stringify({ S1Q01: { id: 'S1Q01', cues: ['t a'], spoken: 'x' }, S1Q02: { id: 'S1Q02', cues: ['t b'], spoken: 'x' }, S1Q03: { id: 'S1Q03', cues: ['t c'], spoken: 'x' } }));
    fs.writeFileSync(path.join(sh, T.TWIN_FILES[2].src), JSON.stringify({ S1Q01: { id: 'S1Q01', cues: ['t a'], spoken: 'x' }, S1Q03: { id: 'S1Q03', cues: ['t c'], spoken: 'x' } }));
    const st = spawnTool([sh, '--out-dir', path.join(OUT, 'syn-shorttwin'), '--arming', fakeArming, '--launcher-log', launcherFor('syn')]);
    check('I1: a twin file missing a record the arm was asked (interrupted arm) -> `MISMATCH S1Q02`, EXPORT INCOMPLETE: captured-high-r3:S1Q02, exit 1', st.code === 1 && /twin captured-high-r3 entries 2 asked 3 \(timeline items\) MISMATCH S1Q02/.test(st.out) && /EXPORT INCOMPLETE: captured-high-r3:S1Q02/.test(st.out), st.out.split('\n').filter((l) => /^twin captured-high-r3|^EXPORT/.test(l)).join(' | '));
    fs.writeFileSync(path.join(sh, 'interview60.prompts.json'), JSON.stringify({ S1Q01: {}, S1Q02: {}, S1Q03: {}, S1Q05: {} }));
    const st2 = spawnTool([sh, '--out-dir', path.join(OUT, 'syn-shorttwin2'), '--arming', fakeArming, '--launcher-log', launcherFor('syn')]);
    check('I1: with a prompts.json the asked ids come from its keys (a 4th captured id S1Q05 no twin file holds -> INCOMPLETE on every rep)', st2.code === 1 && /\(prompts\.json keys\) MISMATCH S1Q05/.test(st2.out));
    // I2: a stray cues line of ANOTHER item inside the stretch is undelivered, not superseded
    const i2 = syn('syn-superseded-otherid', { S1Q01: { strayAfter: true } });
    check('I2: an earlier cues line whose play window is another item\'s -> `undelivered <n> S1Q01`, NO `superseded` line, EXPORT INCOMPLETE', i2.code === 1 && i2.txt.some((l) => /^undelivered \d+ S1Q01$/.test(l)) && !i2.txt.some((l) => /^superseded/.test(l)) && /^EXPORT INCOMPLETE: S1Q01(,cueBlocks-count)?$/.test(i2.txt.at(-1)), i2.txt?.at(-1));
    // I3: the cueBlocks equality unread (no verbal-diag.log) is INCOMPLETE, never COMPLETE
    const i3 = syn('syn-nodiag', { noDiag: true });
    check('I3: no verbal-diag.log (metrics.mjs cannot read) -> `cueBlocks check UNREAD`, EXPORT INCOMPLETE: cueBlocks-unread, exit 1', i3.code === 1 && i3.txt.some((l) => /^cueBlocks check UNREAD/.test(l)) && i3.txt.at(-1) === 'EXPORT INCOMPLETE: cueBlocks-unread');
    // m7: the override flags are refused on a real run
    const m7 = spawnPlain([mkRun('syn-m7'), '--out-dir', path.join(OUT, 'syn-m7'), '--no-twins']);
    check('m7: --no-twins without the calibration marker -> EXPORT REFUSED, exit 2, nothing written', m7.code === 2 && /EXPORT REFUSED: --no-twins change the registered contract/.test(m7.out) && !fs.existsSync(path.join(OUT, 'syn-m7')));
    check('m7: with the marker the override prints a NON-REGISTERED banner', /^NON-REGISTERED: calibration overrides active/m.test(syn('syn-m7b').out));
}

// ---- 5. the real folders ---------------------------------------------------------------------------------------------------
const readText = (p) => fs.readFileSync(p, 'utf8');
function realRun(name, dir, extra, idRe) {
    const l = mkLauncher(`l-${name}.log`, [`ARMING sha256=${fakeSha}`, `2000-01-01T00:00:00.000Z FLIGHT ${name} start`]);
    const r = spawnTool([dir, '--out-dir', path.join(OUT, name), '--arming', fakeArming, '--launcher-log', l, '--id-re', idRe, ...extra]);
    const jp = path.join(OUT, name, 'cues-export-eq.json');
    return { ...r, jp, exp: fs.existsSync(jp) ? JSON.parse(readText(jp)) : null, txt: fs.existsSync(path.join(OUT, name, 'cues-export-eq.completeness.txt')) ? readText(path.join(OUT, name, 'cues-export-eq.completeness.txt')).trim().split('\n') : null };
}
const h = realRun('h40d', H40D, [], '^R\\d{2}F?\\d?$');
{
    const ent = h.exp.entries.filter((e) => e.arm === 'inapp');
    check('h40d: exit 0, last completeness line EXPORT COMPLETE', h.code === 0 && h.txt.at(-1) === 'EXPORT COMPLETE', `exit ${h.code}`);
    check('h40d (NOTE-b10-rev7-A1): 44 in-app entries on 44 ids', ent.length === 44 && new Set(ent.map((e) => e.id)).size === 44, `${ent.length} entries / ${new Set(ent.map((e) => e.id)).size} ids`);
    check('h40d: NOT the superseded old answer (45 in-app entries)', ent.length !== 45);
    const sup = h.txt.filter((l) => /^superseded \d+$/.test(l));
    check('h40d: exactly 1 `superseded <logLine>` line', sup.length === 1, sup.join());
    const log = readText(`${H40D}/natively_debug.log`).split('\n');
    const supN = Number(sup[0]?.split(' ')[1]);
    check('h40d: that line is R29\'s 11:31:30Z cues line (log line has timestamp 2026-10-02T11:31:30)', /^2026-10-02T11:31:30\.\d+Z \[LOG\] \[Answer\] cues: \[/.test(log[supN - 1] ?? ''));
    const tl = JSON.parse(readText(`${H40D}/interview60.timeline.json`));
    const at = Date.parse(log[supN - 1].slice(0, 24)); const its = tl.items.filter((i) => i.playedAt <= at).sort((a, b) => b.playedAt - a.playedAt);
    check('h40d: by play window that superseded stream is R29', its[0]?.id === 'R29', its[0]?.id);
    check('h40d: no export entry addresses the superseded line', !ent.some((e) => e.logLine === supN));
    check('h40d: 2 cue lines outside the window', /cue lines in window 45 outside window 2/.test(h.out), h.out.split('\n').find((l) => /^cue lines/.test(l)));
    check('h40d: 0 empties', h.txt.includes('empties 0') && ent.every((e) => e.empty === null));
    check('h40d: metrics.mjs cueBlocks.present 45 = 44 non-empty entries + 1 non-empty superseded', h.txt.includes('cueBlocks present 45 = non-empty entries 44 + non-empty superseded 1: OK'), h.txt.find((l) => /^cueBlocks/.test(l)));
    say('--- evidence: h40d completeness file (counts, ids, line numbers only) ---'); for (const l of h.txt) say(l); say('--- end evidence ---');
    // (i) every in-app entry's logLine addresses a matching line whose parsed JSON equals its cues - re-derived here, not the tool's selfCheck
    const re = /^\S+ \[LOG\] \[Answer\] cues: (\[.*\])$/;
    check('h40d (i): every in-app logLine addresses a `[Answer] cues: ` line whose parsed JSON equals the entry\'s cues', ent.every((e) => { const m = (log[e.logLine - 1] ?? '').match(re); return m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(e.cues); }));
    check('h40d (i): no `cues trimmed:` line is ever addressed', ent.every((e) => !/cues trimmed/.test(log[e.logLine - 1])));
    // (ii) completeness last line + LOG sha
    const logLine = h.txt.find((l) => l.startsWith('LOG '));
    check('h40d (ii): the LOG line carries the debug log\'s sha256 (recomputed here)', logLine === `LOG natively_debug.log ${sha(fs.readFileSync(`${H40D}/natively_debug.log`))}`);
    // (iii) top-level keys exactly five
    check('h40d (iii): top-level keys are exactly schema, runDir, registeredHead, window, entries', Object.keys(h.exp).join() === 'schema,runDir,registeredHead,window,entries');
    check('h40d: schema cues-export-eq/1; window = the timeline\'s; runDir is a C:/ path', h.exp.schema === 'cues-export-eq/1' && h.exp.window.startedAt === tl.startedAt && h.exp.window.endedAt === tl.endedAt && /^C:\//.test(h.exp.runDir));
    // join to the judge pairs: every dispatchedAt present in the pairs, and the id sets agree
    const pairs = JSON.parse(readText(`${H40D}/interview60.judge.pairs.json`)).items;
    const pIso = new Map(pairs.map((p) => [p.dispatchedAt, p.id]));
    check('h40d: all 44 entries joined: dispatchedAt present in judge.pairs and the pair\'s id = the entry\'s id', ent.every((e) => pIso.get(e.dispatchedAt) === e.id) && new Set(ent.map((e) => e.dispatchedAt)).size === 44);
    check('h40d: in-app entry ids = the pairs ids (as sets)', [...new Set(pairs.map((p) => p.id))].sort().join() === ent.map((e) => e.id).sort().join());
    // twins 44/44 per rep
    for (const f of T.TWIN_FILES) {
        const te = h.exp.entries.filter((e) => e.src === f.src);
        const store = JSON.parse(readText(`${H40D}/${f.src}`));
        check(`h40d twins ${f.arm} r${f.rep}: 44 entries = 44 records, cues equal the record's (JSON.stringify)`, te.length === 44 && Object.keys(store).length === 44 && te.every((e) => JSON.stringify(e.cues) === JSON.stringify(store[e.id].cues)) && h.txt.some((l) => l === `twin ${f.arm}-r${f.rep} entries 44 asked 44 (prompts.json keys)`));
    }
    check('h40d: total entries = 44 in-app + 6 x 44 twins = 308', h.exp.entries.length === 308, String(h.exp.entries.length));
    check('h40d: stdout carries no cue text (all 2,000+ cue strings checked)', leaks(h.out, allCues(h.jp)) === 0);
    check('h40d: the completeness file carries no cue text', leaks(h.txt.join('\n'), allCues(h.jp)) === 0);
    check('h40d: in-app registeredHead = the fixture record\'s HEAD; no forbidden field anywhere', h.exp.registeredHead === REAL_HEAD && !h.exp.entries.some((e) => Object.keys(e).some((k) => ['answer', 'spoken', 'question', 'prompt', 'reason'].includes(k))));
    // mutant of the export: the superseded stream as a second R29 entry would be refused by the validator (two-entry rule)
    const mut = JSON.parse(JSON.stringify(h.exp)); const r29 = mut.entries.find((e) => e.id === 'R29' && e.arm === 'inapp');
    mut.entries.push({ ...r29, dispatchedAt: null, logLine: supN, cues: JSON.parse(log[supN - 1].match(re)[1]) });
    check('h40d mutant: the superseded R29 stream exported as a 2nd entry -> validator refuses', (() => { try { T.validateExport(mut, { idRe: /^R\d{2}F?\d?$/ }); return false; } catch (e) { return /two in-app|dispatchedAt null|in-app entries/.test(e.message); } })());
}
const cs = realRun('cuesmoke', CUESMOKE, ['--no-pairs', '--no-twins'], '^S[12]Q(0[1-9]|10)F?$|^[A-Z]\\d{2}F?$|^[A-Z]{1,2}\\d{1,2}[A-Z]?$');
{
    const ent = cs.exp?.entries ?? [];
    const tl = JSON.parse(readText(`${CUESMOKE}/interview60.timeline.json`));
    say('--- evidence: cuesmoke completeness file ---'); for (const l of cs.txt ?? []) say(l); say('--- end evidence ---');
    check('cuesmoke (05:00 cue re-smoke): 20 in-app entries on 20 ids, EXPORT COMPLETE', cs.code === 0 && ent.length === 20 && new Set(ent.map((e) => e.id)).size === 20 && cs.txt.at(-1) === 'EXPORT COMPLETE', `exit ${cs.code}, ${ent.length} entries`);
    check('cuesmoke: ids = the timeline\'s 20 items; 0 empties; 0 superseded', ent.map((e) => e.id).sort().join() === tl.items.map((i) => i.id).sort().join() && cs.txt.includes('empties 0') && !cs.txt.some((l) => /^superseded/.test(l)));
    check('cuesmoke: metrics.mjs cueBlocks.present 20 = 20 + 0', cs.txt.includes('cueBlocks present 20 = non-empty entries 20 + non-empty superseded 0: OK'), cs.txt.find((l) => /^cueBlocks/.test(l)));
    check('cuesmoke: no pairs file -> every dispatchedAt null (b10 joined none), declared', ent.every((e) => e.dispatchedAt === null) && /pairs skipped/.test(cs.out));
    check('cuesmoke: stdout carries no cue text', leaks(cs.out, allCues(cs.jp)) === 0);
}
// the tool must refuse a real folder without its pairs file (no --no-pairs) rather than guess
{
    const r = spawnTool([CUESMOKE, '--out-dir', path.join(OUT, 'cuesmoke-nopairs'), '--arming', fakeArming, '--launcher-log', goodLauncher, '--id-re', '^.*$']);
    check('a run dir with no judge.pairs.json and no --no-pairs -> EXPORT REFUSED (exit 2)', r.code === 2 && /missing interview60.judge.pairs.json/.test(r.out), r.out.trim().slice(0, 80));
    const u = spawnTool([]);
    check('usage: no run dir -> exit 2', u.code === 2);
}
say(`\nB10 CALIBRATION: ${pass} PASS, ${fail} FAIL of ${pass + fail}`);
process.exit(fail ? 1 : 0);
