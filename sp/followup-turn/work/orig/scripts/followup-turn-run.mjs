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
//   --hours s50k                                                the one allowed re-run (default: s50m,s50l)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN, OUT_DIR, LEGS, ARMS, PRIMARY_HOURS, HOURS, FILTER_JS, FILTER_SHA12, sha, fileFor, answerFiles, loadGated, itemsFor } from './common.mjs';
import { answerStreamed, loadFilters, requestFor } from './gemini.mjs';

const ATTEMPTS = 5;      // section 1: "429/5xx retried up to 4 times inside the pass"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });

/** The full call order of one leg: for item index i and rep r, A then B when (i + r) is even, else B then A. */
export function planOrder(items, leg) {
    const order = [];
    items.forEach((key, i) => { for (let rep = 1; rep <= LEGS[leg].reps; rep++) { const arms = (i + rep) % 2 === 0 ? ['A', 'B'] : ['B', 'A']; arms.forEach((arm, k) => order.push({ key, rep, arm, pos: k + 1 })); } });
    return order;
}

/**
 * One pass of one leg. Options: leg, hours, crashResume, dryRun, fetchImpl, key, pauseMs, log (fn), outDir is OUT_DIR (FQ_OUT_DIR).
 * Returns { refused?: string, calls, kept, transient: [..], order }.
 */
export async function runPass({ leg, hours = PRIMARY_HOURS, crashResume = false, dryRun = false, fetchImpl = fetch, key = null, pauseMs = 1500, log = console.log, runLog = null }) {
    const L = LEGS[leg];
    if (!L) return { refused: `--leg must be front or back, not ${leg}` };
    for (const h of hours) if (!HOURS[h]) return { refused: `unknown hour ${h}` };
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
    if (!key) return { refused: 'no API key given' };

    let calls = 0, kept = 0;
    const transient = [];
    for (const [n, c] of order.entries()) {
        const o = G[c.key];
        const tag = `#${String(n + 1).padStart(3)} ${c.key.padEnd(11)} r${c.rep} ${c.arm}`;
        const store = stores[`${o.hour}|${c.arm}|${c.rep}`];
        if (store[c.key]) { kept++; log(`${tag}: kept (${store[c.key].at}${store[c.key].transientError ? ', TRANSIENT, never re-called' : ''})`); if (store[c.key].transientError) transient.push(`${c.key}#${c.rep} ${c.arm}`); continue; }
        const user = c.arm === 'A' ? o.userA : o.userB;
        let r = null, lastErr, dropRetried = false;
        const at = new Date().toISOString();
        for (let a = 0; a < ATTEMPTS; a++) {
            try {
                calls++;
                r = await answerStreamed({ system: o.system, user, model: L.model, thinking: L.thinking, key, filters, fetchImpl });
                // A stream that ends with no finish reason was cut mid-answer: one more try, as the answers pass does.
                if (!r.transient && r.finish === null && r.spoken && !dropRetried) { dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(pauseMs ? 5000 : 0); continue; }
                if (!r.transient) break;
                lastErr = r.transient; await sleep(pauseMs ? 8000 * (a + 1) : 0);
            } catch (e) { lastErr = e.message; r = null; await sleep(pauseMs ? 4000 * (a + 1) : 0); }
        }
        const base = { key: c.key, hour: o.hour, id: o.id, kind: o.kind, leg, q: o.current, arm: c.arm, rep: c.rep, position: c.pos, model: L.model, thinking: L.thinking, label: `${L.model}_fturn-${o.hour}-${c.arm}`, at };
        if (!r || r.transient) {
            store[c.key] = { ...base, transientError: lastErr ?? 'no response' };
            transient.push(`${c.key}#${c.rep} ${c.arm}`);
            log(`${tag}: TRANSIENT ${lastErr}`);
        } else {
            store[c.key] = { ...base, ...r };
            log(`${tag}: ${String(r.words).padStart(3)}w  ttft ${String(r.ttft).padStart(5)}ms  total ${String(r.total).padStart(5)}ms  thoughts ${r.thoughts}  finish ${r.finish}`);
        }
        fs.writeFileSync(fileFor(leg, o.hour, c.arm, c.rep), JSON.stringify(store, null, 1));
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
    let key = null;
    if (!dryRun) {
        // The key, in-process from MAIN's .env; never printed.
        key = fs.readFileSync(path.join(MAIN, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim() ?? null;
        if (!key) { console.log('REFUSED: no GEMINI_API_KEY in MAIN/.env'); process.exit(2); }
    }
    const r = await runPass({ leg, hours: hoursArg ? hoursArg.split(',') : PRIMARY_HOURS, crashResume: argv.includes('--crash-resume'), dryRun, key });
    if (r.refused) { console.log(`REFUSED: ${r.refused}`); process.exit(2); }
}
