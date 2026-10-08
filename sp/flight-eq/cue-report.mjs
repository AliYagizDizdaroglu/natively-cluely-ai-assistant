// E\cue-report.mjs (A4 "Counts-only cue reporting"): wrapper that re-points h40d's cue instruments at a run folder.
// Fix round 2026-10-06 per cue-report-review.md (B1, I1, I2, I4, m4, m5).
//
//   node cue-report.mjs <smoke|facts|twins|thoughts|all> <run-dir> --export <cues-export-eq.json> [-- <extra args for the tool>]
//
// The instruments are NOT edited; each is run as a child process (no model call, no write inside MAIN, run folder read-only):
//   smoke    SP\check-smoke-cues.mjs v4 <label> --runs <parent>   (label = the folder's name after its timestamp; the summary says
//                                                              INSTRUMENT FAILED if the instrument read another folder)
//   facts    SP\cue-group\smoke-facts.mjs <run-dir>
//   twins    SP\validation-hour\h40d-twins.mjs <run-dir>          (extra args: --strict, --dist, --cue/--control ...)
//   thoughts SP\validation-hour\h40d-thoughts-noise.mjs <run-dir> (extra args: --exclude, --threshold ...)
// --export is REQUIRED (refused without it, exit 2). The export is loaded and validated before any instrument runs; every error
// prints a class and file:line only, never a parser message.
// The tool's FULL output (stdout, stderr, exit code) goes to E\cue-report\<run>.<tool>.full.txt: never printed, never committed.
// stdout carries only the COUNTS-ONLY summary (also written to E\cue-report\<run>.<tool>.summary.txt). smoke and facts summaries
// are built from lines whose shape is known to hold no cue text, answer or prompt; twins and thoughts are passed through (their
// own header: ids and numbers only). EVERY summary is leak-checked against the export's cues + the run log's cue / trim strings
// + the full outputs in E\cue-report\ (cue-leak-check.mjs); a summary with leak >= 1 is withheld (no summary file).
// An instrument exiting outside its readings, or with a crash signature, gives `<tool> ... INSTRUMENT FAILED`, no summary.
// Exit: 0 all ran | 2 usage / refusal | 3 an instrument FAILED | 4 crash of this wrapper | 5 a summary was WITHHELD.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leakCount, loadKnown, Refusal, describe } from './cue-leak-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const OUT = path.join(HERE, 'cue-report');
const TOOLS = {
    smoke: path.join(SP, 'check-smoke-cues.mjs'),
    facts: path.join(SP, 'cue-group', 'smoke-facts.mjs'),
    twins: path.join(SP, 'validation-hour', 'h40d-twins.mjs'),
    thoughts: path.join(SP, 'validation-hour', 'h40d-thoughts-noise.mjs'),
};
const clip = (s) => (s.length > 300 ? `${s.slice(0, 300)}...` : s);

// ---- summary builders: input = the tool's full stdout lines, output = counts-only lines ----
function summarySmoke(lines, dirName) {
    const o = [];
    const head = lines.find((l) => l.startsWith(`${dirName}:`));
    if (!head) return [`smoke on ${dirName}: INSTRUMENT FAILED (it read another folder or none)`];
    const m = head.match(/answers (\d+) \(real (\d+), failed (\d+)\), superseded (\d+), cue lines (\d+) \(expected ([\d-]+)\), malformed (\d+), block-only (\d+), trimmed (\d+)/);
    const verdict = lines.some((l) => l === 'CUE SMOKE CLEAN') ? 'CLEAN' : lines.some((l) => l === 'CUE SMOKE NOT CLEAN') ? 'NOT CLEAN' : 'NO VERDICT LINE';
    o.push(`check-smoke-cues v4 on ${dirName}: ${verdict}`);
    if (m) o.push(`  answers ${m[1]} (real ${m[2]}, failed ${m[3]}), superseded ${m[4]}, cue lines ${m[5]} (expected ${m[6]}); classes: malformed ${m[7]}, block-only ${m[8]}, trimmed ${m[9]}`);
    else o.push('  head line did not parse (see the full file)');
    const unparsable = lines.filter((l) => /^ {2}unparsable: /.test(l)).length;
    const mal = lines.filter((l) => /^ {2}malformed: /.test(l)).length;
    const hints = lines.filter((l) => /^ {2}hint: /.test(l)).length;
    o.push(`  malformed lines ${mal}, unparsable lines ${unparsable}, absent-block-before-failed hints ${hints}`);
    const won = lines.find((l) => /^ {2}hedge won by: /.test(l));
    if (won) o.push(clip(won.trim()));
    return o;
}

