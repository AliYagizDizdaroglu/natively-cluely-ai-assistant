// P6 launch-grader-r40.mjs: launches ONE Claude grading (or classifier) session for router40. IT CALLS THE CLAUDE CLI (a model call) in a real run: the controller runs it on 2026-10-06 from 04:15 local (A8.2).
// Built on followup-turn/R/launch-grader.mjs's exported helpers (read only, imported, never edited). The flight's recipe (A2.7/A3.5): `claude -p`, --tools Read,Write,Edit, dontAsk,
// --strict-mcp-config, NO --add-dir, NO Bash; the FR launcher's one `--model opus` becomes `claude-opus-5-5` (asserted: exactly one occurrence).
//   node launch-grader-r40.mjs blind-N.g1|g2 [--attempt k] [--dry-run]       N = 1..4: grades R40/grade/blind/pairs.blind-N.json
//   node launch-grader-r40.mjs --classify c3|c4 [--attempt k] [--dry-run]     the l38base classifier (P1 dispatch) over the 47 turns + the 22 calibration turns
// FR reads TURN_GRADING_DIR at import, so it is set BEFORE the dynamic import: FR's own cwds and slot lock then live in R40/grade/grading, nothing is written under FR.
// A real run exits 2 when any stub input is set; --calibration requires the TURN_FAKE_CLAUDE stand-in (it never starts the real claude binary).
// Guards (P9, arm grade, A2.4) run before EVERY launch; --dry-run prints the argv and then the guard verdict (exit 3 = REFUSED).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN, SP, R40, FR, FT, stubsSet, argOf, readJson, sha12, TONIGHT_START, TONIGHT_END } from '../r40-common.mjs';
import { guard, stubBundleFromArgs, gradeEstMs } from '../pre-run-r40.mjs';

