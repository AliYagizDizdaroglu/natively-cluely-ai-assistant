// Throwaway rule-8 check OF the calibration (PREREGISTER-turn-followup.md section 6.5): each mutant of legs-decide.mjs's decide()
// must make legs-decide-calibrate.mjs FAIL. Writes mutant-decide.mjs to a TEMP folder,
// runs the calibration against it through MUTANT_DECIDE, deletes it. The unmutated file is run first: a calibration that is red on
// the real decide() would "catch" every mutant for the wrong reason.
// A2 M4 (item 14): the mutant is written ONLY into a temp folder (legs-decide.mjs has no relative import at load time, so it resolves from
// there) and the folder is removed in a `finally`: a crash can no longer leave a stray .mjs in the hashed R/ folder.
//   node mutate-decide.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.dirname(HERE);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-decide-'));
const decidePath = path.join(R, 'legs-decide.mjs'), mutPath = path.join(TMP, 'mutant-decide.mjs'), calPath = path.join(HERE, 'legs-decide-calibrate.mjs');
const src = fs.readFileSync(decidePath, 'utf8');
const runCal = (env = {}) => spawnSync(process.execPath, [calPath], { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 16 << 20 });

const base = runCal();
console.log(`unmutated decide(): ${base.status === 0 && /CALIBRATION OK/.test(base.stdout) ? 'calibration green' : 'CALIBRATION RED'}`);
if (base.status !== 0) { fs.rmSync(TMP, { recursive: true, force: true }); console.log('REFUSED: the calibration is red on the real decide()'); process.exit(2); }

