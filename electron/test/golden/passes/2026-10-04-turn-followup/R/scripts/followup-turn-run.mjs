// Pre-registered runner for the turn-based follow-up context replay (PREREGISTER-turn-followup.md sections 1 and 4).
// A copy of followup-questions-s50l/scripts/followup-questions-run.mjs with: MODEL/THINKING/REPS per LEG (`--leg front|back`),
// keys `<hour>:<id>` everywhere, every record carrying hour/leg/model/thinking, `thoughts` null when the stream reports none,
// `--dry-run` printing each leg's model + thinkingLevel, and NO re-call on a second invocation unless `--crash-resume` (logged).
// Arms interleaved per (item, rep): A then B when (itemIndex + rep) is even, B then A when odd, the same pause after EVERY call.
// Refuses unless section 2 verifies (common.mjs), the filter reads d8fee6ca0170, and every arm B is insertBlock(userA, block).
//
//   node followup-turn-run.mjs --leg front --dry-run            call order, byte counts, model + thinkingLevel; no key read, no call
//   node followup-turn-run.mjs --leg front                      the 140 calls (2 hours x (4 roster + 3 D) x 5 reps x 2 arms)
//   node followup-turn-run.mjs --leg back                       the 48 calls  (2 hours x 4 roster x 3 reps x 2 arms)
//   node followup-turn-run.mjs --leg front --crash-resume       after a crash only: logged; calls ONLY items with no record at all
//   --hours s50k [--stop-at <ISO>]                              the one allowed re-run (default: s50m,s50l); --stop-at is for it ONLY
//
// Amendment A1 point 7 / A2 point 3 (the hard stop, mechanical): the cutoff is 2026-10-04T06:30:00Z (HARD_STOP, common.mjs), hard-coded for the
// primary hours. Before EVERY call (retries included) the runner refuses to start it when now + 120 s >= cutoff: it logs
// `STOPPED AT HARD STOP <leg> <slots not made>` to run.log, writes R/STOPPED-<leg>.txt and exits 3. Every call runs under a 120 s timeout
// (gemini.mjs); an HTTP 200 stream with no text and no finishReason is a transient (retried inside the same 5 attempts). Every record carries
// `end` (the time it was written, >= at + total) and `stopAt`; the answer files are written to .tmp and renamed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN, OUT_DIR, LEGS, ARMS, PRIMARY_HOURS, HOURS, HARD_STOP, CALL_TIMEOUT_MS, FILTER_JS, FILTER_SHA12, sha, fileFor, answerFiles, loadGated, itemsFor } from './common.mjs';
import { answerStreamed, loadFilters, requestFor } from './gemini.mjs';

const ATTEMPTS = 5;      // section 1: "429/5xx retried up to 4 times inside the pass"
const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });

/** The full call order of one leg: for item index i and rep r, A then B when (i + r) is even, else B then A. */
export function planOrder(items, leg) {
    const order = [];
    items.forEach((key, i) => { for (let rep = 1; rep <= LEGS[leg].reps; rep++) { const arms = (i + rep) % 2 === 0 ? ['A', 'B'] : ['B', 'A']; arms.forEach((arm, k) => order.push({ key, rep, arm, pos: k + 1 })); } });
    return order;
}

/**
 * One pass of one leg. Options: leg, hours, crashResume, dryRun, fetchImpl, key (or getKey: read AFTER the hard-stop start check), pauseMs,
 * log (fn), runLog (fn), stopAt (ISO; primary hours only HARD_STOP), outDir is OUT_DIR (FQ_OUT_DIR). Test seams: nowFn, sleepFn, timeoutMs, fsImpl.
 * Returns { refused?: string, stopped?: true, notMade?, calls, kept, transient: [..], order }.
 */
