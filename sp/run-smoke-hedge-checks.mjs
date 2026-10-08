/**
 * Runs check-smoke-hedge.mjs over all four launch-smoke-hedge.cmd segments in one pass, so the
 * controller never has to re-derive each segment's --since/--until/--debug-log/--extra-log by
 * hand (h40c task-7-rereview.md NEW-I1).
 *
 * For each segment this:
 *   1. Reads that segment's own start instant from line 2 of its segment log (the ISO line
 *      launch-smoke-hedge.cmd writes right after the "=== HEDGE SMOKE n ===" header) - this is
 *      --since.
 *   2. Sets --until to the NEXT segment's own line-2 instant, so a check never reads a later
 *      segment's lines out of the shared, append-only verbal-diag.log (the last segment has no
 *      next one and so no --until - nothing was appended after it anyway).
 *   3. Passes that segment's own natively_debug.log copy (--debug-log, always required), the
 *      shared verbal-diag.log (--diag-log, required for forced/default/off), that segment's own
 *      app-start.log copy or, for refuse, refuse-probe.mjs's child.log (--extra-log, optional -
 *      missing is noted, not fatal), and, for refuse only, its segment log itself
 *      (--segment-log, required there).
 *   4. Runs check-smoke-hedge.mjs and records its exit code (0 PASS, 1 FAIL, 2 usage error,
 *      3 INCONCLUSIVE) and full output.
 *
 * Clip counts (NEW-C1/I1) match launch-smoke-hedge.cmd's own roster: forced and default each
 * play S1Q06, S2Q10, S2Q07 (3 clips); off plays S1Q06 alone (1 clip); refuse needs no clip count
 * (check-smoke-hedge.mjs does not ask for one in that mode).
 *
 * FIX ROUND 3 (task-7-rereview2.md):
 *   NEW2-I1  The roll-up used to allow-list the bad verdicts ('ERROR', 'FAIL'), which missed
 *           exitLabel's own `ERROR(exit N)` strings entirely - a checker usage error (exit 2) or
 *           a killed process (a null exit code) read as neither bad nor inconclusive and fell
 *           through to OVERALL: PASS with nothing actually checked. Now fails CLOSED: anything
 *           that is not the literal string 'PASS' or 'INCONCLUSIVE' is bad, by name.
 *
 * Usage:
 *   node run-smoke-hedge-checks.mjs [repo-root]
 * repo-root defaults to the current working directory (matching launch-smoke-hedge.cmd's own
 * convention of being run from the repo root). Output is both printed and written to
 * smoke-hedge-checks.txt next to this script.
 *
 * Exit code: 0 if every segment that could run came back PASS, 1 otherwise (any FAIL, any
 * segment that could not even be checked, or any INCONCLUSIVE) - mirrors check-smoke-hedge.mjs's
 * own FAIL > INCONCLUSIVE > PASS priority, rolled up across segments.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK_SCRIPT = path.join(HERE, 'check-smoke-hedge.mjs');
const OUT_FILE = path.join(HERE, 'smoke-hedge-checks.txt');

const REPO = path.resolve(process.argv[2] || process.cwd());
const RUNS = path.join(REPO, 'electron', 'test', 'golden', 'interview60.runs');
const DIAG_LOG = path.join(REPO, 'verbal-diag.log');

// Order matters: --until for segment N is segment N+1's own since (step 2 above).
const SEGMENTS = [
    { mode: 'forced', log: 'smoke-hedge-forced.log', debug: 'smoke-hedge-forced.natively_debug.log', extra: 'smoke-hedge-forced.app-start.log', clips: 3 },
    { mode: 'default', log: 'smoke-hedge-default.log', debug: 'smoke-hedge-default.natively_debug.log', extra: 'smoke-hedge-default.app-start.log', clips: 3 },
    { mode: 'off', log: 'smoke-hedge-off.log', debug: 'smoke-hedge-off.natively_debug.log', extra: 'smoke-hedge-off.app-start.log', clips: 1 },
    { mode: 'refuse', log: 'smoke-hedge-refuse.log', debug: 'smoke-hedge-refuse.natively_debug.log', extra: 'smoke-hedge-refuse.child.log', clips: null },
];

function readSinceIso(logPath) {
    if (!fs.existsSync(logPath)) return { error: `segment log not found: ${logPath}` };
    const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
    const line2 = lines[1];
    if (!line2 || !Number.isFinite(Date.parse(line2.trim()))) {
        return { error: `segment log's line 2 is not a parseable ISO instant: ${JSON.stringify(line2)} (${logPath})` };
    }
    return { since: line2.trim() };
}

function exitLabel(code) {
    if (code === 0) return 'PASS';
    if (code === 1) return 'FAIL';
    if (code === 3) return 'INCONCLUSIVE';
    return `ERROR(exit ${code})`;
}

function runOne(seg, sinceMs, nextSinceIso) {
    const debugPath = path.join(RUNS, seg.debug);
    const segLogPath = path.join(RUNS, seg.log);
    const extraPath = path.join(RUNS, seg.extra);
    const lines = [];
    lines.push(`--- segment ${seg.mode} ---`);

    if (!fs.existsSync(debugPath)) {
        lines.push(`SEGMENT ${seg.mode}: ERROR - debug log copy not found: ${debugPath}`);
        return { mode: seg.mode, verdict: 'ERROR', lines };
    }

    const argv = [CHECK_SCRIPT, seg.mode, sinceMs];
    argv.push('--debug-log', debugPath);
    if (seg.mode !== 'refuse') {
        argv.push('--diag-log', DIAG_LOG);
        argv.push('--clips', String(seg.clips));
    }
    if (fs.existsSync(extraPath)) {
        argv.push('--extra-log', extraPath);
    } else {
        lines.push(`note: extra log not found, running without it: ${extraPath}`);
    }
    if (seg.mode === 'refuse') {
        if (!fs.existsSync(segLogPath)) {
            lines.push(`SEGMENT ${seg.mode}: ERROR - segment log not found (required for refuse): ${segLogPath}`);
            return { mode: seg.mode, verdict: 'ERROR', lines };
        }
        argv.push('--segment-log', segLogPath);
    }
    if (nextSinceIso) argv.push('--until', nextSinceIso);

    lines.push(`command: node ${argv.join(' ')}`);
    const result = spawnSync(process.execPath, argv, { encoding: 'utf8' });
    if (result.error) {
        lines.push(`SEGMENT ${seg.mode}: ERROR - could not run check-smoke-hedge.mjs: ${result.error.message}`);
        return { mode: seg.mode, verdict: 'ERROR', lines };
    }
    if (result.stdout) lines.push(result.stdout.trimEnd());
    if (result.stderr) lines.push(result.stderr.trimEnd());
    const verdict = exitLabel(result.status);
    lines.push(`SEGMENT ${seg.mode}: ${verdict} (exit ${result.status})`);
    return { mode: seg.mode, verdict, lines };
}

function main() {
    const out = [];
    out.push(`smoke-hedge-checks  repo=${REPO}  run-at=${new Date().toISOString()}`);

    const sinceResults = SEGMENTS.map((seg) => readSinceIso(path.join(RUNS, seg.log)));
    const results = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
        const seg = SEGMENTS[i];
        const sr = sinceResults[i];
        if (sr.error) {
            out.push(`--- segment ${seg.mode} ---`);
            out.push(sr.error);
            out.push(`SEGMENT ${seg.mode}: ERROR (exit n/a)`);
            results.push({ mode: seg.mode, verdict: 'ERROR' });
            continue;
        }
        const next = sinceResults[i + 1];
        const nextSince = next && !next.error ? next.since : null;
        const r = runOne(seg, sr.since, nextSince);
        out.push(...r.lines);
        results.push(r);
    }

    // NEW2-I1 (task-7-rereview2.md): fail CLOSED - anything that is not a confirmed PASS or
    // INCONCLUSIVE is bad, by name, not by an allow-list of the bad labels seen so far. The old
    // allow-list (`'ERROR' || 'FAIL'`) missed exitLabel's own `ERROR(exit N)` strings (a checker
    // usage error, or any future required flag the runner forgets to pass) and would have let a
    // segment nothing actually checked read as a free PASS.
    const bad = results.filter((r) => r.verdict !== 'PASS' && r.verdict !== 'INCONCLUSIVE');
    const inconclusive = results.filter((r) => r.verdict === 'INCONCLUSIVE');
    let overall;
    if (bad.length > 0) overall = 'FAIL';
    else if (inconclusive.length > 0) overall = 'INCONCLUSIVE';
    else overall = 'PASS';
    out.push('---');
    out.push(`OVERALL: ${overall}  (${results.map((r) => `${r.mode}=${r.verdict}`).join(', ')})`);

    const text = out.join('\n') + '\n';
    console.log(text);
    fs.writeFileSync(OUT_FILE, text);
    process.exit(overall === 'PASS' ? 0 : 1);
}

main();
