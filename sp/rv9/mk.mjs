// Throwaway (task-7 re-review 2): builds a synthetic repo tree for run-smoke-hedge-checks.mjs
// with all four segments correct (and the Task 11 "[Main] follow-up parent: off" startup line
// present), then applies one named mutation. Usage: node mk.mjs <root> [mutation]
import fs from 'fs';
import path from 'path';

const root = process.argv[2];
const mutation = process.argv[3] || 'none';
const RUNS = path.join(root, 'electron', 'test', 'golden', 'interview60.runs');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(RUNS, { recursive: true });

const iso = (ms) => new Date(ms).toISOString();
const T = Date.parse('2026-09-26T20:00:00.000Z');
const S = [T, T + 300_000, T + 600_000, T + 900_000]; // segment start instants
const dbg = [];
const diag = [];
const L = (lines, at, level, msg) => lines.push(`${iso(at)} [${level}] ${msg}`);

function forcedAnswer(lines, t, n, winner) {
    L(lines, t, 'LOG', `[Main] dispatch: answer source=whisper anchor="q${n}" verdict=match question="q${n}"`);
    diag.push(`[${iso(t + 10)}] route: VERBAL-TECHNICAL (selected model, filtered)`);
    L(lines, t + 20, 'LOG', '[Main] answer source: gemini-3.1-flash-lite');
    L(lines, t + 30, 'LOG', '[LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=1ms');
    L(lines, t + 35, 'LOG', '[LLMHelper] verbal hedge: back started at 5ms reason=trigger');
    L(lines, t + 3240, 'LOG', `[LLMHelper] ${winner} usage: thinking=LOW thoughts=600 out=21 in=4700`);
    L(lines, t + 3241, 'LOG', `[LLMHelper] verbal hedge: won by ${winner} at 3210ms; other=aborted`);
    L(lines, t + 3245, 'LOG', `[Main] answer source: ${winner} (hedge)`);
    diag.push(`[${iso(t + 3250)}] first token 3220ms`);
}
function defaultAnswer(lines, t, n) {
    L(lines, t, 'LOG', `[Main] dispatch: answer source=live anchor="q${n}" verdict=match question="q${n}"`);
    diag.push(`[${iso(t + 10)}] route: VERBAL-TECHNICAL (selected model, filtered)`);
    L(lines, t + 20, 'LOG', '[Main] answer source: gemini-3.1-flash-lite');
    L(lines, t + 30, 'LOG', '[LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms');
    L(lines, t + 4200, 'LOG', '[LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 4170ms; other=not-started');
    L(lines, t + 4205, 'LOG', '[Main] answer source: gemini-3.5-flash-lite (hedge)');
}

// segment 1 forced
const f = [`=== Natively session started ${iso(S[0] + 5000)} ===`];
L(f, S[0] + 5100, 'LOG', '[Main] verbal hedge: on trigger=1ms');
L(f, S[0] + 5101, 'LOG', '[Main] follow-up parent: off');
forcedAnswer(f, S[0] + 60_000, 1, 'gemini-3.1-flash-lite');
forcedAnswer(f, S[0] + 95_000, 2, 'gemini-3.5-flash-lite');
forcedAnswer(f, S[0] + 130_000, 3, 'gemini-3.1-flash-lite');
// segment 2 default
const d = [`=== Natively session started ${iso(S[1] + 5000)} ===`];
L(d, S[1] + 5100, 'LOG', '[Main] verbal hedge: on trigger=5000ms');
L(d, S[1] + 5101, 'LOG', '[Main] follow-up parent: off');
defaultAnswer(d, S[1] + 60_000, 1);
defaultAnswer(d, S[1] + 95_000, 2);
defaultAnswer(d, S[1] + 130_000, 3);
// segment 3 off
const o = [`=== Natively session started ${iso(S[2] + 5000)} ===`];
L(o, S[2] + 5100, 'LOG', '[Main] verbal hedge: off');
L(o, S[2] + 5101, 'LOG', '[Main] follow-up parent: off');
L(o, S[2] + 60_000, 'LOG', '[Main] dispatch: answer source=whisper anchor="q1" verdict=match question="q1"');
diag.push(`[${iso(S[2] + 60_010)}] route: VERBAL-TECHNICAL (selected model, filtered)`);
L(o, S[2] + 60_020, 'LOG', '[Main] answer source: gemini-3.1-flash-lite');
L(o, S[2] + 60_030, 'LOG', '[LLMHelper] verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 10000ms)');
// segment 4 refuse (Task 11's line logged BEFORE the hedge validation, the only order that can precede a refusal)
const r = [`=== Natively session started ${iso(S[3] + 20_000)} ===`];
L(r, S[3] + 20_100, 'LOG', '[Main] follow-up parent: off');
L(r, S[3] + 20_101, 'ERROR', '[Main] NATIVELY_VERBAL_HEDGE="yes" is not "1" or "0"/unset; a typo must not fly silently off — refusing to start');

