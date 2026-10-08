// Audit of grader transcripts (PREREGISTER-turn-followup.md section 1 + AMENDMENT A2 point 1): an ALLOWLIST over every tool use of a grader.
// Tool NAME and the tool input's path/command only, never the content a tool returned. A grader is clean iff EVERY tool call is allowed:
//
//   without --allow-validation-bash (section 1's text):  Read and Write only, each on an allowed path;
//   with --allow-validation-bash (A2 point 1; what the day uses):
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
// A2 point 14 (controller 23:45; PREP-REVIEW-3 I-1): the `node -e` code is judged by an ALLOWLIST, not a banned-word list. Point 10's word list missed a loader
// reached through a name built at run time on a global object (globalThis['req'+'uire']). Now every token of the code must be admitted:
//   identifiers    only CODE_IDENTS = the identifiers of the 8 real design-2 s50l validation commands and the pilot's (sha12 b271cca9e127), FROZEN here before
//                  any data, plus the declared validation vocabulary; none of the BANNED_WORDS anywhere (identifiers or inside string literals);
//   punctuation    a fixed set; `/` (a regex literal, a comment, a division) and `~ ^ # @ \` are not in it; no template literal, backtick or `$` (SHAPE);
//   string literals the own verdicts / pairs file name, 'fs', 'utf8', 'utf-8', or a message of at most 40 characters with none of . / \ :  (no + next to one);
//   computed access  x[...] only with a numeric literal or ONE allowlisted identifier as the index, and never on process / require / fs / a global name or
//                  on a call result (process.argv[<digit>], the one allowed use of process, is checked with `process`);
//   require        require('fs') or require(process.argv[<digit>]) only; `fs` / a direct require('fs') only as the one binding `const|let|var fs=require('fs')`
//                  or immediately followed by .readFileSync( / .existsSync( whose FIRST argument is an own-file literal or process.argv[<digit>];
//   process        only process.exit / process.stdout / process.stderr / process.argv[<digit>] (the digit naming an existing trailing <arg>, 1..n).
// Beyond the brief (it can only flag MORE): `](` and `)(` (calling a computed or called result), `new` only of Set / Error / Array.
// Known ceiling: an index identifier holding a string built at run time from variables (const k=a+b) is not tracked; see the report.
const DECLARED_VOCABULARY = 'JSON parse stringify Object keys values entries length every some filter map forEach reduce includes indexOf push join split trim Array isArray Number isInteger isFinite String Set size has add console log error typeof undefined null true false const let var function return if else for of in new throw Error process argv exit stdout stderr write require readFileSync existsSync fs o v k x i n e r ok bad missing err'.split(' ');
const REAL_COMMAND_IDENTIFIERS = 'a b c correctness f items key ks on_topic p s'.split(' ');   // in the 8 real s50l commands + the pilot's, beyond the vocabulary above
export const CODE_IDENTS = new Set([...DECLARED_VOCABULARY, ...REAL_COMMAND_IDENTIFIERS]);
const BANNED_WORDS = ['this', 'globalThis', 'global', 'window', 'self', 'constructor', 'prototype', '__proto__', 'Reflect', 'Proxy', 'Function', 'eval', 'import', 'module', 'exports', 'Buffer', 'fromCharCode'];
const KEYWORDS = new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'of', 'in', 'new', 'throw', 'typeof']);
const GLOBAL_NAMES = new Set(['process', 'require', 'fs', 'JSON', 'Object', 'Array', 'Number', 'String', 'Set', 'Error', 'console', 'undefined']);
const PUNCT = ['===', '!==', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '++', '--', '+=', '-=', '*=', '%='];
const PUNCT1 = '{}()[];,.=<>+-*%!?:&|';

/** Tokens { t: 'i' | 's' | 'n' | 'p', v } of the code, or a reason string. */
function lexCode(code) {
    const T = [];
    for (let i = 0; i < code.length;) {
        const ch = code[i];
        if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') { i++; continue; }
        if (ch === "'") {
            const j = code.indexOf("'", i + 1), nl = code.indexOf('\n', i + 1);
            if (j < 0 || (nl >= 0 && nl < j)) return 'an unterminated string literal';
            T.push({ t: 's', v: code.slice(i + 1, j) }); i = j + 1; continue;
        }
        const num = /^\d+(?:\.\d+)?/.exec(code.slice(i, i + 40));
        if (num) { T.push({ t: 'n', v: num[0] }); i += num[0].length; continue; }
        const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(code.slice(i, i + 80));
        if (id) { T.push({ t: 'i', v: id[0] }); i += id[0].length; continue; }
        const p = PUNCT.find((q) => code.startsWith(q, i)) ?? (PUNCT1.includes(ch) ? ch : null);
        if (!p) return `the character ${JSON.stringify(ch)} (a regex literal, a comment, a template literal, a division and ~ ^ # @ are not admitted)`;
        T.push({ t: 'p', v: p }); i += p.length;
    }
    return T;
}

