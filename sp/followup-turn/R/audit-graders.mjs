// Audit of grader transcripts (PREREGISTER-turn-followup.md section 1 + AMENDMENT A2 point 1): an ALLOWLIST over every tool use of a grader.
// Tool NAME and the tool input's path/command only, never the content a tool returned. A grader is clean iff EVERY tool call is allowed:
//
//   DEFAULT mode, no flag (section 1's original rule, restored by A2 POINT 15, 23:52; THE ONLY MODE THE DAY USES): graders have no Bash and no --add-dir
//   (R/launch-grader.mjs), so a grader is clean iff every tool call is
//     Read of the own pairs file, the rubric / grader-instruction file (--rubric) or the own verdicts file (./verdicts.blind-N.gX.json, which a grader
//     re-reads after writing it); Write or Edit (Edit counts as Write) of the own verdicts file ONLY;
//   and anything else FLAGS: any Bash (even one naming only the own files), any other tool, any mcp__* call, any Read/Write/Edit outside that list, and any
//   call Claude Code DENIED -- a tool_result with is_error and a permission / denied message, a toolDenialKind on the record, or a non-empty
//   permission_denials list. The permission system is the first fence (a Read outside the cwd that no allow rule names is refused); this audit is the second.
//   --allow-validation-bash (A2 points 1 / 10 / 13) is WITHDRAWN by point 15: kept only so the calibration (R/scripts/grader-session-calibrate.mjs
//   sections C and E) can still show what the withdrawn rule allowed and that the 8 real s50l graders and the pilot used it. No launcher, day-pre, day-steps,
//   legs-decide or e2e path passes it; the day's audit commands never carry it. What follows up to "Anything else FLAGS" describes that withdrawn mode.
//   with --allow-validation-bash (WITHDRAWN, A2 point 1):
//     (a) Read whose file_path, resolved against the blind folder, is exactly ./pairs.blind-N.json (the OWN pairs file, derived from the tag, never
//         a string replace of the verdicts name) or exactly the grader-instruction file the dispatch names (--rubric; MAIN's interview60.grader-prompt.md),
//         compared as normalized absolute paths;
//     (b) Write or Edit whose file_path resolves to exactly ./verdicts.blind-N.gX.json (the OWN verdicts file);
//     (c) Bash of the exact shape   cd "<own blind folder>" && node -e "<code>" ["<own file>" ...]   (the cd optional; its target, normalized, must equal the
//         own blind folder; trailing arguments, which `process.argv` reads, must be the own verdicts / pairs file) where <code> satisfies ALL of: its
//         string-literal file-name tokens are a subset of {verdicts.blind-N.gX.json, pairs.blind-N.json}; no glob character * ? [ inside a string
//         literal; no $, backtick or double quote (so no template literal and no shell expansion); no `+` adjacent to a string literal; no `..`, no `~`,
//         no absolute path; no http/https/net/child_process/fetch/curl/wget; PLUS point 10 (23:02): (i) none of chdir readdir opendir Dir fs/promises
//         promises dirname resolve join relative normalize process.cwd __dirname glob require.resolve eval Function( fromCharCode Buffer atob import(
//         anywhere in the code (case-sensitive substrings, literals included); (ii) every fs.<m>( / require('fs').<m>( call is readFileSync or existsSync with
//         a FIRST argument that is a literal own-file name or process.argv[<digit>] naming a trailing argument that is an own file; (iii) `process.` only as
//         exit / stdout / stderr / argv[<digit>], require( only of fs / node:fs / path / node:path / process.argv[<digit>].
//         Hardening beyond the registered text (it can only flag MORE): fs / require('fs') only as a directly dereferenced read call (no alias), a few
//         more code-loading / network modules, .replace/.replaceAll/.concat.
//         A2 point 13 (23:32; the pilot grader's own-file ABSOLUTE path, no cd): the <arg>s are quoted or bare, judged one by one in argProblem. Each must, after
//         normalising (Git-Bash /c/.. -> C:/.., case-insensitive, backslashes), EQUAL the own verdicts or own pairs file, and carries no .. segment, no glob
//         character * ? [, no $ or backtick and no ~; a drive-relative (C:x) or driveless rooted path flags; a bare argument with a backslash flags (the shell
//         eats it); WITHOUT the `cd "<own blind folder>" &&` an <arg> must be absolute and an own-file-name literal in the code flags (they would resolve against
//         the grader's empty attempt cwd). The cd target is judged by the same function. process.argv[<digit>] indexes an existing trailing <arg> (1..n) only.
//   Anything else FLAGS: any other tool (Grep, Glob, Agent, WebFetch, ...), any mcp__* call, any Read/Write/Edit/Bash outside (a)-(c). One failing
//   call flags the grader whatever its other calls.
//   Each allowed Bash command's length and sha12 is printed (bash=[<len>:<sha12>,...]) for graders.json and a human spot-read.
//   The first user message is compared with the dispatch text (--dispatch, default SP/validation-hour/h40d-grader-dispatch.txt): the template with
//   only the pairs path, the verdicts path and the tag substituted; any other difference FLAGS (--no-dispatch-check turns it off, for fixtures only).
//
// The audit DETECTS, it does not prevent (A2 residual): under the departure the graders run with the controller's permissions.
//
//   node audit-graders.mjs [--allow-validation-bash] [--blind-dir <C:/ path>] [--rubric <path>] [--dispatch <path>] [--no-dispatch-check]
//        [--projects <dir>] [--session <id>] blind-N.gX=<agentId> | blind-N.gX=session:<uuid> | blind-N.gX=file:<C:/ path> | blind-N.gX.replaced=...
//   --blind-dir defaults to R/blind (R/blind-rerun for the s50k re-run); session:<uuid> is found by id in EVERY folder under --projects.
//   exit 0 all clean   exit 1 flagged or a transcript not found   exit 2 usage
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const R_DIR = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(path.dirname(R_DIR));
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const RUBRIC = `${MAIN}/electron/test/golden/interview60.grader-prompt.md`;
export const DISPATCH_FILE = path.join(SP, 'validation-hour/h40d-grader-dispatch.txt');
export const DEFAULT_BLIND_DIR = path.join(R_DIR, 'blind');
const DISPATCH_MARK = '----- dispatch text (substitute RUN, VERDICTS and TAG) -----\n';

