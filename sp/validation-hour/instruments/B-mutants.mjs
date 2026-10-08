// B-mutants.mjs: rule 8 for the adapter. A test written after the code proves nothing until the code is broken and the
// test is seen to fail. Each mutant below is a copy of VH\h40d-twins.mjs with ONE exact-match patch (the patch must
// apply exactly once, or this script stops); the whole case runner B-twins-cases.mjs is run against it, and the
// assertions that fail are compared with the set decided HERE, before the first run, for that mutant. The identity
// mutant (no patch) must fail nothing: it calibrates the harness itself. Copies and their outputs land in
// VH\instruments\mutants\. Read-only apart from that folder.
//   node B-mutants.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..');
const DIR = path.join(HERE, 'mutants');
const src = fs.readFileSync(path.join(VH, 'h40d-twins.mjs'), 'utf8');
const IMPORT = "from '../cuebench/cuebench-score.mjs'";
if (src.split(IMPORT).length !== 2) throw new Error('the adapter import line changed: this harness must be re-pointed');

// kill: assertion-label prefixes that MUST be among the failures (decided before any run).
const M = [
    { id: 'M0', what: 'identity (no patch): the harness must see no failure', find: null, kill: [] },
    { id: 'M1', what: 'a block-only twin is left out of the gated clause', find: "const emptyWrongGated = empties.filter((e) => (e.kind === 'block-only' || e.kind === 'no-text') && e.gated).length;", replace: 'const emptyWrongGated = 0;', kill: ['5 gated wrong', '8a default STOP', '8a gated wrong', '8c strict alternative', '9 contrast'] },
    { id: 'M2', what: 'a filterCodeFences pipeline event enters the gated clause', find: "const emptyWrongGated = empties.filter((e) => (e.kind === 'block-only' || e.kind === 'no-text') && e.gated).length;", replace: "const emptyWrongGated = empties.filter((e) => (e.kind === 'block-only' || e.kind === 'pipeline') && !excluded.has(e.id)).length;", kill: ['7 S1Q06 rep 3', '7 S2Q06 rep 2'] },
    { id: 'M3', what: "true holes are not taken out of the cue check's n", find: 'n: live.length, present: shapes.filter((s) => s.present).length', replace: 'n: recs.length, present: shapes.filter((s) => s.present).length', kill: ['5 cue-check n'] },
    { id: 'M4', what: 'the default margin of one becomes zero', find: 'export const GATE_MARGIN = 1;', replace: 'export const GATE_MARGIN = 0;', kill: ['8c default'] },
    { id: 'M5', what: 'a no-text record is treated as a gated block-only twin', find: "if (rawLen === 0) return { id: r.id, kind: 'no-text', stage: null, finish: r.finish ?? null, gated: notextGated && !excluded.has(r.id) };", replace: "if (rawLen === 0) return { id: r.id, kind: 'block-only', stage: 'stripCueBlock', finish: r.finish ?? null, gated: !excluded.has(r.id) };", kill: ['9 named as no-text', '9 cue side', 'X4 g'] },
    { id: 'M6', what: 'the stage logic is blind to filterCodeFences', find: "if (stage === 'filterCodeFences') return {", replace: 'if (false) return {', kill: ['7 S1Q06 named', '7 S2Q06 named', 'X4 c', 'X4 d'] },
    { id: 'M7', what: 'the cue check can never fail (benchDecide fed present = shaped = n)', find: ': { acc: c[i].acceptable, wrong: 0, n: c[i].cue.n, present: c[i].cue.present, shape: c[i].cue.shape, ttftP90: c[i].ttft.p90 },', replace: ': { acc: c[i].acceptable, wrong: 0, n: c[i].cue.n, present: c[i].cue.n, shape: c[i].cue.n, ttftP90: c[i].ttft.p90 },', kill: ['4 (5 blocks) reading', '4 (5 blocks) exit'] },
    { id: 'M8', what: 'the holes limit is off by one (3 holes read INCOMPLETE)', find: '.filter(([, s]) => s.holes.length > MAX_HOLES)', replace: '.filter(([, s]) => s.holes.length >= MAX_HOLES)', kill: ['5 not INCOMPLETE', '5 reading'] },
    { id: 'M9', what: 'true holes are counted as wrong in the all-ids line', find: "wrongAll: countV('wrong') + emptyWrongAll, wrongGated:", replace: "wrongAll: countV('wrong') + emptyWrongAll + holes.length, wrongGated:", kill: ['5 all-ids wrong', '1 all-ids'] },
    { id: 'M12', what: 'the strict per-rep clause stops on ties (>= instead of >)', find: 'const strictReps = c.filter((s, i) => cg[i] > worst).map((s) => s.rep);', replace: 'const strictReps = c.filter((s, i) => cg[i] >= worst).map((s) => s.rep);', kill: ['8c strict alternative'] },
    { id: 'M21', what: 'the default clause stops on ties (>= instead of >)', find: 'const defStop = sum(cg) > sum(kg) + GATE_MARGIN;', replace: 'const defStop = sum(cg) >= sum(kg) + GATE_MARGIN;', kill: ['8c default'] },
    { id: 'M23', what: 'empty prose is not counted wrong in the all-ids line', find: 'const emptyWrongAll = empties.length;', replace: 'const emptyWrongAll = 0;', kill: ['5 all-ids wrong', '7 S1Q06 rep 3', '9 cue side'] },
    { id: 'M24', what: 'the --strict flag is ignored (the default governs)', find: 'if (strict ? strictReps.length : defStop) stops.push(', replace: 'if (defStop) stops.push(', kill: ['8c with --strict governing'] },
    { id: 'M26', what: 'a STOP on the ids answered wins over INCOMPLETE', find: 'if (incomplete.length) {', replace: 'if (incomplete.length && !stops.length) {', kill: ['6c reading and exit'] },
    { id: 'M27', what: 'the pre-cue mark is not printed on the reading line', find: "const mark = preCue ? '", replace: "const mark = false ? '", kill: ['1 the reading LINE'] },
    { id: 'M28', what: 'in --pre-cue mode the cue check is read anyway', find: 'cue: preCue\n', replace: 'cue: false\n', kill: ['1 reading', '1 exit'] },
    { id: 'M29', what: 'the verdict-wrong gated count ignores the excluded follow-ups', find: 'const gated = (id) => !excluded.has(id);', replace: 'const gated = () => true;', kill: ['1 gated default'] },
    { id: 'M30', what: 'a block-only twin on an excluded follow-up enters the gated clause', find: "if (present) return { id: r.id, kind: 'block-only', stage, finish: r.finish ?? null, gated: !excluded.has(r.id) };", replace: "if (present) return { id: r.id, kind: 'block-only', stage, finish: r.finish ?? null, gated: true };", kill: ['8d gated wrong unchanged'] },
    { id: 'M31', what: 'the GRADER MIXED flag is removed', find: "${graders.size > 1 ? '   <-- GRADER MIXED", replace: "${false ? '   <-- GRADER MIXED", kill: ['X5 j GRADER MIXED'] },
    { id: 'M32', what: 'empty prose with no cue block (other) is counted in the gated clause', find: "const emptyWrongGated = empties.filter((e) => (e.kind === 'block-only' || e.kind === 'no-text') && e.gated).length;", replace: "const emptyWrongGated = empties.filter((e) => e.kind !== 'pipeline' && e.kind !== 'no-text' && !excluded.has(e.id)).length;", kill: ['8e all-ids wrong'] },   // (first listed with '8e kind' too: a prediction error, M32 leaves the classifier's flag alone, only the gated COUNT changes; corrected after the first run, see report-B.md)
    { id: 'M33', what: 'the dist cue-limits refusal is removed', find: 'if (P.CUE_MAX_LINES !== REGISTERED.maxLines || P.CUE_MAX_WORDS !== REGISTERED.maxWords) refuse(', replace: 'if (false) refuse(', kill: ['X7a'] },
    { id: 'M34', what: 'the dist CUE_RULE refusal is removed', find: 'if (ruleSha12 !== REGISTERED.ruleSha12) refuse(', replace: 'if (false) refuse(', kill: ['X7b'] },
    { id: 'M35', what: 'the invalid-JSON refusal is removed (reads as an empty object)', find: 'try { return JSON.parse(text); } catch { refuse(`${baseName(file)}: not valid JSON (${text.length} characters)`); }', replace: 'try { return JSON.parse(text); } catch { return {}; }', kill: ['X7c'] },
    { id: 'M36', what: 'the entry-keyed-by-its-id check is removed', find: "for (const [k, v] of Object.entries(store)) if (!v || typeof v !== 'object' || v.id !== k) refuse(", replace: "for (const [k, v] of Object.entries(store)) if (false) refuse(", kill: ['X7d'] },
    { id: 'M37', what: "the default control family name has a typo (nocues for no-cues)", find: "control: 'gemini-3.5-flash-lite_captured-no-cues-high' };", replace: "control: 'gemini-3.5-flash-lite_captured-nocues-high' };", kill: ['X8 no-cue twins'] },
    { id: 'M38', what: 'the same-family-as-cue-and-control refusal is removed', find: "if (mode === 'cue-hour' && cue.family === control.family) refuse(", replace: 'if (false) refuse(', kill: ['X5 k'] },
    { id: 'M39', what: 'the --notext-gated flag is ignored (a no-text record is never gated)', find: 'gated: notextGated && !excluded.has(r.id) };', replace: 'gated: false };', kill: ['9b gated 1 / all 1', '9c-ii'] },
    { id: 'M40', what: 'a no-text record on an EXCLUDED follow-up is gated under --notext-gated', find: 'gated: notextGated && !excluded.has(r.id) };', replace: 'gated: notextGated };', kill: ['9c-iv gated wrong unchanged'] },
    { id: 'M41', what: 'the gated clause counts block-only twins only (a no-text record never enters it, flag or not)', find: "const emptyWrongGated = empties.filter((e) => (e.kind === 'block-only' || e.kind === 'no-text') && e.gated).length;", replace: "const emptyWrongGated = empties.filter((e) => e.kind === 'block-only' && e.gated).length;", kill: ['9b gated 1 / all 1', '9c-ii', '9c-v flag on'] },
    { id: 'M13', what: 'the same-id-set check is removed', find: 'if (extra.length || lacking.length) refuse(', replace: 'if (false) refuse(', kill: ['X5 d'] },
    { id: 'M14', what: 'the verdictOf cross-check is removed', find: "if (!['acceptable', 'weak', 'wrong'].includes(it.verdict) || verdictOf(it) !== it.verdict) refuse(", replace: 'if (false) refuse(', kill: ['X5 c'] },
    { id: 'M15', what: "the graded-answer-equals-answers-file check is removed", find: 'if (it.answer !== r.spoken) refuse(', replace: 'if (false) refuse(', kill: ['X5 b'] },
    { id: 'M16', what: 'the graded-id-not-answered check is removed', find: 'if (stray.length) refuse(', replace: 'if (false) refuse(', kill: ['X5 e'] },
    { id: 'M17', what: 'the --pre-cue-on-a-cue-family guard is removed', find: 'if (carrying.length) refuse(', replace: 'if (false) refuse(', kill: ['X5 a '] },
    { id: 'M18', what: 'the cue-hour-without-cues-array guard is removed', find: 'if (bare.length) refuse(', replace: 'if (false) refuse(', kill: ['X6a'] },
    { id: 'M19', what: 'the chain-does-not-reproduce-the-emptiness refusal is removed', find: 'if (stage === null) refuse(', replace: 'if (false) refuse(', kill: ['X4 h'] },
    { id: 'M20', what: 'the replayed-cues-differ refusal is removed', find: 'if (Array.isArray(r.cues) && JSON.stringify(cues) !== JSON.stringify(r.cues.map(String))) refuse(', replace: 'if (false) refuse(', kill: ['X4 i'] },
    { id: 'M42', what: 'the refusal of a dist without stripCueBlock is removed (the stand-in root then fails on its CUE_RULE instead, so only the message check can tell)', find: 'if (lacking.length) refuse(`the filter chain in', replace: 'if (false) refuse(`the filter chain in', kill: ['X6b a dist'] },
    { id: 'M43', what: 'the --dist option is ignored (the worktree is always the chain)', find: "loadChain(path.resolve(opt('--dist', WT)))", replace: 'loadChain(WT)', kill: ['X6b a dist', 'X7a', 'X7b'] },
];

