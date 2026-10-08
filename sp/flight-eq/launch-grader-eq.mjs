// E\launch-grader-eq.mjs: the grader launcher of flight eq (registration 7.b8; A2.7; A3.5 I1; A4.5). A DERIVED launcher: F\R\launch-grader.mjs (sha12 recorded
// in the report) is imported, not edited, because nothing outside E is written. It CALLS THE CLAUDE CLI (a model call) when run for real: the controller runs it,
// never a self-test. The calibration (E\launch-grader-eq-cal.mjs) only ever runs it with a stand-in for the claude binary and a tripwire `claude` on PATH.
//
//   node launch-grader-eq.mjs <blind-N.gX> --model-id <id> [--attempt k] [--dry-run]
//        SLOT mode: grades E\blind\pairs.blind-N.json as grader X, verdicts E\blind\verdicts.blind-N.gX.json (the G blind files; audit: audit-graders.mjs --blind-dir E\blind).
//   node launch-grader-eq.mjs <tag> --pairs <C:\ file> --verdicts <C:\ file> --model-id <id> [--attempt k] [--dry-run]
//        PAIRS mode (ruling 2): ONE per-arm judge export (or the pilot) graded WITHOUT the blind-N layout; the pairs file is read where it is, the verdicts file
//        is written where named (it must not exist; its folder must). <tag> = inapp | captured-high | captured-high-r2 | ... | pilot (never blind-N.gX). Audit: eq-audit.mjs.
//   node launch-grader-eq.mjs cwdprobe-1|cwdprobe-2 --probe --model-id <id>      the pinned probes (cwdprobe-2 only after cwdprobe-1 read exit 0, one Read, one Write)
//   node launch-grader-eq.mjs cwdprobe-3 --probe                                 the ALIAS read: WITHOUT --model-id (argv shows opus); only after cwdprobe-2
//   node launch-grader-eq.mjs --make-pilot <C:\ dir>                              a synthetic pairs.blind-1.json (4 invented items, no real answer, no key)
//
// What differs from F\R\launch-grader.mjs (every difference is one of the registration's):
//   * `--model-id <id>` replaces the alias in the argv (A3.5 I1). A REAL launch without it is REFUSED (the user's pin: no other model grades this hour), except
//     cwdprobe-3, which must NOT carry it (A4.5: it reads what the alias resolves to). --dry-run without it prints `--model opus` and says it is not pinned.
//   * after an attempt the model the CLI reports (modelUsage) must be the pinned id, else exit 1 (the transcript-based h40d-grader-models.mjs stays the authority).
//   * probes cwdprobe-1/2/3; PAIRS mode; the dispatch text is E\eq-grader-dispatch.txt; grader cwds are E\grading\<slot>-a<k>; the slot lock is E\grading\.slots.
//   * no --add-dir anywhere (source check: `grep -c add-dir` over the FLAGS and probe-args lines = 0; the cal records it).
// Fails loudly: a TURN_FAKE_CLAUDE / TURN_PROJECTS in the environment without EQ_CAL_FAKE=1 is refused (a fake grader must never produce a real grade).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const CAL = process.env.EQ_CAL_FAKE === '1';
if (!CAL && (process.env.TURN_FAKE_CLAUDE || process.env.TURN_PROJECTS || process.env.EQ_GRADING_DIR || process.env.EQ_DISPATCH || process.env.EQ_BLIND_DIR || process.env.EQ_LOG_DIR)) {
    console.error('launch-grader-eq: REFUSED: a test seam (TURN_FAKE_CLAUDE, TURN_PROJECTS, EQ_GRADING_DIR, EQ_DISPATCH, EQ_BLIND_DIR, EQ_LOG_DIR) is set without EQ_CAL_FAKE=1; a stand-in grader must never produce a real grade');
    process.exit(2);
}
const GRADING = CAL && process.env.EQ_GRADING_DIR ? process.env.EQ_GRADING_DIR : path.join(E, 'grading');
const BLIND = CAL && process.env.EQ_BLIND_DIR ? process.env.EQ_BLIND_DIR : path.join(E, 'blind');
const LOGS = CAL && process.env.EQ_LOG_DIR ? process.env.EQ_LOG_DIR : E;    // probe logs and E\launches.arms.jsonl
export const DISPATCH = CAL && process.env.EQ_DISPATCH ? process.env.EQ_DISPATCH : path.join(E, 'eq-grader-dispatch.txt');
process.env.TURN_GRADING_DIR = GRADING;          // the original reads these at import: set BEFORE the dynamic import below
process.env.FQ_OUT_DIR = E;
const L = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
const { verdictFileProblem } = await import(pathToFileURL(path.join(F_R, 'legs-decide.mjs')).href);
const { scan } = await import(pathToFileURL(path.join(F_R, 'check-grader-memory.mjs')).href);
export const PIN = 'claude-opus-5-5';
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
export const MODEL_ID_RX = /^claude-[a-z0-9][a-z0-9.-]*$/;
const isDrive = (p) => /^[A-Za-z]:[\\/]/.test(p ?? '');
const winP = (p) => path.resolve(p).replace(/\//g, '\\');

/** The argv shared by every grader and probe. `--setting-sources project,local`: USER settings (claude-mem plugin, SessionStart hook) are never loaded (live defect 05:4x, memory LOADED claudeMem=5). NO add-dir here (the source check counts that word on this line). */
export const FLAGS = (prompt, model) => ['-p', prompt, '--model', model, '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config', '--setting-sources', 'project,local'];
export const probeArgsEq = ({ prompt, inFile, outFile, model }) => { const rules = [L.absRule('Read', inFile), L.absRule('Edit', outFile)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
export const pairsArgs = ({ prompt, pairs, verdicts, rubric = A.RUBRIC, model }) => { const rules = [L.absRule('Read', pairs), L.absRule('Read', rubric), L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
export const slotArgs = ({ prompt, blindDir, slot, model }) => { const f = A.ownFiles(slot); const rules = [L.absRule('Read', path.join(blindDir, f.pairs)), L.absRule('Read', A.RUBRIC), L.absRule('Edit', path.join(blindDir, f.verdicts))]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
/** The dispatch text for PAIRS mode: the template with ONLY the pairs path, the verdicts path and the tag substituted (the same three replacements as the original). */
export const buildPromptFiles = (template, { pairs, verdicts, tag }) => template.replace('RUN\\<pairs file>', () => winP(pairs)).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${winP(verdicts)}`).replace('`TAG`', () => `\`${tag}\``);
/** The model the CLI reports must be the pin (or the pin with a bracket/date suffix). */
export const modelMatchesPin = (model, pin) => !!model && model.split('+').every((m) => m === pin || m.startsWith(`${pin}[`) || m.startsWith(`${pin}-2`));

async function main() {
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const usage = (why) => { console.error(`launch-grader-eq: ${why}\nusage: node launch-grader-eq.mjs <blind-N.gX> --model-id <id> [--attempt k] [--dry-run]\n       node launch-grader-eq.mjs <tag> --pairs <file> --verdicts <file> --model-id <id> [--attempt k] [--dry-run]\n       node launch-grader-eq.mjs cwdprobe-1|cwdprobe-2 --probe --model-id <id> | cwdprobe-3 --probe | --make-pilot <C:\\ dir>   (add --dry-run to any launch)`); process.exit(2); };
    const known = new Set(['--attempt', '--dry-run', '--pairs', '--verdicts', '--model-id', '--probe', '--make-pilot']);
    const valued = new Set(['--attempt', '--pairs', '--verdicts', '--model-id', '--make-pilot']);
    for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--') && !known.has(argv[i])) usage(`unknown option ${argv[i]}`); if (valued.has(argv[i]) && (argv[i + 1] == null || argv[i + 1].startsWith('--'))) usage(`${argv[i]} needs a value`); }
    const dry = argv.includes('--dry-run');
    const modelId = arg('--model-id');
    if (modelId != null && !MODEL_ID_RX.test(modelId)) usage(`--model-id "${modelId}" is not an exact model id (claude-...): an alias such as opus is not a pin`);

    if (argv.includes('--make-pilot')) {
        const dir = arg('--make-pilot');
        if (!isDrive(dir)) usage('--make-pilot needs a C:\\ directory');
        if (fs.existsSync(path.join(dir, 'pairs.blind-1.json'))) usage(`${dir} already holds pairs.blind-1.json`);
        const J = await import(pathToFileURL(path.join(A.MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
        const items = [
            ['P1', 'What is the difference between a process and a thread?', 'A process has its own address space; threads of one process share memory and are cheaper to create and switch between.'],
            ['P2', 'When would you pick a hash map over a balanced tree?', 'When you need average constant-time lookups and do not need ordered iteration; a tree gives ordered keys and worst-case log n.'],
            ['P3', 'Explain what a database index is for.', 'It is a separate structure that lets the database find rows by a column without scanning the whole table, at the cost of slower writes.'],
            ['P4', 'What does idempotent mean for an HTTP method?', 'Repeating the same request leaves the server in the same state as sending it once, so PUT and DELETE are idempotent and POST is not.'],
        ].map(([id, q, a], i) => ({ key: `pilot:${id}#${i + 1}`, id: `pilot:${id}`, kind: 'spoken', level: null, topic: null, question: q, heard: q, source: 'answers-pass', answer: a }));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'pairs.blind-1.json'), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        console.log(`pilot folder ${dir}: pairs.blind-1.json with ${items.length} synthetic items (no real answer, no key)`);
        return;
    }
    const attempt = Number(arg('--attempt') ?? 1);
    if (!Number.isInteger(attempt) || attempt < 1) usage('--attempt must be a positive integer');

    // ── probes ──
    const probe = argv.find((a) => /^cwdprobe-[123]$/.test(a));
    if (argv.includes('--probe') !== !!probe) usage('--probe goes with exactly cwdprobe-1, cwdprobe-2 or cwdprobe-3');
    if (probe) {
        const k = Number(probe.slice(-1));
        if (attempt !== 1) usage('a probe runs as attempt 1 (cwdprobe-<n>-a1)');
        if (k === 3 && modelId) usage('cwdprobe-3 reads what the ALIAS resolves to: it must not carry --model-id (A4.5)');
        if (k !== 3 && !modelId && !dry) usage(`${probe} is a pinned probe: --model-id claude-opus-5-5 is required for a real launch`);
        const model = k === 3 ? 'opus' : modelId ?? 'opus';
        const outLog = path.join(LOGS, 'grader-cwd.probes.out.txt'), launchesFile = path.join(LOGS, 'grader-cwd.launches.jsonl');
        const lines = [`$ node launch-grader-eq.mjs ${argv.join(' ')}`];
        const say = (s) => { lines.push(s); console.log(s); };
        const finish = (code) => { if (!dry) { fs.mkdirSync(LOGS, { recursive: true }); fs.appendFileSync(outLog, `${lines.join('\n')}\n\n`); } process.exit(code); };
        if (k > 1) {
            // the LAST record of the previous probe slot (an earlier failed attempt may precede it); memory and tools are computed from that session's transcript, the records carry neither
            const prev = L.readLaunches(launchesFile).filter((l) => l.slot === `cwdprobe-${k - 1}`).pop();
            const t = prev?.session_id ? L.findSession(prev.session_id) : null;
            const txt = t ? fs.readFileSync(t, 'utf8') : '';
            const tools = t ? L.toolCounts(txt) : null;
            const prevMem = t ? scan(txt) : null;
            // M5: the previous probe must also have read the pin and memory ABSENT (A2.7 / A3.5 m11), not only exited 0 with one Read and one Write
            if (!prev || prev.exit !== 0 || !tools || tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2 || !modelMatchesPin(prev.model, PIN) || prev.memoryDir === 'non-empty' || !prevMem || prevMem.loaded) { say(`${probe}: ${dry ? 'a real launch would be ' : ''}REFUSED -- it starts only after cwdprobe-${k - 1}'s line in ${path.basename(launchesFile)} shows exit 0, the pinned model, memory ABSENT and its transcript exactly one Read and one Write (got ${prev ? `exit ${prev.exit}, model ${prev.model}, memory ${prevMem ? (prevMem.loaded ? 'LOADED' : 'ABSENT') : 'unknown'}, tools ${JSON.stringify(tools)}` : `no cwdprobe-${k - 1} line`})`); if (!dry) finish(2); }
        }
        const inFile = path.join(GRADING, 'probe-input.txt');
        if (!dry) { fs.mkdirSync(GRADING, { recursive: true }); if (!fs.existsSync(inFile)) fs.writeFileSync(inFile, 'synthetic line one\nsynthetic line two\nsynthetic line three\n'); }
        const cwd = path.join(GRADING, `${probe}-a1`), outFile = path.join(cwd, 'out.txt');
        const { args, rules } = probeArgsEq({ prompt: L.probePrompt(inFile, outFile), inFile, outFile, model });
        say(`claude ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
        say(`permission rules: ${rules.join(' | ')}`);
        if (k === 3) say('alias read: this probe carries no --model-id; its transcript model is what `opus` resolves to today (reported, decides nothing)');
        if (dry) { say(`DRY RUN ${probe}: model ${model}${modelId || k === 3 ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl ${L.slugJsonls(cwd).length}; memory entries ${L.memoryEntries(cwd).length}`); finish(0); }
        const r = L.launchAttempt({ slot: probe, attempt, cwd, args });
        if (r.error) { say(`${probe}: REFUSED ${r.error}`); finish(2); }
        fs.appendFileSync(launchesFile, `${L.launchRecord(r.record)}\n`);
        const wrote = fs.existsSync(outFile);
        const pinned = k === 3 || modelMatchesPin(r.record.model, modelId);
        const good = r.record.exit === 0 && r.record.slugJsonl === 1 && r.record.memoryDir !== 'non-empty' && r.memory?.status === 'ABSENT' && r.memory.projectMemory === 0 && r.memory.claudeMem === 0
            && r.tools.Read === 1 && r.tools.Write === 1 && Object.keys(r.tools).length === 2 && wrote && pinned;
        say(`${probe} a1: session ${r.record.session_id} model ${r.record.model} exit ${r.record.exit} slugJsonl ${r.record.slugJsonl} memoryDir ${r.record.memoryDir} memory ${r.memory ? `${r.memory.status} projectMemory=${r.memory.projectMemory} claudeMem=${r.memory.claudeMem}` : 'transcript not found'} tools ${JSON.stringify(r.tools)} out.txt ${wrote ? 'written' : 'MISSING'}${pinned ? '' : ` MODEL IS NOT THE PIN ${modelId}`} -> ${good ? 'ok' : 'NOT OK'}`);
        say(good ? `${probe} OK (the controller still runs check-grader-memory.mjs and h40d-grader-models.mjs on session:${r.record.session_id})` : `${probe} FAILED: nothing runs on a failed probe; the transcript is kept`);
        finish(good ? 0 : 1);
    }

    // ── a grader attempt: slot mode or pairs mode ──
    const slot = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(argv[i - 1])));
    if (!slot) usage('no slot or tag given');
    const pairsArg = arg('--pairs'), verdictsArg = arg('--verdicts');
    if (!!pairsArg !== !!verdictsArg) usage('--pairs and --verdicts go together');
    if (!modelId && !dry) usage('a real grader launch needs --model-id claude-opus-5-5 (the user\'s pin: no other model grades this hour)');
    const model = modelId ?? 'opus';
    const template = A.dispatchTemplate(DISPATCH);
    if (!template) usage(`${DISPATCH} holds no dispatch marker`);
    let pairsPath, verdictsPath, prompt, built, why, tag = slot, blindDir = null, launchesFile, keysOf;
    if (pairsArg) {
        if (/^blind-\d+\.g\d$/.test(slot)) usage(`the tag ${slot} is a blind SLOT name: slot mode takes no --pairs; pairs mode takes a per-arm tag`);
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/.test(slot)) usage(`the tag "${slot}" is not a plain tag (letters, digits, . _ -)`);
        if (!isDrive(pairsArg) || !isDrive(verdictsArg)) usage('--pairs and --verdicts must be absolute C:\\ paths');
        pairsPath = path.resolve(pairsArg); verdictsPath = path.resolve(verdictsArg);
        if (!fs.existsSync(pairsPath)) usage(`${pairsPath} does not exist`);
        if (fs.existsSync(verdictsPath)) usage(`${verdictsPath} already exists: move the earlier attempt's verdicts away before a re-grade`);
        if (!fs.existsSync(path.dirname(verdictsPath))) usage(`the folder of ${verdictsPath} does not exist`);
        let items; try { items = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items; } catch { usage(`${pairsPath} is not a pairs JSON file`); }
        if (!Array.isArray(items) || !items.length || new Set(items.map((i) => i.key)).size !== items.length || items.some((i) => typeof i.key !== 'string' || !i.key)) usage(`${pairsPath}: items must be a non-empty list with unique string keys`);
        keysOf = Object.fromEntries(items.map((i) => [i.key, 1]));
        prompt = buildPromptFiles(template, { pairs: pairsPath, verdicts: verdictsPath, tag });
        why = A.dispatchProblem(prompt, template, { blindDir: path.dirname(pairsPath), files: { pairs: pairsPath, verdicts: verdictsPath }, tag });
        built = pairsArgs({ prompt, pairs: pairsPath, verdicts: verdictsPath, model });
        launchesFile = path.join(LOGS, 'launches.arms.jsonl');
    } else {
        if (!/^blind-\d+\.g\d$/.test(slot)) usage(`"${slot}" is not a blind slot (blind-N.gX); a per-arm file needs --pairs and --verdicts`);
        blindDir = BLIND;
        const f = A.ownFiles(slot);
        pairsPath = path.join(blindDir, f.pairs); verdictsPath = path.join(blindDir, f.verdicts);
        if (!fs.existsSync(pairsPath)) usage(`${pairsPath} does not exist`);
        if (fs.existsSync(verdictsPath)) usage(`${f.verdicts} already exists in ${blindDir}: move the earlier attempt's verdicts away before a re-grade`);
        keysOf = Object.fromEntries(JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items.map((i) => [i.key, 1]));
        prompt = L.buildPrompt(template, { blindDir, slot });
        why = A.dispatchProblem(prompt, template, { blindDir, files: f, tag: slot });
        built = slotArgs({ prompt, blindDir, slot, model });
        launchesFile = path.join(blindDir, 'launches.jsonl');
    }
    if (why) usage(`the built prompt does not pass the audit's own dispatch check: ${why}`);
    const { args, rules } = built;
    const cwd = path.join(GRADING, `${slot}-a${attempt}`);
    const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
    if (dry) {
        console.log(`DRY RUN ${slot} attempt ${attempt}: mode ${pairsArg ? 'pairs' : 'slot'}; model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl ${L.slugJsonls(cwd).length}; memory entries ${L.memoryEntries(cwd).length}`);
        console.log(`dispatch file sha12 ${sha12(fs.readFileSync(DISPATCH))}`);
        console.log(argvLine);
        console.log(`permission rules: ${rules.join(' | ')}`);
        return;
    }
    console.log(argvLine);
    const r = L.launchAttempt({ slot, attempt, cwd, args });
    if (r.error) { console.log(`${slot} a${attempt}: REFUSED ${r.error}`); process.exit(2); }
    fs.mkdirSync(path.dirname(launchesFile), { recursive: true });
    fs.appendFileSync(launchesFile, `${L.launchRecord(r.record)}\n`);
    if (!r.record.model && Object.keys(r.tools).length === 0) console.log(`${slot} a${attempt}: RATE-LIMIT-REFUSAL? no model and no tool call in the session: not a grader attempt, it consumes no replacement (registration section 6); wait for the reset and relaunch as attempt ${attempt} with a fresh cwd name`);
    let vp = 'verdicts file MISSING/INVALID';
    try {
        const p = verdictFileProblem(JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), keysOf);
        vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${Object.keys(keysOf).length} keys)`;
    } catch { /* absent or unparsable: vp stays */ }
    const pinned = modelMatchesPin(r.record.model, modelId);
    const mem = r.memory ? `${r.memory.status} projectMemory=${r.memory.projectMemory} claudeMem=${r.memory.claudeMem}` : 'transcript not found';
    console.log(`${slot} a${attempt}: session ${r.record.session_id} model ${r.record.model} exit ${r.record.exit} cwd ${path.basename(cwd)} slugJsonl ${r.record.slugJsonl} memoryDir ${r.record.memoryDir} memory ${mem} tools ${JSON.stringify(r.tools)} ${vp}${pinned ? '' : ` MODEL IS NOT THE PIN ${modelId}`}`);
    process.exit(r.record.exit === 0 && r.record.slugJsonl === 1 && r.record.memoryDir !== 'non-empty' && /valid on its pairs/.test(vp) && pinned ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
