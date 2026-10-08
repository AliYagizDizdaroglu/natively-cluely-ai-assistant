// Calibration of cue-leak-check.mjs + cue-report.mjs (A4.3a / A5.1 / A6.1 m5; fix round 2026-10-06, cue-report-review.md).
// Prints counts only: no cue, no summary text. Every printed line is built from numbers and fixed words; the whole output is
// leak-scanned at the end against the same known set (the last line).
//   node cue-leak-check.cal.mjs        reads E\b10cal-out\h40d (the h40d export) and the h40d run folder; writes only inside E
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exportStrings, loadKnown, leakCount, logStrings, fullOutputStrings, forms } from './cue-leak-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'cue-leak-check.mjs');
const WRAP = path.join(HERE, 'cue-report.mjs');
const EXPORT = path.join(HERE, 'b10cal-out', 'h40d', 'cues-export-eq.json');
const RUNNAME = '2026-10-02T11-39-41-h40d';
const exp = fs.readFileSync(EXPORT, 'utf8');
const { strings: exportCues, runDir } = exportStrings(exp);
const known = loadKnown(EXPORT);
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const exportSet = new Set(exportCues.map(norm));
const proc = (args) => { const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); return { out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim(), exit: r.status }; };
const cli = (file, exportPath = EXPORT) => proc([CLI, exportPath, file]);
const out = [];
let pass = 0, fail = 0;
const say = (s) => { out.push(s); console.log(s); };
const check = (name, ok) => { ok ? pass++ : fail++; say(`${ok ? 'ok  ' : 'FAIL'} ${name}`); };

