// cue-material-eq.mjs: the flight set's material consumer (rev 7 §1F, §7 F4; A1.1-A1.3, A1.8; A2.1-A2.3; A3.2/A3.5; A4.1-A4.3).
//
//   node cue-material-eq.mjs [--verify-only]
//
// 1. REG: reads C\HASHES.txt (UTF-8, no BOM, LF), hashes every listed file, prints `REG <sha16>` first and refuses on any
//    mismatch. 2. Verifies b10's tool line, the ARMING record, the export against its sources and the completeness file under
//    rev 7 + A1-A4, deriving N_first itself from the sha-checked log. 3. Assembles the 14 blind files (cues.blind-11..24), the
//    keys, sets.flight.json and the manifest slots. Prints ids, counts and hashes only: never a cue, an answer or a prompt.
// No model call. Exit: 0 ok | 2 refusal (nothing written) | 3 FLT VOID (export) | 4 crash.
// Overrides (paths of the registered inputs) exist for calibration fixtures only and need CUE_EQ_CAL=1 in the environment.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const C = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(C);
const E = path.join(SP, 'flight-eq');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const CAL_ENV = 'CUE_EQ_CAL';
export class Refusal extends Error { constructor(m) { super(m); this.refusal = true; } }
const refuse = (m) => { throw new Refusal(m); };
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const idShown = (x) => String(x).replace(/[^\w.-]/g, '?').slice(0, 24);
export const safeErr = (e) => { const m = String(e?.stack ?? '').match(/([^\\/()\s]+):(\d+):\d+\)?\s*$/m); return `${e?.name ?? 'Error'} at ${m ? `${m[1]}:${m[2]}` : 'unknown'}`; };
const readJson = (p, what) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { refuse(`${what} (${path.basename(p)}) is not readable JSON (${e?.name ?? 'Error'})`); } };

