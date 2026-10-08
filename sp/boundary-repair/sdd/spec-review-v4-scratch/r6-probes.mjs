// Spec-review v4 scratch:
//  A. the previous reviewer's probe inputs (probe-inputs.mjs, probe-lang.mjs) re-run against rule-v4 AND rule-v3
//     (v3 = the calibration: its known wrong outputs must reappear), plus hunt probes for the re-spelling test:
//     merges that make F1's last token SHORTER or the SAME length, and genuine re-spellings it refuses.
//  B. every tolerant cut (v3 definition) in the NON-HOLDOUT logs + seam recordings with I / F1 / F2, v4's verdict,
//     and whether F2 reads as a merge (F2 starts with T[1], i.e. F1's last token already covered T[0]).
//  C. English-connection text the ASCII tokens cannot hold: finals/interims with non-ASCII letters, '&' joins.
import fs from 'node:fs';
import path from 'node:path';
import * as v3 from '../../rule-v3.mjs';
import * as v4 from '../../rule-v4.mjs';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const SEAM = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../seam-probe');
const unq = (s) => JSON.parse(`"${s}"`);
const probe = (mod, I, F1, F2, gap = 2000) => { const r = mod.createRepair(); r.onTranscript(I, false, 0); r.onTranscript(F1, true, 100); return r.onTranscript(F2, true, 100 + gap); };
const show = (o) => (o.restored ? `RESTORED ${JSON.stringify(o.restored)}: ${JSON.stringify(o.text.slice(0, 55))}` : `unchanged`);
console.log('== A. previous reviewer\'s probe inputs (v3 | v4) ==');
const P = [
    ['neg#28 as logged (gap 5164)', 'accuracy reaching ninety two percent', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 5164],
    ['neg#28 inside the window', 'accuracy reaching ninety two percent', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 3000],
    ['R22 symptom', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547],
    ['92% + interim ran 2 words on', 'accuracy reaching ninety two percent for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,'],
    ['25 + interim ran 2 words on', 'we cut latency by twenty five last quarter', 'We cut latency by 25', 'last quarter. What changed?'],
    ['15% + interim ran on', 'your model accuracy dropped fifteen percent overnight but', 'Your model accuracy dropped 15%', 'overnight, but the input schema is unchanged.'],
    ['compound merge alright', 'thanks all right so tell me about', 'Thanks. Alright.', 'So tell me about your last project.'],
    ['control: interim already digits', 'accuracy reaching 92% for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,'],
    ['stutter the the', "what's the the latency budget", "What's the", 'latency budget for this endpoint?'],
    ['interim filler um', 'so how would you um scale the service', 'So how would you', 'scale the service?'],
    ['es: lost "migración"', 'Cuéntame sobre la migración de datos que hiciste', 'Cuéntame sobre la', 'de datos que hiciste?'],
    ['tr: İ shifts Traw', 'Peki İzmir projesinde hangi veritabanını seçtiniz', 'Peki', 'projesinde hangi veritabanını seçtiniz?'],
    ['ru: Latin-only tokens', 'Мы используем Kafka, для кэша Redis и S3 для файлов', 'Мы используем Kafka, для кэша', 'Редис и S3 для файлов.'],
];
for (const [l, I, F1, F2, g] of P) console.log(`${l.padEnd(34)} v3 ${show(probe(v3, I, F1, F2, g)).padEnd(70)} | v4 ${show(probe(v4, I, F1, F2, g))}`);
console.log('\n== A2. hunt: merges v4 still ACCEPTS (final token no longer than the interim token, no digit, same first letter) ==');
const H = [
    ['"Q and A" -> "Q&A" (shorter merge)', 'we will do a Q and A session on friday', 'We will do a Q&A', 'session on Friday.'],
    ['"M and A" -> "M&A" (shorter merge)', 'she led the M and A deal last year', 'She led the M&A', 'deal last year.'],
    ['"all ready" -> "already"? (longer: refused)', 'the data is all ready for the next step', 'The data is already', 'for the next step.'],
    ['"can not" interim -> "cannot" final (longer: refused)', 'we can not scale this beyond ten nodes', 'We cannot', 'scale this beyond ten nodes.'],
    ['accented English: lost "résumé"', 'walk me through your résumé and the gaps in it', 'Walk me through your', 'and the gaps in it.'],
    ['accented English: lost "café"', 'we built the café ordering system in python', 'We built the', 'ordering system in Python.'],
    ['curly apostrophe interim vs straight final', 'what’s your approach to caching layers here', 'What’s your', 'to caching layers here?'],
];
for (const [l, I, F1, F2, g] of H) console.log(`${l.padEnd(52)} v3 ${show(probe(v3, I, F1, F2, g)).padEnd(64)} | v4 ${show(probe(v4, I, F1, F2, g))}`);
console.log('\n== A3. hunt: genuine re-spellings at the cut v4 REFUSES (a real loss after them would stay lost) ==');
const R = [
    ['homophone, new first letter: "cue" -> "queue"', 'push it onto the cue before the worker picks it up', 'Push it onto the queue', 'the worker picks it up.'],
    ['completion longer than a truncated interim word', 'how would you make the consumer idem potent end to end', 'How would you make the consumer idempotent', 'end to end?'],
    ['inflection longer: "scale" -> "scales"', 'how does the system scale horizontally under heavy load', 'How does the system scales', 'under heavy load?'],
];
for (const [l, I, F1, F2, g] of R) console.log(`${l.padEnd(52)} v3 ${show(probe(v3, I, F1, F2, g)).padEnd(64)} | v4 ${show(probe(v4, I, F1, F2, g))}`);

