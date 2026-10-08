#!/usr/bin/env node
/**
 * Calibration for router-hour-read.mjs (plan Task 14, rule 8). Builds synthetic run folders whose answers are known BY
 * CONSTRUCTION (not by calling the reader), runs the reader CLI, and asserts its printed numbers. Prints counts only.
 *
 *   node router-hour-read.cal.mjs                 against ./router-hour-read.mjs (or $RH_READER)
 *   node router-hour-read.cal.mjs --mutations     also breaks the reader on purpose, one copy per mutation, and
 *                                                  requires the calibration to FAIL against each (the effect-absent check)
 * Exit 0 only if every assertion passes (and, with --mutations, every mutation is caught).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const READER = process.env.RH_READER ?? path.join(HERE, 'router-hour-read.mjs');
const ROOT = process.env.RH_ROOT ?? 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\live-router-d';
const { LIVE40 } = await import(pathToFileURL(path.join(ROOT, 'electron', 'test', 'golden', 'live40.questions.mjs')).href);
const OFFSET = 1150;                                  // independent copy of the constant: the cal must not import the reader
const T0 = Date.UTC(2026, 9, 7, 5, 0, 0);
const STEP = 30;                                      // seconds between item starts
const T1 = T0 + LIVE40.length * STEP * 1000 + 20000;
const iso = (ms) => new Date(ms).toISOString();
const Ln = (ms, msg) => `${iso(ms)} [LOG] ${msg}`;
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const EASY = LIVE40.filter((i) => i.route === 'EASY').map((i) => i.id);
const HARD = LIVE40.filter((i) => i.route === 'HARD').map((i) => i.id);

// ------------------------------------------------------------------ scene builder
let work;
function scene(name, { ov = {}, extra = () => [], nLive = 15, noFiles = false, dropLog = () => false, fileEdit = (live, shadow) => [live, shadow], headers = [T0 - 600000], logEdit = (l) => l } = {}) {
    const dir = path.join(work, name);
    fs.mkdirSync(dir, { recursive: true });
    const lines = [...headers.map((h) => `=== Natively session started ${iso(h)} ===`),Ln(T0 - 130000, '[Router] session connect model=gemini-3.8-live block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_sha12=abc context_chars=10'), Ln(T0 - 120000, '[Router] session up setup_ms=900')];
    const liveFile = [], shadowFile = [];
    // the probe's turn: before the first play window, must be ignored by every bar
    lines.push(Ln(T0 - 30000, `[Router] dispatch turn=1 at=${T0 - 29000} q_at=${T0 - 30000} q_src=vad router=up ear=3.1`));
    lines.push(Ln(T0 - 20000, `[Router] turn=1 route=easy-answer reason=- live_first_ms=900 live_words=40 shown=live shadow=4000 ear=3.1 router=up q_src=vad q_at=${T0 - 30000} sent=9`));
    let turn = 100, easyIdx = 0;
    LIVE40.forEach((it, idx) => {
        const base = it.route === 'EASY'
            ? (easyIdx++ < nLive ? { kind: 'live', route: 'easy-answer', reason: '-' } : { kind: 'pipeline', route: 'invalid', reason: 'late' })
            : { kind: 'pipeline', route: 'hard', reason: '-' };
        const s = { lf: 1800 + idx, lw: 40, shadow: 4000, sent: base.kind === 'live' ? 12 : 5, q: T0 + OFFSET + idx * STEP * 1000 + 5000, qs: 'vad', liveText: words(40), liveCapWords: 40, answerText: 'A plain prose answer about the topic.', dispatch: true, ...base, ...(ov[it.id] ?? {}) };
        const t = turn++; const q = s.q;
        const A = (kind, text, w, extraFields = {}) => ({ turn: t, kind, text, words: w, firstMs: 1800, endMs: 6000, q_src: s.qs, ...(s.preFix ? {} : { superseded: s.capFlags?.[kind] ?? s.capSup ?? !!s.sup }), ...extraFields });
        if (s.dispatch) lines.push(Ln(q + 1000, `[Router] dispatch turn=${t} at=${q + 900} q_at=${q} q_src=${s.qs} router=up ear=3.1`));
        if (s.dupDispatchLine) lines.push(Ln(q + 1001, `[Router] dispatch turn=${t} at=${q + 900} q_at=${q} q_src=${s.qs} router=up ear=3.1`));
        if (s.dupDecision) lines.push(Ln(q + 9001, `[Router] turn=${t} route=${s.route} reason=${s.reason} live_first_ms=${s.lf} live_words=${s.lw} shown=${s.kind} shadow=${s.shadow} ear=3.1 router=up q_src=${s.qs} q_at=${q} sent=${s.sent} superseded=no`));
        for (let k = 0; k < (s.supDiag?.times ?? (s.supDiag ? 1 : 0)); k++) lines.push(Ln(q + 5000 + k, `[Router] superseded turn=${t} phase=${s.supDiag.phase} line_written=${s.supDiag.lw}`));
        if (s.decision !== false) {
            const dl = Ln(q + 9000, `[Router] turn=${t} route=${s.route} reason=${s.reason} live_first_ms=${s.lf} live_words=${s.lw} shown=${s.kind} shadow=${s.shadow} ear=3.1 router=up q_src=${s.qs} q_at=${q}` + (s.sent === null ? '' : ` sent=${s.sent}`) + (s.preFix ? '' : ` superseded=${s.sup ? 'yes' : 'no'}`));
            lines.push(dl);
        }
        if (s.kind === 'pipeline') lines.push(Ln(q + 8000, `[Answer] full: ${JSON.stringify(s.answerText)}`));
        if (s.kind === 'live') {
            const app = s.reason !== '-';
            const caps = [];
            if (!s.noLive) { caps.push(['live', A('live', s.liveText, s.liveCapWords)]); liveFile.push({ id: it.id, turn: t, text: s.liveText, words: s.liveCapWords, firstMs: 1800, endMs: 6000, q_src: s.qs }); }
            if (app && !s.noAppended) { caps.push(['appended', A('appended', 'Full pipeline answer.', 3)]); shadowFile.push({ id: it.id, turn: t, text: 'Full pipeline answer.', words: 3, firstMs: 4000, endMs: 8000, q_src: s.qs, appended: true }); }
            if (!app && !s.noShadow) { caps.push(['shadow', A('shadow', 'Hidden shadow answer.', 3)]); shadowFile.push({ id: it.id, turn: t, text: 'Hidden shadow answer.', words: 3, firstMs: 4000, endMs: 8000, q_src: s.qs, appended: false }); }
            for (const [k, a] of caps) if (!dropLog(it.id, k)) lines.push(Ln(q + 8500, `[RouterAnswer] ${JSON.stringify(a)}`));
        }
        if (s.extraCapture) lines.push(Ln(q + 8600, `[RouterAnswer] ${JSON.stringify(A(s.extraCapture, 'x y z', 3))}`));
        if (s.dupLine) lines.push(Ln(q + 8700, `[Router] turn=${t} route=easy-answer reason=dup live_first_ms=- live_words=40 shown=- shadow=- ear=3.1 router=up q_src=${s.qs} q_at=${q}`));
    });
    for (const l of extra()) lines.push(l);
    lines.sort((a, b) => (a.startsWith('===') ? -1 : b.startsWith('===') ? 1 : a.localeCompare(b)));
    fs.writeFileSync(path.join(dir, 'natively_debug.log'), lines.join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify({ startedMs: T0, endedMs: T1, clock: 'wallclock', items: LIVE40.map((it, i) => ({ id: it.id, startSec: i * STEP })) }));
    if (!noFiles) {
        const [lf, sf] = fileEdit(liveFile, shadowFile);
        fs.writeFileSync(path.join(dir, 'interview60.answers.router-live.json'), JSON.stringify(lf));
        fs.writeFileSync(path.join(dir, 'interview60.answers.router-shadow.json'), JSON.stringify(sf));
    }
    return dir;
}
const run = (dir, limit = 5) => { const r = spawnSync(process.execPath, [READER, dir, '--down-limit-min', String(limit), '--root', ROOT], { encoding: 'utf8' }); return { code: r.status, text: (r.stdout ?? '') + (r.stderr ?? '') }; };

// ------------------------------------------------------------------ assertions
const results = [];
const check = (name, cond, detail = '') => results.push({ name, ok: !!cond, detail });
const has = (r, re) => re.test(r.text);
const bar = (r, name) => /** @type {string|null} */ ((r.text.match(new RegExp(`BAR ${name}: (PASS|FAIL)`)) ?? [])[1] ?? null);
const E = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const L1 = (id, i) => [id, i];