export const ID_RE_DEFAULT = /^S[12]Q(0[1-9]|10)F?$/;
export const TOP_KEYS = ['schema', 'runDir', 'registeredHead', 'window', 'entries'];
export const INAPP_KEYS = ['id', 'arm', 'rep', 'dispatchedAt', 'cues', 'empty', 'logLine'];
export const TWIN_KEYS = ['id', 'arm', 'rep', 'src', 'cues', 'empty', 'dispatchedAt', 'logLine'];
export const FORBIDDEN = ['answer', 'spoken', 'question', 'prompt', 'reason', 'score', 'scores', 'verdict', 'correctness', 'on_topic', 'delivery'];
export const TWIN_FILES = [
    { arm: 'captured-high', rep: 1, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high.json', judge: 'interview60.judge.gemini-3.5-flash-lite_captured-high.json', pairs: 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json' },
    { arm: 'captured-high', rep: 2, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json', judge: 'interview60.judge.gemini-3.5-flash-lite_captured-high-r2.json', pairs: 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json' },
    { arm: 'captured-high', rep: 3, src: 'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json', judge: 'interview60.judge.gemini-3.5-flash-lite_captured-high-r3.json', pairs: 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json' },
    { arm: 'captured-low', rep: 1, src: 'interview60.answers.gemini-3.1-flash-lite_captured-low.json', judge: 'interview60.judge.gemini-3.1-flash-lite_captured-low.json', pairs: 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low.json' },
    { arm: 'captured-low', rep: 2, src: 'interview60.answers.gemini-3.1-flash-lite_captured-low-r2.json', judge: 'interview60.judge.gemini-3.1-flash-lite_captured-low-r2.json', pairs: 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r2.json' },
    { arm: 'captured-low', rep: 3, src: 'interview60.answers.gemini-3.1-flash-lite_captured-low-r3.json', judge: 'interview60.judge.gemini-3.1-flash-lite_captured-low-r3.json', pairs: 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r3.json' },
];
const tagOf = (f) => `${f.arm}-r${f.rep}`;
const IN_EMPTY = ['knowledge', 'coding', 'failed', 'other', 'missing'];
const TW_EMPTY = ['empty', 'absent'];
const CUES_RE = /^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$/;
const FULL_RE = /^(\S+) \[LOG\] \[Answer\] full: (".*")$/;
const TURN_RE = /^(\S+) \[LOG\] \[IntelligenceEngine\] .*question: gate=\S+ .*\bturn=(\d+)\b/;
const GRADER_MODEL = 'claude-opus-5-5';
const REQUIRED_AMENDMENTS = ['AMENDMENT-rev7-A1.md', 'AMENDMENT-rev7-A2.md', 'AMENDMENT-rev7-A3.md', 'AMENDMENT-rev7-A4.md'];

// ---------------------------------------------------------------------------------------------------------------
// REG: C\HASHES.txt (A1.8, A2.5, A3.7, A4.3)
export function loadHashes(hashesPath) {
    if (!fs.existsSync(hashesPath)) refuse(`HASHES.txt missing (${hashesPath})`);
    const buf = fs.readFileSync(hashesPath);
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) refuse('HASHES.txt starts with a BOM');
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { refuse('HASHES.txt is not valid UTF-8'); }
    if (text.includes('\r')) refuse('HASHES.txt has CR bytes (LF line ends required)');
    const rows = [];
    text.split('\n').forEach((line, i) => {
        if (line === '' || line.startsWith('#')) return;
        const m = line.match(/^([0-9a-f]{64})  (.+)  (REGISTRATION|AMENDMENT|INPUT)$/);
        if (!m) refuse(`HASHES.txt line ${i + 1} does not split into <64 hex>  <path>  <role>`);
        const abs = /^[A-Za-z]:[\\/]/.test(m[2]);
        const file = abs ? m[2] : path.join(SP, m[2]);
        rows.push({ sha: m[1], rel: m[2], file, role: m[3] });
    });
    const regs = rows.filter((r) => r.role === 'REGISTRATION');
    if (regs.length !== 1) refuse(`HASHES.txt has ${regs.length} REGISTRATION lines, want exactly 1`);
    for (const r of rows) {
        if (!fs.existsSync(r.file)) refuse(`HASHES.txt lists a file that is not found (${path.basename(r.file)}; role ${r.role})`);
        const h = sha256(fs.readFileSync(r.file));
        if (h !== r.sha) refuse(`HASHES.txt: ${path.basename(r.file)} (${r.role}) hashes to ${h.slice(0, 12)}, the line says ${r.sha.slice(0, 12)}`);
    }
    for (const a of REQUIRED_AMENDMENTS) if (!rows.some((r) => r.role === 'AMENDMENT' && path.basename(r.file) === a)) refuse(`HASHES.txt has no AMENDMENT row for ${a}`);
    return { rows, reg16: regs[0].sha.slice(0, 16), byFile: new Map(rows.map((r) => [norm(r.file), r])) };
}

// the run's pairs and timeline are INPUT rows (A3.7)
const requirePinned = (H, file, what) => { const r = H.byFile.get(norm(file)); if (!r || r.role !== 'INPUT') refuse(`${what} is not an INPUT row of HASHES.txt (A3.7)`); };

// b10's line in instruments.sha256.txt (rev 7 §1F): must exist and match the tool file
export function instrumentsCheck(instrPath, toolPath) {
    if (!fs.existsSync(instrPath)) refuse('instruments.sha256.txt missing');
    const lines = fs.readFileSync(instrPath, 'utf8').split(/\r?\n/).filter((l) => /\seq-cues-export\.mjs\s/.test(l));
    if (!lines.length) refuse('the b10 line (eq-cues-export.mjs) is missing from instruments.sha256.txt');
    const last = lines[lines.length - 1];
    const m = last.match(/sha256=([0-9a-f]{64})\b/);
    if (!m) refuse('the b10 line carries no sha256=');
    if (!/\bcal=\S+/.test(last) || !/\breview=\S+/.test(last)) refuse('the b10 line carries no cal= or review= field');
    const have = sha256(fs.readFileSync(toolPath));
    if (m[1] !== have) refuse(`the b10 line sha256 ${m[1].slice(0, 12)} is not the tool file's ${have.slice(0, 12)}`);
    return have;
}

// the ARMING record against the real launcher log (A5.4, A1.2): last `ARMING ...` line before timeline.startedAt
export function armingCheck({ armingPath, launcherLogPath, startedMs }) {
    if (!fs.existsSync(armingPath)) refuse('ARMING record missing');
    if (!fs.existsSync(launcherLogPath)) refuse('launcher log missing');
    const bytes = fs.readFileSync(armingPath);
    const headLines = bytes.toString('utf8').split(/\r?\n/).filter((l) => /^\s*[-*]?\s*Registered HEAD\b/i.test(l));
    if (headLines.length !== 1) refuse(`ARMING record has ${headLines.length} "Registered HEAD" lines, want exactly 1`);
    const hex = headLines[0].match(/\b[0-9a-f]{40}\b/g) ?? [];
    if (hex.length !== 1) refuse(`the registered-HEAD line carries ${hex.length} 40-hex values, want exactly 1`);
    const sha = sha256(bytes);
    let last = null;
    for (const raw of fs.readFileSync(launcherLogPath, 'utf8').replace(/^\uFEFF/, '').split('\n')) {
        const l = raw.replace(/\r$/, '');
        if (/^ARMING( |$)/.test(l)) { last = l; continue; }
        const m = l.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) /);
        if (m && Date.parse(m[1]) > startedMs) break;
    }
    if (last === null) refuse('no ARMING line in the launcher log before the run start');
    if (last === 'ARMING absent') refuse('the last ARMING line before the run start reads "ARMING absent"');
    if (last !== `ARMING sha256=${sha}`) refuse('the last ARMING line before the run start does not equal the record sha256');
    return { head: hex[0], armingSha: sha };
}

// ---------------------------------------------------------------------------------------------------------------
export function parseCompleteness(text) {
    const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l !== '');
    const c = { lines, log: null, inapp: null, ids: null, superseded: [], probe: [], undelivered: [], exempt: null, last: lines[lines.length - 1] };
    const loglines = lines.filter((l) => /^LOG /.test(l));
    if (loglines.length !== 1) refuse(`the completeness file has ${loglines.length} LOG lines, want 1`);
    const lm = loglines[0].match(/^LOG (\S+) ([0-9a-f]{64})$/);
    if (!lm) refuse('the completeness LOG line is not `LOG <basename> <sha256>`');
    c.log = { name: lm[1], sha: lm[2] };
    for (const l of lines) {
        let m;
        if ((m = l.match(/^in-app entries (\d+) ids (\d+)$/))) { c.inapp = Number(m[1]); c.ids = Number(m[2]); }
        else if ((m = l.match(/^superseded (\d+)$/))) c.superseded.push(Number(m[1]));
        else if ((m = l.match(/^probe (\d+)$/))) c.probe.push(Number(m[1]));
        else if ((m = l.match(/^undelivered (\d+) (\S+)$/))) c.undelivered.push({ n: Number(m[1]), id: m[2] });
        else if ((m = l.match(/^full lines exempt \(probe\) (\d+)$/))) c.exempt = Number(m[1]);
    }
    if (c.inapp === null) refuse('the completeness file has no `in-app entries N ids M` line');
    if (!(c.last === 'EXPORT COMPLETE' || /^EXPORT INCOMPLETE: \S+$/.test(c.last))) refuse('the completeness file does not end with EXPORT COMPLETE / EXPORT INCOMPLETE: <ids>');
    c.complete = c.last === 'EXPORT COMPLETE';
    c.incomplete = c.complete ? [] : c.last.slice('EXPORT INCOMPLETE: '.length).split(',');
    return c;
}

