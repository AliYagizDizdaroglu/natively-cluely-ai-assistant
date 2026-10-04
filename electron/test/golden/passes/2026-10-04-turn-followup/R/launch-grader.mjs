// The grader launcher (AMENDMENT A2 points 9 and 11) -- the controller's tool, hashed in section 2. It CALLS THE CLAUDE CLI (a model call): the
// controller runs it, never a self-test. Nothing in this file is executed by any self-check except its pure helpers and, in
// scripts/grader-session-calibrate.mjs section D, the whole CLI against a stand-in for the claude binary (TURN_FAKE_CLAUDE). No model is called there.
//
//   node launch-grader.mjs <slot> [--attempt k] [--rerun] [--dry-run]
//        slot = blind-N.gX. Grades one blind file as one grader (blind folder R/blind, or R/blind-rerun with --rerun).
//   node launch-grader.mjs pilot --pilot <C:/ dir> [--attempt k] [--dry-run]
//        the pilot: slot `pilot` grades <dir>/pairs.blind-1.json as blind-1.g1 (a SYNTHETIC folder made by --make-pilot); cwd pilot-a<k>.
//   node launch-grader.mjs cwdprobe-1 --probe        then, only after the first one's line shows exit 0 and its Read + Write:
//   node launch-grader.mjs cwdprobe-2 --probe        the G1 calibration: two probes in a row, each from its own fresh cwd (cwdprobe-<n>-a1).
//   node launch-grader.mjs --make-pilot <C:/ dir>    writes a synthetic pairs.blind-1.json (4 invented items, no real answer, no key) into <dir>.
//
// What one attempt does (point 9 + 11):
//   (a) the prompt is the registered h40d dispatch text (SP/validation-hour/h40d-grader-dispatch.txt, section 2 row) with ONLY the pairs path, the verdicts
//       path and the tag substituted, so the audit's dispatch check reads dispatch=match;
//   (b) cwd = F\grading\<slot>-a<k>\ , created with a mkdirSync that refuses an existing path (never reused). Before the launch, the EXACT projects folder
//       of that cwd (Claude Code's slug of it) must hold no top-level .jsonl and no non-empty memory\ -- else REFUSED, nothing launched. (A2's text says
//       "a folder whose name BEGINS with the slug prefix"; every sibling attempt shares the first 200 characters of the slug, so a prefix match would refuse
//       every attempt after the first -- the exact computed folder is the intended check; deviation reported.);
//   (c) claude -p <prompt> --model opus --output-format json from that cwd, flags below, never --dangerously-skip-permissions;
//   (d) after: the session's transcript is located by id; its slug folder must hold exactly ONE top-level <session>.jsonl (slugJsonl: 1; 0 also when the
//       transcript is not in the attempt's own slug folder) and no non-empty memory\ (memoryDir: 'absent' | 'empty' | 'non-empty'); ONE line
//       {slot, attempt, session_id, model, exit, cwd, startedAt, endedAt, slugJsonl, memoryDir} is appended to <blind dir>/launches.jsonl (a probe's to
//       R/grader-cwd.launches.jsonl);
//   (e) stdout carries ids and counts only -- never a question, an answer, a verdict or the prompt. The verdicts file is read with legs-decide's verdict
//       reader (verdictFileProblem) against the pairs file's keys; a grader that died or wrote an incomplete file exits 1 (the registered replace-ONCE case).
//   --probe mode also appends everything it prints, with its command, to R/grader-cwd.probes.out.txt.
//
// Permissions (found with `claude --help`; the docs: Read/Edit rules take //c/... for C:\... on Windows and an Edit rule also covers Write): -p,
// --permission-mode dontAsk (anything not allowed is denied, nobody is asked), --tools Read,Write,Edit and NOTHING else (A2 POINT 15, 23:52: no shell, no
// Grep/Glob/Agent/WebFetch), --strict-mcp-config (no MCP server, so no mcp__ call), NO --add-dir (the permission system itself then refuses a Read of any file
// outside the cwd that no allow rule names: the negative probe, session f8d13b32, was DENIED), --allowed-tools: Read of the OWN pairs file and of the
// grader-instruction file, Edit of the OWN verdicts file (an Edit rule also covers Write). Observed with exactly these flags (the spike, session 8a49290e):
// Read x3 (rubric, own pairs, own verdicts re-read after the Write), Write x1, exit 0. A denied call is still an attempt in the transcript; the audit
// flags it (a denial, or a path outside its allowlist).
// The probe uses the same flags and the same rule kinds on its own two files.
// Never more than 2 attempts at once: two atomic slot folders (grading\.slots\slot-1|2) holding the pid; a third launcher refuses.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dispatchTemplate, dispatchProblem, ownFiles, DISPATCH_FILE, RUBRIC, MAIN } from './audit-graders.mjs';
import { scan } from './check-grader-memory.mjs';
import { verdictFileProblem } from './legs-decide.mjs';

