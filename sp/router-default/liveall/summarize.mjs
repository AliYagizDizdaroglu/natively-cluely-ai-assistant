// summarize.mjs: per-item health of the Live-all run: got answer y/n, first-word ms (first output of the item after its clip ended), words, generationComplete / turnComplete seen, and the session's close codes.
// Reads runs/liveall-r1.json and runs/liveall-r1.answers.json (the et10 extraction); prints ids and numbers only; writes health.json.
import fs from 'node:fs';
import { HERE } from './common.mjs';
const rd = (f) => JSON.parse(fs.readFileSync(`${HERE}/runs/${f}`, 'utf8'));
const R1 = rd('liveall-r1.json'), R2 = rd('liveall-r1-s2.json'), A = rd('liveall-r1.merged.answers.json');
const R = { events: [...R1.events, ...R2.events.map((e) => ({ ...e, s2: true }))], pairs: [Object.keys(A)], t0Iso: R1.t0Iso, partial: false };
const ids = R.pairs[0];
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null; };
const rows = ids.map((id) => {
    const a = A[id], ev = (a?.src === 's2' ? R2 : R1).events.filter((e) => e.item === id);
    const first = ev.find((e) => e.kind === 'outputTx' && e.sinceClipEnd != null && e.sinceClipEnd >= 0);
    return { id, played: !!a?.played, answered: !!a?.played && !!a.answer?.trim(), firstWordMs: first?.sinceClipEnd ?? null, ttftAnswerMs: a?.ttftMs ?? null, words: a?.words ?? 0,
        generationComplete: ev.some((e) => e.kind === 'generationComplete' && e.sinceClipEnd != null), turnComplete: ev.some((e) => e.kind === 'turnComplete'), cap: !!a?.cap, noOutput: ev.some((e) => e.kind === 'noOutput'),
        holding: a?.holding?.length ?? 0, premature: a?.premature?.length ?? 0, retried: R1.events.some((e) => e.item === `${id}~a1`) };
});
const answered = rows.filter((r) => r.answered), fw = answered.map((r) => r.firstWordMs).filter((x) => x != null), tf = answered.map((r) => r.ttftAnswerMs).filter((x) => x != null), wd = answered.map((r) => r.words);
const closes = R.events.filter((e) => e.kind === 'close').map((e) => e.code);
const closesOf = (X) => X.events.filter((e) => e.kind === 'close').map((e) => e.code);
const out = { run: { t0Iso: R1.t0Iso, session1: { stopped: R1.stopped, unplanned: R1.unplanned, reconnects: R1.reconnects, closes: closesOf(R1), goAways: R1.events.filter((e) => e.kind === 'goAway').length, errors: R1.events.filter((e) => e.kind === 'error').length, lastEventSec: +(R1.events.at(-1).t / 1000).toFixed(0) },
    session2: { from: R2.pairs[0][0], stopped: R2.stopped, unplanned: R2.unplanned, reconnects: R2.reconnects, closes: closesOf(R2), goAways: R2.events.filter((e) => e.kind === 'goAway').length, errors: R2.events.filter((e) => e.kind === 'error').length, lastEventSec: +(R2.events.at(-1).t / 1000).toFixed(0) } },
    answered: answered.length, of: ids.length, notAnswered: rows.filter((r) => !r.answered).map((r) => r.id), firstWordMs: { p50: pct(fw, 0.5), p90: pct(fw, 0.9), n: fw.length }, answerTtftMs: { p50: pct(tf, 0.5), p90: pct(tf, 0.9), n: tf.length },
    words: { p50: pct(wd, 0.5), p90: pct(wd, 0.9), max: Math.max(0, ...wd) }, caps: rows.filter((r) => r.cap).map((r) => r.id), noOutput: rows.filter((r) => r.noOutput).map((r) => r.id), retried: rows.filter((r) => r.retried).map((r) => r.id),
    withHolding: rows.filter((r) => r.holding).map((r) => r.id), withPremature: rows.filter((r) => r.premature).map((r) => r.id), rows };
fs.writeFileSync(`${HERE}/health.json`, JSON.stringify(out, null, 1));
const { rows: _r, ...head } = out;
console.log(JSON.stringify(head));
