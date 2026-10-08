// The calibration's stand-in for the `claude` binary (TURN_FAKE_CLAUDE points here; followup-turn's launcher runs it with node). No model is called.
// It records the argv it was given (model, tools, --add-dir count; never the prompt) into <cwd>/argv.json, writes a plausible transcript under TURN_PROJECTS,
// writes a valid verdicts / classifier output file for the paths named in the prompt, and prints the result JSON the launcher parses.
// FAKE_MODE=ok (default) | noverdicts (writes no output file) | bash (the transcript also holds one Bash call)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1];
const arg = (k) => args[args.indexOf(k) + 1];
fs.writeFileSync('argv.json', JSON.stringify({ model: arg('--model'), tools: arg('--tools'), addDirs: args.filter((a) => a === '--add-dir').length, dontAsk: arg('--permission-mode') === 'dontAsk', strictMcp: args.includes('--strict-mcp-config'), allowedTools: (() => { const i = args.indexOf('--allowed-tools'); const t = args.slice(i + 1); const j = t.findIndex((a) => a.startsWith('--')); return j < 0 ? t : t.slice(0, j); })(), settingSources: args.flatMap((a, i) => (a === '--setting-sources' ? [args[i + 1]] : [])) }));
const mode = process.env.FAKE_MODE ?? 'ok';
const win = (re) => re.exec(prompt)?.[1]?.trim();
const calls = [];
const pairs = win(/^<PAIRS_FILE> = (.+)$/m), verd = win(/^<VERDICTS_FILE> = (.+)$/m);
if (pairs && verd) {
    calls.push(['Read', pairs], ['Write', verd]);
    if (mode !== 'noverdicts') { const items = JSON.parse(fs.readFileSync(pairs, 'utf8')).items; fs.writeFileSync(verd, JSON.stringify(Object.fromEntries(items.map((i) => [i.key, { correctness: 2, on_topic: 2, delivery: 2 }])))); }
} else {
    const out = /Write it to (.+?) and also return/.exec(prompt)?.[1];
    const turns = /INPUT 1: (.+?)\. It lists/.exec(prompt)?.[1], cal = /INPUT 2: (.+?)\. It lists/.exec(prompt)?.[1];
    calls.push(['Read', turns], ['Read', cal], ['Write', out]);
    if (mode !== 'noverdicts') {
        const T = JSON.parse(fs.readFileSync(turns, 'utf8')).turns.map((t) => t.id), K = JSON.parse(fs.readFileSync(cal, 'utf8')).map((x) => x.key);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, JSON.stringify(Object.fromEntries([...T, ...K].map((k) => [k, { route: 'HARD', reason: 'calibration stand-in' }]))));
    }
}
if (mode === 'bash') calls.push(['Bash', 'echo']);
const session = `00000000-0000-4000-8000-${createHash('sha256').update(process.cwd()).digest('hex').slice(0, 12)}`; // unique per attempt cwd, as real session ids are
const FR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const { projectSlug } = await import(pathToFileURL(`${FR}/launch-grader.mjs`).href);
const dir = path.join(process.env.TURN_PROJECTS, projectSlug(process.cwd()));
fs.mkdirSync(dir, { recursive: true });
const rec = (o) => JSON.stringify(o);
const lines = [rec({ type: 'user', message: { role: 'user', content: prompt } })];
calls.forEach(([name, p], i) => { lines.push(rec({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id: `t${i}`, name, input: name === 'Bash' ? { command: p } : { file_path: p } }] } })); });
lines.push(rec({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'text', text: 'DONE' }] } }));
fs.writeFileSync(path.join(dir, `${session}.jsonl`), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ session_id: session, modelUsage: { 'claude-opus-5-5': {} }, is_error: false, result: 'DONE' }));
