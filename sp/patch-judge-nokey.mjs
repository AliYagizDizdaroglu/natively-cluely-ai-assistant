// No-key judge route: keyPairs/mergeVerdicts + --export/--verdicts in interview60.judge.mjs, README lines.
// usage: node patch-judge-nokey.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const NL = '\n', CR = '\r';
const P = path.join(root, 'electron/test/golden/interview60.judge.mjs');
let s = fs.readFileSync(P, 'utf8');
if (s.includes(CR)) throw new Error('judge.mjs is CRLF; adjust the patch');
const once = (a, b, label) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(label + ': matched ' + n); s = s.replace(a, () => b); console.log('ok ' + label); };

// 1. Header usage.
const usage = ' *   node --env-file=.env electron/test/golden/interview60.judge.mjs <run-dir> [--effort high] [--concurrency 2] [--force]';
once(usage, [usage, ' *',
  ' * No key: --export writes <run>/interview60.judge.pairs.json (the pairs plus this rubric)',
  ' * for an Opus subagent in Claude Code to grade into <run>/interview60.judge.verdicts.json,',
  ' * then --verdicts <that file> writes the same judge file the gate reads:',
  ' *   node electron/test/golden/interview60.judge.mjs <run-dir> --export',
  ' *   node electron/test/golden/interview60.judge.mjs <run-dir> --verdicts <run>/interview60.judge.verdicts.json'].join(NL), 'header usage');

// 2. Helpers before the rubric.
const helpers = [
  "const SCORES = ['correctness', 'on_topic', 'delivery'];",
  "",
  "/** Stable keys for the judge file: an item dispatched twice keeps both verdicts, under W01 and W01#2. */",
  "export function keyPairs(pairs) {",
  "    const seen = {};",
  "    return pairs.map((p) => { seen[p.id] = (seen[p.id] ?? 0) + 1; return { key: seen[p.id] > 1 ? `${p.id}#${seen[p.id]}` : p.id, pair: p }; });",
  "}",
  "",
  "const baseOf = (pair) => ({ kind: pair.kind, question: pair.question, heard: pair.heard, source: pair.source, dispatchedAt: pair.dispatchedAt, answer: pair.answer });",
  "const undelivered = (pair) => ({ ...baseOf(pair), correctness: 0, on_topic: 0, delivery: 0, verdict: 'wrong', reason: 'no answer was delivered' });",
  "",
  "/**",
  " * The no-key route: verdicts graded outside this script (an Opus subagent in",
  " * Claude Code reading the --export file, same rubric) merged into the judge",
  " * file the gate reads. A missing or out-of-range verdict is an error, so a",
  " * half-graded file cannot pass the gate.",
  " */",
  "export function mergeVerdicts(pairs, verdicts, model = JUDGE_MODEL) {",
  "    const items = {};",
  "    for (const { key, pair } of keyPairs(pairs)) {",
  "        if (!pair.answer) { items[key] = undelivered(pair); continue; }",
  "        const v = verdicts[key];",
  "        if (!v) { items[key] = { ...baseOf(pair), verdict: 'error', reason: 'no verdict' }; continue; }",
  "        const bad = SCORES.find((k) => ![0, 1, 2].includes(v[k]));",
  "        if (bad) { items[key] = { ...baseOf(pair), verdict: 'error', reason: `verdict ${bad}=${v[bad]}` }; continue; }",
  "        items[key] = { ...baseOf(pair), correctness: v.correctness, on_topic: v.on_topic, delivery: v.delivery, verdict: verdictOf(v), reason: String(v.reason ?? '') };",
  "    }",
  "    return { model, effort: null, items, usage: { input: 0, output: 0 } };",
  "}",
  "",
  ""].join(NL);
once('const RUBRIC = `You grade answers', helpers + 'const RUBRIC = `You grade answers', 'helpers');

// 3. Flags and the key check.
once("    if (!dir) { console.error('usage: interview60.judge.mjs <run-dir> [--effort high] [--concurrency 2] [--force]'); process.exit(2); }",
     "    if (!dir) { console.error('usage: interview60.judge.mjs <run-dir> [--effort high] [--concurrency 2] [--force] | --export | --verdicts <file> [--model <name>]'); process.exit(2); }", 'usage line');
once(["    const keyName = ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'].find((n) => process.env[n]);",
      "    if (!keyName) { console.error('no Claude key: set CLAUDE_API_KEY (or ANTHROPIC_API_KEY) in .env and run with --env-file=.env'); process.exit(2); }"].join(NL),
     ["    const exportOnly = args.includes('--export');",
      "    const verdictsPath = opt('verdicts', null);",
      "    const keyName = ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'].find((n) => process.env[n]);",
      "    if (!exportOnly && !verdictsPath && !keyName) { console.error('no Claude key: set CLAUDE_API_KEY (or ANTHROPIC_API_KEY) in .env and run with --env-file=.env, or grade without one: --export, then --verdicts <file>'); process.exit(2); }"].join(NL), 'key check');

