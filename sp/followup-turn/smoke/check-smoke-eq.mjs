// Reads the smoke's segment log back. `chars` in a diag line is the block the engine BUILT; on a coding
// framing WhatToAnswerLLM drops it, so chars is never read as "inserted" (plan review m3) — every item
// here is verbal.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [logPath, playedPath, , mode] = process.argv.slice(2);
if (!logPath || !playedPath || (mode !== 'on' && mode !== 'off')) { console.error('usage: node check-smoke-eq.mjs <segment natively_debug.log> <played json> --mode on|off'); process.exit(2); }
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const CLIPS = path.join(MAIN, 'electron', 'test', 'golden', 'scenario50-tts-local');
const OWN_CLIPS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'clips');     // the invented quick follow-up
const clipText = (id) => { for (const d of [CLIPS, OWN_CLIPS]) { const p = path.join(d, `${id}.txt`); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } throw new Error(`${id}.txt not found in the roster folder or ${OWN_CLIPS}`); };
const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const played = JSON.parse(fs.readFileSync(playedPath, 'utf8')).played;
const words = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const STAMP = /^(\S+) /;                                                   // every debug-log line starts with its ISO instant
const PINNED = /\[IntelligenceEngine\] runWhatShouldISay: pinned question (".*")$/;
const DIAG = /\[IntelligenceEngine\] earlier question: gate=(\S+) cue=(\S+) chars=(\d+) turn=(\S+) ms=(\d+)/;
const bad = [], notes = [];
const startup = lines.find((l) => l.includes('[Main] earlier question: '));
if (!startup) bad.push('no [Main] earlier question startup line');
else if (!startup.includes(mode === 'on' ? 'earlier question: on' : 'earlier question: off')) bad.push(`startup line is "${startup.slice(-40)}", mode ${mode}`);
// pair each pinned-question line with the diag line logged right after it (same tick; a few STT lines may interleave)
const events = [];
for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PINNED); if (!m) continue;
    let diag = null;
    for (let j = i + 1; j < Math.min(i + 13, lines.length) && !lines[j].match(PINNED); j++) { const d = lines[j].match(DIAG); if (d) { diag = { gate: d[1], cue: d[2], chars: +d[3], turn: d[4], ms: +d[5] }; break; } }
    events.push({ at: Date.parse(lines[i].match(STAMP)?.[1] ?? ''), text: JSON.parse(m[1]), diag });
}
// WHY = "Why that one?" 30 s after S1Q06F (spec §6 quick follow-up): its parent is still in the prompt, so no block.
const EXPECT = { S1Q04: { gate: 'no-cue' }, S1Q04F: { gate: 'block', cue: 'constraint' }, S1Q06: { gate: 'no-cue' }, S1Q06F: { gate: 'block', cue: 'pronoun' }, WHY: { gate: 'parent-in-prompt', cue: 'short' } };
const seenTurns = [];
for (const [i, p] of played.entries()) {
    // Attribute by play window (smoke-turn.mjs's rule): the first pinned question at or after this clip's
    // start and before the next clip's start. The whole-turn answer fires after the voice stops, and the
    // next clip starts at least 14 s later, so the window is unambiguous; a text overlap with the clip's
    // own .txt is only a note (S1Q04F shares words with S1Q04, so text alone could not tell them apart).
    const windowEnd = played[i + 1]?.startedMs ?? Infinity;
    const ev = events.find((e) => e.at >= p.startedMs && e.at < windowEnd);
    if (!ev) { bad.push(`${p.id}: NOT EXERCISED (no pinned question line in its play window)`); continue; }
    const spoken = clipText(p.id);
    if (overlap(spoken, ev.text) < 0.5) notes.push(`${p.id}: pinned text overlaps its clip only ${overlap(spoken, ev.text).toFixed(2)} (STT drift?)`);
    if (mode === 'off') { if (ev.diag) bad.push(`${p.id}: a diag line with the flag unset`); else notes.push(`${p.id}: pinned, no diag line (flag off)`); continue; }
    if (!ev.diag) { bad.push(`${p.id}: pinned but no earlier-question diag line`); continue; }
    const want = EXPECT[p.id];
    if (ev.diag.gate !== want.gate) bad.push(`${p.id}: gate=${ev.diag.gate}, want ${want.gate}`);
    if (want.cue && ev.diag.cue !== want.cue) bad.push(`${p.id}: cue=${ev.diag.cue}, want ${want.cue}`);
    if (want.gate === 'block' && !(ev.diag.chars >= 200 && ev.diag.chars <= 578)) bad.push(`${p.id}: chars=${ev.diag.chars} outside 200..578`);   // max = 125 label + 3 ("\n- ") + 450 clip (m5)
    if (want.gate !== 'block' && ev.diag.chars !== 0) bad.push(`${p.id}: chars=${ev.diag.chars} on a ${want.gate}`);
    if (!/^\d+$/.test(ev.diag.turn)) bad.push(`${p.id}: turn=${ev.diag.turn} is not a turn id`); else seenTurns.push(+ev.diag.turn);
    if (ev.diag.ms > 50) notes.push(`${p.id}: ms=${ev.diag.ms} (slow build)`);
    notes.push(`${p.id}: gate=${ev.diag.gate} cue=${ev.diag.cue} chars=${ev.diag.chars} turn=${ev.diag.turn} ms=${ev.diag.ms}`);
}
if (mode === 'on' && seenTurns.length === played.length && !seenTurns.every((t, i) => i === 0 || t > seenTurns[i - 1])) bad.push(`turn ids not increasing: ${seenTurns.join(',')}`);
if (mode === 'off' && lines.some((l) => DIAG.test(l))) bad.push('flag off: an earlier-question diag line exists');
if (lines.some((l) => /\[CRITICAL\].*(Unhandled Rejection|Uncaught Exception)/.test(l))) bad.push('a CRITICAL unhandled rejection / uncaught exception in the segment');
const answers = lines.filter((l) => l.includes('[Answer] full:')).length;
if (answers < played.length) bad.push(`${answers} answers for ${played.length} clips`);
for (const n of notes) console.log(`  ${n}`);
console.log(bad.length ? `CHECK FAILED (${bad.length}):\n  - ${bad.join('\n  - ')}` : `CHECK CLEAN: ${played.length}/${played.length} exercised, ${answers} answers, mode ${mode}`);
console.log(`CHECK EXIT ${bad.length ? 1 : 0}`);
process.exit(bad.length ? 1 : 0);