// ---- B. every tolerant cut in the non-holdout data
console.log('\n== B. tolerant cuts in NON-HOLDOUT logs + seam: v4 verdict and the F2 reading ==');
const streams = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => !/h40/.test(d) && fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m) ev.push({ text: m[3] === '(empty)' ? '' : unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]) });
    }
    streams.push({ name: dir, ev });
}
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(SEAM, f), 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(l); if (e.kind === 'transcript') ev.push({ text: e.text, isFinal: e.isFinal, at: e.at }); }
    streams.push({ name: `seam ${f.slice(7, 26)}`, ev });
}
const tally = {};
for (const s of streams) {
    let lastInterim = null, pending = null;
    for (const e of s.ev) {
        if (!e.text) continue;
        if (!e.isFinal) { lastInterim = e.text; continue; }
        if (pending) {
            const f = v4.tok(e.text), T = pending.T;
            const reading = f[0] === T[0] ? 'NORMAL (aligned)' : f[0] === T[1] ? 'MERGE? (F2 starts at T[1])' : 'other';
            const key = `${pending.verdict} / ${reading}`;
            tally[key] = (tally[key] ?? 0) + 1;
            if (pending.verdict !== 'kept' || reading !== 'NORMAL (aligned)') console.log(`  ${pending.verdict.padEnd(22)} ${reading.padEnd(26)} gap ${String(e.at - pending.at).padStart(5)} ${s.name.slice(0, 24)}\n      I : ${JSON.stringify(pending.I)}\n      F1: ${JSON.stringify(pending.F1)}\n      F2: ${JSON.stringify(e.text)}`);
        }
        pending = null;
        if (lastInterim) {
            const iw = v4.tok(lastInterim), fw = v4.tok(e.text);
            if (fw.length > 1 && fw.length < iw.length && !fw.every((w, i) => w === iw[i]) && fw.slice(0, -1).every((w, i) => w === iw[i])) {
                const last = fw[fw.length - 1], at = iw[fw.length - 1];
                const verdict = v4.respelling(last, at) ? 'kept' : /\d/.test(last) ? 'refused: digit' : last.length > at.length ? 'refused: longer' : 'refused: first letter';
                pending = { I: lastInterim, F1: e.text, T: iw.slice(fw.length), verdict, at: e.at };
            }
        }
        lastInterim = null;
    }
}
console.log(`  tally (verdict / F2 reading): ${JSON.stringify(tally)}`);

// ---- C. what the English gate lets through that ASCII tokens cannot hold
console.log('\n== C. English logs: transcripts with non-ASCII letters or "&" joins (non-holdout + holdout counted) ==');
let nonAscii = 0, amp = 0; const ex = new Set();
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log')))) {
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/\[DeepgramStreaming\] Transcript event — isFinal=(?:true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const words = m[1].split(/\s+/);
        for (const w of words) {
            if (/[^\x00-\x7F]/.test(w) && /\p{L}/u.test(w)) { nonAscii++; if (ex.size < 12) ex.add(w); }
            if (/\w&\w/.test(w)) { amp++; if (ex.size < 16) ex.add(w); }
        }
    }
}
console.log(`  words with a non-ASCII letter: ${nonAscii}; words joined by "&": ${amp}; examples: ${JSON.stringify([...ex])}`);
