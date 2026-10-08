// Throwaway (2026-09-29): extract REAL non-holdout event sequences for the boundary-repair unit tests,
// verbatim from the run logs, and the reference (rule-v3.mjs) output for each. Writes fixtures-v3.json:
//   positives: every distinct v3 repair in the non-holdout logs  [interim I, final F1, final F2]
//   negatives: distinct cuts v3 must leave alone, one per class (NORMAL, the |T| == 1 tail both when
//              the word was re-heard and when it was really lost, number-formatted evidence, tolerant
//              re-cover), from the same logs
// Each sequence's atMs are relative to I (log timestamps). The reference is re-run on the 3-event
// sequence alone, and must give the same text it gave in the full stream (else the fixture is refused).
import fs from 'node:fs';
import path from 'node:path';
import { createRepair, tok } from './rule-v3.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const positives = new Map(), negatives = new Map();
for (const dir of fs.readdirSync(RUNS).filter((d) => !/h40/.test(d) && fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const r = createRepair();
    let lastInterim = null, cut = null;
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const text = unq(m[3]);
        if (!text) continue;
        const at = Date.parse(m[1]), isFinal = m[2] === 'true';
        const out = r.onTranscript(text, isFinal, at).text;
        if (!isFinal) { lastInterim = { text, at }; continue; }
        if (cut) {
            const seq = [
                { text: cut.i.text, isFinal: false, atMs: 0 },
                { text: cut.f1.text, isFinal: true, atMs: cut.f1.at - cut.i.at },
                { text, isFinal: true, atMs: at - cut.i.at },
            ];
            const T = tok(cut.i.text).slice(tok(cut.f1.text).length), f = tok(text);
            const cls = out !== text ? 'REPAIR' : f[0] === T[0] ? 'NORMAL' : T.length === 1 ? 'TAIL1' : /\d/.test(text.split(/\s+/).slice(0, 2).join(' ')) ? 'NUMBER' : 'OTHER';
            const key = `${cut.i.text}|${cut.f1.text}|${text}`;
            const bucket = cls === 'REPAIR' ? positives : negatives;
            if (!bucket.has(key)) bucket.set(key, { run: dir, cls, events: seq, expectedF2: out });
        }
        cut = null;
        if (lastInterim) {
            const iw = tok(lastInterim.text), fw = tok(text);
            if (fw.length > 0 && fw.length < iw.length && fw.slice(0, -1).every((w, i) => w === iw[i])) cut = { i: lastInterim, f1: { text, at } };
        }
        lastInterim = null;
    }
}
// Re-run each 3-event sequence alone through the reference: it must reproduce the stream's result.
const check = (fx) => {
    const r = createRepair();
    let last = null;
    for (const e of fx.events) last = r.onTranscript(e.text, e.isFinal, e.atMs).text;
    return last === fx.expectedF2;
};
const pos = [...positives.values()], negAll = [...negatives.values()];
const bad = [...pos, ...negAll].filter((fx) => !check(fx));
if (bad.length) { console.log(`REFUSED: ${bad.length} fixture(s) behave differently alone than in the stream`); for (const b of bad) console.log(JSON.stringify(b)); process.exit(3); }
const neg = [];
for (const cls of ['NORMAL', 'TAIL1', 'NUMBER', 'OTHER']) neg.push(...negAll.filter((x) => x.cls === cls).slice(0, cls === 'NORMAL' ? 3 : 99));

// The symptom (h40c R22, holdout: used only as the reproduction of the reported defect, never to choose
// the rule) and one seam-probe tolerant positive (S2Q07 play 3, 2026-09-29 16:36 recording).
const symptom = {
    run: '2026-09-29T11-42-00-h40c R22', cls: 'REPAIR',
    events: [
        { text: 'How do you cut hallucinations in a rag answer without just making', isFinal: false, atMs: 0 },
        { text: 'How do you cut', isFinal: true, atMs: Date.parse('2026-09-29T11:19:27.826Z') - Date.parse('2026-09-29T11:19:27.809Z') },
        { text: 'in a rag answer without just making it refuse?', isFinal: true, atMs: Date.parse('2026-09-29T11:19:29.373Z') - Date.parse('2026-09-29T11:19:27.809Z') },
    ],
};
const seamEvents = fs.readFileSync(new URL('./seam-probe/events-2026-09-29T13-36-36-838Z.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.kind === 'transcript' && e.text);
const si = seamEvents.findIndex((e, i) => e.isFinal && e.text === 'Design a multi tenant Rag' && seamEvents[i - 1]?.text === 'Design a multi tenant RAC service over' && seamEvents.slice(i + 1).find((x) => x.isFinal)?.text.startsWith('over 10,000,000'));
if (si < 0) { console.log('REFUSED: seam tolerant sequence not found'); process.exit(3); }
const f2i = seamEvents.findIndex((x, j) => j > si && x.isFinal);
const seam = {
    run: 'seam-probe 2026-09-29T13-36-36-838Z S2Q07 play 3', cls: 'REPAIR',
    events: [seamEvents[si - 1], seamEvents[si], seamEvents[f2i]].map((e) => ({ text: e.text, isFinal: e.isFinal, atMs: e.at - seamEvents[si - 1].at })),
};
for (const fx of [symptom, seam]) {
    const r = createRepair();
    let last = null;
    for (const e of fx.events) last = r.onTranscript(e.text, e.isFinal, e.atMs).text;
    fx.expectedF2 = last;
}
fs.writeFileSync(new URL('./fixtures-v3.json', import.meta.url), JSON.stringify({ symptom, seam, positives: pos, negatives: neg }, null, 1) + '\n');
console.log(`symptom -> ${JSON.stringify(symptom.expectedF2)}\nseam    -> ${JSON.stringify(seam.expectedF2)}`);
console.log(`positives ${pos.length} (distinct), negatives written ${neg.length} of ${negAll.length} distinct (${['NORMAL', 'TAIL1', 'NUMBER', 'OTHER'].map((c) => `${c} ${negAll.filter((x) => x.cls === c).length}`).join(', ')})`);
for (const p of pos) console.log(`  + ${p.run.slice(0, 22)} ${JSON.stringify(p.expectedF2.slice(0, 70))}`);
for (const n of neg) console.log(`  - ${n.cls.padEnd(6)} ${n.run.slice(0, 22)} I=${JSON.stringify(n.events[0].text.slice(-40))} F2=${JSON.stringify(n.events[2].text.slice(0, 40))}`);
