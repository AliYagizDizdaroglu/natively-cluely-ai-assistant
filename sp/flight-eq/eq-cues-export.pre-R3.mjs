// b10 (flight-eq registration §7.b10 + A2.5 + A4.3a/A5.4 + NOTE-b10-rev7-A1): the cue export.
//
//   node eq-cues-export.mjs <run-dir> [--out-dir <dir>] [--arming <file>] [--launcher-log <file>]
//                           [--id-re <regex>] [--no-pairs] [--no-twins]
//
// Writes <out-dir>\cues-export-eq.json (schema cues-export-eq/1) and <out-dir>\cues-export-eq.completeness.txt
// (default out-dir = this folder). Contract = PREREGISTER-cue-grading-rev6.md "Input contract" + rev 7 deltas +
// AMENDMENT-rev7-A1 (h40d known answer: 44 in-app entries on 44 ids, 1 superseded line, 2 cue lines outside the
// window, 0 empties; twins 44/44 per rep). The export carries ids and cue text ONLY and is NEVER printed: stdout
// is counts, ids, line numbers and classes. Never committed. No model call, no write inside MAIN.
//
// Exit codes: 0 export written, COMPLETE | 1 export written, INCOMPLETE (named ids; does not touch the hour's
// verdict) | 2 usage / refusal (nothing written) | 4 crash.
//
// Rulings made while building (reported in b5-b10-build-report.md):
//  R1 a delivered answer with NO cues line and no knowledge/coding/failed signature is an unexplained missing
//     block -> INCOMPLETE (the registration's "one missing cues line -> INCOMPLETE"); with a signature it is
//     `empty: "missing"` and named by its kind (rev 6/7's contract). A logged `[]` is a named empty, COMPLETE.
//  R2 in-app answer <-> dispatch is the judge's own pairing (interview60.judge.mjs pairAnswers: a dispatch claims
//     the FIRST `[Answer] full:` line in [d, min(next dispatch, d+60 s))), so the join is the pairs file's.
//     A full no dispatch claims (an extend/supersede continuation) gets dispatchedAt null, id by play window.
//  R3 the cues of an answer = the LAST in-window cues line after the previous delivered answer's full line; any
//     earlier in-window cues line in that stretch is a superseded stream -> `superseded <logLine>`, no entry.
//     An in-window cues line after the last full line (never delivered) is named `undelivered` -> INCOMPLETE.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const SCHEMA = 'cues-export-eq/1';
export const ID_RE_DEFAULT = /^S[12]Q(0[1-9]|10)F?$/;
export const TOP_KEYS = ['schema', 'runDir', 'registeredHead', 'window', 'entries'];
export const INAPP_KEYS = ['id', 'arm', 'rep', 'dispatchedAt', 'cues', 'empty', 'logLine'];
export const TWIN_KEYS = ['id', 'arm', 'rep', 'src', 'cues', 'empty', 'dispatchedAt', 'logLine'];
export const FORBIDDEN = ['answer', 'spoken', 'question', 'prompt', 'reason', 'score', 'scores', 'verdict', 'correctness', 'on_topic', 'delivery'];
export const TWIN_FILES = [
    { arm: 'captured-high', rep: 1, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high.json' },
    { arm: 'captured-high', rep: 2, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json' },
    { arm: 'captured-high', rep: 3, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json' },
    { arm: 'captured-low', rep: 1, src: 'interview60.answers.gemini-3.1-flash-lite_captured-low.json' },
    { arm: 'captured-low', rep: 2, src: 'interview60.answers.gemini-3.1-flash-lite_captured-low-r2.json' },
    { arm: 'captured-low', rep: 3, src: 'interview60.answers.gemini-3.1-flash-lite_captured-low-r3.json' },
];
const IN_EMPTY = ['knowledge', 'coding', 'failed', 'other', 'missing'];
const TW_EMPTY = ['empty', 'absent'];
const CUES_RE = /^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$/;       // the cues-trimmed line is excluded by the space
const FULL_RE = /^(\S+) \[LOG\] \[Answer\] full: (".*")$/;
const DISPATCH_RE = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|extend|supersede) source=(?:live|whisper) /;
const FAIL_TEXT = /Could you repeat that\?|\[No answer [—-]/;
const KNOWLEDGE_SIG = /Knowledge mode \(stream\): returning generated intro response|__negotiationCoaching/;
const CODING_SIG = /\[Main\] screen reference: captured |runWhatShouldISay: intent override → coding|Temporal RAG: [^\n]*intent: coding/;

export class Refusal extends Error { constructor(m) { super(m); this.refusal = true; } }
const refuse = (m) => { throw new Refusal(m); };
// B2: nothing parsed from an input is ever echoed (a JSON.parse error quotes the input): classes, file names, line numbers only
export const safeErr = (e) => { const m = String(e?.stack ?? '').match(/([^\\/()\s]+):(\d+):\d+\)?\s*$/m); return `${e?.name ?? 'Error'} at ${m ? `${m[1]}:${m[2]}` : 'unknown'}`; };
const readJson = (p, what) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { refuse(`${what} (${path.basename(p)}) is not readable JSON (${e?.name ?? 'Error'})`); } };
export const CAL_ENV = 'EQ_CAL_OVERRIDES';                // m7: the override flags are for calibration fixtures only
const idShown = (x) => String(x).replace(/[^\w.-]/g, '?').slice(0, 24);
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const iso = (ms) => new Date(ms).toISOString();

// ---------------------------------------------------------------------------------------------------------
// ARMING record + launcher log (A5.4 point 1, rev7-A1 U2)
export function armingCheck({ armingPath, launcherLogPath, startedMs }) {
    if (!fs.existsSync(armingPath)) refuse(`ARMING record missing: ${armingPath}`);
    if (!fs.existsSync(launcherLogPath)) refuse(`launcher log missing: ${launcherLogPath}`);
    const bytes = fs.readFileSync(armingPath);
    const headLines = bytes.toString('utf8').split(/\r?\n/).filter((l) => /^\s*[-*]?\s*Registered HEAD\b/i.test(l));
    if (headLines.length !== 1) refuse(`ARMING record has ${headLines.length} "Registered HEAD" lines, want exactly 1`);
    const hex = headLines[0].match(/\b[0-9a-f]{40}\b/g) ?? [];
    if (hex.length !== 1) refuse(`the registered-HEAD line carries ${hex.length} 40-hex values, want exactly 1`);
    const sha = sha256(bytes);
    // the last `ARMING ...` line before the run's timeline.startedAt: ARMING lines carry no stamp, so "before" =
    // positioned before the first stamped line later than startedAt (the launcher stamps FLIGHT/RUN lines in UTC)
    let last = null;
    for (const raw of fs.readFileSync(launcherLogPath, 'utf8').replace(/^\uFEFF/, '').split('\n')) {
        const l = raw.replace(/\r$/, '');
        if (/^ARMING( |$)/.test(l)) { last = l; continue; }
        const m = l.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) /);
        if (m && Date.parse(m[1]) > startedMs) break;
    }
    if (last === null) refuse('no ARMING line in the launcher log before the run start');
    if (last === 'ARMING absent') refuse('the last ARMING line before the run start reads "ARMING absent"');
    if (last !== `ARMING sha256=${sha}`) refuse(`the last ARMING line before the run start does not equal the record's sha256 (record sha256/12 ${sha.slice(0, 12)})`);
    return { head: hex[0], armingSha: sha };
}

