// mutation proof for eq-flight-read.cal.mjs: each mutant of the reader must make the calibration fail (exit 1).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(E, 'eq-flight-read.mjs'), 'utf8');
const MUT = [
  ['M1 roster match tested before `short` (WHY becomes a roster window)', "const cls = words4(w.text) < 3 ? 'short' : rm.ids.length ? `roster:${rm.best}` : 'STRAY';", "const cls = rm.ids.length ? `roster:${rm.best}` : words4(w.text) < 3 ? 'short' : 'STRAY';"],
  ['M2 p90 taken as the max', 'const p90 = nearestRank(msVals, 0.9);', 'const p90 = nearestRank(msVals, 1);'],
  ['M3 a gate=error line with a suffix is not matched', '(?: ms=(\\d+))?(.*)$/;', '(?: ms=(\\d+))?$/;'],
  ['M4 captures before startedAt read as in-window', 'const capIn = capAll.filter((c) => !Number.isFinite(c.tMs) || inWin(c.tMs));', 'const capIn = capAll;'],
  ['M5 an unparseable `at` is read as OUT of the window', 'const capIn = capAll.filter((c) => !Number.isFinite(c.tMs) || inWin(c.tMs));', 'const capIn = capAll.filter((c) => inWin(c.tMs));'],
  ['M6 the screen-reference line is read after the pinned line, not before', 'const sigScreen = before.some((l) => SCREEN_RE.test(l));', 'const sigScreen = own.some((l) => SCREEN_RE.test(l));'],
  ['M7 verbal-diag route lines outside the run window count as signatures', 'const sigFast = routeIn.some(', 'const sigFast = routeLines.some('],
  ['M8 a wrong referent is read as RIGHT', 'else if (mt.ids.includes(exp)) verdict', 'else if (mt.ids.length > 0) verdict'],
  ['M9 nothing is ever `short`', 'const cls = words4(w.text) < 3 ?', 'const cls = words4(w.text) < 0 ?'],
  ['M10 1(c) floor lowered to 1', 'if (interG.length < gstarMin) flag', 'if (interG.length < 1) flag'],
  ['M11 1(f) floor raised to 5', 'if (lost.length > 2) flag', 'if (lost.length > 5) flag'],
  ['M12 `double` cause needs 3 dispatches', 'dispatchCount(id) >= 2 ? \'double\'', 'dispatchCount(id) >= 3 ? \'double\''],
  ['M13 4d names follow-ups instead of mains', "x.id && !x.id.endsWith('F'))) { const c = causeL", "x.id && x.id.endsWith('F'))) { const c = causeL"],
  ['M14 UNEXPLAINED is not VOID', "flag('VOID', '1(e)', `gate=block window at log line ${r.n} (item ${r.id ?? 'NONE'}) has no capture", "flag('NAMED', '1(e)', `gate=block window at log line ${r.n} (item ${r.id ?? 'NONE'}) has no capture"],
  ['M15 a malformed capture is never malformed (5d blind)', 'capMalformed: capHasLabel && !capSplit,', 'capMalformed: false,'],
  ['M16 1(a) startup is never VOID', "if (!okA) flag('VOID', '1(a)'", "if (false) flag('VOID', '1(a)'"],
  ['M16b 1(a) is VOID only when the flag reads on (the review\'s B1 defect)', "if (!okA) flag('VOID', '1(a)'", "if (!okA && flagOn) flag('VOID', '1(a)'"],
  ['M17 STRAY is never VOID 1(i)', "if (stray.length) flag('VOID', '1(i)'", "if (false) flag('VOID', '1(i)'"],
  ['M18 gate=error is never 5a FAIL', "for (const d of errs) { const mm", "for (const d of []) { const mm"],
  ['M19 the flag-off NOT EXERCISED line is lost (flag on without diag line passes quietly)', "flag('VOID', '1(c)', 'NOT EXERCISED: no earlier-question", "flag('NAMED', '1(c)', 'NOT EXERCISED: no earlier-question"],
  ['M21 the debug override line alone counts as fast-route (I10)', 'if (r.sig.fast) {', 'if (r.sig.fast || r.sig.overrideLine) {'],
  ['M22 G* reads the LAST cause of an id (I7)', "['inserted', 'fast-route', 'capture-unreadable'].includes(causeL[r.n])", "['inserted', 'fast-route', 'capture-unreadable'].includes(cause[idKey(r)].at(-1))"],
  ['M23 a missing prompts.json is not INCOMPLETE (I4)', "if (!prompts) flag('INCOMPLETE'", "if (!prompts) flag('NAMED'"],
  ['M24 dropped capture lines are not INCOMPLETE (I5)', "if (inp.captureDropped > 0) flag('INCOMPLETE'", "if (inp.captureDropped > 0) flag('NAMED'"],
  ['M25 a non-paired malformed LABEL capture is not read as 5d (I6)', 'if (!wf && !flagged5d.has(w.n)) {', 'if (false) {'],
  ['M26 the override flags are accepted on a real run (m7)', "process.env[CAL_ENV] !== '1'", 'false'],
  ['M27 safeErr prints the message (B2)', "return `${e?.name ?? 'Error'} at", "return `${e?.message} ${e?.name ?? 'Error'} at"],
  ['M28 INCOMPLETE does not count in the exit code (I4)', "f.kind === 'FAIL' || f.kind === 'INCOMPLETE')", "f.kind === 'FAIL')"],
  ['M29 a main with a malformed block is labelled 4e-only (I8)', "c === 'malformed' ? ': 5d + 4d", "c === 'zzz' ? ': 5d + 4d"],
  ['M20 fast-route is not in G', "const G = [...new Set([...inserted, ...fast, ", "const G = [...new Set([...inserted, "],
];
fs.mkdirSync(path.join(E, 'b5cal-mutants'), { recursive: true });
let flipped = 0;
for (const [name, from, to] of MUT) {
  if (!src.includes(from)) { console.log(`MUTANT ${name}: PATTERN NOT FOUND (mutant invalid)`); continue; }
  const p = path.join(E, 'b5cal-mutants', 'mut.mjs'); fs.writeFileSync(p, src.replace(from, to));
  const r = spawnSync(process.execPath, [path.join(E, 'eq-flight-read.cal.mjs')], { encoding: 'utf8', env: { ...process.env, B5_TOOL: p }, maxBuffer: 1 << 28 });
  const m = (r.stdout || '').match(/B5 CALIBRATION: (\d+) PASS, (\d+) FAIL/);
  const ok = r.status !== 0; if (ok) flipped++;
  console.log(`MUTANT ${name}: cal exit ${r.status}, ${m ? m[2] + ' FAIL' : 'crash'} -> ${ok ? 'FLIPPED (calibration catches it)' : 'NOT CAUGHT'}`);
}
console.log(`b5 mutants: ${flipped} of ${MUT.length} flipped the calibration`);