const SAFE_FACTS = [/^run \S+$/, /^log window /, /^cue blocks: \d+$/, /^shape: /, /^words per cue line: /, /^items with more than one block: /,
    /^cues trimmed lines: \d+$/, /^answers: full lines /, /^hedge: /, /^lines with "[^"]+": \d+$/, /^first token \(diag, this run\): /,
    /^dist now: /, /^- (PASS|FAIL) {2}(Answered hands-free|Long questions answered whole|Cue block above every spoken answer|Answer TTFT p90|Heard by either detector|Surfaced detections per question)/,
    /^\*\*GATE (PASSED|FAILED)/];
function summaryFacts(lines) {
    const o = [];
    for (const raw of lines) {
        const l = raw.trim();
        if (raw.startsWith(' ') && !/^ {2}(- (PASS|FAIL))/.test(raw)) continue;   // indented lines carry cue / answer text: parsed below, never copied
        if (SAFE_FACTS.some((r) => r.test(l))) o.push(clip(l));
    }
    // per-block counts by id, from `  hh:mm:ssZ  <id> n line(s), words a/b/c:  <cues>` (the text after the colon is never read)
    const blocks = lines.map((l) => l.match(/^ {2}\d\d:\d\d:\d\dZ {2}(\S+)\s+(?:(\d+) line\(s\), words ([\d/-]+):|UNPARSABLE)/)).filter(Boolean);
    const unparsable = blocks.filter((m) => m[2] === undefined);
    o.push(`block ids (id:lines:words): ${blocks.filter((m) => m[2] !== undefined).map((m) => `${m[1]}:${m[2]}:${m[3]}`).join(' ') || 'none'}`);
    o.push(`UNPARSABLE blocks: ${unparsable.length}${unparsable.length ? ` ids ${unparsable.map((m) => m[1]).join(' ')}` : ''}`);
    const trimmed = lines.map((l) => l.match(/^ {2}\d\d:\d\d:\d\dZ {2}(\S+)\s+\[([^\]]*)\]/)).filter(Boolean);
    o.push(`trimmed ids (id [kinds]): ${trimmed.map((m) => `${m[1]} [${m[2]}]`).join('; ') || 'none'}`);
    const failed = lines.map((l) => l.match(/^ {2}failed at \d\d:\d\d:\d\dZ {2}(\S+):/)).filter(Boolean);
    const sup = lines.map((l) => l.match(/^ {2}superseded at \d\d:\d\d:\d\dZ {2}(\S+)$/)).filter(Boolean);
    o.push(`failed answer ids: ${failed.map((m) => m[1]).join(' ') || 'none'}; superseded stream ids: ${sup.map((m) => m[1]).join(' ') || 'none'}`);
    return o;
}

// twins / thoughts print "ids, counts, lengths, stage names, finish reasons and token / ms numbers only" (their own header): every
// line is kept, clipped; the leak check is the guard on top.
const summaryPass = (name) => (lines, dirName, exit) => [`${name} on ${dirName}: instrument exit ${exit}`, ...lines.filter((l) => l.trim()).map(clip)];
const BUILD = { smoke: summarySmoke, facts: (l) => summaryFacts(l), twins: summaryPass('h40d-twins'), thoughts: summaryPass('h40d-thoughts-noise') };

// Exit codes an instrument may return WITH a reading in its stdout (anything else = INSTRUMENT FAILED, named, no summary):
//   smoke 0 clean / 1 not clean; facts 0; twins 0 PASS / 1 STOP / 3 INCOMPLETE (readings); thoughts 0.
const OK_EXIT = { smoke: [0, 1], facts: [0], twins: [0, 1, 3], thoughts: [0] };
const CRASH = /\n\s+at \S.*:\d+:\d+\)?\s*(\n|$)|INSTRUMENT ERROR|UnhandledPromiseRejection|Uncaught /;

