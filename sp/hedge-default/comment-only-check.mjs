// Throwaway (scratchpad only): prove that an edited TypeScript or JavaScript file differs from its original in comments (and
// whitespace) only, with three independent checks, and calibrate the checks on known-good and known-bad edits first.
//   node comment-only-check.mjs <orig file> <edited file> [--calib <calib.json>]
// calib.json: { "negatives": { "label": ["text in orig", "code-changing replacement"] }, "positives": { "label": [..., "comment/whitespace replacement"] } }
// every "text in orig" must occur exactly once in the ORIGINAL file, or the calibration stops (a mutant that did not apply proves nothing).
// Check 1: TypeScript's own printer with removeComments over the parsed AST (the file "with comments stripped").
// Check 2: the parser's leaf-token stream, trivia and JSDoc skipped (a stricter view: it also sees semicolons and parentheses).
// Check 3: esbuild's transform, minified so every non-legal comment is dropped (a different implementation's output).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require = createRequire(MAIN + '/package.json');
const ts = require('typescript');
const esbuild = require('esbuild');

const [origPath, editedPath, ...rest] = process.argv.slice(2);
const calibIdx = rest.indexOf('--calib');
const calib = calibIdx >= 0 ? JSON.parse(fs.readFileSync(rest[calibIdx + 1], 'utf8')) : null;
const isJs = ['.mjs', '.js', '.cjs'].includes(path.extname(editedPath).toLowerCase());
const scriptKind = isJs ? ts.ScriptKind.JS : ts.ScriptKind.TS;
const virtualName = isJs ? 'x.mjs' : 'x.ts';

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const parse = (text) => ts.createSourceFile(virtualName, text, ts.ScriptTarget.Latest, true, scriptKind);
const parseErrors = (text) => parse(text).parseDiagnostics.length;
const astPrint = (text) => ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(parse(text));
const tokens = (text) => {
    const sf = parse(text);
    const out = [];
    const walk = (n) => {
        if (n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode) return;
        const ch = n.getChildren(sf);
        if (!ch.length) { out.push(`${n.kind}:${n.getText(sf)}`); return; }
        ch.forEach(walk);
    };
    walk(sf);
    return out.join('\n');
};
// minify drops every non-legal comment (esbuild otherwise keeps some leading comments, e.g. a method's docblock).
const esb = (text) => esbuild.transformSync(text, { loader: isJs ? 'js' : 'ts', legalComments: 'none', target: 'esnext', minify: true }).code;
const checks = { 'AST print, comments removed': astPrint, 'parser token stream (trivia + JSDoc skipped)': tokens, 'esbuild transform, minified': esb };

function compare(a, b) {
    const res = {};
    for (const [name, f] of Object.entries(checks)) {
        const fa = f(a), fb = f(b);
        res[name] = { same: fa === fb, a: sha(fa), b: sha(fb), len: fa.length };
    }
    return res;
}
const show = (label, res) => {
    console.log(label);
    for (const [name, r] of Object.entries(res)) console.log(`    ${r.same ? 'EQUAL    ' : 'DIFFERENT'}  ${name}  (${r.a} vs ${r.b}, ${r.len} chars)`);
};
const short = (p) => p.split(/[\\/]/).slice(-3).join('/');

const orig = fs.readFileSync(origPath, 'utf8');
const edited = fs.readFileSync(editedPath, 'utf8');
if (parseErrors(orig) || parseErrors(edited)) { console.log(`PARSE ERRORS: orig ${parseErrors(orig)}, edited ${parseErrors(edited)}: the AST checks would not mean much`); process.exit(3); }

let bad = 0;
if (calib) {
    const once = (text, from, to) => {
        const n = text.split(from).length - 1;
        if (n !== 1) throw new Error(`calibration anchor matched ${n} times, not 1: ${from}`);
        return text.replace(from, to);
    };
    console.log(`=== CALIBRATION on ${short(origPath)}: known-bad edits must be flagged by EVERY check, known-good edits by NONE`);
    for (const [label, [from, to]] of Object.entries(calib.negatives ?? {})) {
        const res = compare(orig, once(orig, from, to));
        show(`  ${label}`, res);
        if (Object.values(res).some((r) => r.same)) { console.log('  ** a check MISSED this code change'); bad++; }
    }
    for (const [label, [from, to]] of Object.entries(calib.positives ?? {})) {
        const res = compare(orig, once(orig, from, to));
        show(`  ${label}`, res);
        if (Object.values(res).some((r) => !r.same)) { console.log('  ** a check FLAGGED a comment/whitespace-only edit'); bad++; }
    }
    console.log(bad ? `CALIBRATION FAILED (${bad})` : `CALIBRATION OK (${Object.keys(calib.negatives ?? {}).length} known-bad, ${Object.keys(calib.positives ?? {}).length} known-good)`);
}

console.log(`=== THE EDIT: ${short(origPath)} (${orig.length} chars) vs ${short(editedPath)} (${edited.length} chars)`);
const real = compare(orig, edited);
show('  original vs edited', real);
const sameAll = Object.values(real).every((r) => r.same);
console.log(sameAll ? 'COMMENT-ONLY: all three checks say the code is identical' : 'NOT COMMENT-ONLY: at least one check found a code difference');
process.exit(bad || !sameAll ? 1 : 0);
