// cal-launch-grader-diag38.mjs: calibration of launch-grader-diag38.mjs. NO MODEL IS CALLED: the launcher runs against a stand-in for the claude binary (TURN_FAKE_CLAUDE, DIAG38_CAL=1)
// with PATH stripped (proved below; the stand-in logs every invocation so "nothing was launched" is a count). Everything is written under a temp folder.
//   node cal-launch-grader-diag38.mjs                  the suite (DIAG38_LAUNCHER=<file in this folder> runs it on a mutant; DIAG38_FAILFAST=1 stops at the first FAIL)
//   node cal-launch-grader-diag38.mjs --mutants        the suite against every mutant of the launcher: each must FAIL at least one check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const LAUNCHER = path.resolve(HERE, process.env.DIAG38_LAUNCHER ?? 'launch-grader-diag38.mjs');
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F_R = `${SP}/followup-turn/R`;
const RD_DIR = path.join(HERE, '..', 'grade');
const sha12f = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 12);

export const MUTANTS = [
    ['pin not exact (any model id)', 'if (modelId != null && modelId !== PIN)', 'if (false)'],
    ['real launch without --model-id allowed', "if (!modelId && !dry) refuse(`a real grader launch needs", "if (false) refuse(`a real grader launch needs"],
    ['setting-sources dropped', ", '--strict-mcp-config', '--setting-sources', 'project,local'];", ", '--strict-mcp-config'];"],
    ['probe gate bypassed', "if (!gate.ok) refuse(`the probe gate is not passed:", "if (false) refuse(`the probe gate is not passed:"],
    ['rd record accepted without checking the writer sha', "if (rec.launcher !== launcherSha) return `written by another", "if (false) return `written by another"],
    ['rd launcher sha not required to be the accepted one', 'rdNow !== ACCEPTED_RD_LAUNCHER ?', 'false ?'],
    ['accepted rd sha is a different one', "export const ACCEPTED_RD_LAUNCHER = 'edfef2aa8a98';", "export const ACCEPTED_RD_LAUNCHER = 'edfef2aa8a99';"],
    ['pairs folder content not checked', 'if (dp) refuse(dp);\n    const { pairsPath', 'const { pairsPath'],
    ['blind tags of the registered run accepted', "const m = /^diag38-(\\d+)$/.exec(tag ?? '');", "const m = /^(?:diag38|blind)-(\\d+)$/.exec(tag ?? '');"],
    ['tag range not checked', '|| +m[1] < 1 || +m[1] > N_FILES) return null;', ') return null;'],
    ['transcript model not compared to the pin', 'const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));', 'const pinned = modelMatchesPin(r.record.model, PIN);'],
    ['pin match tolerant of a suffix', "model.split('+').every((m) => m === pin);", "model.split('+').every((m) => m === pin || m.startsWith(`${pin}[`));"],
    ['exit ignores memory', "rec.memory === 'ABSENT' && toolsOk", 'toolsOk'],
    ['exit ignores tools', '&& toolsOk && pinned', '&& pinned'],
    ['gate tools unchecked', "if (tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) return", 'if (false) return'],
    ['gate memory unchecked', 'if (mem.loaded) return `memory LOADED', 'if (false) return `memory LOADED'],
    ['gate model unchecked', "if (!ms.length || !ms.every((m) => modelMatchesPin(m, PIN))) return", 'if (false) return'],
    ['test seam allowed in a real run', 'if (!CAL && SEAMS.some((s) => process.env[s])) {', 'if (false) {'],
    ['existing verdicts overwritten', "if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists", "if (false) refuse(`${verdictsPath} already exists"],
    ['launch record loses the pairs sha', 'pairsSha12: sha12(fs.readFileSync(pairsPath)),', 'pairsSha12: null,'],
    ['own probe 2 allowed before probe 1', 'if (why) { say(`${probe}: ${dry ?', 'if (false) { say(`${probe}: ${dry ?'],
    ['gate needs neither source (either side open)', 'ok: rd.ok || own.ok, via:', 'ok: true, via:'],
];

