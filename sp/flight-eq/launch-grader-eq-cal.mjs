// E\launch-grader-eq-cal.mjs: the known-answer calibration of the b8 pieces: launch-grader-eq.mjs (pin, PAIRS mode, probes, refusals), eq-audit.mjs, E\eq-grader-dispatch.txt
// and E\eq-merge.cmd. NO MODEL IS CALLED: the launcher runs against a stand-in for the claude binary (TURN_FAKE_CLAUDE, EQ_CAL_FAKE=1) with PATH stripped so no real
// `claude` can be found (proved below); nothing is written outside E (scratch E\eqcal-grader\, E\eqcal-merge\). Output = E\launch-grader-eq.cal.txt.
//   node launch-grader-eq-cal.mjs [--no-mutants]
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const LAUNCHER = path.join(E, 'launch-grader-eq.mjs'), AUDIT = path.join(E, 'eq-audit.mjs'), DISPATCH = path.join(E, 'eq-grader-dispatch.txt'), MERGE = path.join(E, 'eq-merge.cmd');
const SCR = path.join(E, 'eqcal-grader'), MSCR = path.join(E, 'eqcal-merge'), MUT = path.join(E, 'eqcal-grader-mut');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
const LG = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const MARK = '----- dispatch text (substitute RUN, VERDICTS and TAG) -----\n';

const FAKE = `// stand-in for the claude binary (cal only): writes verdicts and a transcript, prints the CLI's JSON result. Mode in EQ_FAKE_MODE.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const { projectSlug } = await import(pathToFileURL(process.env.EQ_F_R + '/launch-grader.mjs').href);
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1], model = args[args.indexOf('--model') + 1];
const mode = process.env.EQ_FAKE_MODE || 'ok';
const session = randomUUID();
if (process.env.EQ_FAKE_MODE === 'ratelimit') { console.log(JSON.stringify({ session_id: session, is_error: true, result: 'rate_limit' })); process.exit(0); }
const lines = [JSON.stringify({ type: 'user', message: { content: prompt } })];
if (mode === 'loadedmem') lines.push(JSON.stringify({ type: 'user', message: { content: '<claude-mem-context> x </claude-mem-context>' } }));
const use = (name, input) => lines.push(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } }));
let reported = mode === 'badmodel' ? 'claude-opus-5' : mode === 'suffix' ? model + '[1m]' : model;
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
}
const dir = path.join(process.env.TURN_PROJECTS, projectSlug(process.cwd()));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, session + '.jsonl'), lines.join('\\n') + '\\n');
console.log(JSON.stringify({ session_id: session, modelUsage: { [reported]: {} }, is_error: false, result: 'DONE' }));
process.exit(mode === 'exit1' ? 1 : 0);
`;

