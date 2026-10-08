// Throwaway (2026-09-29): read a seam-probe recording (events-<stamp>.jsonl + plan-<stamp>.json) and
// report, per play, the joined finals and any boundary loss (interim I; final F1 a strict word-prefix of
// I; next final F2 resuming I after skipping words), labelled against the scripted question. With
// --repair <built module path>, also runs the built repair over the same event stream, in order, and
// prints the repaired joined finals beside the original.
//   node seam-analyze.mjs <stamp> [--repair <path to dist-electron/electron/audio/deepgramBoundaryRepair.js>] [--v4]
// --v4 applies the repair with the adapter's v4 wiring (DeepgramStreamingSTT, Task 4): clear() on every
// UtteranceEnd and on an empty FINAL, speech_final passed with each transcript. Every loss also says whether
// its cut final carried speech_final (v4 leaves no cut there).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// --dir <folder under this one>: the fresh v4 recording lives in seam-probe-v4, outside check-v4.mjs's frozen inputs.
const di = process.argv.indexOf('--dir');
const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), di > 0 ? process.argv[di + 1] : 'seam-probe');
const stamp = process.argv[2];
if (!stamp) { console.log('usage: seam-analyze.mjs <stamp> [--repair <module>]'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(path.join(dir, `plan-${stamp}.json`), 'utf8'));
const events = fs.readFileSync(path.join(dir, `events-${stamp}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const ri = process.argv.indexOf('--repair');
const repairPath = ri > 0 ? process.argv[ri + 1] : null;
const V4 = process.argv.includes('--v4');

const tok = (s) => String(s).toLowerCase().replace(/(\d),(\d)/g, '$1$2').match(/[a-z0-9']+/g) ?? [];
const transcripts = events.filter((e) => e.kind === 'transcript' && e.text);
// A segment's start can precede its play (Deepgram's first segment includes the leading silence), so a
// transcript belongs to the play whose [startS, next play's startS) holds the segment's END.
const playOf = (e) => {
    const end = e.start + e.duration;
    return plan.plan.find((p, i) => end >= p.startS && end < (plan.plan[i + 1]?.startS ?? Infinity));
};

// Boundary losses over the whole stream, in arrival order (as the app sees them).
const losses = [];
let lastInterim = null, pending = null, cuts = 0, cutsSf = 0;
for (const e of transcripts) {
    if (!e.isFinal) { lastInterim = e; continue; }
    if (pending) {
        const rest = pending.iw.slice(pending.f1.length), f2w = tok(e.text);
        let k = -1;
        for (let s = 1; s < rest.length; s++) {
            const n = Math.min(3, rest.length - s, f2w.length);
            if (n >= 2 && rest.slice(s, s + n).join(' ') === f2w.slice(0, n).join(' ')) { k = s; break; }
        }
        const p = playOf(pending.e);
        const truth = p ? new Set(tok(plan.script[p.id])) : null;
        const labelOf = (ws) => (!truth ? 'UNKNOWN' : ws.every((w) => truth.has(w)) ? 'TRUE' : 'FALSE');
        const sf = pending.e.speechFinal === true;
        if (k > 0) {
            const lost = rest.slice(0, k);
            losses.push({ play: p ? `${p.id}#${p.play}` : '?', lost: lost.join(' '), label: labelOf(lost), gapMs: e.at - pending.e.at, kind: 'resumed', sf });
        } else if (f2w.length && f2w[0] !== rest[0] && !f2w.slice(0, 3).includes(rest[0])) {
            // The interim ran past the cut but not far enough to show where F2 resumes: its tail is in
            // neither final. The design's rule cannot see this variant (it needs 2+ interim words after the skip).
            losses.push({ play: p ? `${p.id}#${p.play}` : '?', lost: rest.join(' '), label: labelOf(rest), gapMs: e.at - pending.e.at, kind: 'unresumed-tail', f2: e.text.slice(0, 40), sf });
        }
        pending = null;
    }
    if (lastInterim) {
        const iw = tok(lastInterim.text), fw = tok(e.text);
        if (fw.length > 0 && fw.length < iw.length && fw.every((w, i) => w === iw[i])) { pending = { iw, f1: fw, e }; cuts++; if (e.speechFinal === true) cutsSf++; }
    }
    lastInterim = null;
}