/** Normalized absolute path for comparison: resolved against `base`, forward slashes, NFC, lower case (Windows paths are case-insensitive). */
export const norm = (p, base) => path.resolve(base, String(p)).replace(/\\/g, '/').normalize('NFC').toLowerCase();
/** The own files of a tag (`blind-N.gX`, or `blind-N.gX.replaced`): derived from N and X, not by string-replacing one file name into the other. */
export function ownFiles(tag) {
    const m = /^blind-(\d+)\.(g\d)(?:\.replaced)?$/.exec(tag);
    if (!m) throw new Error(`"${tag}" is not blind-N.gX`);
    return { verdicts: `verdicts.blind-${m[1]}.${m[2]}.json`, pairs: `pairs.blind-${m[1]}.json` };
}

export const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
// A2 point 13: an <arg> is quoted (a backslash is allowed inside the quotes) or bare; each is judged one by one in argProblem, which names the reason.
const SHAPE = /^(?:cd "([^"$`]*)" && )?node -e "([^"\\$`]*)"((?: +(?:"[^"$`]*"|[^\s"'$`;&|<>(){}]+))*)$/;
/** Git-Bash /c/... -> C:/... (the way a native node reads an argument that Git Bash passes on). */
const winPath = (p) => p.replace(/^\/([A-Za-z])(?=\/|$)/, '$1:');
/**
 * A2 point 13: null when the <arg> (or the cd target) `s` -- quoted, or bare when `bare` -- names, once normalised, exactly one of the `allowed` normalized
 * paths. Rejected before normalising: a .. segment, a glob character, ~, $, a backtick, a rooted path without a drive letter, a drive-relative path (C:name),
 * a bare backslash (the shell eats it, and `.\.` would turn into `..`), and -- with no cd -- a relative path (it would resolve against the grader's own cwd).
 */
export function argProblem(s, bare, blindDir, allowed, hasCd) {
    if (bare && s.includes('\\')) return 'a bare argument with a backslash (the shell would eat it)';
    if (/[$`]/.test(s)) return 'a $ or backtick';
    if (s.includes('~')) return 'a ~';
    if (/[*?[]/.test(s)) return 'a glob character';
    if (s.split(/[\\/]+/).includes('..')) return 'a .. segment';
    const w = winPath(s);
    if (/^[A-Za-z]:(?![\\/])/.test(w)) return 'a drive-relative path (C:name)';
    const abs = /^[A-Za-z]:[\\/]/.test(w);
    if (!abs && /^[\\/]/.test(w)) return 'a rooted path without a drive letter';
    if (!abs && !hasCd) return "a relative path with no cd to the own blind folder (it would resolve against the grader's own cwd)";
    return allowed.has(norm(w, blindDir)) ? null : 'does not name exactly the own file';
}
// A2 point 1(c) + point 10 (23:02; S3: `process.chdir(path.dirname(process.cwd()))` + a dot-free literal like 'keyhold' + a read by variable passed the
// token rule). In an allowed Bash's `node -e` code, in addition to point 1(c):
//   (i)  none of the tokens below may appear ANYWHERE in the code -- case-sensitive SUBSTRINGS, string literals included;
//   (ii) every `fs.<method>(` / `require('fs').<method>(` call is readFileSync or existsSync and its FIRST argument is a string literal equal to the own
//        verdicts / own pairs file name, or `process.argv[<digit>]` where that slot is a TRAILING argument of the same command normalizing to the own file;
//   (iii) `process.` only as process.exit / process.stdout / process.stderr / process.argv[<digit>]; require( only of 'fs' 'node:fs' 'path' 'node:path' or
//        process.argv[<digit>] (again an own file).
// Beyond the registered text (it can only flag MORE, never less): `fs` / require('fs') must be a directly dereferenced readFileSync / existsSync call (an alias
// `const q=require('fs');q.readFileSync(v)` would slip past (ii)); a few more code-loading / network modules reachable as globals of `node -e`; .replace/.concat.
const G2_TOKENS = ['chdir', 'readdir', 'opendir', 'Dir', 'fs/promises', 'promises', 'dirname', 'resolve', 'join', 'relative', 'normalize', 'process.cwd', '__dirname', 'glob', 'require.resolve', 'eval', 'Function(', 'fromCharCode', 'Buffer', 'atob', 'import('];
const EXTRA_BANNED = [
    [/\b(?:http|https|net|child_process|fetch|curl|wget)\b/, 'http / https / net / child_process / fetch / curl / wget'],
    [/\b(?:vm|worker_threads|cluster|dgram|dns|tls|repl|module|inspector)\b/, 'a code-loading / network module'], [/\bimport\b/, 'import'],
    [/\.(?:replace|replaceAll|concat)\(/, 'string building (.replace/.concat)'],
];
const FS_CALL = /(?:\bfs|\brequire\s*\(\s*'(?:node:)?fs'\s*\))\s*\.\s*(\w+)\s*\(\s*([^,)]*)/g;

/**
 * null when `command` is an allowed validation Bash (A2 point 1(c) + point 10), else the reason it is not.
 * ctx: { blindDir, files: { verdicts, pairs } }.
 */
export function bashProblem(command, { blindDir, files }) {
    const m = SHAPE.exec(command.trim());
    if (!m) return 'not of the shape cd "<own blind folder>" && node -e "<code>" [<arg>...] (no shell metacharacters, nothing after the node -e)';
    const [, cd, code, args] = m;
    const allowed = new Set([norm(files.verdicts, blindDir), norm(files.pairs, blindDir)]);
    if (cd !== undefined) { const why = argProblem(cd, false, blindDir, new Set([norm('.', blindDir)]), true); if (why) return `cd target is not the own blind folder (${why})`; }
    const trailing = [];
    for (const t of args.matchAll(/ +(?:"([^"]*)"|(\S+))/g)) {
        const a = t[1] ?? t[2], why = argProblem(a, t[1] === undefined, blindDir, allowed, cd !== undefined);
        if (why) return `argument "${a.slice(0, 50)}" is not an allowed own-file argument (${why})`;
        trailing.push(a);
    }
    const lits = [...code.matchAll(/'([^'\n]*)'/g)].map((x) => x[1]);
    if (cd === undefined && lits.some((L) => L === files.verdicts || L === files.pairs)) return "an own-file-name literal in the code with no cd to the own blind folder (it would resolve against the grader's own cwd)";
    for (const L of lits) if (/[\/\\.~*?[\]]/.test(L) && L !== files.verdicts && L !== files.pairs) return `string literal '${L.slice(0, 40)}' is a path / glob outside the own pair`;
    if (/'\s*\+|\+\s*'/.test(code)) return 'a + adjacent to a string literal (string building)';
    if (/~/.test(code)) return 'a ~ in the code';
    for (const t of G2_TOKENS) if (code.includes(t)) return `point 10 (i): the token ${t} is not allowed`;
    for (const [rx, what] of EXTRA_BANNED) if (rx.test(code)) return `forbidden: ${what}`;
    if (/\bprocess\b(?!\.(?:exit|stdout|stderr)\b|\.argv\[\d\])/.test(code)) return 'point 10 (iii): process. may appear only as process.exit / process.stdout / process.stderr / process.argv[<digit>]';
    // process.argv[d] is the d-th element of [node, ...trailing arguments]: valid only for a trailing argument that is an own file (checked above)
    const argvOk = (expr) => { const a = /^process\.argv\[(\d)\]$/.exec(expr.trim()); return !!a && Number(a[1]) >= 1 && Number(a[1]) <= trailing.length; };
    // require(): 'fs' / 'node:fs' directly dereferenced as a read call; 'path' / 'node:path' bare; process.argv[d] (an own file)
    const bare = code.replace(/'[^'\n]*'/g, "''");
    const fsWords = (bare.match(/\bfs\b/g) ?? []).length;
    const calls = [...code.matchAll(FS_CALL)];
    const viaBare = calls.filter((c) => /^\s*fs\b/.test(c[0])).length;
    if (fsWords !== viaBare) return 'point 10 (ii): `fs` used other than as fs.readFileSync(...) / fs.existsSync(...)';
    let nRequire = 0;
    for (const rq of code.matchAll(/\brequire\b\s*(\()?([^)]*)/g)) {
        nRequire++;
        const arg = (rq[2] ?? '').trim();
        if (!rq[1]) return 'point 10 (iii): require used as a value';
        if (/^'(?:node:)?path'$/.test(arg)) continue;
        if (/^'(?:node:)?fs'$/.test(arg)) continue;                     // its dereference is checked with the fs calls below
        if (/^process\.argv\[\d\]$/.test(arg)) { if (!argvOk(arg)) return `point 10 (iii): ${arg} is not a trailing argument naming an own file`; continue; }
        return `point 10 (iii): require(${arg.slice(0, 30)}) of something other than fs / path / process.argv[<digit>]`;
    }
    const fsRequires = [...code.matchAll(/\brequire\s*\(\s*'(?:node:)?fs'\s*\)/g)].length;
    if (fsRequires !== calls.length - viaBare) return "point 10 (ii): require('fs') other than directly dereferenced as .readFileSync(...) / .existsSync(...)";
    void nRequire;
    for (const c of calls) {
        if (c[1] !== 'readFileSync' && c[1] !== 'existsSync') return `point 10 (ii): fs.${c[1]} (only readFileSync / existsSync)`;
        const first = c[2].trim();
        const lit = /^'([^']*)'$/.exec(first);
        if (lit) { if (lit[1] !== files.verdicts && lit[1] !== files.pairs) return `point 10 (ii): fs.${c[1]}'s first argument names '${lit[1].slice(0, 40)}', not the own verdicts / pairs file`; }
        else if (!argvOk(first)) return `point 10 (ii): fs.${c[1]}'s first argument is not a literal own-file name or a trailing process.argv[<digit>] (${first.slice(0, 40)})`;
    }
    return null;
}

/** The text of a transcript's first user message (string or text blocks), or null. */
export function firstUserText(text) {
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        if (j?.type !== 'user') continue;
        const c = j.message?.content;
        const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x) => x?.type === 'text').map((x) => x.text).join('') : '';
        if (t) return t;
    }
    return null;
}
export const dispatchTemplate = (file = DISPATCH_FILE) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split(DISPATCH_MARK)[1]?.trim();
/** null when `msg` is the dispatch template with only <PAIRS_FILE>, <VERDICTS_FILE> and the tag substituted (own paths, own tag); else why not. */
export function dispatchProblem(msg, template, { blindDir, files, tag }) {
    if (msg == null) return 'no first user message';
    const t = msg.replace(/\r\n/g, '\n').trim();
    const pm = /^<PAIRS_FILE> = (.+)$/m.exec(t), vm = /^<VERDICTS_FILE> = (.+)$/m.exec(t), tm = /reply with ONLY: the tag `([^`]+)`/.exec(t);
    if (!pm || !vm || !tm) return 'the substituted lines are not there';
    if (norm(pm[1].trim(), blindDir) !== norm(files.pairs, blindDir) || norm(vm[1].trim(), blindDir) !== norm(files.verdicts, blindDir) || tm[1] !== tag) return 'the pairs / verdicts path or the tag is not the own one';
    const expected = template.replace('RUN\\<pairs file>', () => pm[1]).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${vm[1]}`).replace('`TAG`', () => `\`${tm[1]}\``);
    return t === expected.trim() ? null : 'the text differs from the dispatch text';
}

