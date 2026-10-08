// P7 audit-r40.mjs: the per-session checks of router40's graders and classifiers (registration 6.1, 6.2; A3.6): tool audit CLEAN, memory ABSENT, model PINNED.
// Built from live40's audit-tools.mjs (the tool listing), followup-turn's check-grader-memory.mjs `scan` (memory) and h40d-grader-models.mjs (the model each transcript really ran on).
//   node audit-r40.mjs [--blind-dir <C:/ dir>] [--classify-dir <C:/ dir>] [--projects <dir>] <tag>=session:<uuid> | <tag>=file:<C:/ path> ...
//   --record <grade\audits.jsonl>  (A8.4 step 4, HARNESS-REVIEW I2) appends one {tag, session, clean, memory, pinned} line per audited session; score-r40.mjs reads the LAST line per slot.
//   tag = blind-N.gX (a grader: allowed Read of its own pairs file, the rubric, its own verdicts file; Write/Edit of its own verdicts file)
//       | c3 | c4 (a classifier: Read of turns-for-classifiers.json and cal-blind.json; Write/Edit/Read of its own output file)
// CLEAN = tools within {Read, Write, Edit}, every path one of the allowed files, no denied call, and no mention of `keyhold` / `key.json` anywhere in the transcript.
// Prints counts and flags only (never a transcript line). Exit 0 all sessions CLEAN + ABSENT + PINNED, 1 otherwise, 2 usage.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SP, R40, FR, argOf } from '../r40-common.mjs';

const GRADE = path.dirname(fileURLToPath(import.meta.url));
const AG = await import(`file:///${FR}/audit-graders.mjs`);
const { scan } = await import(`file:///${FR}/check-grader-memory.mjs`);
const norm = (p) => path.resolve(String(p)).replace(/\\/g, '/').normalize('NFC').toLowerCase();
const ALLOWED_TOOLS = new Set(['Read', 'Write', 'Edit']);

/** The allowed files for a tag. */
export function allowedFor(tag, { blindDir = path.join(GRADE, 'blind'), classifyDir = path.join(GRADE, 'classify') } = {}) {
    if (/^blind-[1-4]\.g[12]$/.test(tag)) {
        const f = AG.ownFiles(tag);
        const pairs = path.join(blindDir, f.pairs), verdicts = path.join(blindDir, f.verdicts);
        return { read: [pairs, AG.RUBRIC, verdicts], write: [verdicts] };
    }
    if (/^c[34]$/.test(tag)) {
        const out = path.join(classifyDir, `verdicts.${tag}.json`);
        return { read: [`${R40}/turns-for-classifiers.json`, `${SP}/l38base/blind/cal-blind.json`, out], write: [out] };
    }
    throw new Error(`"${tag}" is not blind-N.gX or c3|c4`);
}

/** The tool audit of one transcript text. Returns { tools, flags }. */
export function auditTranscript(text, allowed) {
    const readOk = new Set(allowed.read.map(norm)), writeOk = new Set(allowed.write.map(norm));
    const tools = {}, flags = [];
    let denials = 0;
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const content = j?.message?.content;
        if (Array.isArray(j?.permission_denials) && j.permission_denials.length) denials += j.permission_denials.length;
        if (j?.type === 'user' && Array.isArray(content)) for (const c of content) if (c?.type === 'tool_result' && c.is_error === true) {
            const msg = typeof c.content === 'string' ? c.content : Array.isArray(c.content) ? c.content.map((x) => (typeof x?.text === 'string' ? x.text : '')).join(' ') : '';
            if (j.toolDenialKind != null || /permission|denied/i.test(msg)) denials++;
        }
        if (j?.type !== 'assistant' || !Array.isArray(content)) continue;
        for (const c of content) if (c?.type === 'tool_use') {
            tools[c.name] = (tools[c.name] ?? 0) + 1;
            const fp = typeof c.input?.file_path === 'string' ? c.input.file_path : null;
            if (!ALLOWED_TOOLS.has(c.name)) flags.push(`tool outside {Read,Write,Edit}: ${c.name}`);
            else if (c.name === 'Read') { if (!fp || !readOk.has(norm(fp)) && !writeOk.has(norm(fp))) flags.push(`Read outside the allowed files: ${path.basename(String(fp))}`); }
            else if ((c.name === 'Write' || c.name === 'Edit') && (!fp || !writeOk.has(norm(fp)))) flags.push(`${c.name} outside the own output file: ${path.basename(String(fp))}`);
        }
    }
    if (denials) flags.push(`${denials} call(s) denied by Claude Code`);
    if (/keyhold|key\.json/i.test(text)) flags.push('the transcript mentions keyhold / key.json');
    return { tools, flags };
}

