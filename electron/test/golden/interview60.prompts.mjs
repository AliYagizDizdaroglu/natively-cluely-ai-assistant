/**
 * Builds <run>/interview60.prompts.json — question id → the EXACT { system, user } pair the
 * app sent the answer model that hour — so the focused arms can replay another model against
 * the app's own call instead of the arm's bare framing.
 *
 * Inputs, both already in the run folder: verbal-prompts.log (one JSON object per answer,
 * written by llm/promptCapture when NATIVELY_CAPTURE_PROMPTS=1) and natively_debug.log (the
 * dispatch lines that name the question). Pairing is by time — a capture belongs to the
 * dispatch it follows — which is why the app logs the dispatch before issuing the request.
 *
 *   node electron/test/golden/interview60.prompts.mjs <run-dir>
 *
 * Exit 0 with a file written, or 1 with nothing written and the reason on stderr; the flight
 * treats a failure as "run the focused arms the old way" and says so in its log.
 */
import fs from 'fs';
import path from 'path';
import { pairCapturesToDispatches } from '../../../dist-electron/electron/llm/promptCapture.js';

const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: answer source=(?:live|whisper) anchor="(?:[^"\\]|\\.)*" verdict=\w+ question="((?:[^"\\]|\\.)*)"/gm;

/** Dispatches in order, each with the question text the app pinned. */
export function readDispatches(debugLog) {
    return [...debugLog.matchAll(DISPATCH)].map((m) => ({ at: m[1], question: JSON.parse(`"${m[2]}"`) }));
}

/** The roster item a dispatched question belongs to, by the harness's own pairing: the item
 *  whose play window contains the dispatch. The timeline carries one entry per roster item. */
export function idsForDispatches(dispatches, timeline) {
    const items = (timeline.items ?? []).filter((i) => (i.kind ?? 'spoken') === 'spoken' && i.playedAt);
    const windows = items.map((i, n) => ({
        id: i.id,
        from: i.playedAt,
        to: n + 1 < items.length ? items[n + 1].playedAt : i.playedAt + 300_000,
    }));
    return dispatches.map((d) => {
        const at = Date.parse(d.at);
        const w = windows.find((x) => at >= x.from && at < x.to);
        return w ? { id: w.id, dispatchedAt: d.at } : null;
    }).filter(Boolean);
}

const dir = process.argv[2];
if (!dir) { console.error('usage: interview60.prompts.mjs <run-dir>'); process.exit(1); }
const capturePath = path.join(dir, 'verbal-prompts.log');
const debugPath = path.join(dir, 'natively_debug.log');
const timelinePath = path.join(dir, 'interview60.timeline.json');
for (const f of [capturePath, debugPath, timelinePath]) {
    if (!fs.existsSync(f)) { console.error(`PROMPTS  missing ${path.basename(f)} — no captured prompts for this run`); process.exit(1); }
}

const captures = fs.readFileSync(capturePath, 'utf8').split('\n').filter((l) => l.trim()).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);
const dispatches = idsForDispatches(readDispatches(fs.readFileSync(debugPath, 'utf8')), JSON.parse(fs.readFileSync(timelinePath, 'utf8')));
const paired = pairCapturesToDispatches(captures, dispatches);

const out = {};
for (const [id, c] of Object.entries(paired)) out[id] = { system: c.system, user: c.user, model: c.model, at: c.at };
const file = path.join(dir, 'interview60.prompts.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
const n = Object.keys(out).length;
console.log(`PROMPTS  ${n} of ${dispatches.length} dispatched answers captured → ${file}`);
if (n === 0) { console.error('PROMPTS  nothing paired — was NATIVELY_CAPTURE_PROMPTS=1 set for the hour?'); process.exit(1); }