const GRADE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const DRY = flag('--dry-run'), CAL = flag('--calibration');
const say = (s) => console.log(s);
const refuse = (code, m) => { say(`REFUSED (exit ${code}): ${m}`); process.exit(code); };
const stubs = stubsSet(argv);
if (!DRY && !CAL && stubs.length) refuse(2, `stub input(s) set in a real run: ${stubs.join(', ')}`);
if (CAL && !process.env.TURN_FAKE_CLAUDE) refuse(2, '--calibration requires TURN_FAKE_CLAUDE (a calibration never starts the real claude binary)');
const ROOT = argOf(argv, '--out-dir') ?? GRADE; // grade root: blind/, keyhold/, classify/, grading/ (calibration may point elsewhere)
const GRADING = argOf(argv, '--grading-dir') ?? path.join(ROOT, 'grading');
process.env.TURN_GRADING_DIR = GRADING; // BEFORE the import below (FR reads it at import)
const FRL = await import(`file:///${FR}/launch-grader.mjs`);
const AG = await import(`file:///${FR}/audit-graders.mjs`);
const { verdictFileProblem } = await import(`file:///${FR}/legs-decide.mjs`);
const PIN = 'claude-opus-5-5';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const win = (p) => path.resolve(p).replace(/\//g, '\\');
const inside = (p, base) => path.resolve(p).toLowerCase().startsWith(path.resolve(base).toLowerCase());

/** The FR argv with its one `--model opus` swapped for the pin (asserted: exactly one). */
export function pinModel(args) {
    const idx = args.map((a, i) => (a === '--model' ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1 || args[idx[0] + 1] !== 'opus') throw new Error(`expected exactly one '--model','opus' in the FR argv, found ${idx.length}`);
    // Live defect (flight-eq probe, 05:4x): a real claude session loads USER settings (the claude-mem plugin + its SessionStart hook), so memory read LOADED. Router40's own code appends the flag; FR's launcher is never edited.
    const out = [...args, '--setting-sources', 'project,local']; out[idx[0] + 1] = PIN; return out;
}
/** The argv facts a reader checks (booleans/counts only). */
export const argvFacts = (args, cwd) => ({ settingSources: args.flatMap((a, i) => (a === '--setting-sources' ? [args[i + 1]] : [])).join('|'), model: args[args.indexOf('--model') + 1], tools: args[args.indexOf('--tools') + 1], addDir: args.filter((a) => a === '--add-dir').length, bash: args.some((a) => /Bash/.test(a)), cwdOutside: !inside(cwd, MAIN) && !inside(cwd, WT) });

// ---- what to launch ----
const isClassify = flag('--classify');
const attempt = Number(argOf(argv, '--attempt') ?? 1);
if (!Number.isInteger(attempt) || attempt < 1) refuse(2, '--attempt must be a positive integer');
let label, args, rules, cwd, prompt, check = null, launchesFile, verdictsPath = null;
if (isClassify) {
    const c = argOf(argv, '--classify');
    if (!['c3', 'c4'].includes(c)) refuse(2, '--classify c3|c4');
    label = `classify-${c}`;
    const TURNS = `${R40}/turns-for-classifiers.json`, CALF = `${SP}/l38base/blind/cal-blind.json`;
    const OUT = path.join(ROOT, 'classify', `verdicts.${c}.json`);
    const tmpl = fs.readFileSync(`${R40}/l38base-dispatch.txt`, 'utf8');
    prompt = tmpl.split('<TURNS>').join(win(TURNS)).split('<CAL>').join(win(CALF)).split('<OUT>').join(win(OUT));
    if (/<TURNS>|<CAL>|<OUT>/.test(prompt) || !prompt.includes(win(OUT)) || !prompt.includes(win(TURNS)) || !prompt.includes(win(CALF))) refuse(2, 'the classifier dispatch placeholders were not all substituted');
    const base = FRL.probeArgs({ prompt, inFile: TURNS, outFile: OUT }); // Read TURNS, Edit OUT, the FR flags
    rules = [...base.rules, FRL.absRule('Read', CALF)];
    args = pinModel([...base.args, FRL.absRule('Read', CALF)]);
    cwd = path.join(GRADING, `${label}-a${attempt}`);
    launchesFile = path.join(ROOT, 'classify', 'launches.jsonl');
    verdictsPath = OUT;
    check = () => {
        let j; try { j = readJson(OUT); } catch { return 'output file MISSING/INVALID'; }
        const T = readJson(TURNS).turns.map((t) => t.id), K = readJson(CALF).map((x) => x.key);
        const want = [...T, ...K], bad = want.filter((k) => !['EASY', 'HARD'].includes(j[k]?.route));
        return bad.length ? `output invalid on ${bad.length} of ${want.length} keys` : `output valid on ${want.length} keys`;
    };
} else {
    const slot = argv.find((a) => /^blind-[1-4]\.g[12]$/.test(a));
    if (!slot) refuse(2, 'usage: blind-N.g1|g2 (N 1..4) or --classify c3|c4');
    label = slot;
    const blindDir = path.join(ROOT, 'blind');
    const files = AG.ownFiles(slot);
    const pairsPath = path.join(blindDir, files.pairs); verdictsPath = path.join(blindDir, files.verdicts);
    if (!fs.existsSync(pairsPath)) refuse(2, `${files.pairs} does not exist in ${blindDir}`);
    if (fs.existsSync(verdictsPath)) refuse(2, `${files.verdicts} already exists: move the earlier attempt's verdicts away before a re-grade`);
    const template = AG.dispatchTemplate(AG.DISPATCH_FILE);
    if (!template) refuse(2, 'the dispatch file holds no dispatch marker');
    prompt = FRL.buildPrompt(template, { blindDir, slot });
    const why = AG.dispatchProblem(prompt, template, { blindDir, files, tag: slot });
    if (why) refuse(2, `the built prompt does not pass the audit's dispatch check: ${why}`);
    const ca = FRL.claudeArgs({ prompt, blindDir, slot, rubric: AG.RUBRIC });
    rules = ca.rules; args = pinModel(ca.args);
    cwd = path.join(GRADING, `${slot}-a${attempt}`);
    launchesFile = path.join(blindDir, 'launches.jsonl');
    const items = readJson(pairsPath).items;
    check = () => { try { const p = verdictFileProblem(readJson(verdictsPath), Object.fromEntries(items.map((i) => [i.key, 1]))); return p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${items.length} keys)`; } catch { return 'verdicts file MISSING/INVALID'; } };
}

// ---- the argv block (ids/hashes only; never the prompt) ----
const facts = argvFacts(args, cwd);
const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
say(argvLine);
say(`permission rules: ${rules.join(' | ')}`);
say(`cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl in its projects folder ${FRL.slugJsonls(cwd).length}; memory entries ${FRL.memoryEntries(cwd).length}`);
say(`facts: model ${facts.model}; tools ${facts.tools}; --add-dir count ${facts.addDir}; Bash in argv ${facts.bash}; cwd outside MAIN and the worktree ${facts.cwdOutside}; setting-sources ${facts.settingSources || 'MISSING'}`);

// ---- refusals that need no clock: an existing cwd, a live FR slot (m7) ----
if (fs.existsSync(cwd)) refuse(2, `${cwd} already exists: a cwd is never reused`);
const frSlots = argOf(argv, '--stub-fr-slots') ?? `${FT}/grading/.slots`;
let liveSlots = 0;
try {
    for (const d of fs.readdirSync(frSlots)) {
        let pid = 0; try { pid = Number(fs.readFileSync(path.join(frSlots, d, 'pid'), 'utf8')); } catch { /* no pid */ }
        if (pid) { try { process.kill(pid, 0); liveSlots++; } catch { /* dead */ } }
    }
} catch { /* no slots folder */ }
if (liveSlots) refuse(2, `an FR grader slot holds a live pid (${liveSlots}): router40 grading never overlaps the flight's graders`);

// ---- the guard, before EVERY launch (A2.4: date gate, lines, machine, G sitting, deadline, drift) ----
// A7 m5: grading is all-or-nothing per night. Tonight (the clock inside the A5 window) every launch still to make (10 in all: 8 graders + 2 classifiers; the ones already launched are the cwds in the grading folder) must fit before the deadline, so the FIRST launch needs 10 x 25 min; tomorrow a launch is 25 min (A2/A3).
const stubBundle = { ...stubBundleFromArgs(argv), ownPid: process.pid };
const clock = stubBundle.now ?? new Date();
const tonight = +clock >= +TONIGHT_START && +clock < +TONIGHT_END;
const launched = fs.existsSync(GRADING) ? fs.readdirSync(GRADING).filter((d) => /-a\d+$/.test(d)).length : 0;
const launchesLeft = tonight ? Math.max(1, 10 - launched) : 1; // a re-launch of a failed attempt counts as one more launch of a slot already counted (an unmodelled 1-launch slack)
say(`grading est: ${launchesLeft} launch(es) x 25 min (${tonight ? 'tonight: all-or-nothing' : 'a single launch'}); launched so far ${launched}`);
const g = await guard({ arm: 'grade', estMs: gradeEstMs(launchesLeft), scope: { drift: true, ledger: false }, stubs: stubBundle });
if (!g.ok) refuse(3, `the guard failed: ${g.failed.join(' | ')}`);
if (DRY) { say('DRY RUN: all guards PASS; nothing launched'); process.exit(0); }

// ---- the launch (the claude binary, or in --calibration the stand-in named by TURN_FAKE_CLAUDE) ----
fs.mkdirSync(path.dirname(verdictsPath), { recursive: true }); // the classifier's output folder must exist for its Write/Edit rule to land (the blind folder already does)
const r = FRL.launchAttempt({ slot: label, attempt, cwd, args });
if (r.error) refuse(2, r.error);
fs.mkdirSync(path.dirname(launchesFile), { recursive: true });
fs.appendFileSync(launchesFile, `${FRL.launchRecord(r.record)}\n`);
const mem = r.memory ? `${r.memory.status} projectMemory=${r.memory.projectMemory} claudeMem=${r.memory.claudeMem}` : 'transcript not found';
const vp = check();
say(`${label} a${attempt}: session ${r.record.session_id} model ${r.record.model} exit ${r.record.exit} slugJsonl ${r.record.slugJsonl} memoryDir ${r.record.memoryDir} memory ${mem} tools ${JSON.stringify(r.tools)} ${vp}`);
say('the controller still runs audit-r40.mjs (P7: tools CLEAN, memory ABSENT, model PINNED) on this session before its grades count');
process.exit(r.record.exit === 0 && r.record.slugJsonl === 1 && r.record.memoryDir !== 'non-empty' && /valid on/.test(vp) ? 0 : 1);
