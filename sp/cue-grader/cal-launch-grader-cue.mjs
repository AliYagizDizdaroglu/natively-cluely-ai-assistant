// cal-launch-grader-cue.mjs: known-answer calibration of launch-grader-cue.mjs and cue-grader-dispatch.txt (SPEC 5.1: the 15 mutation tests, mutations 1-14 and 9b).
// NO MODEL IS CALLED: the launcher runs against cal-fake-claude.mjs (TURN_FAKE_CLAUDE, CUE_CAL_FAKE=1) with PATH stripped so no real `claude` can be found (proved below; the stand-in logs every invocation,
// so "nothing was launched" is a count, not a belief). Everything is written under a temp LAB (CUE_LAB_DIR); nothing under the real LAB is touched.
//   node cal-launch-grader-cue.mjs [--launcher <path>] [--quiet]     the suite
//   node cal-launch-grader-cue.mjs --mutants                         the suite against every source mutant of the launcher: each must FAIL at least one check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const LAUNCHER = path.resolve(argOf('--launcher') ?? path.join(HERE, 'launch-grader-cue.mjs'));
const QUIET = argv.includes('--quiet');
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F_R = `${SP}/followup-turn/R`;
const RD = `${SP}/router-default/grade/launch-grader-rd.mjs`;
const FAKE = path.join(HERE, 'cal-fake-claude.mjs');
const sha = (b) => createHash('sha256').update(b).digest('hex');

export const MUTANTS = [
    { id: 'L-gate-bypassed', from: "if (!gate.ok) refuse(`the probe gate is not passed: ${gate.problems.join('; ')}`);", to: '' },
    { id: 'L-gate-probe-2-not-checked', from: "for (const slot of ['cwdprobe-1', 'cwdprobe-2'])", to: "for (const slot of ['cwdprobe-1'])" },
    { id: 'L-probe-exit-unchecked', from: "if (rec.exit !== 0) return `exit ${rec.exit}`;", to: '' },
    { id: 'L-launcher-sha-unchecked', from: "if (rec.launcher !== launcherSha) return", to: 'if (false) return' },
    { id: 'L-record-has-no-launcher-sha', from: 'const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? \'unknown\', tools: r.tools, models: transcriptModels(text) };', to: 'const rec = { ...r.record, memory: r.memory?.status ?? \'unknown\', tools: r.tools, models: transcriptModels(text) };' },
    { id: 'L-gate-memory-unchecked', from: "if (mem.loaded) return `memory LOADED (project ${mem.projectMemory.total}, claude-mem ${mem.claudeMem.total})`; // MUT-gate-memory", to: '' },
    { id: 'L-gate-tools-unchecked', from: "if (tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) return `tools ${JSON.stringify(tools)} (need exactly one Read and one Write)`; // MUT-gate-tools", to: '' },
    { id: 'L-gate-model-unchecked', from: "if (!ms.length || !ms.every((m) => modelMatchesPin(m, PIN))) return `transcript models ${JSON.stringify(ms)} are not the pin`; // MUT-gate-model", to: '' },
    { id: 'L-pin-match-tolerant', from: "model.split('+').every((m) => m === pin);   // exactly the pin", to: "model.split('+').every((m) => m === pin || m.startsWith(`${pin}[`));   // exactly the pin" },
    { id: 'L-transcript-model-unchecked', from: 'const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));    // MUT-transcript-model', to: 'const pinned = modelMatchesPin(r.record.model, PIN);' },
    { id: 'L-model-id-any-string', from: 'if (modelId != null && modelId !== PIN)', to: 'if (false)' },
    { id: 'L-pin-not-required', from: "if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${PIN} (no other model grades)`); // MUT-pin", to: '' },
    { id: 'L-probe-pin-not-required', from: "if (!modelId && !dry) refuse(`${probe} is a pinned probe", to: "if (false) refuse(`${probe} is a pinned probe" },
    { id: 'L-setting-sources-dropped', from: ", '--strict-mcp-config', '--setting-sources', 'project,local'];", to: ", '--strict-mcp-config'];" },
    { id: 'L-copied-flags-changed', from: "'--permission-mode', 'dontAsk'", to: "'--permission-mode', 'acceptEdits'" },
    { id: 'L-hash-check-removed', from: 'const hp = hashProblem(tag, LABROOT); if (hp) refuse(hp);', to: '' },
    { id: 'L-cap-not-enforced-grader', from: "if (count >= CAP) refuse(`the two logs already hold ${count} records: the cap is ${CAP} sessions, probes and failed attempts included (this would be session ${count + 1})`);   // MUT-cap\n    console.log(argvLine);", to: 'console.log(argvLine);' },
    { id: 'L-cap-not-enforced-probe', from: "if (!dry && count >= CAP) refuse(", to: 'if (false) refuse(' },
    { id: 'L-cap-counts-one-log-only', from: 'export const nowCount = () => L.readLaunches(path.join(LOGS, \'launches.jsonl\')).length + L.readLaunches(path.join(LOGS, \'grader-cwd.launches.jsonl\')).length;', to: 'export const nowCount = () => L.readLaunches(path.join(LOGS, \'launches.jsonl\')).length;' },
    { id: 'L-cap-off-by-one', from: 'export const CAP = 26;', to: 'export const CAP = 27;' },
    { id: 'L-verdicts-overwritten', from: "if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists", to: "if (false) refuse(`${verdictsPath} already exists" },
    { id: 'L-pairs-dir-unchecked', from: 'const pdp = pairsDirProblem(D.pairs); if (pdp) refuse(pdp);', to: '' },
    { id: 'L-seam-allowed-in-real', from: 'if (!CAL && SEAMS.some((s) => process.env[s])) {', to: 'if (false) {' },
    { id: 'L-seam-path-outside-allowed', from: 'if (!inside(p, LABROOT)) {', to: 'if (false) {' },
    { id: 'L-probe-2-without-1', from: "if (why) { say(`${probe}: ${dry ?", to: "if (false) { say(`${probe}: ${dry ?" },
    { id: 'L-h40d-without-r1-agreement', from: "if (info.run === 'h40d' && info.kind === 'real') { const ag = r1AgreementProblem(); if (ag) refuse(ag); }", to: '' },
    { id: 'L-rev-without-completed-cal', from: "if (info.kind === 'rev' && !['cal-1'", to: "if (false && !['cal-1'" },
    { id: 'L-exit-ignores-memory', from: "rec.memory === 'ABSENT' && toolsOk", to: 'toolsOk' },
    { id: 'L-exit-ignores-path-violations', from: 'toolsOk && pv === 0 && pinned', to: 'toolsOk && pinned' },
    { id: 'L-pairs-not-bound-in-record', from: 'pairsSha12: sha12(fs.readFileSync(pairsPath)), rubricSha12', to: 'pairsSha12: null, rubricSha12' },
    { id: 'L-verdicts-not-bound-in-record', from: 'verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null };', to: 'verdictsSha12: null };' },
    { id: 'L-imports-rd', from: "const { scan } = await import(", to: "await import(pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/grade/launch-grader-rd.mjs').href);\nconst { scan } = await import(" },
];

