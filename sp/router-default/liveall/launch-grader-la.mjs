// launch-grader-la.mjs: the grader launcher of the Live-all sample. A THIN DERIVATIVE of router-default\grade\launch-grader-rd.mjs, which it IMPORTS (never edits) for every guard:
// the pin (claude-opus-5-5 exactly), the argv (-p ... --setting-sources project,local, tools Read,Write,Edit, dontAsk, strict MCP, no extra directory flag), the dispatch text (the SAME
// frozen h40d text, only the pairs path / verdicts path / tag substituted), the probe gate (cwdprobe-1, -2 clean and pinned, -3 read, each written by launch-grader-rd.mjs itself and re-read:
// memory ABSENT, exactly one Read and one Write, models = the pin), the 2-at-once slot folder (shared with the rd launcher: the same grading\.slots), the fresh-cwd rule.
// What changes: the run-folder name check is replaced by a check that the packet is liveall\blind\pairs.la-1.json and equals the sha256 in keyhold\build-record-liveall.json;
// verdicts, cwds and launch records live under liveall\grade\; tags are la-1.g1 / la-1.g2.
// IT CALLS THE CLAUDE CLI when launched for real; --plan and --dry-run call nothing.
//   node launch-grader-la.mjs --plan
//   node launch-grader-la.mjs la-1.g1|la-1.g2 --model-id claude-opus-5-5 [--attempt k] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default';
const R = await import(pathToFileURL(`${RD}/grade/launch-grader-rd.mjs`).href);   // refuses itself when a test seam is set without RD_CAL_FAKE
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const L = await import(pathToFileURL(`${F_R}/launch-grader.mjs`).href);
const A = await import(pathToFileURL(`${F_R}/audit-graders.mjs`).href);
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

const GRADE = path.join(HERE, 'grade');
const GRADING = path.join(GRADE, 'grading'), VERDICTS = path.join(GRADE, 'verdicts');
const PACKET = path.join(HERE, 'blind', 'pairs.la-1.json');
const RECORD = `${RD}/keyhold/build-record-liveall.json`;
const PROBE_FILE = `${RD}/grade/grader-cwd.launches.jsonl`;        // the probes the rd launcher recorded
const LAUNCHES = path.join(GRADE, 'launches.jsonl');
export const LA_SHA12 = sha12(fs.readFileSync(SELF));
const TAG_RX = /^la-1\.g([12])$/;
const GATED_TOOLS = ['Read', 'Write', 'Edit'];
const verdictsPathOf = (tag) => path.join(VERDICTS, `verdicts.${tag}.json`);

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const refuse = (why) => { console.log(`launch-grader-la: REFUSED: ${why}`); process.exit(2); };
const known = new Set(['--attempt', '--dry-run', '--model-id', '--plan']), valued = new Set(['--attempt', '--model-id']);
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--') && !known.has(argv[i])) refuse(`unknown option ${argv[i]}`); if (valued.has(argv[i]) && (argv[i + 1] == null || argv[i + 1].startsWith('--'))) refuse(`${argv[i]} needs a value`); }
const dry = argv.includes('--dry-run'), modelId = arg('--model-id');
if (modelId != null && modelId !== R.PIN) refuse(`--model-id "${modelId}" is not the pin: exactly --model-id ${R.PIN}`);
const attempt = Number(arg('--attempt') ?? 1);
if (!Number.isInteger(attempt) || attempt < 1) refuse('--attempt must be a positive integer');

// the packet: the one registered file, byte-identical to what the builder wrote
if (!fs.existsSync(PACKET)) refuse(`${PACKET} does not exist (run build-blind-la.mjs first)`);
let rec; try { rec = JSON.parse(fs.readFileSync(RECORD, 'utf8')); } catch { refuse(`${RECORD} missing or unreadable`); }
if (sha256(fs.readFileSync(PACKET)) !== rec.packetSha256) refuse('the packet differs from the sha256 the builder recorded');
const items = JSON.parse(fs.readFileSync(PACKET, 'utf8')).items;
if (!Array.isArray(items) || !items.length || new Set(items.map((i) => i.key)).size !== items.length) refuse('packet items must be a non-empty list with unique keys');
const gate = R.probeGate({ launchesFile: PROBE_FILE });