// ---------------------------------------------------------------------------------------------------------
// the in-app side
function windowIdAt(items, t) {
    const w = items.filter((i) => Number.isFinite(i.playedAt)).sort((a, b) => a.playedAt - b.playedAt);
    let id = null;
    for (let k = 0; k < w.length; k++) {
        const to = k + 1 < w.length ? w[k + 1].playedAt : w[k].playedAt + 300_000;     // prompts.mjs's window rule
        if (t >= w[k].playedAt && t < to) id = w[k].id;
    }
    return id;
}

/** lines: the log split on \n (1-based line n = lines[n-1]). Returns the in-app part of the export. */
export function buildInApp({ lines, timeline, pairs, idRe }) {
    const s = Date.parse(timeline.startedAt), e = Date.parse(timeline.endedAt);
    const inWin = (t) => Number.isFinite(t) && t >= s && t <= e;
    const cues = [], fulls = [], disp = [];
    lines.forEach((l, i) => {
        let m = l.match(CUES_RE);
        if (m) { let arr; try { arr = JSON.parse(m[2]); } catch { arr = null; } cues.push({ n: i + 1, t: Date.parse(m[1]), arr }); return; }
        m = l.match(FULL_RE);
        if (m) { let txt = ''; try { txt = JSON.parse(m[2]); } catch { /* unparseable full: still a delivered line */ } fulls.push({ n: i + 1, t: Date.parse(m[1]), txt }); return; }
        m = l.match(DISPATCH_RE);
        if (m) disp.push({ n: i + 1, t: Date.parse(m[1]), action: m[2] });
    });
    const outside = { cues: cues.filter((c) => !inWin(c.t)).length, full: fulls.filter((f) => !inWin(f.t)).length };
    const cuesIn = cues.filter((c) => inWin(c.t)), fullsIn = fulls.filter((f) => inWin(f.t));
    const badCue = cuesIn.find((c) => !Array.isArray(c.arr));          // B2: a malformed in-window cues line is a named refusal, never parsed again or quoted
    if (badCue) refuse(`unparseable [Answer] cues: line at log line ${badCue.n} (JSON error); the export cannot address it`);
    const answerDisp = disp.filter((d) => d.action === 'answer');
    const pairByIso = new Map((pairs?.items ?? []).map((p) => [p.dispatchedAt, p]));
    // the judge's claim rule (pairAnswers): a dispatch claims the first full line in [d, min(next dispatch, d+60 s))
    const claimed = new Map();
    answerDisp.forEach((d, i) => {
        const end = Math.min(answerDisp[i + 1]?.t ?? Infinity, d.t + 60_000);
        const f = fulls.find((x) => x.t >= d.t && x.t < end);
        if (f && !claimed.has(f)) claimed.set(f, d);
    });
    const entries = [], superseded = [], undelivered = [], problems = [], empties = [];
    let prevN = 0;
    for (const F of fullsIn) {
        const stretch = cuesIn.filter((c) => c.n > prevN && c.n < F.n);
        const own = stretch[stretch.length - 1] ?? null;
        const d = claimed.get(F) ?? null;
        const idWin = windowIdAt(timeline.items ?? [], d ? d.t : F.t);
        // I2: a `superseded` line only for a stream that a later cues line of the SAME id replaces; another id's cues line is undelivered
        for (const c of stretch.slice(0, -1)) {
            const cid = windowIdAt(timeline.items ?? [], c.t);
            if (cid !== null && cid === idWin) superseded.push({ n: c.n, id: cid, nonEmpty: Array.isArray(c.arr) && c.arr.length > 0 });
            else undelivered.push({ n: c.n, id: cid ?? `L${c.n}` });
        }
        const iso0 = d ? iso(d.t) : null;
        const pair = iso0 ? pairByIso.get(iso0) ?? null : null;
        const id = pair?.id && pair.id !== '?' ? pair.id : windowIdAt(timeline.items ?? [], d ? d.t : F.t);
        if (!id) { problems.push(`L${F.n}`); prevN = F.n; continue; }
        let arr = [], logLine = null, empty = null, kind = null;
        if (own) {
            if (!Array.isArray(own.arr)) { problems.push(id); arr = []; empty = 'other'; kind = 'unparseable'; logLine = own.n; }
            else { arr = own.arr; logLine = own.n; }
        }
        if (!own || arr.length === 0) {
            const from = d ? d.t : (fullsIn[fullsIn.indexOf(F) - 1]?.t ?? s);
            const seg = lines.slice(0, F.n).filter((l) => { const t = Date.parse(l.slice(0, 24)); return Number.isFinite(t) && t >= from; }).join('\n');
            kind = FAIL_TEXT.test(F.txt) ? 'failed' : KNOWLEDGE_SIG.test(seg) ? 'knowledge' : CODING_SIG.test(seg) ? 'coding' : 'other';
            if (kind === 'unparseable') kind = 'other';
            empty = own ? kind : 'missing';
            if (!own && kind === 'other') problems.push(id);                                  // R1: unexplained missing block
            empties.push({ id, empty, kind, logLine });
        }
        entries.push({ id, arm: 'inapp', rep: null, dispatchedAt: pair ? iso0 : null, cues: arr, empty: arr.length ? null : empty, logLine });
        prevN = F.n;
    }
    for (const c of cuesIn.filter((x) => x.n > prevN)) { undelivered.push({ n: c.n, id: windowIdAt(timeline.items ?? [], c.t) ?? `L${c.n}` }); }
    return { entries, superseded, undelivered, problems, empties, outside, cuesInCount: cuesIn.length, fullsInCount: fullsIn.length, unjoined: entries.filter((x) => x.dispatchedAt === null).length };
}

