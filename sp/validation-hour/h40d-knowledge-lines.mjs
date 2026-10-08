#!/usr/bin/env node
// h40d-knowledge-lines.mjs <run-dir> | --log <debug log> [--threshold 0.95]
//
// Rule 1(g) of PREREGISTER-h40d.md (revision 3, re-check N1), read AFTER the hour from the app's own debug log:
//   VOID when the last `[KnowledgeOrchestrator] Knowledge mode ENABLED` / `DISABLED` line before the run window is not
//   ENABLED, or a DISABLED line falls inside the run window, or fewer than 95% of the dispatch windows (the whole log,
//   readiness probe included — the re-check's own counting: h40c 47 of 47, br1 42 of 42) carry an
//   `[KnowledgeOrchestrator] Intent classified` line.
// The run window is the timeline's byte slice of the debug log (interview60.timeline.json startDebug..endDebug, as
// h40d-clocks.mjs reads it); with --log <file> (a fixture) the whole file is the run window. A dispatch window is a
// `[Main] dispatch: answer` or `dispatch: supersede` line to the next such line. Prints counts, indices and
// timestamps only — never a question, never an answer.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const THRESHOLD = Number(opt('--threshold', '0.95'));
const logFile = opt('--log', null);
const dir = logFile ? null : argv[0];
if (!logFile && !dir) { console.log('usage: h40d-knowledge-lines.mjs <run-dir> | --log <debug log> [--threshold 0.95]'); process.exit(2); }

const file = logFile ?? path.join(dir, 'natively_debug.log');
const buf = fs.readFileSync(file);
const text = buf.toString('utf8');
let startB = 0, endB = buf.length, windowSource = 'the whole file';
if (!logFile) {
    const tl = path.join(dir, 'interview60.timeline.json');
    if (fs.existsSync(tl)) {
        const timeline = JSON.parse(fs.readFileSync(tl, 'utf8'));
        startB = timeline.startDebug ?? 0; endB = Math.min(timeline.endDebug ?? buf.length, buf.length);
        windowSource = `interview60.timeline.json bytes ${startB}..${endB}`;
    } else windowSource = 'the whole log (no timeline file)';
}
// String index -> byte offset, for the few lines that matter (UTF-8: the log carries non-ASCII characters).
const byteAt = (idx) => Buffer.byteLength(text.slice(0, idx), 'utf8');
const stamp = (line) => (line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/) || [])[1] ?? '-';
const lines = [];
{ let pos = 0; for (const l of text.split('\n')) { lines.push({ l, idx: pos }); pos += l.length + 1; } }
const place = (idx) => { const b = byteAt(idx); return b < startB ? 'before' : b >= endB ? 'after' : 'inside'; };

const enabled = lines.filter((x) => x.l.includes('[KnowledgeOrchestrator] Knowledge mode ENABLED')).map((x) => ({ ...x, kind: 'ENABLED' }));
const disabled = lines.filter((x) => x.l.includes('[KnowledgeOrchestrator] Knowledge mode DISABLED')).map((x) => ({ ...x, kind: 'DISABLED' }));
const restored = lines.filter((x) => x.l.includes('[AppState] Knowledge mode restored from settings'));
const toggles = [...enabled, ...disabled].sort((a, b) => a.idx - b.idx).map((x) => ({ ...x, where: place(x.idx), at: stamp(x.l) }));
const count = (arr, where) => arr.filter((x) => x.where === where).length;
console.log(`run: ${logFile ? path.basename(logFile) : path.basename(dir)}  (run window: ${windowSource})`);
console.log(`knowledge-mode lines: restored-from-settings ${restored.length}; ENABLED before/inside/after the run window ${count(toggles.filter((t) => t.kind === 'ENABLED'), 'before')}/${count(toggles.filter((t) => t.kind === 'ENABLED'), 'inside')}/${count(toggles.filter((t) => t.kind === 'ENABLED'), 'after')}; DISABLED ${count(toggles.filter((t) => t.kind === 'DISABLED'), 'before')}/${count(toggles.filter((t) => t.kind === 'DISABLED'), 'inside')}/${count(toggles.filter((t) => t.kind === 'DISABLED'), 'after')}`);
for (const t of toggles) console.log(`  ${t.kind.padEnd(8)} ${t.at}  ${t.where} the run window`);
const before = toggles.filter((t) => t.where === 'before');
const lastBefore = before.length ? before[before.length - 1].kind : 'none';
// With no timeline the whole file is the window: the startup toggle is then "inside", so the last toggle before the
// first dispatch line stands in for "before the run window".
const dispatchIdx = lines.map((x, i) => ({ x, i })).filter(({ x }) => /\[Main\] dispatch: (answer|supersede)/.test(x.l));
const firstDispatchIdx = dispatchIdx.length ? dispatchIdx[0].x.idx : Infinity;
const lastBeforeFirstDispatch = (() => { const b = toggles.filter((t) => t.idx < firstDispatchIdx); return b.length ? b[b.length - 1].kind : 'none'; })();
const lastKind = windowSource === 'the whole file' || windowSource.startsWith('the whole log') ? lastBeforeFirstDispatch : lastBefore;
const disabledInside = toggles.filter((t) => t.kind === 'DISABLED' && (windowSource === 'the whole file' || windowSource.startsWith('the whole log') ? t.idx >= firstDispatchIdx : t.where === 'inside')).length;

const windows = [];
dispatchIdx.forEach(({ x, i }, k) => {
    const endLine = k + 1 < dispatchIdx.length ? dispatchIdx[k + 1].i : lines.length;
    const slice = lines.slice(i, endLine).map((y) => y.l);
    const kind = (x.l.match(/dispatch: (answer|supersede)/) || [])[1];
    const intent = slice.filter((l) => l.includes('[KnowledgeOrchestrator] Intent classified')).length;
    windows.push({ n: k + 1, kind, at: stamp(x.l), intent, where: place(x.idx) });
});
const withLine = windows.filter((w) => w.intent > 0).length;
const share = windows.length ? withLine / windows.length : 0;
console.log(`dispatch windows (whole log): ${windows.length} (${windows.filter((w) => w.where === 'before').length} before the run window, ${windows.filter((w) => w.where === 'inside').length} inside, ${windows.filter((w) => w.where === 'after').length} after); with an Intent classified line ${withLine} (${(share * 100).toFixed(1)}%)`);
for (const w of windows.filter((w) => w.intent === 0)) console.log(`  window #${w.n} ${w.kind} dispatched ${w.at} (${w.where} the run window): NO Intent classified line — read its G in h40d-clocks.mjs --list`);
const reasons = [];
if (lastKind !== 'ENABLED') reasons.push(`the last ENABLED/DISABLED line before the run window is ${lastKind}`);
if (disabledInside) reasons.push(`${disabledInside} DISABLED line(s) inside the run window`);
if (!windows.length) reasons.push('no dispatch window');
else if (share < THRESHOLD) reasons.push(`Intent classified on ${withLine} of ${windows.length} windows (${(share * 100).toFixed(1)}% < ${THRESHOLD * 100}%)`);
console.log(`rule 1(g) reading: ${reasons.length ? `VOID (${reasons.join('; ')})` : `OK (last toggle before the run window ENABLED, no DISABLED inside, Intent classified on ${withLine} of ${windows.length} windows)`}`);
process.exit(reasons.length ? 1 : 0);