async function suite() {
    results.length = 0;
    // ---- clean log: the effect is absent, every bar reads PASS
    let r = run(scene('clean'));
    check('clean: exit 0', r.code === 0, `code=${r.code}`);
    check('clean: counts (47 in hour, 1 outside)', has(r, /decisions_in_hour=47 decisions_outside_hour=1/));
    check('clean: Safety/Fallback/Speed/Routing all PASS', ['Safety \\(text half\\)', 'Fallback', 'Speed', 'Routing'].every((b) => bar(r, b) === 'PASS'));
    check('clean: routing numbers', has(r, /EASY caught 15\/20 \(>= 13\); HARD misrouted 0\/27/));
    check('clean: integrity zeros', has(r, /no decision line: 0 /) && has(r, /nothing shown \(sent=0\): 0 /) && has(r, /CAPTURES check: MATCH/) && has(r, /CAPTURE FILES: MATCH/));
    check('clean: verdict', has(r, /READER VERDICT \(pre-grade\): reader bars MET/));
    check('clean: grade-dependent bars say NEEDS GRADES', has(r, /BAR Quality: NEEDS GRADES/) && has(r, /BAR No-regression: NEEDS GRADES/) && has(r, /BAR Safety \(wrong-answer half\): NEEDS GRADES/));
    check('clean: speed split by q_src printed', has(r, /SPEED live_first_ms shown=live q_src=vad n=15/) && has(r, /SPEED shadow_first_token q_src=vad n=47/));
    check('clean: live_words', has(r, /SPEED live_words n=15 p50=40 max=40/));
    check('clean: no answer text printed', !has(r, /A plain prose|w0 w1|Hidden shadow/));

    // ---- one line per reason; counts by construction
    const reasonOv = {
        [EASY[0]]: { reason: 'incomplete-after-show', route: 'invalid' }, [EASY[1]]: { reason: 'marker', route: 'invalid' },
        [EASY[2]]: { reason: 'too-short', route: 'invalid' }, [EASY[3]]: { reason: 'too-long', route: 'invalid' },
        [EASY[15]]: { kind: 'pipeline', reason: 'too-short', route: 'invalid' }, [EASY[16]]: { kind: 'pipeline', reason: 'too-long', route: 'invalid' },
        [EASY[17]]: { kind: 'pipeline', reason: 'incomplete', route: 'invalid' }, [EASY[18]]: { kind: 'pipeline', reason: 'marker', route: 'invalid' },
        [HARD[0]]: { reason: 'garbled-hard' }, [HARD[1]]: { reason: 'router-down', route: 'invalid' },
        [HARD[2]]: { reason: 'no-router-turn', route: 'invalid' }, [HARD[3]]: { reason: 'late', route: 'invalid' },
        [HARD[4]]: { dupLine: true },
    };
    r = run(scene('reasons', { ov: reasonOv, extra: () => [Ln(T0 + 60000, `[Router] turn=- route=invalid reason=unpaired live_first_ms=- live_words=12 shown=- shadow=- ear=3.1 router=up q_src=- q_at=-`)] }));
    check('reasons: exact counts per reason', has(r, new RegExp(E('DECISION reasons -=34 garbled-hard=1 too-short=2 too-long=2 incomplete=1 incomplete-after-show=1 marker=2 late=2 router-down=1 no-router-turn=1'))), (r.text.match(/DECISION reasons.*/) ?? [''])[0]);
    check('reasons: dup and unpaired counted apart', has(r, /DECISION dup=1 unpaired=1 /));
    check('reasons: dup is not a decision (no shown=- cell, 47 in hour)', !has(r, /shown=-\b.*n=/) && has(r, /decisions_in_hour=47/));
    check('reasons: appends by reason', has(r, /APPENDS total=4 incomplete-after-show=1 marker=1 too-long=1 too-short=1/));
    check('reasons: HARD late reported on its own row, not misrouted (M2)', has(r, /HARD late \(not misrouted, M2\): 1/) && has(r, /HARD misrouted 0\/27/));
    check('reasons: the dup of a HARD item does not misroute it', has(r, /hard_misrouted_any_decision=0\/27/));
    check('reasons: Fallback PASS (appended entries exist, row-4 has no live capture)', bar(r, 'Fallback') === 'PASS', (r.text.match(/BAR Fallback.*/) ?? [''])[0]);
    check('reasons: integrity MATCH', has(r, /CAPTURES check: MATCH/) && has(r, /CAPTURE FILES: MATCH/), (r.text.match(/CAPTURES check.*/) ?? [''])[0]);

    // ---- VOID
    const failed = (n, at = 120000) => () => [Ln(T0 + at, `[Router] session failed reason=quick attempts exhausted dispatches_before=${n}`)];
    r = run(scene('void-9', { extra: failed(9) }));
    check('VOID trigger 1: failed at dispatches_before=9 -> VOID, exit 3', r.code === 3 && has(r, /VERDICT VOID/) && has(r, /session-failed-before-dispatch-10: VOID/), `code=${r.code}`);
    r = run(scene('void-10', { extra: failed(10) }));
    check('non-VOID: failed at dispatches_before=10 -> exit 0, reported', r.code === 0 && has(r, /VOID_INPUT router session failed lines=1 dispatches_before=10/) && has(r, /dispatch-10: clear/), `code=${r.code}`);
    check('no VOID line without failures', run(scene('void-none')).code === 0);
    const downs = () => [Ln(T0 + 600000, '[Router] session close gen=2 code=1011 reason=boom stale=no quota=no'), Ln(T0 + 1200000, '[Router] session up setup_ms=800')];
    r = run(scene('down-10', { extra: downs }), 5);
    check('VOID trigger 2: 10 min down over a 5 min limit -> VOID, exit 3', r.code === 3 && has(r, /router_down_minutes=10\.00 limit=5/) && has(r, /router-down-minutes: VOID/), `code=${r.code}`);
    r = run(scene('down-10b', { extra: downs }), 15);
    check('router down 10 min under a 15 min limit -> exit 0', r.code === 0 && has(r, /router_down_minutes=10\.00 limit=15/));
    r = run(scene('down-goaway', { extra: () => [Ln(T0 + 60000, '[Router] session close gen=1 code=- reason=goAway stale=no quota=no'), Ln(T0 + 62000, '[Router] session up setup_ms=800'), Ln(T0 + 64000, '[Router] session close gen=1 code=1000 reason=old socket stale=yes quota=no')] }), 5);
    check('goAway: the stale close does not add down time (2 s = 0.03 min)', has(r, /router_down_minutes=0\.03 /), (r.text.match(/router_down_minutes=\S+/) ?? [''])[0]);
    r = run(scene('down-clip-start', { extra: () => [Ln(T0 - 60000, '[Router] session close gen=1 code=1011 reason=boom stale=no quota=no'), Ln(T0 + 30000, '[Router] session up setup_ms=800')] }), 5);
    check('down time is clipped to the run window at the start (0.50 min)', has(r, /router_down_minutes=0\.50 /), (r.text.match(/router_down_minutes=\S+/) ?? [''])[0]);
    r = run(scene('down-clip-end', { extra: () => [Ln(T1 - 60000, '[Router] session close gen=3 code=1011 reason=boom stale=no quota=no')] }), 5);
    check('a router still down at the end counts to the end (1.00 min)', has(r, /router_down_minutes=1\.00 /), (r.text.match(/router_down_minutes=\S+/) ?? [''])[0]);
    r = run(scene('down-after-end', { extra: () => [Ln(T1 + 600000, '[Router] session close gen=3 code=1011 reason=stop stale=no quota=no')] }), 5);
    check('a close after the hour ended adds nothing (0.00 min)', has(r, /router_down_minutes=0\.00 /));
    r = run(scene('ear-failover', { extra: () => [Ln(T0 + 90000, '[Router] ear failover from=3.1 to=2.5 reason=drop dispatches_before=3')] }), 5);
    check('ear failover is reported, never VOID', r.code === 0 && has(r, /VOID_INPUT ear failovers=1 \(reported only\) dispatches_before=3/));
    check('failed after the hour ended is ignored', run(scene('late-fail', { extra: failed(2, 99999999) }), 5).code === 0);

    // ---- integrity
    r = run(scene('nodec', { ov: { [HARD[0]]: { decision: false } } }));
    check('a dispatched turn with no decision line reads 1', has(r, /dispatched turns with no decision line: 1 /) && has(r, /dispatched_nothing_shown=0/), (r.text.match(/no decision line: \d+/) ?? [''])[0]);
    r = run(scene('sent0', { ov: { [HARD[0]]: { sent: 0 } } }));
    check('a decision with sent=0 reads "dispatched with nothing shown = 1" and fails Fallback', has(r, /nothing shown \(sent=0\): 1 /) && bar(r, 'Fallback') === 'FAIL');

    // ---- Safety, text half
    const live = (text, w = 40) => ({ [EASY[0]]: { liveText: text, liveCapWords: w } });
    r = run(scene('safe-hard', { ov: live('hard. ' + words(39)) }));
    check('Safety: live capture whose first word is "hard." -> FAIL hard-first=1', bar(r, 'Safety \\(text half\\)') === 'FAIL' && has(r, /SAFETY live: hard-first=1 router-marker=0/));
    r = run(scene('safe-hardhard', { ov: live('"hard".hard ' + words(39)) }));
    check('Safety: "hard".hard is a hard word too', has(r, /hard-first=1/));
    r = run(scene('safe-quote-hard', { ov: live('" hard ' + words(38)) }));
    check('Safety: a punctuation-only first token then "hard" -> hard-first=1', bar(r, 'Safety \\(text half\\)') === 'FAIL' && has(r, /hard-first=1/));
    r = run(scene('safe-dots-hard', { ov: live('... hard ' + words(38)) }));
    check('Safety: "..." then "hard" -> hard-first=1', has(r, /hard-first=1/));
    r = run(scene('safe-dash-hard', { ov: live('\u2014 \u2014 hard. ' + words(37)) }));
    check('Safety: two dash tokens then "hard." -> hard-first=1', has(r, /hard-first=1/));
    r = run(scene('safe-quote-hardware', { ov: live('" hardware is a physical thing ' + words(33)) }));
    check('Safety: a punctuation token then "hardware" is not a hard word', has(r, /hard-first=0/) && bar(r, 'Safety \\(text half\\)') === 'PASS');
    r = run(scene('safe-quote-other', { ov: live('... well hard things ' + words(36)) }));
    check('Safety: "hard" as a later word after a letter word is not hard-first', has(r, /hard-first=0/));
    r = run(scene('safe-uml-hard', { ov: live('\u00fc hard ' + words(38)) }));
    check('Safety parity: a non-ASCII-only first token is skipped, then "hard" -> hard-first=1', bar(r, 'Safety \\(text half\\)') === 'FAIL' && has(r, /hard-first=1/));
    r = run(scene('safe-dash-Hard', { ov: live('- Hard. ' + words(38)) }));
    check('Safety parity: "- Hard." -> hard-first=1', has(r, /hard-first=1/));
    r = run(scene('safe-h-ard', { ov: live('h-ard ' + words(39)) }));
    check('Safety parity: "h-ard" (letters-only form hard) -> hard-first=1', has(r, /hard-first=1/));
    r = run(scene('safe-hardware-parity', { ov: live('hardware ' + words(39)) }));
    check('Safety parity: "hardware" -> hard-first=0, PASS', has(r, /hard-first=0/) && bar(r, 'Safety \\(text half\\)') === 'PASS');
    r = run(scene('safe-hardware', { ov: live('hardware is a physical thing ' + words(34)) }));
    check('Safety: "hardware" is not a hard word', has(r, /hard-first=0/) && bar(r, 'Safety \\(text half\\)') === 'PASS');
    r = run(scene('safe-marker', { ov: live('see <x> here ' + words(37)) }));
    check('Safety: live capture holding <x> -> router-marker=1', bar(r, 'Safety \\(text half\\)') === 'FAIL' && has(r, /hard-first=0 router-marker=1/));
    r = run(scene('safe-marker2', { ov: live('the __foo__ token ' + words(37)) }));
    check('Safety: live capture holding __foo__ -> router-marker=1', has(r, /router-marker=1/));
    // I6: pipeline marker set is uppercase-only, < > [ ] are fine
    r = run(scene('i6-clean', { ov: { [HARD[0]]: { answerText: 'Use List[int] and check a < b > c, then x[0] and <T> generics.' }, [HARD[1]]: { answerText: 'Define __init__ and see __MORE__ and __CUES__ here.' }, [HARD[2]]: { answerText: 'Hardware is a physical thing and hard drives spin.' } } }));
    check('I6: List[int], a < b, __init__, __MORE__, __CUES__ and "hardware" read CLEAN', has(r, /SAFETY pipeline: unknown-marker=0 bare-routing-token=0/) && bar(r, 'Safety \\(text half\\)') === 'PASS', (r.text.match(/SAFETY pipeline.*/) ?? [''])[0]);
    r = run(scene('i6-marker', { ov: { [HARD[0]]: { answerText: 'The answer is __S1Q05__ here.' } } }));
    check('I6: __S1Q05__ in a pipeline answer -> unknown-marker=1', has(r, /unknown-marker=1 bare-routing-token=0/) && bar(r, 'Safety \\(text half\\)') === 'FAIL');
    r = run(scene('i6-bare', { ov: { [HARD[0]]: { answerText: 'Hard.' } } }));
    check('I6: a pipeline answer whose whole text is "Hard." -> bare-routing-token=1', has(r, /unknown-marker=0 bare-routing-token=1/) && bar(r, 'Safety \\(text half\\)') === 'FAIL');
    r = run(scene('i6-bare2', { ov: { [HARD[0]]: { answerText: 'hard.HARD hard' } } }));
    check('I6: repeats of hard are a bare routing token', has(r, /bare-routing-token=1/));
    r = run(scene('i6-appended', { ov: { [EASY[0]]: { reason: 'too-long', route: 'invalid' } }, extra: () => [] }));
    check('I6 control: an ordinary appended answer reads clean', has(r, /unknown-marker=0 bare-routing-token=0/));

    // ---- Fallback
    r = run(scene('fb-noappend', { ov: { [EASY[0]]: { reason: 'incomplete-after-show', route: 'invalid', noAppended: true } } }));
    check('Fallback: an after-V failure without its appended entry -> FAIL missing_appended=1', bar(r, 'Fallback') === 'FAIL' && has(r, /missing_appended=1/));
    r = run(scene('fb-row4live', { ov: { [EASY[15]]: { kind: 'pipeline', reason: 'marker', route: 'invalid' } }, extra: () => [Ln(T0 + OFFSET + 15 * 0, '')].slice(0, 0) }));
    check('Fallback control: a row-4 turn with no live capture passes', bar(r, 'Fallback') === 'PASS');
    r = run(scene('fb-row4live2', { ov: { [EASY[15]]: { kind: 'pipeline', reason: 'marker', route: 'invalid', extraCapture: 'live' } } }));
    check('Fallback: a row-4 turn that has a live capture -> FAIL row4_with_live_capture=1', bar(r, 'Fallback') === 'FAIL' && has(r, /row4_with_live_capture=1/));
    r = run(scene('fb-unflagged', { ov: { [EASY[0]]: { liveText: words(5), liveCapWords: 5 } } }));
    check('Fallback: a shown live answer of 5 words flagged "-" is an unflagged failure', bar(r, 'Fallback') === 'FAIL' && has(r, /unflagged_live_failures=1/));
    r = run(scene('fb-81', { ov: { [EASY[0]]: { liveText: words(81), liveCapWords: 81 } } }));
    check('Fallback: 81 words flagged "-" is an unflagged failure', has(r, /unflagged_live_failures=1/));

    // ---- Speed (nearest-rank p50; limit 2500)
    const lfAll = (v) => Object.fromEntries(EASY.slice(0, 15).map((id) => [id, { lf: v }]));
    r = run(scene('speed-2500', { ov: lfAll(2500) }));
    check('Speed: p50 = 2500 -> PASS (limit is <=)', bar(r, 'Speed') === 'PASS' && has(r, /p50=2500 limit=2500/));
    r = run(scene('speed-2501', { ov: lfAll(2501) }));
    check('Speed: p50 = 2501 -> FAIL', bar(r, 'Speed') === 'FAIL' && has(r, /p50=2501/));
    const mix = Object.fromEntries(EASY.slice(0, 15).map((id, i) => [id, { lf: i < 8 ? 1000 : 9000 }]));
    r = run(scene('speed-mix', { ov: mix }));
    check('Speed: 8 fast of 15 -> median is fast (PASS, p50=1000); p90 sees the slow tail', bar(r, 'Speed') === 'PASS' && has(r, /live_first_ms shown=live q_src=all n=15 p50=1000 p90=9000/));
    const split = Object.fromEntries(EASY.slice(0, 15).map((id, i) => [id, { lf: 1500, qs: i < 5 ? 'final' : 'vad' }]));
    r = run(scene('speed-qsrc', { ov: split }));
    check('Speed: split by q_src (5 final, 10 vad)', has(r, /q_src=final n=5 p50=1500/) && has(r, /q_src=vad n=10 p50=1500/));

    // ---- Routing
    r = run(scene('route-13', { nLive: 13 }));
    check('Routing: EASY caught 13/20 -> PASS', bar(r, 'Routing') === 'PASS' && has(r, /EASY caught 13\/20/));
    r = run(scene('route-12', { nLive: 12 }));
    check('Routing: EASY caught 12/20 -> FAIL', bar(r, 'Routing') === 'FAIL' && has(r, /EASY caught 12\/20/));
    r = run(scene('mis-1', { ov: { [HARD[0]]: { route: 'easy-answer', kind: 'live' } } }));
    check('Routing: HARD misrouted 1/27 -> PASS (misrouted = first word not hard, shown or not)', bar(r, 'Routing') === 'PASS' && has(r, /HARD misrouted 1\/27/));
    r = run(scene('mis-2', { ov: { [HARD[0]]: { route: 'easy-answer', kind: 'live' }, [HARD[1]]: { route: 'invalid', reason: 'marker' } } }));
    check('Routing: a HARD row-4 turn (first word not hard, not shown live) counts; 2/27 -> FAIL', bar(r, 'Routing') === 'FAIL' && has(r, /HARD misrouted 2\/27/));
    r = run(scene('mis-none-decider', { ov: { [HARD[0]]: { route: 'invalid', reason: 'late' }, [HARD[1]]: { route: 'invalid', reason: 'router-down' }, [HARD[2]]: { route: 'invalid', reason: 'no-router-turn' } } }));
    check('Routing: HARD with no deciding turn (late, router-down, no-router-turn) are reported, not counted', has(r, /HARD misrouted 0\/27/) && has(r, /HARD late \(not misrouted, M2\): 1/) && has(r, /no-router-turn \(not misrouted, M2\): 1 router-down: 1/));

    // ---- item mapping by play window (OFFSET 1150), one dispatch 1 s before a window boundary
    const X = LIVE40[0].id, boundaryY = T0 + 1 * STEP * 1000;       // Y = LIVE40[1] starts at the raw boundary
    r = run(scene('map-boundary', { ov: { [X]: { q: boundaryY + 150 } } }));    // 1 s before Y's offset-shifted window start (boundary + 1150)
    check('Item mapping: a dispatch 1 s before the (offset) boundary belongs to the earlier item (OFFSET_MS 1150)', has(r, /easy_caught_first_decision=15\/20/) && has(r, /hard_misrouted_any_decision=0\/27/) && has(r, /CAPTURE FILES: MATCH/), (r.text.match(/ROUTING easy.*/) ?? [''])[0]);
    r = run(scene('map-after', { ov: { [X]: { q: boundaryY + 1500 } } }));
    check('Item mapping control: just after the offset boundary it belongs to the next item', has(r, /easy_caught_first_decision=14\/20/) && has(r, /hard_misrouted_any_decision=1\/27/), (r.text.match(/ROUTING easy.*/) ?? [''])[0]);

    // ---- captures against decisions
    const SH = EASY[1];
    r = run(scene('cap-missing', { dropLog: (id, k) => id === SH && k === 'shadow' }));
    check('Captures: a missing shadow capture -> MISMATCH missing=1', has(r, /CAPTURES check: MISMATCH missing=1/) && has(r, /CAPTURE FILES: MISMATCH/), (r.text.match(/CAPTURES check.*/) ?? [''])[0]);
    r = run(scene('cap-orphan', { extra: () => [Ln(T0 + 99000, `[RouterAnswer] ${JSON.stringify({ turn: 999, kind: 'live', text: 'a b c', words: 3, firstMs: 1, endMs: 2, q_src: 'vad' })}`)] }));
    check('Captures: a capture for a turn with no decision -> MISMATCH orphan=1', has(r, /CAPTURES check: MISMATCH .*orphan=1/));
    r = run(scene('cap-pipeline-turn', { ov: { [HARD[0]]: { extraCapture: 'shadow' } } }));
    check('Captures: a capture on a shown=pipeline turn -> MISMATCH unexpected=1', has(r, /CAPTURES check: MISMATCH missing=0 unexpected=1/));
    r = run(scene('cap-file-short', { fileEdit: (l, s) => [l.slice(1), s] }));
    check('Capture files: a live file one entry short -> MISMATCH', has(r, /CAPTURE FILES: MISMATCH live_file=14 \(log 15\)/) && has(r, /CAPTURES check: MATCH/));
    r = run(scene('cap-file-appended', { ov: { [EASY[0]]: { reason: 'too-long', route: 'invalid' } }, fileEdit: (l, s) => [l, s.map((e) => ({ ...e, appended: false }))] }));
    check('Capture files: appended flags missing -> MISMATCH', has(r, /CAPTURE FILES: MISMATCH .*appended_in_file=0 \(log 1\)/));
    r = run(scene('cap-nofiles', { noFiles: true }));
    check('Capture files: absent -> MISMATCH, never a silent pass', has(r, /CAPTURE FILES: MISMATCH live_file=absent/) && !has(r, /reader bars MET/));
    // fix1 (lane B 8d2de5b): a superseded Live stream writes its live capture; supersede is read from superseded=yes / superseded:true
    // fix2 B1: the `[Router] superseded turn= phase= line_written=` diag line is authoritative (lane B fix3 4878ad8)
    const sup = (o) => ({ [EASY[0]]: o });
    r = run(scene('superseded', { ov: sup({ sup: true, supDiag: { phase: 'streaming', lw: 'no' }, liveText: words(3), liveCapWords: 3 }) }));
    check('B1 phase=streaming: line yes, live capture true: MATCH, counted, partial text exempt in Fallback', has(r, /lost_live_captures=0/) && has(r, /superseded_turns=1 \(streaming=1 done=0 line_written=yes 0 line_written=no 1\) superseded_extra_lines=0 superseded_record_defects=0 superseded_orphan=0/) && has(r, /CAPTURES check: MATCH/) && has(r, /CAPTURE FILES: MATCH/) && bar(r, 'Fallback') === 'PASS', (r.text.match(/SUPERSEDE.*/) ?? [''])[0]);
    r = run(scene('sup-done-no', { ov: sup({ sup: true, supDiag: { phase: 'done', lw: 'no' }, capFlags: { live: false, shadow: true } }) }));
    check('B1 phase=done line_written=no: line yes, live capture false is NOT a defect: MATCH, counted', has(r, /superseded_turns=1 \(streaming=0 done=1 line_written=yes 0 line_written=no 1\) .* superseded_record_defects=0/) && has(r, /CAPTURES check: MATCH/) && has(r, /reader bars MET/), (r.text.match(/SUPERSEDE.*/) ?? [''])[0]);
    r = run(scene('sup-done-yes', { ov: sup({ supDiag: { phase: 'done', lw: 'yes' } }) }));
    check('B1 phase=done line_written=yes: line no, all captures false: counted (line_written=yes 1), MATCH', has(r, /superseded_turns=1 \(streaming=0 done=1 line_written=yes 1 line_written=no 0\) .* superseded_record_defects=0/) && has(r, /CAPTURES check: MATCH/));
    r = run(scene('sup-twice', { ov: sup({ sup: true, supDiag: { phase: 'streaming', lw: 'no', times: 2 } }) }));
    check('B1 a doubled diag line: superseded_turns=1 superseded_extra_lines=1', has(r, /superseded_turns=1 .* superseded_extra_lines=1 /) && has(r, /CAPTURES check: MATCH/));
    r = run(scene('sup-a', { ov: sup({ sup: true }) }));
    check('B1 (a): superseded=yes on the line with no diag line -> defect, MISMATCH, pre-fix warning', has(r, /superseded_record_defects=[1-9]/) && has(r, /CAPTURES check: MISMATCH/) && has(r, /WARNING pre-fix log: .* 1 turn\(s\) marked superseded with no \[Router\] superseded line/));
    r = run(scene('sup-b', { ov: sup({ sup: true, supDiag: { phase: 'streaming', lw: 'no' }, capFlags: { live: false } }) }));
    check('B1 (b): phase=streaming but the live capture reads false -> defect', has(r, /superseded_record_defects=[1-9]/) && has(r, /CAPTURES check: MISMATCH/));
    r = run(scene('sup-b2', { ov: sup({ sup: false, supDiag: { phase: 'streaming', lw: 'no' } }) }));
    check('B1 (b): phase=streaming but the line reads superseded=no -> defect', has(r, /superseded_record_defects=[1-9]/));
    r = run(scene('sup-c', { ov: sup({ sup: false, supDiag: { phase: 'done', lw: 'no' } }) }));
    check('B1 (c): line_written=no but the line reads superseded=no -> defect', has(r, /superseded_record_defects=[1-9]/) && has(r, /CAPTURES check: MISMATCH/));
    r = run(scene('sup-d', { ov: sup({ sup: true, supDiag: { phase: 'done', lw: 'yes' }, capFlags: { live: false, shadow: false } }) }));
    check('B1 (d): line_written=yes but the line reads superseded=yes -> defect', has(r, /superseded_record_defects=[1-9]/) && has(r, /CAPTURES check: MISMATCH/));
    r = run(scene('sup-orphan', { ov: { [HARD[0]]: { supDiag: { phase: 'done', lw: 'no' } } }, extra: () => [Ln(T0 + 70000, '[Router] superseded turn=9999 phase=done line_written=no')] }));
    check('B1 orphans: a diag line for a shown=pipeline turn and one for an unknown turn -> superseded_orphan=2, MISMATCH', has(r, /superseded_orphan=2/) && has(r, /CAPTURES check: MISMATCH/), (r.text.match(/SUPERSEDE.*/) ?? [''])[0]);
    r = run(scene('sup-shape', { extra: () => [Ln(T0 + 70000, '[Router] superseded turn=5 phase=weird line_written=no')] }));
    check('B1 shape: an unparsable [Router] superseded line refuses with exit 2', r.code === 2 && has(r, /unknown shape/), `code=${r.code}`);
    r = run(scene('sup-done-partial', { ov: sup({ sup: true, supDiag: { phase: 'done', lw: 'no' }, capFlags: { live: false, shadow: true }, liveText: words(3), liveCapWords: 3 }) }));
    check('B1 Fallback: phase=done partial live text (3 words, reason "-") is still an unflagged failure', has(r, /unflagged_live_failures=1/) && bar(r, 'Fallback') === 'FAIL');
    r = run(scene('sup-trailing', { ov: sup({ sup: true, supDiag: { phase: 'streaming', lw: 'no' } }), extra: () => [] }));
    check('B1 pending-mode supersedes are stated as not logged by the producer', has(r, /supersedes before the Live decision are never logged by the producer and are not counted/));
    r = run(scene('lost', { ov: { [EASY[0]]: { noLive: true } } }));
    check('Lost: shown=live, superseded=no, no live capture -> MISMATCH lost_live_captures=1 (no inference of a supersede)', has(r, /lost_live_captures=1/) && has(r, /superseded_turns=0/) && has(r, /CAPTURES check: MISMATCH/) && !has(r, /reader bars MET/));
    r = run(scene('lost-sup', { ov: { [EASY[0]]: { sup: true, supDiag: { phase: 'streaming', lw: 'no' }, noLive: true } } }));
    check('Lost while superseded is still lost (the diag line does not excuse a missing capture)', has(r, /lost_live_captures=1/) && has(r, /superseded_turns=1/) && has(r, /CAPTURES check: MISMATCH/));
    r = run(scene('prefix', { ov: Object.fromEntries(LIVE40.map((i) => [i.id, { preFix: true }])) }));
    check('Pre-fix log (no superseded fields): counted and printed as a warning, reading still works', has(r, /WARNING pre-fix log: 47 decision line\(s\) without superseded=, \d+ capture\(s\) without a superseded flag/) && has(r, /decisions_in_hour=47/) && r.code === 0);

    // ---- fix2 I1: session failed parsed leniently; no dispatches_before -> exit 2
    r = run(scene('i1-newline', { extra: () => [Ln(T0 + 120000, '[Router] session failed reason=ws closed: boom\n    at Socket.onclose (file.js:1:2) dispatches_before=9')] }));
    check('I1: a reason holding a newline (dispatches_before on the continuation line) is still VOID', r.code === 3 && has(r, /session failed lines=1 dispatches_before=9/), `code=${r.code}`);
    r = run(scene('i1-trailing', { extra: () => [Ln(T0 + 120000, '[Router] session failed reason=quick attempts exhausted dispatches_before=9 extra=1')] }));
    check('I1: a trailing field after dispatches_before is still VOID', r.code === 3 && has(r, /dispatches_before=9/), `code=${r.code}`);
    r = run(scene('i1-last', { extra: () => [Ln(T0 + 120000, '[Router] session failed reason=odd dispatches_before=99 dispatches_before=3')] }));
    check('I1: the LAST dispatches_before on the line wins', r.code === 3 && has(r, /dispatches_before=3/), `code=${r.code}`);
    r = run(scene('i1-absent', { extra: () => [Ln(T0 + 120000, '[Router] session failed reason=quick attempts exhausted')] }));
    check('I1: a session failed line with no dispatches_before refuses with exit 2 naming it', r.code === 2 && has(r, /session failed.*no dispatches_before/), `code=${r.code}`);
    r = run(scene('i1-ear-absent', { extra: () => [Ln(T0 + 90000, '[Router] ear failover from=3.1 to=2.5 reason=drop')] }));
    check('I1: an ear failover line with no dispatches_before refuses with exit 2', r.code === 2 && has(r, /ear failover.*no dispatches_before/), `code=${r.code}`);
    r = run(scene('i1-ear-trailing', { extra: () => [Ln(T0 + 90000, '[Router] ear failover from=3.1 to=2.5 reason=drop dispatches_before=4 x=1')] }));
    check('I1: an ear failover with a trailing field is parsed', r.code === 0 && has(r, /ear failovers=1 \(reported only\) dispatches_before=4/));

    // Task 10/11 lines (integration 143d8df): none of them may read as a failover or a session failure
    r = run(scene('t1011-lines', { extra: () => [
        Ln(T0 - 125000, '[Router] flag NATIVELY_LIVE_ROUTER=on'),
        Ln(T0 - 124000, '[Router] ear model=gemini-3.1-flash-live-preview'),
        Ln(T0 - 123000, '[Router] ear model id not recognised (neither 3.1 nor 2.5): the arbiter keeps its previous ear'),
        Ln(T0 - 122000, '[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=gemini-2.5-flash-native-audio-latest'),
        Ln(T0 + 90000, '[Router] ear failover from=3.1 to=2.5 reason=drop dispatches_before=3'),
    ] }));
    check('Task 11: "ear failover disabled" is NOT a failover (only the from= line counts: 1), and the other new lines are ignored without error', r.code === 0 && has(r, /ear failovers=1 \(reported only\) dispatches_before=3/), `code=${r.code}`);
    r = run(scene('t1011-disabled-only', { extra: () => [Ln(T0 - 122000, '[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=x')] }));
    check('Task 11: a log with only "ear failover disabled" reads 0 failovers and exit 0 (no dispatches_before is needed)', r.code === 0 && has(r, /ear failovers=0 \(reported only\)/), `code=${r.code}`);

    // ---- fix2 I2: a label is not a shown answer
    r = run(scene('i2-notoken', { ov: { [HARD[0]]: { shadow: '-', sent: 1 } } }));
    check('I2: shown=pipeline with shadow=- (sent=1, a label only) reads dispatched with nothing shown 1 and FAILS Fallback and integrity', has(r, /shadow=-\): 1 /) && has(r, /nothing shown \(sent=0\): 0 /) && has(r, /pipeline_no_token=1/) && bar(r, 'Fallback') === 'FAIL' && !has(r, /reader bars MET/), (r.text.match(/BAR Fallback.*/) ?? [''])[0]);
    check('I2 control: the clean log has pipeline_no_token=0', has(run(scene('i2-clean')), /pipeline_no_token=0/));

    // ---- fix2 I3: the conventional median
    const evenOv = (a, b) => Object.fromEntries(EASY.slice(0, 14).map((id, i) => [id, { lf: i < 7 ? a : b }]));
    r = run(scene('i3-even-fail', { nLive: 14, ov: evenOv(2500, 3000) }));
    check('I3: n=14, 7th=2500 passes nearest-rank but the median is 2750 -> FAIL', bar(r, 'Speed') === 'FAIL' && has(r, /p50=2750 limit=2500 n=14/), (r.text.match(/BAR Speed.*/) ?? [''])[0]);
    r = run(scene('i3-even-pass', { nLive: 14, ov: evenOv(2000, 2900) }));
    check('I3: n=14, middle values 2000 and 2900 -> median 2450 -> PASS (the upper middle would fail)', bar(r, 'Speed') === 'PASS' && has(r, /p50=2450 /));

    // ---- fix2 I4: the log must cover the hour
    r = run(scene('i4-nohdr', { headers: [] }));
    check('I4: a log with no session-start line refuses with exit 2', r.code === 2 && has(r, /log does not cover the hour \(rotation or restart\)/), `code=${r.code}`);
    r = run(scene('i4-late', { headers: [T0 + 60000] }));
    check('I4: a session-start line after the hour start (a restart cut the head) refuses with exit 2', r.code === 2 && has(r, /does not cover the hour/), `code=${r.code}`);
    r = run(scene('i4-restart', { headers: [T0 - 600000, T0 + 600000] }));
    check('I4: a second session-start line inside the hour refuses with exit 2', r.code === 2 && has(r, /restarted inside the hour/), `code=${r.code}`);
    r = run(scene('i4-ok-old', { headers: [T0 - 9000000, T0 - 600000] }));
    check('I4 control: an older session before the covering header is ignored', r.code === 0);

    // ---- fix2 M1: duplicates fail integrity and count once
    r = run(scene('m1-dupdec', { ov: { [HARD[0]]: { dupDecision: true } } }));
    check('M1: a duplicate decision line counts once (47 in hour) and FAILS integrity', has(r, /decisions_in_hour=47/) && has(r, /duplicate decision lines=1/) && !has(r, /reader bars MET/));
    r = run(scene('m1-dupdisp', { ov: { [HARD[0]]: { dupDispatchLine: true } } }));
    check('M1: a duplicate dispatch line FAILS integrity', has(r, /duplicate dispatch lines=1/) && !has(r, /reader bars MET/));
    r = run(scene('m1-nodisp', { ov: { [HARD[0]]: { dispatch: false } } }));
    check('M1: a decision without a dispatch line FAILS integrity', has(r, /decision lines without a dispatch line=1/) && !has(r, /reader bars MET/));

    // ---- fix2 M2: lines that cannot be read are counted
    r = run(scene('m2-field', { extra: () => [Ln(T0 + 100000, '[Router] turn=555 route=hard shown=pipeline q_at=' + (T0 + 100000))] }));
    check('M2: a decision line missing a field is counted and FAILS integrity', has(r, /unparsed_decision_lines=1 decisions_without_q_at=0/) && !has(r, /reader bars MET/));
    r = run(scene('m2-noq', { extra: () => [Ln(T0 + 100000, '[Router] turn=556 route=hard reason=- live_first_ms=- live_words=- shown=pipeline shadow=4000 ear=3.1 router=up q_src=vad sent=3 superseded=no')] }));
    check('M2: a decision without q_at is counted and FAILS integrity', has(r, /unparsed_decision_lines=0 decisions_without_q_at=1/) && !has(r, /reader bars MET/));
    check('M2 control: clean log counts 0 and 0', has(run(scene('m2-clean')), /unparsed_decision_lines=0 decisions_without_q_at=0/));

    // ---- fix2 M3: a decision after endedMs maps like routerCapture.mjs
    r = run(scene('m3-after', { ov: { [LIVE40[46].id]: { q: T1 + 3000 } } }));
    check('M3: a decision after endedMs is mapped to the last item (decisions_in_hour=47), files MATCH', has(r, /decisions_in_hour=47 decisions_outside_hour=1/) && has(r, /CAPTURE FILES: MATCH/) && has(r, /reader bars MET/), (r.text.match(/RUN .*/) ?? [''])[0]);
    {   // the same scene through the harness's own builder: it must produce the same ids the reader expects
        const { buildCaptureFiles } = await import(pathToFileURL(path.join(ROOT, 'electron', 'test', 'golden', 'routerCapture.mjs')).href);
        const d = path.join(work, 'm3-after');
        const cap = buildCaptureFiles(fs.readFileSync(path.join(d, 'natively_debug.log'), 'utf8'), JSON.parse(fs.readFileSync(path.join(d, 'interview60.timeline.json'), 'utf8')));
        const mine = JSON.parse(fs.readFileSync(path.join(d, 'interview60.answers.router-live.json'), 'utf8'));
        check('M3: the harness builder and the scene agree on every live entry id', cap.live.length === mine.length && cap.live.every((e, i) => e.id === mine[i].id && e.turn === mine[i].turn), `harness=${cap.live.length} scene=${mine.length}`);
    }

    // ---- fix2 M4: tallies are labelled session-wide
    check('M4: the tallies header and every TALLY line say session-wide', has(run(scene('m4')), /--- 4\. TALLIES \(SESSION-WIDE: the whole app session, preflight and probe included, NOT the hour/) && !/TALLY (?!session-wide)/.test(run(scene('m4b')).text));
    check('Clean log prints no pre-fix warning', !has(run(scene('clean2')), /WARNING pre-fix/));

    // ---- tallies
    r = run(scene('tallies', { extra: () => [
        Ln(T0 + 10000, '[Router] session connect model=gemini-3.8-live block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_sha12=abc context_chars=10'),
        Ln(T0 + 20000, '[Router] session close gen=2 code=1011 reason=RESOURCE_EXHAUSTED quota stale=no quota=yes'), Ln(T0 + 20001, '[Router] session reconnect attempt=1 reason=quota backoff 2000ms'),
        Ln(T0 + 30000, '[Router] session up setup_ms=700'),
        Ln(T0 + 40000, '[Router] session close gen=3 code=- reason=goAway stale=no quota=no'), Ln(T0 + 40001, '[Router] session reconnect attempt=1 reason=goAway'), Ln(T0 + 40100, '[Router] session close gen=3 code=1000 reason=late socket stale=yes quota=no'), Ln(T0 + 41000, '[Router] session up setup_ms=700'),
        Ln(T0 + 50000, '[LiveRouter] close gen=4 code=1006 reason=net stale=no'), Ln(T0 + 50100, '[LiveRouter] close gen=3 code=1006 reason=net stale=yes'), Ln(T0 + 50200, '[LiveRouter] reconnecting (attempt 1/3) in 500ms — net'), Ln(T0 + 50300, '[Main] Live Mode status: reconnecting'), Ln(T0 + 51000, '[Main] Live Mode status: connected'),
    ] }));
    check('Tallies: router connects/reconnects/quota/closes (stale and quota counted apart)', has(r, /TALLY session-wide router connects=2 up=3 reconnects=1 quota_reconnects=1 refused=0/) && has(r, /TALLY session-wide router closes total=3 stale=1 quota_closes=1 /), (r.text.match(/TALLY .*router connects.*/) ?? [''])[0]);
    check('Tallies: ear closes, stale, reconnecting', has(r, /TALLY session-wide ear connected=1 reconnecting_status=1 reconnecting_lines=1 quota_closes=0/) && has(r, /TALLY session-wide ear closes total=2 stale=1/));

    // ---- usage
    const u = spawnSync(process.execPath, [READER, path.join(work, 'clean')], { encoding: 'utf8' });
    check('Usage: a missing --down-limit-min is exit 2 with a message', u.status === 2 && /down-limit-min/.test(u.stderr ?? ''), `code=${u.status}`);
    const u2 = spawnSync(process.execPath, [READER], { encoding: 'utf8' });
    check('Usage: no run folder is exit 2', u2.status === 2);
}