function windowIdAt(items, t) {
    const w = items.filter((i) => Number.isFinite(i.playedAt)).sort((a, b) => a.playedAt - b.playedAt);
    let id = null, end = null;
    for (let k = 0; k < w.length; k++) {
        const to = k + 1 < w.length ? w[k + 1].playedAt : w[k].playedAt + 300_000;
        if (t >= w[k].playedAt && t < to) { id = w[k].id; end = to; }
    }
    return { id, end };
}

const eqKeys = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k));

/** The contract on the export object (rev 6 "Input contract" + deltas + the two-entry rule). */
export function validateExport(obj, idRe) {
    if (!eqKeys(obj, TOP_KEYS)) refuse(`top-level keys are not exactly ${TOP_KEYS.join(',')}`);
    if (obj.schema !== 'cues-export-eq/1') refuse('schema is not cues-export-eq/1');
    if (!/^[A-Za-z]:[\\/]/.test(obj.runDir ?? '')) refuse('runDir is not an absolute path');
    if (!/^[0-9a-f]{40}$/.test(obj.registeredHead ?? '')) refuse('registeredHead is not 40 hex');
    if (!eqKeys(obj.window, ['startedAt', 'endedAt']) || !Number.isFinite(Date.parse(obj.window.startedAt)) || !Number.isFinite(Date.parse(obj.window.endedAt))) refuse('window is not {startedAt, endedAt} ISO');
    if (!Array.isArray(obj.entries)) refuse('entries is not an array');
    const seenIn = new Set(), seenTw = new Set();
    for (const [i, en] of obj.entries.entries()) {
        for (const k of Object.keys(en ?? {})) if (FORBIDDEN.includes(k)) refuse(`entry ${i} carries forbidden field ${k}`);
        const twin = en?.arm === 'captured-high' || en?.arm === 'captured-low';
        if (!twin && en?.arm !== 'inapp') refuse(`entry ${i} has arm ${idShown(en?.arm)}`);
        if (!eqKeys(en, twin ? TWIN_KEYS : INAPP_KEYS)) refuse(`entry ${i} (${en.arm}) keys are not exactly the contract's`);
        if (typeof en.id !== 'string' || !idRe.test(en.id)) refuse(`entry ${i} id ${idShown(en.id)} is outside the roster id set`);
        if (!Array.isArray(en.cues) || !en.cues.every((c) => typeof c === 'string')) refuse(`entry ${i} (${en.id}) cues is not an array of strings`);
        if (twin) {
            if (![1, 2, 3].includes(en.rep)) refuse(`entry ${i} (${en.id}) rep`);
            if (!TWIN_FILES.some((f) => f.src === en.src && f.arm === en.arm && f.rep === en.rep)) refuse(`entry ${i} (${en.id}) src is not one of the six answer files`);
            if (!(en.empty === null || TW_EMPTY.includes(en.empty))) refuse(`entry ${i} (${en.id}) empty`);
            if ((en.empty === null) !== (en.cues.length > 0) && en.empty !== 'absent') refuse(`entry ${i} (${en.id}) empty/cues disagree`);
            if (en.dispatchedAt !== null || en.logLine !== null) refuse(`entry ${i} (${en.id}) twin dispatchedAt/logLine must be null`);
            const k = `${en.id}|${en.arm}|${en.rep}`; if (seenTw.has(k)) refuse(`duplicate twin triple ${idShown(k)}`); seenTw.add(k);
        } else {
            if (en.rep !== null) refuse(`entry ${i} (${en.id}) in-app rep must be null`);
            if (!(en.dispatchedAt === null || Number.isFinite(Date.parse(en.dispatchedAt)))) refuse(`entry ${i} (${en.id}) dispatchedAt`);
            if (!(en.empty === null || IN_EMPTY.includes(en.empty))) refuse(`entry ${i} (${en.id}) empty`);
            if ((en.empty === null) !== (en.cues.length > 0)) refuse(`entry ${i} (${en.id}) empty/cues disagree`);
            if ((en.empty === 'missing') !== (en.logLine === null)) refuse(`entry ${i} (${en.id}) empty "missing" <=> logLine null violated`);
            if (en.logLine !== null && !Number.isInteger(en.logLine)) refuse(`entry ${i} (${en.id}) logLine`);
            const k = `${en.id}|${en.dispatchedAt}`; if (seenIn.has(k)) refuse(`duplicate in-app (id, dispatchedAt) ${idShown(en.id)}`); seenIn.add(k);
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
/** Everything the consumer checks, in order. Returns the context for assembly and the printed lines. */
export async function verify(o) {
    const out = [];
    const push = (l) => { out.push(l); o.emit?.(l); };
    const H = loadHashes(o.hashesPath);
    push(`REG ${H.reg16}`);
    const regFile = H.rows.find((r) => r.role === 'REGISTRATION');
    if (sha256(fs.readFileSync(regFile.file)).slice(0, 16) !== H.reg16) refuse('REG: the registration file does not hash to its line');
    const toolSha = instrumentsCheck(o.instrumentsPath, o.b10Path);
    push(`b10 tool sha256/12 ${toolSha.slice(0, 12)} matches instruments.sha256.txt`);
    for (const a of ['export', 'completeness']) if (!fs.existsSync(o[`${a}Path`])) refuse(`${a} file missing`);
    const exp = readJson(o.exportPath, 'export');
    validateExport(exp, o.idRe);
    const comp = parseCompleteness(fs.readFileSync(o.completenessPath, 'utf8'));
    const runDir = exp.runDir.replace(/\\/g, '/');
    if (!fs.existsSync(runDir)) refuse('the export\'s runDir does not exist');
    const rp = (f) => path.join(runDir, f);
    const timelineP = rp('interview60.timeline.json'), pairsP = rp('interview60.judge.pairs.json');
    for (const f of [timelineP, pairsP, rp('natively_debug.log')]) if (!fs.existsSync(f)) refuse(`missing ${path.basename(f)} in the run dir`);
    requirePinned(H, pairsP, 'the run\'s interview60.judge.pairs.json');
    requirePinned(H, timelineP, 'the run\'s interview60.timeline.json');
    const timeline = readJson(timelineP, 'timeline'), pairs = readJson(pairsP, 'judge pairs');
    const s = Date.parse(timeline.startedAt), e = Date.parse(timeline.endedAt);
    if (exp.window.startedAt !== timeline.startedAt || exp.window.endedAt !== timeline.endedAt) refuse('the export window is not the timeline\'s');
    const ar = armingCheck({ armingPath: o.armingPath, launcherLogPath: o.launcherLogPath, startedMs: s });
    if (exp.registeredHead !== ar.head) refuse('registeredHead is not the ARMING record\'s HEAD');
    push(`ARMING sha256/12 ${ar.armingSha.slice(0, 12)} head ${ar.head.slice(0, 7)} matches the launcher log`);
    // the log
    const logBytes = fs.readFileSync(rp('natively_debug.log'));
    if (sha256(logBytes) !== comp.log.sha) refuse('the LOG sha256 is not the debug log\'s');
    if (comp.log.name !== 'natively_debug.log') refuse('the LOG line names another file');
    const logText = logBytes.toString('utf8');
    if (logText.includes('\r')) refuse('the debug log has CR bytes (LF required)');
    const lines = logText.split('\n');
    push(`LOG sha256/12 ${comp.log.sha.slice(0, 12)} verified`);
    const inWin = (t) => Number.isFinite(t) && t >= s && t <= e;
    const cues = [], fullsIn = [], turns = [];
    let turnContains = 0, outsideCues = 0, outsideFull = 0;
    lines.forEach((l, i) => {
        if (l.includes('question: gate=') && l.includes('turn=')) turnContains++;
        let m = l.match(CUES_RE);
        if (m) { const t = Date.parse(m[1]); if (inWin(t)) { let arr = null; try { arr = JSON.parse(m[2]); } catch { /* refused below */ } cues.push({ n: i + 1, t, arr }); } else outsideCues++; return; }
        m = l.match(FULL_RE);
        if (m) { if (inWin(Date.parse(m[1]))) fullsIn.push(i + 1); else outsideFull++; return; }
        m = l.match(TURN_RE);
        if (m) turns.push({ n: i + 1, t: Date.parse(m[1]), num: Number(m[2]) });
    });
    if (turnContains !== turns.length) refuse(`turn lines: ${turnContains} contain \`question: gate=\` and \`turn=\` but ${turns.length} parse as turn starts`);
    const bad = cues.find((c) => !Array.isArray(c.arr)); if (bad) refuse(`unparseable in-window cues line at log line ${bad.n}`);
    const cueAt = new Map(cues.map((c) => [c.n, c]));
    const turnAt = (n) => { let r = null; for (const t of turns) { if (t.n < n) r = t; else break; } return r; };
    const inapp = exp.entries.filter((x) => x.arm === 'inapp');
    if (inapp.length !== comp.inapp) refuse(`in-app entries ${inapp.length} != the completeness file's ${comp.inapp}`);
    if (new Set(inapp.map((x) => x.id)).size !== comp.ids) refuse('in-app ids differ from the completeness file\'s');
    // pairs
    const pairByIso = new Map((pairs.items ?? []).map((p) => [p.dispatchedAt, p]));
    const byId = new Map(); for (const x of inapp) byId.set(x.id, [...(byId.get(x.id) ?? []), x]);
    for (const x of inapp) if (x.dispatchedAt !== null) {
        const p = pairByIso.get(x.dispatchedAt);
        if (!p) refuse(`${idShown(x.id)}: dispatchedAt is not in interview60.judge.pairs.json`);
        if (p.id !== x.id && p.id !== '?') refuse(`${idShown(x.id)}: its pairs entry belongs to another id`);
    }
    for (const [id, arr] of byId) if (arr.length > 1 && arr.some((x) => x.dispatchedAt === null || !pairByIso.has(x.dispatchedAt))) refuse(`id ${idShown(id)} has ${arr.length} in-app entries and one is not joined to the pairs (two-entry rule)`);
    // entries against the log
    const addressed = new Map();
    for (const x of inapp) {
        if (x.logLine === null) continue;
        const c = cueAt.get(x.logLine);
        if (!c) refuse(`${idShown(x.id)} logLine ${x.logLine} is not an in-window [Answer] cues: line`);
        if (JSON.stringify(c.arr) !== JSON.stringify(x.cues)) refuse(`${idShown(x.id)} logLine ${x.logLine} parses to different cues than the entry`);
        if (addressed.has(x.logLine)) refuse(`log line ${x.logLine} is addressed by two entries`);
        addressed.set(x.logLine, x);
    }
    // named lines
    const dup = (a, w) => { if (new Set(a).size !== a.length) refuse(`${w} names a line twice`); };
    dup(comp.superseded, 'superseded'); dup(comp.probe, 'probe');
    for (const n of comp.superseded) if (comp.probe.includes(n)) refuse(`line ${n} is named both superseded and probe`);
    for (const n of [...comp.superseded, ...comp.probe]) if (addressed.has(n)) refuse(`line ${n} is named and also addressed by an entry`);
    for (const n of comp.superseded) if (!cueAt.has(n)) refuse(`superseded ${n} is not an in-window [Answer] cues: line`);
    for (const n of comp.probe) if (!cueAt.has(n)) refuse(`probe ${n} is not an in-window [Answer] cues: line (a full:/trimmed line or outside the window)`);
    for (const c of cues) {
        const k = (addressed.has(c.n) ? 1 : 0) + (comp.superseded.includes(c.n) ? 1 : 0) + (comp.probe.includes(c.n) ? 1 : 0);
        if (k !== 1) refuse(`in-window cues line ${c.n} is ${k === 0 ? 'neither addressed nor named' : 'addressed or named more than once'}`);
    }
    // U3 + A3.2 (as limited by A4.1)
    const items = timeline.items ?? [];
    push(`turn lines ${turns.length}${turns.length === 0 ? ': A3.2 not applied' : ''}`);
    for (const n of comp.superseded) {
        const c = cueAt.get(n);
        const { id, end } = windowIdAt(items, c.t);
        if (id === null) refuse(`superseded ${n} lies in no play window`);
        const later = inapp.some((x) => x.id === id && x.logLine !== null && cueAt.get(x.logLine).t > c.t && cueAt.get(x.logLine).t < end);
        if (!later) refuse(`superseded ${n}: no later addressed line for its id before the next item's play start (U3)`);
        if (turns.length > 0) {
            const tn = turnAt(n);
            if (tn === null) refuse(`superseded ${n}: the log carries turn lines but none lies before it (A3.2)`);
            if (!(tn.t >= s)) refuse(`superseded ${n}: its turn started before window.startedAt (A3.2)`);
        }
    }
    // probes (A2.1 criteria 1-5, gated on a probe line existing, A4.1)
    const probeInfo = [];
    let nFirst = null;
    if (comp.probe.length) {
        const dts = (pairs.items ?? []).map((p) => p.dispatchedAt).filter((d) => d != null);
        if (dts.some((d) => !Number.isFinite(Date.parse(d)))) refuse('a pairs dispatchedAt is unparseable');
        if (dts.some((d) => Date.parse(d) < s)) refuse('a judge pair was dispatched before window.startedAt: every probe line refuses (criterion 5)');
        const earliest = Math.min(...dts.map(Date.parse));
        const first = Number.isFinite(earliest) ? turns.find((t) => t.t >= earliest) : null;
        if (!first) refuse('no turn line at or after the earliest pairs dispatchedAt (N_first underivable)');
        nFirst = first.num;
        for (const n of comp.probe) {
            const c = cueAt.get(n);
            const tn = turnAt(n);
            if (!tn) refuse(`probe ${n}: no turn line before it (criterion 2)`);
            if (!(tn.t < s)) refuse(`probe ${n}: its turn started inside the window (criterion 2)`);
            if (!(tn.num < nFirst)) refuse(`probe ${n}: its turn ${tn.num} is not lower than N_first ${nFirst} (criterion 4)`);
            probeInfo.push({ n, N: tn.num, off: ((c.t - s) / 1000).toFixed(3) });
        }
        if (comp.exempt !== comp.probe.length) refuse(`the completeness file exempts ${comp.exempt} probe full lines for ${comp.probe.length} probe lines`);
    } else if ((comp.exempt ?? 0) !== 0) refuse('the completeness file exempts probe full lines but names no probe line');
    // full lines: every in-window full line is an entry's or a probe's
    if (fullsIn.length !== inapp.length + comp.probe.length) push(`NOTE full lines in window ${fullsIn.length} vs entries ${inapp.length} + probe ${comp.probe.length} (a continuation or an unnamed full; not a refusal)`);
    // cueBlocks equality (T2): metrics.mjs's present = non-empty entries + non-empty superseded + non-empty probe lines
    if (!fs.existsSync(rp('verbal-diag.log'))) refuse('verbal-diag.log missing: cueBlocks cannot be re-read');
    let present;
    try {
        const mod = await import(pathToFileURL(path.join(o.mainDir, 'electron/test/golden/interview60.metrics.mjs')).href);
        present = mod.computeRunFromFiles({ debugLog: rp('natively_debug.log'), diagLog: rp('verbal-diag.log'), timelinePath: timelineP, answersPath: rp('interview60.answers.json') }).cueBlocks.present;
    } catch (err) { refuse(`metrics.mjs could not be read (${safeErr(err)})`); }
    const nonEmptyEntries = inapp.filter((x) => x.empty === null).length;
    const supNE = comp.superseded.filter((n) => cueAt.get(n).arr.length > 0).length, probeNE = comp.probe.filter((n) => cueAt.get(n).arr.length > 0).length;
    if (present !== nonEmptyEntries + supNE + probeNE) refuse(`cueBlocks present ${present} != non-empty entries ${nonEmptyEntries} + non-empty superseded ${supNE} + non-empty probe ${probeNE}`);
    // twins against their sources
    const twinRows = [];
    for (const f of TWIN_FILES) {
        const ents = exp.entries.filter((x) => x.arm === f.arm && x.rep === f.rep);
        const p = rp(f.src);
        if (!fs.existsSync(p)) { if (ents.length) refuse(`twin ${tagOf(f)} has entries but its answer file is absent`); twinRows.push({ f, n: 0, missing: true }); continue; }
        const store = readJson(p, 'twin answer file');
        const recs = Object.entries(store).filter(([, v]) => v && typeof v === 'object').map(([k, v]) => ({ id: v.id ?? k, v }));
        if (recs.length !== ents.length) refuse(`twin ${tagOf(f)}: ${ents.length} entries != ${recs.length} records`);
        const a = new Set(recs.map((r) => r.id)), b = new Set(ents.map((x) => x.id));
        if (a.size !== b.size || [...a].some((x) => !b.has(x))) refuse(`twin ${tagOf(f)}: entry ids differ from the record ids`);
        for (const en of ents) {
            const r = recs.find((x) => x.id === en.id).v;
            if (JSON.stringify(Array.isArray(r.cues) ? r.cues : []) !== JSON.stringify(en.cues)) refuse(`twin ${tagOf(f)} ${idShown(en.id)}: cues differ from the record's`);
        }
        twinRows.push({ f, n: ents.length, store });
    }
    // INCOMPLETE tokens (rev 7 §1F)
    const excl = { inapp: new Set(), twin: new Map() };
    let fltVoid = false;
    if (!comp.complete) {
        for (const tok of comp.incomplete) {
            let m;
            if (o.idRe.test(tok)) excl.inapp.add(tok);
            else if ((m = tok.match(/^(captured-(?:high|low)-r[123]):(\S+)$/)) && o.idRe.test(m[2])) excl.twin.set(m[1], [...(excl.twin.get(m[1]) ?? []), m[2]]);
            else if ((m = tok.match(/^file:(captured-(?:high|low)-r[123])$/))) excl.twin.set(m[1], 'file');
            else refuse(`the completeness file is INCOMPLETE on an unexplained token (${idShown(tok)})`);
        }
        if (excl.inapp.size > 2) fltVoid = true;
    }
    push(`in-app entries ${inapp.length} ids ${comp.ids}; superseded ${comp.superseded.length}${comp.superseded.length ? ` (${comp.superseded.join(',')})` : ''}; outside window cues ${outsideCues} full ${outsideFull}`);
    push(`probe ${comp.probe.length}${probeInfo.map((p) => ` [line ${p.n} turn ${p.N} offset ${p.off} s]`).join('')}${nFirst !== null ? ` N_first ${nFirst}` : ''}`);
    push(`cueBlocks present ${present} = entries ${nonEmptyEntries} + superseded ${supNE} + probe ${probeNE}: OK`);
    for (const t of twinRows) push(`twin ${tagOf(t.f)} entries ${t.n}${t.missing ? ' (file absent)' : ' = records, cues equal'}`);
    push(comp.complete ? 'export COMPLETE' : `export INCOMPLETE: in-app ids named ${excl.inapp.size}${fltVoid ? ' -> FLT VOID (export)' : ' -> excluded as export-missing'}`);
    return { out, H, exp, comp, pairs, timeline, lines, cues, runDir, rp, excl, fltVoid, ar, items, twinRows, pairByIso };
}

// ---------------------------------------------------------------------------------------------------------------
// assembly: the 14 blind files, keys, sets.flight.json, manifest slots
function rngFor(seed) {                          // counter-mode sha256 stream: deterministic, reproducible from the seed string
    let ctr = 0, buf = [], bi = 0;
    return () => { if (bi >= buf.length) { buf = [...crypto.createHash('sha256').update(`${seed}|${ctr++}`).digest()]; bi = 0; } const v = (buf[bi] << 24 | buf[bi + 1] << 16 | buf[bi + 2] << 8 | buf[bi + 3]) >>> 0; bi += 4; return v / 4294967296; };
}
const shuffle = (arr, seed) => { const a = [...arr], r = rngFor(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function loadTrim(trimPath, trimSha) {
    if (!trimPath || !trimSha) refuse('the display pin is missing: --trim-module and --trim-sha (the snapshot\'s sha256, recorded by amendment) are required to assemble twin blocks');
    if (!fs.existsSync(trimPath)) refuse('the trim module does not exist');
    if (sha256(fs.readFileSync(trimPath)) !== trimSha) refuse('the trim module\'s sha256 is not the recorded pin');
    const mod = createRequire(import.meta.url)(trimPath);
    if (typeof mod.trimCues !== 'function') refuse('the trim module exports no trimCues');
    return (cues) => { const r = mod.trimCues(cues, 3, 5); if (!r || !Array.isArray(r.cues)) refuse('trimCues did not return {cues: array}'); return r.cues; };
}

export function assemble(ctx, o) {
    const { exp, pairs, rp, excl, pairByIso } = ctx;
    const trim = loadTrim(o.trimPath, o.trimSha);
    const instr = { A: o.instructionA, B: o.instructionB };
    for (const c of ['A', 'B']) if (!fs.existsSync(instr[c])) refuse(`the frozen instruction file for condition ${c} does not exist`);
    // pipeline ids
    if (!fs.existsSync(o.pipelinePath)) refuse('C\\flight\\pipeline-ids.txt is missing (written from the committed result note before this tool runs)');
    const pipeline = fs.readFileSync(o.pipelinePath, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    for (const id of pipeline) if (!o.idRe.test(id)) refuse(`pipeline-ids.txt carries ${idShown(id)}, outside the roster`);
    // judge files
    const judgeOf = (file, what) => {
        const p = rp(file); if (!fs.existsSync(p)) refuse(`${what} judge file missing`);
        const j = readJson(p, `${what} judge file`);
        if (j.graderModel !== GRADER_MODEL) refuse(`${what} judge file was merged under another model than ${GRADER_MODEL}`);
        return j.items ?? {};
    };
    const judgeIn = judgeOf('interview60.judge.json', 'in-app');
    const qOf = new Map();                              // id -> question, the main pairs; twin pairs must agree
    for (const p of pairs.items ?? []) if (!qOf.has(p.id)) qOf.set(p.id, p.question);
    for (const f of TWIN_FILES) {
        const p = rp(f.pairs); if (!fs.existsSync(p)) continue;
        for (const it of readJson(p, 'twin pairs file').items ?? []) {
            if (qOf.has(it.id) && qOf.get(it.id) !== it.question) refuse(`a twin pairs file disagrees with the main pairs on the question of ${idShown(it.id)}`);
            if (!qOf.has(it.id)) qOf.set(it.id, it.question);
        }
    }
    const sets = [];            // { set, rep, blocksA:[{src,question,cues}], blocksB:[... answer] }
    const cls = {};
    const classify = (set, id, corr) => { const c = (cls[set] ??= { inherited: 0, partly: 0, pipeline: 0 }); if (pipeline.includes(id)) c.pipeline++; else if (corr === 0) c.inherited++; if (corr === 1) c.partly++; };
    // in-app
    const A = [], B = [];
    for (const x of exp.entries.filter((e) => e.arm === 'inapp' && e.empty === null && !excl.inapp.has(e.id))) {
        const q = qOf.get(x.id); if (q === undefined) refuse(`no question for ${idShown(x.id)}`);
        const jr = judgeIn[x.id]; if (!jr) refuse(`in-app judge file has no verdict for ${idShown(x.id)} (a block exists)`);
        classify('FLT-INAPP', x.id, jr.correctness);
        A.push({ ref: { id: x.id, arm: 'inapp', rep: null }, question: q, cues: x.cues });
        const p = x.dispatchedAt ? pairByIso.get(x.dispatchedAt) : null;
        if (p) B.push({ ref: { id: x.id, arm: 'inapp', rep: null }, question: q, cues: x.cues, answer: p.answer });
    }
    sets.push({ set: 'FLT-INAPP', rep: null, A, B, unpaired: A.length - B.length });
    for (const f of TWIN_FILES) {
        const tag = tagOf(f);
        const ex = excl.twin.get(tag);
        const set = f.arm === 'captured-high' ? 'FLT-TWINS-H' : 'FLT-TWINS-L';
        const A2 = [], B2 = [];
        if (ex !== 'file') {
            const store = ctx.twinRows.find((t) => t.f === f)?.store ?? {};
            const jr = judgeOf(f.judge, tag);
            for (const en of exp.entries.filter((e) => e.arm === f.arm && e.rep === f.rep && e.empty === null && !(ex ?? []).includes(e.id))) {
                const q = qOf.get(en.id); if (q === undefined) refuse(`no question for ${idShown(en.id)}`);
                const rec = Object.values(store).find((v) => v && typeof v === 'object' && (v.id ?? null) === en.id) ?? store[en.id];
                const j = jr[en.id]; if (j) classify(`${set}-r${f.rep}`, en.id, j.correctness);
                const cuesT = trim(en.cues);
                A2.push({ ref: { id: en.id, arm: f.arm, rep: f.rep }, question: q, cues: cuesT, changed: JSON.stringify(cuesT) !== JSON.stringify(en.cues) });
                B2.push({ ref: { id: en.id, arm: f.arm, rep: f.rep }, question: q, cues: cuesT, answer: typeof rec?.spoken === 'string' && rec.spoken.trim() ? rec.spoken : 'no answer' });
            }
        }
        sets.push({ set, rep: f.rep, arm: f.arm, A: A2, B: B2, unpaired: 0 });
    }
    // the 14 files and their numbers
    const files = [];
    for (const st of sets) for (const cond of ['A', 'B']) files.push({ set: st.set, rep: st.rep, cond, blocks: st[cond] });
    const seed = `cue-grading:flight-eq:${exp.registeredHead}`;
    const nums = shuffle([...Array(14).keys()].map((i) => 11 + i), `${seed}|assignment`);
    const blindDir = path.join(o.outRoot, 'blind'), keyDir = path.join(o.outRoot, 'keyhold');
    for (const d of [blindDir, keyDir]) fs.mkdirSync(d, { recursive: true });
    const manifestP = path.join(keyDir, 'manifest.json');
    const manifest = fs.existsSync(manifestP) ? readJson(manifestP, 'manifest') : { slots: {} };
    if (!manifest.slots || typeof manifest.slots !== 'object') refuse('manifest.json has no slots object');
    const toWrite = [];
    const setsFlight = {};
    files.forEach((f, i) => {
        const N = nums[i];
        const order = shuffle(f.blocks.map((_, k) => k), `${seed}|file|${N}`);
        const blocks = order.map((k, pos) => ({ id: `b${String(pos + 1).padStart(2, '0')}`, k }));
        const body = { blocks: blocks.map(({ id, k }) => { const b = f.blocks[k]; return f.cond === 'B' ? { id, question: b.question, cues: b.cues, answer: b.answer } : { id, question: b.question, cues: b.cues }; }) };
        const key = { blocks: blocks.map(({ id, k }) => ({ id, ...f.blocks[k].ref })) };
        const bp = path.join(blindDir, `cues.blind-${N}.json`);
        if (fs.existsSync(bp)) refuse(`cues.blind-${N}.json already exists`);
        for (const g of ['g1', 'g2']) if (manifest.slots[`blind-${N}.${g}`]) refuse(`manifest slot blind-${N}.${g} already exists`);
        toWrite.push({ N, bp, body, key, cond: f.cond });
        setsFlight[N] = { set: f.set, rep: f.rep, condition: f.cond, blocks: f.blocks.length };
    });
    for (const w of toWrite) {
        fs.writeFileSync(w.bp, JSON.stringify(w.body));
        fs.writeFileSync(path.join(keyDir, `key.blind-${w.N}.json`), JSON.stringify(w.key));
        for (const g of ['g1', 'g2']) manifest.slots[`blind-${w.N}.${g}`] = { blind: norm2(w.bp), verdicts: norm2(path.join(blindDir, `verdicts.blind-${w.N}.${g}.json`)), instruction: norm2(instr[w.cond]) };
    }
    fs.writeFileSync(path.join(keyDir, 'sets.flight.json'), JSON.stringify({ seed, assignment: setsFlight }));
    fs.writeFileSync(manifestP, JSON.stringify(manifest));
    const out = [];
    for (const w of toWrite) out.push(`cues.blind-${w.N}: ${setsFlight[w.N].set}${setsFlight[w.N].rep ? ` r${setsFlight[w.N].rep}` : ''} ${w.cond} ${setsFlight[w.N].blocks} blocks sha256/12 ${sha256(fs.readFileSync(w.bp)).slice(0, 12)}`);
    out.sort();
    for (const st of sets) out.push(`set ${st.set}${st.rep ? ` r${st.rep}` : ''}: A ${st.A.length} B ${st.B.length}${st.unpaired ? ` (unpaired, A only: ${st.unpaired})` : ''}${st.A.some((b) => b.changed !== undefined) ? ` trimCues changed ${st.A.filter((b) => b.changed).length}` : ''}`);
    for (const [k, v] of Object.entries(cls)) out.push(`classes ${k}: pipeline ${v.pipeline} inherited ${v.inherited} partly-correct ${v.partly}`);
    out.push(`seed sha256/12 ${sha256(seed).slice(0, 12)}; manifest slots ${Object.keys(manifest.slots).length}`);
    return out;
}
const norm2 = (p) => path.resolve(p).replace(/\\/g, '/');

// ---------------------------------------------------------------------------------------------------------------
export function defaults() {
    return {
        hashesPath: path.join(C, 'HASHES.txt'), instrumentsPath: path.join(E, 'instruments.sha256.txt'), b10Path: path.join(E, 'eq-cues-export.mjs'),
        exportPath: path.join(E, 'cues-export-eq.json'), completenessPath: path.join(E, 'cues-export-eq.completeness.txt'),
        armingPath: path.join(E, 'ARMING-flight-eq.md'), launcherLogPath: path.join(MAIN, 'electron/test/golden/interview60.runs/flight-eq.launcher.log'),
        mainDir: MAIN, idRe: ID_RE_DEFAULT, outRoot: C, pipelinePath: path.join(C, 'flight', 'pipeline-ids.txt'),
        instructionA: path.join(C, 'cue-grader-prompt.A.md'), instructionB: path.join(C, 'cue-grader-prompt.B.md'), trimPath: null, trimSha: null,
    };
}

async function main() {
    const argv = process.argv.slice(2);
    const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
    const o = defaults();
    const map = { '--hashes': 'hashesPath', '--instruments': 'instrumentsPath', '--b10': 'b10Path', '--export': 'exportPath', '--completeness': 'completenessPath', '--arming': 'armingPath', '--launcher-log': 'launcherLogPath', '--main': 'mainDir', '--out-root': 'outRoot', '--pipeline': 'pipelinePath', '--instruction-a': 'instructionA', '--instruction-b': 'instructionB' };
    const overrides = Object.keys(map).filter((f) => argv.includes(f)).concat(argv.includes('--id-re') ? ['--id-re'] : []);
    if (overrides.length && process.env[CAL_ENV] !== '1') { console.log(`MATERIAL REFUSED: ${overrides.join(', ')} change the registered inputs and are for calibration fixtures only`); process.exit(2); }
    for (const [f, k] of Object.entries(map)) if (val(f)) o[k] = val(f);
    if (val('--id-re')) o.idRe = new RegExp(val('--id-re'));
    o.trimPath = val('--trim-module') ?? null; o.trimSha = val('--trim-sha') ?? null;
    let ctx, printed = false;
    try {
        o.emit = (l) => { printed = true; console.log(l); };
        ctx = await verify(o);
        if (ctx.fltVoid) { console.log('FLT VOID (export): more than 2 in-app ids missing; no material written'); process.exit(3); }
        if (argv.includes('--verify-only')) { console.log('VERIFY OK (no material written)'); process.exit(0); }
        for (const l of assemble(ctx, o)) console.log(l);
        console.log('MATERIAL WRITTEN');
    } catch (e) {
        if (e.refusal) { if (!printed) console.log('REG REFUSED'); console.log(`MATERIAL REFUSED: ${e.message}`); process.exit(2); }
        console.log(`MATERIAL CRASH: ${safeErr(e)}`); process.exit(4);
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
