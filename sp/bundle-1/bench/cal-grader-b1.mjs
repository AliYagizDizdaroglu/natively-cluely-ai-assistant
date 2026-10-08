// cal-grader-b1.mjs: known-answer calibration of grade/launch-grader-b1.mjs against a STAND-IN for the claude binary (TURN_FAKE_CLAUDE + B1_CAL_FAKE=1), PATH stripped so no real `claude`
// can be reached (proved below; the stand-in logs every invocation so "nothing was launched" is a count). NO MODEL IS CALLED. Everything is written under a temp folder.
//   node cal-grader-b1.mjs [--quiet]            the suite
//   node cal-grader-b1.mjs --mutants            the suite against every mutant of the launcher: each must FAIL at least one check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchProblems } from './score-bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const LAUNCHER = path.resolve(argOf('--launcher') ?? path.join(HERE, 'grade', 'launch-grader-b1.mjs'));
const QUIET = argv.includes('--quiet');
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F_R = `${SP}/followup-turn/R`;
const DISPATCH = path.join(HERE, 'grade', 'b1-grader-dispatch.txt');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const MARK = '----- dispatch text (substitute RUN, VERDICTS and TAG) -----\n';

export const MUTANTS = [
    { id: 'first-launch-gate-removed', from: "if (gate.length) refuse(gate.join('; '));", to: '' },
    { id: 'cap-removed', from: 'if (capHit) refuse(', to: 'if (false) refuse(' },
    { id: 'cap-off-by-one', from: 'const capHit = recs.length >= MAX_SESSIONS;', to: 'const capHit = recs.length > MAX_SESSIONS;' },
    { id: 'pin-not-required', from: 'if (!modelId && !dry) refuse(', to: 'if (false) refuse(' },
    { id: 'model-id-any-string', from: 'if (modelId != null && modelId !== PIN)', to: 'if (false)' },
    { id: 'setting-sources-dropped', from: ", '--strict-mcp-config', '--setting-sources', 'project,local'];", to: ", '--strict-mcp-config'];" },
    { id: 'transcript-model-unchecked', from: 'const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));', to: 'const pinned = modelMatchesPin(r.record.model, PIN);' },
    { id: 'pin-match-tolerant', from: "model.split('+').every((m) => m === pin);", to: "model.split('+').every((m) => m === pin || m.startsWith(`${pin}[`));" },
    { id: 'exit-ignores-memory', from: "rec.memory === 'ABSENT' && toolsOk", to: 'toolsOk' },
    { id: 'exit-ignores-tools', from: '&& toolsOk && pinned', to: '&& pinned' },
    { id: 'existing-verdicts-overwritten', from: "if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists", to: "if (false) refuse(`${verdictsPath} already exists" },
    { id: 'test-seam-allowed-in-real', from: 'if (!CAL && SEAMS.some((s) => process.env[s])) {', to: 'if (false) {' },
    { id: 'first-tag-gate-skipped-for-all', from: "if (tag === FIRST_TAG) return [];", to: 'return [];' },
    { id: 'verdicts-sha-not-recorded', from: 'verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null', to: 'verdictsSha12: null' },
];

