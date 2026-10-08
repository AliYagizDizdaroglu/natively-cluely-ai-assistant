// E\cue-leak-check.mjs (A4.3a, replaced by A5.1, short-cue clause A6.1 m5; fix round 2026-10-06 per cue-report-review.md):
// the leak checker for counts-only cue reports.
//
//   node cue-leak-check.mjs <export.json> <summary-file>
//
// KNOWN STRINGS (read, never printed): (1) every cue string of the export (cues-export-eq/1: entries[].cues, in-app and twin);
// (2) every string inside a `[Answer] cues:` array and a `[Answer] cues trimmed:` object (all values, keys excluded: the
// dropped / cut / cleaned text) of the log at <export.runDir>/natively_debug.log; (3) every string literal on the cue-carrying
// lines (block, trimmed, malformed, unparsable, e.g., block-only) of the instruments' full outputs E\cue-report\*.full.txt.
// MATCHING: known strings and the checked file are normalised (NFC, lower case, whitespace runs -> one space, trimmed). A known
// string LEAKS when
//   - its normalised form is >= 24 characters and ANY 24-character window of it occurs in the file (a shared run >= 24), or
//   - it is < 24 characters and the WHOLE of it occurs in the file as a plain substring (A6 m5: no word-boundary rule).
// Each known string is also tried in three escaped forms: JSON-escaped (\" \\ \uXXXX), markdown-escaped (a backslash before each
// markdown punctuation character) and HTML-escaped (&amp; &lt; &gt; &quot; &#39;).
// Output: exactly `leak 0` or `leak <n>`, n = the number of separate leaked regions of the file (overlapping matches merge:
// one inserted cue = 1 even if a shorter cue sits inside it). Never a cue, a position or a line.
// Exit: 0 = leak 0, 1 = leak n >= 1, 2 = refusal. A refusal prints `usage` or `refused <class> (<file>:<line>)` and nothing else:
// never an error message of a parser (those can quote the source line).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CUE_REPORT_DIR = path.join(HERE, 'cue-report');
const RUN = 24;
const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

export class Refusal extends Error { constructor(klass) { super(klass); this.klass = klass; } }
// `<file>:<line>` of the first stack frame inside a .mjs of ours (never the error's message).
export function where(e) {
    for (const l of String(e?.stack ?? '').split('\n')) { const m = l.match(/([^\\/()\s]+\.mjs):(\d+):\d+\)?\s*$/); if (m) return `${m[1]}:${m[2]}`; }
    return 'unknown:0';
}
export const describe = (e) => (e instanceof Refusal ? `refused ${e.klass} (${where(e)})` : `crash ${e?.name ?? 'Error'} (${where(e)})`);

export function exportStrings(exportText) {
    let j;
    try { j = JSON.parse(exportText); } catch { throw new Refusal('export-unparsable'); }
    if (j?.schema !== 'cues-export-eq/1' || !Array.isArray(j.entries)) throw new Refusal('not-a-cues-export');
    const out = [];
    for (const e of j.entries) {
        if (e.cues === null || e.cues === undefined) continue;
        if (!Array.isArray(e.cues) || e.cues.some((c) => typeof c !== 'string')) throw new Refusal('export-cues-not-strings');
        out.push(...e.cues);
    }
    return { strings: out, runDir: typeof j.runDir === 'string' ? j.runDir : null };
}

const walkStrings = (v, out) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => walkStrings(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkStrings(x, out)); };
export function logStrings(logText) {
    const out = [];
    for (const l of logText.split(/\r?\n/)) {
        const i = l.indexOf('[Answer] cues:'), k = l.indexOf('[Answer] cues trimmed:');
        const at = k >= 0 ? k + '[Answer] cues trimmed:'.length : i >= 0 ? i + '[Answer] cues:'.length : -1;
        if (at < 0) continue;
        try { walkStrings(JSON.parse(l.slice(at).trim()), out); } catch { /* an unparsable line: its literals below */ for (const s of literals(l.slice(at))) out.push(s); }
    }
    return out;
}
// string literals not followed by a colon (object keys), from a text line
function literals(text) {
    const out = [];
    for (const m of text.matchAll(/"((?:[^"\\]|\\.)*)"(\s*:)?/g)) { if (m[2]) continue; try { out.push(JSON.parse(`"${m[1]}"`)); } catch { /* not a JSON string */ } }
    return out;
}
const CARRIER = /^ {2}(\d\d:\d\d:\d\dZ |(malformed|unparsable|e\.g\.|trimmed|block-only answer): )/;
export function fullOutputStrings(text) {
    const out = [];
    for (const l of text.split(/\r?\n/)) if (CARRIER.test(l)) out.push(...literals(l));
    return out;
}

const mdEsc = (s) => s.replace(/([\\`*_{}\[\]()#+\-.!|<>~"'])/g, '\\$1');
const htmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const jsonEsc = (s) => JSON.stringify(s).slice(1, -1).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
export function forms(s) { return [...new Set([s, jsonEsc(s), mdEsc(s), htmlEsc(s)].map(norm).filter(Boolean))]; }

// the known-string set from disk: the export, its run's log, and the full outputs in E\cue-report\
export function loadKnown(exportPath) {
    const { strings, runDir } = exportStrings(fs.readFileSync(exportPath, 'utf8'));
    const all = [...strings];
    if (runDir) {
        const log = path.join(runDir, 'natively_debug.log');
        if (!fs.existsSync(log)) throw new Refusal('run-log-missing');
        all.push(...logStrings(fs.readFileSync(log, 'utf8')));
    }
    if (fs.existsSync(CUE_REPORT_DIR))
        for (const f of fs.readdirSync(CUE_REPORT_DIR)) if (f.endsWith('.full.txt')) all.push(...fullOutputStrings(fs.readFileSync(path.join(CUE_REPORT_DIR, f), 'utf8')));
    return all;
}

export function leakCount(known, text) {
    const hay = norm(text);
    const spans = [];                                              // every matched region of the checked text: [start, end)
    const seen = new Set();
    for (const raw of known) for (const c of forms(raw)) {
        if (seen.has(c)) continue;
        seen.add(c);
        if (c.length >= RUN) {
            for (let i = 0; i + RUN <= c.length; i++) {
                const w = c.slice(i, i + RUN);
                for (let at = hay.indexOf(w); at >= 0; at = hay.indexOf(w, at + 1)) spans.push([at, at + RUN]);
            }
        } else {
            for (let at = hay.indexOf(c); at >= 0; at = hay.indexOf(c, at + 1)) spans.push([at, at + c.length]);
        }
    }
    // n = separate leaked regions: overlapping matches merge, so one inserted cue is ONE leak even when a shorter cue sits inside
    // it; the same cue inserted at two places is two.
    spans.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    let n = 0, end = -1;
    for (const [s0, e0] of spans) { if (s0 >= end) n++; end = Math.max(end, e0); }
    return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [exp, sum] = process.argv.slice(2);
    if (!exp || !sum || process.argv.length !== 4) { console.log('usage'); process.exit(2); }
    let n;
    try {
        let text;
        try { text = fs.readFileSync(sum, 'utf8'); } catch { throw new Refusal('summary-unreadable'); }
        let known;
        try { known = loadKnown(exp); } catch (e) { if (e instanceof Refusal) throw e; throw new Refusal('export-unreadable'); }
        n = leakCount(known, text);
    } catch (e) { console.log(describe(e)); process.exit(2); }
    console.log(`leak ${n}`);
    process.exit(n ? 1 : 0);
}