if (argv.includes('--plan')) {
    const tags = ['la-1.g1', 'la-1.g2'];
    console.log(`PLAN packet ${path.basename(PACKET)} ${items.length} items; pin ${R.PIN}; la sha12 ${LA_SHA12}; rd launcher sha12 ${R.LAUNCHER_SHA12}`);
    for (const t of tags) console.log(`PLAN ${t} verdicts ${fs.existsSync(verdictsPathOf(t)) ? 'EXISTS' : 'to write'}`);
    console.log(`PLAN 2 grader launches over 1 packet (2 graders), at most 2 at once, one fresh cwd each`);
    console.log(`PLAN probe gate: ${gate.ok ? `OK (alias read: opus -> ${gate.alias})` : `BLOCKED (${gate.problems.join('; ')})`}`);
    process.exit(0);
}
const tag = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(argv[i - 1])));
if (!tag || !TAG_RX.test(tag)) refuse('tag must be la-1.g1 or la-1.g2');
if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${R.PIN}`);
const model = modelId ?? 'opus';
const verdictsPath = verdictsPathOf(tag);
if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists: move the earlier attempt's verdicts away before a re-grade`);
const template = A.dispatchTemplate(R.DISPATCH);
if (!template) refuse(`${R.DISPATCH} holds no dispatch marker`);
const prompt = R.buildPromptFiles(template, { pairs: PACKET, verdicts: verdictsPath, tag });
const why = A.dispatchProblem(prompt, template, { blindDir: path.dirname(PACKET), files: { pairs: PACKET, verdicts: verdictsPath }, tag });
if (why) refuse(`the built prompt does not pass the audit's own dispatch check: ${why}`);
const { args, rules } = R.pairsArgs({ prompt, pairs: PACKET, verdicts: verdictsPath, model });
const cwd = path.join(GRADING, `${tag}-a${attempt}`);
const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
if (dry) {
    console.log(`DRY RUN ${tag} attempt ${attempt}: ${items.length} items; model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl ${L.slugJsonls(cwd).length}; memory entries ${L.memoryEntries(cwd).length}`);
    console.log(`dispatch file sha12 ${sha12(fs.readFileSync(R.DISPATCH))}`);
    console.log(argvLine);
    console.log(`permission rules: ${rules.join(' | ')}`);
    console.log(`probe gate: ${gate.ok ? `OK (alias read: opus -> ${gate.alias})` : `BLOCKED (${gate.problems.join('; ')}); a real launch would be refused`}`);
    process.exit(0);
}
if (!gate.ok) refuse(`the probe gate is not passed: ${gate.problems.join('; ')}`);
console.log(argvLine);
const r = L.launchAttempt({ slot: tag, attempt, cwd, args });
if (r.error) refuse(r.error);
const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
const models = R.transcriptModels(text);
const pinned = R.modelMatchesPin(r.record.model, R.PIN) && models.length > 0 && models.every((m) => R.modelMatchesPin(m, R.PIN));
const recd = { ...r.record, launcher: R.LAUNCHER_SHA12, derived: LA_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models, pinned, pairsSha12: sha12(fs.readFileSync(PACKET)), verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null };
fs.mkdirSync(GRADE, { recursive: true });
fs.appendFileSync(LAUNCHES, `${L.launchRecord(recd)}\n`);
if (!recd.model && Object.keys(recd.tools).length === 0) console.log(`${tag} a${attempt}: RATE-LIMIT-REFUSAL? no model and no tool call: not a grader attempt; wait for the reset and relaunch as attempt ${attempt + 1}`);
const keysOf = Object.fromEntries(items.map((i) => [i.key, 1]));
let vp = 'verdicts file MISSING/INVALID';
try {
    const vv = JSON.parse(fs.readFileSync(verdictsPath, 'utf8'));
    const extra = Object.keys(vv).filter((k) => !keysOf[k]);
    const badKey = Object.keys(keysOf).find((k) => { const s = vv[k]; return !s || ![s.correctness, s.on_topic, s.delivery].every((x) => [0, 1, 2].includes(x)); });
    vp = extra.length ? `verdicts file MISSING/INVALID (extra keys ${extra.length})` : badKey ? `verdicts file MISSING/INVALID (no valid verdict for ${badKey})` : `verdicts file valid on its pairs (${items.length} keys)`;
} catch { /* absent or unparsable */ }
const toolsOk = Object.keys(recd.tools).every((t) => GATED_TOOLS.includes(t));
console.log(`${tag} a${attempt}: session ${recd.session_id} model ${recd.model} exit ${recd.exit} cwd ${path.basename(cwd)} slugJsonl ${recd.slugJsonl} memoryDir ${recd.memoryDir} memory ${recd.memory} tools ${JSON.stringify(recd.tools)}${toolsOk ? '' : ' TOOL OUTSIDE Read/Write/Edit'} ${vp}${pinned ? ' PINNED' : ` MODEL IS NOT THE PIN ${R.PIN}`}`);
process.exit(recd.exit === 0 && recd.slugJsonl === 1 && recd.memoryDir !== 'non-empty' && recd.memory === 'ABSENT' && toolsOk && pinned && /valid on its pairs/.test(vp) ? 0 : 1);
