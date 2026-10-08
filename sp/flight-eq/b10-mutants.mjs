// mutation proof for eq-cues-export.cal.mjs: each mutant of the tool must make the calibration fail (exit 1).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(E, 'eq-cues-export.mjs'), 'utf8');
const MUT = [
  ['M1 take the FIRST stream\'s cues instead of the last', 'const own = stretch[stretch.length - 1] ?? null;', 'const own = stretch[0] ?? null;'],
  ['M2 window opens 60 s early (outside lines counted in)', 'const inWin = (t) => Number.isFinite(t) && t >= s && t <= e;', 'const inWin = (t) => Number.isFinite(t) && t >= s - 60000 && t <= e;'],
  ['M3 an unexplained missing cues line is not INCOMPLETE', "if (!own && kind === 'other') problems.push(id);", ''],
  ['M4 the failed-answer text is never recognised', "kind = FAIL_TEXT.test(F.txt) ? 'failed' :", "kind = false ? 'failed' :"],
  ['M5 the forbidden-field check is removed', "for (const k of Object.keys(en ?? {})) if (FORBIDDEN.includes(k)) refuse(`entry ${i} carries forbidden field ${k}`);", ''],
  ['M6 superseded streams are never named', 'if (cid !== null && cid === idWin) {', 'if (false) {'],
  ['M6b a stray other-id cues line is called superseded (I2)', 'if (cid !== null && cid === idWin) {', 'if (true) {'],
  ['M10 a malformed cues line is not refused (B2)', 'if (badCue) refuse(', 'if (false) refuse('],
  ['M11 an unread cueBlocks equality does not make the export INCOMPLETE (I3)', "incomplete.push('cueBlocks-unread');", ''],
  ['M12 twins are checked against their own records, not the asked ids (I1)', 'asked ? asked.ids :', 'false ? asked.ids :'],
  ['M13 the override flags are accepted on a real run (m7)', "process.env[CAL_ENV] !== '1'", 'false'],
  ['M14 safeErr prints the message (B2)', "return `${e?.name ?? 'Error'} at", "return `${e?.message} ${e?.name ?? 'Error'} at"],
  ['M15 readJson echoes the parse error message (B2)', "is not readable JSON (${e?.name ?? 'Error'})", "is not readable JSON (${e?.message})"],
  ['M7 ARMING sha comparison removed', "if (last !== `ARMING sha256=${sha}`) refuse(", "if (false) refuse("],
  ['M8 the twin self-check is removed', 'selfCheck(obj, { runDir, lines });\n    // metrics.mjs', '// metrics.mjs'],
  ['M9 twin cues copied PRE-trim replaced by []', 'const cuesArr = hasCues ? v.cues : [];', 'const cuesArr = [];'],
  ['R3-1 probe lines are never admitted', 'if (ok) probes.push(', 'if (false) probes.push('],
  ['R3-2 criterion 1 removed (turn may start inside the window)', '&& tn.t < s ', '&& true '],
  ['R3-3 criterion 2 removed (turn number not compared)', '&& tn.num < firstRosterTurn ', '&& true '],
  ['R3-4 criterion 4 removed (pairs not consulted)', "&& (pairs.items ?? []).every((p) => p.dispatchedAt == null || Date.parse(p.dispatchedAt) >= s);", '&& true;'],
  ['R3-6 no pairs file is not a refusal (criterion 4 unread)', 'firstRosterTurn !== null && pairs !== null', 'firstRosterTurn !== null && true'],
  ['R3-7 a rejected candidate is silently dropped, not INCOMPLETE', 'else problems.push(`L${c.fullN}`);', ';'],
  ['R3-8 a superseded line is also named probe (h40d must stay probe 0)', 'for (const s of inapp.superseded) out.push(`superseded ${s.n}`);', 'for (const s of inapp.superseded) { out.push(`superseded ${s.n}`); out.push(`probe ${s.n}`); }'],
  ['R3-9 the equality ignores probe lines', 'nonEmpty + supNonEmpty + probeNonEmpty;', 'nonEmpty + supNonEmpty;'],
  ['A2-5 criterion 5 reverted to the old criterion 4 (pair after the turn start)', "Date.parse(p.dispatchedAt) >= s);", "Date.parse(p.dispatchedAt) > tn.t);"],
  ['A2-5b criterion 5 off by one (a pair AT startedAt counts as before)', "Date.parse(p.dispatchedAt) >= s);", "Date.parse(p.dispatchedAt) > s);"],
  ['A2-M3 the exemption count is not printed', "out.push(`full lines exempt (probe) ${inapp.probes.length}`);", ''],
  ['A3.2 a superseded line before the window is accepted', "if (turns.length > 0 && (tn === null || !(tn.t >= s))) problems.push(", "if (false) problems.push("],
  ['A4 the A3.2 check also refuses logs with no turn lines', "if (turns.length > 0 && (tn === null", "if (true && (tn === null"],
  ['R3-3c criterion 3 alone removed (EQUIVALENT: criterion 2 already implies it, argued in the note below)', '&& !entries.some((x) => x.logLine === c.n)', '&& true', 'equivalent'],
];
fs.mkdirSync(path.join(E, 'b10cal-mutants'), { recursive: true });
let flipped = 0;
let equiv = 0;
for (const [name, from, to, kind] of MUT) {
  if (!src.includes(from)) { console.log(`MUTANT ${name}: PATTERN NOT FOUND (mutant invalid)`); continue; }
  const p = path.join(E, 'b10cal-mutants', 'mut.mjs'); fs.writeFileSync(p, src.replace(from, to));
  const r = spawnSync(process.execPath, [path.join(E, 'eq-cues-export.cal.mjs')], { encoding: 'utf8', env: { ...process.env, B10_TOOL: p } });
  const m = (r.stdout || '').match(/B10 CALIBRATION: (\d+) PASS, (\d+) FAIL/);
  const failed = (r.stdout || '').split('\n').filter((l) => l.startsWith('FAIL')).length;
  const ok = r.status !== 0 && failed > 0; if (kind === 'equivalent') { equiv++; console.log(`MUTANT ${name}: cal exit ${r.status}, ${m ? m[2] : '?'} FAIL lines -> ${ok ? 'FLIPPED (not equivalent after all)' : 'NOT CAUGHT (argued equivalent)'}`); continue; } if (ok) flipped++;
  console.log(`MUTANT ${name}: cal exit ${r.status}, ${m ? m[2] : '?'} FAIL lines -> ${ok ? 'FLIPPED (calibration catches it)' : 'NOT CAUGHT'}`);
}
console.log(`b10 mutants: ${flipped} of ${MUT.length - equiv} non-equivalent mutants flipped the calibration; ${equiv} argued-equivalent mutant(s) not caught`);