if (argv.includes('--mutants')) {
    const src = fs.readFileSync(path.join(HERE, 'launch-grader-diag38.mjs'), 'utf8');
    let caught = 0; const lines = [];
    MUTANTS.forEach(([name, from, to], i) => {
        const n = src.split(from).length - 1;
        if (n !== 1) { lines.push(`ERROR ${name}: anchor occurs ${n} times (must be 1)`); return; }
        const f = path.join(HERE, `launch-grader-diag38.mut${i}.mjs`);
        fs.writeFileSync(f, src.replace(from, () => to));
        const r = spawnSync(process.execPath, [path.join(HERE, 'cal-launch-grader-diag38.mjs')], { encoding: 'utf8', timeout: 900000, env: { ...process.env, DIAG38_LAUNCHER: path.basename(f), DIAG38_FAILFAST: '1' } });
        fs.rmSync(f, { force: true });
        const ok = r.status !== 0;
        if (ok) caught++;
        lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${name}`);
        console.log(lines.at(-1));
    });
    console.log(`MUTANTS ${caught} of ${MUTANTS.length} caught`);
    process.exit(caught === MUTANTS.length ? 0 : 1);
}

const FAKE = `// stand-in for the claude binary (cal only): logs the invocation, writes verdicts and a transcript, prints the CLI's JSON result. Mode in RD_FAKE_MODE.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const { projectSlug } = await import(pathToFileURL(process.env.RD_F_R + '/launch-grader.mjs').href);
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1], model = args[args.indexOf('--model') + 1];
fs.appendFileSync(process.env.RD_FAKE_LOG, 'invoked ' + model + '\\n');
fs.appendFileSync(process.env.RD_FAKE_LOG + '.args', JSON.stringify(args) + '\\n');
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

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => { if (cond) pass++; else { fail++; console.log(`FAIL ${name}${extra ? `  [${extra}]` : ''}`); if (process.env.DIAG38_FAILFAST === '1') process.exit(1); } };
const out = (r) => r.stdout + r.stderr;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-diag38-launch-'));
const GR = path.join(TMP, 'grading'), VD = path.join(TMP, 'verdicts'), LG = path.join(TMP, 'logs'), PR = path.join(TMP, 'projects'), BIN = path.join(TMP, 'bin'), PAIRS = path.join(TMP, 'pairs'), FLOG = path.join(TMP, 'fake.log'), RDP = path.join(TMP, 'rd-probes.jsonl');
for (const d of [GR, VD, LG, PR, BIN, PAIRS]) fs.mkdirSync(d, { recursive: true });
const fakePath = path.join(TMP, 'fake-claude.mjs'); fs.writeFileSync(fakePath, FAKE);
const items = (n) => ({ model: 'x', rubric: 'r', items: Array.from({ length: n }, (_, i) => ({ key: `q${String(i + 1).padStart(2, '0')}`, id: `q${String(i + 1).padStart(2, '0')}`, kind: 'spoken', question: 'cal question', heard: 'cal heard', answer: `cal answer ${i}` })) });
for (let n = 1; n <= 2; n++) fs.writeFileSync(path.join(PAIRS, `pairs.diag38-${n}.json`), JSON.stringify(items(3)));
const env = (extra = {}) => ({ ...process.env, DIAG38_CAL: '1', DIAG38_GRADING_DIR: GR, DIAG38_VERDICT_DIR: VD, DIAG38_LOG_DIR: LG, DIAG38_PAIRS_DIR: PAIRS, DIAG38_RD_PROBES: RDP, TURN_PROJECTS: PR, RD_F_R: F_R, RD_FAKE_LOG: FLOG, PATH: `${BIN};C:\\Windows\\System32`, ...extra });
const run = (args, extra) => spawnSync(process.execPath, [LAUNCHER, ...args], { encoding: 'utf8', env: env(extra), timeout: 180000 });
const F = (args, mode = 'ok', extra = {}) => run(args, { TURN_FAKE_CLAUDE: fakePath, RD_FAKE_MODE: mode, ...extra });
const invoked = () => (fs.existsSync(FLOG) ? fs.readFileSync(FLOG, 'utf8').split('\n').filter(Boolean).length : 0);
const PINARG = ['--model-id', 'claude-opus-5-5'];
const PIN = 'claude-opus-5-5';
const launches = () => (fs.existsSync(path.join(LG, 'launches.jsonl')) ? fs.readFileSync(path.join(LG, 'launches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const rmVerdicts = () => { for (const f of fs.readdirSync(VD)) fs.rmSync(path.join(VD, f)); };

// the module under test, in this process (its seams point into TMP)
Object.assign(process.env, { DIAG38_CAL: '1', DIAG38_GRADING_DIR: GR, DIAG38_VERDICT_DIR: VD, DIAG38_LOG_DIR: LG, DIAG38_PAIRS_DIR: PAIRS, DIAG38_RD_PROBES: RDP, TURN_PROJECTS: PR });
const M = await import(pathToFileURL(LAUNCHER).href);
const D = await import(pathToFileURL(path.join(HERE, 'diag38.mjs')).href);

// ================================================================= 0. tripwire, the registered launcher untouched, derived constants
const w = spawnSync('cmd.exe', ['/d', '/c', 'where claude'], { encoding: 'utf8', env: env() });
ck('tripwire: with this PATH no real `claude` is reachable', w.status !== 0, `where exit ${w.status}`);
ck('the registered launcher is still the accepted sha12 (not edited)', sha12f(path.join(RD_DIR, 'launch-grader-rd.mjs')) === M.ACCEPTED_RD_LAUNCHER, sha12f(path.join(RD_DIR, 'launch-grader-rd.mjs')));
ck('the pin is exactly claude-opus-5-5', M.PIN === 'claude-opus-5-5');
ck('N_FILES equals the exporter\'s', M.N_FILES === D.N_FILES);
ck('FLAGS carry --setting-sources project,local, Read,Write,Edit, dontAsk, strict MCP, no add-dir', (() => { const f = M.FLAGS('P', 'm'); const i = f.indexOf('--setting-sources'); return f[i + 1] === 'project,local' && f[f.indexOf('--tools') + 1] === 'Read,Write,Edit' && f[f.indexOf('--permission-mode') + 1] === 'dontAsk' && f.includes('--strict-mcp-config') && !f.some((x) => /add-dir/.test(x)); })());
{ // the same argv form and dispatch substitution as the registered launcher (it is imported in a child process: it sets grading-dir environment at import)
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `const R = await import(${JSON.stringify(pathToFileURL(path.join(RD_DIR, 'launch-grader-rd.mjs')).href)}); const t = 'x RUN\\\\<pairs file> y <VERDICTS_FILE> = VERDICTS z \`TAG\`'; console.log(JSON.stringify({ f: R.FLAGS('P', 'm'), pin: R.PIN, p: R.buildPromptFiles(t, { pairs: 'C:/a/p.json', verdicts: 'C:/a/v.json', tag: 'tg' }), pa: R.pairsArgs({ prompt: 'P', pairs: 'C:/a/p.json', verdicts: 'C:/a/v.json', rubric: 'C:/a/r.md', model: 'm' }).args, mm: [R.modelMatchesPin('a[1m]', 'a'), R.modelMatchesPin('a', 'a'), R.modelMatchesPin('a+b', 'a')] }));`], { encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TURN_|DIAG38_|RD_)/.test(k))) });
    let R = null; try { R = JSON.parse(child.stdout.trim().split('\n').at(-1)); } catch { /* reported by the checks */ }
    const t = 'x RUN\\<pairs file> y <VERDICTS_FILE> = VERDICTS z `TAG`';
    ck('argv form: FLAGS identical to the registered launcher\'s', R && JSON.stringify(R.f) === JSON.stringify(M.FLAGS('P', 'm')), child.stderr.slice(0, 100));
    ck('argv form: pairs rules and flags identical to the registered launcher\'s', R && JSON.stringify(R.pa) === JSON.stringify(M.pairsArgs({ prompt: 'P', pairs: 'C:/a/p.json', verdicts: 'C:/a/v.json', rubric: 'C:/a/r.md', model: 'm' }).args));
    ck('dispatch substitution identical to the registered launcher\'s', R && R.p === M.buildPromptFiles(t, { pairs: 'C:/a/p.json', verdicts: 'C:/a/v.json', tag: 'tg' }));
    ck('pin identical to the registered launcher\'s; pin match identical', R && R.pin === M.PIN && JSON.stringify(R.mm) === JSON.stringify([M.modelMatchesPin('a[1m]', 'a'), M.modelMatchesPin('a', 'a'), M.modelMatchesPin('a+b', 'a')]));
    const dispatchBytes = fs.readFileSync(path.join(RD_DIR, 'rd-grader-dispatch.txt'));
    const dchild = spawnSync(process.execPath, ['--input-type=module', '-e', `const M = await import(${JSON.stringify(pathToFileURL(LAUNCHER).href)}); console.log(M.DISPATCH);`], { encoding: 'utf8', env: { ...process.env, DIAG38_CAL: '', TURN_FAKE_CLAUDE: '', TURN_PROJECTS: '', DIAG38_GRADING_DIR: '', DIAG38_VERDICT_DIR: '', DIAG38_LOG_DIR: '', DIAG38_PAIRS_DIR: '', DIAG38_RD_PROBES: '', DIAG38_DISPATCH: '' } });
    ck('the dispatch text file is the registered rd-grader-dispatch.txt (read-only reuse)', path.resolve(dchild.stdout.trim()) === path.resolve(RD_DIR, 'rd-grader-dispatch.txt') && dispatchBytes.length > 100, dchild.stdout.slice(0, 100) + dchild.stderr.slice(0, 100));
}