fs.mkdirSync(DIR, { recursive: true });
const OUT = [];
const say = (s = '') => { OUT.push(s); console.log(s); };
say(`mutation harness, ${new Date().toISOString()}: the adapter VH\\h40d-twins.mjs, ${M.length} variants (each a copy with ONE exact-match patch), the case runner B-twins-cases.mjs run against each`);
let wrong = 0;
for (const m of M) {
    let text = src;
    if (m.find) {
        const n = src.split(m.find).length - 1;
        if (n !== 1) throw new Error(`${m.id}: the patch text occurs ${n} times in the adapter, need exactly 1`);
        text = text.replace(m.find, () => m.replace);
    }
    text = text.replace(IMPORT, () => "from '../../../cuebench/cuebench-score.mjs'");
    const file = path.join(DIR, `${m.id}.mjs`);
    fs.writeFileSync(file, text, 'utf8');
    const out = path.join(DIR, `${m.id}.cal.txt`);
    const r = spawnSync(process.execPath, [path.join(HERE, 'B-twins-cases.mjs'), '--adapter', file, '--out', out], { encoding: 'utf8' });
    const crashed = r.status !== 0 && r.status !== 1;
    const failed = (r.stdout || '').split('\n').filter((l) => l.startsWith('  ASSERT FAIL')).map((l) => l.replace(/^  ASSERT FAIL /, '').replace(/: got .*$/, '').replace(/: output does NOT contain .*$/, ''));
    const summary = ((r.stdout || '').match(/^SUMMARY: .*$/m) ?? [''])[0];
    const missed = m.kill.filter((p) => !failed.some((f) => f.startsWith(p)));
    const ok = m.id === 'M0' ? failed.length === 0 && !crashed : !crashed && failed.length > 0 && missed.length === 0;
    if (!ok) wrong++;
    say(`${ok ? 'AS DECIDED' : 'NOT AS DECIDED'}  ${m.id}  ${m.what}`);
    say(`    ${summary || '(no summary line)'}${crashed ? `  [runner exit ${r.status}: ${(r.stderr || '').split('\n')[0]}]` : ''}`);
    if (m.id !== 'M0') say(`    required kills ${m.kill.length ? m.kill.map((p) => `"${p}"`).join(', ') : '-'}: ${missed.length ? `NOT KILLED: ${missed.join(', ')}` : 'all killed'}; failing assertions (${failed.length}): ${failed.slice(0, 8).join(' | ')}${failed.length > 8 ? ' | ...' : ''}`);
}
say(`\nMUTATION HARNESS: ${M.length} variants, ${wrong ? `${wrong} NOT as decided` : 'every one as decided (the identity read clean, every broken copy was caught by the assertions named for it)'}`);
fs.writeFileSync(path.join(HERE, 'B-mutants-out.txt'), OUT.join('\n') + '\n', 'utf8');
process.exit(wrong ? 1 : 0);