// ---------------------------------------------------------------------------------------------------------
// the twin side
export function buildTwins(runDir, { files = TWIN_FILES, asked = null } = {}) {
    const entries = [], perRep = [];
    for (const f of files) {
        const p = path.join(runDir, f.src);
        const tag = `${f.arm}-r${f.rep}`;
        if (!fs.existsSync(p)) { perRep.push({ ...f, missing: true, entries: 0, answered: [], entryIds: [], tag }); continue; }
        const store = readJson(p, 'twin answer file');
        const ids = Object.keys(store).filter((k) => store[k] && typeof store[k] === 'object');
        const entryIds = [];
        for (const id of ids) {
            const v = store[id];
            const hasCues = Array.isArray(v.cues);
            const cuesArr = hasCues ? v.cues : [];
            const empty = v.transientError || !hasCues ? 'absent' : cuesArr.length ? null : 'empty';
            entries.push({ id: v.id ?? id, arm: f.arm, rep: f.rep, src: f.src, cues: cuesArr, empty, dispatchedAt: null, logLine: null });
            entryIds.push(v.id ?? id);
        }
        // the answered ids: the records the arm answered = no transientError. A block-only record (empty `spoken`, cues
        // present: h40d captured-high r1 R09) IS answered and keeps its entry - the judge pairs file drops it (43), the
        // registration's "twins 44/44 per rep" does not. The check below compares entries against these ids.
        // I1: the ids the arm was ASKED come from an independent source (the run's prompts.json keys = the captured ids the
        // arm replays, else the timeline's items), so a short twin file (an interrupted arm) is INCOMPLETE; `absent`
        // (transientError) ids are named. answeredFrom names the source.
        const absent = ids.filter((k) => store[k].transientError).map((k) => store[k].id ?? k);
        const answered = asked ? asked.ids : ids.filter((k) => !store[k].transientError).map((k) => store[k].id ?? k);
        perRep.push({ ...f, tag, missing: false, entries: entryIds.length, entryIds, answered, absent, answeredFrom: asked ? asked.from : 'records (NO independent source)' });
    }
    return { entries, perRep };
}