const distinctKnown = [...new Set(known.map(norm))];
const exportOnly = [...exportSet];
const long = exportOnly.filter((c) => c.length >= 30), short = distinctKnown.filter((c) => c.length < 24);
say(`export cue strings ${exportOnly.length} distinct (>= 30 chars ${long.length}); known set (export + log + full outputs) ${distinctKnown.length} distinct, < 24 chars ${short.length}, shortest ${Math.min(...distinctKnown.map((c) => c.length))}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leakcal-'));
let k = 0;
const file = (text) => { const f = path.join(tmp, `f${k++}.txt`); fs.writeFileSync(f, text); return f; };
const BASE = 'counts only: 12 blocks, 3 trimmed ids, CLEAN';
const lc = (text, kn = known) => leakCount(kn, text);
const origOf = (norm1) => exportCues.find((c) => norm(c) === norm1);

// ---- 0. regenerate the h40d summaries through the wrapper (also exercises I1/B1 acceptance path)
const r0 = proc([WRAP, 'all', runDir, '--export', EXPORT]);
check(`wrapper all on h40d with --export: exit 0 (got ${r0.exit}), 4 summaries leak-checked`, r0.exit === 0 && (r0.out.match(/leak 0\)/g) ?? []).length === 4);
// ---- 1. the four h40d summaries through the CLI (the registered form)
for (const t of ['smoke', 'facts', 'twins', 'thoughts']) {
    const f = path.join(HERE, 'cue-report', `${RUNNAME}.${t}.summary.txt`);
    const r = fs.existsSync(f) ? cli(f) : { out: 'missing', exit: -1 };
    check(`h40d summary ${t} -> "leak 0", exit 0 (got "${r.out}", exit ${r.exit})`, r.out === 'leak 0' && r.exit === 0);
}
const base = ['smoke', 'facts', 'twins', 'thoughts'].map((t) => fs.readFileSync(path.join(HERE, 'cue-report', `${RUNNAME}.${t}.summary.txt`), 'utf8')).join('\n');

// ---- 2. the registered mutants (in-process over every cue; CLI on a sample)
const all = (name, fn, n = long.length) => { const hit = long.filter(fn).length; check(`${name}: ${hit} of ${n}`, hit === n); };
all('mutant: one whole cue (>= 30 chars) inserted -> leak 1', (c) => lc(`${base}\n${origOf(c)}`) === 1);
all('mutant: first 30 characters of a cue -> leak 1', (c) => lc(`${base}\n${origOf(c).slice(0, 30)}`) === 1);
const runAt = (c) => { let i = 3; while (c[i] === ' ' || c[i + 23] === ' ') i++; return c.slice(i, i + 24); };
all('mutant: a 24-character run from inside a cue -> leak 1', (c) => lc(`${base}\n${runAt(c)}`) === 1);
all('mutant: upper case + broken whitespace -> leak 1', (c) => lc(`${base}\n${origOf(c).toUpperCase().replace(/ /g, '  \n ')}`) === 1);
const sample = long[0];
const rs = cli(file(`${base}\n${origOf(sample)}\n`));
check(`CLI, one cue inserted into the h40d summaries -> "leak 1", exit 1 (got "${rs.out}", exit ${rs.exit})`, rs.out === 'leak 1' && rs.exit === 1);
const r2 = cli(file(`${base}\n${origOf(long[0])}\n${origOf(long[1])}\n`));
check(`CLI, two different cues -> "leak 2" (got "${r2.out}")`, r2.out === 'leak 2');
check(`two regions: the same cue at two places -> leak 2 (got ${lc(`${base}\n${origOf(long[0])}\n${base}\n${origOf(long[0])}`)})`, lc(`${base}\n${origOf(long[0])}\n${base}\n${origOf(long[0])}`) === 2);

// ---- 3. I3: short cues, A6 m5 literally: whole substring, no word boundary
const ofShort = (c) => c;
const wholeShort = short.filter((c) => lc(`${BASE} ${ofShort(c)} ${BASE}`) >= 1).length;
check(`short cue (< 24 chars) inserted whole -> leak >= 1: ${wholeShort} of ${short.length}`, wholeShort === short.length);
const plural = short.filter((c) => lc(`${BASE} ${c}s ${BASE}`) === 1).length;
check(`short cue with an "s" appended (substring, no word boundary) -> leak 1: ${plural} of ${short.length}`, plural === short.length);
const inside = short.filter((c) => lc(`x${c}x`) === 1).length;
check(`short cue inside a longer letter run "x<cue>x" -> leak 1: ${inside} of ${short.length}`, inside === short.length);
const noShortRaw = short.filter((c) => c.length > 2 && lc(`${BASE} ${c.slice(0, c.length - 2)} ${BASE}`) === 0).length;
console.log(`info: short cues minus their last 2 chars read leak 0 for ${noShortRaw} of ${short.length} (registered rule: whole only; named in Uncovered)`);

// ---- 4. I2: cue and trim strings that are in the run's log / full outputs but NOT in the export
const logOnly = [...new Set(logStrings(fs.readFileSync(path.join(runDir, 'natively_debug.log'), 'utf8')).map(norm))].filter((s) => s && !exportSet.has(s));
const missBefore = logOnly.filter((s) => lc(`${BASE} ${s}`, exportCues) === 0).length;
const caught = logOnly.filter((s) => lc(`${BASE} ${s}`) >= 1).length;
check(`h40d strings in the log but not in the export: ${logOnly.length} found; with the export-only set ${missBefore} of them read leak 0 (the blind spot); with the widened set ${caught} of ${logOnly.length} read leak >= 1`, logOnly.length >= 11 && caught === logOnly.length && missBefore >= 1);
const fullSrc = fs.existsSync(path.join(HERE, 'cue-report', `${RUNNAME}.facts.full.txt`)) ? fullOutputStrings(fs.readFileSync(path.join(HERE, 'cue-report', `${RUNNAME}.facts.full.txt`), 'utf8')).map(norm) : [];
const fullUnknownToExport = [...new Set(fullSrc)].filter((s) => s && !exportSet.has(s));
check(`facts full output: ${fullSrc.length} strings harvested, ${fullUnknownToExport.length} distinct not in the export, all caught by the widened set: ${fullUnknownToExport.filter((s) => lc(`${BASE} ${s}`) >= 1).length === fullUnknownToExport.length}`, fullSrc.length > 100 && fullUnknownToExport.filter((s) => lc(`${BASE} ${s}`) >= 1).length === fullUnknownToExport.length);
const synth = fullOutputStrings('  12:00:00Z  R01     2 line(s), words 3/4:  ["alpha beta gamma delta epsilon zeta","xy zz"]\n  12:00:01Z  R02     [cut 1]  {"rawLines":1,"cut":["trimmed words here for synth"]}\nfailed answer: not harvested "q q q q"');
check(`full-output harvester on synthetic lines: 3 cue strings, keys and a failed-answer line excluded (got ${synth.length})`, synth.length === 3);

// ---- 5. m2: escaped forms of a cue with " \ and non-ASCII
const NASTY = 'He said "use the Müller-heap" in C:\\tmp\\naïve* [ok] <b>a&b</b> o\'k';
const synthExport = JSON.stringify({ schema: 'cues-export-eq/1', runDir: null, entries: [{ id: 'S1Q01', cues: [NASTY] }] });
const kn = exportStrings(synthExport).strings;
const esc = {
    raw: NASTY, 'JSON-escaped': JSON.stringify(NASTY).slice(1, -1),
    'JSON \\uXXXX': JSON.stringify(NASTY).slice(1, -1).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`),
    'markdown-escaped': NASTY.replace(/([\\`*_{}\[\]()#+\-.!|<>~"'])/g, '\\$1'),
    'HTML-escaped': NASTY.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
};
check(`synthetic cue with a quote, backslashes and non-ASCII: clean text reads leak 0 (got ${lc(BASE, kn)})`, lc(BASE, kn) === 0);
for (const [name, form] of Object.entries(esc)) check(`  ${name} form inserted -> leak 1 (got ${lc(`${BASE}\n${form}`, kn)})`, lc(`${BASE}\n${form}`, kn) === 1);
check(`  forms tried per known string: ${forms(NASTY).length} distinct`, forms(NASTY).length >= 4);

// ---- 6. B1: a malformed export prints no cue text, only a class and file:line (wrapper and CLI), then the output is leak-scanned
const MADE = 'zebra quartz inkwell orbit lantern marble';
const madeKnown = exportStrings(JSON.stringify({ schema: 'cues-export-eq/1', runDir: null, entries: [{ cues: [MADE] }] })).strings;
const bads = {
    'truncated JSON': `{\n "schema": "cues-export-eq/1",\n "entries": [\n  {"id": "S1Q01", "cues": [\n   "${MADE}",\n   "second`,
    'wrong schema': JSON.stringify({ schema: 'x', entries: [{ cues: [MADE] }] }),
    'cues not strings': JSON.stringify({ schema: 'cues-export-eq/1', runDir: null, entries: [{ cues: [MADE, 7] }] }),
    'a log, not an export': `2026-10-02T11:00:00.000Z [LOG] [Answer] cues: ["${MADE}"\n`,
};
const SHAPE = /^refused [a-z-]+ \((cue-leak-check|cue-report)\.mjs:\d+\)$/;
for (const [name, text] of Object.entries(bads)) {
    const f = file(text);
    const w = proc([WRAP, 'facts', runDir, '--export', f]);
    const c = cli(file(BASE), f);
    const seen = `${w.out}\n${w.err}\n${c.out}\n${c.err}`;
    check(`malformed export (${name}): wrapper exit ${w.exit} and CLI exit ${c.exit} (want 2/2), one refusal line each, no stderr; output leak-scanned: leak ${lc(seen, madeKnown)}`,
        w.exit === 2 && c.exit === 2 && SHAPE.test(w.out) && SHAPE.test(c.out) && w.err === '' && c.err === '' && lc(seen, madeKnown) === 0);
}
const noFile = proc([WRAP, 'facts', runDir, '--export', path.join(tmp, 'nope.json')]);
check(`missing export file: exit 2, refusal shape (got exit ${noFile.exit})`, noFile.exit === 2 && SHAPE.test(noFile.out) && noFile.err === '');

// ---- 7. I1: --export is required
const noExp = proc([WRAP, 'facts', runDir]);
check(`wrapper without --export: exit 2, usage only (got exit ${noExp.exit}), no summary printed`, noExp.exit === 2 && /^usage:/.test(noExp.out) && !/block ids/.test(noExp.out));

// ---- 8. I4: a failing instrument is named, no summary, wrapper exits 3. twins: an unknown option (the instrument refuses, exit 2);
//      thoughts: a malformed answers file (the instrument throws: a crash signature, exit 1); a folder with no files is a READING (twins exit 3 INCOMPLETE), not a failure
const badDir = path.join(tmp, '2026-01-01T00-00-00-calbad'); fs.mkdirSync(badDir);
fs.writeFileSync(path.join(badDir, 'interview60.answers.gemini-3.5-flash-lite_captured-high.json'), '{bad');
const cases = [['twins', ['--', '--bogus']], ['thoughts', []]];
for (const [t, ex] of cases) {
    const r = proc([WRAP, t, badDir, '--export', EXPORT, ...ex]);
    const sf = path.join(HERE, 'cue-report', `2026-01-01T00-00-00-calbad.${t}.summary.txt`);
    const one = r.out.split(/\r?\n/).filter((l) => l.startsWith(`${t} on 2026-01-01T00-00-00-calbad: INSTRUMENT FAILED`)).length;
    check(`failing instrument ${t}: summary says INSTRUMENT FAILED (${one} line), wrapper exit ${r.exit} (want 3), the summary file holds only that line`, one === 1 && r.exit === 3 && fs.readFileSync(sf, 'utf8').trim().split(/\r?\n/).length === 1 && r.err === '');
}
check(`the thoughts failure carries the crash signature: ${/crash signature/.test(proc([WRAP, 'thoughts', badDir, '--export', EXPORT]).out)}`, /crash signature/.test(proc([WRAP, 'thoughts', badDir, '--export', EXPORT]).out));
for (const f of fs.readdirSync(path.join(HERE, 'cue-report'))) if (f.startsWith('2026-01-01T00-00-00-calbad.')) fs.rmSync(path.join(HERE, 'cue-report', f));
const synDir = path.join(HERE, 'b10cal-out', 'syn-clean');
const nl = proc([WRAP, 'smoke', synDir, '--export', EXPORT]);
check(`smoke on a folder with no log: refused, exit 2 (got ${nl.exit})`, nl.exit === 2);

// ---- 9. m4: the withhold path (a summary line made a cue of a synthetic export) -> WITHHELD, exit 5, no summary file
const wj = JSON.parse(exp);
wj.entries[0].cues = ['answers 46 (real 46, failed 0), superseded 1'];
const wf = file(JSON.stringify(wj));
const wh = proc([WRAP, 'smoke', runDir, '--export', wf]);
const sf = path.join(HERE, 'cue-report', `${RUNNAME}.smoke.summary.txt`);
check(`withhold path: stdout "WITHHELD leak 1", exit 5 (got exit ${wh.exit}), no summary file left: ${!fs.existsSync(sf)}`, /WITHHELD leak 1;/.test(wh.out) && wh.exit === 5 && !fs.existsSync(sf));
// ---- 10. m5: all + extra args refused
const ax = proc([WRAP, 'all', runDir, '--export', EXPORT, '--', '--strict']);
check(`all with extra tool args: refused, exit 2 (got ${ax.exit})`, ax.exit === 2 && /^REFUSED/.test(ax.out));
// extra args reach a single tool
const st = proc([WRAP, 'twins', runDir, '--export', EXPORT, '--', '--strict']);
check(`twins with --strict after "--": ran, exit ${st.exit} (0 or 1 a reading), summary mentions STRICT: ${/STRICT/.test(st.out)}`, [0, 1].includes(st.exit) && /STRICT/.test(st.out));

// restore the h40d summaries the withhold case deleted
const rr = proc([WRAP, 'all', runDir, '--export', EXPORT]);
check(`h40d summaries regenerated: wrapper exit ${rr.exit}`, rr.exit === 0);
fs.rmSync(tmp, { recursive: true, force: true });

// ---- last: the calibration's own output is leak-scanned
const selfLeak = lc(out.join('\n'));
check(`this calibration's own output (above) leak-scanned: leak ${selfLeak}`, selfLeak === 0);
console.log(`TOTAL ${pass} ok, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
