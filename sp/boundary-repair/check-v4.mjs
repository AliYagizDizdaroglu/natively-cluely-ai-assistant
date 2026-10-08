// check-v4.mjs (2026-09-29, revised after the Opus review of DESIGN-v4): proves rule-v4.mjs — or, with
// --module, any module with the built module's export shape — on the recorded data and on the spec reviews'
// probe inputs. Prints one PASS/FAIL line per check and exits 1 if any check fails. Ends with two calibrations
// that must FAIL: the probe checks run against rule-v3 and the data check run against a pass-through.
//   node check-v4.mjs                       rule-v4.mjs is the candidate (output kept in evidence/check-v4.out.txt)
//   node check-v4.mjs --module <file>       the candidate is <file>: a CommonJS build (dist-electron/.../deepgram-
//                                           BoundaryRepair.js) or an ESM .mjs exporting createBoundaryRepair (or
//                                           createRepair) whose object has onTranscript(text, isFinal, atMs,
//                                           speechFinal) and clear(); the candidate is ALSO compared with rule-v4
//                                           event for event, and the last line says EQUIVALENT / NOT EQUIVALENT.
// Data: every run log under MAIN's interview60.runs (holdout = folder name contains "h40", reported only, never
// used to choose the rule) and both seam recordings. Log parsing is variants-v4.mjs's; the logs' own
// `[Main] turn: deepgram utterance-end` lines are ALSO applied as clear() in a second pass, since that is what
// the v4 wiring does in the app (only 15 of the 28 logs carry them — the listener dates from 2026-09-09).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as v3 from './rule-v3.mjs';
import * as v4 from './rule-v4.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const SEAM = new URL('./seam-probe/', import.meta.url);
const unq = (s) => JSON.parse(`"${s}"`);
const EXPECTED = { other: 25, holdout: 4, seam: 6 };
let failures = 0;
const verdict = (ok, label, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`); if (!ok) failures++; return ok; };

// ---- the candidate ---------------------------------------------------------------------------------------
const mi = process.argv.indexOf('--module');
const modulePath = mi > 0 ? path.resolve(process.argv[mi + 1]) : null;
let candidate = v4.createRepair;              // (make) => { onTranscript, clear }
let candidateName = 'rule-v4.mjs';
if (modulePath) {
    if (!fs.existsSync(modulePath)) { console.log(`FAIL  candidate module not found: ${modulePath}`); process.exit(1); }
    const mod = /\.(mjs|js)$/.test(modulePath) && !/\.mjs$/.test(modulePath) ? createRequire(import.meta.url)(modulePath) : await import(pathToFileURL(modulePath).href);
    const factory = mod.createBoundaryRepair ?? mod.createRepair ?? mod.default?.createBoundaryRepair;
    if (typeof factory !== 'function') { console.log(`FAIL  ${modulePath} exports no createBoundaryRepair/createRepair`); process.exit(1); }
    const probeObj = factory();
    const hasClear = typeof probeObj.clear === 'function';
    console.log(`candidate: ${modulePath} (factory ${factory.name || 'anonymous'}; clear() ${hasClear ? 'present' : 'MISSING — treated as a no-op, the pause checks will fail'})`);
    candidate = () => { const r = factory(); return { clear() { if (hasClear) r.clear(); }, onTranscript: (t, f, at, sf) => r.onTranscript(t, f, at, sf) }; };
    candidateName = path.basename(modulePath);
}

// ---- streams -------------------------------------------------------------------------------------------
const streams = [];
const perLog = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const ev = [];
    let empties = 0, ue = 0;
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m) {
            // (empty) is how the adapter logs an undefined transcript; "" an empty one: both are empties
            const e = { text: m[3] === '(empty)' ? '' : unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]) };
            if (e.isFinal && !e.text) empties++;
            ev.push(e);
            continue;
        }
        if (/ \[LOG\] \[Main\] turn: deepgram utterance-end /.test(l)) { ev.push({ utteranceEnd: true, fromLog: true }); ue++; }
    }
    perLog.push({ dir, empties, ue, holdout: /h40/.test(dir) });
    streams.push({ name: dir, kind: /h40/.test(dir) ? 'holdout' : 'other', ev });
}
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(new URL(f, SEAM), 'utf8').split('\n').filter(Boolean)) {
        const e = JSON.parse(l);
        if (e.kind === 'transcript') ev.push({ text: e.text, isFinal: e.isFinal, at: e.at, speechFinal: e.speechFinal === true });
        if (e.kind === 'utterance-end') ev.push({ utteranceEnd: true });
    }
    streams.push({ name: `seam ${f.slice(7, 26)}`, kind: 'seam', ev });
}

// ---- runners: one repair state per stream (per-socket.mjs showed per-socket == per-log, 0 differences) --
/** v3 as wired in Task 2: empties never reach the module, pause signals do not exist. */
function runV3(ev) {
    const r = v3.createRepair();
    return ev.map((e) => (e.utteranceEnd || !e.text ? null : r.onTranscript(e.text, e.isFinal, e.at).restored ?? null));
}
/** The v4 wiring (Task 4): an empty FINAL and an UtteranceEnd call clear(); speech_final rides on every final. */
function runV4(ev, { logUE = false } = {}, make = candidate) {
    const r = make();
    return ev.map((e) => {
        if (e.utteranceEnd) { if (!e.fromLog || logUE) r.clear(); return null; }
        if (!e.text) { if (e.isFinal) r.clear(); return null; }
        return r.onTranscript(e.text, e.isFinal, e.at, e.speechFinal === true).restored ?? null;
    });
}
const passThrough = () => ({ clear() { }, onTranscript(text) { return { text, restored: null }; } });

function compare(label, runA, runB, expected, showDiffs = true) {
    const totals = { other: 0, holdout: 0, seam: 0 };
    const diffs = [];
    let events = 0;
    for (const s of streams) {
        const a = runA(s.ev), b = runB(s.ev);
        totals[s.kind] += b.filter(Boolean).length;
        a.forEach((x, i) => { if (s.ev[i].text) events++; if (JSON.stringify(x) !== JSON.stringify(b[i])) diffs.push(`    ${s.name.slice(0, 30).padEnd(30)} baseline=${JSON.stringify(x)} candidate=${JSON.stringify(b[i])} before "${(s.ev[i].text ?? '').slice(0, 40)}"`); });
    }
    const ok = diffs.length === 0 && (!expected || (totals.other === expected.other && totals.holdout === expected.holdout && totals.seam === expected.seam));
    const line = `${label}: repairs non-holdout ${totals.other} / holdout ${totals.holdout} / seam ${totals.seam}${expected ? ` (expected ${expected.other} / ${expected.holdout} / ${expected.seam})` : ''}, ${diffs.length} of ${events} events differ`;
    if (showDiffs) for (const d of diffs.slice(0, 20)) console.log(d);
    return { ok, line, diffs: diffs.length };
}

console.log(`== check-v4: ${candidateName} on the recorded data ==`);
{
    const r = compare('candidate == v3 event for event', runV3, (ev) => runV4(ev), EXPECTED);
    verdict(r.ok, 'data: every run log + both seam recordings', r.line);
}
{
    const r = compare('candidate with the logs\' utterance-end lines as clear()', runV3, (ev) => runV4(ev, { logUE: true }), EXPECTED);
    verdict(r.ok, 'data: the same with the app\'s own utterance-end log lines applied as clear() (what the wiring does)', r.line);
}
if (modulePath) {
    const a = compare('candidate vs rule-v4, both under the v4 feed', (ev) => runV4(ev, {}, v4.createRepair), (ev) => runV4(ev), null);
    const b = compare('candidate vs rule-v4, utterance-end lines as clear()', (ev) => runV4(ev, { logUE: true }, v4.createRepair), (ev) => runV4(ev, { logUE: true }), null);
    verdict(a.ok && b.ok, 'data: candidate == rule-v4 event for event under the v4 feed', `${a.line}; with log utterance-ends: ${b.diffs} differ`);
}

// ---- the fixtures the unit tests replay: the candidate must reproduce every expected output (no test expectation changes)
{
    const fx = JSON.parse(fs.readFileSync(new URL('./fixtures-v3.json', import.meta.url), 'utf8'));
    const all = [fx.symptom, fx.seam, ...fx.positives, ...fx.negatives];
    const bad = all.filter((f) => { const r = candidate(); let last = null; for (const e of f.events) last = r.onTranscript(e.text, e.isFinal, e.atMs, false).text; return last !== f.expectedF2; });
    verdict(bad.length === 0 && all.length === 45, 'fixtures-v3.json: the candidate reproduces all 45 expected outputs', `${all.length - bad.length} of ${all.length}${bad.map((b) => ` (differs: ${b.run})`).join('')}`);
}

// ---- the spec reviews' probe inputs (sdd/spec-review-scratch/probe-inputs.mjs, probe-lang.mjs; sdd/spec-review-v4-scratch/r6-probes.mjs) and v4's own edges
const probe = (make, I, F1, F2, gap = 2000, opts = {}) => {
    const r = make();
    r.onTranscript(I, false, 0, false);
    if (opts.clearAfterInterim && typeof r.clear === 'function') r.clear();  // a pause between the interim and its final
    r.onTranscript(F1, true, 100, opts.sfF1 === true);
    if (opts.clearBetween && typeof r.clear === 'function') r.clear();     // rule-v3 has no clear(): the calibration run sees the pause ignored
    return r.onTranscript(F2, true, 100 + gap, opts.sfF2 === true);
};
const PROBES = [
    // label, I, F1, F2, gap, expected restored (null = unchanged), opts
    ['neg#28 as logged (gap 5164, outside the window)', 'accuracy reaching ninety two percent', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 5164, null],
    ['neg#28 inside the window', 'accuracy reaching ninety two percent', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 3000, null],
    ['R22 symptom still restores "hallucinations"', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547, ['hallucinations']],
    ['92% + interim ran 2 words on (v3: "two percent" inserted)', 'accuracy reaching ninety two percent for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 2000, null],
    ['25 + interim ran 2 words on (v3: "five" inserted)', 'we cut latency by twenty five last quarter', 'We cut latency by 25', 'last quarter. What changed?', 2000, null],
    ['15% + interim ran on (v3: "percent" inserted)', 'your model accuracy dropped fifteen percent overnight but', 'Your model accuracy dropped 15%', 'overnight, but the input schema is unchanged.', 2000, null],
    ['compound merge "all right" -> "Alright" (v3: "right" inserted; a longer final token)', 'thanks all right so tell me about', 'Thanks. Alright.', 'So tell me about your last project.', 2000, null],
    ['RECALL COST (review M1): an inflection is longer too — "scale" -> "scales" then "horizontally" lost stays lost (v3 restored it)', 'how does the system scale horizontally under heavy load', 'How does the system scales', 'under heavy load?', 2000, null],
    ['RECALL COST: "break" -> "breaks" then "even" lost stays lost (the 7 log "breaks" cuts are aligned and lost nothing)', 'the deploy would break even before the rollout', 'The deploy would breaks', 'before the rollout finishes.', 2000, null],
    ['control: interim already in digits', 'accuracy reaching 92% for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 2000, null],
    ['re-spelling kept: "cat" for "cut" is still a tolerant cut', 'How do you cut hallucinations in a rag answer without just making', 'How do you cat', 'in a rag answer without just making it refuse?', 1547, ['hallucinations']],
    ['first letter differs: "put" for "cut" is no cut (the only case for this rule: synthetic)', 'How do you cut hallucinations in a rag answer without just making', 'How do you put', 'in a rag answer without just making it refuse?', 1547, null],
    ['digit rule pinned: "version two" -> "v2" shares its first letter and is shorter, only the digit refuses it (v3 restored "two"; every digit cut in the data also fails the first-letter rule)', 'the version two release shipped last week', 'The v2', 'release shipped last week.', 2000, null],
    ['module alone on ASCII Indonesian text restores "menangani": only the adapter\'s English gate stops it (the adapter test\'s case)', 'bagaimana cara anda menangani data yang hilang di pipeline', 'Bagaimana cara Anda', 'data yang hilang di pipeline?', 2000, ['menangani']],
    ['seam S2Q07 tolerant re-spelling "RAC" -> "Rag" still restores "service"', 'Design a multi tenant RAC service over', 'Design a multi tenant Rag', 'over 10,000,000 documents, it has to support document updates', 3190, ['service']],
    ['alignment guard: "İzmir" lowercases to "i" + "zmir" (v3: "zmir projesinde" inserted)', 'Peki İzmir projesinde hangi veritabanını seçtiniz', 'Peki', 'projesinde hangi veritabanını seçtiniz?', 2000, null],
    ['non-ASCII guard (review M2): a lost "résumé" is not restored as "r sum" (v3 did)', 'tell me about your résumé and your last role', 'Tell me about your', 'and your last role.', 2000, null],
    // The same word with DECOMPOSED accents (e + U+0301, a combining mark, not a letter): the guard must match \p{M} too,
    // or tok() splits it into "re" + "sume" and the module restores "re sume" (Task 3 re-review). The \u0301 escapes
    // are kept literally in this source on purpose.
    ['non-ASCII guard covers combining marks: a lost decomposed "re\u0301sume\u0301" is not restored as "re sume"', 'tell me about your re\u0301sume\u0301 and your last role', 'Tell me about your', 'and your last role.', 2000, null],
    ['pause: clear() between F1 and F2 (empty final / UtteranceEnd)', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547, null, { clearBetween: true }],
    ['pause: speech_final on F1 leaves no cut', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547, null, { sfF1: true }],
    ['speech_final on F2 does not stop the repair', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547, ['hallucinations'], { sfF2: true }],
    ['pause: clear() after an interim, before its final, forgets the interim too: F1 is no cut of it', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547, null, { clearAfterInterim: true }],
    ['window: F2 exactly 5000 ms after F1 is repaired', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 5000, ['hallucinations']],
    ['window: F2 at 5001 ms is not', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 5001, null],
];
function runProbes(make, quiet = false) {
    let bad = 0;
    for (const [label, I, F1, F2, gap, expected, opts] of PROBES) {
        const out = probe(make, I, F1, F2, gap, opts ?? {});
        const ok = JSON.stringify(out.restored ?? null) === JSON.stringify(expected);
        if (!ok) bad++;
        if (!quiet) verdict(ok, `probe: ${label}`, `${out.restored ? `restored ${JSON.stringify(out.restored)}` : 'unchanged'}: ${JSON.stringify(out.text.slice(0, 60))}`);
    }
    return bad;
}
console.log(`\n== the spec reviews' probe inputs and v4's edges, on ${candidateName} ==`);
runProbes(candidate);
// Shapes both reviews listed that v4 still accepts, or that no log shows. Reported, not checked.
for (const [label, I, F1, F2] of [
    ['INFO residual: shorter symbol merge "Q and A" -> "Q&A" (0 "&"-joined words in the data; no guard)', 'we will do a Q and A session on friday', 'We will do a Q&A', 'session on Friday.'],
    ['INFO stutter "the the"', "what's the the latency budget", "What's the", 'latency budget for this endpoint?'],
    ['INFO filler "um" (only if interims keep what finals drop — unmeasured)', 'so how would you um scale the service', 'So how would you', 'scale the service?'],
]) { const out = probe(candidate, I, F1, F2); console.log(`${label}: ${out.restored ? `restored ${JSON.stringify(out.restored)}` : 'unchanged'}: ${JSON.stringify(out.text)}`); }
// The reviews' Spanish and Russian probes hold non-ASCII letters, so the module's own guard refuses them; the case
// only the adapter's English gate stops is unaccented text (the Indonesian probe above, restored "menangani").
// A documented residual (Task 3 review): an interim that already shows the digits, "... 92 percent for each",
// before a smart_format final "... 92%." is a STRICT cut (F1's tokens are a prefix), so the re-spelling test
// never runs and "percent" is restored. Counted below: interims with digits followed by "percent" vs "%".
for (const [label, I, F1, F2] of [
    ['INFO module alone on Spanish: refused by the non-ASCII guard (and gated off in the adapter)', 'Cuéntame sobre la migración de datos que hiciste', 'Cuéntame sobre la', 'de datos que hiciste?'],
    ['INFO residual: strict cut "92 percent for each" -> "92%." restores "percent" (no interim in the data spells "percent" after digits)', 'accuracy reaching 92 percent for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,'],
]) { const out = probe(candidate, I, F1, F2); console.log(`${label}: ${out.restored ? `restored ${JSON.stringify(out.restored)}` : 'unchanged'}: ${JSON.stringify(out.text)}`); }

// ---- what each tolerant refusal costs on the data: tolerant (v3) cuts refused by v4, attributed to the first
// rule that refuses them, NON-HOLDOUT (the evidence) and holdout (reported, not used) separately; and whether
// v3 repaired the next final after them (0 by the data check above).
{
    const tokv = v4.tok, rawTok = (s) => String(s).replace(/(\d),(\d)/g, '$1$2').match(/[A-Za-z0-9']+/g) ?? [];
    // Attribution order = the rule's own test order (digit, longer, first letter) then the interim guard. The
    // reference's alignment line (rawTok/tok count) is unreachable once the non-ASCII guard holds, so it has no
    // bucket: with ASCII letters only, both tokenisers split the text identically.
    const tally = () => ({ v3: 0, kept: 0, refused: { digit: [], longer: [], 'first letter': [], 'non-ASCII': [] }, keptPairs: new Map() });
    const T = { evidence: tally(), holdout: tally() };
    let digitAlsoFirstLetter = 0, digitTotal = 0;
    for (const s of streams) {
        const t = s.kind === 'holdout' ? T.holdout : T.evidence;
        let lastInterim = null;
        for (const e of s.ev) {
            if (e.utteranceEnd || !e.text) continue;
            if (!e.isFinal) { lastInterim = e.text; continue; }
            if (lastInterim) {
                const iw = tokv(lastInterim), fw = tokv(e.text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (tolerant) {
                        t.v3++;
                        const last = fw[fw.length - 1], atPos = iw[fw.length - 1];
                        const why = /\d/.test(last) ? 'digit' : last.length > atPos.length ? 'longer' : last[0] !== atPos[0] ? 'first letter' : v4.NON_ASCII_LETTER.test(lastInterim) ? 'non-ASCII' : null;
                        if (why === 'digit' && last[0] !== atPos[0]) digitAlsoFirstLetter++;
                        if (why === 'digit') digitTotal++;
                        if (why) t.refused[why].push(`"${atPos}" -> "${last}" (${s.name.slice(0, 22)})`);
                        else { t.kept++; const k = `"${atPos}" -> "${last}"`; t.keptPairs.set(k, (t.keptPairs.get(k) ?? 0) + 1); }
                    }
                }
            }
            lastInterim = null;
        }
    }
    for (const [name, t] of [['NON-HOLDOUT logs + seam (the evidence)', T.evidence], ['holdout (reported, not used for any choice)', T.holdout]]) {
        const r = t.refused;
        console.log(`\nINFO tolerant cuts, ${name}: v3 ${t.v3}, v4 keeps ${t.kept}; refused by digit ${r.digit.length}, longer ${r.longer.length}, first letter ${r['first letter'].length}, non-ASCII ${r['non-ASCII'].length} (first refusing rule named, in the rule's own order; none of the refused cuts was followed by a repair — the data check above)`);
        for (const [k, v] of Object.entries(r)) if (v.length) console.log(`  ${k}: ${v.join('; ')}`);
        console.log(`  kept (interim token -> F1's last token, x count): ${[...t.keptPairs.entries()].map(([k, n]) => `${k} x${n}`).join('; ') || '(none)'}`);
    }
    console.log(`INFO digit-refused cuts that ALSO fail the first-letter rule: ${digitAlsoFirstLetter} of ${digitTotal} (a spelled number never starts with a digit, so the "1 digit, 0 first letter" split only reflects check order; the digit rule alone is pinned by the synthetic "version two" -> "v2" probe)`);
}
// ---- scope of the pause evidence (review M4) and of the ASCII guard (review M2)
{
    const withUE = perLog.filter((x) => x.ue > 0);
    const repairsIn = (pred) => streams.filter((s) => s.kind === 'other' && pred(s.name)).reduce((n, s) => n + runV3(s.ev).filter(Boolean).length, 0);
    const ueNames = new Set(withUE.map((x) => x.dir));
    console.log(`\nINFO utterance-end lines: ${withUE.length} of ${perLog.length} logs carry them (listener since 2026-09-09); ${repairsIn((n) => ueNames.has(n))} of ${EXPECTED.other} non-holdout repairs are in those logs; speech_final is never logged (unmeasured on the app's audio path; only a seam probe records it)`);
    const n = perLog.map((x) => x.empties).sort((a, b) => a - b);
    console.log(`INFO empty finals per run log: min ${n[0]}, median ${n[Math.floor(n.length / 2)]}, max ${n[n.length - 1]} (${n.length} logs; h40c ${perLog.find((x) => /h40c/.test(x.dir))?.empties})`);
    const counts = { logs: { nonAscii: 0, amp: 0, texts: 0, interims: 0, digitPercent: 0, digitSign: 0 }, seam: { nonAscii: 0, amp: 0, texts: 0, interims: 0, digitPercent: 0, digitSign: 0 } };
    for (const s of streams) for (const e of s.ev) {
        if (e.utteranceEnd || !e.text) continue;
        const c = s.kind === 'seam' ? counts.seam : counts.logs;
        c.texts++;
        if (v4.NON_ASCII_LETTER.test(e.text)) c.nonAscii++;
        if (/[A-Za-z0-9]&[A-Za-z0-9]/.test(e.text)) c.amp++;
        if (!e.isFinal) { c.interims++; if (/\d\s+percent\b/i.test(e.text)) c.digitPercent++; if (/\d%/.test(e.text)) c.digitSign++; }
    }
    verdict(counts.logs.nonAscii === 0 && counts.seam.nonAscii === 0, 'ASCII guard scope: no interim or final with a non-ASCII letter in the English logs or the seam recordings', `logs ${counts.logs.nonAscii} of ${counts.logs.texts} texts, seam ${counts.seam.nonAscii} of ${counts.seam.texts}; "&"-joined words: logs ${counts.logs.amp}, seam ${counts.seam.amp}`);
    console.log(`INFO residual scope: interims spelling "percent" after digits: logs ${counts.logs.digitPercent} of ${counts.logs.interims}, seam ${counts.seam.digitPercent} of ${counts.seam.interims}; interims already showing "<digit>%": logs ${counts.logs.digitSign}, seam ${counts.seam.digitSign}`);
}

// ---- calibration: the checks must FAIL against rule-v3 (probes) and against a pass-through (data) ----------
console.log('\n== calibration (these two must FAIL) ==');
{
    const bad = runProbes(v3.createRepair, true);
    verdict(bad > 0, `calibration: the probe checks run against rule-v3 FAIL ${bad} of ${PROBES.length} (as they must; v3 inserts "two percent", "five", "percent", "right", "horizontally", "even", "two", "zmir projesinde", "r sum", "re sume" and ignores pauses; the window pair and the Indonesian case it shares with v4)`);
}
{
    const r = compare('pass-through', runV3, (ev) => runV4(ev, {}, passThrough), EXPECTED, false);
    verdict(!r.ok, 'calibration: the data check run against a pass-through FAILs (as it must)', r.line);
}

if (modulePath) console.log(`\n${failures === 0 ? `EQUIVALENT: ${candidateName} == rule-v4.mjs on every recorded event, all 45 fixtures and all ${PROBES.length} probes` : `NOT EQUIVALENT: ${candidateName} fails ${failures} check(s) against rule-v4.mjs`}`);
console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures ? 1 : 0);