/** null when the `node -e` code is admitted by the A2 point 14 allowlist (+ the point 10 structure it keeps), else the reason. argvMax = the number of trailing <arg>s. */
export function codeProblem(code, { files, argvMax }) {
    const T = lexCode(code);
    if (typeof T === 'string') return T;
    const own = new Set([files.verdicts, files.pairs]);
    const isP = (t, v) => t?.t === 'p' && t.v === v;
    const isI = (t, v) => t?.t === 'i' && (v === undefined || t.v === v);
    const valueEnd = (t) => !!t && (((t.t === 'i') && !KEYWORDS.has(t.v)) || t.t === 'n' || t.t === 's' || isP(t, ')') || isP(t, ']'));
    const open = new Map(), stack = [];
    for (let j = 0; j < T.length; j++) {
        if (isP(T[j], '[')) stack.push(j);
        else if (isP(T[j], ']')) { if (!stack.length) return 'an unbalanced ]'; open.set(j, stack.pop()); }
    }
    if (stack.length) return 'an unbalanced [';
    const argvDigit = (j) => isP(T[j], '[') && T[j + 1]?.t === 'n' && /^\d$/.test(T[j + 1].v) && isP(T[j + 2], ']') && Number(T[j + 1].v) >= 1 && Number(T[j + 1].v) <= argvMax;
    for (let j = 0; j < T.length; j++) {
        const t = T[j], prev = T[j - 1], next = T[j + 1];
        if (t.t === 'i') {
            if (BANNED_WORDS.includes(t.v)) return `the word ${t.v} is banned (A2 point 14)`;
            if (!CODE_IDENTS.has(t.v)) return `the identifier ${t.v} is not in the frozen allowlist (A2 point 14)`;
            if (t.v === 'new' && !(isI(next) && ['Set', 'Error', 'Array'].includes(next.v))) return 'new of something other than Set / Error / Array';
            if (t.v === 'process') {
                if (isP(prev, '.')) return 'process reached as a property';
                if (!isP(next, '.') || T[j + 2]?.t !== 'i') return 'process used other than as process.exit / .stdout / .stderr / .argv[<digit>]';
                const m = T[j + 2].v;
                if (m === 'argv') { if (!argvDigit(j + 3)) return `process.argv[<digit>] must index an existing trailing argument (1..${argvMax}); process.argv[0] is the node binary`; }
                else if (m !== 'exit' && m !== 'stdout' && m !== 'stderr') return `process.${m} (only exit / stdout / stderr / argv[<digit>])`;
            } else if (t.v === 'require') {
                if (isP(prev, '.')) return 'require reached as a property';
                if (!isP(next, '(')) return 'require used as a value';
                const lit = T[j + 2]?.t === 's' && T[j + 2].v === 'fs' && isP(T[j + 3], ')');
                const viaArgv = isI(T[j + 2], 'process') && isP(T[j + 3], '.') && isI(T[j + 4], 'argv') && argvDigit(j + 5) && isP(T[j + 8], ')');
                if (!lit && !viaArgv) return "require(...) of something other than require('fs') or require(process.argv[<digit>]) naming an own file";
                if (lit) {
                    const binding = ['const', 'let', 'var'].includes(T[j - 3]?.v) && isI(T[j - 2], 'fs') && isP(prev, '=');
                    const call = isP(T[j + 4], '.') && (isI(T[j + 5], 'readFileSync') || isI(T[j + 5], 'existsSync')) && isP(T[j + 6], '(');
                    if (!binding && !call) return "require('fs') other than as the binding const fs=require('fs') or directly dereferenced as .readFileSync( / .existsSync(";
                }
            } else if (t.v === 'fs') {
                if (isP(prev, '.')) return 'fs reached as a property';
                const binding = ['const', 'let', 'var'].includes(prev?.v) && isP(next, '=') && isI(T[j + 2], 'require') && isP(T[j + 3], '(') && T[j + 4]?.v === 'fs' && isP(T[j + 5], ')');
                const call = isP(next, '.') && (isI(T[j + 2], 'readFileSync') || isI(T[j + 2], 'existsSync')) && isP(T[j + 3], '(');
                if (!binding && !call) return 'fs used other than as the binding const fs=require(\'fs\') or fs.readFileSync( / fs.existsSync(  (no alias, no argument, no computed access)';
            } else if (t.v === 'readFileSync' || t.v === 'existsSync') {
                const viaFs = isP(prev, '.') && (isI(T[j - 2], 'fs') || (isP(T[j - 2], ')') && T[j - 3]?.t === 's' && T[j - 3].v === 'fs' && isP(T[j - 4], '(') && isI(T[j - 5], 'require')));
                if (!viaFs || !isP(next, '(')) return `${t.v} other than as a call on fs / require('fs')`;
                const a = T[j + 2];
                const argOk = (a?.t === 's' && own.has(a.v) && (isP(T[j + 3], ',') || isP(T[j + 3], ')'))) || (isI(a, 'process') && isP(T[j + 3], '.') && isI(T[j + 4], 'argv') && argvDigit(j + 5) && (isP(T[j + 8], ',') || isP(T[j + 8], ')')));
                if (!argOk) return `${t.v}'s first argument is not an own-file literal or process.argv[<digit>] naming a trailing argument`;
            }
        } else if (t.t === 's') {
            const bw = BANNED_WORDS.find((w) => t.v.includes(w));
            if (bw) return `the word ${bw} inside the string literal '${t.v.slice(0, 40)}'`;
            if (!own.has(t.v) && t.v !== 'fs' && t.v !== 'utf8' && t.v !== 'utf-8' && (t.v.length > 40 || /[./\\:]/.test(t.v))) return `the string literal '${t.v.slice(0, 40)}' is not an own-file name, fs, utf8 or a short message without . / \\ :`;
            if (isP(prev, '+') || isP(next, '+')) return 'a + adjacent to a string literal (string building)';
        } else if (t.t === 'p') {
            if (t.v === '.' && !(isI(next) && valueEnd(prev))) return 'a . that is not a member access by name';
            if ((t.v === '(' && (isP(prev, ')') || isP(prev, ']'))) ) return 'a call of a called / computed result: )( or ]( ';
            if (t.v === '[' && valueEnd(prev)) {                          // computed member access
                const idx = T.slice(j + 1, [...open].find(([c, o]) => o === j)[0]);
                const isArgv = isI(prev, 'argv') && isP(T[j - 2], '.') && isI(T[j - 3], 'process');
                if (!isArgv) {
                    if (!(idx.length === 1 && (idx[0].t === 'n' || (idx[0].t === 'i' && CODE_IDENTS.has(idx[0].v) && !KEYWORDS.has(idx[0].v) && !GLOBAL_NAMES.has(idx[0].v))))) return 'computed access x[...] only with a numeric literal or ONE allowlisted identifier as the index';
                    let p = j - 1, root = null;
                    for (;;) {
                        const q = T[p];
                        if (!q) break;
                        if (isP(q, ']')) { p = open.get(p) - 1; continue; }
                        if (isP(q, ')')) return 'computed access on a call result';
                        if (q.t === 'i') { if (isP(T[p - 1], '.')) { p -= 2; continue; } root = q.v; }
                        break;
                    }
                    if (root !== null && GLOBAL_NAMES.has(root)) return `computed access on ${root} (never on process / require / fs / a global name)`;
                }
            }
        }
    }
    return null;
}

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
    const bad = codeProblem(code, { files, argvMax: trailing.length });
    if (bad) return `point 14: ${bad}`;
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
    const readOk = new Set([norm(files.pairs, blindDir), norm(rubric, blindDir)]);
    const writeOk = new Set([norm(files.verdicts, blindDir)]);
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const content = j?.message?.content;
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
            else if (c.name === 'Write' || (c.name === 'Edit' && allowValidationBash)) { if (!fp || !writeOk.has(norm(fp, blindDir))) flags.push(`${c.name} outside the own verdicts file: ${String(fp).slice(0, 110)}`); }
            else if (c.name === 'Bash' && allowValidationBash) {
                const cmd = typeof inp.command === 'string' ? inp.command : '';
                const why = bashProblem(cmd, { blindDir, files });
                if (why) flags.push(`Bash[len=${cmd.length},sha12=${sha12(cmd)}] ${why}: ${cmd.replace(/\s+/g, ' ').slice(0, 110)}`);
                else bash.push(`${cmd.length}:${sha12(cmd)}`);
            } else flags.push(`TOOL OTHER THAN Read/Write${allowValidationBash ? '/Edit/validation Bash' : ''}: ${c.name}`);
        }
    }
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