// ---------------------------------------------------------------------------------------------------------
// the contract (rev 6 "Input contract" + rev 7 deltas): every violation refuses
const eqKeys = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k));
export function validateExport(obj, { idRe = ID_RE_DEFAULT } = {}) {
    if (!eqKeys(obj, TOP_KEYS)) refuse(`top-level keys are not exactly ${TOP_KEYS.join(',')}`);
    if (obj.schema !== SCHEMA) refuse(`schema is not ${SCHEMA}`);
    if (!/^[A-Za-z]:[\\/]/.test(obj.runDir ?? '')) refuse('runDir is not an absolute C:/ or C:\\ path');
    if (!/^[0-9a-f]{40}$/.test(obj.registeredHead ?? '')) refuse('registeredHead is not 40 hex');
    if (!eqKeys(obj.window, ['startedAt', 'endedAt']) || !Number.isFinite(Date.parse(obj.window.startedAt)) || !Number.isFinite(Date.parse(obj.window.endedAt))) refuse('window is not {startedAt, endedAt} ISO');
    if (!Array.isArray(obj.entries)) refuse('entries is not an array');
    const seenIn = new Set(), seenTw = new Set();
    for (const [i, en] of obj.entries.entries()) {
        for (const k of Object.keys(en ?? {})) if (FORBIDDEN.includes(k)) refuse(`entry ${i} carries forbidden field ${k}`);
        const twin = en?.arm === 'captured-high' || en?.arm === 'captured-low';
        if (!twin && en?.arm !== 'inapp') refuse(`entry ${i} has arm ${en?.arm}`);
        if (!eqKeys(en, twin ? TWIN_KEYS : INAPP_KEYS)) refuse(`entry ${i} (${en?.arm}) keys are not exactly the contract's`);
        if (typeof en.id !== 'string' || !idRe.test(en.id)) refuse(`entry ${i} id ${idShown(en.id)} is outside the roster id set`);
        if (!Array.isArray(en.cues) || !en.cues.every((c) => typeof c === 'string')) refuse(`entry ${i} (${en.id}) cues is not an array of strings`);
        if (twin) {
            if (![1, 2, 3].includes(en.rep)) refuse(`entry ${i} (${en.id}) rep ${en.rep}`);
            if (!TWIN_FILES.some((f) => f.src === en.src && f.arm === en.arm && f.rep === en.rep)) refuse(`entry ${i} (${en.id}) src is not one of the six answer files`);
            if (!(en.empty === null || TW_EMPTY.includes(en.empty))) refuse(`entry ${i} (${en.id}) empty ${en.empty}`);
            if ((en.empty === null) !== (en.cues.length > 0) && en.empty !== 'absent') refuse(`entry ${i} (${en.id}) empty/cues disagree`);
            if (en.dispatchedAt !== null || en.logLine !== null) refuse(`entry ${i} (${en.id}) twin dispatchedAt/logLine must be null`);
            const k = `${en.id}|${en.arm}|${en.rep}`; if (seenTw.has(k)) refuse(`duplicate twin triple ${k}`); seenTw.add(k);
        } else {
            if (en.rep !== null) refuse(`entry ${i} (${en.id}) in-app rep must be null`);
            if (!(en.dispatchedAt === null || Number.isFinite(Date.parse(en.dispatchedAt)))) refuse(`entry ${i} (${en.id}) dispatchedAt`);
            if (!(en.empty === null || IN_EMPTY.includes(en.empty))) refuse(`entry ${i} (${en.id}) empty ${en.empty}`);
            if ((en.empty === null) !== (en.cues.length > 0)) refuse(`entry ${i} (${en.id}) empty/cues disagree`);
            if ((en.empty === 'missing') !== (en.logLine === null)) refuse(`entry ${i} (${en.id}) empty "missing" <=> logLine null violated`);
            if (en.logLine !== null && !Number.isInteger(en.logLine)) refuse(`entry ${i} (${en.id}) logLine`);
            const k = `${en.id}|${en.dispatchedAt}`; if (seenIn.has(k)) refuse(`duplicate in-app (id, dispatchedAt) ${en.id}`); seenIn.add(k);
        }
    }
    // an id with two in-app entries must have both dispatchedAt non-null (rev7-A1 two-entry rule; presence in the pairs is the consumer's)
    const byId = new Map();
    for (const en of obj.entries.filter((x) => x.arm === 'inapp')) byId.set(en.id, [...(byId.get(en.id) ?? []), en]);
    for (const [id, arr] of byId) if (arr.length > 1 && arr.some((x) => x.dispatchedAt === null)) refuse(`id ${id} has ${arr.length} in-app entries and one has dispatchedAt null`);
}

