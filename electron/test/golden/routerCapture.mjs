/**
 * Live-router harness pieces (plan Task 13): the router preflight gates and the capture files.
 * Pure over log text so they are unit-tested on synthetic logs.
 *
 * Log line formats come from the plan (Task 2 connect/up/close lines, Task 5 decision/capture lines,
 * Task 10 `ear model=`); nothing here reads answer text for any purpose but copying it into the files.
 */

export const EXPECTED_BLOCK_SHA12 = '3a1da134e4c7';
export const EXPECTED_INSTRUCTION_SHA12 = '79ad0f464d95';
export const EAR_DEFAULT = 'gemini-3.1-flash-live-preview';

const last = (arr) => (arr.length ? arr[arr.length - 1] : null);

/**
 * The router gates, over the log since the app started. Every line is "PASS <label>" or "FAIL <label>[ — detail]"
 * so the caller can print one row per line. `env.NATIVELY_ROUTER_CONTEXT_SHA12` unset (the smoke) prints the sha
 * and does not gate it.
 */
export function routerPreflight(logSinceStart, env) {
    const log = String(logSinceStart);
    const lines = [];
    const row = (good, label, detail = '') => lines.push(`${good ? 'PASS' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`);

    const ups = [...log.matchAll(/\[Router\] session up\b/g)];
    const lastUp = last(ups);
    row(!!lastUp, 'router session up', lastUp ? '' : 'no [Router] session up line');

    const connects = [...log.matchAll(/\[Router\] session connect [^\n]*/g)].map((m) => m[0]);
    const c = last(connects);
    const field = (name) => c?.match(new RegExp(`\\b${name}=(\\S+)`))?.[1] ?? null;
    const block = field('block_sha12'), instr = field('instruction_sha12'), ctx = field('context_sha12'), chars = Number(field('context_chars'));
    row(!!c && block === EXPECTED_BLOCK_SHA12 && instr === EXPECTED_INSTRUCTION_SHA12, 'router shas match (block, instruction)',
        c ? `block_sha12=${block} instruction_sha12=${instr}` : 'no [Router] session connect line');
    const wantCtx = env?.NATIVELY_ROUTER_CONTEXT_SHA12;
    if (wantCtx) row(!!c && ctx === wantCtx, 'router context sha matches the smoke', c ? `context_sha12=${ctx} (want ${wantCtx})` : 'no connect line');
    else row(!!c, 'router context sha (NATIVELY_ROUTER_CONTEXT_SHA12 unset: printed, not gated)', `context_sha12=${ctx ?? '-'}`);
    row(!!c && chars > 0, 'router context is not empty', `context_chars=${c ? field('context_chars') : '-'}`);

    const status = last([...log.matchAll(/Live Mode status: (\w+)/g)]);
    row(status?.[1] === 'connected', 'Live Mode status connected', `last status ${status?.[1] ?? 'none'}`);

    // Only stale=no closes count: a goAway logs one (stale=no) and the old socket's late onclose logs a stale=yes
    // one, which can land after the new session's `up` on a healthy router.
    const closes = [...log.matchAll(/\[Router\] session close\b[^\n]*\bstale=no\b/g)];
    const lastClose = last(closes);
    row(!(lastUp && lastClose && lastClose.index > lastUp.index), 'no router session close after the last up',
        lastUp && lastClose && lastClose.index > lastUp.index ? 'the router session closed after it came up' : '');

    // `ear failover from=` only: main.ts also logs `ear failover disabled reason=NATIVELY_LIVE_MODEL`, which is not a failover (m-5)
    const failover = /\[Router\] ear failover from=/.test(log);
    row(!failover, 'no ear failover', failover ? 'a [Router] ear failover line is present' : '');

    const ear = last([...log.matchAll(/\[Router\] ear model=(\S+)/g)]);
    row(ear?.[1] === EAR_DEFAULT, `ear on ${EAR_DEFAULT}`, `last ear model=${ear?.[1] ?? 'none'}`);

    return { ok: lines.every((l) => l.startsWith('PASS')), lines };
}

/**
 * The router capture files from the run's debug log. Sources:
 *  - `[Router] turn=<id> … shown=live|pipeline … q_at=<ms>`: the turn's decision line; its q_at picks the item.
 *  - `[RouterAnswer] {json}`: one capture line per kind (live | shadow | appended).
 * The item is the one whose play window holds q_at: from startedMs + offsetMs + startSec*1000 up to the next
 * item's start. `live` holds kind=live; `shadow` holds the pipeline's text (kind=shadow with appended:false, and
 * kind=appended with appended:true). Entries whose turn has no decision line, or whose q_at precedes the first window (the probe's
 * turns), are returned in `unmapped`, and malformed or duplicate capture lines in `problems`: the caller prints
 * them, nothing is dropped silently and nothing throws after the hour is spent.
 */
export function buildCaptureFiles(debugLogText, timeline, offsetMs = 1150) {
    const text = String(debugLogText);
    const qAtByTurn = new Map();
    for (const m of text.matchAll(/\[Router\] turn=(\d+) [^\n]*?\bshown=(?:live|pipeline)\b[^\n]*?\bq_at=(\d+)/g)) qAtByTurn.set(Number(m[1]), Number(m[2]));
    const items = [...timeline.items].sort((a, b) => a.startSec - b.startSec);
    const starts = items.map((it) => timeline.startedMs + offsetMs + it.startSec * 1000);
    const idFor = (qAt) => {
        let found = null;
        for (let i = 0; i < items.length; i++) if (qAt >= starts[i]) found = items[i].id;
        return found;
    };
    const out = { live: [], shadow: [], unmapped: [], problems: [] };
    const seen = new Set();
    for (const m of text.matchAll(/\[RouterAnswer\] (.*)$/gm)) {
        let a;
        try { a = JSON.parse(m[1]); } catch { out.problems.push(`unparseable [RouterAnswer] line (${m[1].length} chars)`); continue; }
        if (!a || typeof a.turn !== 'number' || !['live', 'shadow', 'appended'].includes(a.kind)) { out.problems.push(`[RouterAnswer] line with an unusable turn or kind (turn=${a?.turn}, kind=${a?.kind})`); continue; }
        const key = `${a.turn}:${a.kind}`;
        if (seen.has(key)) { out.problems.push(`duplicate [RouterAnswer] ${key}`); continue; }
        seen.add(key);
        const qAt = qAtByTurn.get(a.turn);
        const id = qAt === undefined ? null : idFor(qAt);
        const entry = { id, turn: a.turn, text: a.text, words: a.words, firstMs: a.firstMs, endMs: a.endMs, q_src: a.q_src };
        if (a.superseded !== undefined) entry.superseded = a.superseded;   // copied as logged; absent stays absent (never defaulted)
        if (a.kind !== 'live') entry.appended = a.kind === 'appended';   // SPEC §5: shadow entries say appended true|false
        if (id === null) { out.unmapped.push({ ...entry, kind: a.kind, why: qAt === undefined ? 'no decision line for the turn' : 'q_at before the first play window' }); continue; }
        (a.kind === 'live' ? out.live : out.shadow).push(entry);
    }
    return out;
}