const R_DIR = path.dirname(fileURLToPath(import.meta.url));
const FT = path.dirname(R_DIR);
// FQ_OUT_DIR / TURN_GRADING_DIR / TURN_PROJECTS / TURN_FAKE_CLAUDE: self-test seams only (a temp R folder, a temp grading folder, a temp projects folder,
// a stand-in for the claude binary); all unset on the day.
export const OUT_DIR = process.env.FQ_OUT_DIR ?? R_DIR;
export const GRADING = process.env.TURN_GRADING_DIR ?? path.join(FT, 'grading');
export const PROJECTS = process.env.TURN_PROJECTS ?? 'C:/Users/sotka/.claude/projects';
const MAX_AT_ONCE = 2;
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

/** Claude Code's project folder name for a cwd: non-alphanumerics -> '-', cut at 200 characters + '-' + a base-36 hash of the full path (verified
 *  against the real 22:19 probe folder ...scratchpad-followup-7potx7). */
export function projectSlug(cwd) {
    const san = cwd.replace(/[^a-zA-Z0-9]/g, '-');
    if (san.length <= 200) return san;
    let h = 0;
    for (let i = 0; i < cwd.length; i++) { h = (h << 5) - h + cwd.charCodeAt(i); h |= 0; }
    return `${san.slice(0, 200)}-${Math.abs(h).toString(36)}`;
}
/** The non-empty memory entries of a cwd's projects folder (must be [] before a launch). */
export function memoryEntries(cwd, projects = PROJECTS) {
    try { return fs.readdirSync(path.join(projects, projectSlug(cwd), 'memory')); } catch { return []; }
}
/** The top-level .jsonl files of a cwd's EXACT projects folder (must be [] before a launch). */
export function slugJsonls(cwd, projects = PROJECTS) {
    try { return fs.readdirSync(path.join(projects, projectSlug(cwd))).filter((f) => f.endsWith('.jsonl')); } catch { return []; }
}
/** A Read/Edit permission rule for an absolute Windows path: C:\Users\x -> //c/Users/x. */
export function absRule(tool, p) {
    const q = path.resolve(p).replace(/\\/g, '/');
    const m = /^([A-Za-z]):\/(.*)$/.exec(q);
    if (!m) throw new Error(`${p} is not a drive path`);
    return `${tool}(//${m[1].toLowerCase()}/${m[2]})`;
}
/** The dispatch text for one slot: the registered template with only the pairs path, the verdicts path and the tag substituted (as h40d did, backslash paths). */
export function buildPrompt(template, { blindDir, slot }) {
    const f = ownFiles(slot);
    const win = (p) => path.join(blindDir, p).replace(/\//g, '\\');
    return template.replace('RUN\\<pairs file>', () => win(f.pairs)).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${win(f.verdicts)}`).replace('`TAG`', () => `\`${slot}\``);
}
const FLAGS = (prompt) => ['-p', prompt, '--model', 'opus', '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config'];
export function claudeArgs({ prompt, blindDir, slot, rubric = RUBRIC }) {
    const f = ownFiles(slot);
    const rules = [absRule('Read', path.join(blindDir, f.pairs)), absRule('Read', rubric), absRule('Edit', path.join(blindDir, f.verdicts))];
    return { args: [...FLAGS(prompt), '--allowed-tools', ...rules], rules };
}
/** The probe's argv: the SAME binary, flags and rule kinds as a grader, on its own two files (one Read of probe-input.txt, one Write of <cwd>\out.txt). */
export function probeArgs({ prompt, inFile, outFile }) {
    const rules = [absRule('Read', inFile), absRule('Edit', outFile)];
    return { args: [...FLAGS(prompt), '--allowed-tools', ...rules], rules };
}
export const probePrompt = (inFile, outFile) => `Read the file ${inFile.replace(/\//g, '\\')} and then write the number of lines it has, as a single number, into the file ${outFile.replace(/\//g, '\\')}. Use only the Read tool and the Write tool, once each. Reply with only the word DONE.`;