/** The export against its sources, from disk: every twin entry's cues equal its record's, every in-app logLine
 *  addresses a cues line whose parsed JSON equals the entry's cues (producer case (i)). */
export function selfCheck(obj, { runDir, lines }) {
    for (const en of obj.entries) {
        if (en.arm === 'inapp') {
            if (en.logLine === null) continue;
            const l = lines[en.logLine - 1] ?? '';
            const m = l.match(CUES_RE);
            if (!m) refuse(`self-check: ${en.id} logLine ${en.logLine} does not address a [Answer] cues: line`);
            if (JSON.stringify(JSON.parse(m[2])) !== JSON.stringify(en.cues)) refuse(`self-check: ${en.id} logLine ${en.logLine} parses to different cues than the entry`);
        }
    }
    const cache = new Map();
    for (const en of obj.entries.filter((x) => x.arm !== 'inapp')) {
        const p = path.join(runDir, en.src);
        if (!cache.has(p)) cache.set(p, readJson(p, 'twin answer file'));
        const store = cache.get(p);
        const rec = Object.values(store).find((v) => v && typeof v === 'object' && (v.id ?? null) === en.id) ?? store[en.id];
        if (!rec) refuse(`self-check: twin ${en.arm} r${en.rep} ${en.id} has no record in ${en.src}`);
        const want = Array.isArray(rec.cues) ? rec.cues : [];
        if (JSON.stringify(want) !== JSON.stringify(en.cues)) refuse(`self-check: twin ${en.arm} r${en.rep} ${en.id} cues differ from its record`);
    }
}

