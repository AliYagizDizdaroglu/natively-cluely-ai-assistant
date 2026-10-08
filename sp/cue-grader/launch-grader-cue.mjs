// launch-grader-cue.mjs: the grader launcher of the cue grader (SPEC-cue-grader.md 5.1). A NEW launcher: it does NOT import launch-grader-rd.mjs (that file has top-level side effects and its gate needs the alias probe,
// router-default's folders and the flight dispatch). The attempt machinery comes from followup-turn\R\launch-grader.mjs (L) and the memory scan from check-grader-memory.mjs, both imported read-only AFTER this
// file has pointed their two import-time folders (TURN_GRADING_DIR, FQ_OUT_DIR) into LAB. Five helpers are COPIED verbatim from launch-grader-rd.mjs (provenance below); the calibration proves the copies identical to rd's text.
// IT CALLS THE CLAUDE CLI (a model call) when a grader or probe is launched FOR REAL: the controller runs it, never a self-test. --plan and --dry-run call nothing; cal-launch-grader-cue.mjs runs this file against a stand-in
// for the claude binary with PATH stripped.
//
//   node launch-grader-cue.mjs --plan
//   node launch-grader-cue.mjs cwdprobe-1|cwdprobe-2 --probe --model-id claude-opus-5-5 [--dry-run]     the two pinned, memory-clean probes (2 only after 1 read clean)
//   node launch-grader-cue.mjs <tag> --model-id claude-opus-5-5 [--attempt k] [--dry-run]
//        <tag> = cal-1..3.g1|g2 | rev-1..4.g1|g2 | r1-inapp.g1|g2 | r1-high | r1-low | h40d-inapp.g1|g2 | h40d-high | h40d-low
//
// What it refuses (exit 2, nothing launched): a seam set without CUE_CAL_FAKE=1; a seam path that resolves outside LAB; --model-id other than exactly claude-opus-5-5, or absent on a real launch; a probe or grader launch
// when the two logs together already hold 26 records (the hard cap, probes and failed attempts included); a grader before BOTH pinned probes read clean (recorded by THIS launcher's sha); a real tag (r1-*, h40d-*) while
// rubric.sha or spec.sha is missing, and ANY tag while an existing hash file does not match; a non-pairs file in LAB\pairs\; an existing verdicts file; a reused cwd; h40d-* while r1's in-app agreement is below 75%.
// After a launch the transcript is re-read: memory ABSENT, tools Read/Write/Edit only, every tool path one of the three own files, the model of every assistant message = the pin; the record written to launches.jsonl carries
// those facts and THIS launcher's sha12 (L's record has no `launcher` field: this file adds it, or probeRecordProblem would refuse every probe).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ALL_TAGS, parseTag, hashProblem, dirsOf, pairsName, verdictsName, cwdName, pairsProblem, lineCountsOf, verdictFileProblem, derive, readJsonl, loadThresholds } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const CAL = process.env.CUE_CAL_FAKE === '1';
const SEAMS = ['TURN_FAKE_CLAUDE', 'TURN_PROJECTS', 'CUE_LAB_DIR', 'CUE_GRADING_DIR', 'CUE_VERDICT_DIR', 'CUE_LOG_DIR'];
if (!CAL && SEAMS.some((s) => process.env[s])) {
    console.error(`launch-grader-cue: REFUSED: a test seam (${SEAMS.join(', ')}) is set without CUE_CAL_FAKE=1; a stand-in grader must never produce a real grade`);
    process.exit(2);
}
const seam = (name, dflt) => (CAL && process.env[name] ? path.resolve(process.env[name]) : dflt);
export const LABROOT = seam('CUE_LAB_DIR', HERE);
const D = dirsOf(LABROOT);
const GRADING = seam('CUE_GRADING_DIR', D.grading);
const VERDICTS = seam('CUE_VERDICT_DIR', D.verdicts);
const LOGS = seam('CUE_LOG_DIR', LABROOT);
const inside = (p, root) => { const r = path.relative(root, path.resolve(p)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
for (const [what, p] of [['grading', GRADING], ['verdicts', VERDICTS], ['log', LOGS]]) {
    if (!inside(p, LABROOT)) { console.error(`launch-grader-cue: REFUSED: the ${what} folder ${p} resolves outside LAB (${LABROOT})`); process.exit(2); }
}
process.env.TURN_GRADING_DIR = GRADING;          // L reads these two at import: set BEFORE the dynamic imports below
process.env.FQ_OUT_DIR = LABROOT;
const L = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const { scan } = await import(pathToFileURL(path.join(F_R, 'check-grader-memory.mjs')).href);

export const PIN = 'claude-opus-5-5';
export const CAP = 26;
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
export const LAUNCHER_SHA12 = sha12(fs.readFileSync(SELF));
const winP = (p) => path.resolve(p).replace(/\//g, '\\');
const GATED_TOOLS = ['Read', 'Write', 'Edit'];
const A = { RUBRIC: D.rubric };          // the copied pairsArgs defaults `rubric = A.RUBRIC`; rd binds A to audit-graders, this launcher binds it to the cue rubric (it is always passed anyway)

// ---------------------------------------------------------------- COPIED VERBATIM from launch-grader-rd.mjs (sha12 edfef2aa8a98): lines 52-53, 55, 58-59, 60-61, 88-108.
// The free names these bodies use are bound in THIS file: L, scan, PIN, LAUNCHER_SHA12 and A (above). Do not "fix" the text: cal-launch-grader-cue.mjs compares it with rd's file (mutation 14).
/** The argv shared by every grader and probe. `--setting-sources project,local`: USER settings (claude-mem plugin, SessionStart hook) are never loaded (live defect 2026-10-06 05:4x, memory LOADED). NO second directory flag here (the calibration counts that word on this line). */
export const FLAGS = (prompt, model) => ['-p', prompt, '--model', model, '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config', '--setting-sources', 'project,local'];
export const pairsArgs = ({ prompt, pairs, verdicts, rubric = A.RUBRIC, model }) => { const rules = [L.absRule('Read', pairs), L.absRule('Read', rubric), L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
/** The model the CLI reports (and every assistant message) must be EXACTLY the pin. */
export const modelMatchesPin = (model, pin) => !!model && model.split('+').every((m) => m === pin);   // exactly the pin: no suffix, no alias, no other model
/** The model of every assistant message of a transcript (synthetic placeholders aside). */
export const transcriptModels = (text) => [...new Set(text.split('\n').flatMap((line) => { try { const j = JSON.parse(line); return j?.type === 'assistant' && j.message?.model ? [j.message.model] : []; } catch { return []; } }).filter((m) => m !== '<synthetic>'))];
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
// ---------------------------------------------------------------- end of the copied block

// the probe's own argv: the same flags as a grader, on its own two files
export const probeArgs = ({ prompt, inFile, outFile, model }) => { const rules = [L.absRule('Read', inFile), L.absRule('Edit', outFile)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };

// ---------------------------------------------------------------- the dispatch text
export const MARK = '----- dispatch text (substitute {{RUBRIC}}, {{PAIRS}} and {{VERDICTS}}) -----\n';
export const dispatchTemplate = (file) => { const t = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split(MARK); return t.length === 2 ? t[1].trim() : null; };
/** The template with ONLY the rubric, pairs and verdicts paths substituted (each token appears exactly once). */
export const buildPrompt = (template, { rubric, pairs, verdicts }) => template.replace('{{RUBRIC}}', () => winP(rubric)).replace('{{PAIRS}}', () => winP(pairs)).replace('{{VERDICTS}}', () => winP(verdicts));
export const templateProblem = (t) => (!t ? 'no dispatch marker' : ['{{RUBRIC}}', '{{PAIRS}}', '{{VERDICTS}}'].some((k) => t.split(k).length !== 2) ? 'a substitution token does not appear exactly once' : null);

// ---------------------------------------------------------------- the gate
export const nowCount = () => L.readLaunches(path.join(LOGS, 'launches.jsonl')).length + L.readLaunches(path.join(LOGS, 'grader-cwd.launches.jsonl')).length;
/** The probe gate: cwdprobe-1 and cwdprobe-2 clean and pinned, each recorded by THIS launcher file. There is no alias slot (SPEC 5.1). */
export function probeGate({ probeFile, projects = L.PROJECTS } = {}) {
    const recs = L.readLaunches(probeFile), problems = [];
    for (const slot of ['cwdprobe-1', 'cwdprobe-2']) { const p = probeRecordProblem(recs.filter((r) => r.slot === slot).at(-1), { alias: false, projects, launcherSha: LAUNCHER_SHA12 }); if (p) problems.push(`${slot}: ${p}`); }
    return { ok: problems.length === 0, problems };
}
/** null when every file in LAB\pairs\ is a pairs file by name (p-<8 hex>.json). */
export function pairsDirProblem(dir) {
    if (!fs.existsSync(dir)) return null;
    const bad = fs.readdirSync(dir).filter((f) => !/^p-[0-9a-f]{8}\.json$/.test(f));
    return bad.length ? `LAB\\pairs\\ holds a file that is not a pairs file: ${bad.join(', ')}` : null;
}
/** The tool paths of a transcript that are not one of the allowed files (normalised). */
export function pathViolations(text, allowed) {
    const norm = (p) => path.resolve(String(p)).replace(/\\/g, '/').normalize('NFC').toLowerCase();
    const ok = new Set(allowed.map(norm)); let bad = 0;
    for (const line of text.split('\n')) { if (!line.trim()) continue; let j; try { j = JSON.parse(line); } catch { continue; } if (j?.type === 'assistant') for (const c of j.message?.content ?? []) if (c?.type === 'tool_use' && c.input?.file_path != null && !ok.has(norm(c.input.file_path))) bad++; }
    return bad;
}
/** r1 in-app agreement of the two graders' derived verdicts (null when it cannot be read). Used to hold h40d back (SPEC 4.2): below 75% h40d is not run. */
export function r1AgreementProblem() {
    try {
        const pairs = JSON.parse(fs.readFileSync(path.join(D.pairs, pairsName('r1-inapp.g1')), 'utf8')), n = lineCountsOf(pairs);
        const g = ['r1-inapp.g1', 'r1-inapp.g2'].map((t) => JSON.parse(fs.readFileSync(path.join(VERDICTS, verdictsName(t)), 'utf8')));
        for (const v of g) { const p = verdictFileProblem(v, n); if (p) return `an r1 in-app verdicts file is invalid (${p.slice(0, 60)})`; }
        const keys = Object.keys(n), same = keys.filter((k) => derive(g[0][k]) === derive(g[1][k])).length;
        const pct = loadThresholds(LABROOT).agreePct; return same / keys.length >= pct / 100 ? null : `r1 in-app agreement is ${same}/${keys.length}, below ${pct}%: h40d is not run (SPEC 4.2)`;
    } catch (e) { return `r1's two in-app verdict files are not both present (${String(e.message).slice(0, 40)}): h40d starts only after the r1 agreement check`; }
}

async function main() {
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const refuse = (why) => { console.log(`launch-grader-cue: REFUSED: ${why}`); process.exit(2); };
    const known = new Set(['--attempt', '--dry-run', '--model-id', '--probe', '--plan']);
    const valued = new Set(['--attempt', '--model-id']);
    for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--') && !known.has(argv[i])) refuse(`unknown option ${argv[i]}`); if (valued.has(argv[i]) && (argv[i + 1] == null || argv[i + 1].startsWith('--'))) refuse(`${argv[i]} needs a value`); }
    const dry = argv.includes('--dry-run');
    const modelId = arg('--model-id');
    if (modelId != null && modelId !== PIN) refuse(`--model-id "${modelId}" is not the pin: a grader or pinned probe takes exactly --model-id ${PIN} (no alias, no other model)`);   // MUT-pin-exact
    const attempt = Number(arg('--attempt') ?? 1);
    if (!Number.isInteger(attempt) || attempt < 1) refuse('--attempt must be a positive integer');
    const launchesFile = path.join(LOGS, 'launches.jsonl'), probeFile = path.join(LOGS, 'grader-cwd.launches.jsonl'), probeOut = path.join(LOGS, 'grader-cwd.probes.out.txt');
    const count = nowCount();

    // ---- probes
    const probe = argv.find((a) => /^cwdprobe-[12]$/.test(a));
    if (argv.includes('--probe') !== !!probe) refuse('--probe goes with exactly cwdprobe-1 or cwdprobe-2 (there is no alias probe)');
    if (probe) {
        const k = Number(probe.slice(-1));
        if (attempt !== 1) refuse('a probe runs as attempt 1 (cwdprobe-<n>-a1)');
        if (!modelId && !dry) refuse(`${probe} is a pinned probe: --model-id ${PIN} is required for a real launch`);
        const model = modelId ?? 'opus';
        const lines = [`$ node launch-grader-cue.mjs ${argv.join(' ')}`];
        const say = (s) => { lines.push(s); console.log(s); };
        const finish = (code) => { if (!dry) { fs.mkdirSync(LOGS, { recursive: true }); fs.appendFileSync(probeOut, `${lines.join('\n')}\n\n`); } process.exit(code); };
        if (!dry && count >= CAP) refuse(`the two logs already hold ${count} records: the cap is ${CAP} sessions, probes and failed attempts included (this would be session ${count + 1})`);   // MUT-cap
        if (k === 2) { const why = probeRecordProblem(L.readLaunches(probeFile).filter((l) => l.slot === 'cwdprobe-1').at(-1), { alias: false, projects: L.PROJECTS, launcherSha: LAUNCHER_SHA12 }); if (why) { say(`${probe}: ${dry ? 'a real launch would be ' : ''}REFUSED: it starts only after cwdprobe-1 read clean (${why})`); if (!dry) finish(2); } }
        const inFile = path.join(GRADING, 'probe-input.txt');
        if (!dry) { fs.mkdirSync(GRADING, { recursive: true }); if (!fs.existsSync(inFile)) fs.writeFileSync(inFile, 'synthetic line one\nsynthetic line two\nsynthetic line three\n'); }
        const cwd = path.join(GRADING, `${probe}-a1`), outFile = path.join(cwd, 'out.txt');
        const { args, rules } = probeArgs({ prompt: L.probePrompt(inFile, outFile), inFile, outFile, model });
        say(`claude ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
        say(`permission rules: ${rules.join(' | ')}`);
        if (dry) { say(`DRY RUN ${probe}: model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); sessions so far ${count} of ${CAP}`); finish(0); }
        const r = L.launchAttempt({ slot: probe, attempt, cwd, args });
        if (r.error) { say(`${probe}: REFUSED ${r.error}`); finish(2); }
        const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
        const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models: transcriptModels(text) };
        fs.mkdirSync(LOGS, { recursive: true });
        fs.appendFileSync(probeFile, `${L.launchRecord(rec)}\n`);
        const why = probeRecordProblem(rec, { alias: false, projects: L.PROJECTS, launcherSha: LAUNCHER_SHA12 }), wrote = fs.existsSync(outFile);
        say(`${probe} a1: session ${rec.session_id} model ${rec.model} exit ${rec.exit} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${rec.memory} tools ${JSON.stringify(rec.tools)} transcript models ${JSON.stringify(rec.models)} out.txt ${wrote ? 'written' : 'MISSING'} -> ${why || !wrote ? `NOT OK (${why ?? 'no out.txt'})` : 'ok'}`);
        say(!why && wrote ? `${probe} OK (the controller still runs check-grader-memory.mjs on session:${rec.session_id}); sessions so far ${count + 1} of ${CAP}` : `${probe} FAILED: no grader runs on a failed probe; the transcript is kept; sessions so far ${count + 1} of ${CAP}`);
        finish(!why && wrote ? 0 : 1);
    }

    const gate = probeGate({ probeFile });
    const planRows = () => ALL_TAGS.map((tag) => { const info = parseTag(tag), pp = path.join(D.pairs, pairsName(tag)); let items = null; try { items = JSON.parse(fs.readFileSync(pp, 'utf8')).items.length; } catch { /* absent */ } return { tag, info, pp, items, vp: path.join(VERDICTS, verdictsName(tag)), hash: hashProblem(tag, LABROOT) }; });
    if (argv.includes('--plan')) {
        console.log(`PLAN cue grader; pin ${PIN}; launcher sha12 ${LAUNCHER_SHA12}; sessions so far ${count} of ${CAP}`);
        for (const r of planRows()) console.log(`PLAN ${r.tag.padEnd(16)} graders-of-this-file=${r.info.graders} pairs=${r.items === null ? 'MISSING' : `${r.items} items`} verdicts=${fs.existsSync(r.vp) ? 'EXISTS' : 'to write'} hashes=${r.hash ? `BLOCKED (${r.hash.slice(0, 70)})` : 'ok'}`);
        const pd = pairsDirProblem(D.pairs);
        console.log(`PLAN probe gate: ${gate.ok ? 'OK' : `BLOCKED (${gate.problems.join('; ')})`}; pairs folder: ${pd ?? 'clean'}`);
        console.log('PLAN no model was called');
        process.exit(0);
    }

    // ---- one grader attempt
    const tag = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(argv[i - 1])));
    if (!tag) refuse('no tag given');
    const info = parseTag(tag);
    if (!info) refuse(`"${tag}" is not a tag (cal-1..3.g1|g2, rev-1..4.g1|g2, r1-inapp.g1|g2, r1-high, r1-low, h40d-inapp.g1|g2, h40d-high, h40d-low)`);
    if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${PIN} (no other model grades)`); // MUT-pin
    const model = modelId ?? 'opus';
    const hp = hashProblem(tag, LABROOT); if (hp) refuse(hp);                                                    // MUT-hash (mutations 9, 9b)
    const pdp = pairsDirProblem(D.pairs); if (pdp) refuse(pdp);                                                  // MUT-pairs-dir
    const pairsPath = path.join(D.pairs, pairsName(tag)), verdictsPath = path.join(VERDICTS, verdictsName(tag));
    if (!fs.existsSync(pairsPath)) refuse(`${pairsPath} does not exist (export first)`);
    if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists: move the earlier attempt's verdicts away before a re-grade`);   // MUT-verdicts-exist
    let pairs; try { pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8')); } catch { refuse(`${pairsPath} is not JSON`); }
    const pp = pairsProblem(pairs); if (pp) refuse(`${path.basename(pairsPath)}: ${pp}`);
    if (info.kind === 'rev' && !['cal-1', 'cal-2', 'cal-3'].every((c) => ['g1', 'g2'].every((g) => fs.existsSync(path.join(VERDICTS, verdictsName(`${c}.${g}`)))))) refuse('a revision follows a COMPLETED first calibration (all six cal verdict files)');
    if (info.run === 'h40d' && info.kind === 'real') { const ag = r1AgreementProblem(); if (ag) refuse(ag); }
    const template = dispatchTemplate(D.dispatch), tp = templateProblem(template);
    if (tp) refuse(`${D.dispatch}: ${tp}`);
    const prompt = buildPrompt(template, { rubric: D.rubric, pairs: pairsPath, verdicts: verdictsPath });
    const { args, rules } = pairsArgs({ prompt, pairs: pairsPath, verdicts: verdictsPath, rubric: D.rubric, model });
    const cwd = path.join(GRADING, cwdName(tag, attempt));
    const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
    if (dry) {
        console.log(`DRY RUN ${tag} attempt ${attempt}: ${info.graders} grader(s) for this file; ${pairs.items.length} items; model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); verdicts ${verdictsPath}; sessions so far ${count} of ${CAP}`);
        console.log(argvLine);
        console.log(`permission rules: ${rules.join(' | ')}`);
        console.log(`probe gate: ${gate.ok ? 'OK' : `BLOCKED (${gate.problems.join('; ')}); a real launch would be refused`}`);
        return;
    }
    if (!gate.ok) refuse(`the probe gate is not passed: ${gate.problems.join('; ')}`);                          // MUT-gate
    if (count >= CAP) refuse(`the two logs already hold ${count} records: the cap is ${CAP} sessions, probes and failed attempts included (this would be session ${count + 1})`);   // MUT-cap
    console.log(argvLine);
    const r = L.launchAttempt({ slot: tag, attempt, cwd, args });
    if (r.error) refuse(r.error);
    const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
    const models = transcriptModels(text);
    const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));    // MUT-transcript-model
    const pv = pathViolations(text, [D.rubric, pairsPath, verdictsPath]);
    const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models, pinned, pathViolations: pv, pairsSha12: sha12(fs.readFileSync(pairsPath)), rubricSha12: fs.existsSync(D.rubric) ? sha12(fs.readFileSync(D.rubric)) : null, specSha12: fs.existsSync(D.spec) ? sha12(fs.readFileSync(D.spec)) : null, verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null };
    fs.mkdirSync(LOGS, { recursive: true });
    fs.appendFileSync(launchesFile, `${L.launchRecord(rec)}\n`);
    if (!rec.model && Object.keys(rec.tools).length === 0) console.log(`${tag} a${attempt}: RATE-LIMIT-REFUSAL? no model and no tool call in the session: not a grader attempt; wait for the reset and relaunch as attempt ${attempt + 1} (it counts as a session)`);
    let vp = 'verdicts file MISSING/INVALID';
    try { const p = verdictFileProblem(JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), lineCountsOf(pairs)); vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${pairs.items.length} keys)`; } catch { /* absent or unparsable */ }
    const toolsOk = Object.keys(rec.tools).every((t) => GATED_TOOLS.includes(t));
    console.log(`${tag} a${attempt}: session ${rec.session_id} model ${rec.model} exit ${rec.exit} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${rec.memory} tools ${JSON.stringify(rec.tools)}${toolsOk ? '' : ' TOOL OUTSIDE Read/Write/Edit'} pathViolations ${pv} ${vp}${pinned ? ' PINNED' : ` MODEL IS NOT THE PIN ${PIN} (cli ${rec.model}, transcript ${JSON.stringify(models)})`}; sessions so far ${count + 1} of ${CAP}`);
    console.log('the controller still runs check-grader-memory.mjs on this session, and names the model in the result note');
    process.exit(rec.exit === 0 && rec.slugJsonl === 1 && rec.memoryDir !== 'non-empty' && rec.memory === 'ABSENT' && toolsOk && pv === 0 && pinned && /valid on its pairs/.test(vp) ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) await main();