// ── concurrency: at most MAX_AT_ONCE attempts ──
export function acquireSlot(label, base = GRADING) {
    const dir = path.join(base, '.slots');
    fs.mkdirSync(dir, { recursive: true });
    for (let k = 1; k <= MAX_AT_ONCE; k++) {
        const s = path.join(dir, `slot-${k}`);
        try { fs.mkdirSync(s); } catch {
            let pid = 0; try { pid = Number(fs.readFileSync(path.join(s, 'pid'), 'utf8')); } catch { /* none */ }
            let alive = false; if (pid) { try { process.kill(pid, 0); alive = true; } catch { alive = false; } }
            if (alive) continue;
            fs.rmSync(s, { recursive: true, force: true });                          // a dead launcher's slot
            try { fs.mkdirSync(s); } catch { continue; }
        }
        fs.writeFileSync(path.join(s, 'pid'), String(process.pid));
        fs.writeFileSync(path.join(s, 'label'), label);
        return () => fs.rmSync(s, { recursive: true, force: true });
    }
    return null;
}

/** Finds a session's transcript by id across every folder under PROJECTS. */
export function findSession(id, projects = PROJECTS) {
    if (!fs.existsSync(projects)) return null;
    for (const d of fs.readdirSync(projects, { withFileTypes: true })) {
        if (!d.isDirectory()) continue;
        const f = path.join(projects, d.name, `${id}.jsonl`);
        if (fs.existsSync(f)) return f;
    }
    return null;
}
export const toolCounts = (text) => {
    const t = {};
    for (const line of text.split('\n')) { if (!line.trim()) continue; let j; try { j = JSON.parse(line); } catch { continue; } if (j?.type === 'assistant') for (const c of j.message?.content ?? []) if (c?.type === 'tool_use') t[c.name] = (t[c.name] ?? 0) + 1; }
    return t;
};
/** The two slug-folder facts of point 9 for a finished attempt: how many top-level .jsonl its slug folder holds (1 only when the folder is the attempt's own
 *  and the one file is this session's), and the state of its memory\ folder. */
export function slugFacts(cwd, session, transcript) {
    if (!transcript) return { slugJsonl: 0, memoryDir: 'unknown' };
    const dir = path.dirname(transcript);
    const own = path.basename(dir).toLowerCase() === projectSlug(cwd).toLowerCase();
    const jsonls = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    let memoryDir = 'absent';
    try { memoryDir = fs.readdirSync(path.join(dir, 'memory')).length ? 'non-empty' : 'empty'; } catch { /* no memory folder */ }
    return { slugJsonl: own && jsonls.length === 1 && jsonls[0] === `${session}.jsonl` ? 1 : own ? jsonls.length : 0, memoryDir };
}
export const readLaunches = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);

