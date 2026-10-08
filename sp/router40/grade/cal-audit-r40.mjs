// Known-answer cases of P7 (audit-r40.mjs), A3.6: the two REAL sessions the registration names (live40's g1, which used Bash once: NOT CLEAN; a clean FR grader session: CLEAN) and
// synthetic transcripts that each flip one check. No model call. Prints flags/booleans only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { calRun } from '../cal-util.mjs';
import { R40, SP, FR } from '../r40-common.mjs';
import { auditSession, auditTranscript, allowedFor } from './audit-r40.mjs';

const C = calRun('audit-r40');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-cal-p7-'));
const SCR = 'C:/Users/sotka/AppData/Local/Temp/claude/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/scratchpad';
const flagsOf = (v) => v.flags.map((f) => f.split(':')[0]).join(' | ');

// ---- the real known answers ----
let v = auditSession('blind-1.g1', { kind: 'session', v: '9856e006-bc09-4ac6-b635-66dd642ddfff' }, { blindDir: `${SCR}/live40/grade/blind` });
C.check('P7-1', "live40's g1 (session 9856e006, Bash x1) audited against its own three paths", 'NOT CLEAN, the one flag = a tool outside {Read,Write,Edit}: Bash; tools Read2 Write1 Bash1', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]; tools ${JSON.stringify(v.tools)}`, !v.clean && v.flags.length === 1 && /^tool outside \{Read,Write,Edit\}: Bash$/.test(v.flags[0]) && v.tools.Bash === 1 && v.tools.Read === 2 && v.tools.Write === 1);
v = auditSession('blind-1.g2', { kind: 'session', v: '11b1c4a8-0a51-4ab8-b76b-14801b8962c1' }, { blindDir: `${SCR}/live40/grade/blind` });
C.check('P7-1b', "live40's g2 (session 11b1c4a8, Bash x1) likewise (its transcript also holds one call Claude Code denied)", 'NOT CLEAN, flags: Bash + 1 denied call', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]; tools ${JSON.stringify(v.tools)}`, !v.clean && v.flags.some((x) => /: Bash$/.test(x)) && v.flags.some((x) => /denied/.test(x)) && v.tools.Bash === 1);
v = auditSession('blind-1.g1', { kind: 'session', v: 'fde64205-5ecf-4ccf-ae04-7ec369464ddf' }, { blindDir: `${SCR}/followup-turn/pilot-blind` });
C.check('P7-2', 'an FR grader session its audit lists clean (the pilot-a2 session fde64205, FR/pilot-a2.audit.out.txt: Read x3, Write x1, clean; audit-graders.out.txt lists none clean)', 'CLEAN; memory ABSENT; model PINNED', `${v.clean ? 'CLEAN' : `NOT CLEAN [${flagsOf(v)}]`}; memory ${v.memory}; model ${v.pinned ? 'PINNED' : 'NOT PINNED'}; tools ${JSON.stringify(v.tools)}`, v.clean && v.memory === 'ABSENT' && v.pinned);
// the same two sessions through FR's OWN audit (independent implementation): the verdicts agree
let fr = spawnSync(process.execPath, [`${FR}/audit-graders.mjs`, '--blind-dir', `${SCR}/followup-turn/pilot-blind`, 'blind-1.g1=session:fde64205-5ecf-4ccf-ae04-7ec369464ddf'], { encoding: 'utf8' });
C.check('P7-2b', "cross-check: FR's own audit-graders.mjs on the clean session", 'exit 0 (all clean), as P7', `exit ${fr.status}`, fr.status === 0);
fr = spawnSync(process.execPath, [`${FR}/audit-graders.mjs`, '--blind-dir', `${SCR}/live40/grade/blind`, '--no-dispatch-check', 'blind-1.g1=session:9856e006-bc09-4ac6-b635-66dd642ddfff'], { encoding: 'utf8' });
C.check('P7-2c', "cross-check: FR's own audit-graders.mjs on live40's g1", 'exit 1 (FLAGGED), as P7', `exit ${fr.status}`, fr.status === 1);