if (argv.includes('--mutants')) {
    const src = fs.readFileSync(LAUNCHER, 'utf8');
    let caught = 0; const lines = [];
    for (const m of MUTANTS) {
        const n = src.split(m.from).length - 1;
        if (n !== 1) { lines.push(`ERROR ${m.id}: anchor occurs ${n} times (must be 1)`); continue; }
        const f = path.join(HERE, 'grade', `launch-grader-b1.mut-${m.id}.mjs`);
        fs.writeFileSync(f, src.replace(m.from, () => m.to));
        const r = spawnSync(process.execPath, [path.join(HERE, 'cal-grader-b1.mjs'), '--launcher', f, '--quiet'], { encoding: 'utf8', timeout: 900000 });
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
const FAKE = `// stand-in for the claude binary (cal only): logs the invocation, writes verdicts and a transcript, prints the CLI's JSON result. Mode in B1_FAKE_MODE.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const { projectSlug } = await import(pathToFileURL(process.env.B1_F_R + '/launch-grader.mjs').href);
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1], model = args[args.indexOf('--model') + 1];
fs.appendFileSync(process.env.B1_FAKE_LOG, 'invoked ' + model + '\\n');
const mode = process.env.B1_FAKE_MODE || 'ok';
const session = randomUUID();
if (mode === 'ratelimit') { console.log(JSON.stringify({ session_id: session, is_error: true, result: 'rate_limit' })); process.exit(0); }
const cliModel = mode === 'badmodel' ? 'claude-opus-5' : mode === 'suffix' ? model + '[1m]' : model;
const msgModel = mode === 'msgmodel' ? 'claude-opus-5' : cliModel;
const lines = [JSON.stringify({ type: 'user', message: { content: prompt } })];
if (mode === 'loadedmem') lines.push(JSON.stringify({ type: 'user', message: { content: '<claude-mem-context> x </claude-mem-context>' } }));
const use = (name, input) => lines.push(JSON.stringify({ type: 'assistant', message: { model: msgModel, content: [{ type: 'tool_use', name, input }] } }));
const rub = /read this file IN FULL: (.+)/.exec(prompt)[1].trim(), pairs = /^<PAIRS_FILE> = (.+)$/m.exec(prompt)[1].trim(), verd = /^<VERDICTS_FILE> = (.+)$/m.exec(prompt)[1].trim();
use('Read', { file_path: rub }); use('Read', { file_path: pairs });
const items = JSON.parse(fs.readFileSync(pairs, 'utf8')).items;
const v = Object.fromEntries(items.map((i) => [i.key, { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' }]));
if (mode === 'incomplete') delete v[items[items.length - 1].key];
fs.mkdirSync(path.dirname(verd), { recursive: true });
fs.writeFileSync(verd, JSON.stringify(v)); use('Write', { file_path: verd, content: '{}' }); use('Read', { file_path: verd });
if (mode === 'bash') use('Bash', { command: 'echo' });
const dir = path.join(process.env.TURN_PROJECTS, projectSlug(process.cwd()));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, session + '.jsonl'), lines.join('\\n') + '\\n');
console.log(JSON.stringify({ session_id: session, modelUsage: { [cliModel]: {} }, is_error: false, result: 'DONE' }));
process.exit(mode === 'exit1' ? 1 : 0);
`;

const results = [];
const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); if (!QUIET || !cond) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
const out = (r) => r.stdout + r.stderr;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-b1-launch-'));
const PR = path.join(TMP, 'projects'), BIN = path.join(TMP, 'bin'), FLOG = path.join(TMP, 'fake.log');
for (const d of [PR, BIN]) fs.mkdirSync(d, { recursive: true });
const fakePath = path.join(TMP, 'fake-claude.mjs'); fs.writeFileSync(fakePath, FAKE);
const mkRoot = (name, { files = [1, 2, 3], launches = null } = {}) => {
    const root = path.join(TMP, name); fs.mkdirSync(path.join(root, 'blind'), { recursive: true }); fs.mkdirSync(path.join(root, 'grade'), { recursive: true });
    for (const n of files) fs.writeFileSync(path.join(root, 'blind', `pairs.blind-${n}.json`), JSON.stringify({ items: Array.from({ length: 3 }, (_, i) => ({ key: `q${String(i + 1).padStart(3, '0')}`, id: `q${i + 1}`, kind: 'spoken', question: 'cal q', heard: 'cal h', answer: `cal a ${i}` })) }));
    if (launches) fs.writeFileSync(path.join(root, 'grade', 'launches.jsonl'), launches.map((l) => JSON.stringify(l)).join('\n') + '\n');
    return root;
};
const env = (root, extra = {}) => ({ ...process.env, B1_CAL_FAKE: '1', B1_ROOT: root, B1_GRADING_DIR: path.join(root, 'grade', 'grading'), TURN_PROJECTS: PR, B1_F_R: F_R, B1_FAKE_LOG: FLOG, PATH: `${BIN};C:\\Windows\\System32`, ...extra });
const run = (root, args, extra) => spawnSync(process.execPath, [LAUNCHER, ...args], { encoding: 'utf8', env: env(root, extra), timeout: 180000 });
const F = (root, args, mode = 'ok') => run(root, args, { TURN_FAKE_CLAUDE: fakePath, B1_FAKE_MODE: mode });
const invoked = () => (fs.existsSync(FLOG) ? fs.readFileSync(FLOG, 'utf8').split('\n').filter(Boolean).length : 0);
const PIN = ['--model-id', 'claude-opus-5-5'];
const recsOf = (root) => { const f = path.join(root, 'grade', 'launches.jsonl'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };

// ================================================================= 0. tripwire
{
    const w = spawnSync('cmd.exe', ['/d', '/c', 'where claude'], { encoding: 'utf8', env: env(TMP) });
    ck('tripwire: with this PATH no real `claude` is reachable (a stray real launch is impossible)', w.status !== 0, `where exit ${w.status}`);
}
// ================================================================= 1. the dispatch text
{
    const d = fs.readFileSync(DISPATCH, 'utf8').replace(/\r\n/g, '\n');
    const rd = fs.readFileSync(`${SP}/router-default/grade/rd-grader-dispatch.txt`, 'utf8').replace(/\r\n/g, '\n');
    const h40 = fs.readFileSync(`${SP}/validation-hour/h40d-grader-dispatch.txt`, 'utf8').replace(/\r\n/g, '\n');
    ck('dispatch: the marker appears exactly once', d.split(MARK).length === 2);
    ck("dispatch: the template region is BYTE-IDENTICAL to router-default's and to h40d's (sha256)", sha(d.split(MARK)[1]) === sha(rd.split(MARK)[1]) && sha(d.split(MARK)[1]) === sha(h40.split(MARK)[1]), sha(d.split(MARK)[1]).slice(0, 12));
    ck('dispatch CAN fail: a one-character change in the template changes the sha', sha(d.split(MARK)[1].replace('independent', 'indepenxent')) !== sha(h40.split(MARK)[1]));
    const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
    const tpl = A.dispatchTemplate(DISPATCH);
    ck('dispatch: the template carries the three substitution anchors', tpl.includes('RUN\\<pairs file>') && tpl.includes('<VERDICTS_FILE> = VERDICTS') && tpl.includes('`TAG`'));
}
// ================================================================= 2. source facts
{
    const src = fs.readFileSync(LAUNCHER, 'utf8');
    const countAddDir = (s) => s.split('\n').filter((l) => /^(export )?const (FLAGS|pairsArgs)\b/.test(l.trim())).filter((l) => /add-dir/.test(l)).length;
    ck('source: add-dir appears on 0 of the FLAGS / pairsArgs lines, and the pin and setting-sources are on the FLAGS line', countAddDir(src) === 0 && /export const FLAGS[^\n]*--setting-sources', 'project,local'/.test(src) && /export const PIN = 'claude-opus-5-5'/.test(src));
    ck('source CAN fail: an add-dir injected into FLAGS counts 1', countAddDir(src.replace("'project,local'];", "'project,local', '--add-dir', 'x'];")) === 1);
    const code = src.split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//')).join(String.fromCharCode(10));
    ck('source: no `Bash` allowance, no dangerously-skip flag, no probe sessions (no cwdprobe in code)', !/--dangerously|--allowed-tools[^\n]*Bash/.test(src) && !/cwdprobe/.test(code));
}
// ================================================================= 3. plan and refusals (nothing launched)
const R1 = mkRoot('r1');
{
    const before = invoked();
    const p = run(R1, ['--plan']);
    ck('plan: 6 launches over 3 pairs files, blind-1.g1 marked as the gate, exit 0, no probes', p.status === 0 && /PLAN 6 grader launches over 3 pairs files/.test(out(p)) && /blind-1\.g1.*runs ALONE first/.test(out(p)) && /PLAN OK/.test(out(p)));
    const p2 = run(mkRoot('r-missing', { files: [1, 3] }), ['--plan']);
    ck('plan CAN fail: a missing pairs file blocks (exit 3) and names the tag', p2.status === 3 && /blind-2\.g1: pairs file missing/.test(out(p2)));
    const refusals = {
        'a non-pin model id (claude-opus-5)': [['blind-1.g1', '--model-id', 'claude-opus-5']],
        'an alias model id (opus)': [['blind-1.g1', '--model-id', 'opus']],
        'a real launch with no --model-id': [['blind-1.g1']],
        'an unknown option': [['blind-1.g1', ...PIN, '--add-dir', 'x']],
        'a tag outside blind-1..3': [['blind-4.g1', ...PIN]],
        'a tag with a third grader': [['blind-1.g3', ...PIN]],
        'a rd-style tag (inapp.g1)': [['inapp.g1', ...PIN]],
        'no tag at all': [[...PIN]],
    };
    for (const [what, [args]] of Object.entries(refusals)) { const r = F(R1, args); ck(`refusal: ${what} -> exit 2, REFUSED`, r.status === 2 && /REFUSED/.test(out(r)), `exit ${r.status}`); }
    const seam = spawnSync(process.execPath, [LAUNCHER, 'blind-1.g1', ...PIN], { encoding: 'utf8', env: { ...env(R1), B1_CAL_FAKE: '', TURN_FAKE_CLAUDE: fakePath }, timeout: 60000 });
    ck('refusal: a test seam without B1_CAL_FAKE=1 is refused (a stand-in grader can never produce a real grade)', seam.status === 2 && /test seam/.test(out(seam)));
    ck('refusals launched nothing: the stand-in was invoked 0 times', invoked() === before, `invoked ${invoked() - before}`);
    const d = run(R1, ['blind-1.g1', ...PIN, '--dry-run']);
    ck('dry run: exit 0, shows the pin, setting-sources and Read/Read/Edit rules, launches nothing', d.status === 0 && /--model claude-opus-5-5/.test(out(d)) && /--setting-sources project,local/.test(out(d)) && /permission rules: Read\(.*pairs\.blind-1\.json\) \| Read\(.*grader-prompt\.md\) \| Edit\(.*verdicts\.blind-1\.g1\.json\)/.test(out(d)) && invoked() === before);
    const d2 = run(R1, ['blind-2.g1', ...PIN, '--dry-run']);
    ck('dry run: a non-first tag reports the first-launch gate BLOCKED before blind-1.g1 ran', /first-launch gate: BLOCKED/.test(out(d2)) && invoked() === before);
    const d3 = run(R1, ['blind-1.g1', '--dry-run']);
    ck('dry run: without --model-id says NOT pinned', /NOT pinned/.test(out(d3)));
}
// ================================================================= 4. the first-launch gate and a clean sequence
{
    const root = mkRoot('r2'); const before = invoked();
    const g = F(root, ['blind-1.g2', ...PIN]);
    ck('gate: blind-1.g2 BEFORE blind-1.g1 is refused (exit 2) and launches nothing', g.status === 2 && /first-launch gate/.test(out(g)) && invoked() === before);
    const a = F(root, ['blind-1.g1', ...PIN]);
    const rec1 = recsOf(root).at(-1);
    ck('first grader: clean stand-in run exits 0, record pinned, memory ABSENT, slugJsonl 1, tools Read/Write only, verdicts valid', a.status === 0 && rec1?.pinned === true && rec1.memory === 'ABSENT' && rec1.slugJsonl === 1 && Object.keys(rec1.tools).every((t) => ['Read', 'Write', 'Edit'].includes(t)) && /valid on its pairs \(3 keys\)/.test(out(a)), `exit ${a.status}`);
    ck('first grader: the record binds the pairs and verdicts shas', !!rec1.pairsSha12 && !!rec1.verdictsSha12 && rec1.verdictsSha12 === sha(fs.readFileSync(path.join(root, 'grade', 'verdicts', 'verdicts.blind-1.g1.json'))).slice(0, 12));
    ck('first grader launched exactly once', invoked() === before + 1);
    const b = F(root, ['blind-1.g2', ...PIN]);
    ck('gate: after a clean blind-1.g1, blind-1.g2 launches (exit 0)', b.status === 0 && invoked() === before + 2);
    const again = F(root, ['blind-1.g1', ...PIN]);
    ck('an existing verdicts file refuses a repeat of the same tag (no silent re-grade)', again.status === 2 && /verdicts\.blind-1\.g1\.json already exists/.test(out(again)) && invoked() === before + 2);
    const lp = launchProblems(recsOf(root), ['blind-1.g1', 'blind-1.g2'], (t) => path.join(root, 'blind', `pairs.${t.replace(/\.g\d$/, '')}.json`), (t) => path.join(root, 'grade', 'verdicts', `verdicts.${t}.json`));
    ck("the scorer's launchProblems reads those two records as clean", lp.length === 0, lp.join('|'));
    fs.appendFileSync(path.join(root, 'blind', 'pairs.blind-1.json'), ' ');
    ck("the scorer's launchProblems CAN fail: a pairs file touched after the launch is flagged", launchProblems(recsOf(root), ['blind-1.g1'], (t) => path.join(root, 'blind', `pairs.${t.replace(/\.g\d$/, '')}.json`), (t) => path.join(root, 'grade', 'verdicts', `verdicts.${t}.json`)).some((p) => /pairs file changed/.test(p)));
}
// ================================================================= 5. each failure mode of a grader is exit 1 with the right note, and a failed first grader blocks the rest
{
    const modes = { badmodel: /MODEL IS NOT THE PIN/, suffix: /MODEL IS NOT THE PIN/, msgmodel: /MODEL IS NOT THE PIN/, loadedmem: /memory LOADED/, incomplete: /MISSING\/INVALID/, bash: /TOOL OUTSIDE/, exit1: null, ratelimit: /RATE-LIMIT-REFUSAL/ };
    for (const [mode, rx] of Object.entries(modes)) {
        const root = mkRoot(`m-${mode}`);
        const r = F(root, ['blind-1.g1', ...PIN], mode);
        ck(`failure mode ${mode}: exit 1${rx ? ' and the note is printed' : ''}`, r.status === 1 && (!rx || rx.test(out(r))), `exit ${r.status}`);
        const before = invoked();
        const next = F(root, ['blind-1.g2', ...PIN]);
        ck(`failure mode ${mode}: the failed first grader blocks every later tag (gate), nothing launched`, next.status === 2 && /first-launch gate/.test(out(next)) && invoked() === before);
    }
}
// ================================================================= 6. the 6-session cap
{
    const six = Array.from({ length: 6 }, (_, i) => ({ slot: ['blind-1.g1', 'blind-1.g2', 'blind-2.g1', 'blind-2.g2', 'blind-3.g1', 'blind-3.g2'][i], attempt: 1, exit: 0, memory: 'ABSENT', pinned: true, slugJsonl: 1 }));
    const root = mkRoot('r-cap', { launches: six }); const before = invoked();
    const c = F(root, ['blind-3.g2', ...PIN]);
    ck('cap: with 6 launch records the 7th launch is refused ("budget is 6") and launches nothing', c.status === 2 && /budget is 6/.test(out(c)) && invoked() === before);
    const root5 = mkRoot('r-cap5', { launches: six.slice(0, 5).map((l) => ({ ...l, slot: 'x' })) });
    const c5 = F(root5, ['blind-1.g1', ...PIN]);
    ck('cap boundary: with 5 records the 6th launch is allowed', c5.status === 0 && invoked() === before + 1, `exit ${c5.status}`);
}

const fail = results.filter((r) => !r.ok);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\ncal-grader-b1: ${results.length - fail.length}/${results.length} checks ok${fail.length ? `; FAILED: ${fail.map((f) => f.name).join(' | ')}` : ''}`);
process.exit(fail.length ? 1 : 0);
