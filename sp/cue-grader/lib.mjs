// lib.mjs: shared helpers of the cue grader kit (SPEC-cue-grader.md revision 3). Pure functions and constants; no model call, no git write, no network.
// Nothing here prints a question, an answer or a cue; every report line is an id, a count or a hash.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
/** LAB: the kit's own folder. CUE_LAB_DIR is a test seam, honoured only under CUE_CAL_FAKE=1 (the launcher enforces that; the pure modules here take `lab` as a parameter). */
export const LAB = HERE;
export const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
export const F_R = `${SP}/followup-turn/R`;
export const RD_LAUNCHER = `${SP}/router-default/grade/launch-grader-rd.mjs`;
export const RUN_NAMES = {
    r1: '2026-10-07T00-22-47-router-default-r1',
    h40d: '2026-10-02T11-39-41-h40d',
    eq: '2026-10-06T01-12-56-eq',
};
export const sha256 = (b) => createHash('sha256').update(b).digest('hex');
export const sha12 = (b) => sha256(b).slice(0, 12);
export const fileSha = (f) => sha256(fs.readFileSync(f));
export const wordsOf = (s) => String(s).match(/\S+/g) ?? [];

// ---------------------------------------------------------------- seeded shuffle (mulberry32)
export function rng(seed) {
    let a = (typeof seed === 'number' ? seed : parseInt(sha256(String(seed)).slice(0, 8), 16)) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled(arr, seed) {
    const r = rng(seed), a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

// ---------------------------------------------------------------- tags (SPEC 5.1)
// cal-1..3.g1|g2 ; rev-1..4.g1|g2 ; r1-inapp.g1|g2, r1-high, r1-low ; h40d-inapp.g1|g2, h40d-high, h40d-low
/** { tag, base, kind: 'cal'|'rev'|'real', run, source, grader, graders } or null. `base` is the pairs file's name stem (a grader suffix never changes the pairs file). */
export function parseTag(tag) {
    let m;
    if ((m = /^(cal)-([1-3])\.g([12])$/.exec(tag))) return { tag, base: `cal-${m[2]}`, kind: 'cal', run: 'eq', source: 'plant', grader: `g${m[3]}`, graders: 2 };
    if ((m = /^(rev)-([1-4])\.g([12])$/.exec(tag))) return { tag, base: `rev-${m[2]}`, kind: 'rev', run: 'eq', source: 'plant', grader: `g${m[3]}`, graders: 2 };
    if ((m = /^(r1|h40d)-inapp\.g([12])$/.exec(tag))) return { tag, base: `${m[1]}-inapp`, kind: 'real', run: m[1], source: 'inapp', grader: `g${m[2]}`, graders: 2 };
    if ((m = /^(r1|h40d)-(high|low)$/.exec(tag))) return { tag, base: `${m[1]}-${m[2]}`, kind: 'real', run: m[1], source: m[2], grader: 'g1', graders: 1 };
    return null;
}
export const ALL_TAGS = [
    ...[1, 2, 3].flatMap((n) => [`cal-${n}.g1`, `cal-${n}.g2`]),
    ...[1, 2, 3, 4].flatMap((n) => [`rev-${n}.g1`, `rev-${n}.g2`]),
    'r1-inapp.g1', 'r1-inapp.g2', 'r1-high', 'r1-low',
    'h40d-inapp.g1', 'h40d-inapp.g2', 'h40d-high', 'h40d-low',
];
/** An opaque stem so a grader cannot tell calibration from real grading by a file or folder name (SPEC 3.3). Deterministic from the tag. */
export const opaque = (s) => sha256(`cue-grader|${s}`).slice(0, 8);
export const pairsName = (tag) => `p-${opaque(parseTag(tag).base)}.json`;
export const verdictsName = (tag) => `v-${opaque(tag)}.json`;
export const cwdName = (tag, attempt) => `g-${opaque(tag)}-a${attempt}`;
/** The folders of a LAB root (the real LAB, or a test seam's). */
export const dirsOf = (lab = LAB) => ({ lab, pairs: path.join(lab, 'pairs'), keyhold: path.join(lab, 'keyhold'), verdicts: path.join(lab, 'verdicts'), grading: path.join(lab, 'grading'), plants: path.join(lab, 'plants'), launches: path.join(lab, 'launches.jsonl'), probeLaunches: path.join(lab, 'grader-cwd.launches.jsonl'), probeOut: path.join(lab, 'grader-cwd.probes.out.txt'), rubric: path.join(lab, 'rubric.md'), rubricSha: path.join(lab, 'rubric.sha'), thresholds: path.join(lab, 'thresholds.json'), thresholdsSha: path.join(lab, 'thresholds.sha'), specSha: path.join(lab, 'spec.sha'), spec: path.join(lab, 'SPEC-cue-grader.md'), dispatch: path.join(lab, 'cue-grader-dispatch.txt') });

// ---------------------------------------------------------------- the frozen hashes (SPEC 4.5)
/** null when the hash state allows `tag`. Real tags (r1-*, h40d-*): rubric.sha AND spec.sha must exist and match. cal-* / rev-*: a missing hash file is allowed; an existing one must match. */
export function hashProblem(tag, lab = LAB) {
    const info = parseTag(tag); if (!info) return `"${tag}" is not a tag`;
    const d = dirsOf(lab), real = info.kind === 'real';
    for (const [name, shaFile, file] of [['rubric', d.rubricSha, d.rubric], ['spec', d.specSha, d.spec], ['thresholds', d.thresholdsSha, d.thresholds]]) {
        if (!fs.existsSync(shaFile)) { if (real) return `${path.basename(shaFile)} is missing: a real tag needs the frozen ${name} hash (freeze first)`; continue; }
        if (!fs.existsSync(file)) return `${path.basename(file)} is missing`;
        const want = fs.readFileSync(shaFile, 'utf8').trim(), got = fileSha(file);
        if (want !== got) return `the ${name} sha256 (${got.slice(0, 12)}) is not the frozen ${path.basename(shaFile)} (${want.slice(0, 12)})`;
    }
    return null;
}

// ---------------------------------------------------------------- the SPEC 6 thresholds: ONE place (LAB\thresholds.json), read by the scorer, the launcher and freeze.mjs
export const THRESHOLD_KEYS = ['goodPct', 'wrongPct', 'emptyPct', 'addsMin', 'ngMin', 'axisPct', 'agreePct'];
export function loadThresholds(lab = LAB) {
    const t = JSON.parse(fs.readFileSync(dirsOf(lab).thresholds, 'utf8'));
    for (const k of THRESHOLD_KEYS) if (!Number.isFinite(t[k]) || t[k] < 0) throw new Error(`thresholds.json: ${k} is missing or not a number`);
    return t;
}
/** The machine-readable line of SPEC section 6, 'THRESHOLDS: goodPct=80 ...', as an object (null when absent). freeze.mjs compares it with thresholds.json. */
export function specThresholds(specText) {
    const m = /^THRESHOLDS: (.+)$/m.exec(specText); if (!m) return null;
    return Object.fromEntries(m[1].trim().split(/\s+/).map((kv) => { const [k, v] = kv.split('='); return [k, Number(v)]; }));
}

// ---------------------------------------------------------------- the block verdict (SPEC 1.4)
export const VERDICT_RANK = { wrong: 0, weak: 1, good: 2 };
/** The derived block verdict from a grader's scores: { lines:[{R,C,G}], V, K }. */
export function derive(v) {
    const L = v.lines;
    if (L.some((l) => l.C === 0) || L.every((l) => l.R === 0)) return 'wrong';
    if (v.V === 2 && v.K >= 1 && L.every((l) => l.R >= 1 && l.G >= 1) && L.some((l) => l.R === 2 && l.G === 2)) return 'good';
    return 'weak';
}
export const worse = (a, b) => (VERDICT_RANK[a] <= VERDICT_RANK[b] ? a : b);

// ---------------------------------------------------------------- the verdicts validator (SPEC 1.5)
/** null when `vv` is a valid verdicts object for `lineCounts` ({key: number of lines}); else why not. */
export function verdictFileProblem(vv, lineCounts) {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !(k in lineCounts));
    if (extra.length) return `grades keys that are not in the pairs file: ${extra.join(', ')}`;
    const ok = (x) => [0, 1, 2].includes(x);
    for (const [k, n] of Object.entries(lineCounts)) {
        const s = vv[k];
        if (!s || typeof s !== 'object') return `no verdict for ${k}`;
        if (!Array.isArray(s.lines) || s.lines.length !== n) return `${k}: lines has length ${Array.isArray(s.lines) ? s.lines.length : 'none'}, the block has ${n}`;
        for (const l of s.lines) if (!l || !ok(l.R) || !ok(l.C) || !ok(l.G)) return `${k}: a line score outside 0-2`;
        if (!ok(s.V) || !ok(s.K)) return `${k}: V or K outside 0-2`;
        if (!['yes', 'no', 'na'].includes(s.D)) return `${k}: D outside yes|no|na`;
        if (!['good', 'weak', 'wrong'].includes(s.label)) return `${k}: label outside good|weak|wrong`;
        if (s.note != null && typeof s.note !== 'string') return `${k}: note is not a string`;
    }
    return null;
}

// ---------------------------------------------------------------- shape checks (SPEC 1.1): mechanical, outside the grader
export const CUE_MAX_LINES = 3, CUE_MAX_WORDS = 5;
// a "$" is notation when it opens a formula ("$O(") or closes one ("n)$"); money ("$5 million") passes, as in trimCues' own cleanup
const NOTATION_RX = /\$(?=[^\d\s])|(?<=\S)\$|\\[A-Za-z(){}[\]%]|`|\*\*|__CUES__|__MORE__|^\s*\d+\s*\|/;
/** The flags of a DISPLAYED block (an array of non-empty lines): one flag per rule broken. [] = clean. */
export function shapeFlags(cues) {
    const f = [];
    if (cues.length > CUE_MAX_LINES) f.push(`lines>${CUE_MAX_LINES}`);
    if (cues.some((c) => wordsOf(c).length > CUE_MAX_WORDS)) f.push(`words>${CUE_MAX_WORDS}`);
    if (cues.some((c) => NOTATION_RX.test(c))) f.push('notation/sentinel');
    return f;
}

// ---------------------------------------------------------------- JSON files
export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export function writeJson(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1)); }
export const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);

// ---------------------------------------------------------------- the pairs file (SPEC 2): exactly these four fields per item
export const PAIR_FIELDS = ['key', 'question', 'cues', 'answer'];
/** null when `p` is a valid blind pairs object; else why not. Nothing outside PAIR_FIELDS may ride along (a source, an id, a model would unblind the grader). */
export function pairsProblem(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.items) || !p.items.length) return 'items must be a non-empty list';
    if (Object.keys(p).some((k) => k !== 'items')) return 'only `items` may sit at the top level';
    const keys = new Set();
    for (const it of p.items) {
        if (!it || typeof it !== 'object') return 'an item is not an object';
        if (Object.keys(it).sort().join() !== [...PAIR_FIELDS].sort().join()) return `an item has fields [${Object.keys(it).join(',')}], not exactly ${PAIR_FIELDS.join(',')}`;
        if (typeof it.key !== 'string' || !/^c\d{2,3}$/.test(it.key) || keys.has(it.key)) return 'keys must be unique c01.. strings';
        keys.add(it.key);
        if (typeof it.question !== 'string' || !it.question || typeof it.answer !== 'string' || !it.answer) return `${it.key}: question and answer must be non-empty strings`;
        if (!Array.isArray(it.cues) || !it.cues.length || it.cues.some((c) => typeof c !== 'string' || c.trim() === '')) return `${it.key}: cues must be a non-empty list of non-empty strings`;
    }
    return null;
}
/** { key: number of cue lines } of a valid pairs object. */
export const lineCountsOf = (p) => Object.fromEntries(p.items.map((i) => [i.key, i.cues.length]));