// Optional: the built repair over the same stream, in arrival order.
let repaired = null;
if (repairPath) {
    const mod = repairPath.endsWith('.mjs') ? await import(new URL(`file:///${path.resolve(repairPath).replace(/\\/g, '/')}`).href) : createRequire(import.meta.url)(repairPath);
    const factory = mod.createRepair ?? mod.createBoundaryRepair ?? mod.createDeepgramBoundaryRepair ?? mod.default;
    if (typeof factory !== 'function') { console.log(`REFUSED: ${repairPath} exports no factory (${Object.keys(mod).join(', ')})`); process.exit(3); }
    const r = factory();
    repaired = new Map();
    if (V4) {
        if (typeof r.clear !== 'function') { console.log(`REFUSED: --v4 needs a module with clear() (${repairPath})`); process.exit(3); }
        for (const e of events) {
            if (e.kind === 'utterance-end') { r.clear(); continue; }
            if (e.kind !== 'transcript') continue;
            if (!e.text) { if (e.isFinal) r.clear(); continue; }
            const out = r.onTranscript(e.text, e.isFinal, e.at, e.speechFinal === true);
            if (e.isFinal) repaired.set(e, out?.text ?? e.text);
        }
    } else for (const e of transcripts) {
        const out = r.onTranscript ? r.onTranscript(e.text, e.isFinal, e.at) : r.process(e.text, e.isFinal, e.at);
        if (e.isFinal) repaired.set(e, typeof out === 'string' ? out : out?.text ?? e.text);
    }
}

const finalsByPlay = new Map();
for (const e of transcripts.filter((x) => x.isFinal)) {
    const p = playOf(e); if (!p) continue;
    const k = `${p.id}#${p.play}`;
    if (!finalsByPlay.has(k)) finalsByPlay.set(k, []);
    finalsByPlay.get(k).push(e);
}
let playsWithLoss = 0, fixedPlays = 0;
for (const p of plan.plan) {
    const k = `${p.id}#${p.play}`;
    const fs0 = finalsByPlay.get(k) ?? [];
    const joined = fs0.map((e) => e.text).join(' ');
    const truth = new Set(tok(plan.script[p.id]));
    const missing = [...truth].filter((w) => !new Set(tok(joined)).has(w));
    const loss = losses.filter((l) => l.play === k);
    if (loss.length) playsWithLoss++;
    let line = `${k.padEnd(9)} finals ${fs0.length} | missing vs script: ${missing.length ? missing.join(' ') : 'none'}${loss.length ? ` | BOUNDARY LOSS ${loss.map((l) => `${l.kind} "${l.lost}" ${l.label} +${l.gapMs}ms${l.sf ? ' [speech_final on the cut]' : ''}${l.f2 ? ` (F2 "${l.f2}")` : ''}`).join(', ')}` : ''}`;
    if (repaired) {
        const rj = fs0.map((e) => repaired.get(e)).join(' ');
        const rmissing = [...truth].filter((w) => !new Set(tok(rj)).has(w));
        if (rj !== joined) { line += `\n          repaired: ${JSON.stringify(rj.slice(0, 160))}`; if (rmissing.length < missing.length) fixedPlays++; }
        line += ` | after repair missing: ${rmissing.length ? rmissing.join(' ') : 'none'}`;
    }
    console.log(line);
}
const count = (kind, label) => losses.filter((l) => l.kind === kind && (!label || l.label === label)).length;
console.log(`\nplays ${plan.plan.length}; cuts ${cuts}; resumed losses ${count('resumed')} (TRUE ${count('resumed', 'TRUE')}, FALSE ${count('resumed', 'FALSE')}); unresumed tails ${count('unresumed-tail')} (TRUE ${count('unresumed-tail', 'TRUE')}, FALSE ${count('unresumed-tail', 'FALSE')}); plays with a loss ${playsWithLoss}${repaired ? `; plays the repair made more complete ${fixedPlays}` : ''}`);
const finalsAll = events.filter((e) => e.kind === 'transcript' && e.isFinal);
console.log(`speech_final: on ${finalsAll.filter((e) => e.speechFinal === true).length} of ${finalsAll.length} finals; on ${cutsSf} of ${cuts} strict cut finals; on the cut final of ${losses.filter((l) => l.sf).length} of ${losses.length} losses (v4 repairs none of those); utterance-ends ${events.filter((e) => e.kind === 'utterance-end').length}; empty finals ${finalsAll.filter((e) => !e.text).length}`);
