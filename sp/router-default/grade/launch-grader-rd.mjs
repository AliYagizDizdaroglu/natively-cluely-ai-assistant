// launch-grader-rd.mjs: the grader launcher of router-default-r1 (PREREGISTER-router-default.md 7.1, 7.2). A DERIVED launcher: followup-turn\R\launch-grader.mjs (imported, never edited)
// supplies the attempt machinery; the argv form, the pin, the pairs mode and the probes are flight-eq's launch-grader-eq.mjs; the run-folder refusal is router40's.
// IT CALLS THE CLAUDE CLI (a model call) when a grader or probe is launched FOR REAL: the controller runs it, never a self-test. --plan and --dry-run call nothing, and neither does
// the calibration (cal-launch-grader-rd.mjs), which runs this file against a stand-in for the claude binary with PATH stripped.
//
//   node launch-grader-rd.mjs --plan --run-dir <run>                                         prints the planned launches and the gate; calls nothing, writes nothing
//   node launch-grader-rd.mjs <tag> --run-dir <run> --model-id claude-opus-5-5 [--attempt k] [--dry-run]
//        <tag> = blind-N.g1|g2 (N = 1..4) | inapp.g1|g2 | high | low | captured-high.  Graders per file (registration 7.2): blind 2 each, in-app 2, high 1, low 1, captured-high 1.
//   node launch-grader-rd.mjs cwdprobe-1|cwdprobe-2 --probe --model-id claude-opus-5-5 [--dry-run]     the pinned, memory-clean probes (2 only after 1 read clean, ...)
//   node launch-grader-rd.mjs cwdprobe-3 --probe [--dry-run]                                        the ALIAS read: no --model-id; reported, decides nothing; only after cwdprobe-2
//
// What it refuses (exit 2, nothing launched): a run folder whose name is not <stamp>-router-default-r1; a real grader launch without --model-id claude-... (the user's pin) or
// before the PROBE GATE passes (cwdprobe-1 and -2 clean and pinned, cwdprobe-3 read, each probe recorded by THIS launcher file: its sha12 is in the record; every transcript re-read:
// memory ABSENT, exactly one Read and one Write, models = the pin); a missing pairs file; an existing verdicts file; a reused cwd.
// After a launch: the transcript is re-read for memory (ABSENT), tools (Read/Write/Edit only) and the model of every assistant message (= the pin); the record written to
// launches.jsonl carries those facts for the scorer, which refuses a file whose last record is not clean.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTERED_RUN_LABEL, runFolderPattern, N_FILES } from '../build-blind-rd.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const CAL = process.env.RD_CAL_FAKE === '1';
const SEAMS = ['TURN_FAKE_CLAUDE', 'TURN_PROJECTS', 'RD_GRADING_DIR', 'RD_LOG_DIR', 'RD_VERDICT_DIR', 'RD_DISPATCH'];
if (!CAL && SEAMS.some((s) => process.env[s])) {
    console.error(`launch-grader-rd: REFUSED: a test seam (${SEAMS.join(', ')}) is set without RD_CAL_FAKE=1; a stand-in grader must never produce a real grade`);
    process.exit(2);
}
const seam = (name, dflt) => (CAL && process.env[name] ? process.env[name] : dflt);
const GRADING = seam('RD_GRADING_DIR', path.join(HERE, 'grading'));
const VERDICTS = seam('RD_VERDICT_DIR', path.join(HERE, 'verdicts'));
const LOGS = seam('RD_LOG_DIR', HERE);                                   // launches.jsonl, grader-cwd.launches.jsonl, grader-cwd.probes.out.txt
export const DISPATCH = seam('RD_DISPATCH', path.join(HERE, 'rd-grader-dispatch.txt'));
process.env.TURN_GRADING_DIR = GRADING;          // the original reads these at import: set BEFORE the dynamic imports below
process.env.FQ_OUT_DIR = HERE;
const L = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
const { scan } = await import(pathToFileURL(path.join(F_R, 'check-grader-memory.mjs')).href);