async function execute(label) {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-cal-'));
    await suite();
    const failed = results.filter((x) => !x.ok);
    for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.name}${!x.ok && x.detail ? '  [' + x.detail + ']' : ''}`);
    console.log(`${label}: ${results.length - failed.length}/${results.length} assertions passed`);
    fs.rmSync(work, { recursive: true, force: true });
    return failed.map((x) => x.name);
}

const failedNames = await execute('CAL');
let allOk = failedNames.length === 0;

if (process.argv.includes('--mutations')) {
    // The effect-absent check: break the reader on purpose; the calibration must fail against every broken copy.
    const src = fs.readFileSync(READER, 'utf8');
    const muts = [
        ['drop-dup-exclusion', '} else extraLines.push(rec);', '} else decisions.push(rec);'],
        ['B1-drop-diag-parse', 'if (supDiag.has(t)) supExtra++; else supDiag.set(t, { phase: m[2], lineWritten: m[3] === \'yes\' });', 'void t;'],
        ['B1-drop-case-d', 'if (sd.lineWritten && d.superseded !== false) supDefects++;', ''],
        ['B1-drop-case-c', 'if (!sd.lineWritten && d.superseded !== true) supDefects++;', ''],
        ['B1-ignore-orphans', 'supOrphan === 0 &&', ''],
        ['B1-exempt-all-phases', "supDiag.get(turn)?.phase !== 'streaming') {", 'true) {'],
        ['I1-strict-failed-regex', '/^\\[Router\\] session failed\\b/.test(msg)', '/^\\[Router\\] session failed reason=.* dispatches_before=\\d+$/.test(msg)'],
        ['T11-disabled-read-as-failover', '/^\\[Router\\] ear failover from=/.test(msg)', '/^\\[Router\\] ear failover\\b/.test(msg)'],
        ['I1-absent-skipped', "if (!all.length) fail(", "if (!all.length) return 99999; fail("],
        ['I2-label-counts-as-shown', 'sent0.length === 0 && noToken.length === 0;', 'sent0.length === 0;'],
        ['I3-lower-middle', 'return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;', 'return s[h - (s.length % 2 ? 0 : 1)];'],
        ['I4-no-cover-check', 'if (from < 0) fail(', 'if (false) fail('],
        ['M1-duplicates-not-integrity', 'const lineIntegrityOk = noDispatch === 0 && decMulti === 0 && dupDispatch === 0 &&', 'const lineIntegrityOk = true ||'],
        ['M2-unparsed-not-integrity', ' && unparsedDecisionLines === 0 && decisionsNoQ === 0;', ';'],
        ['M3-bound-at-endedMs', 'if (qAt === null || qAt < starts[0]) return null;', 'if (qAt === null || qAt < starts[0] || qAt > timeline.endedMs) return null;'],
        ['M4-unlabelled-tallies', 'TALLY session-wide router connects', 'TALLY router connects'],
        ['ignore-OFFSET_MS', 'export const OFFSET_MS = 1150;', 'export const OFFSET_MS = 0;'],
        ['pipeline-marker-any-case', '/__[A-Z][A-Z0-9_]*__/g', '/__\\S+?__/g'],
        ['pipeline-brackets-are-markers', 'const pipelineUnknownMarker = (text) => [...String', 'const pipelineUnknownMarker = (text) => /[<>\\[\\]]/.test(text) || [...String'],
        ['void-floor-off-by-one', 'x.before < VOID_DISPATCH_FLOOR', 'x.before <= VOID_DISPATCH_FLOOR'],
        ['stale-close-counts-down', "if (m[3] === 'no') routerStates.push({ ts, up: false });", 'routerStates.push({ ts, up: false });'],
        ['speed-limit-strict', 'p50 <= SPEED_LIMIT_MS', 'p50 < SPEED_LIMIT_MS'],
        ['easy-min-12', 'export const EASY_CAUGHT_MIN = 13;', 'export const EASY_CAUGHT_MIN = 12;'],
        ['misrouted-counts-late', "const NO_DECIDER = new Set(['late', 'no-router-turn', 'unpaired', 'router-down']);", "const NO_DECIDER = new Set([]);"],
        ['sent0-ignored', 'const sent0 = dec.filter((d) => d.sent === 0);', 'const sent0 = [];'],
        ['bare-token-substring', 'const bareRoutingToken = (text) => /^(hard)+$/.test(letters(text));', 'const bareRoutingToken = (text) => /hard/.test(letters(text));'],
        ['old-inference-lost-is-superseded', "if (!km.has('live')) lostLive++;", "if (!km.has('live')) { /* old: inferred supersede */ }"],
        ['superseded-partial-text-flagged', "km.has('live') && supDiag.get(turn)?.phase !== 'streaming') { const w", "km.has('live')) { const w"],
        ['wb-fix-b-first-token-only', 'tokens(text).find((x) => letters(x) !== \'\'); return t !== undefined && isHardWord(t);', 'tokens(text)[0]; return t !== undefined && isHardWord(t);'],
        ['prefix-warning-silent', 'if (preFixLines || preFixCaps || supNoDiag) P(', 'if (false) P('],
    ];
    for (const [name, from, to] of muts) {
        if (!src.includes(from)) { console.log(`MUTATION ${name}: NOT APPLICABLE (pattern not found: the reader changed)`); allOk = false; continue; }
        const tmp = path.join(os.tmpdir(), `rh-mut-${name}.mjs`);
        fs.writeFileSync(tmp, src.replace(from, to));
        const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: 'utf8', env: { ...process.env, RH_READER: tmp } });
        const m = (child.stdout ?? '').match(/CAL: (\d+)\/(\d+) assertions passed/);
        const caught = child.status !== 0 && m && Number(m[1]) < Number(m[2]);
        const names = (child.stdout ?? '').split('\n').filter((l) => l.startsWith('FAIL ')).map((l) => l.slice(5, 60));
        console.log(`MUTATION ${name}: ${caught ? 'CAUGHT' : 'NOT CAUGHT'} (${m ? `${Number(m[2]) - Number(m[1])} assertion(s) failed` : 'cal did not run'}; first: ${names[0] ?? '-'})`);
        if (!caught) allOk = false;
        fs.rmSync(tmp, { force: true });
    }
}
console.log(allOk ? 'CALIBRATION OK' : 'CALIBRATION FAILED');
process.exit(allOk ? 0 : 1);