if (argv.includes('--mutants')) {
    const src = fs.readFileSync(LAUNCHER, 'utf8'), only = argOf('--only');
    let caught = 0; const lines = [];
    for (const m of MUTANTS.filter((x) => !only || x.id === only)) {
        const n = src.split(m.from).length - 1;
        if (n !== 1) { lines.push(`ERROR ${m.id}: anchor occurs ${n} times (must be 1)`); continue; }
        const f = path.join(HERE, `launch-grader-cue.mut-${m.id}.mjs`);
        fs.writeFileSync(f, src.replace(m.from, () => m.to));
        const r = spawnSync(process.execPath, [path.join(HERE, 'cal-launch-grader-cue.mjs'), '--launcher', f, '--quiet'], { encoding: 'utf8', timeout: 900000 });
        fs.rmSync(f, { force: true });
        const failed = (r.stdout.match(/^FAIL /gm) ?? []).length;
        const ok = r.status !== 0 && failed > 0;
        if (ok) caught++;
        lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${m.id}  (${failed} check(s) failed)`);
    }
    console.log(lines.join('\n'));
    const total = MUTANTS.filter((x) => !only || x.id === only).length;
    console.log(`MUTANTS ${caught}/${total} caught`);
    process.exit(caught === total ? 0 : 1);
}

const results = [];
const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); if (!QUIET || !cond) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
const lib = await import(pathToFileURL(path.join(HERE, 'lib.mjs')).href);
const L = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-cue-launch-'));
const BIN = path.join(TMP, 'bin'); fs.mkdirSync(BIN, { recursive: true });
const LAUNCHER_SHA12 = sha(fs.readFileSync(LAUNCHER)).slice(0, 12);
const PINARG = ['--model-id', 'claude-opus-5-5'];
const RD_SHA12 = sha(fs.readFileSync(RD)).slice(0, 12);

/** One isolated scenario: its own temp LAB (rubric, spec, dispatch copied in), projects folder, fake log. */
let sn = 0;
function scenario({ pairsFor = ['cal-1.g1'], items = 3 } = {}) {
    const name = `s${++sn}`, lab = path.join(TMP, name, 'lab'), PR = path.join(TMP, name, 'projects'), FLOG = path.join(TMP, name, 'fake.log');
    for (const d of [lab, PR, path.join(lab, 'pairs'), path.join(lab, 'verdicts')]) fs.mkdirSync(d, { recursive: true });
    for (const f of ['rubric.md', 'SPEC-cue-grader.md', 'cue-grader-dispatch.txt', 'thresholds.json']) fs.copyFileSync(path.join(HERE, f), path.join(lab, f));
    const D = lib.dirsOf(lab);
    const mkPairs = (tag, n = items) => fs.writeFileSync(path.join(D.pairs, lib.pairsName(tag)), JSON.stringify({ items: Array.from({ length: n }, (_, i) => ({ key: `c${String(i + 1).padStart(2, '0')}`, question: `cal question ${i}`, cues: ['First cue here', 'Second cue here'], answer: `cal answer ${i}` })) }));
    for (const t of pairsFor) mkPairs(t);
    const env = (extra = {}) => ({ ...process.env, CUE_CAL_FAKE: '1', CUE_LAB_DIR: lab, TURN_PROJECTS: PR, CUE_F_R: F_R, CUE_FAKE_LOG: FLOG, PATH: `${BIN};C:\\Windows\\System32`, ...extra });
    const run = (args, extra) => spawnSync(process.execPath, [LAUNCHER, ...args], { encoding: 'utf8', env: env(extra), timeout: 180000 });
    const fakeRun = (args, mode = 'ok', extra = {}) => run(args, { TURN_FAKE_CLAUDE: FAKE, CUE_FAKE_MODE: mode, ...extra });
    const invoked = () => (fs.existsSync(FLOG) ? fs.readFileSync(FLOG, 'utf8').split('\n').filter(Boolean).length : 0);
    const recs = (file) => L.readLaunches(path.join(lab, file));
    const probes = (modes = ['ok', 'ok']) => modes.map((m, i) => fakeRun([`cwdprobe-${i + 1}`, '--probe', ...PINARG], m));
    const freeze = () => { fs.writeFileSync(D.rubricSha, `${lib.fileSha(D.rubric)}\n`); fs.writeFileSync(D.specSha, `${lib.fileSha(D.spec)}\n`); fs.writeFileSync(D.thresholdsSha, `${lib.fileSha(D.thresholds)}\n`); };
    const addRecords = (file, n, over = {}) => { for (let i = 0; i < n; i++) fs.appendFileSync(path.join(lab, file), `${JSON.stringify({ slot: 'filler', attempt: 1, exit: 0, ...over })}\n`); };
    const snap = () => JSON.stringify([D.grading, D.verdicts, D.pairs].map((d) => (fs.existsSync(d) ? fs.readdirSync(d).sort() : null)).concat([fs.existsSync(D.launches), fs.existsSync(D.probeLaunches)]));
    return { lab, D, PR, env, run, fakeRun, invoked, recs, probes, freeze, addRecords, mkPairs, snap, FLOG };
}
const out = (r) => r.stdout + r.stderr;

// ================================================================= 0. tripwire and the stand-in
{
    const S = scenario();
    const w = spawnSync('cmd.exe', ['/d', '/c', 'where claude'], { encoding: 'utf8', env: S.env() });
    ck('tripwire: with this PATH no real `claude` is reachable (a stray real launch is impossible)', w.status !== 0, `where exit ${w.status}`);
}

// ================================================================= 1. the dispatch text
{
    const D = lib.dirsOf(HERE), dText = fs.readFileSync(D.dispatch, 'utf8').replace(/\r\n/g, '\n');
    const MARK = '----- dispatch text (substitute {{RUBRIC}}, {{PAIRS}} and {{VERDICTS}}) -----\n';
    const tpl = dText.split(MARK)[1]?.trim();
    ck('dispatch: the marker appears exactly once, and each of {{RUBRIC}}, {{PAIRS}}, {{VERDICTS}} exactly once in the template', dText.split(MARK).length === 2 && ['{{RUBRIC}}', '{{PAIRS}}', '{{VERDICTS}}'].every((k) => tpl.split(k).length === 2));
    ck('dispatch: the template names no tag, run, source, plant or calibration (a grader cannot tell calibration from real data)', !/\b(cal|rev|r1|h40d|calibration|plant|in-app|bare|eq)\b/i.test(tpl.replace(/the pairs file/gi, '')), tpl.match(/\b(cal|rev|r1|h40d|calibration|plant|in-app|bare)\b/gi)?.join(',') ?? '');
    ck('dispatch: forbids subagents, other files and API keys; asks for a reply of counts only', /do NOT dispatch subagents/.test(tpl) && /Never print, read or copy an API key/.test(tpl) && /reply with ONLY: the number of items graded, and the count of each label/.test(tpl));
    ck('dispatch: the template check can fail (a template with a missing token is a problem)', (() => { const bad = tpl.replace('{{VERDICTS}}', ''); return bad.split('{{VERDICTS}}').length !== 2; })());
    const rub = fs.readFileSync(path.join(HERE, 'rubric.md'), 'utf8');
    ck('rubric: has exactly one `---` line, and names R, C, G, V, K, D, the work order (K last) and the output form', rub.split('\n').filter((l) => l === '---').length === 1 && ['R: answers the question', 'C: correct', 'G: usable at a glance', 'V: coverage', 'K: consistent with the answer', 'D: direct answer first', 'Then read the full answer'].every((s) => rub.includes(s) || rub.includes(s.replace('Then read', 'Only then read'))) && /Only then read the full answer, and score K last/.test(rub));
}

// ================================================================= 2. source facts (mutation 8: the flag count)
{
    const src = fs.readFileSync(LAUNCHER, 'utf8');
    const flagLine = src.split('\n').find((l) => /^export const FLAGS = /.test(l)) ?? '';
    const count = (s, w) => s.split(w).length - 1;
    ck('source (8): the FLAGS line carries --setting-sources project,local exactly once and --strict-mcp-config exactly once', count(flagLine, "'--setting-sources', 'project,local'") === 1 && count(flagLine, "'--strict-mcp-config'") === 1);
    ck('source (8): that check can fail (the flag removed counts 0)', count(flagLine.replace("'--setting-sources', 'project,local'", ''), "'--setting-sources', 'project,local'") === 0);
    ck('source: no --add-dir on the FLAGS / args lines, no Bash allowance, no dangerously-skip flag', !/add-dir/.test(src.split('\n').filter((l) => /^export const (FLAGS|pairsArgs|probeArgs)\b/.test(l)).join('\n')) && !/--dangerously|--allowed-tools[^\n]*Bash/.test(src));
    ck('source: tools are exactly Read,Write,Edit and the model pin is claude-opus-5-5', /'--tools', 'Read,Write,Edit'/.test(flagLine) && /export const PIN = 'claude-opus-5-5'/.test(src) && /export const CAP = 26;/.test(src));
    ck('source (n2): it does NOT import launch-grader-rd.mjs (no import or dynamic import of it)', !/import[^\n]*launch-grader-rd|launch-grader-rd\.mjs'\)/.test(src.replace(/^\/\/.*$/gm, '')));
    ck('source: it binds the free names of the copied functions (L, scan, PIN, LAUNCHER_SHA12, A)', /const L = await import/.test(src) && /const \{ scan \} = await import/.test(src) && /export const PIN = /.test(src) && /export const LAUNCHER_SHA12 = /.test(src) && /const A = \{ RUBRIC: /.test(src));
}

// ================================================================= 3. mutation 14: the copied rd functions are text-identical to rd's file
{
    const rd = fs.readFileSync(RD, 'utf8').split('\n'), cue = fs.readFileSync(LAUNCHER, 'utf8');
    const stmt = (name, multi) => { const i = rd.findIndex((l) => l.startsWith(`export ${multi ? 'function' : 'const'} ${name}`)); if (i < 0) return null; if (!multi) return rd[i]; let j = i; while (rd[j] !== '}') j++; return rd.slice(i, j + 1).join('\n'); };
    const names = [['FLAGS', false], ['pairsArgs', false], ['modelMatchesPin', false], ['transcriptModels', false], ['probeRecordProblem', true]];
    for (const [n, multi] of names) { const t = stmt(n, multi); ck(`copy (14): ${n} is in the cue launcher byte-identical to launch-grader-rd.mjs`, !!t && cue.includes(t), t ? `${t.length} chars` : 'not found in rd'); }
    ck('copy (14): the check can fail (a one-character change in a copy no longer matches)', !cue.replace("'--permission-mode', 'dontAsk'", "'--permission-mode', 'dontask'").includes(stmt('FLAGS', false)));
    ck('copy: the provenance comment names rd\'s sha12 and its line numbers', new RegExp(RD_SHA12).test(cue) && /lines 52-53, 55, 58-59, 60-61, 88-108/.test(cue) || !/launch-grader-cue\.mjs$/.test(LAUNCHER), RD_SHA12);
}

// ================================================================= 4. mutation 12 and 13: seams, and every path under LAB
{
    const S = scenario();
    for (const seam of ['TURN_FAKE_CLAUDE', 'TURN_PROJECTS', 'CUE_LAB_DIR', 'CUE_GRADING_DIR', 'CUE_VERDICT_DIR', 'CUE_LOG_DIR']) {
        const e = { ...process.env, PATH: `${BIN};C:\\Windows\\System32` }; delete e.CUE_CAL_FAKE; e[seam] = S.lab;
        const r = spawnSync(process.execPath, [LAUNCHER, '--plan'], { encoding: 'utf8', env: e });
        ck(`seam (12): ${seam} set WITHOUT CUE_CAL_FAKE=1 refuses with exit 2`, r.status === 2 && /without CUE_CAL_FAKE=1/.test(out(r)), `exit ${r.status}`);
    }
    ck('seam (12): the same seams under CUE_CAL_FAKE=1 are honoured (the plan runs against the temp LAB)', S.run(['--plan']).status === 0);
    const outside = path.join(TMP, 'outside'); fs.mkdirSync(outside, { recursive: true });
    for (const seam of ['CUE_GRADING_DIR', 'CUE_VERDICT_DIR', 'CUE_LOG_DIR']) { const r = S.run(['--plan'], { [seam]: outside }); ck(`path (13): ${seam} resolving outside LAB refuses with exit 2`, r.status === 2 && /resolves outside LAB/.test(out(r)), `exit ${r.status}`); }
    const sib = path.join(path.dirname(S.lab), 'lab-evil'); fs.mkdirSync(sib, { recursive: true });
    ck('path (13): a SIBLING folder whose name merely starts with "lab" is outside LAB', S.run(['--plan'], { CUE_VERDICT_DIR: sib }).status === 2);
    const S2 = scenario(), d = S2.run(['cal-1.g1', ...PINARG, '--dry-run']);
    const paths = [...out(d).matchAll(/[A-Za-z]:[\\/][^\s"|)]+|\/\/[a-z]\/[^\s"|)]+/g)].map((m) => m[0].replace(/^\/\/([a-z])\//, '$1:/').replace(/\//g, '\\').toLowerCase()), labL = S2.lab.replace(/\//g, '\\').toLowerCase();
    ck('path (13): in a dry run every cwd, verdicts, pairs and rubric path lands under LAB, and none under router-default\\ or followup-turn\\', paths.length >= 4 && paths.every((p) => p.startsWith(labL)) && !/router-default|followup-turn/i.test(out(d)), `${paths.length} paths`);
}

// ================================================================= 5. mutation 7: --model-id
{
    const S = scenario();
    for (const [what, a] of [['absent', []], ['the alias "opus"', ['--model-id', 'opus']], ['another model', ['--model-id', 'claude-opus-5']], ['a suffix', ['--model-id', 'claude-opus-5-5[1m]']], ['an empty value', ['--model-id', '']]]) {
        const r = S.fakeRun(['cwdprobe-1', '--probe', ...a]);
        ck(`pin (7): a real probe with --model-id ${what} is refused (exit 2) and nothing is launched`, r.status === 2 && /REFUSED/.test(out(r)) && S.invoked() === 0, `exit ${r.status}`);
    }
    const g = scenario(); g.probes();                       // the probe gate is OPEN, so only the pin check can refuse
    for (const [what, a] of [['absent', []], ['the alias', ['--model-id', 'opus']], ['another id', ['--model-id', 'claude-sonnet-5-5']]]) { const r = g.fakeRun(['cal-1.g1', ...a]); ck(`pin (7): a real grader launch (probe gate open) with --model-id ${what} is refused and launches nothing`, r.status === 2 && /--model-id|pin/.test(out(r)) && g.invoked() === 2 && g.recs('launches.jsonl').length === 0); }
    ck('pin: a dry run without --model-id is allowed and says it is NOT pinned (a real launch would refuse)', /NOT pinned/.test(out(S.run(['cwdprobe-1', '--probe', '--dry-run']))));
}

// ================================================================= 6. the probes and the gate: mutations 1-6
{
    const S = scenario();
    const r0 = S.fakeRun(['cal-1.g1', ...PINARG]);
    ck('gate (1): a grader with NO probe record is refused, nothing launched', r0.status === 2 && /probe gate/.test(out(r0)) && /cwdprobe-1: no record/.test(out(r0)) && S.invoked() === 0);
    const r2first = S.fakeRun(['cwdprobe-2', '--probe', ...PINARG]);
    ck('gate: probe 2 before probe 1 is refused (exit 2), nothing launched', r2first.status === 2 && /starts only after cwdprobe-1/.test(out(r2first)) && S.invoked() === 0);
    const p1 = S.fakeRun(['cwdprobe-1', '--probe', ...PINARG]);
    ck('probe 1 (ok): exit 0, ONE stand-in invocation with --setting-sources, a record in grader-cwd.launches.jsonl', p1.status === 0 && S.invoked() === 1 && /ss/.test(fs.readFileSync(S.FLOG, 'utf8')) && S.recs('grader-cwd.launches.jsonl').length === 1 && !fs.existsSync(S.D.launches), out(p1).slice(-200));
    const rec1 = S.recs('grader-cwd.launches.jsonl')[0];
    ck('probe record (n2): carries THIS launcher\'s sha12, the slot, exit 0, slugJsonl 1, memory ABSENT, tools exactly one Read and one Write, models = the pin', rec1.launcher === LAUNCHER_SHA12 && rec1.slot === 'cwdprobe-1' && rec1.exit === 0 && rec1.slugJsonl === 1 && rec1.memory === 'ABSENT' && rec1.tools.Read === 1 && rec1.tools.Write === 1 && JSON.stringify(rec1.models) === '["claude-opus-5-5"]', JSON.stringify([rec1.launcher, LAUNCHER_SHA12]));
    const r1g = S.fakeRun(['cal-1.g1', ...PINARG]);
    ck('gate: with ONLY probe 1 recorded a grader is still refused (probe 2 has no record)', r1g.status === 2 && /cwdprobe-2: no record/.test(out(r1g)));
    S.fakeRun(['cwdprobe-2', '--probe', ...PINARG]);
    const gp = S.run(['cal-1.g1', ...PINARG, '--dry-run']);
    ck('gate: after both probes read clean the dry run reports "probe gate: OK" and there is NO alias slot (cwdprobe-3 is not a probe)', /probe gate: OK/.test(out(gp)) && S.fakeRun(['cwdprobe-3', '--probe', ...PINARG]).status === 2);

    // (2) probe exit != 0
    const A = scenario(); A.fakeRun(['cwdprobe-1', '--probe', ...PINARG], 'exit1');
    ck('gate (2): a probe with exit 1 is recorded as failed; probe 2 and every grader are refused', A.recs('grader-cwd.launches.jsonl')[0].exit === 1 && A.fakeRun(['cwdprobe-2', '--probe', ...PINARG]).status === 2 && A.fakeRun(['cal-1.g1', ...PINARG]).status === 2);
    // (3) a probe recorded by another launcher sha, including rd's
    for (const [what, sha12v] of [['another launcher version', '0123456789ab'], ["rd's launcher", RD_SHA12], ['no launcher field', undefined]]) {
        const B = scenario(); B.probes();
        const f = path.join(B.lab, 'grader-cwd.launches.jsonl'), rows = B.recs('grader-cwd.launches.jsonl').map((r) => { const c = { ...r }; if (sha12v === undefined) delete c.launcher; else c.launcher = sha12v; return c; });
        fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
        const r = B.fakeRun(['cal-1.g1', ...PINARG]); const before = B.invoked();
        ck(`gate (3): probes recorded by ${what} are refused ("written by another launcher version")`, r.status === 2 && /another launcher version/.test(out(r)) && B.invoked() === before);
    }
    // (4) memory LOADED in a probe transcript; (5) a transcript model != the pin; (6) probe tools
    for (const [num, what, mode, why] of [[4, 'memory LOADED (claude-mem context)', 'loadedmem', /memory LOADED/], [4, 'memory LOADED (project memory)', 'projmem', /memory LOADED/], [5, 'the CLI model is not the pin (claude-opus-5)', 'badmodel', /not the pin/], [5, 'the CLI model carries a suffix', 'suffix', /not the pin/], [5, 'a transcript message model is not the pin', 'msgmodel', /not the pin/], [5, 'a transcript with no model at all', 'nomodel', /not the pin/], [6, 'a probe that reads twice (tools Read x2)', 'probe-extra', /need exactly one Read and one Write/], [6, 'a probe that also calls Bash', 'probe-bash', /need exactly one Read and one Write/]]) {
        const C = scenario(); const p = C.fakeRun(['cwdprobe-1', '--probe', ...PINARG], mode);
        const r = C.fakeRun(['cwdprobe-2', '--probe', ...PINARG]);
        ck(`gate (${num}): a probe with ${what} fails (exit 1) and probe 2 is refused naming it`, p.status === 1 && r.status === 2 && why.test(out(r)), `probe exit ${p.status}, next exit ${r.status}`);
    }
    // the same on a GRADER transcript: exit 1, never a clean record
    for (const [num, what, mode, field] of [[4, 'memory LOADED', 'loadedmem', (rc) => rc.memory === 'LOADED'], [5, 'a message model that is not the pin', 'msgmodel', (rc) => rc.pinned === false], [5, 'a CLI model that is not the pin', 'badmodel', (rc) => rc.pinned === false], [0, 'a tool outside Read/Write/Edit (Bash)', 'bash', (rc) => rc.tools.Bash === 1], [0, 'a Read outside the three own files', 'outside', (rc) => rc.pathViolations === 1], [0, 'an incomplete verdicts file', 'incomplete', () => true]]) {
        const G = scenario(); G.probes();
        const r = G.fakeRun(['cal-1.g1', ...PINARG], mode);
        const rc = G.recs('launches.jsonl').at(-1);
        ck(`grader transcript (${num || '-'}): ${what} makes the launch exit 1 and the record shows it`, r.status === 1 && rc && field(rc), `exit ${r.status}`);
    }
}

// ================================================================= 7. mutation 9 and 9b: the hash states
{
    const S = scenario({ pairsFor: ['cal-1.g1', 'r1-high', 'r1-inapp.g1', 'h40d-low'] }); S.probes();
    const real = S.fakeRun(['r1-high', ...PINARG]);
    ck('hash (9b): a real tag (r1-high) with rubric.sha and spec.sha MISSING is refused, nothing launched', real.status === 2 && /rubric\.sha is missing/.test(out(real)) && S.recs('launches.jsonl').length === 0);
    ck('hash (9b): a real tag h40d-low with both missing is refused too', S.fakeRun(['h40d-low', ...PINARG]).status === 2);
    const cal = S.fakeRun(['cal-1.g1', ...PINARG]);
    ck('hash (9b): a cal-* tag with both hash files missing IS allowed and launches', cal.status === 0 && S.recs('launches.jsonl').length === 1, `exit ${cal.status}`);
    S.freeze();
    const okReal = S.fakeRun(['r1-high', ...PINARG]);
    ck('hash: with both hash files matching a real tag launches', okReal.status === 0, `exit ${okReal.status}`);
    fs.appendFileSync(S.D.rubric, '\nedited');
    const bad1 = S.fakeRun(['cal-1.g2', ...PINARG]);
    ck('hash (9): an edited rubric (sha != rubric.sha) refuses EVERY tag, a cal tag included', bad1.status === 2 && /not the frozen rubric\.sha/.test(out(bad1)));
    fs.copyFileSync(path.join(HERE, 'rubric.md'), S.D.rubric); fs.appendFileSync(S.D.spec, '\nedited');
    const bad2 = S.fakeRun(['r1-inapp.g1', ...PINARG]);
    ck('hash (9): an edited spec (sha != spec.sha) refuses every tag', bad2.status === 2 && /not the frozen spec\.sha/.test(out(bad2)));
    const T = scenario(); T.probes(); T.freeze();
    const n0 = T.invoked();
    fs.appendFileSync(T.D.specSha, 'x\n');
    ck('hash (9): a corrupted spec.sha file (not the file\'s hash) refuses', T.fakeRun(['cal-1.g1', ...PINARG]).status === 2 && T.invoked() === n0);
}

// ================================================================= 8. mutation 10: the cap of 26 across both logs
{
    const mk = (nProbe, nGrader) => { const S = scenario(); S.probes(); const p = S.recs('grader-cwd.launches.jsonl'); const extraP = nProbe - 2; S.addRecords('grader-cwd.launches.jsonl', Math.max(0, extraP), { slot: 'filler-probe' }); S.addRecords('launches.jsonl', nGrader, {}); return S; };
    const S25 = mk(2, 23);                                  // 2 probes + 23 graders = 25 records
    const a = S25.fakeRun(['cal-1.g1', ...PINARG]);
    ck('cap (10): with 25 records in the two logs the 26th session is ALLOWED', a.status === 0 && S25.recs('launches.jsonl').length === 24, `exit ${a.status}`);
    const S26 = mk(2, 24);                                  // 2 probes + 24 graders = 26 records
    const b = S26.fakeRun(['cal-1.g1', ...PINARG]); const inv = S26.invoked();
    ck('cap (10): with 26 records (2 probes + 24 graders) a grader is REFUSED as session 27, nothing launched', b.status === 2 && /cap is 26/.test(out(b)) && /session 27/.test(out(b)), out(b).slice(-120));
    const P = scenario(); P.fakeRun(['cwdprobe-1', '--probe', ...PINARG]); P.addRecords('launches.jsonl', 25);
    const c = P.fakeRun(['cwdprobe-2', '--probe', ...PINARG]);
    ck('cap (10): 1 probe + 25 graders = 26 records: a probe is REFUSED (the probes count against the cap)', c.status === 2 && /cap is 26/.test(out(c)), `exit ${c.status}`);
    const Q = scenario(); Q.addRecords('grader-cwd.launches.jsonl', 26, { slot: 'x' });
    ck('cap (10): the sum is taken across BOTH logs (26 probe records alone refuse a probe)', Q.fakeRun(['cwdprobe-1', '--probe', ...PINARG]).status === 2);
    const F = scenario(); F.probes(); F.fakeRun(['cal-1.g1', ...PINARG], 'exit1');
    ck('cap: a FAILED attempt is recorded (and so counts as a session): the log holds the failed grader after the probes', F.recs('launches.jsonl').length === 1 && F.recs('launches.jsonl')[0].exit === 1 && F.recs('grader-cwd.launches.jsonl').length === 2);
    const R = scenario(); R.probes(); const rl = R.fakeRun(['cal-1.g1', ...PINARG], 'ratelimit');
    ck('cap: a rate-limit refusal (no model, no tool) is still a recorded session, exit 1, and the message says to relaunch as attempt 2', rl.status === 1 && /RATE-LIMIT-REFUSAL/.test(out(rl)) && R.recs('launches.jsonl').length === 1);
}

// ================================================================= 9. mutation 11: existing verdicts, a non-pairs file in the pairs folder
{
    const S = scenario({ pairsFor: ['cal-1.g1', 'cal-2.g1'] }); S.probes();
    const ok = S.fakeRun(['cal-1.g1', ...PINARG]);
    ck('happy path: a grader launch with the gate OK exits 0, the verdicts file is valid on its pairs, the record binds pairs and verdicts and carries the launcher sha', ok.status === 0 && /verdicts file valid on its pairs \(3 keys\)/.test(out(ok)) && (() => { const rc = S.recs('launches.jsonl')[0]; return rc.launcher === LAUNCHER_SHA12 && rc.pinned === true && rc.memory === 'ABSENT' && rc.pathViolations === 0 && rc.pairsSha12 === lib.sha12(fs.readFileSync(path.join(S.D.pairs, lib.pairsName('cal-1.g1')))) && rc.verdictsSha12 === lib.sha12(fs.readFileSync(path.join(S.D.verdicts, lib.verdictsName('cal-1.g1')))) && rc.slot === 'cal-1.g1'; })(), out(ok).slice(-160));
    const again = S.fakeRun(['cal-1.g1', ...PINARG, '--attempt', '2']); const inv = S.invoked();       // a FRESH cwd (attempt 2): only the verdicts check can refuse
    ck('verdicts (11): a second launch of a tag whose verdicts file exists is REFUSED on the verdicts file (not on the cwd), the file untouched', again.status === 2 && /v-[0-9a-f]{8}.json already exists/.test(out(again)) && S.invoked() === inv);
    fs.writeFileSync(path.join(S.D.pairs, 'notes.txt'), 'x');
    const nonp = S.fakeRun(['cal-2.g1', ...PINARG]);
    ck('pairs folder (11): a non-pairs file in LAB\\pairs\\ refuses every launch, naming it', nonp.status === 2 && /not a pairs file: notes\.txt/.test(out(nonp)) && S.invoked() === inv);
    const plan = S.run(['--plan']);
    ck('pairs folder: --plan reports the folder state without launching or writing', /pairs folder: LAB\\pairs\\ holds a file that is not a pairs file/.test(out(plan)) && S.invoked() === inv);
    fs.rmSync(path.join(S.D.pairs, 'notes.txt'));
    fs.writeFileSync(path.join(S.D.pairs, lib.pairsName('cal-2.g1')), JSON.stringify({ items: [{ key: 'c01', question: 'q', cues: ['a'], answer: 'x', id: 'RE01' }] }));
    ck('pairs: a pairs file with an extra field (id) is refused by the launcher', S.fakeRun(['cal-2.g1', ...PINARG]).status === 2);
    const G2 = S.fakeRun(['cal-1.g2', ...PINARG]);
    ck('two graders: g2 of the same file uses the same pairs file and its OWN verdicts file', G2.status === 0 && fs.existsSync(path.join(S.D.verdicts, lib.verdictsName('cal-1.g2'))) && lib.verdictsName('cal-1.g1') !== lib.verdictsName('cal-1.g2'));
    ck('a missing pairs file is refused (export first)', S.fakeRun(['cal-3.g1', ...PINARG]).status === 2);
    ck('an unknown tag, an unknown option and a stray --probe are refused', S.run(['blind-1.g1', ...PINARG]).status === 2 && S.run(['cal-1.g1', '--frobnicate']).status === 2 && S.run(['cal-1.g1', '--probe']).status === 2);
}

// ================================================================= 10. dry run and plan write and launch nothing
{
    const S = scenario(); S.probes(); const before = S.snap(), n = S.invoked();
    const d = S.run(['cal-1.g1', ...PINARG, '--dry-run']), pl = S.run(['--plan']), pd = S.run(['cwdprobe-1', '--probe', '--dry-run']);
    ck('dry run and plan: exit 0, no stand-in invocation, nothing written (grading, verdicts, pairs, logs unchanged)', d.status === 0 && pl.status === 0 && pd.status === 0 && S.invoked() === n && S.snap() === before);
    ck('plan: lists the 22 tags with their grader counts (2 for in-app and cal/rev files, 1 for the bare arms) and "no model was called"', (out(pl).match(/^PLAN \S+ +graders-of-this-file=/gm) ?? []).length === 22 && /graders-of-this-file=1 /.test(out(pl)) && /PLAN no model was called/.test(out(pl)));
    ck('dry run: prints the argv with --setting-sources project,local, the pin, and the three permission rules (Read pairs, Read rubric, Edit verdicts)', /--setting-sources project,local/.test(out(d)) && /--model claude-opus-5-5/.test(out(d)) && /permission rules: Read\(.*\) \| Read\(.*rubric\.md\) \| Edit\(.*\)/.test(out(d)));
    ck('dry run: the prompt shown is a hash and a length, never the text; the cwd and the verdicts names are opaque (no tag in them)', /<prompt \d+ chars sha12 [0-9a-f]{12}>/.test(out(d)) && !/cal-1|cal_1/.test(out(d).replace(/^DRY RUN cal-1\.g1 attempt 1:/m, '')) );
}

// ================================================================= 11. the order of the work: rev needs a completed calibration; h40d needs r1's agreement
{
    const S = scenario({ pairsFor: ['rev-1.g1', 'r1-inapp.g1', 'h40d-inapp.g1'] }); S.probes(); S.freeze();
    const rev = S.fakeRun(['rev-1.g1', ...PINARG]);
    ck('order: a revision tag before all six first-calibration verdict files exist is refused', rev.status === 2 && /COMPLETED first calibration/.test(out(rev)));
    const h0 = S.fakeRun(['h40d-inapp.g1', ...PINARG]);
    ck('order: h40d before r1\'s two in-app verdict files exist is refused (the agreement check comes first)', h0.status === 2 && /r1's two in-app verdict files are not both present/.test(out(h0)));
    // r1 in-app verdicts with full agreement, then with low agreement
    const writeR1 = (agree) => { const pairs = lib.readJson(path.join(S.D.pairs, lib.pairsName('r1-inapp.g1'))); const good = (n) => ({ lines: Array.from({ length: n }, () => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2, D: 'na', label: 'good', note: 'x' }); const bad = (n) => ({ ...good(n), lines: Array.from({ length: n }, () => ({ R: 2, C: 0, G: 2 })), label: 'wrong' }); const v1 = {}, v2 = {}; pairs.items.forEach((it, i) => { v1[it.key] = good(it.cues.length); v2[it.key] = i < agree ? good(it.cues.length) : bad(it.cues.length); }); fs.writeFileSync(path.join(S.D.verdicts, lib.verdictsName('r1-inapp.g1')), JSON.stringify(v1)); fs.writeFileSync(path.join(S.D.verdicts, lib.verdictsName('r1-inapp.g2')), JSON.stringify(v2)); };
    S.mkPairs('r1-inapp.g1', 4); S.mkPairs('h40d-inapp.g1', 3);
    writeR1(2);                                              // 2 of 4 agree = 50%
    const h1 = S.fakeRun(['h40d-inapp.g1', ...PINARG]);
    ck('order: r1 in-app agreement below 75% (2 of 4) refuses h40d (it saves 4 sessions)', h1.status === 2 && /below 75%/.test(out(h1)));
    writeR1(3);                                              // 3 of 4 = 75%
    const h2 = S.fakeRun(['h40d-inapp.g1', ...PINARG]);
    ck('order: r1 in-app agreement of exactly 75% (3 of 4) lets h40d launch', h2.status === 0, `exit ${h2.status}: ${out(h2).slice(-100)}`);
    for (const g of ['g1', 'g2']) for (const n of [1, 2, 3]) fs.writeFileSync(path.join(S.D.verdicts, lib.verdictsName(`cal-${n}.${g}`)), '{}');
    ck('order: with all six cal verdict files present a revision tag launches', (S.mkPairs('rev-1.g1', 3), S.fakeRun(['rev-1.g1', ...PINARG]).status === 0));
}

fs.rmSync(TMP, { recursive: true, force: true });
const bad = results.filter((r) => !r.ok).length;
console.log(`${bad === 0 ? 'ALL OK' : 'FAILED'}: ${results.length - bad}/${results.length} checks ok`);
process.exit(bad === 0 ? 0 : 1);