/**
 * The audit of one transcript text: { tools, touched, flags, bash: ['<len>:<sha12>'], dispatch: 'match'|'DIFFERS'|'off' }.
 * ctx: { tag, blindDir, rubric, allowValidationBash, dispatch: template string | null }.
 */
export function auditText(text, { tag, blindDir = DEFAULT_BLIND_DIR, rubric = RUBRIC, allowValidationBash = false, dispatch = null }) {
    const touched = [], tools = {}, flags = [], bash = [];
    const files = ownFiles(tag.replace(/\.replaced$/, ''));
    // A2 point 15: Read of the own pairs file, the rubric / instruction file or the own verdicts file (a grader re-reads what it wrote); Write or Edit of the own verdicts file.
    const readOk = new Set([norm(files.pairs, blindDir), norm(rubric, blindDir), norm(files.verdicts, blindDir)]);
    const writeOk = new Set([norm(files.verdicts, blindDir)]);
    let denials = 0;
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const content = j?.message?.content;
        // A2 point 15: a call that Claude Code DENIED flags whatever its path. Seen in the transcript as a tool_result with is_error and a permission / denied message,
        // a toolDenialKind on the record (real denied Read, session f8d13b32), or a non-empty permission_denials list (the result JSON's field, if it was written in).
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
            else if (c.name === 'Read') { if (!fp || !readOk.has(norm(fp, blindDir))) flags.push(`Read outside the allowlist: ${String(fp).slice(0, 110)}`); }
            else if (c.name === 'Write' || c.name === 'Edit') { if (!fp || !writeOk.has(norm(fp, blindDir))) flags.push(`${c.name} outside the own verdicts file: ${String(fp).slice(0, 110)}`); }
            else if (c.name === 'Bash' && allowValidationBash) {
                const cmd = typeof inp.command === 'string' ? inp.command : '';
                const why = bashProblem(cmd, { blindDir, files });
                if (why) flags.push(`Bash[len=${cmd.length},sha12=${sha12(cmd)}] ${why}: ${cmd.replace(/\s+/g, ' ').slice(0, 110)}`);
                else bash.push(`${cmd.length}:${sha12(cmd)}`);
            } else if (c.name === 'Bash') flags.push(`Bash call (point 15: graders have no Bash)`);
            else flags.push(`TOOL OTHER THAN Read/Write/Edit${allowValidationBash ? '/validation Bash' : ''}: ${c.name}`);
        }
    }
    if (denials) flags.push(`${denials} call(s) DENIED by Claude Code (permission_denials / an is_error permission result)`);
    let disp = 'off';
    if (dispatch) {
        const why = dispatchProblem(firstUserText(text), dispatch, { blindDir, files, tag: tag.replace(/\.replaced$/, '') });
        disp = why ? 'DIFFERS' : 'match';
        if (why) flags.push(`DISPATCH TEXT DIFFERS from h40d-grader-dispatch.txt (${why})`);
    }
    return { tools, touched, flags, bash, dispatch: disp };
}

