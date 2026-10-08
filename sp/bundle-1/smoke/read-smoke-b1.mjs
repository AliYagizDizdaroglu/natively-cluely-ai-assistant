// read-smoke-b1.mjs: reads the bundle-1 smoke (SPEC-bundle-1 7.4 as amended by AMENDMENT-A1 section 3) from the newest run folder ending in -<label> and writes
// bundle-1\smoke\SMOKE-READ.txt. IDS, COUNTS AND LOG-LINE NAMES ONLY: no question or answer text is copied (check-smoke-cues v5 is run as a child and only its
// summary line, its hedge line and its verdict are kept). Reads logs; no model call; no key; MAIN is only read.
//   node read-smoke-b1.mjs --label b1-smoke [--observe <observe.log>] [--runs <dir>] [--launcher-log <file>] [--out <file>]     (cwd = MAIN)
//   node read-smoke-b1.mjs --self-test       calibration on synthetic logs: a passing smoke, then each bar broken once (must flip exactly that row)
// Exit 0 = every applicable row PASS, 1 = some row FAIL, 2 = nothing to read. Rows:
//   S-H     every dispatched question answered (or superseded), doubles <= 1 (dispatches - (roster + 2 probe)), 0 hard failures (failed answers, session failed, drill refused), dist proofs passed twice
//   S-R1/S-R2  routing, REPORTED ONLY (A1): route x shown counts outside the drill windows
//   S-SL    0 `reason=silent-listener` outside the ear-mute window
//   S-CUE   check-smoke-cues v5 CLEAN, well-formed >= 90 percent, 0 cue blocks over 3 lines x 5 words
//   D1      router-drop: close <= 1 s after T, up <= 5 s after T, dispatches while down are row-1 pipeline and answered, first dispatch after up has router=up, 0 session failed
//   D2      ear-mute: 0 silent-listener before T; failover to 2.5 judged by the 5th interviewer utterance after T; ear model 2.5; a caption within 2 utterances; dispatches in the window answered
//   OBS     the app's electron processes ran in the console session (SessionId == console) and the overlay was shown (`[WindowHelper] Switching to OVERLAY`)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GRACE_MS = 10_000;           // earSilence graceMs (SPEC 5.2): an utterance is judged this long after it ends
const DROP_WINDOW_MS = 120_000;    // SPEC 7.4: [T, T + 120 s]
const MUTE_AFTER_CAPTION_MS = 60_000;
const PROBE_QUESTIONS = 2;         // the harness probe clip, answered by the app before the hour (counted in the dispatches)

const ts = (l) => { const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) /.exec(l); return m ? Date.parse(m[1]) : NaN; };
const hms = (ms) => new Date(ms).toISOString().slice(11, 23) + 'Z';
const kv = (l, k) => new RegExp(`(?:^|\\s)${k}=(\\S+)`).exec(l)?.[1];

