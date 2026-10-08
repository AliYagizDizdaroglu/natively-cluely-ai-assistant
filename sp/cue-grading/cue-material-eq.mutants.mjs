// mutation proof for cue-material-eq.cal.mjs: each mutant of the consumer must make the F4 calibration fail (exit 1).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const C = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(C, 'cue-material-eq.mjs'), 'utf8');
const MUT = [
  ['X1 criterion 2 removed (probe turn may start inside the window)', 'if (!(tn.t < s)) refuse(', 'if (false) refuse('],
  ['X2 criterion 4 removed (N not compared to N_first)', 'if (!(tn.num < nFirst)) refuse(', 'if (false) refuse('],
  ['X3 criterion 5 removed (pairs before startedAt ignored)', 'if (dts.some((d) => Date.parse(d) < s)) refuse(', 'if (false) refuse('],
  ['X4 criterion 3 removed (a named line may also be addressed)', 'if (addressed.has(n)) refuse(`line ${n} is named and also addressed by an entry`);', ''],
  ['X5 a line named both superseded and probe is accepted', 'if (comp.probe.includes(n)) refuse(', 'if (false) refuse('],
  ['X6 a probe line named twice is accepted', "dup(comp.superseded, 'superseded'); dup(comp.probe, 'probe');", "dup(comp.superseded, 'superseded');"],
  ['X7 M3: a probe naming a non-cues line is accepted', 'for (const n of comp.probe) if (!cueAt.has(n)) refuse(', 'for (const n of comp.probe) if (false) refuse('],
  ['X8 the exempt-full count is not checked', 'if (comp.exempt !== comp.probe.length) refuse(', 'if (false) refuse('],
  ['X9 A3.2 turn-start-before-window check removed', 'if (!(tn.t >= s)) refuse(', 'if (false) refuse('],
  ['X10 A3.2 "no turn line before n" check removed', 'if (tn === null) refuse(`superseded ${n}: the log carries', 'if (false) refuse(`superseded ${n}: the log carries'],
  ['X11 A4.1 gate removed: A3.2 applies to logs with 0 turn lines', 'if (turns.length > 0) {\n            const tn = turnAt(n);', 'if (true) {\n            const tn = turnAt(n);'],
  ['X12 A4.1 gate on N_first removed: derived even with no probe line (h40d must still pass)', 'if (comp.probe.length) {\n        const dts', 'if (true) {\n        const dts'],
  ['X13 U3 removed', 'if (!later) refuse(', 'if (false) refuse('],
  ['X14 N_first read from the wrong place (first turn line of the log)', 'const first = Number.isFinite(earliest) ? turns.find((t) => t.t >= earliest) : null;', 'const first = turns[0] ?? null;'],
  ['X15 REG: a BOM is accepted', "if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) refuse(", 'if (false) refuse('],
  ['X16 REG: a non-UTF-8 file is decoded leniently', "new TextDecoder('utf-8', { fatal: true })", "new TextDecoder('utf-8', { fatal: false })"],
  ['X17 REG: the file hash is not compared', 'if (h !== r.sha) refuse(', 'if (false) refuse('],
  ['X18 REG: the run pairs/timeline pins are not required', 'if (!r || r.role !== \'INPUT\') refuse(', 'if (false) refuse('],
  ['X19 the b10 instruments sha is not compared', 'if (m[1] !== have) refuse(', 'if (false) refuse('],
  ['X20 the ARMING sha is not compared', "if (last !== `ARMING sha256=${sha}`) refuse(", 'if (false) refuse('],
  ['X21 the LOG sha is not compared', 'if (sha256(logBytes) !== comp.log.sha) refuse(', 'if (false) refuse('],
  ['X22 the two-entry rule removed', "if (arr.length > 1 && arr.some((x) => x.dispatchedAt === null || !pairByIso.has(x.dispatchedAt))) refuse(", "if (false) refuse("],
  ['X23 twin cues are not compared to the record', "if (JSON.stringify(Array.isArray(r.cues) ? r.cues : []) !== JSON.stringify(en.cues)) refuse(", 'if (false) refuse('],
  ['X24 the forbidden-field check removed', "for (const k of Object.keys(en ?? {})) if (FORBIDDEN.includes(k)) refuse(", 'for (const k of []) if (false) refuse('],
  ['X25 the cueBlocks equality ignores probe lines', 'nonEmptyEntries + supNE + probeNE) refuse(', 'nonEmptyEntries + supNE) refuse('],
  ['X26 an entry\'s cues are not compared to its log line', 'if (JSON.stringify(c.arr) !== JSON.stringify(x.cues)) refuse(', 'if (false) refuse('],
  ['X27 coverage: an unaddressed unnamed in-window line is accepted', 'if (k !== 1) refuse(', 'if (k > 1) refuse('],
  ['X28 the judge model is not checked', 'if (j.graderModel !== GRADER_MODEL) refuse(', 'if (false) refuse('],
  ['X29 twin blocks skip trimCues', 'const cuesT = trim(en.cues);', 'const cuesT = en.cues;'],
  ['X30 an existing manifest slot may be overwritten', 'if (manifest.slots[`blind-${N}.${g}`]) refuse(', 'if (false) refuse('],
  ['X31 the twin pairs question disagreement is not checked', 'if (qOf.has(it.id) && qOf.get(it.id) !== it.question) refuse(', 'if (false) refuse('],
  ['X32 more than 2 missing in-app ids is not FLT VOID', 'if (excl.inapp.size > 2) fltVoid = true;', ''],
  ['X33 the superseded in-window cues line requirement removed', 'for (const n of comp.superseded) if (!cueAt.has(n)) refuse(', 'for (const n of comp.superseded) if (false) refuse('],
];
let flipped = 0;

for (const [name, from, to] of MUT) {
  if (!src.includes(from)) { console.log(`MUTANT ${name}: PATTERN NOT FOUND (mutant invalid)`); continue; }
  const p = path.join(C, 'cue-material-eq.mut-tmp.mjs'); fs.writeFileSync(p, src.replace(from, () => to));
  const r = spawnSync(process.execPath, [path.join(C, 'cue-material-eq.cal.mjs')], { encoding: 'utf8', env: { ...process.env, CME_TOOL: p } });
  const m = (r.stdout || '').match(/F4 CALIBRATION: (\d+) PASS, (\d+) FAIL/);
  const ok = r.status !== 0; if (ok) flipped++;
  console.log(`MUTANT ${name}: cal exit ${r.status}, ${m ? m[2] : '?'} FAIL lines -> ${ok ? 'FLIPPED' : 'NOT CAUGHT'}`);
}
console.log(`consumer mutants: ${flipped} of ${MUT.length} flipped the calibration`);
fs.rmSync(path.join(C, 'cue-material-eq.mut-tmp.mjs'), { force: true });