const seg = (name, n, since, tail) => fs.writeFileSync(path.join(RUNS, name), `=== HEDGE SMOKE ${n} === \r\n${iso(since)}\r\n${tail}`);
seg('smoke-hedge-forced.log', 1, S[0], 'SMOKE1 EXIT 0 \r\n');
seg('smoke-hedge-default.log', 2, S[1], 'SMOKE2 EXIT 0 \r\n');
seg('smoke-hedge-off.log', 3, S[2], 'SMOKE3 EXIT 0 \r\n');
seg('smoke-hedge-refuse.log', 4, S[3], 'REFUSE exited code=1 after 21000ms\nSMOKE4 EXIT 0 \r\n');
fs.writeFileSync(path.join(RUNS, 'smoke-hedge-forced.natively_debug.log'), f.join('\n') + '\n');
fs.writeFileSync(path.join(RUNS, 'smoke-hedge-default.natively_debug.log'), d.join('\n') + '\n');
fs.writeFileSync(path.join(RUNS, 'smoke-hedge-off.natively_debug.log'), o.join('\n') + '\n');
fs.writeFileSync(path.join(RUNS, 'smoke-hedge-refuse.natively_debug.log'), r.join('\n') + '\n');
for (const m of ['forced', 'default', 'off']) fs.writeFileSync(path.join(RUNS, `smoke-hedge-${m}.app-start.log`), '[build-electron] Up to date, skipping build\n[Main] dispatch: answer ...\n');
fs.writeFileSync(path.join(RUNS, 'smoke-hedge-refuse.child.log'), '[Main] NATIVELY_VERBAL_HEDGE="yes" is not "1" or "0"/unset; a typo must not fly silently off - refusing to start\nnpm error Lifecycle script `electron:dev` failed with error: code 1\n');
fs.writeFileSync(path.join(root, 'verbal-diag.log'), diag.join('\n') + '\n');

// mutations
const forcedDebug = path.join(RUNS, 'smoke-hedge-forced.natively_debug.log');
if (mutation === 'forced-debug-unreadable') {
    // exists (the runner's pre-check passes) but cannot be read as a file -> the checker exits 2
    fs.rmSync(forcedDebug);
    fs.mkdirSync(forcedDebug);
}
if (mutation === 'forced-q2-never-raced') {
    // a broken app: answer 2 dispatched but never raced (a real defect) - control case for the gate
    const a2 = S[0] + 95_000;
    const txt = fs.readFileSync(forcedDebug, 'utf8').split('\n')
        .filter((l) => { const at = Date.parse(l.split(' ')[0]); return !(at >= a2 && at < a2 + 5000 && /verbal hedge|usage:|\(hedge\)/.test(l)); }).join('\n');
    fs.writeFileSync(forcedDebug, txt);
}
console.log(`built ${root} mutation=${mutation}`);