/** Pure: the whole reading from the log lines. ctx = { rosterItems, observeLines, launcherText, cueSmoke:{status,summary,hedge,verdict,wellFormedPct,over} } */
export function analyze(lines, ctx) {
    const rows = []; const info = [];
    const row = (id, ok, reading) => rows.push({ id, ok, reading });
    const L = lines.map((l) => ({ l, t: ts(l) })).filter((x) => Number.isFinite(x.t));
    const of = (pred) => L.filter((x) => pred(x.l));
    // ---- the drill's own lines
    const armed = of((l) => l.includes('[Drill] armed '));
    const refused = of((l) => l.includes('[Drill] refused'));
    const dropLine = of((l) => /\[Drill\] router-drop$/.test(l.trim()) || /\[Drill\] router-drop\s*$/.test(l))[0];
    const dropSkipped = of((l) => l.includes('[Drill] router-drop skipped'))[0];
    const muteLine = of((l) => l.includes('[Drill] ear-mute model='))[0];
    const closes = of((l) => l.includes('[Router] session close'));
    const ups = of((l) => l.includes('[Router] session up'));
    const failedSessions = of((l) => l.includes('[Router] session failed'));
    const silent = of((l) => l.includes('reason=silent-listener') && l.includes('[Router] ear failover'));
    const earModels = of((l) => l.includes('[Router] ear model='));
    const captions = of((l) => l.includes('[LiveCaption] fragment'));
    const uttEnds = of((l) => l.includes('[Main] turn: deepgram utterance-end'));
    const dispatches = of((l) => l.includes('[Router] dispatch turn='));
    const turns = of((l) => /\[Router\] turn=\d+ route=/.test(l));
    const turnById = new Map(); for (const x of turns) turnById.set(kv(x.l, 'turn'), x);
    const answered = (id) => { const x = turnById.get(id); if (!x) return false; const s = kv(x.l, 'shown'); return s === 'live' || s === 'pipeline'; };
    const superseded = (id) => { const x = turnById.get(id); return !!x && kv(x.l, 'superseded') === 'yes'; };
    const first2_5 = earModels.find((x) => x.l.includes('gemini-2.5-flash-native-audio-latest') && (!muteLine || x.t >= muteLine.t));
    const failover = silent[0];
    const tDrop = dropLine?.t; const tMute = muteLine?.t;
    const dropWin = tDrop != null ? [tDrop, tDrop + DROP_WINDOW_MS] : null;
    let muteEnd = null;
    const cap25 = first2_5 ? captions.find((x) => x.t >= first2_5.t) : null;
    if (tMute != null) muteEnd = cap25 ? cap25.t + MUTE_AFTER_CAPTION_MS : (L.length ? L[L.length - 1].t : tMute);
    const muteWin = tMute != null ? [tMute, muteEnd] : null;
    const inWin = (t, w) => w && t >= w[0] && t <= w[1];

    // ---- S-H
    const dTurns = dispatches.map((x) => kv(x.l, 'turn'));
    const unanswered = dTurns.filter((id) => !answered(id) && !superseded(id));
    const expected = (ctx.rosterItems ?? 47) + PROBE_QUESTIONS;
    const doubles = Math.max(0, dTurns.length - expected);
    const sessionFailed = failedSessions.length;
    const hardFail = (ctx.cueSmoke?.failedAnswers ?? 0) + sessionFailed + refused.length;
    const distOk = ctx.launcherText == null ? null : (ctx.launcherText.split('B1 PROOFS: ALL PASSED').length - 1) >= 2;
    row('S-H', unanswered.length === 0 && doubles <= 1 && hardFail === 0 && distOk !== false,
        `dispatches ${dTurns.length} (expected ${expected} = roster ${ctx.rosterItems ?? 47} + ${PROBE_QUESTIONS} probe), turn lines ${turns.length}, unanswered ${unanswered.length}${unanswered.length ? ' [turn ' + unanswered.join(',') + ']' : ''}, superseded ${dTurns.filter(superseded).length}, doubles ${doubles} (bar <= 1), hard failures ${hardFail} (failed answers ${ctx.cueSmoke?.failedAnswers ?? 'n/a'}, session failed ${sessionFailed}, drill refused ${refused.length}), dist proofs passed ${distOk === null ? 'n/a' : distOk ? 'before and after' : 'NOT twice'}`);

    // ---- S-R1 / S-R2: reported only
    const cnt = {};
    for (const x of turns) { if (inWin(x.t, dropWin) || inWin(x.t, muteWin)) continue; const k = `${kv(x.l, 'route')}/${kv(x.l, 'shown')}`; cnt[k] = (cnt[k] ?? 0) + 1; }
    info.push(`S-R1/S-R2 REPORTED ONLY (A1, no routing claim): turn lines outside the drill windows by route/shown: ${Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);

    // ---- S-SL
    const slOut = silent.filter((x) => !inWin(x.t, muteWin));
    row('S-SL', slOut.length === 0, `silent-listener failover lines outside the ear-mute window: ${slOut.length} of ${silent.length}${muteWin ? ` (window ${hms(muteWin[0])}..${hms(muteWin[1])})` : ' (no ear-mute window: the drill did not mute)'}`);

    // ---- S-CUE
    const cs = ctx.cueSmoke;
    if (!cs || cs.status === 2) row('S-CUE', false, `check-smoke-cues v5 could not read the run (exit ${cs ? cs.status : 'n/a'})`);
    else row('S-CUE', cs.status === 0 && cs.wellFormedPct >= 90 && cs.over === 0, `check-smoke-cues v5 ${cs.verdict}; ${cs.summary}; well-formed ${cs.wellFormedPct.toFixed(1)} percent (bar >= 90), blocks over 3x5: ${cs.over}`);

    // ---- D1
    if (!dropLine) {
        row('D1', false, dropSkipped ? '[Drill] router-drop skipped: the router was already down at T' : `no [Drill] router-drop line (armed ${armed.length}, refused ${refused.length})`);
    } else {
        const close = closes.find((x) => x.t >= tDrop);
        const up = ups.find((x) => x.t > tDrop && (!close || x.t >= close.t));
        const closeMs = close ? close.t - tDrop : null, upMs = up ? up.t - tDrop : null;
        const downDisp = dispatches.filter((x) => close && x.t >= close.t && (!up || x.t < up.t));
        const downBad = downDisp.filter((x) => kv(x.l, 'router') !== 'down' || !answered(kv(x.l, 'turn')) || kv(turnById.get(kv(x.l, 'turn'))?.l ?? '', 'shown') !== 'pipeline');
        const after = up ? dispatches.find((x) => x.t > up.t) : null;
        const afterOk = !after || kv(after.l, 'router') === 'up';
        const failedInWin = failedSessions.filter((x) => x.t >= tDrop).length;
        row('D1', closeMs != null && closeMs <= 1000 && upMs != null && upMs <= 5000 && downBad.length === 0 && afterOk && failedInWin === 0,
            `T ${hms(tDrop)}; session close +${closeMs ?? 'MISSING'} ms (bar <= 1000); session up +${upMs ?? 'MISSING'} ms (bar <= 5000); dispatches while down ${downDisp.length}${downDisp.length === 0 ? ' (none arrived in the gap: that bar is vacuous)' : ''}, not row-1 pipeline answered ${downBad.length}; first dispatch after up router=${after ? kv(after.l, 'router') : 'n/a (none)'}; session failed after T ${failedInWin}`);
    }

    // ---- D2
    if (!muteLine) {
        row('D2', false, `no [Drill] ear-mute line (armed ${armed.length}, refused ${refused.length})`);
    } else {
        const before = silent.filter((x) => x.t < tMute).length;
        const uAfter = uttEnds.filter((x) => x.t > tMute);
        const uJudged = failover ? uAfter.filter((x) => x.t <= failover.t - GRACE_MS).length : null;
        const failoverOk = !!failover && uJudged <= 5;
        const model25 = !!first2_5 && !!failover && first2_5.t >= failover.t;
        let capNote = 'n/a'; let capOk = false;
        if (first2_5) {
            const uNext = uttEnds.filter((x) => x.t > first2_5.t).slice(0, 2);
            const limit = (uNext.length === 2 ? uNext[1].t : Infinity) + GRACE_MS;
            const c = captions.find((x) => x.t >= first2_5.t);
            capOk = !!c && c.t <= limit; capNote = c ? `+${c.t - first2_5.t} ms after ear model 2.5` : 'MISSING';
        }
        const winDisp = dispatches.filter((x) => inWin(x.t, muteWin));
        const winBad = winDisp.filter((x) => !answered(kv(x.l, 'turn')) && !superseded(kv(x.l, 'turn')));
        row('D2', before === 0 && failoverOk && model25 && capOk && winBad.length === 0,
            `T ${hms(tMute)}; silent-listener before T ${before} (bar 0); failover ${failover ? `at +${failover.t - tMute} ms, judged after ${uJudged} interviewer utterance(s) past T (bar <= 5)` : 'MISSING'}; ear model 2.5 line ${first2_5 ? `at ${hms(first2_5.t)}` : 'MISSING'}; first caption on 2.5 ${capNote} (bar: within 2 utterances); dispatches in the window ${winDisp.length}, unanswered ${winBad.length}`);
    }

    // ---- OBS
    const ob = ctx.observeLines;
    // the overlay must be shown AFTER the autostart line (the harness autostart now calls setWindowMode('overlay', true)); an earlier one does not count
    const autoIdx = L.findIndex((x) => x.l.includes('NATIVELY_AUTOSTART_MEETING=1') && x.l.includes('starting a meeting automatically'));
    const overlay = autoIdx < 0 ? 0 : L.slice(autoIdx + 1).filter((x) => x.l.includes('[WindowHelper] Switching to OVERLAY')).length;
    const launcherShown = of((l) => l.includes('[WindowHelper] Switching to LAUNCHER')).length;
    if (!ob) row('OBS', false, 'no observe log: the sampler did not run');
    else {
        const samples = ob.map((l) => /console=(\d+) self=(\d+) electron=(\S+) windows=(\S+)/.exec(l)).filter(Boolean).map((m) => ({ console: +m[1], self: +m[2], el: m[3] === 'none' ? [] : m[3].split(',').map((p) => +p.split(':')[1]), win: m[4] === 'none' ? [] : m[4].split(',').map((p) => p.split(':')[1]) }));
        const withApp = samples.filter((s) => s.el.length > 0);
        const wrong = withApp.filter((s) => s.el.some((sid) => sid !== s.console || sid === 0));
        const sizes = [...new Set(withApp.flatMap((s) => s.win))];
        const sessOk = withApp.length > 0 && wrong.length === 0;
        row('OBS', sessOk && overlay >= 1,
            `samples ${samples.length}, with electron ${withApp.length}, in a session other than the console ${wrong.length} (console ${[...new Set(samples.map((s) => s.console))].join('/')}); visible electron window sizes seen: ${sizes.join(' ') || 'none'}; overlay shown ([WindowHelper] Switching to OVERLAY) ${overlay} time(s), launcher shown ${launcherShown} time(s)${overlay === 0 ? ' - no OVERLAY switch after the autostart line, so the answers go to a window nobody sees' : ''}`);
    }

    // ---- drill evidence lines (the user's list)
    const nextDispAfterDrop = tDrop != null ? dispatches.find((x) => x.t > tDrop) : null;
    const ev = (name, x, extra = '') => `EVIDENCE ${name}: ${x ? `found ${hms(x.t)}${extra}` : 'MISSING'}`;
    const evidence = [
        ev('[Drill] router-drop', dropLine),
        ev('router reconnect ([Router] session up after the drop)', tDrop != null ? ups.find((x) => x.t > tDrop) : null),
        ev('pipeline answered the next question after the drop', nextDispAfterDrop && answered(kv(nextDispAfterDrop.l, 'turn')) ? nextDispAfterDrop : null, nextDispAfterDrop ? ` (turn ${kv(nextDispAfterDrop.l, 'turn')}, shown=${kv(turnById.get(kv(nextDispAfterDrop.l, 'turn'))?.l ?? '', 'shown')}, router=${kv(nextDispAfterDrop.l, 'router')})` : ''),
        ev('[Drill] ear-mute', muteLine),
        ev('[Router] ear failover from=3.1 to=2.5 reason=silent-listener', failover),
        ev('[Router] ear model=gemini-2.5-flash-native-audio-latest', first2_5),
        ev('captions resumed on 2.5 ([LiveCaption] after the 2.5 ear)', cap25),
    ];
    return { rows, info, evidence, drill: { armed: armed.map((x) => x.l.slice(x.l.indexOf('[Drill] armed ')).trim()), refused: refused.length } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
function cueSmokeFor(label, runsDir) {
    const r = spawnSync(process.execPath, [path.join(HERE, '..', 'check-smoke-cues.mjs'), label, '--runs', runsDir], { encoding: 'utf8', timeout: 120000 });
    const out = (r.stdout ?? '').split(/\r?\n/);
    const summary = out.find((l) => /answers \d+ \(real \d+, failed \d+\)/.test(l)) ?? '';
    const m = /answers (\d+) \(real (\d+), failed (\d+)\), superseded (\d+), cue lines (\d+) .*?malformed (\d+), block-only (\d+), trimmed (\d+), cue rule skipped (\d+) \(expected-empty cues (\d+)\)/.exec(summary);
    const verdict = out.find((l) => /^CUE SMOKE (NOT )?CLEAN/.test(l)) ?? `no verdict (exit ${r.status})`;
    const hedge = out.find((l) => /^\s+hedge won by/.test(l))?.trim() ?? '';
    // over 3 lines x 5 words, counted from the `malformed:` lines of v5 (the cue text itself is never copied out)
    let over = 0;
    for (const l of out) { const mm = /^\s+malformed: (.*)$/.exec(l); if (!mm) continue; try { const a = JSON.parse(mm[1]); if (Array.isArray(a) && (a.length > 3 || a.some((s) => typeof s === 'string' && s.trim().split(/\s+/).length > 5))) over++; } catch { /* unparsable counts as malformed, not over */ } }
    const cueLines = m ? +m[5] : 0, malformed = m ? +m[6] : 0, expectedEmpty = m ? +m[10] : 0;
    const bearing = Math.max(0, cueLines - expectedEmpty);
    const wellFormedPct = bearing === 0 ? 0 : (100 * (bearing - malformed)) / bearing;
    const redacted = out.filter((l) => /^\s+(malformed|unparsable|failed answer|block-only|trimmed|e\.g\.)/.test(l)).length;
    return { status: r.status, verdict, hedge, failedAnswers: m ? +m[3] : 0, wellFormedPct, over,
        summary: summary ? summary.replace(/^[^:]*: /, '') : 'no summary line', redacted };
}

function render(a, header) {
    const out = [header, ''];
    for (const r of a.rows) out.push(`ROW ${r.id.padEnd(5)} ${r.ok ? 'PASS' : 'FAIL'}  ${r.reading}`);
    for (const i of a.info) out.push(`ROW INFO  ${i}`);
    out.push('');
    out.push(`drill armed: ${a.drill.armed.join(' | ') || 'NO [Drill] armed line'}; refused lines ${a.drill.refused}`);
    out.push(...a.evidence);
    const bad = a.rows.filter((r) => !r.ok).map((r) => r.id);
    out.push('');
    out.push(`SMOKE READ: ${a.rows.length - bad.length} PASS, ${bad.length} FAIL${bad.length ? ' (' + bad.join(', ') + ')' : ''}`);
    return { text: out.join('\r\n') + '\r\n', bad };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// calibration: a synthetic smoke that passes, then each bar broken once
function selfTest() {
    const base = Date.parse('2026-10-09T22:00:00.000Z');
    const at = (s) => new Date(base + s * 1000).toISOString();
    const mk = (opt = {}) => {
        const L = [];
        const P = (s, t) => L.push(`${at(s)} [LOG] ${t}`);
        P(0, `[Init] NATIVELY_AUTOSTART_MEETING=1 — starting a meeting automatically`);   // as main.ts:3729 prints it (review: the self-test lacked it)
        P(0, `[Drill] armed router-drop@600,ear-mute@750`);
        let turn = 0;
        const disp = (s, routerState = 'up', shown = 'pipeline') => { turn++; P(s, `[Router] dispatch turn=${turn} at=1 q_at=1 q_src=vad router=${routerState} ear=3.1`); if (!(opt.dropAnswer && turn === opt.dropAnswer)) P(s + 4, `[Router] turn=${turn} route=hard reason=- live_first_ms=1 live_words=1 shown=${shown} shadow=1 ear=3.1 router=${routerState} q_src=vad q_at=1 sent=1 superseded=no`); };
        for (let s = 100; s < 600; s += 25) { disp(s, 'up', 'live'); P(s + 6, '[Main] turn: deepgram utterance-end vad=false'); }
        P(600, '[Drill] router-drop'); P(600.3, '[Router] session close gen=1 code=1000 reason=closed stale=no quota=no');
        P(opt.upLate ? 612 : 601.4, '[Router] session up setup_ms=600');
        for (let s = 610; s < 750; s += 25) { disp(s, 'up', 'live'); P(s + 6, '[Main] turn: deepgram utterance-end vad=false'); }
        P(750, '[Drill] ear-mute model=gemini-3.1-flash-live-preview');
        if (opt.silentBefore) P(700, '[Router] ear failover from=3.1 to=2.5 reason=silent-listener dispatches_before=1');
        let s = 760; for (let k = 0; k < 5; k++, s += 25) { disp(s, 'up', 'pipeline'); P(s + 6, '[Main] turn: deepgram utterance-end vad=false'); }
        if (!opt.noFailover) { P(s - 25 + 6 + 10.3, '[Router] ear failover from=3.1 to=2.5 reason=silent-listener dispatches_before=5'); P(s - 25 + 6 + 10.4, '[Router] ear model=gemini-2.5-flash-native-audio-latest'); }
        if (!opt.noCaption) P(s + 12, '[LiveCaption] fragment "x"');
        if (opt.silentLate) P(s + 400, '[Router] ear failover from=3.1 to=2.5 reason=silent-listener dispatches_before=9');
        for (let k = 0; k < 5; k++, s += 25) { disp(s, 'up', 'live'); P(s + 6, '[Main] turn: deepgram utterance-end vad=false'); }
        P(s + 100, opt.overlay === false ? '[WindowHelper] Switching to LAUNCHER (inactive: false)' : '[WindowHelper] Switching to OVERLAY (inactive: false)');
        return L;
    };
    const okCtx = { rosterItems: 12, launcherText: 'B1 PROOFS: ALL PASSED\nB1 PROOFS: ALL PASSED', observeLines: ['2026-10-09T22:00:00.000Z observe-start pid=1', '2026-10-09T22:00:20.000Z console=1 self=1 electron=10:1,11:1 windows=10:158x26'],
        cueSmoke: { status: 0, verdict: 'CUE SMOKE CLEAN', summary: 'x', wellFormedPct: 100, over: 0, failedAnswers: 0 } };
    // roster 12 + 2 probe = 14 expected dispatches; the synthetic run dispatches 20+6+5+5... adjust below
    const probeLines = mk();
    const nDisp = probeLines.filter((l) => l.includes('[Router] dispatch')).length;
    okCtx.rosterItems = nDisp - PROBE_QUESTIONS;
    const cases = [
        ['pass', mk(), okCtx, null],
        ['router-drop late up', mk({ upLate: true }), okCtx, 'D1'],
        ['dropped answer', mk({ dropAnswer: 3 }), okCtx, 'S-H'],
        ['no failover', mk({ noFailover: true }), okCtx, 'D2'],
        ['silent before T', mk({ silentBefore: true }), okCtx, 'S-SL,D2'],
        ['no caption on 2.5', mk({ noCaption: true }), okCtx, 'D2'],
        ['silent-listener late (outside window)', mk({ silentLate: true }), okCtx, 'S-SL'],
        ['overlay never shown', mk({ overlay: false }), okCtx, 'OBS'],
        ['app in another session', mk(), { ...okCtx, observeLines: ['2026-10-09T22:00:20.000Z console=1 self=1 electron=10:0 windows=none'] }, 'OBS'],
        ['cue smoke not clean', mk(), { ...okCtx, cueSmoke: { ...okCtx.cueSmoke, status: 1, verdict: 'CUE SMOKE NOT CLEAN' } }, 'S-CUE'],
        ['dist proofs once', mk(), { ...okCtx, launcherText: 'B1 PROOFS: ALL PASSED' }, 'S-H'],
    ];
    let bad = 0;
    for (const [name, lines, ctx, wantFail] of cases) {
        const a = analyze(lines, ctx);
        const failing = a.rows.filter((r) => !r.ok).map((r) => r.id);
        const good = wantFail === null ? failing.length === 0 : failing.slice().sort().join(',') === wantFail.split(',').sort().join(',');
        if (!good) bad++;
        console.log(`${good ? 'ok  ' : 'BAD '} ${name.padEnd(40)} failing rows: ${failing.join(',') || 'none'} (want ${wantFail ?? 'none'})`);
        if (!good) for (const r of a.rows) console.log(`      ${r.id} ${r.ok ? 'PASS' : 'FAIL'} ${r.reading}`);
    }
    console.log(bad ? `SELF-TEST FAILED (${bad})` : 'SELF-TEST PASSED');
    process.exit(bad ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
    const label = arg('--label', 'b1-smoke');
    const runsDir = path.resolve(arg('--runs', path.join(process.cwd(), 'electron', 'test', 'golden', 'interview60.runs')));
    const outFile = path.resolve(arg('--out', path.join(HERE, 'SMOKE-READ.txt')));
    const dirs = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter((d) => d.endsWith(`-${label}`)).sort() : [];
    if (!dirs.length) { console.log(`no run folder ending in -${label} under ${runsDir}`); process.exit(2); }
    const dir = path.join(runsDir, dirs.at(-1));
    const logPath = path.join(dir, 'natively_debug.log');
    if (!fs.existsSync(logPath)) { console.log(`${dir}: no natively_debug.log`); process.exit(2); }
    const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
    let rosterItems = 47;
    try { rosterItems = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items.length; } catch { /* the roster size stays 47 */ }
    const obsFile = arg('--observe', null);
    const observeLines = obsFile && fs.existsSync(obsFile) ? fs.readFileSync(obsFile, 'utf8').split(/\r?\n/).filter(Boolean) : null;
    const launcherLog = arg('--launcher-log', path.join(runsDir, `${label}.launcher.log`));
    let launcherText = null;
    if (fs.existsSync(launcherLog)) { const t = fs.readFileSync(launcherLog, 'latin1'); const i = t.lastIndexOf('=== LAUNCHER b1-smoke start'); launcherText = i >= 0 ? t.slice(i) : t; }
    const cueSmoke = cueSmokeFor(label, runsDir);
    const a = analyze(lines, { rosterItems, observeLines, launcherText, cueSmoke });
    if (cueSmoke.hedge) a.info.push(cueSmoke.hedge);
    if (cueSmoke.redacted) a.info.push(`check-smoke-cues printed ${cueSmoke.redacted} detail line(s) that quote cue or answer text: withheld from this file`);
    const { text, bad } = render(a, `SMOKE-READ b1-smoke  run folder ${path.basename(dir)}  read ${new Date().toISOString()}  (ids, counts and log-line names only)`);
    fs.writeFileSync(outFile, text, 'utf8');
    process.stdout.write(text);
    process.exit(bad.length ? 1 : 0);
}
