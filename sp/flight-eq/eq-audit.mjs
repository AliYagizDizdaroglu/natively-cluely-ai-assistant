// E\eq-audit.mjs: audit-graders.mjs's DEFAULT (point-15) mode for PAIRS-mode graders (registration 7.b8: "audit clean, dispatch=match" for the pilot and every
// per-arm grader). F\R\audit-graders.mjs derives a grader's own files from a blind-N.gX tag only (ownFiles), so it cannot audit a grader launched with
// --pairs/--verdicts; this tool applies the SAME allowlist to explicit files and prints the SAME line shape. Blind slots are still audited by audit-graders.mjs
// itself (`--blind-dir E\blind --dispatch E\eq-grader-dispatch.txt blind-N.gX=session:<id>`). Tool NAME and input paths only, never what a tool returned.
//
//   node eq-audit.mjs [--rubric <path>] [--dispatch <path>] [--projects <dir>] --item "<tag>|<pairs file>|<verdicts file>|session:<uuid>|file:<C:\ transcript>" ...
//   clean iff EVERY tool call is: Read of the own pairs file, the rubric, or the own verdicts file (re-read after writing); Write/Edit of the own verdicts file;
//   anything else FLAGS (any Bash, any other tool, any mcp__*, any path outside, any call Claude Code DENIED); and the first user message must equal the dispatch
//   template with only the pairs path, the verdicts path and the tag substituted (dispatch=match | DIFFERS).
//   exit 0 all clean | 1 flagged / transcript not found | 2 usage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const F_R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const E = path.dirname(fileURLToPath(import.meta.url));
const A = await import(pathToFileURL(path.join(F_R, 'audit-graders.mjs')).href);
export const DEFAULT_DISPATCH = path.join(E, 'eq-grader-dispatch.txt');

/** { tools, touched, flags, dispatch } for one transcript text. files: { pairs, verdicts } absolute paths. */
export function auditFiles(text, { tag, files, rubric = A.RUBRIC, dispatch = null }) {
    const base = path.dirname(files.pairs);
    const readOk = new Set([A.norm(files.pairs, base), A.norm(rubric, base), A.norm(files.verdicts, base)]);
    const writeOk = new Set([A.norm(files.verdicts, base)]);
    const touched = [], tools = {}, flags = [];
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
            const inp = c.input ?? {};
            let any = false;
            for (const k of ['file_path', 'path', 'pattern', 'command', 'glob']) if (typeof inp[k] === 'string') { touched.push(`${c.name}:${k}=${inp[k]}`); any = true; }
            if (!any) touched.push(`${c.name}:(no path input)`);
            const fp = typeof inp.file_path === 'string' ? inp.file_path : null;
            if (c.name.startsWith('mcp__')) flags.push(`MCP CALL ${c.name}`);
            else if (c.name === 'Read') { if (!fp || !readOk.has(A.norm(fp, base))) flags.push(`Read outside the allowlist: ${String(fp).slice(0, 110)}`); }
            else if (c.name === 'Write' || c.name === 'Edit') { if (!fp || !writeOk.has(A.norm(fp, base))) flags.push(`${c.name} outside the own verdicts file: ${String(fp).slice(0, 110)}`); }
            else if (c.name === 'Bash') flags.push('Bash call (graders have no Bash)');
            else flags.push(`TOOL OTHER THAN Read/Write/Edit: ${c.name}`);
        }
    }
    if (denials) flags.push(`${denials} call(s) DENIED by Claude Code (permission_denials / an is_error permission result)`);
    let disp = 'off';
    if (dispatch) {
        const why = A.dispatchProblem(A.firstUserText(text), dispatch, { blindDir: base, files, tag });
        disp = why ? 'DIFFERS' : 'match';
        if (why) flags.push(`DISPATCH TEXT DIFFERS from the dispatch file (${why})`);
    }
    return { tools, touched, flags, dispatch: disp };
}

function main() {
    const argv = process.argv.slice(2);
    const usage = (why) => { console.error(`eq-audit: ${why}\nusage: node eq-audit.mjs [--rubric <path>] [--dispatch <path>] [--projects <dir>] --item "<tag>|<pairs>|<verdicts>|session:<uuid>|file:<C:\\ transcript>" ...`); process.exit(2); };
    let rubric = A.RUBRIC, dispatchFile = DEFAULT_DISPATCH, projects = 'C:/Users/sotka/.claude/projects';
    const items = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!['--rubric', '--dispatch', '--projects', '--item'].includes(a)) usage(`unknown argument ${a}`);
        const v = argv[++i]; if (!v) usage(`${a} needs a value`);
        if (a === '--rubric') rubric = v; else if (a === '--dispatch') dispatchFile = v; else if (a === '--projects') projects = v;
        else {
            const p = v.split('|');
            if (p.length !== 4 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p[0]) || !/^[A-Za-z]:[\\/]/.test(p[1]) || !/^[A-Za-z]:[\\/]/.test(p[2]) || !/^(session|file):/.test(p[3])) usage(`bad --item "${v}"`);
            items.push({ tag: p[0], files: { pairs: path.resolve(p[1]), verdicts: path.resolve(p[2]) }, src: p[3] });
        }
    }
    if (!items.length) usage('nothing to audit');
    let template; try { template = A.dispatchTemplate(dispatchFile); } catch (e) { usage(`cannot read the dispatch text ${dispatchFile}`); }
    if (!template) usage(`${dispatchFile} holds no dispatch marker`);
    const find = (src) => {
        if (src.startsWith('file:')) { const f = src.slice(5); return fs.existsSync(f) ? f : null; }
        const id = src.slice(8);
        for (const d of fs.existsSync(projects) ? fs.readdirSync(projects, { withFileTypes: true }) : []) { if (!d.isDirectory()) continue; const f = path.join(projects, d.name, `${id}.jsonl`); if (fs.existsSync(f)) return f; }
        return null;
    };
    let flaggedAny = false;
    for (const it of items) {
        const f = find(it.src);
        if (!f) { console.log(`${it.tag}: transcript NOT FOUND (${it.src.slice(0, 40)}) -> cannot audit`); flaggedAny = true; continue; }
        const r = auditFiles(fs.readFileSync(f, 'utf8'), { tag: it.tag, files: it.files, rubric, dispatch: template });
        flaggedAny ||= r.flags.length > 0;
        const ts = Object.entries(r.tools).map(([k, n]) => `${k}x${n}`).join(' ') || 'none';
        console.log(`${it.tag} (${it.src.replace(/^session:/, '').slice(0, 18)}): ${r.touched.length} tool inputs [${ts}]; ${r.flags.length ? `FLAGGED ${r.flags.length}: ${r.flags.join(' | ')}` : 'clean'}; bash=[]; dispatch=${r.dispatch}`);
    }
    console.log(flaggedAny ? 'AUDIT: FLAGGED (see lines above)' : 'AUDIT: all graders clean');
    process.exitCode = flaggedAny ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
