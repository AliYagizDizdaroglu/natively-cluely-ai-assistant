// launch-grader-b1.mjs: the grader launcher of the bundle-1 replay bench (SPEC-bundle-1.md section 8: "6 claude -p sessions": 2 Opus graders x 3 blind files of 84).
// DERIVED from router-default's launch-grader-rd.mjs: the same argv form (exact pin claude-opus-5-5, `--setting-sources project,local` so memory is ABSENT, tools Read,Write,Edit,
// dontAsk, strict MCP, NO add-dir, a fresh cwd per attempt), the same h40d dispatch text, the same transcript re-read after each launch. Differences, all forced by the 6-session cap:
//   * NO probe sessions (the rd launcher spends 3 on cwdprobe-1..3). Instead a FIRST-LAUNCH GATE: blind-1.g1 runs alone first; every other tag is refused until blind-1.g1's record is clean
//     (exit 0, memory ABSENT, model == pin in the CLI and in every transcript message, exactly the allowed tools, pairs/verdicts shas bound).
//   * a HARD CAP of 6 launch records in launches.jsonl: the 7th launch is refused ("stop and ask the user"), so a failed grader is a decision, not a retry loop.
// IT CALLS THE CLAUDE CLI (a model call) when launched for real. --plan and --dry-run call nothing; the calibration (cal-grader-b1.mjs) runs it against a stand-in with PATH stripped.
//   node launch-grader-b1.mjs --plan
//   node launch-grader-b1.mjs <tag> --model-id claude-opus-5-5 [--dry-run]       tag = blind-N.g1|g2, N = 1..3
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchProblems } from '../score-bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const CAL = process.env.B1_CAL_FAKE === '1';
const SEAMS = ['TURN_FAKE_CLAUDE', 'TURN_PROJECTS', 'B1_ROOT', 'B1_GRADING_DIR', 'B1_DISPATCH'];
if (!CAL && SEAMS.some((s) => process.env[s])) { console.error(`launch-grader-b1: REFUSED: a test seam (${SEAMS.join(', ')}) is set without B1_CAL_FAKE=1; a stand-in grader must never produce a real grade`); process.exit(2); }
const seam = (name, dflt) => (CAL && process.env[name] ? process.env[name] : dflt);
export const ROOT = path.resolve(seam('B1_ROOT', path.join(HERE, '..')));          // bench root: blind/, grade/
const GRADE = path.join(ROOT, 'grade');
const GRADING = seam('B1_GRADING_DIR', path.join(GRADE, 'grading'));
const VERDICTS = path.join(GRADE, 'verdicts');
const LAUNCHES = path.join(GRADE, 'launches.jsonl');
const DISPATCH = seam('B1_DISPATCH', path.join(HERE, 'b1-grader-dispatch.txt'));
process.env.TURN_GRADING_DIR = GRADING;
process.env.FQ_OUT_DIR = GRADE;
const L = await import(pathToFileURL(path.join(F_R, 'launch-grader.mjs')).href);
const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);

export const PIN = 'claude-opus-5-5';
// 6 by spec; BENCH_MAX_SESSIONS=7 only for the user-approved re-run of blind-3.g2 (2026-10-08: its round-2 session recorded a refused Bash call)
export const MAX_SESSIONS = Number(process.env.BENCH_MAX_SESSIONS ?? '6');
export const N_FILES = 3;
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
export const LAUNCHER_SHA12 = sha12(fs.readFileSync(SELF));
const winP = (p) => path.resolve(p).replace(/\//g, '\\');
const GATED_TOOLS = ['Read', 'Write', 'Edit'];

/** The argv shared by every grader. `--setting-sources project,local`: USER settings (claude-mem, SessionStart hook) are never loaded. NO second directory flag here (the calibration counts that word on this line). */
export const FLAGS = (prompt, model) => ['-p', prompt, '--model', model, '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config', '--setting-sources', 'project,local'];
export const pairsArgs = ({ prompt, pairs, verdicts, rubric = A.RUBRIC, model }) => { const rules = [L.absRule('Read', pairs), L.absRule('Read', rubric), L.absRule('Edit', verdicts)]; return { args: [...FLAGS(prompt, model), '--allowed-tools', ...rules], rules }; };
export const buildPromptFiles = (template, { pairs, verdicts, tag }) => template.replace('RUN\\<pairs file>', () => winP(pairs)).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${winP(verdicts)}`).replace('`TAG`', () => `\`${tag}\``);
export const modelMatchesPin = (model, pin) => !!model && model.split('+').every((m) => m === pin);   // exactly the pin: no suffix, no alias, no other model
export const transcriptModels = (text) => [...new Set(text.split('\n').flatMap((line) => { try { const j = JSON.parse(line); return j?.type === 'assistant' && j.message?.model ? [j.message.model] : []; } catch { return []; } }).filter((m) => m !== '<synthetic>'))];