export const PIN = 'claude-opus-5-5';
export const MODEL_ID_RX = /^claude-[a-z0-9][a-z0-9.-]*$/;
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
export const LAUNCHER_SHA12 = sha12(fs.readFileSync(SELF));
const isDrive = (p) => /^[A-Za-z]:[\\/]/.test(p ?? '');
const winP = (p) => path.resolve(p).replace(/\//g, '\\');
const GATED_TOOLS = ['Read', 'Write', 'Edit'];

// ---------------------------------------------------------------- argv (flight-eq's form)
/** The argv shared by every grader and probe. `--setting-sources project,local`: USER settings (claude-mem plugin, SessionStart hook) are never loaded (live defect 2026-10-06 05:4x, memory LOADED). NO second directory flag here (the calibration counts that word on this line). */
export const FLAGS = (prompt, model) => ['-p', prompt, '--model', model, '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config', '--setting-sources', 'project,local'];
export const probeArgsRd = ({ prompt, inFile, outFile, model }) => { const rules = [L.absRule('Read', inFile), L.absRule('Edit', outFile)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
export const pairsArgs = ({ prompt, pairs, verdicts, rubric = A.RUBRIC, model }) => { const rules = [L.absRule('Read', pairs), L.absRule('Read', rubric), L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
/** The dispatch text: the template with ONLY the pairs path, the verdicts path and the tag substituted (the audit's own dispatch check re-proves it). */
export const buildPromptFiles = (template, { pairs, verdicts, tag }) => template.replace('RUN\\<pairs file>', () => winP(pairs)).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${winP(verdicts)}`).replace('`TAG`', () => `\`${tag}\``);
/** The model the CLI reports (and every assistant message) must be EXACTLY the pin. */
export const modelMatchesPin = (model, pin) => !!model && model.split('+').every((m) => m === pin);   // exactly the pin: no suffix, no alias, no other model
/** The model of every assistant message of a transcript (synthetic placeholders aside). */
export const transcriptModels = (text) => [...new Set(text.split('\n').flatMap((line) => { try { const j = JSON.parse(line); return j?.type === 'assistant' && j.message?.model ? [j.message.model] : []; } catch { return []; } }).filter((m) => m !== '<synthetic>'))];

// ---------------------------------------------------------------- the run folder and the tags
/** null when `runDir`'s name is <stamp>-router-default-r1; else why not. A smoke, a retried or suffixed run, a prefix, the bare label or junk before the stamp are never graded. */
export function folderProblem(runDir) {
    const name = path.basename(path.resolve(String(runDir ?? '')));
    return runFolderPattern(REGISTERED_RUN_LABEL).test(name) ? null : `only a run folder named <stamp>-${REGISTERED_RUN_LABEL} is graded (got "${name}"); a smoke, a retried or suffixed run or any other folder is never graded`;
}
const ARM_FILES = { inapp: 'interview60.judge.pairs.json', high: 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json', low: 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json', 'captured-high': 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json' };
/** { file, graders, pairsRel } of a tag, or null. Blind: 2 graders (g1, g2) per file, N = 1..N_FILES; in-app: 2; high, low, captured-high: 1 (no .gX). */
export function parseTag(tag) {
    let m;
    if ((m = /^blind-(\d+)\.g([12])$/.exec(tag)) && +m[1] >= 1 && +m[1] <= N_FILES) return { file: `blind-${m[1]}`, graders: 2, pairsRel: path.join('router-blind', `pairs.blind-${m[1]}.json`) };
    if ((m = /^inapp\.g([12])$/.exec(tag))) return { file: 'inapp', graders: 2, pairsRel: ARM_FILES.inapp };
    if (ARM_FILES[tag] && tag !== 'inapp') return { file: tag, graders: 1, pairsRel: ARM_FILES[tag] };
    return null;
}
export const verdictsPathOf = (tag) => path.join(VERDICTS, `verdicts.${tag}.json`);
/** The planned launches for a run folder: blind files as found on disk (the export decides how many), then in-app, high, low, captured-high. */
export function planFor(runDir) {
    const dir = path.join(runDir, 'router-blind');
    const ns = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => /^pairs\.blind-(\d+)\.json$/.exec(f)).filter(Boolean).map((m) => +m[1]).filter((n) => n >= 1 && n <= N_FILES).sort((a, b) => a - b) : [];
    const tags = [...ns.flatMap((n) => [`blind-${n}.g1`, `blind-${n}.g2`]), 'inapp.g1', 'inapp.g2', 'high', 'low', 'captured-high'];
    return tags.map((tag) => { const info = parseTag(tag); const pairsPath = path.join(runDir, info.pairsRel); let items = null; try { items = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items.length; } catch { /* absent */ } return { tag, ...info, pairsPath, items, verdictsPath: verdictsPathOf(tag) }; });
}

// ---------------------------------------------------------------- the probe gate
/** null when a probe's last record is clean: exit 0, written by THIS launcher file, its transcript found and re-read (memory ABSENT, exactly one Read and one Write, nothing else), the models = the pin (not for the alias probe). */
export function probeRecordProblem(rec, { alias = false, projects = L.PROJECTS, launcherSha = LAUNCHER_SHA12 } = {}) {
    if (!rec) return 'no record';
    if (rec.exit !== 0) return `exit ${rec.exit}`;
    if (rec.launcher !== launcherSha) return `written by another launcher version (${rec.launcher ?? 'none'}, this one is ${launcherSha}): probe again`;
    if (rec.slugJsonl !== 1) return `slugJsonl ${rec.slugJsonl}`;
    if (rec.memoryDir === 'non-empty') return 'the projects folder holds a non-empty memory';
    const t = rec.session_id ? L.findSession(rec.session_id, projects) : null;
    if (!t) return 'its transcript was not found';
    const text = fs.readFileSync(t, 'utf8');
    const tools = L.toolCounts(text);
    if (tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) return `tools ${JSON.stringify(tools)} (need exactly one Read and one Write)`; // MUT-gate-tools
    const mem = scan(text);
    if (mem.loaded) return `memory LOADED (project ${mem.projectMemory.total}, claude-mem ${mem.claudeMem.total})`; // MUT-gate-memory
    if (!alias) {
        if (!modelMatchesPin(rec.model, PIN)) return `the CLI reports model ${rec.model}, not the pin`;
        const ms = transcriptModels(text);
        if (!ms.length || !ms.every((m) => modelMatchesPin(m, PIN))) return `transcript models ${JSON.stringify(ms)} are not the pin`; // MUT-gate-model
    }
    return null;
}
/** The gate a real grader launch needs: cwdprobe-1 and cwdprobe-2 clean and pinned, cwdprobe-3 (the alias read) clean. */
export function probeGate({ launchesFile, projects = L.PROJECTS } = {}) {
    const recs = L.readLaunches(launchesFile);
    const last = (slot) => recs.filter((r) => r.slot === slot).at(-1);
    const problems = [];
    for (const [slot, alias] of [['cwdprobe-1', false], ['cwdprobe-2', false], ['cwdprobe-3', true]]) { const p = probeRecordProblem(last(slot), { alias, projects }); if (p) problems.push(`${slot}: ${p}`); }
    const t3 = last('cwdprobe-3'), tf = t3?.session_id ? L.findSession(t3.session_id, projects) : null;
    return { ok: problems.length === 0, problems, alias: tf ? transcriptModels(fs.readFileSync(tf, 'utf8')).join('+') || null : null };
}

/** null when `vv` has a valid verdict (0-2 correctness, on_topic, delivery) for every key and nothing else. */
const verdictFileProblem = (vv, keys) => {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !keys[k]);
    if (extra.length) return `grades keys that are not in the pairs file: ${extra.join(', ')}`;
    for (const k of Object.keys(keys)) { const s = vv[k]; if (!s || ![s.correctness, s.on_topic, s.delivery].every((x) => [0, 1, 2].includes(x))) return `no valid verdict for ${k}`; }
    return null;
};

async function main() {
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const refuse = (why) => { console.log(`launch-grader-rd: REFUSED: ${why}`); process.exit(2); };
    const known = new Set(['--attempt', '--dry-run', '--run-dir', '--model-id', '--probe', '--plan']);
    const valued = new Set(['--attempt', '--run-dir', '--model-id']);
    for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--') && !known.has(argv[i])) refuse(`unknown option ${argv[i]}`); if (valued.has(argv[i]) && (argv[i + 1] == null || argv[i + 1].startsWith('--'))) refuse(`${argv[i]} needs a value`); }
    const dry = argv.includes('--dry-run');
    const modelId = arg('--model-id');
    if (modelId != null && modelId !== PIN) refuse(`--model-id "${modelId}" is not the pin: a grader or pinned probe takes exactly --model-id ${PIN} (no alias, no other model)`);   // MUT-pin-exact
    const attempt = Number(arg('--attempt') ?? 1);
    if (!Number.isInteger(attempt) || attempt < 1) refuse('--attempt must be a positive integer');
    const launchesFile = path.join(LOGS, 'launches.jsonl'), probeFile = path.join(LOGS, 'grader-cwd.launches.jsonl'), probeOut = path.join(LOGS, 'grader-cwd.probes.out.txt');

    // ---- probes (no run folder involved)
    const probe = argv.find((a) => /^cwdprobe-[123]$/.test(a));
    if (argv.includes('--probe') !== !!probe) refuse('--probe goes with exactly cwdprobe-1, cwdprobe-2 or cwdprobe-3');
    if (probe) {
        const k = Number(probe.slice(-1));
        if (attempt !== 1) refuse('a probe runs as attempt 1 (cwdprobe-<n>-a1)');
        if (k === 3 && modelId) refuse('cwdprobe-3 reads what the ALIAS resolves to: it must not carry --model-id');
        if (k !== 3 && !modelId && !dry) refuse(`${probe} is a pinned probe: --model-id ${PIN} is required for a real launch`);
        const model = k === 3 ? 'opus' : modelId ?? 'opus';
        const lines = [`$ node launch-grader-rd.mjs ${argv.join(' ')}`];
        const say = (s) => { lines.push(s); console.log(s); };
        const finish = (code) => { if (!dry) { fs.mkdirSync(LOGS, { recursive: true }); fs.appendFileSync(probeOut, `${lines.join('\n')}\n\n`); } process.exit(code); };
        if (k > 1) {
            const prev = L.readLaunches(probeFile).filter((l) => l.slot === `cwdprobe-${k - 1}`).at(-1);
            const why = probeRecordProblem(prev, { alias: k - 1 === 3 });
            if (why) { say(`${probe}: ${dry ? 'a real launch would be ' : ''}REFUSED: it starts only after cwdprobe-${k - 1} read clean (${why})`); if (!dry) finish(2); }
        }
        const inFile = path.join(GRADING, 'probe-input.txt');
        if (!dry) { fs.mkdirSync(GRADING, { recursive: true }); if (!fs.existsSync(inFile)) fs.writeFileSync(inFile, 'synthetic line one\nsynthetic line two\nsynthetic line three\n'); }
        const cwd = path.join(GRADING, `${probe}-a1`), outFile = path.join(cwd, 'out.txt');
        const { args, rules } = probeArgsRd({ prompt: L.probePrompt(inFile, outFile), inFile, outFile, model });
        say(`claude ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
        say(`permission rules: ${rules.join(' | ')}`);
        if (k === 3) say('alias read: this probe carries no --model-id; its transcript model is what `opus` resolves to today (reported, decides nothing)');
        if (dry) { say(`DRY RUN ${probe}: model ${model}${modelId || k === 3 ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl ${L.slugJsonls(cwd).length}; memory entries ${L.memoryEntries(cwd).length}`); finish(0); }
        const r = L.launchAttempt({ slot: probe, attempt, cwd, args });
        if (r.error) { say(`${probe}: REFUSED ${r.error}`); finish(2); }
        const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
        const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models: transcriptModels(text) };
        fs.mkdirSync(LOGS, { recursive: true });
        fs.appendFileSync(probeFile, `${L.launchRecord(rec)}\n`);
        const why = probeRecordProblem(rec, { alias: k === 3 }), wrote = fs.existsSync(outFile);
        say(`${probe} a1: session ${rec.session_id} model ${rec.model} exit ${rec.exit} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${rec.memory} tools ${JSON.stringify(rec.tools)} transcript models ${JSON.stringify(rec.models)} out.txt ${wrote ? 'written' : 'MISSING'} -> ${why || !wrote ? `NOT OK (${why ?? 'no out.txt'})` : 'ok'}`);
        if (k === 3) say(`alias read: \`opus\` resolves to ${rec.models.join('+') || 'unknown'} today (reported only)`);
        say(!why && wrote ? `${probe} OK (the controller still runs check-grader-memory.mjs on session:${rec.session_id})` : `${probe} FAILED: no grader runs on a failed probe; the transcript is kept`);
        finish(!why && wrote ? 0 : 1);
    }

    // ---- everything below needs the run folder: its name is checked FIRST
    const runArg = arg('--run-dir');
    if (!runArg) refuse('--run-dir <run folder> is required');
    const fp = folderProblem(runArg);                                                    // MUT-folder
    if (fp) refuse(fp);
    const runDir = path.resolve(runArg);
    if (!fs.existsSync(runDir)) refuse(`the run folder does not exist: ${runDir}`);
    const gate = probeGate({ launchesFile: probeFile });

    if (argv.includes('--plan')) {
        const plan = planFor(runDir), blockers = [];
        if (!plan.some((p) => p.tag.startsWith('blind-'))) blockers.push('no blind pairs file in router-blind (run build-blind-rd.mjs first)');
        console.log(`PLAN run folder ${path.basename(runDir)} (name accepted); grader model pin ${PIN}; launcher sha12 ${LAUNCHER_SHA12}`);
        for (const p of plan) {
            if (p.items === null) blockers.push(`${p.tag}: pairs file missing or unreadable (${p.pairsRel})`);
            if (fs.existsSync(p.verdictsPath)) blockers.push(`${p.tag}: a verdicts file already exists`);
            console.log(`PLAN ${p.tag.padEnd(14)} graders-of-this-file=${p.graders} pairs=${p.items === null ? 'MISSING' : `${p.items} items`} verdicts=${fs.existsSync(p.verdictsPath) ? 'EXISTS' : 'to write'} -> ${path.relative(HERE, p.verdictsPath)}`);
        }
        const files = new Set(plan.map((p) => p.file)).size;
        console.log(`PLAN ${plan.length} grader launches over ${files} pairs files (blind files and the in-app file: 2 graders each; high, low, captured-high: 1 each), at most 2 at once, one fresh cwd each`);
        console.log(`PLAN probe gate: ${gate.ok ? `OK (alias read: opus -> ${gate.alias})` : `BLOCKED (${gate.problems.join('; ')})`}; probes still to run: ${['cwdprobe-1', 'cwdprobe-2', 'cwdprobe-3'].filter((s) => gate.problems.some((p) => p.startsWith(s))).join(', ') || 'none'}`);
        console.log(blockers.length ? `PLAN BLOCKED: ${blockers.join(' | ')}` : 'PLAN OK: nothing blocks the launches except the probe gate above (no model was called)');
        process.exit(blockers.length ? 3 : 0);
    }

    // ---- one grader attempt
    const tag = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(argv[i - 1])));
    if (!tag) refuse('no tag given (blind-N.gX | inapp.gX | high | low | captured-high)');
    const info = parseTag(tag);
    if (!info) refuse(`"${tag}" is not a tag of this run (blind-1..${N_FILES}.g1|g2, inapp.g1|g2, high, low, captured-high)`);
    if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${PIN} (the user's pin: no other model grades this hour)`); // MUT-pin
    const model = modelId ?? 'opus';
    const pairsPath = path.join(runDir, info.pairsRel), verdictsPath = verdictsPathOf(tag);
    if (!fs.existsSync(pairsPath)) refuse(`${pairsPath} does not exist`);
    if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists: move the earlier attempt's verdicts away before a re-grade`);
    let items; try { items = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items; } catch { refuse(`${pairsPath} is not a pairs JSON file`); }
    if (!Array.isArray(items) || !items.length || new Set(items.map((i) => i.key)).size !== items.length || items.some((i) => typeof i.key !== 'string' || !i.key)) refuse(`${pairsPath}: items must be a non-empty list with unique string keys`);
    const keysOf = Object.fromEntries(items.map((i) => [i.key, 1]));
    const template = A.dispatchTemplate(DISPATCH);
    if (!template) refuse(`${DISPATCH} holds no dispatch marker`);
    const prompt = buildPromptFiles(template, { pairs: pairsPath, verdicts: verdictsPath, tag });
    const why = A.dispatchProblem(prompt, template, { blindDir: path.dirname(pairsPath), files: { pairs: pairsPath, verdicts: verdictsPath }, tag });
    if (why) refuse(`the built prompt does not pass the audit's own dispatch check: ${why}`);
    const { args, rules } = pairsArgs({ prompt, pairs: pairsPath, verdicts: verdictsPath, model });
    const cwd = path.join(GRADING, `${tag}-a${attempt}`);
    const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
    if (dry) {
        console.log(`DRY RUN ${tag} attempt ${attempt}: run folder name accepted; ${info.graders} grader(s) for this file; ${items.length} items; model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl ${L.slugJsonls(cwd).length}; memory entries ${L.memoryEntries(cwd).length}`);
        console.log(`dispatch file sha12 ${sha12(fs.readFileSync(DISPATCH))}`);
        console.log(argvLine);
        console.log(`permission rules: ${rules.join(' | ')}`);
        console.log(`probe gate: ${gate.ok ? `OK (alias read: opus -> ${gate.alias})` : `BLOCKED (${gate.problems.join('; ')}); a real launch would be refused`}`);
        return;
    }
    if (!gate.ok) refuse(`the probe gate is not passed: ${gate.problems.join('; ')}`);   // MUT-gate
    console.log(argvLine);
    const r = L.launchAttempt({ slot: tag, attempt, cwd, args });
    if (r.error) refuse(r.error);
    const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
    const models = transcriptModels(text);
    const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));    // MUT-transcript-model
    const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models, pinned, pairsSha12: sha12(fs.readFileSync(pairsPath)), verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null };   // the scorer binds both files to this launch
    fs.mkdirSync(LOGS, { recursive: true });
    fs.appendFileSync(launchesFile, `${L.launchRecord(rec)}\n`);
    if (!rec.model && Object.keys(rec.tools).length === 0) console.log(`${tag} a${attempt}: RATE-LIMIT-REFUSAL? no model and no tool call in the session: not a grader attempt; wait for the reset and relaunch as attempt ${attempt + 1} with a fresh cwd name`);
    let vp = 'verdicts file MISSING/INVALID';
    try { const p = verdictFileProblem(JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), keysOf); vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${items.length} keys)`; } catch { /* absent or unparsable */ }
    const toolsOk = Object.keys(rec.tools).every((t) => GATED_TOOLS.includes(t));
    console.log(`${tag} a${attempt}: session ${rec.session_id} model ${rec.model} exit ${rec.exit} cwd ${path.basename(cwd)} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${rec.memory} tools ${JSON.stringify(rec.tools)}${toolsOk ? '' : ' TOOL OUTSIDE Read/Write/Edit'} ${vp}${pinned ? ' PINNED' : ` MODEL IS NOT THE PIN ${PIN} (cli ${rec.model}, transcript ${JSON.stringify(models)})`}`);
    console.log('the controller still runs check-grader-memory.mjs and h40d-grader-models.mjs on this session, and names the model in the result note');
    process.exit(rec.exit === 0 && rec.slugJsonl === 1 && rec.memoryDir !== 'non-empty' && rec.memory === 'ABSENT' && toolsOk && pinned && /valid on its pairs/.test(vp) ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) await main();