// ================================================================= 1. refusals that launch nothing
const seamReal = spawnSync(process.execPath, [LAUNCHER, 'diag38-1', ...PINARG, '--dry-run'], { encoding: 'utf8', env: { ...process.env, DIAG38_CAL: '', TURN_FAKE_CLAUDE: fakePath, RD_FAKE_LOG: FLOG } });
ck('a test seam (TURN_FAKE_CLAUDE) without DIAG38_CAL=1 is refused (exit 2)', seamReal.status === 2 && /test seam/.test(out(seamReal)));
const before = invoked();
for (const [name, args, rx] of [
    ['a model id that is not the pin (opus alias)', ['diag38-1', '--model-id', 'opus'], /not the pin/],
    ['claude-opus-5 (older)', ['diag38-1', '--model-id', 'claude-opus-5'], /not the pin/],
    ['a suffixed pin', ['diag38-1', '--model-id', 'claude-opus-5-5[1m]'], /not the pin/],
    ['no model id on a real launch', ['diag38-1'], /needs --model-id/],
    ['a registered-run tag (blind-1.g1)', ['blind-1.g1', ...PINARG], /not a tag of this launcher/],
    ['a registered-run style tag (blind-1)', ['blind-1', ...PINARG], /not a tag of this launcher/],
    ['tag diag38-3 (out of range)', ['diag38-3', ...PINARG], /not a tag of this launcher/],
    ['tag diag38-0', ['diag38-0', ...PINARG], /not a tag of this launcher/],
    ['a path-like tag', ['../diag38-1', ...PINARG], /not a tag of this launcher/],
    ['no tag', [...PINARG], /no tag given/],
    ['an unknown option (--run-dir)', ['diag38-1', ...PINARG, '--run-dir', 'x'], /unknown option/],
    ['--probe without a probe name', ['--probe', ...PINARG], /--probe goes with/],
    ['cwdprobe-3 with --model-id', ['cwdprobe-3', '--probe', ...PINARG], /must not carry --model-id/],
    ['a pinned probe without --model-id', ['cwdprobe-1', '--probe'], /pinned probe/],
]) { const r = F(args); ck(`refused (exit 2): ${name}`, r.status === 2 && rx.test(out(r)), `exit ${r.status} ${out(r).slice(0, 120)}`); }
ck('none of the refusals launched the stand-in', invoked() === before, `${invoked() - before} invocations`);
{ // the pairs folder must hold only pairs.diag38-N.json
    fs.writeFileSync(path.join(PAIRS, 'key-diag38.json'), '{}');
    const r = F(['diag38-1', ...PINARG, '--dry-run']);
    ck('a stray file (a key) in the pairs folder refuses the folder', r.status === 2 && /holds files that are not pairs/.test(out(r)));
    fs.rmSync(path.join(PAIRS, 'key-diag38.json'));
    const ok1 = F(['diag38-1', ...PINARG, '--dry-run']);
    ck('the clean pairs folder is accepted (dry run)', ok1.status === 0 && /DRY RUN diag38-1 attempt 1: 1 grader for this file; 3 items; model claude-opus-5-5/.test(out(ok1)), out(ok1).slice(0, 200));
    ck('dry run prints the setting sources and the three permission rules (pairs, rubric, verdicts)', /--setting-sources project,local/.test(out(ok1)) && /permission rules: Read\(.*pairs\.diag38-1\.json.*\| Read\(.*\| Edit\(.*verdicts\.diag38-1\.json/.test(out(ok1)));
}

// ================================================================= 2. the probe gate
const gateBlocked = F(['diag38-1', ...PINARG]);
ck('a real launch with no probe record is refused by the gate; nothing launched', gateBlocked.status === 2 && /probe gate is not passed/.test(out(gateBlocked)) && invoked() === before);
const plan0 = run(['--plan']);
ck('--plan calls nothing and reports the gate BLOCKED', plan0.status === 0 && /PLAN probe gate: BLOCKED/.test(out(plan0)) && /PLAN diag38-1 +graders-of-this-file=1 pairs=3 items/.test(out(plan0)) && invoked() === before, out(plan0).slice(0, 300));

// fabricated registered-launcher probe records (the real record's shape), each with a transcript
const SLUG = 'cal-slug';
function mkSession({ launcher = M.ACCEPTED_RD_LAUNCHER, mode = 'ok', slot = 'cwdprobe-1', exit = 0, model = PIN } = {}) {
    const id = `${slot}-${mode}-${Math.random().toString(16).slice(2, 10)}`;
    const dir = path.join(PR, `${SLUG}-${id}`); fs.mkdirSync(dir, { recursive: true });
    const mm = mode === 'wrongmodel' ? 'claude-opus-5' : model;
    const asst = (name) => JSON.stringify({ type: 'assistant', message: { model: mm, content: [{ type: 'tool_use', name, input: {} }] } });
    const lines = [JSON.stringify({ type: 'user', message: { content: 'p' } }), asst('Read'), asst('Write')];
    if (mode === 'extratool') lines.push(asst('Bash'));
    if (mode === 'tworeads') lines.push(asst('Read'));
    if (mode === 'loadedmem') lines.push(JSON.stringify({ type: 'user', message: { content: '<claude-mem-context> x </claude-mem-context>' } }));
    fs.writeFileSync(path.join(dir, `${id}.jsonl`), lines.join('\n') + '\n');
    return { slot, attempt: 1, session_id: id, model: mm, exit, launcher, slugJsonl: 1, memoryDir: 'absent', memory: 'ABSENT' };
}
const writeRd = (recs) => fs.writeFileSync(RDP, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
const rdSet = (o = {}) => ['cwdprobe-1', 'cwdprobe-2', 'cwdprobe-3'].map((slot) => mkSession({ slot, ...(o[slot] ?? {}) }));
{ // unit: what a probe record must satisfy (the same checks as the registered launcher)
    const P = (rec, o = {}) => M.probeRecordProblem(rec, { projects: PR, launcherSha: M.ACCEPTED_RD_LAUNCHER, ...o });
    ck('probe record: clean record accepted', P(mkSession()) === null, String(P(mkSession())));
    ck('probe record: written by another launcher sha refused', /another launcher version/.test(P(mkSession({ launcher: 'aaaaaaaaaaaa' })) ?? ''));
    ck('probe record: exit 1 refused', /exit 1/.test(P(mkSession({ exit: 1 })) ?? ''));
    ck('probe record: an extra tool refused', /tools/.test(P(mkSession({ mode: 'extratool' })) ?? ''));
    ck('probe record: two Reads refused', /tools/.test(P(mkSession({ mode: 'tworeads' })) ?? ''));
    ck('probe record: memory LOADED refused', /memory LOADED/.test(P(mkSession({ mode: 'loadedmem' })) ?? ''));
    ck('probe record: a transcript model that is not the pin refused (CLI model also wrong)', /not the pin/.test(P(mkSession({ mode: 'wrongmodel' })) ?? ''));
    const r = mkSession(); r.model = PIN; const t = path.join(PR, `${SLUG}-${r.session_id}`, `${r.session_id}.jsonl`);
    fs.writeFileSync(t, fs.readFileSync(t, 'utf8').replace(/"model":"claude-opus-5-5"/g, '"model":"claude-opus-5"'));
    ck('probe record: CLI model = pin but the transcript model is not: refused', /transcript models/.test(P(r) ?? ''));
    ck('probe record: a missing transcript refused', /transcript was not found/.test(P({ ...mkSession(), session_id: 'nope' }) ?? ''));
    ck('probe record: the alias probe is not pin-checked', P(mkSession({ model: 'claude-opus-5-5' }), { alias: true }) === null);
}
writeRd(rdSet());
const gate1 = M.probeGate({ ownFile: path.join(LG, 'grader-cwd.launches.jsonl'), projects: PR });
ck('gate: the registered launcher\'s three clean probes (by sha) open it', gate1.ok && /registered launcher/.test(gate1.via ?? ''), JSON.stringify(gate1.problems));
writeRd(rdSet({ 'cwdprobe-2': { launcher: 'bbbbbbbbbbbb' } }));
ck('gate: one probe written by another sha keeps it shut', !M.probeGate({ ownFile: path.join(LG, 'none.jsonl'), projects: PR }).ok);
writeRd(rdSet({ 'cwdprobe-1': { mode: 'loadedmem' } }));
ck('gate: one probe with memory loaded keeps it shut', !M.probeGate({ ownFile: path.join(LG, 'none.jsonl'), projects: PR }).ok);
writeRd(rdSet({ 'cwdprobe-3': { mode: 'extratool' } }));
ck('gate: one probe with a foreign tool keeps it shut', !M.probeGate({ ownFile: path.join(LG, 'none.jsonl'), projects: PR }).ok);
writeRd(rdSet());
const edited = path.join(TMP, 'rd-edited.mjs'); fs.writeFileSync(edited, fs.readFileSync(path.join(RD_DIR, 'launch-grader-rd.mjs'), 'utf8') + '\n// edited\n');
ck('gate: clean records but the registered launcher file is no longer the accepted sha: shut', !M.probeGate({ ownFile: path.join(LG, 'none.jsonl'), rdLauncher: edited, projects: PR }).ok);

// ================================================================= 3. a real (stand-in) grader launch through the accepted registered probes
writeRd(rdSet());
const n0 = invoked();
const g1 = F(['diag38-1', ...PINARG]);
ck('grader launch accepted via the registered probes: exit 0, PINNED, memory ABSENT', g1.status === 0 && /PINNED/.test(out(g1)) && /memory ABSENT/.test(out(g1)) && /valid on its pairs \(3 keys\)/.test(out(g1)) && invoked() === n0 + 1, `exit ${g1.status} ${out(g1).slice(-300)}`);
const rec1 = launches().at(-1);
ck('launch record: slot, pin, pinned, models, tools, memory, launcher sha, gate source, pairs sha, verdicts sha', rec1 && rec1.slot === 'diag38-1' && rec1.model === PIN && rec1.pinned === true && rec1.models.join() === PIN && rec1.memory === 'ABSENT' && Object.keys(rec1.tools).every((x) => ['Read', 'Write', 'Edit'].includes(x)) && rec1.launcher === M.LAUNCHER_SHA12 && /registered launcher/.test(rec1.gateVia) && /^[0-9a-f]{12}$/.test(rec1.pairsSha12) && /^[0-9a-f]{12}$/.test(rec1.verdictsSha12), JSON.stringify(rec1));
const args1 = fs.readFileSync(`${FLOG}.args`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).at(-1);
ck('the stand-in saw the registered argv form: pinned model, json output, dontAsk, Read,Write,Edit, strict MCP, --setting-sources project,local', args1[args1.indexOf('--model') + 1] === PIN && args1[args1.indexOf('--output-format') + 1] === 'json' && args1[args1.indexOf('--permission-mode') + 1] === 'dontAsk' && args1[args1.indexOf('--tools') + 1] === 'Read,Write,Edit' && args1.includes('--strict-mcp-config') && args1[args1.indexOf('--setting-sources') + 1] === 'project,local');
const rules = args1.slice(args1.indexOf('--allowed-tools') + 1);
ck('the stand-in saw exactly three permission rules: Read pairs, Read rubric, Edit verdicts', rules.length === 3 && /^Read\(/.test(rules[0]) && /pairs\.diag38-1\.json/.test(rules[0]) && /^Read\(/.test(rules[1]) && /^Edit\(/.test(rules[2]) && /verdicts\.diag38-1\.json/.test(rules[2]), JSON.stringify(rules));
const prompt1 = args1[args1.indexOf('-p') + 1];
ck('the dispatch text carries the diag38 pairs path, verdicts path and tag, and the registered template otherwise', /<PAIRS_FILE> = .*pairs\.diag38-1\.json/.test(prompt1) && /<VERDICTS_FILE> = .*verdicts\.diag38-1\.json/.test(prompt1) && /the tag `diag38-1`/.test(prompt1));
ck('existing verdicts refuse a re-grade', (() => { const r = F(['diag38-1', ...PINARG, '--attempt', '2']); return r.status === 2 && /already exists/.test(out(r)); })());
rmVerdicts();
ck('a reused cwd (same attempt again) is refused, nothing launched', (() => { const n = invoked(); const r = F(['diag38-1', ...PINARG]); return r.status === 2 && /already exists/.test(out(r)) && invoked() === n; })());

// ================================================================= 4. the post-launch transcript checks (stand-in modes)
let attempt = 2;
const modeCase = (name, mode, rxs, exitWanted = 1) => {
    rmVerdicts();
    const r = F(['diag38-1', ...PINARG, '--attempt', String(attempt++)], mode);
    ck(`post-launch check: ${name}`, r.status === exitWanted && rxs.every((rx) => rx.test(out(r))), `exit ${r.status} ${out(r).slice(-260)}`);
    return r;
};
rmVerdicts();
{ const r = F(['diag38-1', ...PINARG, '--attempt', String(attempt++)], 'ok'); ck('post-launch: a clean attempt exits 0', r.status === 0 && /PINNED/.test(out(r))); }
modeCase('the CLI reports another model: not the pin, exit 1', 'badmodel', [/MODEL IS NOT THE PIN/]);
modeCase('a suffixed model: not the pin, exit 1', 'suffix', [/MODEL IS NOT THE PIN/]);
modeCase('CLI model fine but an assistant message in the transcript used another model: not the pin', 'msgmodel', [/MODEL IS NOT THE PIN/]);
modeCase('no model on any assistant message: not the pin', 'nomodel', [/MODEL IS NOT THE PIN/]);
modeCase('memory (claude-mem context) in the transcript: memory LOADED, exit 1', 'loadedmem', [/memory LOADED/]);
modeCase('project memory in the transcript: memory LOADED, exit 1', 'projmem', [/memory LOADED/]);
modeCase('a tool outside Read/Write/Edit (Bash): flagged, exit 1', 'bash', [/TOOL OUTSIDE Read\/Write\/Edit/]);
modeCase('an incomplete verdicts file: MISSING/INVALID, exit 1', 'incomplete', [/verdicts file MISSING\/INVALID/]);
modeCase('the CLI process exits 1: exit 1', 'exit1', []);
modeCase('a rate-limit refusal is named as such, exit 1', 'ratelimit', [/RATE-LIMIT-REFUSAL/]);

// ================================================================= 5. own probes (the flag), as the alternative to the accepted record
fs.writeFileSync(RDP, '');     // the registered record is gone: only own probes can open the gate now
rmVerdicts();
ck('own probes: with no record at all the gate is shut for a real launch', (() => { const r = F(['diag38-1', ...PINARG, '--attempt', '40']); return r.status === 2 && /probe gate/.test(out(r)); })());
ck('own probe 2 before 1 is refused', (() => { const r = F(['cwdprobe-2', '--probe', ...PINARG]); return r.status === 2 && /starts only after cwdprobe-1/.test(out(r)); })());
ck('own probes dry run calls nothing', (() => { const n = invoked(); const r = F(['cwdprobe-1', '--probe', ...PINARG, '--dry-run']); return r.status === 0 && /DRY RUN cwdprobe-1/.test(out(r)) && invoked() === n; })());
ck('own cwdprobe-1 (pinned) runs and reads clean', (() => { const r = F(['cwdprobe-1', '--probe', ...PINARG]); return r.status === 0 && /cwdprobe-1 OK/.test(out(r)); })());
ck('own probe with an extra tool call fails and is not accepted', (() => { const r = F(['cwdprobe-2', '--probe', ...PINARG], 'probe-extra'); return r.status === 1 && /FAILED/.test(out(r)); })());
ck('after a failed cwdprobe-2 the gate is still shut', (() => { const r = F(['diag38-1', ...PINARG, '--attempt', '41']); return r.status === 2 && /probe gate/.test(out(r)); })());
// the failed probe record is the last one for cwdprobe-2: a clean re-run is not possible as attempt 1 (cwd reuse), so the own gate stays shut until the controller moves the record: that is the registered launcher's behavior too
fs.rmSync(path.join(LG, 'grader-cwd.launches.jsonl'), { force: true }); fs.rmSync(path.join(GR, 'cwdprobe-1-a1'), { recursive: true, force: true });
fs.rmSync(path.join(GR, 'cwdprobe-2-a1'), { recursive: true, force: true });
for (const d of fs.readdirSync(PR)) if (!d.startsWith(SLUG)) fs.rmSync(path.join(PR, d), { recursive: true, force: true });   // the stand-in's own session folders (a cwd is never reused)
for (const [p, extra, rx] of [['cwdprobe-1', PINARG, /cwdprobe-1 OK/], ['cwdprobe-2', PINARG, /cwdprobe-2 OK/], ['cwdprobe-3', [], /cwdprobe-3 OK/]]) {
    const r = F([p, '--probe', ...extra]);
    ck(`own ${p} clean`, r.status === 0 && rx.test(out(r)), out(r).slice(-200));
}
rmVerdicts();
{
    const n = invoked();
    const r = F(['diag38-2', ...PINARG]);
    ck('grader launch accepted via the OWN probes: exit 0 and the record names its gate source', r.status === 0 && /PINNED/.test(out(r)) && invoked() === n + 1 && /own probes/.test(launches().at(-1).gateVia), out(r).slice(-200));
    const plan = run(['--plan']);
    ck('--plan with the own gate open: OK via own probes, one grader per file', /PLAN probe gate: OK via own probes/.test(out(plan)) && /graders-of-this-file=1/.test(out(plan)));
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${fail ? 'CAL FAIL' : 'CAL OK'}: ${pass} checks passed, ${fail} failed (launcher ${path.basename(LAUNCHER)})`);
process.exit(fail ? 1 : 0);