function main() {
    const argv = process.argv.slice(2);
    let projects = 'C:/Users/sotka/.claude/projects', session = null, allowValidationBash = false, blindDir = DEFAULT_BLIND_DIR, rubric = RUBRIC, dispatchFile = DISPATCH_FILE, checkDispatch = true;
    const items = [];
    const usage = (why) => { console.error(`audit-graders: ${why}\nusage: node audit-graders.mjs [--allow-validation-bash] [--blind-dir <C:/ path>] [--rubric <path>] [--dispatch <path>] [--no-dispatch-check] [--projects <dir>] [--session <id>] blind-N.gX=<agentId>|session:<uuid>|file:<C:/ path> ...`); process.exit(2); };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--allow-validation-bash') allowValidationBash = true;
        else if (a === '--no-dispatch-check') checkDispatch = false;
        else if (['--projects', '--session', '--blind-dir', '--rubric', '--dispatch'].includes(a)) {
            const v = argv[++i]; if (!v) usage(`${a} needs a value`);
            if (a === '--projects') projects = v; else if (a === '--session') session = v; else if (a === '--blind-dir') blindDir = v; else if (a === '--rubric') rubric = v; else dispatchFile = v;
        } else if (a.startsWith('--')) usage(`unknown option ${a}`);
        else {
            const m = /^(blind-\d+\.g\d(?:\.replaced)?)=(?:(session|file):(.+)|(?:agent-)?([A-Za-z0-9]{8,40}))$/.exec(a);
            if (!m) usage(`"${a}" is not blind-N.gX=<agentId> | session:<uuid> | file:<C:/ path>`);
            if (m[2] === 'file' && !/^[A-Za-z]:[\\/]/.test(m[3])) usage(`file:${m[3]} is not a C:/ path (a /c/... path is not readable by node)`);
            items.push(m[2] ? { tag: m[1], kind: m[2], v: m[3] } : { tag: m[1], kind: 'agent', v: m[4] });
        }
    }
    if (!items.length) usage('nothing to audit');
    if (!/^[A-Za-z]:[\\/]/.test(blindDir)) usage(`--blind-dir ${blindDir} is not a C:/ path`);
    const dirs = (p) => { try { return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; } };
    const find = ({ kind, v }) => {
        if (kind === 'file') return fs.existsSync(v) ? v : null;
        for (const slug of dirs(projects)) {
            if (kind === 'session') { const f = path.join(projects, slug, `${v}.jsonl`); if (fs.existsSync(f)) return f; }
            else for (const sess of session ? [session] : dirs(path.join(projects, slug))) { const f = path.join(projects, slug, sess, 'subagents', `agent-${v}.jsonl`); if (fs.existsSync(f)) return f; }
        }
        return null;
    };
    let template = null;
    if (checkDispatch) { try { template = dispatchTemplate(dispatchFile); } catch (e) { usage(`cannot read the dispatch text ${dispatchFile}: ${e.message}`); } if (!template) usage(`${dispatchFile} holds no "${DISPATCH_MARK.trim()}" marker`); }
    let flaggedAny = false;
    for (const it of items) {
        const f = find(it);
        if (!f) { console.log(`${it.tag}: transcript NOT FOUND (${it.kind}:${it.v}) -> cannot audit`); flaggedAny = true; continue; }
        const r = auditText(fs.readFileSync(f, 'utf8'), { tag: it.tag, blindDir, rubric, allowValidationBash, dispatch: template });
        flaggedAny ||= r.flags.length > 0;
        const toolSummary = Object.entries(r.tools).map(([k, n]) => `${k}x${n}`).join(' ') || 'none';
        console.log(`${it.tag} (${it.v.slice(0, 18)}): ${r.touched.length} tool inputs [${toolSummary}]; ${r.flags.length ? `FLAGGED ${r.flags.length}: ${r.flags.join(' | ')}` : 'clean'}; bash=[${r.bash.join(',')}]; dispatch=${r.dispatch}`);
    }
    console.log(flaggedAny ? 'AUDIT: FLAGGED (see lines above)' : 'AUDIT: all graders clean');
    process.exitCode = flaggedAny ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
