// Grader launcher for live40-r1, adapted from followup-turn/R/launch-grader.mjs (read-only imports from the sister; the sister is not modified).
//   node launch-grader.mjs g1|g2 [--attempt k] [--dry-run]
// Prompt = the registered h40d dispatch text with only the pairs path, verdicts path and tag substituted (tag blind-1.gX, as the sister).
// cwd = grade\cwd\<g1|g2>-a<k>, fresh and empty, never reused. Prints ids and counts only.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const SPR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const { dispatchTemplate, dispatchProblem, ownFiles, DISPATCH_FILE, RUBRIC } = await import(`file:///${SPR}/audit-graders.mjs`);
const { scan } = await import(`file:///${SPR}/check-grader-memory.mjs`);
const { verdictFileProblem } = await import(`file:///${SPR}/legs-decide.mjs`);
const { projectSlug, memoryEntries, slugJsonls, absRule, buildPrompt, findSession, toolCounts, slugFacts } = await import(`file:///${SPR}/launch-grader.mjs`);

const GRADE = path.dirname(fileURLToPath(import.meta.url));
const BLIND = path.join(GRADE, 'blind');
const argv = process.argv.slice(2);
const g = argv.find((a) => /^g[12]$/.test(a));
if (!g) { console.error('usage: node launch-grader.mjs g1|g2 [--attempt k] [--dry-run]'); process.exit(2); }
const ai = argv.indexOf('--attempt');
const attempt = ai >= 0 ? Number(argv[ai + 1]) : 1;
const dry = argv.includes('--dry-run');
const slot = `blind-1.${g}`;
const files = ownFiles(slot);
const pairsPath = path.join(BLIND, files.pairs);
if (!fs.existsSync(pairsPath)) { console.error(`${pairsPath} missing`); process.exit(2); }
if (fs.existsSync(path.join(BLIND, files.verdicts))) { console.error(`${files.verdicts} already exists: move it away before a re-grade`); process.exit(2); }
const template = dispatchTemplate(DISPATCH_FILE);
if (!template) { console.error('no dispatch marker'); process.exit(2); }
const prompt = buildPrompt(template, { blindDir: BLIND, slot });
const why = dispatchProblem(prompt, template, { blindDir: BLIND, files, tag: slot });
if (why) { console.error(`dispatch check: ${why}`); process.exit(2); }
const rules = [absRule('Read', path.join(BLIND, files.pairs)), absRule('Read', RUBRIC), absRule('Edit', path.join(BLIND, files.verdicts)), 'Bash(node -e *)', 'Bash(cd *)'];
const args = ['-p', prompt, '--model', 'opus', '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit,Bash', '--strict-mcp-config', '--add-dir', BLIND, '--allowed-tools', ...rules];
const cwd = path.join(GRADE, 'cwd', `${g}-a${attempt}`);
console.log(`claude -p <prompt ${prompt.length} chars> --model opus --output-format json --permission-mode dontAsk --tools Read,Write,Edit,Bash --strict-mcp-config --add-dir ${BLIND}`);
console.log(`permission rules: ${rules.join(' | ')}`);
console.log(`cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); .jsonl in its projects folder ${slugJsonls(cwd).length}; memory entries ${memoryEntries(cwd).length}`);
if (dry) process.exit(0);
if (fs.existsSync(cwd)) { console.log('REFUSED: cwd exists'); process.exit(2); }
if (slugJsonls(cwd).length || memoryEntries(cwd).length) { console.log('REFUSED: projects folder not clean'); process.exit(2); }
fs.mkdirSync(path.dirname(cwd), { recursive: true });
fs.mkdirSync(cwd);
const startedAt = new Date().toISOString();
const r = spawnSync('claude', args, { cwd, encoding: 'utf8', timeout: 25 * 60 * 1000, maxBuffer: 64 << 20 });
const endedAt = new Date().toISOString();
let j = null; try { j = JSON.parse(r.stdout); } catch { /* not JSON */ }
const session = j?.session_id ?? null;
const model = j?.modelUsage ? Object.keys(j.modelUsage).join('+') : null;
const transcript = session ? findSession(session) : null;
const text = transcript ? fs.readFileSync(transcript, 'utf8') : '';
const sc = transcript ? scan(text) : null;
const exit = r.status === 0 && (!j || j.is_error) ? 1 : r.status;
const record = { slot, grader: g, attempt, session_id: session, model, exit, cwd, startedAt, endedAt, ...slugFacts(cwd, session, transcript) };
fs.appendFileSync(path.join(GRADE, 'launches.jsonl'), `${JSON.stringify(record)}\n`);
let vp = 'verdicts file MISSING/INVALID';
try {
    const items = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items;
    const p = verdictFileProblem(JSON.parse(fs.readFileSync(path.join(BLIND, files.verdicts), 'utf8')), Object.fromEntries(items.map((i) => [i.key, 1])));
    vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${items.length} keys)`;
} catch { /* absent or unparsable */ }
console.log(`${slot} a${attempt}: session ${session} model ${model} exit ${exit} slugJsonl ${record.slugJsonl} memoryDir ${record.memoryDir} memory ${sc ? (sc.loaded ? 'LOADED' : 'ABSENT') : 'transcript not found'} tools ${JSON.stringify(toolCounts(text))} ${vp}`);
process.exit(exit === 0 && record.slugJsonl === 1 && record.memoryDir !== 'non-empty' && /valid on its pairs/.test(vp) ? 0 : 1);
