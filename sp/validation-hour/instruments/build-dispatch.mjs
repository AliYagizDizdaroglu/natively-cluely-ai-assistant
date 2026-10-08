// build-dispatch.mjs: writes VH\h40d-grader-dispatch.txt (r4 section 7.4) from SP\h40c-grader-dispatch.txt, the template
// h40d-grader-dispatch-src.txt and the text of r4 itself, so "verbatim" is true by construction:
//   - the dispatch text proper (from the "----- dispatch text" line to the end) is h40c's, byte for byte;
//   - the counting rulings (r4 section 4) and the GRADER DRIFT bullet (r4 section 6) are cut out of r4 by their anchors;
//   - the ten tags and their files are generated from one list.
// Then it reads the output back and checks it, and writes the diff against h40c's file with git diff --no-index
// (a read-only diff; --output keeps the UTF-8 bytes out of the console code page). Prints counts and file names only.
//   node build-dispatch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..');
const SP = path.resolve(VH, '..');
const H40C = path.join(SP, 'h40c-grader-dispatch.txt');
const R4 = path.join(VH, 'PREREGISTER-h40d.r4.md');
const SRC = path.join(HERE, 'h40d-grader-dispatch-src.txt');
const OUT = path.join(VH, 'h40d-grader-dispatch.txt');
const DIFF = path.join(HERE, 'h40d-grader-dispatch.diff.txt');
const MARK = '----- dispatch text (substitute RUN, VERDICTS and TAG) -----';
const die = (m) => { console.log(`BUILD FAILED: ${m}`); process.exit(1); };

// the ten graded arms: tag, pairs file name in RUN, verdicts file name in VH
const ARMS = [['inapp', 'interview60.judge.pairs.json']];
for (const rep of ['', '-r2', '-r3']) ARMS.push([`captured-high${rep}`, `interview60.judge.pairs.gemini-3.5-flash-lite_captured-high${rep}.json`]);
for (const rep of ['', '-r2', '-r3']) ARMS.push([`captured-no-cues-high${rep}`, `interview60.judge.pairs.gemini-3.5-flash-lite_captured-no-cues-high${rep}.json`]);
for (const rep of ['', '-r2', '-r3']) ARMS.push([`captured-low${rep}`, `interview60.judge.pairs.gemini-3.1-flash-lite_captured-low${rep}.json`]);
if (ARMS.length !== 10) die(`${ARMS.length} arms, expected 10`);
const table = ARMS.map(([tag, pairs]) => `  ${tag.padEnd(26)} PAIRS ${pairs.padEnd(76)} VERDICTS h40d-verdicts-${tag}.json`).join('\n');

const h40c = fs.readFileSync(H40C, 'utf8');
if (h40c.split(MARK).length !== 2) die('the dispatch-text marker is not in h40c\'s file exactly once');
const tail = h40c.slice(h40c.indexOf(MARK));