export const ALL_TAGS = Array.from({ length: N_FILES }, (_, i) => i + 1).flatMap((n) => [`blind-${n}.g1`, `blind-${n}.g2`]);
export const FIRST_TAG = 'blind-1.g1';
export const parseTag = (tag) => { const m = /^blind-(\d+)\.g([12])$/.exec(tag); return m && +m[1] >= 1 && +m[1] <= N_FILES ? { file: `blind-${m[1]}`, pairsPath: path.join(ROOT, 'blind', `pairs.blind-${m[1]}.json`) } : null; };
export const verdictsPathOf = (tag) => path.join(VERDICTS, `verdicts.${tag}.json`);

/** null when `vv` has a valid verdict (0-2 correctness, on_topic, delivery) for every key and nothing else. */
export const verdictFileProblem = (vv, keys) => {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !keys[k]);
    if (extra.length) return `grades keys that are not in the pairs file: ${extra.join(', ')}`;
    for (const k of Object.keys(keys)) { const s = vv[k]; if (!s || ![s.correctness, s.on_topic, s.delivery].every((x) => [0, 1, 2].includes(x))) return `no valid verdict for ${k}`; }
    return null;
};
/** The gate for every launch but the first: the first grader's last record must be clean. Pure on the records. */
export function firstLaunchGate(recs, tag, pairsPathOf, verdictsPathOf, sha, verdictCheck = () => null) {
    if (tag === FIRST_TAG) return [];
    const bad = launchProblems(recs, [FIRST_TAG], pairsPathOf, verdictsPathOf, sha);
    const vp = bad.length ? null : verdictCheck(FIRST_TAG);   // a clean record is not enough: the verdicts file must also be complete on its pairs
    if (vp) bad.push(`${FIRST_TAG}: ${vp}`);
    return bad.length ? [`the first-launch gate: ${bad.join('; ')}`] : [];
}
const shaOrMissing = (p) => { try { return sha12(fs.readFileSync(p)); } catch { return 'MISSING'; } };
export function verdictsProblemOf(tag) {
    try { const items = JSON.parse(fs.readFileSync(parseTag(tag).pairsPath, 'utf8')).items; return verdictFileProblem(JSON.parse(fs.readFileSync(verdictsPathOf(tag), 'utf8')), Object.fromEntries(items.map((i) => [i.key, 1]))); } catch { return 'verdicts file missing or unreadable'; }
}

