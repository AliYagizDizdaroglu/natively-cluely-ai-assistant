// launch-grader-diag38.mjs: the grader launcher of the diag38 diagnostic (DESIGN.md). DERIVED from LAB\grade\launch-grader-rd.mjs (read, never edited; its argv form, pin, post-launch
// checks and gate are copied here because importing it would overwrite the grading-dir environment the shared attempt machinery reads at import). The attempt machinery
// (followup-turn\R\launch-grader.mjs) and the audit's dispatch check are imported.
// IT CALLS THE CLAUDE CLI (a model call) when a grader or probe is launched FOR REAL: the controller runs it, never a self-test. --plan and --dry-run call nothing; the calibration
// (cal-launch-grader-diag38.mjs) runs it against a stand-in for the claude binary with PATH stripped.
//
//   node launch-grader-diag38.mjs --plan                                                   pairs files, verdict paths, the gate; calls nothing
//   node launch-grader-diag38.mjs diag38-N --model-id claude-opus-5-5 [--attempt k] [--dry-run]    one grader of pairs\pairs.diag38-N.json (ONE grader per file: each answer gets one grade)
//   node launch-grader-diag38.mjs cwdprobe-1|cwdprobe-2 --probe --model-id claude-opus-5-5 [--dry-run]    OWN probes, only when the controller asks (an alternative to the accepted rd record)
//   node launch-grader-diag38.mjs cwdprobe-3 --probe [--dry-run]                          the alias read (after cwdprobe-2)
//
// What it refuses (exit 2, nothing launched): a tag other than diag38-1..N; a pairs file that is not LAB\diag38\pairs\pairs.diag38-N.json (anything else in pairs\, e.g. a key, refuses the
// folder); a real launch without --model-id claude-opus-5-5 exactly; a gate that is not passed; existing verdicts; a reused cwd. The gate passes on EITHER (a) the registered launcher's three
// probe records, accepted explicitly because they were written by launch-grader-rd.mjs sha12 ACCEPTED_RD_LAUNCHER (and that file still has that sha), each re-read from its transcript,
// OR (b) this launcher's own three probes, each re-read the same way.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const RD_GRADE = path.join(HERE, '..', 'grade');
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
export const ACCEPTED_RD_LAUNCHER = 'edfef2aa8a98';   // sha12 of launch-grader-rd.mjs that wrote the passed probes (grader-cwd.launches.jsonl, 2026-10-07 02:25)
const CAL = process.env.DIAG38_CAL === '1';
const SEAMS = ['TURN_FAKE_CLAUDE', 'TURN_PROJECTS', 'DIAG38_GRADING_DIR', 'DIAG38_LOG_DIR', 'DIAG38_VERDICT_DIR', 'DIAG38_PAIRS_DIR', 'DIAG38_DISPATCH', 'DIAG38_RD_PROBES', 'DIAG38_RD_LAUNCHER'];
if (!CAL && SEAMS.some((s) => process.env[s])) {
    console.error(`launch-grader-diag38: REFUSED: a test seam (${SEAMS.join(', ')}) is set without DIAG38_CAL=1; a stand-in grader must never produce a real grade`);
    process.exit(2);
}
const seam = (name, dflt) => (CAL && process.env[name] ? process.env[name] : dflt);
const GRADING = seam('DIAG38_GRADING_DIR', path.join(HERE, 'grading'));
const VERDICTS = seam('DIAG38_VERDICT_DIR', path.join(HERE, 'verdicts'));
const LOGS = seam('DIAG38_LOG_DIR', HERE);                                  // launches.jsonl, grader-cwd.launches.jsonl, grader-cwd.probes.out.txt
export const PAIRS_DIR = seam('DIAG38_PAIRS_DIR', path.join(HERE, 'pairs'));
export const DISPATCH = seam('DIAG38_DISPATCH', path.join(RD_GRADE, 'rd-grader-dispatch.txt'));
const RD_PROBES = seam('DIAG38_RD_PROBES', path.join(RD_GRADE, 'grader-cwd.launches.jsonl'));
const RD_LAUNCHER = seam('DIAG38_RD_LAUNCHER', path.join(RD_GRADE, 'launch-grader-rd.mjs'));
process.env.TURN_GRADING_DIR = GRADING;          // the shared machinery reads these at import: set BEFORE the dynamic imports below
process.env.FQ_OUT_DIR = HERE;
const L = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
const { scan } = await import(pathToFileURL(path.join(F_R, 'check-grader-memory.mjs')).href);