const findFile = (spec, projects) => {
    if (spec.kind === 'file') return fs.existsSync(spec.v) ? spec.v : null;
    for (const d of fs.readdirSync(projects, { withFileTypes: true })) if (d.isDirectory()) { const f = path.join(projects, d.name, `${spec.v}.jsonl`); if (fs.existsSync(f)) return f; }
    return null;
};
/** model PINNED: the FR script reads the model field of the transcript's own assistant records (exit 0 = every record is claude-opus-5-5). */
export function modelPinned(file) {
    const r = spawnSync(process.execPath, [`${FR}/h40d-grader-models.mjs`, `t=file:${file.replace(/\\/g, '/')}`], { encoding: 'utf8' });
    return { pinned: r.status === 0, line: (r.stdout.match(/claude-[\w.-]+/g) ?? []).join(',') };
}
/** The line --record appends: the session is the transcript's own uuid (its file name); a transcript not found is recorded as not clean. */
export const auditRecord = (tag, spec, v) => ({ tag, session: v.found ? path.basename(v.file, '.jsonl') : spec.v, clean: v.found && v.clean === true, memory: v.found ? v.memory : 'UNKNOWN', pinned: v.found && v.pinned === true });
/** The full verdict for one session spec. */
export function auditSession(tag, spec, opts = {}) {
    const projects = opts.projects ?? 'C:/Users/sotka/.claude/projects';
    const file = findFile(spec, projects);
    if (!file) return { tag, found: false };
    const text = fs.readFileSync(file, 'utf8');
    const a = auditTranscript(text, allowedFor(tag, opts));
    const m = scan(text), pin = modelPinned(file);
    return { tag, found: true, clean: a.flags.length === 0, flags: a.flags, tools: a.tools, memory: m.loaded ? 'LOADED' : 'ABSENT', projectMemory: m.projectMemory.total, claudeMem: m.claudeMem.total, pinned: pin.pinned, models: pin.line, file };
}
export const verdictLine = (v) => (v.found ? `${v.tag}: ${v.clean ? 'CLEAN' : `NOT CLEAN (${v.flags.join(' | ')})`}; memory ${v.memory} (projectMemory=${v.projectMemory} claudeMem=${v.claudeMem}); model ${v.pinned ? 'PINNED' : 'NOT PINNED'} [${v.models}]; tools ${JSON.stringify(v.tools)}` : `${v.tag}: transcript NOT FOUND`);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const opts = { blindDir: argOf(argv, '--blind-dir') ?? path.join(GRADE, 'blind'), classifyDir: argOf(argv, '--classify-dir') ?? path.join(GRADE, 'classify'), projects: argOf(argv, '--projects') ?? 'C:/Users/sotka/.claude/projects' };
    const specs = argv.filter((a) => /^[\w.-]+=(session|file):/.test(a)).map((a) => { const m = /^([\w.-]+)=(session|file):(.+)$/.exec(a); return { tag: m[1], spec: { kind: m[2], v: m[3] } }; });
    if (!specs.length) { console.log('usage: node audit-r40.mjs [--blind-dir D] [--classify-dir D] <tag>=session:<uuid>|file:<C:/ path> ...'); process.exit(2); }
    const recordFile = argOf(argv, '--record');
    let allGood = true;
    for (const { tag, spec } of specs) {
        const v = auditSession(tag, spec, opts); console.log(verdictLine(v)); allGood &&= v.found && v.clean && v.memory === 'ABSENT' && v.pinned;
        if (recordFile) { fs.mkdirSync(path.dirname(path.resolve(recordFile)), { recursive: true }); fs.appendFileSync(recordFile, `${JSON.stringify(auditRecord(tag, spec, v))}\n`); }
    }
    console.log(allGood ? 'AUDIT: all sessions CLEAN, ABSENT, PINNED' : 'AUDIT: NOT ALL CLEAN / ABSENT / PINNED');
    process.exit(allGood ? 0 : 1);
}
