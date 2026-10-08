// cal-launch-grader-rd.mjs: known-answer calibration of launch-grader-rd.mjs (the router-default-r1 grader launcher) and of rd-grader-dispatch.txt.
// NO MODEL IS CALLED: the launcher runs against a stand-in for the claude binary (TURN_FAKE_CLAUDE, RD_CAL_FAKE=1) with PATH stripped so no real `claude` can be found (proved
// below, and the stand-in logs every invocation so "nothing was launched" is a count, not a belief). Everything is written under a temp folder; nothing under LAB\grade is touched.
//   node cal-launch-grader-rd.mjs [--launcher <path>] [--quiet]     the suite
//   node cal-launch-grader-rd.mjs --mutants                         the suite against every mutant of the launcher: each must FAIL at least one check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const LAUNCHER = path.resolve(argOf('--launcher') ?? path.join(HERE, 'launch-grader-rd.mjs'));
const QUIET = argv.includes('--quiet');
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F_R = `${SP}/followup-turn/R`;
const DISPATCH = path.join(HERE, 'rd-grader-dispatch.txt');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const MARK = '----- dispatch text (substitute RUN, VERDICTS and TAG) -----\n';

export const MUTANTS = [
    { id: 'L-folder-check-removed', from: 'if (fp) refuse(fp);', to: '' },
    { id: 'L-folder-suffix-accepted', from: 'return runFolderPattern(REGISTERED_RUN_LABEL).test(name) ? null :', to: 'return runFolderPattern(REGISTERED_RUN_LABEL).test(name) || name.endsWith(REGISTERED_RUN_LABEL) ? null :' },
    { id: 'L-gate-bypassed', from: "if (!gate.ok) refuse(`the probe gate is not passed: ${gate.problems.join('; ')}`);   // MUT-gate", to: '' },
    { id: 'L-pin-not-required', from: "if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${PIN} (the user's pin: no other model grades this hour)`); // MUT-pin", to: '' },
    { id: 'L-setting-sources-dropped', from: ", '--strict-mcp-config', '--setting-sources', 'project,local'];", to: ", '--strict-mcp-config'];" },
    { id: 'L-model-id-any-string', from: 'if (modelId != null && modelId !== PIN)', to: 'if (false)' },
    { id: 'L-model-id-not-exactly-pin', from: 'if (modelId != null && modelId !== PIN)', to: 'if (modelId != null && !MODEL_ID_RX.test(modelId))' },
    { id: 'L-pin-match-tolerant', from: "model.split('+').every((m) => m === pin);   // exactly the pin", to: "model.split('+').every((m) => m === pin || m.startsWith(`${pin}[`));   // exactly the pin" },
    { id: 'L-verdicts-sha-not-recorded', from: 'verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null', to: 'verdictsSha12: null' },
    { id: 'L-gate-memory-unchecked', from: "if (mem.loaded) return `memory LOADED (project ${mem.projectMemory.total}, claude-mem ${mem.claudeMem.total})`; // MUT-gate-memory", to: '' },
    { id: 'L-gate-tools-unchecked', from: "if (tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) return `tools ${JSON.stringify(tools)} (need exactly one Read and one Write)`; // MUT-gate-tools", to: '' },
    { id: 'L-gate-model-unchecked', from: "if (!ms.length || !ms.every((m) => modelMatchesPin(m, PIN))) return `transcript models ${JSON.stringify(ms)} are not the pin`; // MUT-gate-model", to: '' },
    { id: 'L-gate-launcher-sha-unchecked', from: "if (rec.launcher !== launcherSha) return `written by another launcher version (${rec.launcher ?? 'none'}, this one is ${launcherSha}): probe again`;", to: '' },
    { id: 'L-transcript-model-unchecked', from: 'const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));    // MUT-transcript-model', to: 'const pinned = modelMatchesPin(r.record.model, PIN);' },
    { id: 'L-exit-ignores-memory', from: "rec.memory === 'ABSENT' && toolsOk", to: 'toolsOk' },
    { id: 'L-exit-ignores-tools', from: "&& toolsOk && pinned", to: '&& pinned' },
    { id: 'L-blind-one-grader', from: "graders: 2, pairsRel: path.join('router-blind'", to: "graders: 1, pairsRel: path.join('router-blind'" },
    { id: 'L-test-seam-allowed-in-real', from: 'if (!CAL && SEAMS.some((s) => process.env[s])) {', to: 'if (false) {' },
    { id: 'L-existing-verdicts-overwritten', from: "if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists: move the earlier attempt's verdicts away before a re-grade`);", to: '' },
    { id: 'L-probe-2-without-1', from: 'if (why) { say(`${probe}: ${dry ?', to: 'if (false) { say(`${probe}: ${dry ?' },
];