// ---------------------------------------------------------------------------------------------------------
export async function buildExport(opts) {
    const { runDir, idRe = ID_RE_DEFAULT, armingPath = path.join(HERE, 'ARMING-flight-eq.md'), launcherLogPath = path.join(MAIN, 'electron/test/golden/interview60.runs/flight-eq.launcher.log'), noPairs = false, noTwins = false } = opts;
    if (!fs.existsSync(runDir) || !fs.statSync(runDir).isDirectory()) refuse(`run dir ${runDir} is not a directory`);
    const need = (f) => { const p = path.join(runDir, f); if (!fs.existsSync(p)) refuse(`missing ${f} in the run dir`); return p; };
    const timeline = readJson(need('interview60.timeline.json'), 'timeline');
    const startedMs = Date.parse(timeline.startedAt), endedMs = Date.parse(timeline.endedAt);
    if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs)) refuse('timeline startedAt/endedAt unreadable');
    const logBytes = fs.readFileSync(need('natively_debug.log'));
    const logText = logBytes.toString('utf8');
    if (logText.includes('\r')) refuse('the debug log has CR bytes (CRLF); the contract assumes LF (rev7-A1 not covered)');
    const lines = logText.split('\n');
    let pairs = null;
    if (!noPairs) pairs = readJson(need('interview60.judge.pairs.json'), 'judge pairs');
    const { head, armingSha } = armingCheck({ armingPath, launcherLogPath, startedMs });
    const inapp = buildInApp({ lines, timeline, pairs, idRe });
    // I1: the asked ids, independent of the twin files: the captured prompts' keys (what the captured arms replay), else the timeline's items
    const promptsP = path.join(runDir, 'interview60.prompts.json');
    const asked = fs.existsSync(promptsP) ? { ids: Object.keys(readJson(promptsP, 'interview60.prompts.json')), from: 'prompts.json keys' } : { ids: (timeline.items ?? []).map((x) => x.id), from: 'timeline items' };
    const tw = noTwins ? { entries: [], perRep: [] } : buildTwins(runDir, { asked });
    const obj = { schema: SCHEMA, runDir: path.resolve(runDir).replace(/\\/g, '/'), registeredHead: head, window: { startedAt: timeline.startedAt, endedAt: timeline.endedAt }, entries: [...inapp.entries, ...tw.entries] };
    validateExport(obj, { idRe });
    selfCheck(obj, { runDir, lines });
    // metrics.mjs's cueBlocks.present (b10's own invariant, rev7 T2: = non-empty entries + non-empty superseded lines)
    let metricsNote = 'metrics.mjs unavailable', present = null;
    try {
        const mod = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.metrics.mjs')).href);
        if (fs.existsSync(path.join(runDir, 'verbal-diag.log'))) {
            const m = mod.computeRunFromFiles({ debugLog: path.join(runDir, 'natively_debug.log'), diagLog: path.join(runDir, 'verbal-diag.log'), timelinePath: path.join(runDir, 'interview60.timeline.json'), answersPath: path.join(runDir, 'interview60.answers.json') });
            present = m.cueBlocks.present; metricsNote = 'interview60.metrics.mjs cueBlocks.present';
        } else metricsNote = 'no verbal-diag.log in the run dir (metrics.mjs needs it)';
    } catch (e) { metricsNote = `metrics.mjs threw ${safeErr(e)}`; }
    const nonEmpty = inapp.entries.filter((x) => x.empty === null).length;
    const supNonEmpty = inapp.superseded.filter((x) => x.nonEmpty).length;
    const incomplete = [...new Set([...inapp.problems, ...inapp.undelivered.map((u) => u.id)])];
    const out = [];
    out.push(`LOG natively_debug.log ${sha256(logBytes)}`);
    out.push(`ARMING sha256/12 ${armingSha.slice(0, 12)} head ${head.slice(0, 7)}`);
    out.push(`window ${timeline.startedAt} ${timeline.endedAt}`);
    out.push(`in-app entries ${inapp.entries.length} ids ${new Set(inapp.entries.map((x) => x.id)).size}`);
    out.push(`in-app joined to pairs ${inapp.entries.length - inapp.unjoined} unjoined ${inapp.unjoined}${noPairs ? ' (pairs skipped by --no-pairs)' : ''}`);
    out.push(`cue lines in window ${inapp.cuesInCount} outside window ${inapp.outside.cues}`);
    out.push(`full lines in window ${inapp.fullsInCount} outside window ${inapp.outside.full}`);
    for (const s of inapp.superseded) out.push(`superseded ${s.n}`);
    for (const u of inapp.undelivered) out.push(`undelivered ${u.n} ${u.id}`);
    out.push(`empties ${inapp.empties.length}`);
    for (const e of inapp.empties) out.push(`empty ${e.id} ${e.empty} kind=${e.kind}`);
    if (present === null) { out.push(`cueBlocks check UNREAD (${metricsNote})`); incomplete.push('cueBlocks-unread'); }   // I3: an unread equality is never COMPLETE
    else {
        const ok = present === nonEmpty + supNonEmpty;
        out.push(`cueBlocks present ${present} = non-empty entries ${nonEmpty} + non-empty superseded ${supNonEmpty}: ${ok ? 'OK' : 'MISMATCH'}`);
        if (!ok) incomplete.push('cueBlocks-count');
    }
    if (noTwins) out.push('twins SKIPPED (--no-twins)');
    for (const r of tw.perRep) {
        if (r.missing) { out.push(`twin ${r.tag} MISSING FILE`); incomplete.push(`file:${r.tag}`); continue; }
        const a = new Set(r.answered), b = new Set(r.entryIds);
        const diff = [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x)));
        out.push(`twin ${r.tag} entries ${r.entries} asked ${a.size} (${r.answeredFrom})${r.absent.length ? ` absent ${r.absent.map(idShown).join(',')}` : ''}${diff.length ? ` MISMATCH ${diff.map(idShown).join(',')}` : ''}`);
        if (diff.length) incomplete.push(...diff.map((x) => `${r.tag}:${x}`));
    }
    out.push(incomplete.length ? `EXPORT INCOMPLETE: ${[...new Set(incomplete)].join(',')}` : 'EXPORT COMPLETE');
    return { obj, completeness: out, incomplete, inapp, tw, lines };
}

