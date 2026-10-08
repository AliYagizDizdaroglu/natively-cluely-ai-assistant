// Task 5 review: hashes, HEAD diff of the extractor, old-vs-new parity on every non-holdout log,
// text hazards in the logs, and pairing probes. Read-only on MAIN.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const { finalsFrom } = await import(pathToFileURL(path.join(G, 'interview60.turns-finals.mjs')).href);

// 1. sizes + sha256 vs the review package
for (const [f, size, pre] of [['interview60.turns-fixture.mjs', 5470, 'cfd7c876'], ['interview60.turns-finals.mjs', 1592, '52e2cd63'], ['interview60.turns-finals.test.ts', 3793, 'fb02da7b']]) {
    const b = fs.readFileSync(path.join(G, f));
    const h = crypto.createHash('sha256').update(b).digest('hex');
    console.log(`${f}: ${b.length} B sha ${h.slice(0, 8)} CR=${b.includes(13)} -> ${b.length === size && h.startsWith(pre) ? 'MATCHES package' : 'DIFFERS from package'}`);
}
const head = spawnSync('git', ['-C', MAIN, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const oldX = spawnSync('git', ['-C', MAIN, 'show', 'HEAD:electron/test/golden/interview60.turns-fixture.mjs'], { encoding: 'utf8' }).stdout;
const newX = fs.readFileSync(path.join(G, 'interview60.turns-fixture.mjs'), 'utf8');
const a = oldX.split('\n'), b = newX.split('\n');
const removed = a.filter((l) => !b.includes(l)), added = b.filter((l) => !a.includes(l));
console.log(`HEAD ${head}: extractor lines removed ${removed.length}, added ${added.length}`);
for (const l of removed) console.log(`  - ${l}`);
for (const l of added) console.log(`  + ${l}`);

// 2. the old inline parse, verbatim from HEAD (checked below by substring)
const unq = (s) => JSON.parse(`"${s}"`);
const ts = (s) => Date.parse(s);
const OLD_SRC = 'const finals = [...dbg.matchAll(/^(\\S+) \\[LOG\\] \\[DeepgramStreaming\\] Transcript event — isFinal=true, text="((?:[^"\\\\]|\\\\.)*)"/gm)]\n    .map((m) => ({ at: ts(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= since);';
console.log(`old parse text found verbatim in HEAD's extractor: ${oldX.includes(OLD_SRC)}`);
const oldParse = (dbg, since) => [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= since);

// 3. every non-holdout run log: parity + hazards
const RUNS = path.join(G, 'interview60.runs');
const EV = /\[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="(.*)"\r?$/;
let logs = 0, withFinals = 0, finalsTotal = 0, diffs = 0, repairLines = 0, quoteTexts = 0, bsTexts = 0, emptyLiteral = 0, padded = 0, blankOnly = 0, atSince = 0, crlf = 0, holdoutSkipped = 0;
const quoteEx = [], bsEx = [], paddedEx = [];
for (const name of fs.readdirSync(RUNS).sort()) {
    if (name.includes('h40')) { holdoutSkipped++; continue; }
    const lf = path.join(RUNS, name, 'natively_debug.log');
    if (!fs.existsSync(lf)) continue;
    logs++;
    const dbg = fs.readFileSync(lf, 'utf8');
    if (dbg.includes('\r\n')) crlf++;
    const tlf = path.join(RUNS, name, 'interview60.timeline.json');
    const since = fs.existsSync(tlf) ? JSON.parse(fs.readFileSync(tlf, 'utf8')).startedMs - 2000 : null;
    for (const s of [0, since].filter((x) => x !== null)) {
        let o, n;
        try { o = JSON.stringify(oldParse(dbg, s)); } catch (e) { o = `THROW ${e.message}`; }
        try { n = JSON.stringify(finalsFrom(dbg, s)); } catch (e) { n = `THROW ${e.message}`; }
        if (o !== n) { diffs++; console.log(`  PARITY DIFF ${name} since=${s}`); }
    }
    const nf = finalsFrom(dbg, 0).length; finalsTotal += nf; if (nf) withFinals++;
    for (const line of dbg.split('\n')) {
        if (line.includes('boundary repair:')) repairLines++;
        const m = line.match(EV); if (!m) continue;
        const raw = m[2];
        if (raw.includes('"')) { quoteTexts++; if (quoteEx.length < 3) quoteEx.push(`${name}: ${raw.slice(0, 80)}`); }
        if (raw.includes('\\')) { bsTexts++; if (bsEx.length < 3) bsEx.push(`${name}: ${raw.slice(0, 80)}`); }
        if (m[1] === 'true') {
            if (raw === '(empty)') emptyLiteral++;
            if (raw !== raw.trim()) { padded++; if (!raw.trim()) blankOnly++; if (paddedEx.length < 3) paddedEx.push(`${name}: [${raw}]`); }
            if (since !== null && Date.parse(line.split(' ')[0]) === since) atSince++;
        }
    }
}
console.log(`non-holdout logs ${logs} (holdout skipped ${holdoutSkipped}), ${withFinals} with finals, ${finalsTotal} non-empty finals; old vs new parse differs in ${diffs} (since 0 and startedMs-2000)`);
console.log(`'boundary repair:' lines ${repairLines}; CRLF logs ${crlf}; Transcript texts with an inner quote ${quoteTexts}, with a backslash ${bsTexts}; finals logged as "(empty)" ${emptyLiteral}; whitespace-padded finals ${padded} (blank-only ${blankOnly}); finals at exactly since ${atSince}`);
for (const e of [...quoteEx, ...bsEx, ...paddedEx]) console.log(`  e.g. ${e}`);

// 4. pairing probes (T = a timestamp prefix)
const L = (t, rest) => `2026-09-29T11:00:0${t}.000Z [LOG] ${rest}`;
const FIN = (t, s) => L(t, `[DeepgramStreaming] Transcript event — isFinal=true, text="${s}"`);
const INT = (t, s) => L(t, `[DeepgramStreaming] Transcript event — isFinal=false, text="${s}"`);
const REP = (t, w, before) => L(t, `[DeepgramStreaming] boundary repair: restored "${w}" before "${before.slice(0, 40)}"`);
const OTHER = (t) => L(t, '[Main] turn: deepgram utterance-end vad=false');
const texts = (log) => { try { return JSON.stringify(finalsFrom(log, 0).map((f) => f.text)); } catch (e) { return `THROW ${e.message}`; } };
const probes = [
    ['repair directly after its final', [FIN(1, 'How do you cut'), FIN(2, 'in a rag answer'), REP(2, 'hallucinations', 'in a rag answer')], '["How do you cut","hallucinations in a rag answer"]'],
    ['repair after an interim (no final above)', [FIN(1, 'a b'), INT(2, 'c d'), REP(2, 'x', 'c d')], '["a b"]'],
    ['repair two lines after a final', [FIN(1, 'a b'), OTHER(2), REP(3, 'x', 'a b')], '["a b"]'],
    ['repair as the first line', [REP(1, 'x', 'a b'), FIN(2, 'a b')], '["a b"]'],
    ['final as the last line, no newline', [FIN(1, 'a b')], '["a b"]'],
    ['CRLF log with a repair', [FIN(1, 'a b'), REP(1, 'x', 'a b'), ''].join('\r\n'), '["x a b"]'],
    ['apostrophe + two restored words', [FIN(1, 'resume it'), REP(1, "don't stop", 'resume it')], '["don\'t stop resume it"]'],
    ['two repairs in a row after one final', [FIN(1, 'a b'), REP(1, 'x', 'a b'), REP(1, 'y', 'a b')], '["x a b"]'],
    ['repair adjacent but naming ANOTHER final', [FIN(1, 'first one'), REP(1, 'x', 'second one')], '(applied regardless)'],
    ['repair after an EMPTY final (impossible by construction)', [FIN(1, ''), REP(1, 'x', 'next')], '(phantom final)'],
];
for (const [name, lines, want] of probes) {
    const log = Array.isArray(lines) ? lines.join('\n') : lines;
    const got = texts(log);
    console.log(`probe: ${name}: ${got}${want.startsWith('(') ? `   ${want}` : got === want ? '   ok' : `   UNEXPECTED (want ${want})`}`);
}