const r4 = fs.readFileSync(R4, 'utf8').replace(/\r\n/g, '\n').split('\n');
const trim = (a) => { let s = 0, e = a.length; while (s < e && a[s].trim() === '') s++; while (e > s && a[e - 1].trim() === '') e--; return a.slice(s, e); };
const only = (re, what) => { const idx = r4.map((l, i) => (re.test(l) ? i : -1)).filter((i) => i >= 0); if (idx.length !== 1) die(`${what}: ${idx.length} anchor matches in r4, expected 1`); return idx[0]; };
const nextAfter = (from, re, what) => { const j = r4.findIndex((l, i) => i > from && re.test(l)); if (j < 0) die(`${what}: no end anchor in r4`); return j; };
const c0 = only(/^### Counting rulings, before any verdict$/, 'counting rulings heading');
const counting = trim(r4.slice(c0 + 1, nextAfter(c0, /^## /, 'counting rulings end')));
const d0 = only(/^- \*\*Grader\.\*\* Pinned to /, 'the Grader bullet');
const drift = trim(r4.slice(d0, nextAfter(d0, /^- \*\*The day\.\*\*/, 'the Grader bullet end')));
if (counting.filter((l) => l.startsWith('- ')).length !== 6) die(`the counting rulings hold ${counting.filter((l) => l.startsWith('- ')).length} bullets, expected 6`);
if (!counting.some((l) => l.includes('nothing is re-graded by hand'))) die('the counting rulings no longer end with the no-regrade ruling: r4 changed, re-read it');
if (!drift.join('\n').includes('GRADER DRIFT') || !drift.join('\n').includes('PASS\n  (grader re-pinned to <id>)')) die('the Grader bullet is not the text this builder was written against: r4 changed, re-read it');

const now = new Date(Date.now() + 3 * 3600e3).toISOString().slice(11, 16);
let text = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
if (!text.endsWith('{{H40C_TAIL}}\n')) die('the template must end with the {{H40C_TAIL}} line');
text = text.slice(0, -1);
const macros = { WRITTEN: `${now} local`, SP, TABLE: table, R4_DRIFT: drift.join('\n'), R4_COUNTING: counting.join('\n'), H40C_TAIL: tail };
text = text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => { if (!(k in macros)) die(`unknown macro ${m}`); return macros[k]; });
if (/\{\{|\}\}/.test(text)) die('a macro is left unexpanded');
fs.writeFileSync(OUT, text, 'utf8');

// ---- read back ----
const buf = fs.readFileSync(OUT);
const out = buf.toString('utf8');
const problems = [];
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) problems.push('a BOM');
if (buf.includes(0x0d)) problems.push('a CR byte');
if (!out.endsWith(tail)) problems.push('the dispatch text proper is not h40c\'s tail byte for byte');
if (Buffer.compare(Buffer.from(tail, 'utf8'), buf.subarray(buf.length - Buffer.byteLength(tail, 'utf8'))) !== 0) problems.push('the last bytes differ from h40c\'s tail');
if (!out.includes(counting.join('\n'))) problems.push('the counting rulings are not r4\'s verbatim');
if (!out.includes(drift.join('\n'))) problems.push('the GRADER DRIFT bullet is not r4\'s verbatim');
for (const row of table.split('\n')) if (!out.includes(row)) problems.push(`the table row for ${row.trim().split(' ')[0]} is missing`);
const nonAscii = new Map();
for (const ch of out) if (ch.codePointAt(0) > 126) nonAscii.set(ch, (nonAscii.get(ch) ?? 0) + 1);
console.log(`wrote ${OUT}: ${buf.length} bytes, ${out.split('\n').length - 1} lines, LF only, BOM none`);
console.log(`tail equal to h40c's: ${out.endsWith(tail) ? 'YES' : 'NO'} (${Buffer.byteLength(tail, 'utf8')} bytes); r4 counting rulings verbatim: ${out.includes(counting.join('\n')) ? 'YES' : 'NO'} (${counting.length} lines, 6 bullets); r4 GRADER DRIFT bullet verbatim: ${out.includes(drift.join('\n')) ? 'YES' : 'NO'} (${drift.length} lines)`);
console.log(`tags: ${ARMS.length} (${ARMS.map((a) => a[0]).join(', ')})`);
console.log(`non-ASCII characters (UTF-8): ${[...nonAscii].map(([c, n]) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} x${n}`).join(', ') || 'none'}`);

// ---- the diff against h40c's file ----
try {
    execFileSync('git', ['diff', '--no-index', '--no-color', '--no-ext-diff', `--output=${DIFF}`, H40C, OUT], { stdio: 'ignore' });
} catch (e) { if (e.status !== 1) die(`git diff --no-index failed with status ${e.status}`); } // status 1 = the files differ
const d = fs.readFileSync(DIFF, 'utf8').split('\n');
const added = d.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
const removed = d.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;
console.log(`diff against h40c's file: ${removed} line(s) removed, ${added} line(s) added (full diff: ${DIFF})`);
const afterMark = d.findIndex((l) => l.includes(MARK));
const inTail = d.filter((l, i) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---') && afterMark >= 0 && i > afterMark);
console.log(`diff lines inside the dispatch text proper (after its marker): ${inTail.length}`);
if (inTail.length) problems.push('the diff touches the dispatch text proper');
if (problems.length) { console.log('BUILD CHECKS FAILED:'); problems.forEach((p) => console.log(`  - ${p}`)); process.exit(1); }
console.log('BUILD CHECKS PASSED');