// ---- synthetic transcripts: one flipped check each, paired with a clean control ----
const BLIND = path.join(TMP, 'blind'), CLS = path.join(TMP, 'classify');
const O = { blindDir: BLIND, classifyDir: CLS, projects: TMP };
const pairs = path.join(BLIND, 'pairs.blind-2.json'), verd = path.join(BLIND, 'verdicts.blind-2.g2.json');
const MAINRUB = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.grader-prompt.md';
const TURNS = `${R40}/turns-for-classifiers.json`, CAL = `${SP}/l38base/blind/cal-blind.json`, OUT3 = path.join(CLS, 'verdicts.c3.json');
const jl = (o) => JSON.stringify(o);
const tu = (name, input, model = 'claude-opus-5-5') => jl({ type: 'assistant', message: { model, content: [{ type: 'tool_use', id: 'x', name, input }] } });
const mk = (name, lines) => { const f = path.join(TMP, `${name}.jsonl`); fs.writeFileSync(f, `${lines.join('\n')}\n`); return f; };
const U = jl({ type: 'user', message: { role: 'user', content: 'dispatch text' } });
const asg = (name, lines, tag = 'blind-2.g2') => auditSession(tag, { kind: 'file', v: f(name, lines) }, O);
const f = (name, lines) => mk(name, lines);
const cleanLines = [U, tu('Read', { file_path: MAINRUB }), tu('Read', { file_path: pairs }), tu('Write', { file_path: verd }), tu('Read', { file_path: verd })];
v = asg('clean', cleanLines);
C.check('P7-3', 'synthetic clean grader: Read rubric, Read own pairs, Write own verdicts, re-Read it', 'CLEAN, memory ABSENT, PINNED', `${v.clean ? 'CLEAN' : `NOT CLEAN [${flagsOf(v)}]`}; ${v.memory}; ${v.pinned ? 'PINNED' : 'NOT PINNED'}`, v.clean && v.memory === 'ABSENT' && v.pinned);
v = asg('readkey', [...cleanLines, tu('Read', { file_path: path.join(TMP, 'keyhold', 'key.json') })]);
C.check('P7-4', 'a grader that Reads keyhold/key.json', 'NOT CLEAN: Read outside the allowed files + keyhold mention', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]`, !v.clean && v.flags.some((x) => /^Read outside/.test(x)) && v.flags.some((x) => /keyhold/.test(x)));
v = asg('grep', [...cleanLines, tu('Grep', { pattern: 'x' })]);
C.check('P7-5', 'a grader that calls Grep', 'NOT CLEAN: tool outside {Read,Write,Edit}', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]`, !v.clean && /Grep/.test(v.flags.join()));
v = asg('mcp', [...cleanLines, tu('mcp__x__y', {})]);
C.check('P7-6', 'a grader that calls an MCP tool', 'NOT CLEAN', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}`, !v.clean);
v = asg('writeout', [...cleanLines, tu('Write', { file_path: path.join(BLIND, 'verdicts.blind-2.g1.json') })]);
C.check('P7-7', "a grader that Writes another grader's verdicts file", 'NOT CLEAN: Write outside the own output file', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]`, !v.clean && v.flags.some((x) => /^Write outside/.test(x)));
v = asg('mention', [...cleanLines, jl({ type: 'user', message: { content: [{ type: 'tool_result', content: 'see C:/x/keyhold/key.json' }] } })]);
C.check('P7-8', 'a transcript that only MENTIONS key.json in a tool result (no call)', 'NOT CLEAN: mention flag', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]`, !v.clean && v.flags.some((x) => /keyhold/.test(x)));
v = asg('denied', [...cleanLines, jl({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: 'Permission denied for this call' }] } })]);
C.check('P7-9', 'a call denied by Claude Code', 'NOT CLEAN', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]`, !v.clean && v.flags.some((x) => /denied/.test(x)));
v = asg('memory', [U, jl({ type: 'user', message: { content: 'Memory Index of the project' } }), ...cleanLines.slice(1)]);
C.check('P7-10', 'a transcript carrying the project-memory marker "Memory Index"', 'memory LOADED', v.memory, v.memory === 'LOADED');
v = asg('othermodel', [U, tu('Read', { file_path: MAINRUB }, 'claude-sonnet-5-5'), ...cleanLines.slice(2)]);
C.check('P7-11', 'an assistant record whose model is not claude-opus-5-5', 'NOT PINNED', `${v.pinned ? 'PINNED' : 'NOT PINNED'} [${v.models}]`, !v.pinned);
// classifiers (A1 m6, A3.6: audited against their own three paths)
const cl = (name, lines) => asg(name, lines, 'c3');
v = cl('c3ok', [U, tu('Read', { file_path: TURNS }), tu('Read', { file_path: CAL }), tu('Write', { file_path: OUT3 })]);
C.check('P7-12', 'a clean c3 classifier: Read TURNS, Read CAL, Write its own output', 'CLEAN, ABSENT, PINNED', `${v.clean ? 'CLEAN' : `NOT CLEAN [${flagsOf(v)}]`}; ${v.memory}; ${v.pinned ? 'PINNED' : 'NOT PINNED'}`, v.clean && v.memory === 'ABSENT' && v.pinned);
v = cl('c3set', [U, tu('Read', { file_path: TURNS }), tu('Read', { file_path: CAL }), tu('Read', { file_path: `${R40}/SET-draft.md` }), tu('Write', { file_path: OUT3 })]);
C.check('P7-13', 'a c3 classifier that also Reads SET-draft.md', 'NOT CLEAN: Read outside the allowed files', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; flags [${flagsOf(v)}]`, !v.clean && v.flags.some((x) => /^Read outside/.test(x)));
v = cl('c3key', [U, tu('Read', { file_path: TURNS }), tu('Read', { file_path: `${R40}/keyhold/key.json` }), tu('Write', { file_path: OUT3 })]);
C.check('P7-14', 'a c3 classifier that Reads R40/keyhold/key.json', 'NOT CLEAN (path + mention)', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}; ${v.flags.length} flags`, !v.clean && v.flags.length >= 2);
v = cl('c3w', [U, tu('Read', { file_path: TURNS }), tu('Write', { file_path: path.join(CLS, 'verdicts.c4.json') })]);
C.check('P7-15', "a c3 classifier writing the c4 output file", 'NOT CLEAN: Write outside the own output file', `${v.clean ? 'CLEAN' : 'NOT CLEAN'}`, !v.clean && v.flags.some((x) => /^Write outside/.test(x)));
// the allowed sets themselves
const al = allowedFor('blind-3.g1', { blindDir: BLIND });
C.check('P7-16', 'allowed files of blind-3.g1', 'Read: own pairs, rubric, own verdicts; Write: own verdicts only', `read ${al.read.map((p) => path.basename(p)).join(', ')}; write ${al.write.map((p) => path.basename(p)).join(', ')}`, al.read.length === 3 && al.write.length === 1 && /pairs\.blind-3\.json$/.test(al.read[0]) && /verdicts\.blind-3\.g1\.json$/.test(al.write[0]));
// the CLI exit codes
const cli = spawnSync(process.execPath, [`${R40}/grade/audit-r40.mjs`, '--blind-dir', BLIND, `blind-2.g2=file:${f('clean2', cleanLines).replace(/\\/g, '/')}`], { encoding: 'utf8' });
const cli2 = spawnSync(process.execPath, [`${R40}/grade/audit-r40.mjs`, '--blind-dir', BLIND, `blind-2.g2=file:${f('grep2', [...cleanLines, tu('Grep', { pattern: 'x' })]).replace(/\\/g, '/')}`], { encoding: 'utf8' });
C.check('P7-17', 'the CLI exit code: a clean session / a flagged one', 'exit 0 / exit 1', `exit ${cli.status} / exit ${cli2.status}`, cli.status === 0 && cli2.status === 1);
// A8.4 step 4 (I2): --record appends {tag, session, clean, memory, pinned}, one line per audited session
const REC = path.join(TMP, 'audits.jsonl');
const recRun = (name, lines) => spawnSync(process.execPath, [`${R40}/grade/audit-r40.mjs`, '--blind-dir', BLIND, '--record', REC, `blind-2.g2=file:${f(name, lines).replace(/\\/g, '/')}`], { encoding: 'utf8' });
const r1 = recRun('rec-clean', cleanLines), r2 = recRun('rec-grep', [...cleanLines, tu('Grep', { pattern: 'x' })]), r3 = recRun('rec-mem', [U, jl({ type: 'user', message: { content: 'Memory Index of the project' } }), ...cleanLines.slice(1)]);
const recs = (fs.existsSync(REC) ? fs.readFileSync(REC, 'utf8') : '').split('\n').filter(Boolean).map((l) => JSON.parse(l));
C.check('P7-18', '--record after a clean, a Grep-flagged and a memory-LOADED session (exits 0, 1, 1)', 'three lines: clean/ABSENT/pinned; clean false; memory LOADED; session = the transcript uuid; keys tag,session,clean,memory,pinned', `exits ${r1.status},${r2.status},${r3.status}; ${recs.length} lines; ${recs.map((r) => `${r.clean}/${r.memory}/${r.pinned}`).join(' ')}; session ${recs[0]?.session}; keys ${Object.keys(recs[0] ?? {}).join(',')}`,
    r1.status === 0 && r2.status === 1 && r3.status === 1 && recs.length === 3 && recs[0].clean === true && recs[0].memory === 'ABSENT' && recs[0].pinned === true && recs[1].clean === false && recs[2].memory === 'LOADED' && recs[0].session === 'rec-clean' && recs[0].tag === 'blind-2.g2' && Object.keys(recs[0]).join(',') === 'tag,session,clean,memory,pinned');
const r4 = spawnSync(process.execPath, [`${R40}/grade/audit-r40.mjs`, '--blind-dir', BLIND, '--record', REC, 'blind-2.g2=session:no-such-session', '--projects', TMP], { encoding: 'utf8' });
const lastRec = (fs.existsSync(REC) ? fs.readFileSync(REC, 'utf8') : '').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).at(-1) ?? {};
C.check('P7-19', 'a session whose transcript is not found, with --record', 'exit 1; recorded as clean false, memory UNKNOWN', `exit ${r4.status}; clean ${lastRec.clean}, memory ${lastRec.memory}`, r4.status === 1 && lastRec.clean === false && lastRec.memory === 'UNKNOWN');
fs.rmSync(TMP, { recursive: true, force: true });
C.finish();
