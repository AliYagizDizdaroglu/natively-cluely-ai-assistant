// v5 (bundle-1 SPEC 3.2): a `cues: []` that comes right after `[Answer] cue rule: skipped` is EXPECTED (the app sent no cue
// rule for a short single-part question); any other `[]` fails as before. Counts of skipped / expected-empty are printed.
// Cue-mode smoke check, v4 "small cues" (2026-09-30; v1 checked 5 lines x 8 words, v2 counted cues = answers, v3
// allowed for superseded and failed answers; v4 adds the block-only answer, final review I1).
// In the newest run folder whose name ends with -<label>, the app's natively_debug.log must show:
// - no BLOCK-ONLY answer: a non-empty `[Answer] cues:` line directly followed by the engine's empty-answer substitute
//   ("Could you repeat that? …"). That is a model that wrote its cue block and no spoken answer under it; the app shows
//   the substitute and never shows the cue (it rides the first prose token, and there is none). The v2 wording tells
//   the model a block can be one word, so this is the failure that wording could cause: NOT CLEAN. A block followed
//   by the abort line is a superseded stream, and the `[No answer — …]` text is a transport failure: neither counts;
// - every `[Answer] cues:` line a non-empty JSON array of at most 3 non-empty strings of at most 5 words, with no
//   notation left in a cue (a backtick, or a backslash before a letter, a bracket or %; a money `$` is legitimate).
//   An absent block (`[]`) is NOT CLEAN, as the 2026-09-20 design says;
// - one cues line per delivered MODEL answer (`[Answer] full:`), plus one per superseded generation
//   (`_what_to_say stream aborted by new generation`: a superseded stream reports its block before its first prose
//   token and never logs a full line; Opus re-review N1). A FAILED answer (the engine's failure text, `[No answer — …]`
//   or the "Could you repeat that? …" substitute, not a model answer) may come with or without a block: those lines
//   are counted, printed and named in the result note, and the COUNT rule never takes them for a cue failure (the
//   block-only rule above is the one exception: a block directly before the substitute). So the cue-line count must lie
//   in [real + superseded, real + superseded + failed], and at least one real answer must exist. One shape stays NOT
//   CLEAN on purpose (Opus recheck R1): a failed answer whose stream ended with no text logs `cues: []`, and an
//   absent block fails whoever logged it; the check prints a hint, and the pre-registration makes it a re-run.
// `[Answer] cues trimmed:` lines — the app's display cap at work — are counted and printed IN FULL, never failed, and
// the hedge's `won by <model>` split is printed for the result note. Exit 0 = clean, 1 = not, 2 = no run folder.
//   node check-smoke-cues.mjs <label> [--runs <dir>]     (runs dir defaults to the cwd's interview60.runs)
import fs from 'node:fs';
import path from 'node:path';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const label = process.argv[2];
if (!label || label.startsWith('--')) { console.log('usage: check-smoke-cues.mjs <label> [--runs <dir>]'); process.exit(2); }
const runs = arg('--runs', path.join(process.cwd(), 'electron/test/golden/interview60.runs'));
const dirs = fs.existsSync(runs) ? fs.readdirSync(runs).filter((d) => d.endsWith(`-${label}`)).sort() : [];
if (!dirs.length) { console.log(`no run folder ending in -${label} under ${runs}`); process.exit(2); }
const dir = path.join(runs, dirs.at(-1));
const logPath = path.join(dir, 'natively_debug.log');
if (!fs.existsSync(logPath)) { console.log(`${dir}: no natively_debug.log`); process.exit(2); }
const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
const after = (l, tag) => l.slice(l.indexOf(tag) + tag.length).trim();
const full = lines.filter((l) => l.includes('[Answer] full:'));
const cueLines = lines.filter((l) => l.includes('[Answer] cues:'));   // '[Answer] cues trimmed:' does not contain it
const trimmed = lines.filter((l) => l.includes('[Answer] cues trimmed:'));
const aborted = lines.filter((l) => l.includes('_what_to_say stream aborted by new generation'));
const FAILURE = /^\[No answer|^Could you repeat that\? I want to make sure I address your question properly\./;
const failed = full.filter((l) => { try { return FAILURE.test(String(JSON.parse(after(l, '[Answer] full:')))); } catch { return false; } });
const real = full.length - failed.length;
const CUE_MAX_LINES = 3, CUE_MAX_WORDS = 5;
const NOTATION = /`|\\[A-Za-z([{%]/;
let bad = 0, expectedEmpty = 0;
// per answer (review fix): WhatToAnswerLLM logs `[Answer] cue block: expected-empty …` immediately before that answer's own
// `cues: []` (one synchronous callback), so the pair is adjacent and survives a supersede; "latest rule line" pairing did not.
// Entries are kept in order (not keyed by line text: two `cues: []` lines are the same string).
const cueEntries = []; let markerPending = false;
for (const l of lines) { if (l.includes('[Answer] cue block: expected-empty')) markerPending = true; else if (l.includes('[Answer] cues:')) { cueEntries.push({ l, marked: markerPending }); markerPending = false; } }
const skippedRules = lines.filter((l) => l.includes('[Answer] cue rule: skipped')).length;
for (const { l, marked } of cueEntries) {
    const json = after(l, '[Answer] cues:');
    try {
        const arr = JSON.parse(json);
        if (Array.isArray(arr) && arr.length === 0 && marked) { expectedEmpty++; continue; }
        const ok = Array.isArray(arr) && arr.length > 0 && arr.length <= CUE_MAX_LINES
            && arr.every((s) => typeof s === 'string' && s.trim() && s.trim().split(/\s+/).length <= CUE_MAX_WORDS && !NOTATION.test(s));
        if (!ok) { bad++; console.log(`  malformed: ${json}`); }
    } catch { bad++; console.log(`  unparsable: ${json}`); }
}
// v4: block-only answers, read on the sequence of cues / full / abort lines (see the header).
const REPEAT = /^Could you repeat that\? I want to make sure I address your question properly\./;
const seq = lines.filter((l) => l.includes('[Answer] cues:') || l.includes('[Answer] full:') || l.includes('_what_to_say stream aborted by new generation'));
const blockOnly = seq.filter((l, i) => {
    if (!l.includes('[Answer] cues:') || after(l, '[Answer] cues:') === '[]') return false;
    const next = seq[i + 1];
    if (!next || !next.includes('[Answer] full:')) return false;
    try { return REPEAT.test(String(JSON.parse(after(next, '[Answer] full:')))); } catch { return false; }
});
const lo = real + aborted.length, hi = lo + failed.length;
console.log(`${path.basename(dir)}: answers ${full.length} (real ${real}, failed ${failed.length}), superseded ${aborted.length}, cue lines ${cueLines.length} (expected ${lo === hi ? lo : `${lo}-${hi}`}), malformed ${bad}, block-only ${blockOnly.length}, trimmed ${trimmed.length}, cue rule skipped ${skippedRules} (expected-empty cues ${expectedEmpty})`);
for (const l of blockOnly) console.log(`  block-only answer: ${after(l, '[Answer] cues:').slice(0, 200)} with no spoken answer under it (a cue failure unless the log shows a transport error for that answer)`);
for (const l of failed) console.log(`  failed answer: ${after(l, '[Answer] full:').slice(0, 200)}`);
// Opus recheck R1: a stream that ended with no text logs `cues: []` and then the engine's failure text. That `[]`
// still fails the check (an absent block is an absent block); this only names it for the reader — a transport
// failure to re-run, not a model that skipped its block. The hint never changes the verdict.
const answerLines = lines.filter((l) => l.includes('[Answer] cues:') || l.includes('[Answer] full:'));
answerLines.forEach((l, i) => {
    if (l.includes('[Answer] cues:') && after(l, '[Answer] cues:') === '[]' && failed.includes(answerLines[i + 1]))
        console.log('  hint: an absent block directly before a failed answer = a stream that ended without text (pipeline event: re-run, not a cue failure)');
});
for (const l of trimmed) console.log(`  trimmed: ${after(l, '[Answer] cues trimmed:')}`);
const won = {};
for (const l of lines) { const m = l.match(/verbal hedge: won by (\S+) at /); if (m) won[m[1]] = (won[m[1]] ?? 0) + 1; }
console.log(`  hedge won by: ${Object.entries(won).map(([k, v]) => `${k} ${v}`).join(', ') || 'no hedge line'}`);
for (const l of cueLines.slice(0, 3)) console.log(`  e.g. ${l.slice(l.indexOf('[Answer] cues:')).slice(0, 200)}`);
const clean = real > 0 && cueLines.length >= lo && cueLines.length <= hi && bad === 0 && blockOnly.length === 0;
console.log(clean ? 'CUE SMOKE CLEAN' : 'CUE SMOKE NOT CLEAN');
process.exit(clean ? 0 : 1);