// returns 0 ok, 2 refusal, 3 instrument failed, 5 summary withheld
function run(tool, dir, extra, exportPath) {
    const dirAbs = path.resolve(dir);
    const dirName = path.basename(dirAbs);
    let args;
    if (tool === 'smoke') {
        const m = dirName.match(/^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-(.+)$/);
        if (!m) { console.log(`REFUSED: ${dirName} is not <timestamp>-<label>`); return 2; }
        args = [m[1], '--runs', path.dirname(dirAbs), ...extra];
    } else args = [dirAbs, ...extra];
    const r = spawnSync(process.execPath, [TOOLS[tool], ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true });
    fs.mkdirSync(OUT, { recursive: true });
    const base = path.join(OUT, `${dirName}.${tool}`);
    fs.rmSync(`${base}.summary.txt`, { force: true });             // a failed run never leaves an older summary behind
    let sum, code = 0;
    if (r.error) { sum = [`${tool} on ${dirName}: INSTRUMENT FAILED (could not run: ${r.error.code ?? 'error'})`]; code = 3; }
    else {
        fs.writeFileSync(`${base}.full.txt`, `${r.stdout}\n--- stderr ---\n${r.stderr}\n--- exit ${r.status}\n`);
        const crash = CRASH.test(r.stderr ?? '') || CRASH.test(r.stdout ?? '');
        if (!OK_EXIT[tool].includes(r.status) || crash) {
            sum = [`${tool} on ${dirName}: INSTRUMENT FAILED (exit ${r.status}${crash ? ', crash signature' : ''}); no summary built, see ${path.basename(base)}.full.txt`]; code = 3;
        } else {
            sum = BUILD[tool](r.stdout.split(/\r?\n/), dirName, r.status);
            if (sum[0]?.includes('INSTRUMENT FAILED')) code = 3;
        }
    }
    const text = `${sum.join('\n')}\n`;
    const n = leakCount(loadKnown(exportPath), text);              // the known set is re-read now: it includes this run's full outputs
    if (n > 0) { console.log(`${tool} on ${dirName}: WITHHELD leak ${n}; full output in ${path.basename(base)}.full.txt`); return 5; }
    fs.writeFileSync(`${base}.summary.txt`, text);
    process.stdout.write(text);
    console.log('(leak-checked against the export, its log and the full outputs: leak 0)');
    return code;
}

function main() {
    const argv = process.argv.slice(2);
    const sep = argv.indexOf('--');
    const extra = sep >= 0 ? argv.slice(sep + 1) : [];
    const own = sep >= 0 ? argv.slice(0, sep) : argv;
    const [which, dir] = own;
    const ei = own.indexOf('--export');
    if (!which || !dir || !(which === 'all' || TOOLS[which]) || ei < 0 || !own[ei + 1]) {
        console.log('usage: node cue-report.mjs <smoke|facts|twins|thoughts|all> <run-dir> --export <cues-export-eq.json> [-- extra tool args]  (--export is required)');
        return 2;
    }
    if (which === 'all' && extra.length) { console.log('REFUSED: extra tool args cannot be combined with `all`; run each tool separately'); return 2; }
    const exportPath = own[ei + 1];
    // B1: the export (and the log it names) is loaded and validated BEFORE any instrument runs; an error is a class and a file:line.
    try { loadKnown(exportPath); } catch (e) { console.log(describe(e instanceof Refusal ? e : new Refusal('export-unreadable'))); return 2; }
    if (!fs.existsSync(dir)) { console.log('REFUSED: run dir does not exist'); return 2; }
    if ((which === 'smoke' || which === 'facts' || which === 'all') && !fs.existsSync(path.join(dir, 'natively_debug.log'))) { console.log('REFUSED: run dir has no natively_debug.log'); return 2; }
    let worst = 0;
    for (const t of which === 'all' ? Object.keys(TOOLS) : [which]) {
        console.log(`== ${t}`);
        const c = run(t, dir, extra, exportPath);
        worst = c === 5 ? 5 : worst === 5 ? 5 : Math.max(worst, c);
    }
    return worst;
}
process.on('uncaughtException', (e) => { console.log(describe(e)); process.exit(4); });
process.exit(main());