if (argv.includes('--mutants')) {
    const src = fs.readFileSync(LAUNCHER, 'utf8');
    let caught = 0; const lines = [];
    for (const m of MUTANTS) {
        const n = src.split(m.from).length - 1;
        if (n !== 1) { lines.push(`ERROR ${m.id}: anchor occurs ${n} times (must be 1)`); continue; }
        const f = path.join(HERE, `launch-grader-rd.mut-${m.id}.mjs`);
        fs.writeFileSync(f, src.replace(m.from, () => m.to));
        const r = spawnSync(process.execPath, [path.join(HERE, 'cal-launch-grader-rd.mjs'), '--launcher', f, '--quiet'], { encoding: 'utf8', timeout: 900000 });
        fs.rmSync(f, { force: true });
        const failed = (r.stdout.match(/^FAIL /gm) ?? []).length;
        const ok = r.status !== 0 && failed > 0;
        if (ok) caught++;
        lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${m.id}  (${failed} check(s) failed)`);
    }
    console.log(lines.join('\n'));
    console.log(`MUTANTS ${caught}/${MUTANTS.length} caught`);
    process.exit(caught === MUTANTS.length ? 0 : 1);
}

// ---------------------------------------------------------------- the stand-in for the claude binary
const FAKE = `// stand-in for the claude binary (cal only): logs the invocation, writes verdicts and a transcript, prints the CLI's JSON result. Mode in RD_FAKE_MODE.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const { projectSlug } = await import(pathToFileURL(process.env.RD_F_R + '/launch-grader.mjs').href);
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1], model = args[args.indexOf('--model') + 1];
fs.appendFileSync(process.env.RD_FAKE_LOG, 'invoked ' + model + '\\n');
const mode = process.env.RD_FAKE_MODE || 'ok';
const session = randomUUID();
if (mode === 'ratelimit') { console.log(JSON.stringify({ session_id: session, is_error: true, result: 'rate_limit' })); process.exit(0); }
const alias = model === 'opus';
const cliModel = mode === 'badmodel' ? 'claude-opus-5' : mode === 'suffix' ? model + '[1m]' : alias ? 'claude-opus-5-5' : model;
const msgModel = mode === 'msgmodel' ? 'claude-opus-5' : cliModel;
const lines = [JSON.stringify({ type: 'user', message: { content: prompt } })];
if (mode === 'loadedmem') lines.push(JSON.stringify({ type: 'user', message: { content: '<claude-mem-context> x </claude-mem-context>' } }));
if (mode === 'projmem') lines.push(JSON.stringify({ type: 'user', message: { content: 'Memory Index of the project' } }));
const use = (name, input) => lines.push(JSON.stringify({ type: 'assistant', message: { ...(mode === 'nomodel' ? {} : { model: msgModel }), content: [{ type: 'tool_use', name, input }] } }));
if (prompt.startsWith('Read the file ')) {
    const m = /^Read the file (.+?) and then write the number of lines it has, as a single number, into the file (.+?)\\. Use only/.exec(prompt);
    use('Read', { file_path: m[1] }); use('Write', { file_path: m[2], content: '3' });
    fs.mkdirSync(path.dirname(m[2]), { recursive: true }); fs.writeFileSync(m[2], '3');
    if (mode === 'probe-extra') use('Read', { file_path: m[1] });
} else {
    const rub = /read this file IN FULL: (.+)/.exec(prompt)[1].trim(), pairs = /^<PAIRS_FILE> = (.+)$/m.exec(prompt)[1].trim(), verd = /^<VERDICTS_FILE> = (.+)$/m.exec(prompt)[1].trim();
    use('Read', { file_path: rub }); use('Read', { file_path: pairs });
    const items = JSON.parse(fs.readFileSync(pairs, 'utf8')).items;
    const v = Object.fromEntries(items.map((i) => [i.key, { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' }]));
    if (mode === 'incomplete') delete v[items[items.length - 1].key];
    fs.writeFileSync(verd, JSON.stringify(v)); use('Write', { file_path: verd, content: '{}' }); use('Read', { file_path: verd });
    if (mode === 'bash') use('Bash', { command: 'echo' });
}
const dir = path.join(process.env.TURN_PROJECTS, projectSlug(process.cwd()));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, session + '.jsonl'), lines.join('\\n') + '\\n');
console.log(JSON.stringify({ session_id: session, modelUsage: { [cliModel]: {} }, is_error: false, result: 'DONE' }));
process.exit(mode === 'exit1' ? 1 : 0);
`;

const results = [];
const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); if (!QUIET || !cond) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
const out = (r) => r.stdout + r.stderr;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-rd-launch-'));
const GR = path.join(TMP, 'grading'), VD = path.join(TMP, 'verdicts'), LG = path.join(TMP, 'logs'), PR = path.join(TMP, 'projects'), BIN = path.join(TMP, 'bin'), RUNS = path.join(TMP, 'runs'), FLOG = path.join(TMP, 'fake.log');
for (const d of [GR, VD, LG, PR, BIN, RUNS]) fs.mkdirSync(d, { recursive: true });
const fakePath = path.join(TMP, 'fake-claude.mjs'); fs.writeFileSync(fakePath, FAKE);
const env = (extra = {}) => ({ ...process.env, RD_CAL_FAKE: '1', RD_GRADING_DIR: GR, RD_VERDICT_DIR: VD, RD_LOG_DIR: LG, TURN_PROJECTS: PR, RD_F_R: F_R, RD_FAKE_LOG: FLOG, PATH: `${BIN};C:\\Windows\\System32`, ...extra });
const run = (args, extra) => spawnSync(process.execPath, [LAUNCHER, ...args], { encoding: 'utf8', env: env({ RD_DISPATCH: DISPATCH, ...extra }), timeout: 180000 });
const F = (args, mode = 'ok', extra = {}) => run(args, { TURN_FAKE_CLAUDE: fakePath, RD_FAKE_MODE: mode, ...extra });
const invoked = () => (fs.existsSync(FLOG) ? fs.readFileSync(FLOG, 'utf8').split('\n').filter(Boolean).length : 0);
const PINARG = ['--model-id', 'claude-opus-5-5'];
const snap = () => JSON.stringify([GR, VD, LG].map((d) => (fs.existsSync(d) ? fs.readdirSync(d).sort() : null)));

const STAMP = '2026-10-07T20-00-05';
function mkRun(name, { blind = 4, arms = ['inapp', 'high', 'low', 'captured-high'] } = {}) {
    const d = path.join(RUNS, name); fs.mkdirSync(path.join(d, 'router-blind'), { recursive: true });
    const items = (n) => ({ items: Array.from({ length: n }, (_, i) => ({ key: `q${String(i + 1).padStart(2, '0')}`, id: `q${i + 1}`, kind: 'spoken', question: 'cal question', heard: 'cal heard', answer: `cal answer ${i}` })) });
    for (let n = 1; n <= blind; n++) fs.writeFileSync(path.join(d, 'router-blind', `pairs.blind-${n}.json`), JSON.stringify(items(3)));
    const files = { inapp: 'interview60.judge.pairs.json', high: 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json', low: 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json', 'captured-high': 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json' };
    for (const a of arms) fs.writeFileSync(path.join(d, files[a]), JSON.stringify(items(2)));
    return d;
}
const RUN = mkRun(`${STAMP}-router-default-r1`);

// ================================================================= 0. the stand-in and the tripwire
const w = spawnSync('cmd.exe', ['/d', '/c', 'where claude'], { encoding: 'utf8', env: env() });
ck('tripwire: with this PATH no real `claude` is reachable (a stray real launch is impossible)', w.status !== 0, `where exit ${w.status}`);

// ================================================================= 1. the dispatch text
{
    const dText = fs.readFileSync(DISPATCH, 'utf8').replace(/\r\n/g, '\n');
    const h40 = fs.readFileSync(`${SP}/validation-hour/h40d-grader-dispatch.txt`, 'utf8').replace(/\r\n/g, '\n');
    ck('dispatch: the marker appears exactly once in rd-grader-dispatch.txt', dText.split(MARK).length === 2);
    ck('dispatch: the template region is BYTE-IDENTICAL to h40d\'s (sha256)', dText.split(MARK)[1] === h40.split(MARK)[1] && sha(dText.split(MARK)[1]) === sha(h40.split(MARK)[1]), sha(dText.split(MARK)[1]).slice(0, 12));
    const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
    const tpl = A.dispatchTemplate(DISPATCH);
    ck('dispatch: the template carries the three substitution anchors', tpl.includes('RUN\\<pairs file>') && tpl.includes('<VERDICTS_FILE> = VERDICTS') && tpl.includes('`TAG`'));
    const tampered = (() => { const t = dText.split(MARK); return `${t[0]}${MARK}${t[1].replace('independent', 'indepenxent')}`; })();
    ck('dispatch: a one-character change in the template changes the sha (the byte check can fail)', sha(tampered.split(MARK)[1]) !== sha(h40.split(MARK)[1]));
    const pre = dText.split(MARK)[0];
    ck('dispatch: the preamble names the registered folder pattern and the grader counts (blind 2, in-app 2, high/low/captured-high 1)', /<stamp>-router-default-r1/.test(pre) && /Graders per file: blind files 2 each, the in-app export 2, high \/ low \/ captured-high 1 each/.test(pre));
}

// ================================================================= 2. source facts
{
    const src = fs.readFileSync(LAUNCHER, 'utf8');
    const countAddDir = (s) => s.split('\n').filter((l) => /^(export )?const (FLAGS|probeArgsRd|pairsArgs)\b/.test(l.trim())).filter((l) => /add-dir/.test(l)).length;
    ck('source: grep -c add-dir over the FLAGS and args lines = 0', countAddDir(src) === 0 && src.split('\n').some((l) => l.trim().startsWith('export const FLAGS')));
    ck('source: the check can fail (an add-dir injected into FLAGS counts 1)', countAddDir(src.replace("'project,local'];", "'project,local', '--add-dir', 'x'];")) === 1);
    ck('source: the launcher contains no `Bash` allowance and no dangerously-skip flag', !/--dangerously|--allowed-tools[^\n]*Bash/.test(src));
}

// ================================================================= 3. the run-folder name (registration 2: only <stamp>-router-default-r1 is graded)
{
    const before = invoked(), snap0 = snap();
    const names = {
        'accepted: <stamp>-router-default-r1': [`${STAMP}-router-default-r1`, true],
        'refused: a smoke folder <stamp>-router-smoke': [`${STAMP}-router-smoke`, false],
        'refused: a suffixed (retried) folder <stamp>-router-default-r1-1002': [`${STAMP}-router-default-r1-1002`, false],
        'refused: the re-fly label <stamp>-router-default-r2': [`${STAMP}-router-default-r2`, false],
        'refused: a label prefix <stamp>-router-default': [`${STAMP}-router-default`, false],
        'refused: the bare label router-default-r1': ['router-default-r1', false],
        'refused: junk before the stamp': [`junk-${STAMP}-router-default-r1`, false],
        'refused: a date-only stamp': ['2026-10-07-router-default-r1', false],
        'refused: another suffix on the label (r1x)': [`${STAMP}-router-default-r1x`, false],
    };
    for (const [what, [name, ok]] of Object.entries(names)) {
        const d = mkRun(name);
        const r = run(['--plan', '--run-dir', d]);
        ck(`folder name ${what}: --plan ${ok ? 'proceeds (exit 0)' : 'REFUSES (exit 2)'}`, ok ? r.status === 0 && /name accepted/.test(out(r)) : r.status === 2 && /REFUSED/.test(out(r)) && /router-default-r1/.test(out(r)), `exit ${r.status}`);
    }
    const dd = mkRun(`${STAMP}-router-smoke`);
    const g1 = run(['blind-1.g1', '--run-dir', dd, ...PINARG, '--dry-run']), g2 = F(['blind-1.g1', '--run-dir', dd, ...PINARG]);
    ck('folder name: a grader dry run and a REAL launch on a smoke folder are both refused (exit 2) before anything else', g1.status === 2 && g2.status === 2 && /REFUSED/.test(out(g1)) && /REFUSED/.test(out(g2)));
    ck('folder name: a run folder argument that does not exist is refused; a missing --run-dir is refused', run(['--plan', '--run-dir', path.join(RUNS, `${STAMP}-router-default-r1-nope`)]).status === 2 && run(['--plan', '--run-dir', path.join(RUNS, '2026-10-07T21-00-00-router-default-r1')]).status === 2 && run(['--plan']).status === 2);
    ck('folder name: no model stand-in was invoked and nothing was written by any of the above (plan and refusals are read-only)', invoked() === before && snap() === snap0, `invoked ${invoked() - before}`);
}

// ================================================================= 4. the plan (the grader counts of registration 7.2)
{
    const before = invoked(), s0 = snap();
    const r = run(['--plan', '--run-dir', RUN]);
    const o = out(r);
    ck('plan: 4 blind files x 2 graders + in-app x 2 + high + low + captured-high = 13 launches, exit 0 (the probe gate still blocks real launches)', r.status === 0 && /PLAN 13 grader launches/.test(o) && /PLAN OK/.test(o), o.split('\n').filter((l) => /PLAN 1|PLAN OK|BLOCKED/.test(l)).join(' | ').slice(0, 200));
    ck('plan: every blind tag g1 and g2, inapp g1 and g2, and the three single-grader arms are listed with their grader counts (2,2,2,2,2,2,2,2,2,2,1,1,1)', ['blind-1.g1', 'blind-1.g2', 'blind-4.g1', 'blind-4.g2', 'inapp.g1', 'inapp.g2', 'high', 'low', 'captured-high'].every((t) => new RegExp(`PLAN ${t.padEnd(14)} graders-of-this-file=${/^(high|low|captured-high)$/.test(t) ? 1 : 2}`).test(o)));
    ck('plan: the probe gate is reported BLOCKED before any probe, naming the three probes still to run', /probe gate: BLOCKED/.test(o) && /probes still to run: cwdprobe-1, cwdprobe-2, cwdprobe-3/.test(o));
    const r3 = run(['--plan', '--run-dir', mkRun(`2026-10-07T20-10-00-router-default-r1`, { blind: 2 })]);
    ck('plan: with two blind files the plan lists 2x2 + 2 + 3 = 9 launches (the export decides the blind count)', r3.status === 0 && /PLAN 9 grader launches/.test(out(r3)));
    const r4 = run(['--plan', '--run-dir', mkRun(`2026-10-07T20-11-00-router-default-r1`, { blind: 0 })]);
    ck('plan: no blind file at all blocks the plan (exit 3)', r4.status === 3 && /PLAN BLOCKED/.test(out(r4)) && /no blind pairs file/.test(out(r4)));
    const r5 = run(['--plan', '--run-dir', mkRun(`2026-10-07T20-12-00-router-default-r1`, { arms: ['inapp', 'low'] })]);
    ck('plan: a missing high / captured-high export blocks the plan (exit 3) and names them', r5.status === 3 && /high: pairs file missing/.test(out(r5)) && /captured-high: pairs file missing/.test(out(r5)));
    fs.writeFileSync(path.join(VD, 'verdicts.high.json'), '{}');
    const r6 = run(['--plan', '--run-dir', RUN]);
    ck('plan: an existing verdicts file blocks the plan (exit 3), never overwritten', r6.status === 3 && /high: a verdicts file already exists/.test(out(r6)));
    fs.rmSync(path.join(VD, 'verdicts.high.json'));
    ck('plan: no model stand-in was invoked and nothing was written (the same snapshot of grading, verdicts, logs)', invoked() === before && snap() === s0);
}

// ================================================================= 5. refusals and the argv of a dry run
{
    const before = invoked();
    const d = (a) => run([...a, '--run-dir', RUN, '--dry-run']);
    const bad = ['blind-5.g1', 'blind-0.g1', 'blind-1.g3', 'blind-1', 'inapp.g3', 'inapp', 'high.g1', 'high.g2', 'captured-high.g1', 'nonsense', 'cwdprobe-4'];
    ck('tags: blind-5/0, a third grader, a bare blind or in-app tag, a grader suffix on a single-grader arm and an unknown tag are each refused (exit 2)', bad.every((t) => d([t, ...PINARG]).status === 2), bad.filter((t) => d([t, ...PINARG]).status !== 2).join(','));
    ck('tags: every valid tag dry-runs (exit 0)', ['blind-1.g1', 'blind-4.g2', 'inapp.g1', 'inapp.g2', 'high', 'low', 'captured-high'].every((t) => d([t, ...PINARG]).status === 0));
    ck('options: an unknown option and an option missing its value are refused (exit 2)', run(['blind-1.g1', '--run-dir', RUN, '--bogus', '--dry-run']).status === 2 && run(['blind-1.g1', '--run-dir']).status === 2 && run(['blind-1.g1', '--run-dir', RUN, '--attempt', '0', '--dry-run']).status === 2);
    const d1 = d(['blind-1.g1', ...PINARG]), o = out(d1);
    ck('dry run (pinned): argv carries --model claude-opus-5-5, Read,Write,Edit, dontAsk, strict MCP, no add-dir, no bare opus, no Bash', d1.status === 0 && / --model claude-opus-5-5 /.test(o) && !/ --model opus /.test(o) && /--tools Read,Write,Edit/.test(o) && /--permission-mode dontAsk/.test(o) && /--strict-mcp-config/.test(o) && !/add-dir/.test(o) && !/Bash/.test(o));
    const ss = (r) => { const m = out(r).match(/--setting-sources [^ ]+/g) ?? []; return m.length === 1 && m[0] === '--setting-sources project,local' && / --strict-mcp-config --setting-sources project,local --allowed-tools /.test(out(r)); };
    ck('USER settings never loaded: the argv of a grader dry run and of a probe dry run carries exactly one --setting-sources project,local, right before --allowed-tools', ss(d1) && ss(run(['cwdprobe-1', '--probe', ...PINARG, '--dry-run'])) && ss(run(['cwdprobe-3', '--probe', '--dry-run'])));
    ck('dry run: 3 permission rules (Read pairs, Read rubric, Edit verdicts) and the dispatch passes the audit\'s own check', /permission rules: Read\(\/\/c\/.*pairs\.blind-1\.json\) \| Read\(\/\/c\/.*grader-prompt\.md\) \| Edit\(\/\/c\/.*verdicts\.blind-1\.g1\.json\)/.test(o) && /run folder name accepted; 2 grader\(s\) for this file; 3 items/.test(o));
    ck('dry run of a single-grader arm reports 1 grader; of the in-app file 2', /1 grader\(s\) for this file/.test(out(d(['high', ...PINARG]))) && /2 grader\(s\) for this file/.test(out(d(['inapp.g1', ...PINARG]))));
    ck('dry run without --model-id shows --model opus and says NOT pinned', /--model opus/.test(out(d(['blind-1.g1']))) && /NOT pinned/.test(out(d(['blind-1.g1']))));
    ck('--model-id must be EXACTLY claude-opus-5-5: opus, a shell-metacharacter id, ANOTHER valid claude id (claude-sonnet-5, claude-opus-5) and a suffixed pin all exit 2, for a grader dry run, a real grader launch and a pinned probe (I-1)', ['opus', 'claude-opus-5-5;x', 'claude-sonnet-5', 'claude-opus-5', 'claude-opus-5-5[1m]'].every((m) => run(['blind-1.g1', '--run-dir', RUN, '--model-id', m, '--dry-run']).status === 2 && F(['blind-1.g1', '--run-dir', RUN, '--model-id', m]).status === 2 && F(['cwdprobe-1', '--probe', '--model-id', m]).status === 2) && run(['blind-1.g1', '--run-dir', RUN, '--model-id', '--dry-run']).status === 2 && invoked() === before);
    const real = F(['blind-1.g1', '--run-dir', RUN]);
    ck('a REAL launch without --model-id is refused (exit 2), nothing created, the stand-in not invoked', real.status === 2 && /needs --model-id/.test(out(real)) && !fs.existsSync(path.join(GR, 'blind-1.g1-a1')));
    fs.writeFileSync(path.join(VD, 'verdicts.blind-1.g1.json'), '{}');
    const ex = d(['blind-1.g1', ...PINARG]);
    ck('an existing verdicts file is refused (exit 2): a re-grade needs the earlier verdicts moved away', ex.status === 2 && /already exists/.test(out(ex)));
    fs.rmSync(path.join(VD, 'verdicts.blind-1.g1.json'));
    const miss = run(['blind-3.g1', '--run-dir', mkRun(`2026-10-07T20-13-00-router-default-r1`, { blind: 2 }), ...PINARG, '--dry-run']);
    ck('a missing pairs file is refused (exit 2)', miss.status === 2 && /does not exist/.test(out(miss)));
    const dupRun = mkRun(`2026-10-07T20-14-00-router-default-r1`); fs.writeFileSync(path.join(dupRun, 'router-blind', 'pairs.blind-1.json'), JSON.stringify({ items: [{ key: 'a' }, { key: 'a' }] })); fs.writeFileSync(path.join(dupRun, 'router-blind', 'pairs.blind-2.json'), JSON.stringify({ items: [] })); fs.writeFileSync(path.join(dupRun, 'router-blind', 'pairs.blind-3.json'), '{nope');
    ck('duplicate keys, an empty items list and an unparsable pairs file are each refused (exit 2)', ['blind-1.g1', 'blind-2.g1', 'blind-3.g1'].every((t) => run([t, '--run-dir', dupRun, ...PINARG, '--dry-run']).status === 2));
    const seam = spawnSync(process.execPath, [LAUNCHER, 'blind-1.g1', '--run-dir', RUN, ...PINARG, '--dry-run'], { encoding: 'utf8', env: { ...process.env, TURN_FAKE_CLAUDE: fakePath, RD_CAL_FAKE: '' } });
    ck('a test seam (TURN_FAKE_CLAUDE) without RD_CAL_FAKE=1 is refused (exit 2): a stand-in grader can never produce a real grade', seam.status === 2 && /test seam/.test(out(seam)));
    ck('none of the refusals and dry runs invoked the stand-in', invoked() === before);
}

// ================================================================= 6. the probes (sequencing) and the gate
const probeRun = (k, mode = 'ok') => F([`cwdprobe-${k}`, '--probe', ...(k === 3 ? [] : PINARG)], mode);
{
    const before = invoked();
    const r2 = F(['cwdprobe-2', '--probe', ...PINARG]);
    ck('probe sequencing: cwdprobe-2 before cwdprobe-1 is refused (exit 2), the stand-in not invoked', r2.status === 2 && /REFUSED/.test(out(r2)) && invoked() === before);
    ck('probe sequencing: cwdprobe-3 before cwdprobe-2 is refused (exit 2)', F(['cwdprobe-3', '--probe']).status === 2 && invoked() === before);
    ck('probe pin: a real cwdprobe-1 without --model-id is refused; cwdprobe-3 WITH --model-id is refused', F(['cwdprobe-1', '--probe']).status === 2 && F(['cwdprobe-3', '--probe', ...PINARG]).status === 2 && invoked() === before);
    // a probe that reads LOADED (a claude-mem context in its transcript) must fail and must not unlock probe 2
    const bad = probeRun(1, 'loadedmem');
    ck('a probe whose transcript carries a claude-mem context reads memory LOADED: exit 1, and cwdprobe-2 is then refused', bad.status === 1 && /memory LOADED|LOADED/.test(out(bad)) && F(['cwdprobe-2', '--probe', ...PINARG]).status === 2);
    fs.rmSync(path.join(LG, 'grader-cwd.launches.jsonl'), { force: true }); fs.rmSync(path.join(GR, 'cwdprobe-1-a1'), { recursive: true, force: true });
    for (const d of fs.readdirSync(PR)) fs.rmSync(path.join(PR, d), { recursive: true, force: true });
    const badModel = probeRun(1, 'badmodel');
    ck('a probe that reports a model other than the pin fails (exit 1)', badModel.status === 1);
    fs.rmSync(path.join(LG, 'grader-cwd.launches.jsonl'), { force: true }); fs.rmSync(path.join(GR, 'cwdprobe-1-a1'), { recursive: true, force: true });
    for (const d of fs.readdirSync(PR)) fs.rmSync(path.join(PR, d), { recursive: true, force: true });
    const extra = probeRun(1, 'probe-extra');
    ck('a probe with one Read too many fails (exit 1)', extra.status === 1);
    fs.rmSync(path.join(LG, 'grader-cwd.launches.jsonl'), { force: true }); fs.rmSync(path.join(GR, 'cwdprobe-1-a1'), { recursive: true, force: true });
    for (const d of fs.readdirSync(PR)) fs.rmSync(path.join(PR, d), { recursive: true, force: true });
    const p1 = probeRun(1), p2 = probeRun(2), p3 = probeRun(3);
    ck('the three clean probes run in order and each exits 0 (cwdprobe-3 reports the alias)', p1.status === 0 && p2.status === 0 && p3.status === 0 && /alias read: `opus` resolves to claude-opus-5-5/.test(out(p3)), `${p1.status}${p2.status}${p3.status}`);
    const recs = fs.readFileSync(path.join(LG, 'grader-cwd.launches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const lsha = sha(fs.readFileSync(LAUNCHER)).slice(0, 12);
    ck('probe records carry the launcher sha12, the memory status and the transcript models; the probe-1 model is the pin', recs.length === 3 && recs.every((x) => x.launcher === lsha && x.memory === 'ABSENT' && Array.isArray(x.models)) && recs[0].models.join() === 'claude-opus-5-5');
    const dg = run(['blind-1.g1', '--run-dir', RUN, ...PINARG, '--dry-run']);
    ck('after the three probes the dry run reports the gate OK and names the alias model', /probe gate: OK \(alias read: opus -> claude-opus-5-5\)/.test(out(dg)));
}

// ---- the gate on canned transcripts: a clean state is copied, one thing is broken, the gate must say BLOCKED naming it
{
    const cp = (src, dst) => { fs.rmSync(dst, { recursive: true, force: true }); fs.cpSync(src, dst, { recursive: true }); };
    const recsFile = path.join(LG, 'grader-cwd.launches.jsonl');
    const recs = () => fs.readFileSync(recsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const transcriptOf = (root, slot) => { const r = recs().find((x) => x.slot === slot); for (const d of fs.readdirSync(root)) { const f = path.join(root, d, `${r.session_id}.jsonl`); if (fs.existsSync(f)) return f; } return null; };
    const scenario = (name, mutate, rx) => {
        const lg = path.join(TMP, 'g-logs'), pr = path.join(TMP, 'g-proj'); cp(LG, lg); cp(PR, pr);
        mutate({ lg, pr, file: path.join(lg, 'grader-cwd.launches.jsonl'), t: (slot) => transcriptOf(pr, slot) });
        const before = invoked();
        const dry = run(['blind-1.g1', '--run-dir', RUN, ...PINARG, '--dry-run'], { RD_LOG_DIR: lg, TURN_PROJECTS: pr });
        const real = F(['blind-1.g1', '--run-dir', RUN, ...PINARG], 'ok', { RD_LOG_DIR: lg, TURN_PROJECTS: pr });
        ck(`gate BLOCKS on ${name}: the dry run says BLOCKED (${rx}) and a REAL launch is refused (exit 2) without invoking the stand-in`, /probe gate: BLOCKED/.test(out(dry)) && rx.test(out(dry)) && real.status === 2 && /probe gate is not passed/.test(out(real)) && invoked() === before, `${(out(dry).match(/probe gate: [^\n]*/) ?? [''])[0].slice(0, 160)}`);
    };
    const edit = (f, fn) => fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8')));
    const editRecs = (file, fn) => fs.writeFileSync(file, recs_(file).map(fn).filter(Boolean).map((r) => JSON.stringify(r)).join('\n') + '\n');
    const recs_ = (file) => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    scenario('a claude-mem context in the probe-1 transcript (memory LOADED)', ({ t }) => fs.appendFileSync(t('cwdprobe-1'), `${JSON.stringify({ type: 'user', message: { content: '# [natively] recent context, 2026-10-07 12:00 <claude-mem-context>' } })}\n`), /memory LOADED/);
    scenario('a project-memory marker in the probe-2 transcript', ({ t }) => fs.appendFileSync(t('cwdprobe-2'), `${JSON.stringify({ type: 'user', message: { content: 'the Memory Index of the project' } })}\n`), /cwdprobe-2: memory LOADED/);
    scenario('a claude-mem context in the ALIAS probe transcript', ({ t }) => fs.appendFileSync(t('cwdprobe-3'), `${JSON.stringify({ type: 'user', message: { content: '<claude-mem-context> x' } })}\n`), /cwdprobe-3: memory LOADED/);
    scenario('an extra Read in probe 1', ({ t }) => fs.appendFileSync(t('cwdprobe-1'), `${JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', name: 'Read', input: {} }] } })}\n`), /cwdprobe-1: tools/);
    scenario('a Bash call in probe 2', ({ t }) => fs.appendFileSync(t('cwdprobe-2'), `${JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } })}\n`), /cwdprobe-2: tools/);
    scenario('an assistant message of another model in probe 1', ({ t }) => fs.appendFileSync(t('cwdprobe-1'), `${JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5', content: [{ type: 'text', text: 'x' }] } })}\n`), /cwdprobe-1: transcript models/);
    scenario('a probe-1 transcript with no model field at all', ({ t }) => edit(t('cwdprobe-1'), (s) => s.split('\n').map((l) => l.replace(/"model":"[^"]*",?/, '')).join('\n')), /cwdprobe-1: transcript models/);
    scenario('a missing probe-1 transcript', ({ t }) => fs.rmSync(t('cwdprobe-1')), /cwdprobe-1: its transcript was not found/);
    scenario('a probe-1 record written by another launcher version', ({ file }) => editRecs(file, (r) => (r.slot === 'cwdprobe-1' ? { ...r, launcher: 'deadbeefdead' } : r)), /cwdprobe-1: written by another launcher version/);
    scenario('a probe-2 record with exit 1', ({ file }) => editRecs(file, (r) => (r.slot === 'cwdprobe-2' ? { ...r, exit: 1 } : r)), /cwdprobe-2: exit 1/);
    scenario('no alias probe record (cwdprobe-3 never ran)', ({ file }) => editRecs(file, (r) => (r.slot === 'cwdprobe-3' ? null : r)), /cwdprobe-3: no record/);
    scenario('a probe-1 record whose CLI model is not the pin', ({ file }) => editRecs(file, (r) => (r.slot === 'cwdprobe-1' ? { ...r, model: 'claude-opus-5' } : r)), /cwdprobe-1: the CLI reports model/);
    scenario('a probe-1 record with a non-empty memory folder', ({ file }) => editRecs(file, (r) => (r.slot === 'cwdprobe-1' ? { ...r, memoryDir: 'non-empty' } : r)), /cwdprobe-1: the projects folder holds a non-empty memory/);
    scenario('no launch records at all', ({ file }) => fs.rmSync(file), /cwdprobe-1: no record/);
    // the control: the untouched state is OK (so the scenarios above are not blocked for an unrelated reason)
    cp(LG, path.join(TMP, 'g-logs')); cp(PR, path.join(TMP, 'g-proj'));
    ck('gate control: the untouched copy of the clean state is OK (the BLOCKED cases above are caused by the break, not by the copy)', /probe gate: OK/.test(out(run(['blind-1.g1', '--run-dir', RUN, ...PINARG, '--dry-run'], { RD_LOG_DIR: path.join(TMP, 'g-logs'), TURN_PROJECTS: path.join(TMP, 'g-proj') }))));
}

// ================================================================= 7. real grader launches against the stand-in (gate OK)
{
    const lsha = sha(fs.readFileSync(LAUNCHER)).slice(0, 12);
    const launches = () => (fs.existsSync(path.join(LG, 'launches.jsonl')) ? fs.readFileSync(path.join(LG, 'launches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
    const g = F(['blind-1.g1', '--run-dir', RUN, ...PINARG]);
    const rec = launches().at(-1);
    ck('a clean grader launch: exit 0, "PINNED", "valid on its pairs (3 keys)", the verdicts file written in the verdicts folder', g.status === 0 && /PINNED/.test(out(g)) && /valid on its pairs \(3 keys\)/.test(out(g)) && fs.existsSync(path.join(VD, 'verdicts.blind-1.g1.json')), out(g).split('\n').slice(-3).join(' | ').slice(0, 200));
    ck('its launch record: slot, launcher sha12, memory ABSENT, pinned true, models = the pin, tools Read/Write only, slugJsonl 1', rec?.slot === 'blind-1.g1' && rec.launcher === lsha && rec.memory === 'ABSENT' && rec.pinned === true && rec.models.join() === 'claude-opus-5-5' && Object.keys(rec.tools).every((t) => ['Read', 'Write', 'Edit'].includes(t)) && rec.slugJsonl === 1 && rec.exit === 0);
    ck('the stdout of a launch carries no question or answer text (ids, counts, hashes only)', !/cal question|cal answer|cal heard/.test(out(g)));
    const again = F(['blind-1.g1', '--run-dir', RUN, ...PINARG]);
    ck('launching the same tag again is refused (exit 2) while its verdicts file exists', again.status === 2 && /already exists/.test(out(again)));
    const a2 = F(['blind-1.g2', '--run-dir', RUN, ...PINARG, '--attempt', '2']);
    ck('another tag with --attempt 2 uses its own fresh cwd (blind-1.g2-a2)', a2.status === 0 && fs.existsSync(path.join(GR, 'blind-1.g2-a2')));
    const modes = [
        ['blind-2.g1', 'loadedmem', 1, /memory LOADED/, 'a transcript with a claude-mem context (memory LOADED)'],
        ['blind-2.g2', 'projmem', 1, /memory LOADED/, 'a transcript with a project-memory marker'],
        ['blind-3.g1', 'badmodel', 1, /MODEL IS NOT THE PIN/, 'a CLI that reports claude-opus-5'],
        ['blind-3.g2', 'msgmodel', 1, /MODEL IS NOT THE PIN/, 'a transcript whose assistant messages are another model (CLI says the pin)'],
        ['blind-4.g1', 'nomodel', 1, /MODEL IS NOT THE PIN/, 'a transcript with no model field (the model cannot be read)'],
        ['blind-4.g2', 'incomplete', 1, /MISSING\/INVALID/, 'a verdicts file missing a key'],
        ['inapp.g1', 'bash', 1, /TOOL OUTSIDE/, 'a Bash call in the transcript'],
        ['inapp.g2', 'exit1', 1, /exit 1/, 'a CLI exit code 1'],
        ['blind-1.g2-suffix', 'suffix', 1, /MODEL IS NOT THE PIN/, 'a CLI that reports the pin with a suffix (claude-opus-5-5[1m]); pinned means EQUAL to claude-opus-5-5'],
        ['high', 'ratelimit', 1, /RATE-LIMIT-REFUSAL/, 'a rate-limit refusal (no model, no tool call)'],
    ];
    for (const [tag0, mode, code, rx, what] of modes) { const tag = tag0.replace('-suffix', '').replace('blind-1.g2', 'blind-1.g2'); if (tag0.endsWith('-suffix')) fs.rmSync(path.join(VD, 'verdicts.blind-1.g2.json'), { force: true }); const r = F([tag, '--run-dir', RUN, ...PINARG, ...(tag0.endsWith('-suffix') ? ['--attempt', '3'] : [])], mode); ck(`failure mode: ${what}: exit ${code} and the line says so`, r.status === code && rx.test(out(r)), `exit ${r.status} ${(out(r).match(rx) ?? ['no match'])[0]}`); }
    const rl = launches().filter((x) => x.slot === 'blind-2.g1').at(-1), rb = launches().filter((x) => x.slot === 'blind-3.g1').at(-1);
    ck('the failed launches are recorded as they were (memory LOADED / pinned false), so the scorer refuses them', rl?.memory === 'LOADED' && rb?.pinned === false);
    for (const tag of ['low', 'captured-high']) { const r = F([tag, '--run-dir', RUN, ...PINARG]); ck(`single-grader arm ${tag}: launches clean (exit 0) and writes verdicts.${tag}.json`, r.status === 0 && fs.existsSync(path.join(VD, `verdicts.${tag}.json`))); }
    // the two instruments agree: the scorer's provenance rule reads the launcher's own records (slot names, memory, pinned) and its verdict file names
    const SC = await import(pathToFileURL(path.join(HERE, 'score-rd.mjs')).href);
    const all = launches();
    const pairsOf = { 'blind-1.g1': 'router-blind/pairs.blind-1.json', 'blind-1.g2': 'router-blind/pairs.blind-1.json', low: 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json', 'captured-high': 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json' };
    const bind = (s, over = {}) => ({ launcherSha: lsha, pairsFile: path.join(RUN, pairsOf[s]), verdictsFile: path.join(VD, `verdicts.${s}.json`), ...over });
    ck('scorer <-> launcher: the scorer accepts the launcher\'s clean records (blind-1.g1, blind-1.g2, low, captured-high)', ['blind-1.g1', 'low', 'captured-high'].every((s) => SC.provenanceProblem(all, s, bind(s)) === null), ['blind-1.g1', 'low', 'captured-high'].map((s) => SC.provenanceProblem(all, s, bind(s))).join('|'));
    ck('scorer <-> launcher: the record binds the files: sha12 of the verdicts file and of the pairs file are recorded, and a different verdicts file (another slot\'s), a changed pairs file or another launcher version is refused (I-4, m-3)', (() => { const r = all.filter((x) => x.slot === 'blind-1.g1').at(-1); return r.verdictsSha12 === sha(fs.readFileSync(path.join(VD, 'verdicts.blind-1.g1.json'))).slice(0, 12) && r.pairsSha12 === sha(fs.readFileSync(path.join(RUN, pairsOf['blind-1.g1']))).slice(0, 12); })() && !!SC.provenanceProblem(all, 'blind-1.g1', bind('blind-1.g1', { verdictsFile: path.join(VD, 'verdicts.low.json') })) && !!SC.provenanceProblem(all, 'blind-1.g1', bind('blind-1.g1', { pairsFile: path.join(RUN, pairsOf.low) })) && !!SC.provenanceProblem(all, 'blind-1.g1', bind('blind-1.g1', { launcherSha: 'deadbeefdead' })));
    ck('scorer <-> launcher: the scorer REFUSES the launcher\'s failed records (memory LOADED, not the pin, model unreadable, Bash used, exit 1) -- each slot gets a reason', ['blind-2.g1', 'blind-2.g2', 'blind-3.g1', 'blind-3.g2', 'blind-4.g1', 'inapp.g2'].every((s) => !!SC.provenanceProblem(all, s)), ['blind-2.g1', 'blind-3.g1', 'blind-3.g2', 'blind-4.g1', 'inapp.g2'].map((s) => `${s}:${(SC.provenanceProblem(all, s) ?? 'ACCEPTED').slice(0, 24)}`).join(' '));
    ck('scorer <-> launcher: the verdict files the launcher wrote sit where the scorer reads them (verdicts.<tag>.json for a slot, verdicts.<arm>.json for a single-grader arm)', ['blind-1.g1', 'blind-1.g2', 'low', 'captured-high'].every((t) => fs.existsSync(path.join(VD, `verdicts.${t}.json`))));
    const vf = JSON.parse(fs.readFileSync(path.join(VD, 'verdicts.blind-1.g1.json'), 'utf8')), keys = Object.fromEntries(Object.keys(vf).map((k) => [k, 1]));
    ck('scorer <-> launcher: a verdicts file the launcher accepted passes the scorer\'s own verdict check on the same pairs keys', SC.verdictProblem(vf, keys) === null && Object.keys(vf).length === 3);
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* temp */ }
const failed = results.filter((r) => !r.ok);
console.log(`CAL LAUNCH-GRADER-RD: ${results.length - failed.length}/${results.length} PASS${failed.length ? `; FAILED: ${failed.map((f) => f.name.slice(0, 60)).join(' || ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