export const PIN = 'claude-opus-5-5';
export const N_FILES = 2;                         // = diag38.mjs N_FILES (the calibration compares them)
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
export const LAUNCHER_SHA12 = sha12(fs.readFileSync(SELF));
const winP = (p) => path.resolve(p).replace(/\//g, '\\');
const GATED_TOOLS = ['Read', 'Write', 'Edit'];

// ---------------------------------------------------------------- argv (launch-grader-rd's form, copied)
export const FLAGS = (prompt, model) => ['-p', prompt, '--model', model, '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config', '--setting-sources', 'project,local'];
export const probeArgsD = ({ prompt, inFile, outFile, model }) => { const rules = [L.absRule('Read', inFile), L.absRule('Edit', outFile)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
export const pairsArgs = ({ prompt, pairs, verdicts, rubric = A.RUBRIC, model }) => { const rules = [L.absRule('Read', pairs), L.absRule('Read', rubric), L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
export const buildPromptFiles = (template, { pairs, verdicts, tag }) => template.replace('RUN\\<pairs file>', () => winP(pairs)).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${winP(verdicts)}`).replace('`TAG`', () => `\`${tag}\``);
export const modelMatchesPin = (model, pin) => !!model && model.split('+').every((m) => m === pin);   // exactly the pin: no suffix, no alias, no other model
export const transcriptModels = (text) => [...new Set(text.split('\n').flatMap((line) => { try { const j = JSON.parse(line); return j?.type === 'assistant' && j.message?.model ? [j.message.model] : []; } catch { return []; } }).filter((m) => m !== '<synthetic>'))];

// ---------------------------------------------------------------- the tags and files
/** { file, pairsPath, verdictsPath } of a tag diag38-N (N = 1..N_FILES), else null. Nothing else is graded by this launcher. */
export function parseTag(tag) {
    const m = /^diag38-(\d+)$/.exec(tag ?? '');
    if (!m || +m[1] < 1 || +m[1] > N_FILES) return null;
    return { file: tag, pairsPath: path.join(PAIRS_DIR, `pairs.${tag}.json`), verdictsPath: path.join(VERDICTS, `verdicts.${tag}.json`) };
}
/** null when the pairs folder holds only pairs.diag38-N.json files (a key or any other file in it would reach the grader's reach); else why not. */
export function pairsDirProblem(dir = PAIRS_DIR) {
    if (!fs.existsSync(dir)) return `${dir} does not exist (run diag38.mjs --export first)`;
    const bad = fs.readdirSync(dir).filter((f) => !/^pairs\.diag38-\d+\.json$/.test(f));
    return bad.length ? `${dir} holds files that are not pairs.diag38-N.json: ${bad.join(', ')}` : null;
}

// ---------------------------------------------------------------- the probe gate
/** null when a probe's last record is clean: exit 0, written by `launcherSha`, its transcript found and re-read (memory ABSENT, exactly one Read and one Write, nothing else), the models = the pin (not for the alias probe). */
export function probeRecordProblem(rec, { alias = false, projects = L.PROJECTS, launcherSha = LAUNCHER_SHA12 } = {}) {
    if (!rec) return 'no record';
    if (rec.exit !== 0) return `exit ${rec.exit}`;
    if (rec.launcher !== launcherSha) return `written by another launcher version (${rec.launcher ?? 'none'}, expected ${launcherSha})`;
    if (rec.slugJsonl !== 1) return `slugJsonl ${rec.slugJsonl}`;
    if (rec.memoryDir === 'non-empty') return 'the projects folder holds a non-empty memory';
    const t = rec.session_id ? L.findSession(rec.session_id, projects) : null;
    if (!t) return 'its transcript was not found';
    const text = fs.readFileSync(t, 'utf8');
    const tools = L.toolCounts(text);
    if (tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) return `tools ${JSON.stringify(tools)} (need exactly one Read and one Write)`;
    const mem = scan(text);
    if (mem.loaded) return `memory LOADED (project ${mem.projectMemory.total}, claude-mem ${mem.claudeMem.total})`;
    if (!alias) {
        if (!modelMatchesPin(rec.model, PIN)) return `the CLI reports model ${rec.model}, not the pin`;
        const ms = transcriptModels(text);
        if (!ms.length || !ms.every((m) => modelMatchesPin(m, PIN))) return `transcript models ${JSON.stringify(ms)} are not the pin`;
    }
    return null;
}
const gateOf = ({ file, launcherSha, projects = L.PROJECTS }) => {
    const recs = L.readLaunches(file);
    const last = (slot) => recs.filter((r) => r.slot === slot).at(-1);
    const problems = [];
    for (const [slot, alias] of [['cwdprobe-1', false], ['cwdprobe-2', false], ['cwdprobe-3', true]]) { const p = probeRecordProblem(last(slot), { alias, projects, launcherSha }); if (p) problems.push(`${slot}: ${p}`); }
    return { ok: problems.length === 0, problems };
};
/** The gate a real grader launch needs: the registered launcher's accepted probes (by sha) OR this launcher's own. */
export function probeGate({ ownFile, rdFile = RD_PROBES, rdLauncher = RD_LAUNCHER, projects = L.PROJECTS } = {}) {
    const rdNow = fs.existsSync(rdLauncher) ? sha12(fs.readFileSync(rdLauncher)) : null;
    const rd = rdNow !== ACCEPTED_RD_LAUNCHER ? { ok: false, problems: [`launch-grader-rd.mjs is now ${rdNow ?? 'missing'}, not the accepted ${ACCEPTED_RD_LAUNCHER}`] } : gateOf({ file: rdFile, launcherSha: ACCEPTED_RD_LAUNCHER, projects });
    const own = gateOf({ file: ownFile, launcherSha: LAUNCHER_SHA12, projects });
    return { ok: rd.ok || own.ok, via: rd.ok ? `registered launcher's probes (sha12 ${ACCEPTED_RD_LAUNCHER})` : own.ok ? `own probes (sha12 ${LAUNCHER_SHA12})` : null, problems: rd.ok || own.ok ? [] : [`registered: ${rd.problems.join('; ')}`, `own: ${own.problems.join('; ')}`] };
}
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
    const refuse = (why) => { console.log(`launch-grader-diag38: REFUSED: ${why}`); process.exit(2); };
    const known = new Set(['--attempt', '--dry-run', '--model-id', '--probe', '--plan']);
    const valued = new Set(['--attempt', '--model-id']);
    for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--') && !known.has(argv[i])) refuse(`unknown option ${argv[i]}`); if (valued.has(argv[i]) && (argv[i + 1] == null || argv[i + 1].startsWith('--'))) refuse(`${argv[i]} needs a value`); }
    const dry = argv.includes('--dry-run');
    const modelId = arg('--model-id');
    if (modelId != null && modelId !== PIN) refuse(`--model-id "${modelId}" is not the pin: a grader or pinned probe takes exactly --model-id ${PIN} (no alias, no other model)`);
    const attempt = Number(arg('--attempt') ?? 1);
    if (!Number.isInteger(attempt) || attempt < 1) refuse('--attempt must be a positive integer');
    const launchesFile = path.join(LOGS, 'launches.jsonl'), probeFile = path.join(LOGS, 'grader-cwd.launches.jsonl'), probeOut = path.join(LOGS, 'grader-cwd.probes.out.txt');

    // ---- own probes (a flag: the controller asks for them; the accepted registered record is the default)
    const probe = argv.find((a) => /^cwdprobe-[123]$/.test(a));
    if (argv.includes('--probe') !== !!probe) refuse('--probe goes with exactly cwdprobe-1, cwdprobe-2 or cwdprobe-3');
    if (probe) {
        const k = Number(probe.slice(-1));
        if (attempt !== 1) refuse('a probe runs as attempt 1 (cwdprobe-<n>-a1)');
        if (k === 3 && modelId) refuse('cwdprobe-3 reads what the ALIAS resolves to: it must not carry --model-id');
        if (k !== 3 && !modelId && !dry) refuse(`${probe} is a pinned probe: --model-id ${PIN} is required for a real launch`);
        const model = k === 3 ? 'opus' : modelId ?? 'opus';
        const lines = [`$ node launch-grader-diag38.mjs ${argv.join(' ')}`];
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
        const { args, rules } = probeArgsD({ prompt: L.probePrompt(inFile, outFile), inFile, outFile, model });
        say(`claude ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
        say(`permission rules: ${rules.join(' | ')}`);
        if (dry) { say(`DRY RUN ${probe}: model ${model}${modelId || k === 3 ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'})`); finish(0); }
        const r = L.launchAttempt({ slot: probe, attempt, cwd, args });
        if (r.error) { say(`${probe}: REFUSED ${r.error}`); finish(2); }
        const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
        const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models: transcriptModels(text) };
        fs.mkdirSync(LOGS, { recursive: true });
        fs.appendFileSync(probeFile, `${L.launchRecord(rec)}\n`);
        const why = probeRecordProblem(rec, { alias: k === 3 }), wrote = fs.existsSync(outFile);
        say(`${probe} a1: session ${rec.session_id} model ${rec.model} exit ${rec.exit} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${rec.memory} tools ${JSON.stringify(rec.tools)} transcript models ${JSON.stringify(rec.models)} out.txt ${wrote ? 'written' : 'MISSING'} -> ${why || !wrote ? `NOT OK (${why ?? 'no out.txt'})` : 'ok'}`);
        say(!why && wrote ? `${probe} OK (the controller still runs check-grader-memory.mjs on session:${rec.session_id})` : `${probe} FAILED: no grader runs on a failed probe; the transcript is kept`);
        finish(!why && wrote ? 0 : 1);
    }

    const gate = probeGate({ ownFile: probeFile });

    if (argv.includes('--plan')) {
        const blockers = [];
        const dp = pairsDirProblem();
        if (dp) blockers.push(dp);
        console.log(`PLAN grader model pin ${PIN}; launcher sha12 ${LAUNCHER_SHA12}`);
        for (let n = 1; n <= N_FILES; n++) {
            const info = parseTag(`diag38-${n}`);
            let items = null; try { items = JSON.parse(fs.readFileSync(info.pairsPath, 'utf8')).items.length; } catch { /* absent */ }
            if (items === null) blockers.push(`${info.file}: pairs file missing or unreadable`);
            if (fs.existsSync(info.verdictsPath)) blockers.push(`${info.file}: a verdicts file already exists`);
            console.log(`PLAN ${info.file.padEnd(9)} graders-of-this-file=1 pairs=${items === null ? 'MISSING' : `${items} items`} verdicts=${fs.existsSync(info.verdictsPath) ? 'EXISTS' : 'to write'}`);
        }
        console.log(`PLAN probe gate: ${gate.ok ? `OK via ${gate.via}` : `BLOCKED (${gate.problems.join(' | ')})`}`);
        console.log(blockers.length ? `PLAN BLOCKED: ${blockers.join(' | ')}` : 'PLAN OK: nothing blocks the launches except the probe gate above (no model was called)');
        process.exit(blockers.length ? 3 : 0);
    }

    // ---- one grader attempt
    const tag = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(argv[i - 1])));
    if (!tag) refuse('no tag given (diag38-N)');
    const info = parseTag(tag);
    if (!info) refuse(`"${tag}" is not a tag of this launcher (diag38-1..${N_FILES} only)`);
    if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${PIN} (the user's pin: no other model grades)`);
    const model = modelId ?? 'opus';
    const dp = pairsDirProblem();
    if (dp) refuse(dp);
    const { pairsPath, verdictsPath } = info;
    if (path.relative(PAIRS_DIR, path.resolve(pairsPath)).startsWith('..')) refuse('the pairs file is outside LAB\\diag38\\pairs');
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
        console.log(`DRY RUN ${tag} attempt ${attempt}: 1 grader for this file; ${items.length} items; model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'})`);
        console.log(`dispatch file sha12 ${sha12(fs.readFileSync(DISPATCH))}`);
        console.log(argvLine);
        console.log(`permission rules: ${rules.join(' | ')}`);
        console.log(`probe gate: ${gate.ok ? `OK via ${gate.via}` : `BLOCKED (${gate.problems.join(' | ')}); a real launch would be refused`}`);
        return;
    }
    if (!gate.ok) refuse(`the probe gate is not passed: ${gate.problems.join(' | ')}`);
    console.log(argvLine);
    const r = L.launchAttempt({ slot: tag, attempt, cwd, args });
    if (r.error) refuse(r.error);
    const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
    const models = transcriptModels(text);
    const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));
    const rec = { ...r.record, launcher: LAUNCHER_SHA12, gateVia: gate.via, memory: r.memory?.status ?? 'unknown', tools: r.tools, models, pinned, pairsSha12: sha12(fs.readFileSync(pairsPath)), verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null };
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