export async function suite({ launcher = LAUNCHER, audit = AUDIT, dispatch = DISPATCH, quiet = false, results = [] } = {}) {
    const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond, extra }); if (!quiet) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
    fs.rmSync(SCR, { recursive: true, force: true });
    const LG_ = path.join(SCR, 'logs'), GR = path.join(SCR, 'grading'), BL = path.join(SCR, 'blind'), PR = path.join(SCR, 'projects'), BIN = path.join(SCR, 'bin'), PILOT = path.join(SCR, 'pilot'), ARMS = path.join(SCR, 'arms');
    for (const d of [GR, BL, PR, BIN, PILOT, ARMS, LG_]) fs.mkdirSync(d, { recursive: true });
    const fakePath = path.join(SCR, 'fake-claude.mjs'); fs.writeFileSync(fakePath, FAKE);
    const env = (extra = {}) => { const e = { ...process.env, EQ_CAL_FAKE: '1', EQ_GRADING_DIR: GR, EQ_BLIND_DIR: BL, EQ_LOG_DIR: LG_, TURN_PROJECTS: PR, EQ_F_R: F_R, PATH: `${BIN};C:\\Windows\\System32`, ...extra }; delete e.NATIVELY_X; return e; };
    const run = (script, args, extra) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: env(extra), timeout: 120000 });
    const L = (args, extra) => run(launcher, args, { EQ_DISPATCH: dispatch, ...extra });
    const F = (args, mode = 'ok') => L(args, { TURN_FAKE_CLAUDE: fakePath, EQ_FAKE_MODE: mode });
    const PIN = ['--model-id', 'claude-opus-5-5'];
    const out = (r) => r.stdout + r.stderr;

    // tripwire: with this PATH no real claude can be found
    const w = spawnSync('cmd.exe', ['/d', '/c', 'where claude'], { encoding: 'utf8', env: env() });
    ck('no real `claude` is reachable on the cal PATH (a stray real launch is impossible)', w.status !== 0, `where exit ${w.status}`);

    // ── the dispatch text ──
    const dText = fs.readFileSync(DISPATCH, 'utf8').replace(/\r\n/g, '\n');
    const h40 = fs.readFileSync(path.join(SP, 'validation-hour/h40d-grader-dispatch.txt'), 'utf8').replace(/\r\n/g, '\n');
    ck('dispatch: the marker appears exactly once in E\\eq-grader-dispatch.txt', dText.split(MARK).length === 2);
    ck('dispatch: the template region is BYTE-IDENTICAL to h40d\'s (sha256)', dText.split(MARK)[1] === h40.split(MARK)[1] && sha(dText.split(MARK)[1]) === sha(h40.split(MARK)[1]), sha(dText.split(MARK)[1]).slice(0, 12));
    const pre = dText.split(MARK)[0];
    const tagsInDispatch = [...pre.matchAll(/^ {2}(\S+)\s+PAIRS (\S+)\s+VERDICTS eq-verdicts-(\S+)\.json$/gm)];
    ck('dispatch: fourteen per-arm rows, each verdicts file named after its tag', tagsInDispatch.length === 14 && tagsInDispatch.every((m) => m[1] === m[3]), `${tagsInDispatch.length} rows`);
    ck('dispatch: three blind rows (blind-1/2/3) with both graders', ['blind-1.g1 / blind-1.g2', 'blind-2.g1 / blind-2.g2', 'blind-3.g1 / blind-3.g2'].every((s) => pre.includes(s)));
    const cmd = fs.readFileSync(MERGE, 'latin1');
    const cmdTags = ['inapp', ...[...cmd.matchAll(/^call :arm (\S+)/gm)].map((m) => m[1]), 'bare31'];
    ck('dispatch <-> eq-merge.cmd: the same fourteen tags', JSON.stringify([...cmdTags].sort()) === JSON.stringify(tagsInDispatch.map((m) => m[1]).sort()));
    const tpl = A.dispatchTemplate(dispatch);
    ck('dispatch: the template carries the three substitution anchors', tpl.includes('RUN\\<pairs file>') && tpl.includes('<VERDICTS_FILE> = VERDICTS') && tpl.includes('`TAG`'));
    const tampered = (() => { const t = dText.split(MARK); return `${t[0]}${MARK}${t[1].replace('independent', 'indepenxent')}`; })();
    ck('dispatch: a one-character change in the template changes the sha (the byte check can fail)', sha(tampered.split(MARK)[1]) !== sha(h40.split(MARK)[1]));

    // ── source check: no add-dir on the FLAGS / probe-args lines ──
    const countAddDir = (src) => src.split('\n').filter((l) => /^(export )?const (FLAGS|probeArgsEq|pairsArgs|slotArgs|probeArgs|claudeArgs)\b/.test(l.trim())).filter((l) => /add-dir/.test(l)).length;
    const lsrc = fs.readFileSync(launcher, 'utf8'), osrc = fs.readFileSync(path.join(F_R, 'launch-grader.mjs'), 'utf8');
    ck('source: grep -c add-dir over the FLAGS and probe-args lines = 0 (eq launcher)', countAddDir(lsrc) === 0 && lsrc.split('\n').some((l) => l.trim().startsWith('export const FLAGS')));
    ck('source: ... and = 0 in the original F\\R\\launch-grader.mjs (recorded)', countAddDir(osrc) === 0);
    ck('source: the check can fail (an add-dir injected into FLAGS counts 1)', countAddDir(lsrc.replace("'project,local'];", "'project,local', '--add-dir', 'x'];")) === 1);

    // ── launcher: dry runs, pin, refusals ──
    fs.writeFileSync(path.join(BL, 'pairs.blind-1.json'), JSON.stringify({ model: 'm', rubric: 'r', items: [{ key: 'X1F#1', id: 'X1F', question: 'q', heard: 'h', answer: 'a1' }, { key: 'X1F#2', id: 'X1F', question: 'q', heard: 'h', answer: 'a2' }] }));
    const d1 = L(['blind-1.g1', ...PIN, '--dry-run']);
    ck('dry run (slot mode, pinned): argv carries --model claude-opus-5-5, Read,Write,Edit, dontAsk, strict MCP, no add-dir, no bare opus', d1.status === 0 && / --model claude-opus-5-5 /.test(out(d1)) && !/ --model opus /.test(out(d1)) && /--tools Read,Write,Edit/.test(out(d1)) && /--permission-mode dontAsk/.test(out(d1)) && /--strict-mcp-config/.test(out(d1)) && !/add-dir/.test(out(d1)), `exit ${d1.status}`);
    ck('dry run: 3 permission rules (Read pairs, Read rubric, Edit verdicts) and the dispatch passes the audit\'s own check (exit 0)', /permission rules: Read\(\/\/c\/.*pairs\.blind-1\.json\) \| Read\(\/\/c\/.*grader-prompt\.md\) \| Edit\(\/\/c\/.*verdicts\.blind-1\.g1\.json\)/.test(out(d1)));
    const ssArgv = (r) => { const m = out(r).match(/--setting-sources [^ ]+/g) ?? []; return m.length === 1 && m[0] === '--setting-sources project,local' && / --strict-mcp-config --setting-sources project,local --allowed-tools /.test(out(r)); };
    const ssPairs = path.join(ARMS, 'ss-pairs.json'); fs.writeFileSync(ssPairs, JSON.stringify({ items: [{ key: 'k1' }] }));
    const ssRuns = { slot: d1, pairs: L(['ss', '--pairs', ssPairs, '--verdicts', path.join(ARMS, 'v-ss.json'), ...PIN, '--dry-run']), probe1: L(['cwdprobe-1', '--probe', ...PIN, '--dry-run']), probe3: L(['cwdprobe-3', '--probe', '--dry-run']), unpinned: L(['blind-1.g1', '--dry-run']) };
    ck('USER settings never loaded: the argv of every kind (slot, pairs, probe 1, probe 3, unpinned dry) carries exactly one --setting-sources project,local, right before --allowed-tools', Object.values(ssRuns).every(ssArgv), Object.entries(ssRuns).map(([k, r]) => k + ':' + ssArgv(r)).join(' '));
    const d2 = L(['blind-1.g1', '--dry-run']);
    ck('dry run without --model-id: argv shows --model opus and says NOT pinned (A3.5: absent shows the alias)', d2.status === 0 && / --model opus /.test(out(d2)) && /NOT pinned/.test(out(d2)));
    const d3 = L(['blind-1.g1']);
    ck('a REAL launch without --model-id is refused (exit 2), nothing created', d3.status === 2 && /needs --model-id/.test(out(d3)) && !fs.existsSync(path.join(GR, 'blind-1.g1-a1')));
    const d4 = [L(['blind-1.g1', '--model-id', 'opus', '--dry-run']), L(['blind-1.g1', '--model-id', 'claude-opus-5-5;x', '--dry-run']), L(['blind-1.g1', '--model-id', '--dry-run'])];
    ck('--model-id must be an exact claude-... id: opus, a shell-metacharacter id and a missing value all exit 2', d4.every((r) => r.status === 2), d4.map((r) => r.status).join(','));
    ck('unknown option and an unknown slot exit 2', L(['blind-1.g1', '--bogus', '--dry-run']).status === 2 && L(['blind-9.g1', ...PIN, '--dry-run']).status === 2);
    // make-pilot and PAIRS mode
    const mp = L(['--make-pilot', PILOT]);
    ck('--make-pilot writes pairs.blind-1.json with 4 synthetic items; a second call refuses', mp.status === 0 && JSON.parse(fs.readFileSync(path.join(PILOT, 'pairs.blind-1.json'), 'utf8')).items.length === 4 && L(['--make-pilot', PILOT]).status === 2);
    const pp = path.join(PILOT, 'pairs.blind-1.json'), vp = path.join(PILOT, 'verdicts.pilot.json');
    const p1 = L(['pilot', '--pairs', pp, '--verdicts', vp, ...PIN, '--dry-run']);
    ck('PAIRS mode dry run: exit 0 (prompt passes the dispatch check), 3 rules naming the named files, cwd pilot-a1, mode pairs', p1.status === 0 && /mode pairs/.test(out(p1)) && /cwd .*pilot-a1 \(fresh\)/.test(out(p1)) && /Read\(\/\/c\/.*pilot\/pairs\.blind-1\.json\) \| Read\(\/\/c\/.*grader-prompt\.md\) \| Edit\(\/\/c\/.*pilot\/verdicts\.pilot\.json\)/.test(out(p1)), out(p1).split('\n')[0].slice(0, 90));
    ck('PAIRS mode prompt: only the pairs path, verdicts path and tag differ from the template (sha of the prompt differs from the template\'s, template anchors replaced)', /<prompt \d+ chars sha12 [0-9a-f]{12}>/.test(out(p1)));
    fs.writeFileSync(path.join(PILOT, 'verdicts.exists.json'), '{}');
    fs.writeFileSync(path.join(ARMS, 'dup.json'), JSON.stringify({ items: [{ key: 'a' }, { key: 'a' }] })); fs.writeFileSync(path.join(ARMS, 'empty.json'), JSON.stringify({ items: [] })); fs.writeFileSync(path.join(ARMS, 'bad.json'), '{nope');
    const refusals = [
        ['a blind slot tag with --pairs', ['blind-1.g1', '--pairs', pp, '--verdicts', vp, ...PIN, '--dry-run']],
        ['an existing verdicts file', ['pilot', '--pairs', pp, '--verdicts', path.join(PILOT, 'verdicts.exists.json'), ...PIN, '--dry-run']],
        ['a relative pairs path', ['pilot', '--pairs', 'pairs.json', '--verdicts', vp, ...PIN, '--dry-run']],
        ['a missing pairs file', ['pilot', '--pairs', path.join(PILOT, 'nope.json'), '--verdicts', vp, ...PIN, '--dry-run']],
        ['--pairs without --verdicts', ['pilot', '--pairs', pp, ...PIN, '--dry-run']],
        ['duplicate keys', ['pilot', '--pairs', path.join(ARMS, 'dup.json'), '--verdicts', vp, ...PIN, '--dry-run']],
        ['an empty items list', ['pilot', '--pairs', path.join(ARMS, 'empty.json'), '--verdicts', vp, ...PIN, '--dry-run']],
        ['an unparsable pairs file', ['pilot', '--pairs', path.join(ARMS, 'bad.json'), '--verdicts', vp, ...PIN, '--dry-run']],
        ['a verdicts folder that does not exist', ['pilot', '--pairs', pp, '--verdicts', path.join(PILOT, 'no-such-dir', 'v.json'), ...PIN, '--dry-run']],
        ['a tag with a path separator', ['a/b', '--pairs', pp, '--verdicts', vp, ...PIN, '--dry-run']],
        ['a per-arm tag without --pairs (slot mode)', ['inapp', ...PIN, '--dry-run']],
        ['pairs mode, real launch, no pin', ['pilot', '--pairs', pp, '--verdicts', vp]],
    ];
    for (const [what, a] of refusals) { const r = L(a); ck(`PAIRS mode refuses ${what} (exit 2)`, r.status === 2, `exit ${r.status}`); }
    // probes
    const pr1 = L(['cwdprobe-1', '--probe', ...PIN, '--dry-run']), pr3 = L(['cwdprobe-3', '--probe', '--dry-run']);
    ck('probes: cwdprobe-1 dry shows the pin; cwdprobe-3 dry shows --model opus and the alias note', pr1.status === 0 && / --model claude-opus-5-5 /.test(out(pr1)) && pr3.status === 0 && / --model opus /.test(out(pr3)) && /alias read/.test(out(pr3)));
    ck('probes: cwdprobe-3 WITH --model-id exits 2; cwdprobe-1 real without it exits 2; a bad probe name exits 2', L(['cwdprobe-3', '--probe', ...PIN, '--dry-run']).status === 2 && L(['cwdprobe-1', '--probe']).status === 2 && L(['cwdprobe-4', '--probe', ...PIN]).status === 2);
    const pr2early = L(['cwdprobe-2', '--probe', ...PIN]);
    ck('probes: cwdprobe-2 before cwdprobe-1 is REFUSED (exit 2), nothing launched', pr2early.status === 2 && /REFUSED/.test(out(pr2early)) && !fs.existsSync(path.join(GR, 'cwdprobe-2-a1')));
    const seamRun = spawnSync(process.execPath, [launcher, 'blind-1.g1', ...PIN, '--dry-run'], { encoding: 'utf8', env: { ...process.env, EQ_CAL_FAKE: '', TURN_FAKE_CLAUDE: fakePath, EQ_DISPATCH: dispatch } }); ck('a test seam in the environment WITHOUT EQ_CAL_FAKE is refused (exit 2) and named: a stand-in must never produce a real grade', seamRun.status === 2 && /a test seam/.test(seamRun.stderr));

    // ── launcher with the stand-in: the pilot through PAIRS mode, audit, read-back ──
    const f1 = F(['pilot', '--pairs', pp, '--verdicts', vp, ...PIN, '--attempt', '1']);
    ck('PAIRS-mode pilot with the stand-in: exit 0, verdicts valid on the pairs file\'s 4 keys, model = pin', f1.status === 0 && /valid on its pairs \(4 keys\)/.test(out(f1)) && !/NOT THE PIN/.test(out(f1)) && /memory ABSENT projectMemory=0 claudeMem=0/.test(out(f1)), out(f1).split('\n').slice(-2, -1)[0]?.slice(0, 150));
    const armsLog = path.join(LG_, 'launches.arms.jsonl');
    const lastLine = fs.existsSync(armsLog) ? fs.readFileSync(armsLog, 'utf8').trim().split('\n').pop() : '{}';
    const lr = JSON.parse(lastLine || '{}');
    ck('the launch record: slot pilot, attempt 1, exit 0, slugJsonl 1, memoryDir absent, cwd pilot-a1, session id', lr.slot === 'pilot' && lr.attempt === 1 && lr.exit === 0 && lr.slugJsonl === 1 && lr.memoryDir === 'absent' && /pilot-a1$/.test(lr.cwd ?? '') && /^[0-9a-f-]{36}$/.test(lr.session_id ?? ''), `${lr.slot} a${lr.attempt} exit ${lr.exit}`);
    const a1 = run(audit, ['--dispatch', dispatch, '--projects', PR, '--item', `pilot|${pp}|${vp}|session:${lr.session_id}`], {});
    ck('eq-audit on that pilot transcript: clean, dispatch=match, Read x3 Write x1', a1.status === 0 && /pilot \(.*\): 4 tool inputs \[Readx3 Writex1\]; clean; bash=\[\]; dispatch=match/.test(a1.stdout) && /AUDIT: all graders clean/.test(a1.stdout), a1.stdout.split('\n')[0].slice(0, 130));
    const f1b = F(['pilot', '--pairs', pp, '--verdicts', vp, ...PIN, '--attempt', '2']);
    ck('re-grading onto an existing verdicts file is refused (exit 2)', f1b.status === 2);
    fs.renameSync(vp, path.join(PILOT, 'verdicts.pilot.attempt1.json'));
    const f1c = F(['pilot', '--pairs', pp, '--verdicts', vp, ...PIN, '--attempt', '1']);
    ck('a cwd is never reused: the same attempt number again is refused (exit 2) even with the verdicts moved away', f1c.status === 2 && /already exists/.test(out(f1c)));
    // modes
    const fm = (tag, mode, att) => { const v = path.join(ARMS, `v-${tag}-${att}.json`); return { r: F([tag, '--pairs', pp, '--verdicts', v, ...PIN, '--attempt', String(att)], mode), v }; };
    const bm = fm('badmodel', 'badmodel', 1), sf = fm('suffix', 'suffix', 1), ic = fm('incomp', 'incomplete', 1), e1 = fm('exit1', 'exit1', 1);
    ck('a stand-in reporting claude-opus-5 (not the pin) -> exit 1 and "MODEL IS NOT THE PIN"', bm.r.status === 1 && /MODEL IS NOT THE PIN claude-opus-5-5/.test(out(bm.r)));
    ck('a model string with a bracket suffix (claude-opus-5-5[1m]) is accepted (exit 0): the pin is a prefix match on bracket/date suffixes only', sf.r.status === 0);
    ck('incomplete verdicts -> exit 1 "verdicts file MISSING/INVALID"', ic.r.status === 1 && /MISSING\/INVALID/.test(out(ic.r)));
    ck('the CLI exiting 1 -> exit 1', e1.r.status === 1);
    const rl = fm('ratelimit', 'ratelimit', 1);
    ck('M5: a rate-limited refusal (no model, no tool call) exits 1 and is LABELLED as consuming no replacement', rl.r.status === 1 && /RATE-LIMIT-REFUSAL\? no model and no tool call/.test(out(rl.r)) && /consumes no replacement/.test(out(rl.r)));
    ck('M5: an ordinary failed grade is not labelled a rate-limit refusal', !/RATE-LIMIT-REFUSAL/.test(out(ic.r)));
    // M5: the next probe also needs the previous probe's PINNED model and memory ABSENT (separate scratch folders)
    const alt = (n) => { const g = path.join(SCR, `alt${n}`); for (const d of ['grading', 'logs', 'projects']) fs.mkdirSync(path.join(g, d), { recursive: true }); return { EQ_GRADING_DIR: path.join(g, 'grading'), EQ_LOG_DIR: path.join(g, 'logs'), TURN_PROJECTS: path.join(g, 'projects'), TURN_FAKE_CLAUDE: fakePath }; };
    // the gate reads the LAST probe-1 record in the REAL key shape (slot, attempt, session_id, model, exit, cwd, startedAt, endedAt, slugJsonl, memoryDir) and judges its transcript
    const gate = (name, recs) => {
        const g = alt('g' + name), tdir = path.join(g.TURN_PROJECTS, 'slug-x'); fs.mkdirSync(tdir, { recursive: true });
        const tx = (kind) => [JSON.stringify({ type: 'user', message: { content: kind === 'loaded' ? '<claude-mem-context> x </claude-mem-context>' : 'prompt' } }), JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'a' } }] } }), JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'b' } }] } })].join('\n') + '\n';
        const lines = recs.map(([kind, exit, model], i) => { const sid = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`; fs.writeFileSync(path.join(tdir, sid + '.jsonl'), tx(kind)); return JSON.stringify({ slot: 'cwdprobe-1', attempt: 1, session_id: sid, model: model ?? 'claude-opus-5-5', exit, cwd: 'C:\\x\\cwdprobe-1-a1', startedAt: 't0', endedAt: 't1', slugJsonl: 1, memoryDir: 'absent' }); });
        fs.writeFileSync(path.join(g.EQ_LOG_DIR, 'grader-cwd.launches.jsonl'), lines.join('\n') + '\n');
        const r = L(['cwdprobe-2', '--probe', ...PIN, '--dry-run'], { ...g, EQ_FAKE_MODE: 'ok' });
        return { refused: /REFUSED/.test(out(r)), text: out(r) };
    };
    const gClean = gate('clean', [['clean', 0]]), gLoaded = gate('loaded', [['loaded', 0]]), gStaleThenClean = gate('stale', [['loaded', 0], ['clean', 0]]), gCleanThenFailed = gate('cf', [['clean', 0], ['loaded', 1]]), gCleanThenLoaded = gate('cl', [['clean', 0], ['loaded', 0]]), gBadModel = gate('bm', [['clean', 0, 'claude-opus-5']]);
    ck('probe gate, REAL record shape (no memory/tools fields): the last record clean -> allowed (not "memory unknown")', !gClean.refused, gClean.text.split('\n').find((x) => /REFUSED/.test(x))?.slice(0, 100) ?? 'allowed');
    ck('probe gate: the last record LOADED -> refused naming memory LOADED', gLoaded.refused && /memory LOADED/.test(gLoaded.text));
    ck('probe gate: a stale failed LOADED record followed by a clean one -> allowed (the LAST record decides)', !gStaleThenClean.refused);
    ck('probe gate: a clean record followed by a failed one (exit 1, LOADED) -> refused', gCleanThenFailed.refused && /exit 1/.test(gCleanThenFailed.text) && gCleanThenLoaded.refused);
    ck('probe gate: the last record read another model -> refused naming it', gBadModel.refused && /model claude-opus-5,/.test(gBadModel.text));
    const alt1 = alt(1), alt2 = alt(2);
    const pm1 = L(['cwdprobe-1', '--probe', ...PIN], { ...alt1, EQ_FAKE_MODE: 'badmodel' }), pm2 = L(['cwdprobe-2', '--probe', ...PIN], { ...alt1, EQ_FAKE_MODE: 'ok' });
    ck('M5: probe 1 that read another model: it fails (exit 1) and probe 2 is REFUSED naming the model', pm1.status === 1 && pm2.status === 2 && /REFUSED/.test(out(pm2)) && /model claude-opus-5,/.test(out(pm2)), out(pm2).slice(0, 120));
    const pl1 = L(['cwdprobe-1', '--probe', ...PIN], { ...alt2, EQ_FAKE_MODE: 'loadedmem' }), pl2 = L(['cwdprobe-2', '--probe', ...PIN], { ...alt2, EQ_FAKE_MODE: 'ok' });
    ck('M5: probe 1 whose transcript shows memory LOADED: it fails (exit 1) and probe 2 is REFUSED naming memory LOADED', pl1.status === 1 && pl2.status === 2 && /memory LOADED/.test(out(pl2)), out(pl2).slice(0, 120));
    // slot mode + the ORIGINAL audit with this hour's dispatch
    const fs1 = F(['blind-1.g1', ...PIN, '--attempt', '1']);
    ck('SLOT mode with the stand-in: exit 0, valid on its 2 keys, launches.jsonl written in the blind dir', fs1.status === 0 && /valid on its pairs \(2 keys\)/.test(out(fs1)) && fs.existsSync(path.join(BL, 'launches.jsonl')), out(fs1).split('\n').slice(-2, -1)[0]?.slice(0, 120));
    const sid = JSON.parse(fs.readFileSync(path.join(BL, 'launches.jsonl'), 'utf8').trim().split('\n').pop()).session_id;
    const oa = spawnSync(process.execPath, [path.join(F_R, 'audit-graders.mjs'), '--blind-dir', BL, '--dispatch', dispatch, '--projects', PR, `blind-1.g1=session:${sid}`], { encoding: 'utf8' });
    ck('the ORIGINAL audit-graders.mjs on a slot-mode transcript with E\\eq-grader-dispatch.txt: clean, dispatch=match', oa.status === 0 && /dispatch=match/.test(oa.stdout) && /AUDIT: all graders clean/.test(oa.stdout), oa.stdout.split('\n')[0].slice(0, 120));
    // probes through the stand-in
    const q1 = F(['cwdprobe-1', '--probe', ...PIN]);
    ck('probe 1 with the stand-in: exit 0, one Read + one Write, ABSENT, model = pin', q1.status === 0 && /cwdprobe-1 OK/.test(out(q1)), out(q1).split('\n').slice(-3, -2)[0]?.slice(0, 140));
    const q3early = F(['cwdprobe-3', '--probe']);
    ck('probe 3 before probe 2 is REFUSED', q3early.status === 2 && /REFUSED/.test(out(q3early)));
    const q2 = F(['cwdprobe-2', '--probe', ...PIN]);
    ck('probe 2 after probe 1 ran (exit 0)', q2.status === 0 && /cwdprobe-2 OK/.test(out(q2)));
    const q3 = F(['cwdprobe-3', '--probe']);
    ck('probe 3 (alias read) after probe 2: runs without --model-id (argv shows opus), exit 0', q3.status === 0 && / --model opus /.test(out(q3)) && /cwdprobe-3 OK/.test(out(q3)));
    const qx = fs.readFileSync(path.join(LG_, 'grader-cwd.launches.jsonl'), 'utf8').trim().split('\n').length;
    ck('probes append to grader-cwd.launches.jsonl in the log dir (3 lines)', qx === 3, `${qx}`);

    // ── eq-audit: synthetic transcripts; same verdicts as the original audit on blind-named files ──
    const { auditFiles } = await import(`${pathToFileURL(audit).href}?x=${Date.now()}`);
    const tpl2 = A.dispatchTemplate(dispatch);
    const bp = path.join(BL, 'pairs.blind-1.json'), bv = path.join(BL, 'verdicts.blind-1.g1.json');
    const promptB = LG.buildPrompt(tpl2, { blindDir: BL, slot: 'blind-1.g1' });
    const rubric = A.RUBRIC.replace(/\//g, '\\');
    const T = (calls, { prompt = promptB, extra = [] } = {}) => [JSON.stringify({ type: 'user', message: { content: prompt } }), ...calls.map(([name, input]) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } })), ...extra].join('\n');
    const cleanCalls = [['Read', { file_path: rubric }], ['Read', { file_path: bp }], ['Write', { file_path: bv }], ['Read', { file_path: bv }]];
    const cases = [
        ['clean', T(cleanCalls), false, 'match'], ['Edit of the own verdicts is fine', T([...cleanCalls.slice(0, 2), ['Edit', { file_path: bv }]]), false, 'match'],
        ['a Read of another file', T([...cleanCalls, ['Read', { file_path: path.join(BL, 'pairs.blind-2.json') }]]), true, 'match'],
        ['a Bash call', T([...cleanCalls, ['Bash', { command: 'dir' }]]), true, 'match'], ['a Write elsewhere', T([...cleanCalls, ['Write', { file_path: path.join(BL, 'x.json') }]]), true, 'match'],
        ['a Grep call', T([...cleanCalls, ['Grep', { pattern: 'x' }]]), true, 'match'], ['an mcp call', T([...cleanCalls, ['mcp__x__y', {}]]), true, 'match'],
        ['a denied call', T(cleanCalls, { extra: [JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: 'Permission to use Read has been denied' }] } })] }), true, 'match'],
        ['a changed dispatch text', T(cleanCalls, { prompt: promptB.replace('You are grading', 'You are NOT grading') }), true, 'DIFFERS'],
        ['the verdicts path swapped in the prompt', T(cleanCalls, { prompt: promptB.replace('verdicts.blind-1.g1.json', 'verdicts.blind-1.g2.json') }), true, 'DIFFERS'],
    ];
    let agree = 0, expectOk = 0;
    for (const [name, text, flagged, disp] of cases) {
        const mine = auditFiles(text, { tag: 'blind-1.g1', files: { pairs: bp, verdicts: bv }, dispatch: tpl2 });
        const orig = A.auditText(text, { tag: 'blind-1.g1', blindDir: BL, dispatch: tpl2 });
        const same = (mine.flags.length > 0) === (orig.flags.length > 0) && mine.dispatch === orig.dispatch && JSON.stringify(mine.tools) === JSON.stringify(orig.tools);
        if (same) agree++;
        if ((mine.flags.length > 0) === flagged && mine.dispatch === disp) expectOk++;
        if (!same || (mine.flags.length > 0) !== flagged || mine.dispatch !== disp) ck(`eq-audit case "${name}" as expected and equal to the original audit`, false, `mine flags ${mine.flags.length} disp ${mine.dispatch}; orig flags ${orig.flags.length} disp ${orig.dispatch}`);
    }
    ck(`eq-audit: ${cases.length} synthetic transcripts all flagged / clean as expected`, expectOk === cases.length, `${expectOk}/${cases.length}`);
    ck(`eq-audit: its verdict equals audit-graders.mjs's on the same ${cases.length} transcripts for a blind-named slot`, agree === cases.length, `${agree}/${cases.length}`);
    const ap = path.join(ARMS, 'arm-pairs.json'), av = path.join(ARMS, 'arm-verdicts.json');
    const promptArm = buildArmPrompt(tpl2, ap, av, 'inapp');
    const armClean = auditFiles(T([['Read', { file_path: rubric }], ['Read', { file_path: ap }], ['Write', { file_path: av }], ['Read', { file_path: av }]], { prompt: promptArm }), { tag: 'inapp', files: { pairs: ap, verdicts: av }, dispatch: tpl2 });
    const armOther = auditFiles(T([['Read', { file_path: rubric }], ['Read', { file_path: ap }], ['Read', { file_path: pp }], ['Write', { file_path: av }]], { prompt: promptArm }), { tag: 'inapp', files: { pairs: ap, verdicts: av }, dispatch: tpl2 });
    const armTag = auditFiles(T([['Read', { file_path: rubric }], ['Read', { file_path: ap }], ['Write', { file_path: av }]], { prompt: promptArm.replace('`inapp`', '`inapp2`') }), { tag: 'inapp', files: { pairs: ap, verdicts: av }, dispatch: tpl2 });
    ck('eq-audit, an arbitrary-file arm: clean / a Read of another arm\'s pairs FLAGS / a wrong tag in the prompt = DIFFERS', armClean.flags.length === 0 && armClean.dispatch === 'match' && armOther.flags.length === 1 && armTag.dispatch === 'DIFFERS');
    const nf = run(audit, ['--dispatch', dispatch, '--projects', PR, '--item', `x|${pp}|${vp}|session:00000000-0000-0000-0000-000000000000`], {});
    ck('eq-audit: a transcript that cannot be found = exit 1 "cannot audit"; usage errors exit 2', nf.status === 1 && /cannot audit/.test(nf.stdout) && run(audit, [], {}).status === 2 && run(audit, ['--item', 'bad'], {}).status === 2);
    return results;
}
/** suite() that turns an exception into a failing check (a mutant that breaks the flow must read as caught, an unmutated run as FAILED). */
export async function safeSuite(opts = {}) {
    const results = [];
    try { return await suite({ ...opts, results }); } catch (e) { results.push({ name: `suite ABORTED: ${String(e.message).slice(0, 100)}`, ok: false }); return results; }
}
function buildArmPrompt(tpl, pairs, verdicts, tag) { const w = (p) => path.resolve(p).replace(/\//g, '\\'); return tpl.replace('RUN\\<pairs file>', () => w(pairs)).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${w(verdicts)}`).replace('`TAG`', () => `\`${tag}\``); }

/** eq-merge.cmd against a fake MAIN: a stub judge records its arguments. cwd = the fake MAIN. */
export function mergeSuite({ cmdSrc = MERGE, quiet = false } = {}) {
    const results = [];
    const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond, extra }); if (!quiet) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
    fs.rmSync(MSCR, { recursive: true, force: true });
    const bin = path.join(MSCR, 'bin'), main = path.join(MSCR, 'main'), run = path.join(main, 'runs', 'r1'), other = path.join(MSCR, 'elsewhere');
    for (const d of [bin, run, path.join(main, 'electron', 'test', 'golden'), other]) fs.mkdirSync(d, { recursive: true });
    const cmdBytes = fs.readFileSync(cmdSrc);
    const cmdPath = path.join(bin, 'eq-merge.cmd'); fs.writeFileSync(cmdPath, cmdBytes);
    fs.writeFileSync(path.join(main, 'electron', 'test', 'golden', 'interview60.judge.mjs'), "console.log('JUDGE-STUB ' + process.argv.slice(2).join(' ')); process.exit(process.env.STUB_FAIL && process.argv.join(' ').includes(process.env.STUB_FAIL) ? 1 : 0);\n");
    fs.writeFileSync(path.join(run, 'interview60.flight.done.json'), '{}');
    const tags = [...cmdBytes.toString('latin1').matchAll(/^call :arm (\S+)\s+(\S+)/gm)].map((m) => [m[1], m[2]]);
    const all = ['inapp', ...tags.map((t) => t[0]), 'bare31'];
    const put = (t, body = `{"v":"${t}"}`) => fs.writeFileSync(path.join(bin, `eq-verdicts-${t}.json`), body);
    const sh = (args, cwd, env = {}) => spawnSync('cmd.exe', ['/d', '/s', '/c', `""${cmdPath}" ${args}"`], { cwd, encoding: 'utf8', windowsVerbatimArguments: true, env: { ...process.env, ...env } });
    const nodeOk = fs.existsSync('C:\\Program Files\\nodejs\\node.exe');
    ck('the cmd\'s node path exists on this machine', nodeOk);
    ck('eq-merge.cmd: ASCII only, every line CRLF, no parenthesis in any echo line', !/[^\x00-\x7f]/.test(cmdBytes.toString('latin1')) && cmdBytes.toString('latin1').split('\r\n').slice(0, -1).every((l) => !/\n/.test(l)) && !/[^\r]\n/.test(cmdBytes.toString('latin1')) && cmdBytes.toString('latin1').split('\r\n').filter((l) => /\becho\b/i.test(l) && !/^rem /i.test(l)).every((l) => !/[()]/.test(l)));
    ck('eq-merge.cmd: 14 merge rows = the in-app arm + 12 :arm rows + bare31', all.length === 14, `${all.length}`);
    for (const t of all) put(t);
    const r1 = sh(`m-1 runs\\r1`, main);
    const merged = (r1.stdout.match(/^MERGED /gm) ?? []).length, stubs = (r1.stdout.match(/^JUDGE-STUB /gm) ?? []).length;
    ck('a run dir holding all 14 verdicts files: 14 MERGED lines, 14 judge calls, ALL MERGES RAN, exit 0', r1.status === 0 && merged === 14 && stubs === 14 && /ALL MERGES RAN/.test(r1.stdout), `exit ${r1.status} merged ${merged} stubs ${stubs}`);
    ck('every judge call carries --model m-1 (the exact id)', (r1.stdout.match(/--model m-1\b/g) ?? []).length === 14);
    ck('every verdicts file was copied to the run dir as interview60.judge.verdicts[.arm].json (14 files, content = source)', fs.readdirSync(run).filter((f) => /^interview60\.judge\.verdicts/.test(f)).length === 14 && sha(fs.readFileSync(path.join(run, 'interview60.judge.verdicts.json'))) === sha(fs.readFileSync(path.join(bin, 'eq-verdicts-inapp.json'))));
    ck('answers files named per arm; bare31 reads the PLAIN interview60.answers.json; no arm reads another\'s', /--answers runs\\r1\\interview60\.answers\.json --verdicts runs\\r1\\interview60\.judge\.verdicts\.gemini-3\.1-flash-lite\.json/.test(r1.stdout) && tags.every(([, a]) => r1.stdout.includes(`--answers runs\\r1\\interview60.answers.${a}.json --verdicts runs\\r1\\interview60.judge.verdicts.${a}.json`)));
    fs.rmSync(path.join(bin, 'eq-verdicts-captured-low-r2.json'));
    const r2 = sh(`m-1 runs\\r1`, main);
    ck('one arm\'s verdicts file missing: SKIPPED-MISSING captured-low-r2, 13 MERGED, nothing merged for it, exit 0', r2.status === 0 && /^SKIPPED-MISSING captured-low-r2/m.test(r2.stdout) && (r2.stdout.match(/^MERGED /gm) ?? []).length === 13 && !r2.stdout.includes('answers.gemini-3.1-flash-lite_captured-low-r2.json'));
    fs.rmSync(path.join(bin, 'eq-verdicts-bare31.json'));
    const r3 = sh(`m-1 runs\\r1`, main);
    ck('bare31 missing: SKIPPED-MISSING bare31, ALL MERGES RAN', /^SKIPPED-MISSING bare31/m.test(r3.stdout) && /ALL MERGES RAN/.test(r3.stdout) && r3.status === 0);
    fs.rmSync(path.join(bin, 'eq-verdicts-inapp.json'));
    const r4 = sh(`m-1 runs\\r1`, main);
    ck('the in-app verdicts file missing: exit 10 "MISSING", no arm merged', r4.status === 10 && /MISSING eq-verdicts-inapp\.json/.test(r4.stdout) && !/JUDGE-STUB/.test(r4.stdout));
    put('inapp');
    const r5 = sh(`m-1 runs\\r1`, other);
    ck('WRONG CWD (not MAIN): exit 13, the judge is not run', r5.status === 13 && /WRONG CWD/.test(r5.stdout) && !/JUDGE-STUB/.test(r5.stdout), `exit ${r5.status}`);
    const wrong2 = path.join(MSCR, 'elsewhere2'); fs.mkdirSync(path.join(wrong2, 'runs', 'r1'), { recursive: true }); fs.writeFileSync(path.join(wrong2, 'runs', 'r1', 'interview60.flight.done.json'), '{}');
    const r5b = sh(`m-1 runs\\r1`, wrong2);
    ck('WRONG CWD with the run dir present but no judge script: exit 13 and NOTHING copied into the run dir (the h40d guard h40c lacked)', r5b.status === 13 && /WRONG CWD: the judge script is not here/.test(r5b.stdout) && fs.readdirSync(path.join(wrong2, 'runs', 'r1')).join() === 'interview60.flight.done.json', `exit ${r5b.status}`);
    const r6 = sh(`m-1 runs\\nope`, main);
    ck('a wrong run dir (no flight.done.json): exit 13', r6.status === 13 && /WRONG CWD OR RUN DIR/.test(r6.stdout));
    const r7 = sh(``, main), r8 = sh(`m-1`, main);
    ck('no arguments / one argument: exit 12 USAGE', r7.status === 12 && r8.status === 12 && /USAGE/.test(r7.stdout));
    const r9 = sh(`m-1 runs\\r1`, main, { STUB_FAIL: 'captured-high.json' });
    ck('M1: a failing judge on one arm: MERGE-FAILED named, the other arms still merge (11 MERGED: low-r2 and bare31 were removed above), and the exit code is NON-ZERO (1) with SOME MERGES FAILED', /MERGE-FAILED captured-high\b/.test(r9.stdout) && !/^MERGED captured-high$/m.test(r9.stdout) && (r9.stdout.match(/^MERGED /gm) ?? []).length === 11 && /ALL MERGES RAN/.test(r9.stdout) && r9.status === 1 && /SOME MERGES FAILED/.test(r9.stdout), `exit ${r9.status} merged ${(r9.stdout.match(/^MERGED /gm) ?? []).length} failed-lines ${r9.stdout.split(String.fromCharCode(10)).filter((l) => /FAILED/.test(l)).join("/").slice(0, 200)}`);
    fs.chmodSync(path.join(run, 'interview60.judge.verdicts.gemini-3.5-flash-lite_captured-high.json'), 0o444);
    const r9b = sh(`m-1 runs\\r1`, main);
    fs.chmodSync(path.join(run, 'interview60.judge.verdicts.gemini-3.5-flash-lite_captured-high.json'), 0o666);
    ck('M1: a copy that FAILS (the target is read-only) prints COPY-FAILED, does not run the judge for that arm, does not print MERGED for it, exit 1', /^COPY-FAILED captured-high$/m.test(r9b.stdout) && !/^MERGED captured-high$/m.test(r9b.stdout) && !r9b.stdout.includes('answers.gemini-3.5-flash-lite_captured-high.json') && r9b.status === 1, `exit ${r9b.status}`);
    fs.chmodSync(path.join(run, 'interview60.judge.verdicts.json'), 0o444);
    const r9c = sh(`m-1 runs\\r1`, main);
    fs.chmodSync(path.join(run, 'interview60.judge.verdicts.json'), 0o666);
    ck('M1: the in-app copy FAILS: COPY-FAILED inapp, exit 1 at once, no judge call, no other arm', r9c.status === 1 && /^COPY-FAILED inapp$/m.test(r9c.stdout) && !/JUDGE-STUB/.test(r9c.stdout) && !/^MERGED /m.test(r9c.stdout), `exit ${r9c.status}`);
    const r10 = sh(`m-1 runs\\r1`, main, { STUB_FAIL: '--verdicts runs\\r1\\interview60.judge.verdicts.json' });
    ck('a failing in-app merge: exit 1 immediately (the required file), no other arm runs', r10.status === 1 && !/^MERGED /m.test(r10.stdout));
    return results;
}

const MUTANTS = [
    ['launcher: pin refusal removed (a real launch without --model-id proceeds)', "if (!modelId && !dry) usage('a real grader launch needs --model-id", "if (false) usage('a real grader launch needs --model-id"],
    ['launcher: FLAGS ignores the model id', "['-p', prompt, '--model', model,", "['-p', prompt, '--model', 'opus',"],
    ['launcher: modelMatchesPin always true', 'export const modelMatchesPin = (model, pin) => !!model &&', 'export const modelMatchesPin = (model, pin) => true || !!model &&'],
    ['launcher: cwdprobe-3 may carry --model-id', "if (k === 3 && modelId) usage(", "if (false) usage("],
    ['launcher: an existing verdicts file is allowed in PAIRS mode', "if (fs.existsSync(verdictsPath)) usage(`${verdictsPath} already exists", "if (false) usage(`${verdictsPath} already exists"],
    ['launcher: the test-seam guard removed', 'if (!CAL && (process.env.TURN_FAKE_CLAUDE', 'if (false && (process.env.TURN_FAKE_CLAUDE'],
    ['launcher: a blind slot tag accepted in PAIRS mode', "if (/^blind-\\d+\\.g\\d$/.test(slot)) usage(`the tag ${slot} is a blind SLOT name", "if (false) usage(`the tag ${slot} is a blind SLOT name"],
    ['launcher: probe gating removed', 'if (k > 1) {', 'if (false) {'],
    ['launcher: the verdicts path is not substituted in the PAIRS prompt', ".replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${winP(verdicts)}`)", ''],
    ['launcher: Read of the rubric not allowed (rules lose one)', "L.absRule('Read', rubric), L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };\nexport const slotArgs", "L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };\nexport const slotArgs"],
    ['launcher: probe gate uses the FIRST record of the slot', ".filter((l) => l.slot === `cwdprobe-${k - 1}`).pop();", ".filter((l) => l.slot === `cwdprobe-${k - 1}`)[0];"],
    ['launcher: probe gating ignores the previous probe model', '|| !modelMatchesPin(prev.model, PIN) ||', '||'],
    ['launcher: probe gating ignores the previous probe memory', '|| !prevMem || prevMem.loaded) {', ') {'],
    ['launcher: no rate-limit label', 'if (!r.record.model && Object.keys(r.tools).length === 0)', 'if (false)'],
    ['launcher: --setting-sources dropped from FLAGS', ", '--strict-mcp-config', '--setting-sources', 'project,local'];", ", '--strict-mcp-config'];"],
    ['launcher: verdict read-back skipped (always valid)', "vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${Object.keys(keysOf).length} keys)`;", "vp = `verdicts file valid on its pairs (${Object.keys(keysOf).length} keys)`;"],
];
const AUDIT_MUTANTS = [
    ['audit: Bash allowed', "else if (c.name === 'Bash') flags.push('Bash call (graders have no Bash)');", "else if (c.name === 'Bash') { /* allowed */ }"],
    ['audit: the dispatch check removed', 'if (dispatch) {', 'if (false) {'],
    ['audit: denials ignored', 'if (denials) flags.push(', 'if (false) flags.push('],
    ['audit: any Read allowed', "if (!fp || !readOk.has(A.norm(fp, base)))", "if (!fp)"],
];
const CMD_MUTANTS = [
    ['merge: the wrong-cwd check removed', 'if not exist "%J%" exit /b 13', 'rem removed'],
    ['merge: --model not passed on the arm rows', '--verdicts "%R%\\interview60.judge.verdicts.%2.json" --model %M%', '--verdicts "%R%\\interview60.judge.verdicts.%2.json"'],
    ['merge: SKIPPED-MISSING falls through to a merge', 'if not exist "%S%eq-verdicts-%1.json" exit /b 0', 'rem removed'],
    ['merge: a failed copy on an arm still merges', 'if errorlevel 1 goto armcopyfail\r\n', ''],
    ['merge: the exit code stays 0 after a MERGE-FAILED', 'if defined FAILS exit /b 1', 'rem removed'],
    ['merge: the in-app copy failure does not stop', 'if errorlevel 1 echo COPY-FAILED inapp\r\nif errorlevel 1 exit /b 1\r\n', 'if errorlevel 1 echo COPY-FAILED inapp\r\n'],
    ['merge: an arm row dropped', `call :arm ${'high'.padEnd(26)} gemini-3.5-flash-lite_high\r\n`, ''],
];

async function main() {
    const lines = []; const orig = console.log;
    console.log = (...a) => { lines.push(a.join(' ')); orig(...a); };
    const results = [...(await safeSuite()), ...mergeSuite()];
    const bad = results.filter((r) => !r.ok);
    let caught = 0, total = 0;
    if (!process.argv.includes('--no-mutants')) {
        fs.rmSync(MUT, { recursive: true, force: true }); fs.mkdirSync(MUT, { recursive: true });
        const lsrc = fs.readFileSync(LAUNCHER, 'utf8'), asrc = fs.readFileSync(AUDIT, 'utf8');
        for (const [kind, list, src, file] of [['launcher', MUTANTS, lsrc, 'launch-grader-eq.mjs'], ['audit', AUDIT_MUTANTS, asrc, 'eq-audit.mjs']]) for (const [name, from, to] of list) {
            total++;
            if (!src.includes(from)) { console.log(`MUTANT ${name}: pattern NOT FOUND (the mutant list is stale)`); continue; }
            const f = path.join(MUT, `${total}-${file}`);
            fs.writeFileSync(f, src.replace(from, to));
            const r = await safeSuite(kind === 'launcher' ? { launcher: f, quiet: true } : { audit: f, quiet: true });
            const fails = r.filter((x) => !x.ok);
            if (fails.length && !fails.every((x) => x.crash)) { caught++; console.log(`MUTANT CAUGHT  ${name}  (first failing check: ${fails[0].name.slice(0, 80)})`); } else console.log(`MUTANT ${fails.length ? 'CRASHED (not counted)' : 'SURVIVED'}  ${name}`);
        }
        const csrc = fs.readFileSync(MERGE, 'latin1');
        for (const [name, from, to] of CMD_MUTANTS) {
            total++;
            if (!csrc.includes(from)) { console.log(`MUTANT ${name}: pattern NOT FOUND`); continue; }
            const f = path.join(MUT, `${total}-eq-merge.cmd`);
            fs.writeFileSync(f, Buffer.from(csrc.replace(from, to), 'latin1'));
            const fails = mergeSuite({ cmdSrc: f, quiet: true }).filter((x) => !x.ok);
            if (fails.length) { caught++; console.log(`MUTANT CAUGHT  ${name}  (first failing check: ${fails[0].name.slice(0, 80)})`); } else console.log(`MUTANT SURVIVED  ${name}`);
        }
        fs.rmSync(MUT, { recursive: true, force: true });
    }
    fs.rmSync(SCR, { recursive: true, force: true }); fs.rmSync(MSCR, { recursive: true, force: true });
    console.log(`\nLAUNCHER-EQ CALIBRATION: ${results.length - bad.length}/${results.length} checks${bad.length ? ` FAILED: ${bad.map((b) => b.name).join(' | ')}` : ' OK'}; mutants caught ${caught}/${total}`);
    console.log = orig;
    fs.writeFileSync(path.join(E, 'launch-grader-eq.cal.txt'), lines.join('\n') + '\n');
    process.exit(bad.length === 0 && caught === total ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