// ---------------------------------------------------------------------------------------------------------
async function main() {
    const argv = process.argv.slice(2);
    const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
    const flag = (n) => argv.includes(n);
    const valueFlags = new Set(['--out-dir', '--arming', '--launcher-log', '--id-re']);
    const pos = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));
    if (pos.length !== 1) { console.log('usage: node eq-cues-export.mjs <run-dir> [--out-dir <dir>] [--arming <file>] [--launcher-log <file>] [--id-re <regex>] [--no-pairs] [--no-twins]'); process.exit(2); }
    const overrides = ['--arming', '--launcher-log', '--id-re', '--no-pairs', '--no-twins'].filter((f) => argv.includes(f));
    if (overrides.length && process.env[CAL_ENV] !== '1') { console.log(`EXPORT REFUSED: ${overrides.join(', ')} change the registered contract and are for calibration fixtures only`); process.exit(2); }
    if (overrides.length) console.log(`NON-REGISTERED: calibration overrides active (${overrides.join(', ')})`);
    const outDir = opt('--out-dir', HERE);
    let r;
    try {
        r = await buildExport({ runDir: pos[0], idRe: opt('--id-re') ? new RegExp(opt('--id-re')) : ID_RE_DEFAULT, armingPath: opt('--arming', path.join(HERE, 'ARMING-flight-eq.md')), launcherLogPath: opt('--launcher-log', path.join(MAIN, 'electron/test/golden/interview60.runs/flight-eq.launcher.log')), noPairs: flag('--no-pairs'), noTwins: flag('--no-twins') });
    } catch (e) {
        if (e.refusal) { console.log(`EXPORT REFUSED: ${e.message}`); process.exit(2); }
        throw e;
    }
    fs.mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, 'cues-export-eq.json'), txtPath = path.join(outDir, 'cues-export-eq.completeness.txt');
    fs.writeFileSync(jsonPath, JSON.stringify(r.obj, null, 1));
    fs.writeFileSync(txtPath, r.completeness.join('\n') + '\n');
    // read back from disk: the three structural producer cases (ii)/(iii) on the written files
    const back = readJson(jsonPath, 'written export');
    if (!eqKeys(back, TOP_KEYS)) { console.log('EXPORT REFUSED: written file top-level keys wrong'); process.exit(2); }
    for (const l of r.completeness) console.log(l.startsWith('LOG ') ? `LOG natively_debug.log ${l.split(' ')[2].slice(0, 12)}...` : l);
    console.log(`WROTE ${jsonPath} (sha256/12 ${sha256(fs.readFileSync(jsonPath)).slice(0, 12)}, ${r.obj.entries.length} entries, never printed) and ${txtPath}`);
    process.exit(r.incomplete.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.log(`EXPORT CRASH: ${safeErr(e)}`); process.exit(4); });
