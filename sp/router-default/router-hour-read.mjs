#!/usr/bin/env node
/**
 * Router-default hour reader (plan Task 14, spec 5 "The run reader", 10.2 bars, 11 VOID).
 *
 *   node router-hour-read.mjs <runDir> --down-limit-min <n> [--root <checkout>]
 *
 * Reads one run folder: natively_debug.log, interview60.timeline.json and the two capture files
 * (interview60.answers.router-live.json / router-shadow.json). Prints counts and milliseconds only,
 * NEVER answer text. Exit codes: 0 read OK, 3 VOID, 2 usage or unreadable input.
 *
 * Every printed line starts with a stable key (DECISION, SPEED, BAR, VOID ...) so the calibration can assert on it.
 * p50 is the usual median (the mean of the two middle values for an even n, I3 ruling); other percentiles are nearest-rank.
 * The pipeline marker set is uppercase-only (I6 ruling); hasMarker / checkCompleted / showablePrefix are never
 * applied to pipeline text, and the characters < > [ ] are not markers there.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const OFFSET_MS = 1150;                       // timelines stamp startedMs ~1.15 s before the audio starts (plan Global Constraints)
export const SPEED_LIMIT_MS = 2500;                  // spec 10.2
export const EASY_CAUGHT_MIN = 13;                   // of 20 EASY
export const HARD_MISROUTED_MAX = 1;                 // of 27 HARD
export const VOID_DISPATCH_FLOOR = 10;               // a router `session failed` with dispatches_before < 10 voids the run
const MAIN_ROOT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const REASONS = ['-', 'garbled-hard', 'too-short', 'too-long', 'incomplete', 'incomplete-after-show', 'marker', 'late', 'router-down', 'no-router-turn', 'unpaired', 'dup'];
const NO_DECIDER = new Set(['late', 'no-router-turn', 'unpaired', 'router-down']);   // M2: no deciding router turn
const ROW4 = new Set(['marker', 'too-long', 'incomplete', 'too-short']);              // spec 4.3 row 4 (shown=pipeline, route=invalid)

// ---- text classifiers (private to this reader; deliberately not the app's routeReader) ----
const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
const tokens = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const isHardWord = (tok) => /^(hard)+$/.test(letters(tok));
// wb-fix-b: same rule as the app's routeReader completeFirstWord: the first whitespace token whose letters-only (a-z) form is non-empty; punctuation-only and non-ASCII-only tokens (" ... — ü) are skipped.
const hardFirst = (text) => { const t = tokens(text).find((x) => letters(x) !== ''); return t !== undefined && isHardWord(t); };
const routerMarker = (text) => /[<>\[\]]/.test(text) || /__\S+?__/.test(text);                       // spec 4.2
const pipelineUnknownMarker = (text) => [...String(text).matchAll(/__[A-Z][A-Z0-9_]*__/g)].some((m) => m[0] !== '__MORE__' && m[0] !== '__CUES__');
const bareRoutingToken = (text) => /^(hard)+$/.test(letters(text));                                  // whole text, never a substring

const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.max(0, Math.ceil(p * s.length) - 1)]; };
// The conventional median (I3 ruling): the mean of the two middle values for an even n. p50 everywhere is this; p90 stays nearest-rank.
const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const f = (v) => (v === null || v === undefined || Number.isNaN(v) ? '-' : String(v));
const num = (s) => (s !== undefined && /^-?\d+$/.test(s) ? Number(s) : null);
const kv = (msg) => { const o = {}; for (const m of msg.matchAll(/(\w+)=(\S+)/g)) if (!(m[1] in o)) o[m[1]] = m[2]; return o; };
const trunc = (s) => (String(s).length > 60 ? String(s).slice(0, 57) + '...' : String(s));

function fail(msg) { const e = new Error(msg); e.usage = true; throw e; }

export async function readHour(runDir, { root = MAIN_ROOT, downLimitMin } = {}) {
    if (!Number.isFinite(downLimitMin) || downLimitMin < 0) fail('--down-limit-min <n> is required (the registration sets it, spec 10 / I7)');
    const rd = (name) => { const p = path.join(runDir, name); if (!fs.existsSync(p)) fail(`missing ${name} in ${runDir}`); return fs.readFileSync(p, 'utf8'); };
    const timeline = JSON.parse(rd('interview60.timeline.json'));
    const logText = rd('natively_debug.log');
    const rosterPath = path.join(root, 'electron', 'test', 'golden', 'live40.questions.mjs');
    if (!fs.existsSync(rosterPath)) fail(`roster not found: ${rosterPath}`);
    const { LIVE40 } = await import(pathToFileURL(rosterPath).href);
    const route = new Map(LIVE40.map((i) => [i.id, i.route]));
    const nEasy = LIVE40.filter((i) => i.route === 'EASY').length, nHard = LIVE40.filter((i) => i.route === 'HARD').length;
    if (LIVE40.length !== 47 || nEasy !== 20 || nHard !== 27) fail(`roster is not live40 (items=${LIVE40.length} EASY=${nEasy} HARD=${nHard}; want 47/20/27)`);
    if (!Number.isFinite(timeline.startedMs) || !Number.isFinite(timeline.endedMs) || !Array.isArray(timeline.items)) fail('timeline lacks startedMs / endedMs / items');
    for (const it of timeline.items) if (!route.has(it.id)) fail(`timeline item ${it.id} is not in the live40 roster`);
    const missingItems = LIVE40.filter((i) => !timeline.items.some((t) => t.id === i.id)).map((i) => i.id);
    if (missingItems.length) fail(`timeline lacks ${missingItems.length} live40 item(s): ${missingItems.slice(0, 5).join(',')}`);

    const items = [...timeline.items].sort((a, b) => a.startSec - b.startSec);
    const starts = items.map((it) => timeline.startedMs + OFFSET_MS + it.startSec * 1000);
    const itemFor = (qAt) => {
        if (qAt === null || qAt < starts[0]) return null;       // before the first window (the probe). No upper bound, exactly like routerCapture.mjs idFor (M3)
        let id = null;
        for (let i = 0; i < items.length; i++) if (qAt >= starts[i]) id = items[i].id;
        return id;
    };

    // ---- slice to the app session the hour ran in, parse lines ----
    const raw = logText.split(/\r?\n/);
    // I4: the log must cover the hour. Keyed on the app-session header `=== Natively session started <ISO> ===` (main.ts rotates the log on
    // every app start, so a covering log has a header at or before startedMs). No such header = a restart or a size rotation cut the head.
    let from = -1;
    raw.forEach((l, i) => { const m = /^=== Natively session started (\S+) ===/.exec(l); if (m && Date.parse(m[1]) <= timeline.startedMs) from = i; });
    if (from < 0) fail('log does not cover the hour (rotation or restart): no "=== Natively session started <ISO> ===" line at or before the hour start');
    raw.forEach((l) => { const m = /^=== Natively session started (\S+) ===/.exec(l); if (m && Date.parse(m[1]) > timeline.startedMs && Date.parse(m[1]) <= timeline.endedMs) fail('the app restarted inside the hour (a session header after the hour start)'); });
    const ev = [];
    for (const l of raw.slice(from)) {
        const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) \[[A-Z]+\] (.*)$/.exec(l);
        if (m) ev.push({ ts: Date.parse(m[1]), msg: m[2], cont: '' });
        else if (ev.length && l !== '' && !l.startsWith('===')) ev[ev.length - 1].cont += '\n' + l;     // a continuation line (a multi-line error message)
    }
    const lastBefore = (msg, cont, ts, what) => {                      // I1: dispatches_before from the LAST occurrence on the line or its continuation
        const all = [...(msg + cont).matchAll(/dispatches_before=(\d+)/g)];
        if (!all.length) fail(`a "${what}" line at ${new Date(ts).toISOString()} has no dispatches_before (cannot judge VOID; refusing)`);
        return Number(all[all.length - 1][1]);
    };

    const dispatches = new Map(); let dupDispatch = 0;
    const decisions = [];            // shown=live|pipeline
    const extraLines = [];           // dup / unpaired / anything with shown=-
    const failedLines = [], earFailovers = [], routerStates = [];
    const rc = { connect: 0, up: 0, refused: 0, reconnect: 0, quotaReconnect: 0 };
    const rClose = new Map(), eClose = new Map();     // key -> n
    const ear = { quota: 0, reconnecting: 0, statusConnected: 0, statusReconnecting: 0 };
    const answers = [];              // pipeline-shown [Answer] full texts, in-hour
    const caps = []; const capProblems = [];
    const supDiag = new Map(); let supExtra = 0;                            // B1: turn -> first diag line {phase, lineWritten}
    let unparsedDecisionLines = 0, decisionsNoQ = 0, decMulti = 0;
    const seenDecision = new Set();
    for (const { ts, msg, cont } of ev) {
        let m;
        if (msg.startsWith('[Router] superseded')) {
            if (!(m = /^\[Router\] superseded turn=(\d+) phase=(streaming|done) line_written=(yes|no)\b/.exec(msg))) fail(`a "[Router] superseded" line at ${new Date(ts).toISOString()} has an unknown shape (refusing)`);
            const t = Number(m[1]);
            if (supDiag.has(t)) supExtra++; else supDiag.set(t, { phase: m[2], lineWritten: m[3] === 'yes' });
        } else if (msg.startsWith('[Router] dispatch turn=')) {
            const o = kv(msg); const id = num(o.turn);
            if (id === null) continue;
            if (dispatches.has(id)) dupDispatch++;
            dispatches.set(id, { q: num(o.q_at), qSrc: o.q_src, at: num(o.at) });
        } else if (msg.startsWith('[Router] turn=')) {
            const o = kv(msg);
            if (!o.route || !o.reason || !o.shown || (o.turn !== '-' && num(o.turn) === null)) { unparsedDecisionLines++; continue; }
            const rec = { turn: num(o.turn), route: o.route, reason: o.reason, liveFirst: num(o.live_first_ms), liveWords: num(o.live_words), shown: o.shown, shadow: num(o.shadow), qSrc: o.q_src, q: num(o.q_at), sent: o.sent === undefined ? null : num(o.sent), superseded: o.superseded === 'yes' ? true : o.superseded === 'no' ? false : null };
            if (o.shown === 'live' || o.shown === 'pipeline') {
                if (rec.q === null) decisionsNoQ++;
                if (rec.turn !== null && seenDecision.has(rec.turn)) { decMulti++; continue; }        // M1: a repeated decision line is counted once (and fails integrity)
                if (rec.turn !== null) seenDecision.add(rec.turn);
                decisions.push(rec);
            } else extraLines.push(rec);
        } else if (/^\[Router\] session failed\b/.test(msg)) {
            const before = lastBefore(msg, cont, ts, 'session failed');
            if (ts <= timeline.endedMs) failedLines.push({ ts, before });
        } else if (/^\[Router\] ear failover from=/.test(msg)) {
            earFailovers.push({ before: lastBefore(msg, cont, ts, 'ear failover') });
        } else if ((m = /^\[Router\] session close gen=\d+ code=(\S+) reason=(.*) stale=(yes|no) quota=(yes|no)$/.exec(msg))) {
            const k = `reason="${trunc(m[2])}" code=${m[1]} stale=${m[3]} quota=${m[4]}`;
            rClose.set(k, (rClose.get(k) ?? 0) + 1);
            if (m[3] === 'no') routerStates.push({ ts, up: false });
        } else if (/^\[Router\] session up\b/.test(msg)) { rc.up++; routerStates.push({ ts, up: true }); }
        else if (/^\[Router\] session connect /.test(msg)) rc.connect++;
        else if (/^\[Router\] session refused /.test(msg)) rc.refused++;
        else if ((m = /^\[Router\] session reconnect attempt=\d+ reason=(.*)$/.exec(msg))) { if (/^quota\b/.test(m[1])) rc.quotaReconnect++; else rc.reconnect++; }
        else if ((m = /^\[LiveRouter\] close gen=\d+ code=(\S+) reason=(.*) stale=(yes|no)$/.exec(msg))) {
            const k = `reason="${trunc(m[2])}" code=${m[1]} stale=${m[3]}`; eClose.set(k, (eClose.get(k) ?? 0) + 1);
        } else if (/^\[LiveRouter\] quota close #/.test(msg)) ear.quota++;
        else if (/^\[LiveRouter\] reconnecting \(attempt/.test(msg)) ear.reconnecting++;
        else if ((m = /^\[Main\] Live Mode status: (\w+)/.exec(msg))) { if (m[1] === 'connected') ear.statusConnected++; else if (m[1] === 'reconnecting') ear.statusReconnecting++; }
        else if (msg.startsWith('[Answer] full: ')) {
            if (ts < timeline.startedMs) continue;
            try { answers.push(JSON.parse(msg.slice('[Answer] full: '.length))); } catch { capProblems.push('unparseable [Answer] full line'); }
        } else if (msg.startsWith('[RouterAnswer] ')) {
            let a; try { a = JSON.parse(msg.slice('[RouterAnswer] '.length)); } catch { capProblems.push('unparseable [RouterAnswer] line'); continue; }
            if (!a || typeof a.turn !== 'number' || !['live', 'shadow', 'appended'].includes(a.kind) || typeof a.text !== 'string') { capProblems.push('unusable [RouterAnswer] line'); continue; }
            caps.push(a);
        }
    }

    const out = [];
    const P = (s) => out.push(s);
    const voidWhy = [];

    // ---- map decisions to items ----
    const dec = decisions.map((d) => ({ ...d, item: itemFor(d.q) }));
    const inHour = dec.filter((d) => d.item !== null);
    const outside = dec.length - inHour.length;
    const decByTurn = new Map(dec.filter((d) => d.turn !== null).map((d) => [d.turn, d]));      // decisions are already de-duplicated by turn (M1)
    P(`RUN items=${items.length} offset_ms=${OFFSET_MS} clock=${timeline.clock ?? '-'} decisions_in_hour=${inHour.length} decisions_outside_hour=${outside} dispatch_lines=${dispatches.size}`);

    // 1. decisions by route x reason x shown
    P('--- 1. DECISIONS (route x reason x shown; in-hour decisions)');
    const cell = new Map();
    for (const d of inHour) { const k = `route=${d.route} reason=${d.reason} shown=${d.shown}`; cell.set(k, (cell.get(k) ?? 0) + 1); }
    for (const [k, n] of [...cell].sort()) P(`DECISION ${k} n=${n}`);
    const byReason = (r) => inHour.filter((d) => d.reason === r).length;
    P('DECISION reasons ' + REASONS.filter((r) => r !== 'dup' && r !== 'unpaired').map((r) => `${r}=${byReason(r)}`).join(' '));
    const dupN = extraLines.filter((d) => d.reason === 'dup').length, unpN = extraLines.filter((d) => d.reason === 'unpaired').length;
    P(`DECISION dup=${dupN} unpaired=${unpN} (shown=-, counted apart from decisions) other_shown_dash=${extraLines.length - dupN - unpN}`);

    // 2. speed
    P('--- 2. SPEED');
    const live = inHour.filter((d) => d.shown === 'live');
    const lf = (rows) => rows.map((d) => d.liveFirst).filter((v) => v !== null);
    const speedLine = (label, vals) => P(`SPEED ${label} n=${vals.length} p50=${f(median(vals))} p90=${f(pct(vals, 0.9))}`);
    speedLine('live_first_ms shown=live q_src=all', lf(live));
    for (const q of ['vad', 'final']) speedLine(`live_first_ms shown=live q_src=${q}`, lf(live.filter((d) => d.qSrc === q)));
    const sh = (rows) => rows.map((d) => d.shadow).filter((v) => v !== null);
    speedLine('shadow_first_token q_src=all', sh(inHour));
    for (const q of ['vad', 'final']) speedLine(`shadow_first_token q_src=${q}`, sh(inHour.filter((d) => d.qSrc === q)));
    const lw = live.map((d) => d.liveWords).filter((v) => v !== null);
    P(`SPEED live_words n=${lw.length} p50=${f(median(lw))} max=${lw.length ? Math.max(...lw) : '-'}`);
    const appends = new Map();
    for (const d of live) if (d.reason !== '-') appends.set(d.reason, (appends.get(d.reason) ?? 0) + 1);
    P(`APPENDS total=${[...appends.values()].reduce((a, b) => a + b, 0)} ` + [...appends].sort().map(([r, n]) => `${r}=${n}`).join(' '));

    // 3. VOID inputs
    P('--- 3. VOID INPUTS');
    P(`VOID_INPUT router session failed lines=${failedLines.length}` + failedLines.map((x) => ` dispatches_before=${x.before}`).join(''));
    // router down time: transitions inferred from `session up` and `session close stale=no`, clipped to the run window
    const t0 = timeline.startedMs, t1 = timeline.endedMs;
    let state = null; for (const s of routerStates) if (s.ts <= t0) state = s.up;
    const unknownStart = state === null; if (unknownStart) state = false;     // never seen up: not up
    let cursor = t0, downMs = 0;
    for (const s of routerStates) {
        if (s.ts <= t0 || s.ts > t1) continue;
        if (!state) downMs += s.ts - cursor;
        cursor = s.ts; state = s.up;
    }
    if (!state) downMs += t1 - cursor;
    const downMin = downMs / 60000;
    P(`VOID_INPUT router_down_minutes=${downMin.toFixed(2)} limit=${downLimitMin} start_state=${unknownStart ? 'unknown(assumed down)' : 'known'}`);
    P(`VOID_INPUT ear failovers=${earFailovers.length} (reported only)` + earFailovers.map((x) => ` dispatches_before=${x.before}`).join(''));

    // 4. tallies (cuttable)
    P('--- 4. TALLIES (SESSION-WIDE: the whole app session, preflight and probe included, NOT the hour; CUTTABLE, spec 13: needs the user\'s ruling)');
    P(`TALLY session-wide router connects=${rc.connect} up=${rc.up} reconnects=${rc.reconnect} quota_reconnects=${rc.quotaReconnect} refused=${rc.refused}`);
    for (const [k, n] of [...rClose].sort()) P(`TALLY session-wide router close ${k} n=${n}`);
    const sum = (map, pred) => [...map].filter(([k]) => pred(k)).reduce((a, [, n]) => a + n, 0);
    P(`TALLY session-wide router closes total=${sum(rClose, () => true)} stale=${sum(rClose, (k) => k.includes('stale=yes'))} quota_closes=${sum(rClose, (k) => k.includes('quota=yes'))} (counted apart, I7)`);
    P(`TALLY session-wide ear connected=${ear.statusConnected} reconnecting_status=${ear.statusReconnecting} reconnecting_lines=${ear.reconnecting} quota_closes=${ear.quota}`);
    for (const [k, n] of [...eClose].sort()) P(`TALLY session-wide ear close ${k} n=${n}`);
    P(`TALLY session-wide ear closes total=${sum(eClose, () => true)} stale=${sum(eClose, (k) => k.includes('stale=yes'))}`);

    // 5. integrity
    P('--- 5. INTEGRITY');
    const noDecision = [...dispatches.keys()].filter((t) => !decByTurn.has(t));
    P(`INTEGRITY dispatched turns with no decision line: ${noDecision.length} (must be 0)`);
    // I2: the arbiter's `sent` counts EVERY emit (routerArbiter.ts emit(): t.sent++), the `source` (label) events included, so sent>=1 can mean
    // "a label and no text". sent=0 is therefore only the weakest form of "nothing shown". The stronger one the log can show: a shown=pipeline
    // decision with shadow=- (the pipeline produced no token: pipeFirstAt stays null), counted here as dispatched with nothing shown too.
    const sent0 = dec.filter((d) => d.sent === 0);
    const noToken = inHour.filter((d) => d.shown === 'pipeline' && d.shadow === null);
    const sentMissing = dec.filter((d) => d.sent === null).length;
    P(`INTEGRITY dispatched turns with nothing shown (sent=0): ${sent0.length} (must be 0) sent_field_missing=${sentMissing}`);
    P(`INTEGRITY dispatched turns with nothing shown (shown=pipeline with no pipeline token, shadow=-): ${noToken.length} (must be 0; sent counts label events too)`);
    const noDispatch = dec.filter((d) => d.turn !== null && !dispatches.has(d.turn)).length;
    P(`INTEGRITY decision lines without a dispatch line=${noDispatch} duplicate decision lines=${decMulti} duplicate dispatch lines=${dupDispatch}`);
    P(`INTEGRITY unparsed_decision_lines=${unparsedDecisionLines} decisions_without_q_at=${decisionsNoQ}`);
    const lineIntegrityOk = noDispatch === 0 && decMulti === 0 && dupDispatch === 0 && unparsedDecisionLines === 0 && decisionsNoQ === 0;

    // captures vs decisions
    const capsByTurn = new Map(); let capDup = 0;
    for (const a of caps) { const m = capsByTurn.get(a.turn) ?? new Map(); if (m.has(a.kind)) capDup++; m.set(a.kind, a); capsByTurn.set(a.turn, m); }
    const hourTurns = new Map(inHour.filter((d) => d.turn !== null).map((d) => [d.turn, d]));
    let missing = 0, unexpected = 0, lostLive = 0, supDefects = 0, row4Live = 0, orphan = 0, outsideCaps = 0;
    const preFixLines = inHour.filter((d) => d.superseded === null).length;
    const preFixCaps = caps.filter((a) => typeof a.superseded !== 'boolean').length;
    // B1: the `[Router] superseded` diag line is authoritative (lane B fix3); pending-mode supersedes are never logged by the producer (decision null) and are not counted.
    const supOrphan = [...supDiag.keys()].filter((t) => { const d = decByTurn.get(t); return !d || (hourTurns.has(t) && d.shown !== 'live'); }).length;   // the producer emits the line only for shown=live
    const supInHour = [...supDiag].filter(([t]) => hourTurns.get(t)?.shown === 'live');
    const supTurns = supInHour.length;
    const supSplit = (pred) => supInHour.filter(([, v]) => pred(v)).length;
    const yesTurns = new Set([...inHour.filter((d) => d.superseded === true).map((d) => d.turn), ...caps.filter((a) => a.superseded === true && hourTurns.has(a.turn)).map((a) => a.turn)]);
    const supNoDiag = [...yesTurns].filter((t) => !supDiag.has(t)).length;       // case (a): the line or a capture says superseded, no diag line exists
    const kinds = { live: 0, shadow: 0, appended: 0 };
    const expK = { live: 0, shadow: 0, appended: 0 };
    for (const [turn, km] of capsByTurn) {
        const d = decByTurn.get(turn);
        if (!d) { orphan += km.size; continue; }
        if (!hourTurns.has(turn)) { outsideCaps += km.size; continue; }
        for (const k of km.keys()) kinds[k]++;
    }
    for (const [turn, d] of hourTurns) {
        const km = capsByTurn.get(turn) ?? new Map();
        if (d.shown === 'pipeline') { unexpected += km.size; if (km.has('live') && ROW4.has(d.reason)) row4Live++; continue; }
        const app = d.reason !== '-';
        expK.shadow += app ? 0 : 1; expK.appended += app ? 1 : 0; expK.live++;
        if (!km.has(app ? 'appended' : 'shadow')) missing++;
        if (km.has(app ? 'shadow' : 'appended')) unexpected++;
        if (!km.has('live')) lostLive++;        // since lane B 8d2de5b a superseded Live stream writes its live capture too: a missing one is LOST
        const sd = supDiag.get(turn);
        if (sd) {
            const lc = km.get('live');
            if (sd.phase === 'streaming' && (d.superseded !== true || (lc && lc.superseded !== true))) supDefects++;      // (b)
            if (!sd.lineWritten && d.superseded !== true) supDefects++;                                                     // (c)
            if (sd.lineWritten && d.superseded !== false) supDefects++;                                                     // (d)
        }
    }
    supDefects += supNoDiag;                                                                                              // (a)
    P(`CAPTURES live=${kinds.live} (expected ${expK.live}) shadow=${kinds.shadow} (expected ${expK.shadow}) appended=${kinds.appended} (expected ${expK.appended}) lost_live_captures=${lostLive}`);
    P(`SUPERSEDE superseded_turns=${supTurns} (streaming=${supSplit((v) => v.phase === 'streaming')} done=${supSplit((v) => v.phase === 'done')} line_written=yes ${supSplit((v) => v.lineWritten)} line_written=no ${supSplit((v) => !v.lineWritten)}) superseded_extra_lines=${supExtra} superseded_record_defects=${supDefects} superseded_orphan=${supOrphan} (from the [Router] superseded diag line; supersedes before the Live decision are never logged by the producer and are not counted)`);
    if (preFixLines || preFixCaps || supNoDiag) P(`WARNING pre-fix log: ${preFixLines} decision line(s) without superseded=, ${preFixCaps} capture(s) without a superseded flag, ${supNoDiag} turn(s) marked superseded with no [Router] superseded line (lane B before 8d2de5b / fix3)`);
    const capOk = lostLive === 0 && supDefects === 0 && supOrphan === 0 && missing === 0 && unexpected === 0 && orphan === 0 && capDup === 0 && capProblems.length === 0 && kinds.live === expK.live && kinds.shadow === expK.shadow && kinds.appended === expK.appended;
    P(`CAPTURES check: ${capOk ? 'MATCH' : 'MISMATCH'} missing=${missing} unexpected=${unexpected} orphan=${orphan} duplicate=${capDup} unparseable=${capProblems.length} outside_hour=${outsideCaps}`);
    // the two harness files
    const readArr = (name) => { const p = path.join(runDir, name); if (!fs.existsSync(p)) return null; try { const j = JSON.parse(fs.readFileSync(p, 'utf8')); return Array.isArray(j) ? j : null; } catch { return null; } };
    const fl = readArr('interview60.answers.router-live.json'), fsh = readArr('interview60.answers.router-shadow.json');
    let filesOk = true;
    if (!fl || !fsh) { filesOk = false; P(`CAPTURE FILES: MISMATCH live_file=${fl ? fl.length : 'absent'} shadow_file=${fsh ? fsh.length : 'absent'}`); }
    else {
        let idBad = 0;
        for (const e of [...fl, ...fsh]) if (e.turn === undefined || hourTurns.get(e.turn)?.item !== e.id) idBad++;
        const shadowCaps = kinds.shadow + kinds.appended;
        const appFile = fsh.filter((e) => e.appended === true).length;
        filesOk = fl.length === kinds.live && fsh.length === shadowCaps && appFile === kinds.appended && idBad === 0;
        P(`CAPTURE FILES: ${filesOk ? 'MATCH' : 'MISMATCH'} live_file=${fl.length} (log ${kinds.live}) shadow_file=${fsh.length} (log ${shadowCaps}) appended_in_file=${appFile} (log ${kinds.appended}) id_disagreements=${idBad}`);
    }
    const integrityOk = noDecision.length === 0 && sent0.length === 0 && noToken.length === 0 && lineIntegrityOk && capOk && filesOk;

    // 6. bars
    P('--- 6. BARS');
    // Safety, text half
    const liveCaps = caps.filter((a) => a.kind === 'live' && hourTurns.has(a.turn));
    const liveHard = liveCaps.filter((a) => hardFirst(a.text)).length;
    const liveMarker = liveCaps.filter((a) => routerMarker(a.text)).length;
    const pipeTexts = [...answers, ...caps.filter((a) => a.kind === 'appended' && hourTurns.has(a.turn)).map((a) => a.text)];
    const pipeUnknown = pipeTexts.filter(pipelineUnknownMarker).length;
    const pipeBare = pipeTexts.filter(bareRoutingToken).length;
    P(`SAFETY live: hard-first=${liveHard} router-marker=${liveMarker}`);
    P(`SAFETY pipeline: unknown-marker=${pipeUnknown} bare-routing-token=${pipeBare}`);
    const safetyOk = liveHard + liveMarker + pipeUnknown + pipeBare === 0;
    P(`BAR Safety (text half): ${safetyOk ? 'PASS' : 'FAIL'} live_hard_first=${liveHard} live_router_marker=${liveMarker} pipeline_unknown_marker=${pipeUnknown} pipeline_bare_routing_token=${pipeBare}`);
    P('BAR Safety (wrong-answer half): NEEDS GRADES');
    // Fallback
    let missingAppend = 0, unflagged = 0;
    for (const [turn, d] of hourTurns) {
        if (d.shown !== 'live') continue;
        const km = capsByTurn.get(turn) ?? new Map();
        if (d.reason !== '-' && !km.has('appended')) missingAppend++;
        if (d.reason === '-' && km.has('live') && supDiag.get(turn)?.phase !== 'streaming') { const w = km.get('live').words; if (!(w >= 8 && w <= 80)) unflagged++; }   // an after-V failure the decision line did not flag
    }
    const fallbackOk = missingAppend === 0 && unflagged === 0 && row4Live === 0 && sent0.length === 0 && noToken.length === 0;
    P(`BAR Fallback: ${fallbackOk ? 'PASS' : 'FAIL'} missing_appended=${missingAppend} unflagged_live_failures=${unflagged} row4_with_live_capture=${row4Live} dispatched_nothing_shown=${sent0.length} pipeline_no_token=${noToken.length}`);
    // Speed
    const p50 = median(lf(live));         // I3: the conventional median (mean of the two middle values for an even n)
    const speedOk = p50 !== null && p50 <= SPEED_LIMIT_MS;
    P(`BAR Speed: ${speedOk ? 'PASS' : 'FAIL'} p50=${f(p50)} limit=${SPEED_LIMIT_MS} n=${lf(live).length}`);
    // Routing, per item
    const perItem = new Map();
    for (const d of [...inHour].sort((a, b) => a.q - b.q)) { const l = perItem.get(d.item) ?? []; l.push(d); perItem.set(d.item, l); }
    const easy = LIVE40.filter((i) => i.route === 'EASY').map((i) => i.id), hard = LIVE40.filter((i) => i.route === 'HARD').map((i) => i.id);
    const caughtFirst = easy.filter((id) => perItem.get(id)?.[0]?.shown === 'live').length;
    const caughtAny = easy.filter((id) => perItem.get(id)?.some((d) => d.shown === 'live')).length;
    const misrouted = (d) => !NO_DECIDER.has(d.reason) && d.route !== 'hard';
    const misAny = hard.filter((id) => perItem.get(id)?.some(misrouted)).length;
    const misFirst = hard.filter((id) => { const d = perItem.get(id)?.[0]; return d && misrouted(d); }).length;
    const hardNo = (r) => hard.filter((id) => perItem.get(id)?.some((d) => d.reason === r)).length;
    const hardNone = hard.filter((id) => !perItem.has(id)).length;
    const multi = [...perItem.values()].filter((l) => l.length > 1).length;
    P(`ROUTING easy_caught_first_decision=${caughtFirst}/${easy.length} easy_caught_any_decision(info only)=${caughtAny}/${easy.length}hard_misrouted_any_decision=${misAny}/${hard.length} hard_misrouted_first_decision=${misFirst}/${hard.length} items_with_more_than_one_decision=${multi} easy_without_decision=${easy.filter((id) => !perItem.has(id)).length}`);
    P(`ROUTING HARD late (not misrouted, M2): ${hardNo('late')}`);
    P(`ROUTING HARD no-router-turn (not misrouted, M2): ${hardNo('no-router-turn')} router-down: ${hardNo('router-down')} no decision line at all: ${hardNone}`);
    const routingOk = caughtFirst >= EASY_CAUGHT_MIN && misAny <= HARD_MISROUTED_MAX;
    P(`BAR Routing: ${routingOk ? 'PASS' : 'FAIL'} EASY caught ${caughtFirst}/${easy.length} (>= ${EASY_CAUGHT_MIN}); HARD misrouted ${misAny}/${hard.length} (<= ${HARD_MISROUTED_MAX})`);
    P('BAR Quality: NEEDS GRADES');
    P('BAR No-regression: NEEDS GRADES');

    // 7. verdict (VOID first)
    P('--- 7. VERDICT');
    const earlyFail = failedLines.filter((x) => x.before < VOID_DISPATCH_FLOOR);
    P(`VOID CHECK session-failed-before-dispatch-${VOID_DISPATCH_FLOOR}: ${earlyFail.length ? 'VOID' : 'clear'} (lines=${failedLines.length}, below floor=${earlyFail.length})`);
    P(`VOID CHECK router-down-minutes: ${downMin > downLimitMin ? 'VOID' : 'clear'} (${downMin.toFixed(2)} vs limit ${downLimitMin})`);
    if (earlyFail.length) voidWhy.push('router session failed before the 10th dispatch');
    if (downMin > downLimitMin) voidWhy.push('router down time over the limit');
    if (voidWhy.length) { P(`VERDICT VOID (the re-fly is not spent): ${voidWhy.join('; ')}`); return { out, exit: 3 }; }
    if (!safetyOk) P('READER VERDICT (pre-grade): SAFETY FAIL (text half): the router stays behind the flag, default OFF');
    else {
        const bad = [!fallbackOk && 'Fallback', !speedOk && 'Speed', !routingOk && 'Routing', !integrityOk && 'Integrity'].filter(Boolean);
        P(bad.length ? `READER VERDICT (pre-grade): INCONCLUSIVE-leaning; reader bars not met: ${bad.join(', ')}` : 'READER VERDICT (pre-grade): reader bars MET (Safety text half, Fallback, Speed, Routing, Integrity); Quality, No-regression and the Safety wrong-answer half NEED GRADES');
    }
    return { out, exit: 0 };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    const a = process.argv.slice(2);
    const opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
    const runDir = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
    if (!runDir) { console.error('usage: node router-hour-read.mjs <runDir> --down-limit-min <n> [--root <checkout>]'); process.exit(2); }
    try {
        const r = await readHour(runDir, { root: opt('--root') ?? MAIN_ROOT, downLimitMin: opt('--down-limit-min') === undefined ? NaN : Number(opt('--down-limit-min')) });
        console.log(r.out.join('\n'));
        process.exit(r.exit);
    } catch (e) {
        if (e.usage) { console.error(`router-hour-read: ${e.message}`); process.exit(2); }
        throw e;
    }
}
