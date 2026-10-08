// cal-fake-claude.mjs: the stand-in for the claude binary used by cal-launch-grader-cue.mjs ONLY (TURN_FAKE_CLAUDE, under CUE_CAL_FAKE=1). No model is called.
// It logs every invocation, writes the files a grader or probe would write and a transcript under TURN_PROJECTS, and prints the CLI's JSON result. Its behaviour is chosen by CUE_FAKE_MODE.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const { projectSlug } = await import(pathToFileURL(`${process.env.CUE_F_R}/launch-grader.mjs`).href);
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1], model = args[args.indexOf('--model') + 1];
fs.appendFileSync(process.env.CUE_FAKE_LOG, `invoked ${model} ${args.includes('--setting-sources') ? 'ss' : 'no-ss'}\n`);
const mode = process.env.CUE_FAKE_MODE || 'ok';
const session = randomUUID();
if (mode === 'ratelimit') { console.log(JSON.stringify({ session_id: session, is_error: true, result: 'rate_limit' })); process.exit(0); }
const PIN = 'claude-opus-5-5';
const alias = model === 'opus';
const cliModel = mode === 'badmodel' ? 'claude-opus-5' : mode === 'suffix' ? `${model}[1m]` : alias ? PIN : model;
const msgModel = mode === 'msgmodel' ? 'claude-opus-5' : cliModel;
const lines = [JSON.stringify({ type: 'user', message: { content: prompt } })];
if (mode === 'loadedmem') lines.push(JSON.stringify({ type: 'user', message: { content: '<claude-mem-context> x </claude-mem-context>' } }));
if (mode === 'projmem') lines.push(JSON.stringify({ type: 'user', message: { content: 'Memory Index of the project' } }));
const use = (name, input) => lines.push(JSON.stringify({ type: 'assistant', message: { ...(mode === 'nomodel' ? {} : { model: msgModel }), content: [{ type: 'tool_use', name, input }] } }));
if (prompt.startsWith('Read the file ')) {
    const m = /^Read the file (.+?) and then write the number of lines it has, as a single number, into the file (.+?)\. Use only/.exec(prompt);
    use('Read', { file_path: m[1] }); use('Write', { file_path: m[2], content: '3' });
    fs.mkdirSync(path.dirname(m[2]), { recursive: true }); fs.writeFileSync(m[2], '3');
    if (mode === 'probe-extra') use('Read', { file_path: m[1] });
    if (mode === 'probe-bash') use('Bash', { command: 'echo' });
} else {
    const rub = /read this file IN FULL: (.+)/.exec(prompt)[1].trim(), pairs = /^Pairs file \(read it\): (.+)$/m.exec(prompt)[1].trim(), verd = /^Verdicts file \(write it\): (.+)$/m.exec(prompt)[1].trim();
    use('Read', { file_path: rub }); use('Read', { file_path: pairs });
    const items = JSON.parse(fs.readFileSync(pairs, 'utf8')).items;
    const v = Object.fromEntries(items.map((i) => [i.key, { lines: i.cues.map(() => ({ R: 2, C: 2, G: 2 })), V: 2, K: 2, D: 'na', label: 'good', note: 'ok' }]));
    if (mode === 'incomplete') delete v[items[items.length - 1].key];
    fs.mkdirSync(path.dirname(verd), { recursive: true });
    fs.writeFileSync(verd, JSON.stringify(v)); use('Write', { file_path: verd, content: '{}' }); use('Read', { file_path: verd });
    if (mode === 'bash') use('Bash', { command: 'echo' });
    if (mode === 'outside') use('Read', { file_path: 'C:\\Windows\\win.ini' });
}
const dir = path.join(process.env.TURN_PROJECTS, projectSlug(process.cwd()));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${session}.jsonl`), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ session_id: session, modelUsage: { [cliModel]: {} }, is_error: false, result: 'DONE' }));
process.exit(mode === 'exit1' ? 1 : 0);