// 4. The two no-key branches, before the API route touches the SDK.
const outLine = "    const out = path.join(dir, 'interview60.judge.json');";
once(outLine, [outLine,
  "    if (exportOnly) {",
  "        const pairsOut = path.join(dir, 'interview60.judge.pairs.json');",
  "        const toGrade = keyPairs(pairs).filter(({ pair }) => pair.answer).map(({ key, pair }) => ({ key, ...pair }));",
  "        fs.writeFileSync(pairsOut, JSON.stringify({ model: JUDGE_MODEL, rubric: RUBRIC, items: toGrade }, null, 1));",
  "        console.log(`EXPORT  ${path.basename(dir)}  ${toGrade.length} delivered answers to grade; ${pairs.length - toGrade.length} undelivered will be scored wrong at merge`);",
  "        console.log(`written ${pairsOut}`);",
  "        console.log(`next: grade every item with the rubric in that file into ${path.join(dir, 'interview60.judge.verdicts.json')} as {<key>: {correctness, on_topic, delivery, reason}} with scores 0-2, then rerun with --verdicts <that file>`);",
  "        return;",
  "    }",
  "    if (verdictsPath) {",
  "        const judged = mergeVerdicts(pairs, JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), opt('model', JUDGE_MODEL));",
  "        fs.writeFileSync(out, JSON.stringify(judged, null, 1));",
  "        console.log(`JUDGE  ${path.basename(dir)}  ${pairs.length} dispatched answers merged from ${verdictsPath}  model=${judged.model}`);",
  "        printSummary(judged, out);",
  "        return;",
  "    }"].join(NL), 'no-key branches');

// 5. The API worker reuses the helpers.
once(["    // Same item dispatched twice (a double) keeps both verdicts under suffixed keys.",
      "    const seen = {};",
      "    const keyed = pairs.map((p) => { seen[p.id] = (seen[p.id] ?? 0) + 1; return { key: seen[p.id] > 1 ? `${p.id}#${seen[p.id]}` : p.id, pair: p }; });"].join(NL),
     "    const keyed = keyPairs(pairs);", 'worker keys');
once("            const base = { kind: pair.kind, question: pair.question, heard: pair.heard, source: pair.source, dispatchedAt: pair.dispatchedAt, answer: pair.answer };",
     "            const base = baseOf(pair);", 'worker base');
once("                judged.items[key] = { ...base, correctness: 0, on_topic: 0, delivery: 0, verdict: 'wrong', reason: 'no answer was delivered' };",
     "                judged.items[key] = undelivered(pair);", 'worker undelivered');

// 6. Move the summary tail of main() into printSummary(judged, out), shared by both routes.
const start = s.indexOf('    const s = summarizeVerdicts(judged);');
const endAnchor = NL + '}' + NL + NL + 'if (process.argv[1]';
const end = s.indexOf(endAnchor, start);
if (start < 0 || end < 0) throw new Error('summary tail anchors');
const body = s.slice(start, end);
s = s.slice(0, start) + '    printSummary(judged, out);' + s.slice(end);
const mainAnchor = 'async function main() {';
if (s.split(mainAnchor).length !== 2) throw new Error('main anchor');
s = s.replace(mainAnchor, () => 'function printSummary(judged, out) {' + NL + body + NL + '}' + NL + NL + mainAnchor);
console.log('ok printSummary extracted (' + body.split(NL).length + ' lines)');
once('    console.log(`usage: ${judged.usage.input} in /', '    if (judged.usage.input) console.log(`usage: ${judged.usage.input} in /', 'usage line conditional');
fs.writeFileSync(P, s);

// README.
const R = path.join(root, 'electron/test/golden/README.md');
let r = fs.readFileSync(R, 'utf8');
const rnl = r.includes(CR) ? CR + NL : NL;
const ronce = (a, b, label) => { const n = r.split(a).length - 1; if (n !== 1) throw new Error(label + ': matched ' + n); r = r.replace(a, () => b); console.log('ok ' + label); };
ronce('Needs `ANTHROPIC_API_KEY` (or `CLAUDE_API_KEY`) in `.env`; resumable; run AFTER the hour, never during it |',
      'Needs `ANTHROPIC_API_KEY` (or `CLAUDE_API_KEY`) in `.env` — or no key at all: `--export` writes the pairs and the rubric to `interview60.judge.pairs.json`, an Opus subagent in Claude Code grades them into `interview60.judge.verdicts.json`, and `--verdicts <file>` writes the same judge file; resumable; run AFTER the hour, never during it |', 'readme table');
const cmd = 'node --env-file=.env electron/test/golden/interview60.judge.mjs electron/test/golden/interview60.runs/<run>   # AFTER the hour: grades the delivered answers (Claude Opus 5, ~$1-4)';
ronce(cmd, cmd + rnl + 'node electron/test/golden/interview60.judge.mjs electron/test/golden/interview60.runs/<run> --export   # no API key: pairs + rubric for an Opus subagent to grade, then --verdicts electron/test/golden/interview60.runs/<run>/interview60.judge.verdicts.json', 'readme command');
fs.writeFileSync(R, r);