const L = (s) => s; // anchors are verbatim substrings of legs-decide.mjs, each must occur exactly once
const MUTANTS = [
    // clause 1
    ['c1 front tolerates one new wrong', 'const c1front = wrongBf <= wrongAf, c1back', 'const c1front = wrongBf <= wrongAf + 1, c1back'],
    ['c1 back tolerates one new wrong', 'c1back = wrongBb <= wrongAb;', 'c1back = wrongBb <= wrongAb + 1;'],
    ['c1 ignores the back leg', "const c1 = c1front && c1back ? 'holds' : 'FAIL';", "const c1 = c1front ? 'holds' : 'FAIL';"],
    ['c1 ignores the front leg', "const c1 = c1front && c1back ? 'holds' : 'FAIL';", "const c1 = c1back ? 'holds' : 'FAIL';"],
    ['c1 pools the legs instead of reading each', "const c1 = c1front && c1back ? 'holds' : 'FAIL';", "const c1 = wrongBf + wrongBb <= wrongAf + wrongAb ? 'holds' : 'FAIL';"],
    ['c1 front counts roster pairs only (D-cases ignored)', "wrongAf = count(front, 'A', wrong), wrongBf = count(front, 'B', wrong)", "wrongAf = count(roster, 'A', wrong), wrongBf = count(roster, 'B', wrong)"],
    ['consensus wrong by either grader', 'const wrong = (s) => s.g1.correctness === 0 && s.g2.correctness === 0;', 'const wrong = (s) => s.g1.correctness === 0 || s.g2.correctness === 0;'],
    // clause 2
    ['c2 dropped', "const c2 = offBf <= offAf ? 'holds' : 'FAIL';", "const c2 = 'holds';"],
    ['c2 counts roster pairs only', "offAf = count(front, 'A', offTopic), offBf = count(front, 'B', offTopic)", "offAf = count(roster, 'A', offTopic), offBf = count(roster, 'B', offTopic)"],
    ['c2 decided on the back leg too', "const c2 = offBf <= offAf ? 'holds' : 'FAIL';", "const c2 = offBf + offBb <= offAf + offAb ? 'holds' : 'FAIL';"],
    ['consensus off-topic by either grader', 'const offTopic = (s) => s.g1.on_topic <= 1 && s.g2.on_topic <= 1;', 'const offTopic = (s) => s.g1.on_topic <= 1 || s.g2.on_topic <= 1;'],
    // clause 3
    ['c3a median over all front pairs (D included)', 'const dTtft = med(roster, (p) => p.B.ttft - p.A.ttft);', 'const dTtft = med(front, (p) => p.B.ttft - p.A.ttft);'],
    ['c3a holds bar 600', 'dTtft <= 500', 'dTtft <= 600'],
    ['c3a FAIL bar 1500', 'dTtft > 1000', 'dTtft > 1500'],
    ['c3a FAIL bar 800', 'dTtft > 1000', 'dTtft > 800'],
    ['c3b margin 5000', 'p90B <= p90A + 2000', 'p90B <= p90A + 5000'],
    ['c3b margin 1000', 'p90B <= p90A + 2000', 'p90B <= p90A + 1000'],
    ['c3b reads p50', "const p90A = pct(roster.map((p) => p.A.ttft), 0.9), p90B = pct(roster.map((p) => p.B.ttft), 0.9);", "const p90A = pct(roster.map((p) => p.A.ttft), 0.5), p90B = pct(roster.map((p) => p.B.ttft), 0.5);"],
    ['c3b over all front pairs', "const p90A = pct(roster.map((p) => p.A.ttft), 0.9), p90B = pct(roster.map((p) => p.B.ttft), 0.9);", "const p90A = pct(front.map((p) => p.A.ttft), 0.9), p90B = pct(front.map((p) => p.B.ttft), 0.9);"],
    ['c3b FAILs instead of INCONCLUSIVE', "const c3b = p90B <= p90A + 2000 ? 'holds' : 'INCONCLUSIVE';", "const c3b = p90B <= p90A + 2000 ? 'holds' : 'FAIL';"],
    ['c3c allowance floored', 'Math.ceil((2 * R) / 39)', 'Math.floor((2 * R) / 39)'],
    ['c3c allowance +1', 'slowB <= slowA + allow3c ?', 'slowB <= slowA + allow3c + 1 ?'],
    ['c3c stall threshold 8 s', "const slowA = roster.filter((p) => p.A.ttft > 10000).length, slowB = roster.filter((p) => p.B.ttft > 10000).length;", "const slowA = roster.filter((p) => p.A.ttft > 8000).length, slowB = roster.filter((p) => p.B.ttft > 8000).length;"],
    ['c3c counts all front pairs', "const slowA = roster.filter((p) => p.A.ttft > 10000).length, slowB = roster.filter((p) => p.B.ttft > 10000).length;", "const slowA = front.filter((p) => p.A.ttft > 10000).length, slowB = front.filter((p) => p.B.ttft > 10000).length;"],
    ['c3c INCONCLUSIVE instead of FAIL', "const c3c = slowB <= slowA + allow3c ? 'holds' : 'FAIL';", "const c3c = slowB <= slowA + allow3c ? 'holds' : 'INCONCLUSIVE';"],
    // clause 4
    ['c4 FAIL bar 12', 'dWords > 10', 'dWords > 12'],
    ['c4 FAIL bar 8', 'dWords > 10', 'dWords > 8'],
    ['c4 holds bar 6', 'dWords <= 5', 'dWords <= 6'],
    ['c4 over all front pairs', 'const dWords = med(roster, (p) => p.B.words - p.A.words);', 'const dWords = med(front, (p) => p.B.words - p.A.words);'],
    // clause 5
    ['c5 bar 200', 'dThoughts <= 150', 'dThoughts <= 200'],
    ['c5 bar 100', 'dThoughts <= 150', 'dThoughts <= 100'],
    ['c5 over all front pairs', 'const dThoughts = med(roster, (p) => p.B.thoughts - p.A.thoughts);', 'const dThoughts = med(front, (p) => p.B.thoughts - p.A.thoughts);'],
    ['c5 INCONCLUSIVE instead of FAIL', "const c5 = dThoughts <= 150 ? 'holds' : 'FAIL';", "const c5 = dThoughts <= 150 ? 'holds' : 'INCONCLUSIVE';"],
    // clause 7
    ['c7 PASS bar floored', 'const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);', 'const passBar = Math.floor((4 * R) / 21), failBar = Math.ceil(R / 21);'],
    ['c7 FAIL bar floored', 'const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);', 'const passBar = Math.ceil((4 * R) / 21), failBar = Math.floor(R / 21);'],
    ['c7 fixed bars (no scaling with R)', 'const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);', 'const passBar = 8, failBar = 2;'],
    ['c7 counts all front pairs', "const accA = count(roster, 'A', acceptable), accB = count(roster, 'B', acceptable);", "const accA = count(front, 'A', acceptable), accB = count(front, 'B', acceptable);"],
    ['c7 PASS needs 1 more', 'delta >= passBar ?', 'delta > passBar ?'],
    ['c7 FAIL band one wider', 'delta <= failBar ?', 'delta <= failBar + 1 ?'],
    ['consensus acceptable by either grader', "const acceptable = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';", "const acceptable = (s) => verdictOf(s.g1) === 'acceptable' || verdictOf(s.g2) === 'acceptable';"],
    // outcome
    ['PASS ignores c3b', "['c1', 'c2', 'c3a', 'c3b', 'c3c', 'c4', 'c5'].every", "['c1', 'c2', 'c3a', 'c3c', 'c4', 'c5'].every"],
    ['PASS ignores c3a', "['c1', 'c2', 'c3a', 'c3b', 'c3c', 'c4', 'c5'].every", "['c1', 'c2', 'c3b', 'c3c', 'c4', 'c5'].every"],
    ['PASS ignores c4', "['c1', 'c2', 'c3a', 'c3b', 'c3c', 'c4', 'c5'].every", "['c1', 'c2', 'c3a', 'c3b', 'c3c', 'c5'].every"],
    // (c1, c2, c3c and c5 take only the values holds / FAIL, and a FAIL already dominates the outcome: dropping them from the PASS
    //  conjunction is an EQUIVALENT mutant, so it is not listed. c3a, c3b and c4 can read INCONCLUSIVE, so theirs are.)
    ['a FAIL clause no longer dominates', "let outcome = Object.values(clauses).includes('FAIL') ? 'FAIL'", "let outcome = false ? 'FAIL'"],
    ['re-run: a second INCONCLUSIVE stays INCONCLUSIVE', "if (rerun && outcome === 'INCONCLUSIVE') outcome = 'FAIL';", ''],
    ['re-run flag turns every INCONCLUSIVE and PASS... only INCONCLUSIVE may flip: PASS flips too', "if (rerun && outcome === 'INCONCLUSIVE') outcome = 'FAIL';", "if (rerun) outcome = 'FAIL';"],
    // VOID and validation
    ['parity check removed', 'if (!parity.ok) return {', 'if (false) return {'],
    ['VOID prints a clause line', "lines: ['VOID'] }", "lines: ['VOID', '1. no new wrong'] }"],
    ['validation runs BEFORE the parity check (VOID after garbage)', '    if (!parity.ok) return { outcome', "    validate(front, 'front'); validate(back, 'back');\n    if (!parity.ok) return { outcome"],
    ['null thoughts accepted on the front leg', "if (leg === 'front' && !num(s.thoughts)) throw", 'if (false) throw'],
    ['null thoughts refused on the back leg too', "if (leg === 'front' && !num(s.thoughts)) throw", 'if (!num(s.thoughts)) throw'],
    ['leg/model/thinking check removed', 'if (s.leg !== leg || s.model !== LEG_SPEC[leg].model || s.thinking !== LEG_SPEC[leg].thinking) throw', 'if (false) throw'],
    ['thinking level not compared', ' || s.thinking !== LEG_SPEC[leg].thinking', ''],
    ['model not compared', ' || s.model !== LEG_SPEC[leg].model', ''],
    ['leg field not compared', 'if (s.leg !== leg || ', 'if ('],
    ['a D-case pair accepted on the back leg', "if (leg === 'back' && p.kind !== 'roster') throw", 'if (false) throw'],
    ['unknown kind accepted', "if (!['roster', 'dropped'].includes(p.kind)) throw", 'if (false) throw'],
    ['grader scores not range-checked', 'if (!s || !SCORE(s.g1) || !SCORE(s.g2)) throw', 'if (!s) throw'],
    ['ttft/words not checked', 'if (!num(s.ttft) || !num(s.words)) throw', 'if (false) throw'],
    ['R = 0 not refused', 'if (!R) throw', 'if (false) throw'],
    // arithmetic
    ['percentile rounds up', 'Math.floor(s.length * p)', 'Math.ceil(s.length * p)'],
    ['median is the 40th percentile', 'const med = (set, f) => pct(set.map(f), 0.5);', 'const med = (set, f) => pct(set.map(f), 0.4);'],
    // A2 points 2 and 5: grader labels derived, not typed; the departure note
    ['departure note: any mention of the marker counts', 'const i = lines.findIndex((l) => /^\\s*(?:[-*>#]+\\s*)*(?:\\*\\*)?DEPARTURE-S6-ACCEPTED(?![\\w-])/.test(l));', 'const i = lines.findIndex((l) => /DEPARTURE-S6-ACCEPTED/.test(l));'],
    ['departure note: anywhere in the file counts, not only section 3', "const b = a < 0 ? -1 : preregText.indexOf('\\n## 4.', a);", 'const b = a < 0 ? -1 : preregText.length;'],
    ['LOADED accepted without any departure', "if (memory.status === 'LOADED' && !(departureOk && memory.claudeMem === 0))", 'if (false)'],
    ['claude-mem markers accepted under the departure', "if (memory.status === 'LOADED' && !(departureOk && memory.claudeMem === 0))", "if (memory.status === 'LOADED' && !departureOk)"],
    ['a departure label without the note accepted', 'if (departureClaimed && !departureNote) problems.push(', 'if (false) problems.push('],
    ['a note without a date time accepted', 'if (departureClaimed && departureNote && !departureNote.when) problems.push(', 'if (false) problems.push('],
    ['model label not compared to the tool output', 'if (g.model !== model) problems.push(', 'if (false) problems.push('],
    ['memory label not compared to the tool output', 'if (g.memory !== memory.status) problems.push(', 'if (false) problems.push('],
    ['projectMemory not compared', 'if (g.projectMemory !== memory.projectMemory) problems.push(', 'if (false) problems.push('],
    ['claudeMem not compared', 'if (g.claudeMem !== memory.claudeMem) problems.push(', 'if (false) problems.push('],
    ['audit label not compared to the tool output', 'if (g.audit !== audit.status) problems.push(', 'if (false) problems.push('],
    ['a FLAGGED audit tolerated', "if (audit.status !== 'clean') problems.push(", 'if (false) problems.push('],
    ['bash length:sha12 list not compared', 'if (JSON.stringify(g.bash ?? []) !== JSON.stringify(audit.bash)) problems.push(', 'if (false) problems.push('],
    ['agent id not compared to the audited transcript', 'if (idShown && agent && idShown !== agent) problems.push(', 'if (false) problems.push('],
    ['stray slot names tolerated', 'for (const t of names) if (!expected.includes(t)) problems.push(', 'for (const t of []) if (!expected.includes(t)) problems.push('],
    ['missing slot tolerated', 'for (const t of expected) if (!names.includes(t)) problems.push(', 'for (const t of []) if (!names.includes(t)) problems.push('],
    ['a slot without an agent tolerated', "if (typeof g.agent !== 'string' || !g.agent) problems.push(", 'if (false) problems.push('],
    ['a replacement needs no .replaced lines', 'for (const [k, v] of Object.entries(rl)) if (parsed[k] && !v) problems.push(', 'for (const [k, v] of []) if (parsed[k] && !v) problems.push('],
    ['a replacement needs no justification', 'if (!why) problems.push(', 'if (false) problems.push('],
    ['two lines for one tag tolerated', 'for (const [tag, ls] of parsed[k]) if (ls.length > 1) problems.push(', 'for (const [tag, ls] of []) if (ls.length > 1) problems.push('],
    ['replaced twice tolerated', 'if ((g.replaced ?? []).length > 1) problems.push(', 'if (false) problems.push('],
    ["launches.jsonl absence tolerated", "if (!Array.isArray(launches)) problems.push('launches.jsonl is missing", "if (false) problems.push('launches.jsonl is missing"],
    ["an agent without a launches line tolerated", "if (!line) problems.push(at(`agent ", "if (false) problems.push(at(`agent "],
    ["launcher exit not checked", "if (line.exit !== 0) problems.push(", "if (false) problems.push("],
    ["slugJsonl not checked", "if (line.slugJsonl !== 1) problems.push(", "if (false) problems.push("],
    ["memoryDir not checked", "if (line.memoryDir !== 'absent' && line.memoryDir !== 'empty') problems.push(", "if (false) problems.push("],
    ["attempt not compared to the launches line", "if (!Number.isInteger(g.attempt) || g.attempt !== line.attempt) problems.push(", "if (false) problems.push("],
    ["cwd not compared to the launches line", "if (typeof g.cwd !== 'string' || g.cwd !== line.cwd) problems.push(", "if (false) problems.push("],
    ["a shared cwd (not <slot>-a<attempt>) tolerated", "if (line.cwd && !String(line.cwd).replace(", "if (false && !String(line.cwd).replace("],
    ["launches model not compared", "if (line.model !== g.model) problems.push(", "if (false) problems.push("],
    ["a cwd used twice tolerated", "for (const [c, n] of cwds) if (n > 1) problems.push(", "for (const [c, n] of []) if (n > 1) problems.push("],
    ["a replaced agent needs no launches line", "if (!rl2) problems.push(", "if (false) problems.push("],
    ["a replaced attempt may be later than its replacement", "else if (line && !(rl2.attempt < line.attempt)) problems.push(", "else if (false) problems.push("],
    // additivity
    ['additivity ignores pair counts', "|| pooled.nBack !== first.nBack + second.nBack) bad.push('pair counts');", '|| false) bad.push(\'pair counts\');'],
    ['additivity ignores back-leg wrong counts', "'wrongAb', 'wrongBb', ", ''],
    ['additivity ignores the acceptable counts', "'accA', 'accB'", "'accA'"],
];
let ok = true;
try {
    for (const [name, from, to] of MUTANTS) {
        if (src.split(from).length !== 2) { console.log(`ANCHOR NOT FOUND EXACTLY ONCE for "${name}" (${src.split(from).length - 1} times)`); ok = false; continue; }
        fs.writeFileSync(mutPath, src.replace(from, () => to));
        const r = runCal({ MUTANT_DECIDE: mutPath });
        const caught = r.status !== 0 && /CALIBRATION FAILED|Error/.test(r.stdout + r.stderr);
        ok &&= caught;
        const bad = (r.stdout.match(/^BAD .*$/m) ?? [''])[0].slice(0, 100) || (r.stderr || '').split('\n').find((l) => /Error/.test(l))?.slice(0, 100) || '';
        console.log(`${caught ? 'caught ' : 'MISSED '} ${name}${caught ? `  (${bad})` : `  exit ${r.status}`}`);
    }
} finally { fs.rmSync(TMP, { recursive: true, force: true }); }
console.log(ok ? `\nEVERY MUTANT CAUGHT (${MUTANTS.length}): the calibration can fail` : '\nA MUTANT SURVIVED');
process.exit(ok ? 0 : 1);