/** One attempt. Returns { error } (nothing launched) or { record, memory, tools, transcript }. */
export function launchAttempt({ slot, attempt, cwd, args, timeoutMs = 25 * 60 * 1000 }) {
    if (fs.existsSync(cwd)) return { error: `${cwd} already exists: a cwd is never reused (point 9)` };
    const jl = slugJsonls(cwd), mem = memoryEntries(cwd);
    if (jl.length) return { error: `the projects folder of ${path.basename(cwd)} already holds ${jl.length} .jsonl: refusing (point 9)` };
    if (mem.length) return { error: `the projects folder of ${path.basename(cwd)} already holds a non-empty memory\\ (${mem.length} entries): refusing (point 9)` };
    const release = acquireSlot(`${slot}-a${attempt}`);
    if (!release) return { error: `${MAX_AT_ONCE} attempts are already running: never more than ${MAX_AT_ONCE} at once` };
    let r, startedAt, endedAt;
    try {
        fs.mkdirSync(path.dirname(cwd), { recursive: true });
        fs.mkdirSync(cwd);
        const fake = process.env.TURN_FAKE_CLAUDE;
        startedAt = new Date().toISOString();
        r = spawnSync(fake ? process.execPath : 'claude', fake ? [fake, ...args] : args, { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 << 20 });
        endedAt = new Date().toISOString();
    } finally { release(); }
    let j = null; try { j = JSON.parse(r.stdout); } catch { /* not JSON */ }
    const session = j?.session_id ?? null;
    const model = j?.modelUsage ? Object.keys(j.modelUsage).join('+') : null;
    const transcript = session ? findSession(session) : null;
    const text = transcript ? fs.readFileSync(transcript, 'utf8') : '';
    const sc = transcript ? scan(text) : null;
    const memory = sc ? { status: sc.loaded ? 'LOADED' : 'ABSENT', projectMemory: sc.projectMemory.total, claudeMem: sc.claudeMem.total } : null;
    // exit: the process's own status; a result flagged is_error is never recorded as exit 0
    const exit = r.status === 0 && (!j || j.is_error) ? 1 : r.status;
    const record = { slot, attempt, session_id: session, model, exit, cwd, startedAt, endedAt, ...slugFacts(cwd, session, transcript) };
    return { record, memory, tools: toolCounts(text), transcript };
}
/** One launches line; its fields are exactly those of point 11(d). */
export const launchRecord = (r) => JSON.stringify(r);
const memText = (m) => (m ? `${m.status} projectMemory=${m.projectMemory} claudeMem=${m.claudeMem}` : 'transcript not found');
const idsLine = (rec, memory) => `${rec.slot} a${rec.attempt}: session ${rec.session_id} model ${rec.model} exit ${rec.exit} cwd ${path.basename(rec.cwd)} slugJsonl ${rec.slugJsonl} memoryDir ${rec.memoryDir} memory ${memText(memory)}`;