export async function runPass({ leg, hours = PRIMARY_HOURS, crashResume = false, dryRun = false, fetchImpl = fetch, key = null, getKey = null, pauseMs = 1500, log = console.log, runLog = null, stopAt = HARD_STOP, nowFn = Date.now, sleepFn = realSleep, timeoutMs = CALL_TIMEOUT_MS, fsImpl = fs }) {
    const L = LEGS[leg];
    if (!L) return { refused: `--leg must be front or back, not ${leg}` };
    for (const h of hours) if (!HOURS[h]) return { refused: `unknown hour ${h}` };
    const stopMs = Date.parse(stopAt);
    if (!Number.isFinite(stopMs)) return { refused: `--stop-at ${stopAt} is not a date` };
    if (stopMs !== Date.parse(HARD_STOP) && hours.some((h) => PRIMARY_HOURS.includes(h))) return { refused: `the hard stop ${HARD_STOP} is fixed for the primary hours; --stop-at is for the s50k re-run only` };
    const stopIso = new Date(stopMs).toISOString();
    const sleep = sleepFn;
    let G;
    try { ({ G } = await loadGated(hours)); } catch (e) { return { refused: e.message }; }
    const items = itemsFor(G, leg, hours);
    const order = planOrder(items, leg);
    let filters;
    try {
        const filterSha = sha(fs.readFileSync(FILTER_JS)).slice(0, 12);
        if (filterSha !== FILTER_SHA12) return { refused: `the filter snapshot reads ${filterSha}, not ${FILTER_SHA12}` };
        filters = loadFilters();
    } catch (e) { return { refused: e.message }; }

    const genCfg = requestFor({ model: L.model, thinking: L.thinking, system: '', user: '' }).body.generationConfig;
    log(`FOLLOW-UP TURN REPLAY  leg=${leg}  model=${L.model}  thinkingLevel=${L.thinking}  temperature=${genCfg.temperature}  hours=${hours.join(',')}  ${items.length} items x ${L.reps} reps x 2 arms = ${order.length} calls`);
    log(`section 2 verified (${path.basename(process.env.TURN_PREREG ?? 'PREREGISTER-turn-followup.md')}); filter ${FILTER_JS.replace(/\\/g, '/').split('dist-snapshots/')[1]} sha256/12 ${FILTER_SHA12}`);
    log(`A first in ${order.filter((c) => c.arm === 'A' && c.pos === 1).length} pairs, B first in ${order.filter((c) => c.arm === 'B' && c.pos === 1).length}`);
    if (dryRun) {
        order.forEach((c, n) => { const o = G[c.key]; log(`DRY #${String(n + 1).padStart(3)} ${c.key.padEnd(11)} ${o.kind.padEnd(8)} r${c.rep} ${c.arm} (${c.pos === 1 ? 'first' : 'second'})  model ${L.model} thinkingLevel ${L.thinking}  system ${o.system.length}  user ${(c.arm === 'A' ? o.userA : o.userB).length}`); });
        log(`DRY RUN: ${order.length} calls on ${L.model} ${L.thinking}; no key read, no call made`);
        return { dryRun: true, calls: 0, order, items };
    }

    // A2 M8: "front leg first, then back leg" (section 4) -- the back leg starts only when every front file of these hours exists
    if (leg === 'back') {
        const lacking = [];
        for (const h of hours) for (const arm of ARMS) for (let rep = 1; rep <= LEGS.front.reps; rep++) if (!fs.existsSync(fileFor('front', h, arm, rep))) lacking.push(path.basename(fileFor('front', h, arm, rep)));
        if (lacking.length) return { refused: `the back leg runs after the front leg: ${lacking.length} of ${hours.length * ARMS.length * LEGS.front.reps} front files are missing (${lacking.slice(0, 2).join(', ')}${lacking.length > 2 ? ', ...' : ''})` };
    }

    // stores: one file per (hour, arm, rep), records keyed `<hour>:<id>`
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const stores = {};
    for (const h of hours) for (const arm of ARMS) for (let rep = 1; rep <= L.reps; rep++) { const f = fileFor(leg, h, arm, rep); stores[`${h}|${arm}|${rep}`] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; }
    const existing = Object.values(stores).reduce((n, s) => n + Object.keys(s).length, 0);
    if (existing > 0 && !crashResume) return { refused: `${existing} records already exist for this leg: a second invocation re-calls nothing; start with --crash-resume (logged) only after a crash` };
    if (crashResume) {
        const missing = order.filter((c) => !stores[`${G[c.key].hour}|${c.arm}|${c.rep}`][c.key]).length;
        const line = `[${stamp()}] CRASH-RESUME leg=${leg} hours=${hours.join(',')}: ${existing} records kept, ${missing} calls with no record at all will be made`;
        log(line); (runLog ?? ((s) => fs.appendFileSync(path.join(OUT_DIR, 'run.log'), `${s}\n`)))(line);
    }

    // The hard stop (A2 point 3): a call is not even STARTED when now + 120 s >= the cutoff. Checked before the key is read and before every attempt.
    const stopNow = () => nowFn() + CALL_TIMEOUT_MS >= stopMs;
    const halt = (calls, kept, transient) => {
        const notMade = order.filter((c) => !stores[`${G[c.key].hour}|${c.arm}|${c.rep}`][c.key]).map((c) => `${c.key}#${c.rep} ${c.arm}`);
        const line = `[${stamp()}] STOPPED AT HARD STOP ${leg} ${notMade.join(', ')}`;
        log(line);
        (runLog ?? ((s) => fs.appendFileSync(path.join(OUT_DIR, 'run.log'), `${s}\n`)))(line);
        fs.writeFileSync(path.join(OUT_DIR, `STOPPED-${leg}.txt`), `${line}\n(stop ${stopIso}; ${notMade.length} slots not made; ${calls} calls made in this invocation)\n`);
        return { stopped: true, notMade, calls, kept, transient, order, items };
    };
    if (stopNow()) return halt(0, 0, []);
    if (!key && getKey) { try { key = getKey(); } catch { key = null; } }
    if (!key) return { refused: 'no GEMINI_API_KEY given' };

    let calls = 0, kept = 0;
    const transient = [];
    for (const [n, c] of order.entries()) {
        const o = G[c.key];
        const tag = `#${String(n + 1).padStart(3)} ${c.key.padEnd(11)} r${c.rep} ${c.arm}`;
        const store = stores[`${o.hour}|${c.arm}|${c.rep}`];
        if (store[c.key]) { kept++; log(`${tag}: kept (${store[c.key].at}${store[c.key].transientError ? ', TRANSIENT, never re-called' : ''})`); if (store[c.key].transientError) transient.push(`${c.key}#${c.rep} ${c.arm}`); continue; }
        const user = c.arm === 'A' ? o.userA : o.userB;
        let r = null, lastErr, dropRetried = false, stopped = false;
        const at = new Date(nowFn()).toISOString();
        for (let a = 0; a < ATTEMPTS; a++) {
            if (stopNow()) { stopped = true; break; }
            try {
                calls++;
                r = await answerStreamed({ system: o.system, user, model: L.model, thinking: L.thinking, key, filters, fetchImpl, timeoutMs });
                // A stream that ends with text but no finish reason was cut mid-answer: one more try, as the answers pass does. (A stream with
                // neither text nor finish reason never gets here: gemini.mjs returns it as a transient, retried like a 503.)
                if (!r.transient && r.finish === null && !dropRetried) { dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(pauseMs ? 5000 : 0); continue; }
                if (!r.transient) break;
                lastErr = r.transient; await sleep(pauseMs ? (r.retryAfterMs ?? 8000 * (a + 1)) : 0);
            } catch (e) { lastErr = e.message; r = null; await sleep(pauseMs ? 4000 * (a + 1) : 0); }
        }
        if (stopped) return halt(calls, kept, transient);
        const base = { key: c.key, hour: o.hour, id: o.id, kind: o.kind, leg, q: o.current, arm: c.arm, rep: c.rep, position: c.pos, model: L.model, thinking: L.thinking, label: `${L.model}_fturn-${o.hour}-${c.arm}`, at, end: new Date(nowFn()).toISOString(), stopAt: stopIso };
        if (!r || r.transient) {
            store[c.key] = { ...base, transientError: lastErr ?? 'no response' };
            transient.push(`${c.key}#${c.rep} ${c.arm}`);
            log(`${tag}: TRANSIENT ${lastErr}`);
        } else {
            store[c.key] = { ...base, ...r };
            log(`${tag}: ${String(r.words).padStart(3)}w  ttft ${String(r.ttft).padStart(5)}ms  total ${String(r.total).padStart(5)}ms  thoughts ${r.thoughts}  finish ${r.finish}`);
        }
        // A2 M3: written to .tmp, then renamed: a crash mid-write never leaves truncated JSON where the next start parses it
        const file = fileFor(leg, o.hour, c.arm, c.rep);
        fsImpl.writeFileSync(`${file}.tmp`, JSON.stringify(store, null, 1));
        fsImpl.renameSync(`${file}.tmp`, file);
        if (pauseMs) await sleep(pauseMs);
    }
    // Informational only; the decision is legs-decide.mjs's.
    const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
    for (const arm of ARMS) {
        const recs = Object.entries(stores).filter(([k]) => k.split('|')[1] === arm).flatMap(([, s]) => Object.values(s));
        const done = recs.filter((x) => !x.transientError);
        log(`arm ${arm}: answered ${done.length}/${order.length / 2}  transient ${recs.length - done.length}  ttft p50 ${pct(done.map((x) => x.ttft ?? Infinity), 0.5)}ms p90 ${pct(done.map((x) => x.ttft ?? Infinity), 0.9)}ms  words p50 ${pct(done.map((x) => x.words), 0.5)}  empty spoken ${done.filter((x) => !x.spoken).length}  thoughts null ${done.filter((x) => x.thoughts === null).length}`);
    }
    log(`incomplete (transient after every retry, NEVER re-called; named, excluded from the decision): ${transient.length ? transient.join(', ') : 'none'}`);
    return { calls, kept, transient, order, items };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
    const leg = arg('--leg');
    const hoursArg = arg('--hours');
    const dryRun = argv.includes('--dry-run');
    const stopAtArg = arg('--stop-at');
    if (stopAtArg && hoursArg !== 's50k') { console.log('REFUSED: --stop-at is for the s50k re-run only (--hours s50k); the primary hours are held to the hard-coded stop'); process.exit(2); }
    // The key, in-process from MAIN's .env (TURN_ENV_FILE: self-tests only, to point at nothing); read by runPass AFTER the hard-stop start
    // check, never printed.
    const envFile = process.env.TURN_ENV_FILE ?? path.join(MAIN, '.env');
    const getKey = () => fs.readFileSync(envFile, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim() ?? null;
    const r = await runPass({ leg, hours: hoursArg ? hoursArg.split(',') : PRIMARY_HOURS, crashResume: argv.includes('--crash-resume'), dryRun, getKey: dryRun ? null : getKey, stopAt: stopAtArg ?? HARD_STOP });
    if (r.refused) { console.log(`REFUSED: ${r.refused.replace(/^no GEMINI_API_KEY given$/, `no GEMINI_API_KEY in ${path.basename(envFile) === '.env' ? 'MAIN/.env' : 'the TURN_ENV_FILE'}`)}`); process.exit(2); }
    if (r.stopped) process.exit(3);
}
