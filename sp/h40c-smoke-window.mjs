#!/usr/bin/env node
/**
 * h40c-smoke-window.mjs <runsDir> <diagLog> <outDir>
 *
 * Fix round 3, R3: blocking item 1 ("calibrate the hedge-mechanics script on a copy of the
 * smoke's own log") could not actually be carried out as originally written — the smoke harness
 * (launch-smoke-hedge.cmd, check-smoke-hedge.mjs) writes no interview60.timeline.json,
 * restarts the app once per segment (which RESETS natively_debug.log — main.ts truncates it on
 * every start), and never splits verbal-diag.log per segment (it is append-only, never reset,
 * so by the end of the 4-segment run it holds all four segments' lines concatenated).
 *
 * This script builds the one segment's worth of "run folder" the hedge-mechanics script
 * (h40c-hedge-stats.mjs) actually needs, from what the smoke harness really produces:
 *   - `<runsDir>/smoke-hedge-default.natively_debug.log` — the DEFAULT segment's own debug log
 *     (the per-segment copy launch-smoke-hedge.cmd makes right after that segment's app stops).
 *     Verified to carry the startup line `on trigger=5000ms` (the FORCED segment reads
 *     `on trigger=1ms` by design — reading the wrong segment here would silently mis-time
 *     everything downstream, so this is a hard fail, not a warning).
 *   - `<runsDir>/smoke-hedge-default.log` and `<runsDir>/smoke-hedge-off.log` — the launcher's
 *     OWN per-segment progress logs, whose SECOND LINE is a bare `Date().toISOString()` stamp
 *     printed right after each segment's app finished starting. The default segment's own second
 *     line brackets the start of its diag activity; the OFF segment's (the very next one) brackets
 *     the end of it, since verbal-diag.log is one continuous, unsplit file across all segments.
 *   - `<diagLog>` — that one continuous verbal-diag.log.
 *
 * Output: `<outDir>/natively_debug.log`, `<outDir>/verbal-diag.log`, and a synthesized
 * `<outDir>/interview60.timeline.json` that `hedgeStats()`/`report()` can read exactly as they
 * read a real flight run folder.
 *
 * If the diag log's lines carry no parseable leading `[ISO timestamp]` (they always have in every
 * real log this script has read, but a future format change is not this script's business to
 * assume), this throws rather than pooling the whole file (fix round 4, N-M2): the stats script's
 * own first-token regex requires that same `[<ISO>]` prefix, so a folder built from an unparseable
 * diag log could never actually yield a wider, pooled first-token sample either way — it would
 * just read n=0 silently downstream of a warning a batch run would not show anyone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_STARTUP = 'on trigger=5000ms';
const reStartupFlag = /^\S+ \[LOG\] \[Main\] verbal hedge: (on trigger=\d+ms|off)/m;
const reDispatchAnswer = /^\S+ \[LOG\] \[Main\] dispatch: answer /m;
const reDiagTimestamp = /^\[([^\]]+)\]/;

// buildSmokeWindow() itself throws (so it can be calibrated in-process, try/catch, the same way
// h40c-hedge-stats.mjs's own functions are); only the CLI entry point at the bottom of this file
// converts a thrown error into a printed message and exit 1.
function fail(msg) { throw new Error(msg); }

function secondLineTimestamp(logPath) {
    if (!fs.existsSync(logPath)) fail(`missing ${logPath}`);
    const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
    const second = lines[1];
    if (!second) fail(`${logPath} has no second line to read a start instant from`);
    const t = Date.parse(second.trim());
    if (Number.isNaN(t)) fail(`${logPath}'s second line ("${second.trim()}") does not parse as a timestamp`);
    return t;
}

export function buildSmokeWindow(runsDir, diagLog, outDir) {
    const defaultDebugLog = path.join(runsDir, 'smoke-hedge-default.natively_debug.log');
    const defaultProgressLog = path.join(runsDir, 'smoke-hedge-default.log');
    const offProgressLog = path.join(runsDir, 'smoke-hedge-off.log');
    if (!fs.existsSync(defaultDebugLog)) fail(`missing ${defaultDebugLog} - run the smoke first`);

    const debugText = fs.readFileSync(defaultDebugLog, 'utf8');
    const startupMatch = debugText.match(reStartupFlag);
    if (!startupMatch) fail(`${defaultDebugLog} has no verbal-hedge startup line at all`);
    if (startupMatch[1] !== EXPECTED_STARTUP) {
        fail(`${defaultDebugLog}'s startup line is "${startupMatch[1]}", not "${EXPECTED_STARTUP}" - this is not the default segment (the forced segment reads "on trigger=1ms" by design)`);
    }
    const afterStartup = debugText.slice(startupMatch.index + startupMatch[0].length);
    const dispatchMatch = afterStartup.match(reDispatchAnswer);
    if (!dispatchMatch) fail(`${defaultDebugLog} has a startup line but no dispatch: answer line after it - the segment never answered anything`);
    const startDebug = Buffer.byteLength(debugText.slice(0, startupMatch.index + startupMatch[0].length + dispatchMatch.index), 'utf8');
    const endDebug = Buffer.byteLength(debugText, 'utf8');

    const defaultStart = secondLineTimestamp(defaultProgressLog);
    const offStart = secondLineTimestamp(offProgressLog);
    if (!(offStart > defaultStart)) fail(`the off segment's start (${new Date(offStart).toISOString()}) is not after the default segment's (${new Date(defaultStart).toISOString()}) - segment order looks wrong`);

    if (!fs.existsSync(diagLog)) fail(`missing ${diagLog}`);
    const diagText = fs.readFileSync(diagLog, 'utf8');
    const diagLines = diagText.split(/(?<=\n)/); // keep line terminators so byte offsets stay exact
    let startDiag = null, endDiag = null, sawTimestamp = false, offset = 0;
    for (const line of diagLines) {
        const m = line.match(reDiagTimestamp);
        if (m) {
            const t = Date.parse(m[1]);
            if (!Number.isNaN(t)) {
                sawTimestamp = true;
                if (startDiag === null && t >= defaultStart) startDiag = offset;
                if (endDiag === null && t >= offStart) { endDiag = offset; break; }
            }
        }
        offset += Buffer.byteLength(line, 'utf8');
    }
    // N-M2 (fix round 4): no pooled fallback. h40c-hedge-stats.mjs's own first-token regex
    // (`/^\[(\S+)\] first token/`) requires that same leading `[<ISO>]` prefix (WhatToAnswerLLM.ts
    // always writes it), so a diag log with no parseable timestamp could never actually be
    // "pooled" into a usable wider sample either way - the fallback this function used to take
    // would always hand hedgeStats() a folder that reads first-token n=0 regardless, silently
    // downstream of a warning nobody watching a batch run would see. Fail loudly here instead,
    // naming the problem, so the recipe is re-derived rather than silently substituted.
    if (!sawTimestamp) fail(`${diagLog} has no line with a parseable [<ISO timestamp>] prefix - cannot bracket the default segment's own slice of it`);
    if (startDiag === null) startDiag = Buffer.byteLength(diagText, 'utf8'); // nothing at/after defaultStart
    if (endDiag === null) endDiag = Buffer.byteLength(diagText, 'utf8'); // off segment never started (or this is the last segment read)

    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(defaultDebugLog, path.join(outDir, 'natively_debug.log'));
    fs.copyFileSync(diagLog, path.join(outDir, 'verbal-diag.log'));
    const timeline = {
        startedAt: new Date(defaultStart).toISOString(),
        startedMs: defaultStart,
        clock: 'smoke-window',
        startDebug, startDiag,
        items: [],
        endedAt: new Date(offStart).toISOString(),
        endedMs: offStart,
        endDebug, endDiag,
    };
    fs.writeFileSync(path.join(outDir, 'interview60.timeline.json'), JSON.stringify(timeline, null, 1));

    return { startDebug, endDebug, startDiag, endDiag, defaultStart, offStart };
}

// Same fileURLToPath fix h40c-hedge-stats.mjs's own isMain check needed (M4): a hand-rolled
// percent-decode of the URL pathname breaks under an accented path (Masaüstü).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
    const [runsDir, diagLog, outDir] = process.argv.slice(2);
    if (!runsDir || !diagLog || !outDir) {
        console.error('usage: node h40c-smoke-window.mjs <runsDir> <verbal-diag.log path> <outDir>');
        process.exit(1);
    }
    let r;
    try {
        r = buildSmokeWindow(runsDir, diagLog, outDir);
    } catch (e) {
        console.error(`h40c-smoke-window FAILED: ${e.message}`);
        process.exit(1);
    }
    console.log(`built ${outDir}: startDebug=${r.startDebug} endDebug=${r.endDebug} startDiag=${r.startDiag} endDiag=${r.endDiag}`);
}