// ── CLI ──
async function main() {
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const usage = (why) => { console.error(`launch-grader: ${why}\nusage: node launch-grader.mjs <blind-N.gX> [--attempt k] [--rerun] [--dry-run] | pilot --pilot <C:/ dir> [--attempt k] [--dry-run] | cwdprobe-1|cwdprobe-2 --probe [--dry-run] | --make-pilot <C:/ dir>`); process.exit(2); };
    const isDrive = (p) => /^[A-Za-z]:[\\/]/.test(p ?? '');

    if (argv.includes('--make-pilot')) {
        const dir = arg('--make-pilot');
        if (!isDrive(dir)) usage('--make-pilot needs a C:/ directory');
        if (fs.existsSync(path.join(dir, 'pairs.blind-1.json'))) usage(`${dir} already holds pairs.blind-1.json`);
        const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
        const items = [
            ['P1', 'What is the difference between a process and a thread?', 'A process has its own address space; threads of one process share memory and are cheaper to create and switch between.'],
            ['P2', 'When would you pick a hash map over a balanced tree?', 'When you need average constant-time lookups and do not need ordered iteration; a tree gives ordered keys and worst-case log n.'],
            ['P3', 'Explain what a database index is for.', 'It is a separate structure that lets the database find rows by a column without scanning the whole table, at the cost of slower writes.'],
            ['P4', 'What does idempotent mean for an HTTP method?', 'Repeating the same request leaves the server in the same state as sending it once, so PUT and DELETE are idempotent and POST is not.'],
        ].map(([id, q, a], i) => ({ key: `pilot:${id}#${i + 1}`, id: `pilot:${id}`, kind: 'spoken', level: null, topic: null, question: q, heard: q, source: 'answers-pass', answer: a }));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'pairs.blind-1.json'), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        console.log(`pilot folder ${dir}: pairs.blind-1.json with ${items.length} synthetic items (no real answer, no key)`);
        return;
    }

    const attempt = Number(arg('--attempt') ?? 1);
    if (!Number.isInteger(attempt) || attempt < 1) usage('--attempt must be a positive integer');
    const dry = argv.includes('--dry-run');

    // ── the G1 calibration probes ──
    const probe = argv.find((a) => /^cwdprobe-[12]$/.test(a));
    if (argv.includes('--probe') !== !!probe) usage('--probe goes with exactly cwdprobe-1 or cwdprobe-2');
    if (probe) {
        const k = Number(probe.slice(-1));
        const outLog = path.join(OUT_DIR, 'grader-cwd.probes.out.txt');
        fs.mkdirSync(OUT_DIR, { recursive: true });
        const lines = [`$ node launch-grader.mjs ${argv.join(' ')}`];
        const say = (s) => { lines.push(s); console.log(s); };
        const finish = (code) => { if (!dry) { fs.appendFileSync(outLog, `${lines.join('\n')}\n\n`); } process.exit(code); };
        const launchesFile = path.join(OUT_DIR, 'grader-cwd.launches.jsonl');
        if (attempt !== 1) usage('a probe runs as attempt 1 (cwdprobe-<n>-a1)');
        if (k === 2) {
            const first = readLaunches(launchesFile).find((l) => l.slot === 'cwdprobe-1');
            const t = first?.session_id ? findSession(first.session_id) : null;
            const tools = t ? toolCounts(fs.readFileSync(t, 'utf8')) : null;
            if (!first || first.exit !== 0 || !tools || tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) { say(`cwdprobe-2: REFUSED -- the second probe starts only after cwdprobe-1's line in ${path.basename(launchesFile)} shows exit 0 and its transcript shows exactly one Read and one Write (got ${first ? `exit ${first.exit}, tools ${JSON.stringify(tools)}` : 'no cwdprobe-1 line'})`); finish(2); }
        }
        const inFile = path.join(GRADING, 'probe-input.txt');
        if (!dry) { fs.mkdirSync(GRADING, { recursive: true }); if (!fs.existsSync(inFile)) fs.writeFileSync(inFile, 'synthetic line one\nsynthetic line two\nsynthetic line three\n'); }
        const cwd = path.join(GRADING, `${probe}-a1`);
        const outFile = path.join(cwd, 'out.txt');
        const prompt = probePrompt(inFile, outFile);
        const { args, rules } = probeArgs({ prompt, inFile, outFile });
        say(`claude ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
        say(`permission rules: ${rules.join(' | ')}`);
        if (dry) { say(`DRY RUN ${probe}: cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); projects folder ${projectSlug(cwd).slice(-40)}; .jsonl ${slugJsonls(cwd).length}; memory entries ${memoryEntries(cwd).length}`); finish(0); }
        const r = launchAttempt({ slot: probe, attempt, cwd, args });
        if (r.error) { say(`${probe}: REFUSED ${r.error}`); finish(2); }
        fs.appendFileSync(launchesFile, `${launchRecord(r.record)}\n`);
        const wrote = fs.existsSync(outFile);
        const good = r.record.exit === 0 && r.record.slugJsonl === 1 && r.record.memoryDir !== 'non-empty' && r.memory?.status === 'ABSENT' && r.memory.projectMemory === 0 && r.memory.claudeMem === 0
            && r.tools.Read === 1 && r.tools.Write === 1 && Object.keys(r.tools).length === 2 && wrote;
        say(`${idsLine(r.record, r.memory)} tools ${JSON.stringify(r.tools)} out.txt ${wrote ? 'written' : 'MISSING'} -> ${good ? 'ok' : 'NOT OK'}`);
        say(good ? `${probe} OK (the controller still runs check-grader-memory.mjs and h40d-grader-models.mjs on session:${r.record.session_id})` : `${probe} FAILED: nothing runs tonight on a failed probe; the transcript is kept`);
        finish(good ? 0 : 1);
    }

    // ── a grader attempt (a real slot, or the pilot) ──
    const pilot = arg('--pilot');
    const slot = argv.find((a) => /^blind-\d+\.g\d$/.test(a) || a === 'pilot');
    if (!slot) usage('no slot (blind-N.gX or pilot) given');
    if ((slot === 'pilot') !== !!pilot) usage('the slot `pilot` goes with --pilot <dir>, and --pilot with the slot `pilot`');
    if (pilot && !isDrive(pilot)) usage('--pilot needs a C:/ directory');
    const gslot = slot === 'pilot' ? 'blind-1.g1' : slot;                                  // the pilot grades the synthetic blind-1 as grader 1
    const blindDir = pilot ?? path.join(OUT_DIR, argv.includes('--rerun') ? 'blind-rerun' : 'blind');
    const files = ownFiles(gslot);
    const pairsPath = path.join(blindDir, files.pairs);
    if (!fs.existsSync(pairsPath)) usage(`${pairsPath} does not exist`);
    if (fs.existsSync(path.join(blindDir, files.verdicts))) usage(`${files.verdicts} already exists in ${blindDir}: move the earlier attempt's verdicts away before a re-grade`);
    const template = dispatchTemplate(DISPATCH_FILE);
    if (!template) usage(`${DISPATCH_FILE} holds no dispatch marker`);
    const prompt = buildPrompt(template, { blindDir, slot: gslot });
    const why = dispatchProblem(prompt, template, { blindDir, files, tag: gslot });
    if (why) usage(`the built prompt does not pass the audit's own dispatch check: ${why}`);
    const { args, rules } = claudeArgs({ prompt, blindDir, slot: gslot });
    const cwd = path.join(GRADING, `${slot}-a${attempt}`);
    const argvLine = `claude ${args.map((a) => (a === prompt ? `<prompt ${prompt.length} chars sha12 ${sha12(prompt)}>` : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`;
    if (dry) {
        console.log(`DRY RUN ${slot} attempt ${attempt}: cwd ${cwd} (${fs.existsSync(cwd) ? 'EXISTS: would refuse' : 'fresh'}); projects folder ${projectSlug(cwd).slice(-40)}; .jsonl ${slugJsonls(cwd).length}; memory entries ${memoryEntries(cwd).length}`);
        console.log(`dispatch file sha12 ${sha12(fs.readFileSync(DISPATCH_FILE))}`);
        console.log(argvLine);
        console.log(`permission rules: ${rules.join(' | ')}`);
        return;
    }
    console.log(argvLine);
    const r = launchAttempt({ slot, attempt, cwd, args });
    if (r.error) { console.log(`${slot} a${attempt}: REFUSED ${r.error}`); process.exit(2); }
    fs.appendFileSync(path.join(blindDir, 'launches.jsonl'), `${launchRecord(r.record)}\n`);
    let vp = 'verdicts file MISSING/INVALID';
    try {
        const items = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items;
        const p = verdictFileProblem(JSON.parse(fs.readFileSync(path.join(blindDir, files.verdicts), 'utf8')), Object.fromEntries(items.map((i) => [i.key, 1])));
        vp = p ? `verdicts file MISSING/INVALID (${p.slice(0, 100)})` : `verdicts file valid on its pairs (${items.length} keys)`;
    } catch { /* absent or unparsable: vp stays */ }
    console.log(`${idsLine(r.record, r.memory)} tools ${JSON.stringify(r.tools)} ${vp}`);
    process.exit(r.record.exit === 0 && r.record.slugJsonl === 1 && r.record.memoryDir !== 'non-empty' && /valid on its pairs/.test(vp) ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