async function main() {
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const refuse = (why) => { console.log(`launch-grader-b1: REFUSED: ${why}`); process.exit(2); };
    const known = new Set(['--dry-run', '--model-id', '--plan']);
    for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--') && !known.has(argv[i])) refuse(`unknown option ${argv[i]}`); if (argv[i] === '--model-id' && (argv[i + 1] == null || argv[i + 1].startsWith('--'))) refuse('--model-id needs a value'); }
    const dry = argv.includes('--dry-run');
    const modelId = arg('--model-id');
    if (modelId != null && modelId !== PIN) refuse(`--model-id "${modelId}" is not the pin: a grader takes exactly --model-id ${PIN} (no alias, no other model)`);   // MUT-pin-exact
    const recs = L.readLaunches(LAUNCHES);

    if (argv.includes('--plan')) {
        const blockers = [];
        console.log(`PLAN bundle-1 bench graders; pin ${PIN}; launcher sha12 ${LAUNCHER_SHA12}; cap ${MAX_SESSIONS} sessions (records so far ${recs.length})`);
        for (const tag of ALL_TAGS) {
            const info = parseTag(tag); let items = null;
            try { items = JSON.parse(fs.readFileSync(info.pairsPath, 'utf8')).items.length; } catch { /* absent */ }
            if (items === null) blockers.push(`${tag}: pairs file missing or unreadable`);
            if (fs.existsSync(verdictsPathOf(tag))) blockers.push(`${tag}: a verdicts file already exists`);
            console.log(`PLAN ${tag.padEnd(11)} pairs=${items === null ? 'MISSING' : `${items} items`} verdicts=${fs.existsSync(verdictsPathOf(tag)) ? 'EXISTS' : 'to write'}${tag === FIRST_TAG ? '   <- runs ALONE first (the gate)' : ''}`);
        }
        console.log(`PLAN ${ALL_TAGS.length} grader launches over ${N_FILES} pairs files, at most 2 at once, one fresh cwd each; no probe sessions`);
        console.log(blockers.length ? `PLAN BLOCKED: ${blockers.join(' | ')}` : 'PLAN OK (no model was called)');
        process.exit(blockers.length ? 3 : 0);
    }

    const tag = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--model-id'));
    if (!tag) refuse('no tag given (blind-N.g1 | blind-N.g2, N = 1..3)');
    const info = parseTag(tag);
    if (!info) refuse(`"${tag}" is not a tag of this bench (blind-1..${N_FILES}.g1|g2)`);
    if (!modelId && !dry) refuse(`a real grader launch needs --model-id ${PIN}`);   // MUT-pin
    const model = modelId ?? 'opus';
    const verdictsPath = verdictsPathOf(tag);
    if (!fs.existsSync(info.pairsPath)) refuse(`${info.pairsPath} does not exist`);
    if (fs.existsSync(verdictsPath)) refuse(`${verdictsPath} already exists: a grader session is never repeated silently; stop and ask the user`);
    let items; try { items = JSON.parse(fs.readFileSync(info.pairsPath, 'utf8')).items; } catch { refuse(`${info.pairsPath} is not a pairs JSON file`); }
    if (!Array.isArray(items) || !items.length || new Set(items.map((i) => i.key)).size !== items.length || items.some((i) => typeof i.key !== 'string' || !i.key)) refuse(`${info.pairsPath}: items must be a non-empty list with unique string keys`);
    const keysOf = Object.fromEntries(items.map((i) => [i.key, 1]));
    const template = A.dispatchTemplate(DISPATCH);
    if (!template) refuse(`${DISPATCH} holds no dispatch marker`);
    const prompt = buildPromptFiles(template, { pairs: info.pairsPath, verdicts: verdictsPath, tag });
    const why = A.dispatchProblem(prompt, template, { blindDir: path.dirname(info.pairsPath), files: { pairs: info.pairsPath, verdicts: verdictsPath }, tag });
    if (why) refuse(`the built prompt does not pass the audit's own dispatch check: ${why}`);
    const { args, rules } = pairsArgs({ prompt, pairs: info.pairsPath, verdicts: verdictsPath, model });
    // BENCH_ROUND (fix round 2026-10-08): round 1's cwds and their Claude project transcripts stay as evidence; a round > 1 gets fresh names
    const round = Number(process.env.BENCH_ROUND ?? '1');
    const cwd = path.join(GRADING, round > 1 ? `${tag}-r${round}-a1` : `${tag}-a1`);
    const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
    const gate = firstLaunchGate(recs, tag, (t) => parseTag(t).pairsPath, verdictsPathOf, shaOrMissing, verdictsProblemOf);
    const capHit = recs.length >= MAX_SESSIONS;
    if (dry) {
        console.log(`DRY RUN ${tag}: ${items.length} items; model ${model}${modelId ? '' : ' (NOT pinned: a real launch would refuse)'}; cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); records ${recs.length}/${MAX_SESSIONS}${capHit ? ' (CAP: a real launch would refuse)' : ''}`);
        console.log(argvLine);
        console.log(`permission rules: ${rules.join(' | ')}`);
        console.log(`first-launch gate: ${gate.length ? `BLOCKED (${gate.join('; ')}); a real launch would be refused` : tag === FIRST_TAG ? 'n/a (this is the gate launch)' : 'OK'}`);
        return;
    }
    if (capHit) refuse(`${recs.length} launch records already: the bench's claude -p budget is ${MAX_SESSIONS}; stop and ask the user`);   // MUT-cap
    if (gate.length) refuse(gate.join('; '));                                                                                          // MUT-gate
    console.log(argvLine);
    const r = L.launchAttempt({ slot: tag, attempt: 1, cwd, args });
    if (r.error) refuse(r.error);
    const text = r.transcript ? fs.readFileSync(r.transcript, 'utf8') : '';
    const models = transcriptModels(text);
    const pinned = modelMatchesPin(r.record.model, PIN) && models.length > 0 && models.every((m) => modelMatchesPin(m, PIN));    // MUT-transcript-model
    const rec = { ...r.record, launcher: LAUNCHER_SHA12, memory: r.memory?.status ?? 'unknown', tools: r.tools, models, pinned, pairsSha12: sha12(fs.readFileSync(info.pairsPath)), verdictsSha12: fs.existsSync(verdictsPath) ? sha12(fs.readFileSync(verdictsPath)) : null };
    fs.mkdirSync(GRADE, { recursive: true });
    fs.appendFileSync(LAUNCHES, `${L.launchRecord(rec)}\n`);
    if (!rec.model && Object.keys(rec.tools).length === 0) console.log(`${tag}: RATE-LIMIT-REFUSAL? no model and no tool call in the session: not a grader attempt; this still counts toward the ${MAX_SESSIONS}; stop and ask the user`);
    let vp = 'verdicts file MISSING/INVALID';
    try { const p = verdictFileProblem(JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), keysOf); vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${items.length} keys)`; } catch { /* absent or unparsable */ }
    const toolsOk = Object.keys(rec.tools).every((t) => GATED_TOOLS.includes(t));
    console.log(`${tag} a1: session ${rec.session_id} model ${rec.model} exit ${rec.exit} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${rec.memory} tools ${JSON.stringify(rec.tools)}${toolsOk ? '' : ' TOOL OUTSIDE Read/Write/Edit'} ${vp}${pinned ? ' PINNED' : ` MODEL IS NOT THE PIN ${PIN} (cli ${rec.model}, transcript ${JSON.stringify(models)})`}`);
    console.log('the controller still runs check-grader-memory.mjs on this session and names the grader model in the result note');
    process.exit(rec.exit === 0 && rec.slugJsonl === 1 && rec.memoryDir !== 'non-empty' && rec.memory === 'ABSENT' && toolsOk && pinned && /valid on its pairs/.test(vp) ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) await main();
