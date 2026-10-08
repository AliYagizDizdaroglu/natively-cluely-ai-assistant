// ET10: turn a run's event log into per-item answers + timing, per PREREGISTER-et10.md (amendment 1).
// The answer starts at the first turn of >= answerWords words or a system-error message (if there is none, the
// last turn is the answer); the turns before it are holding lines. Output that arrived before the question's
// last audio chunk is dropped. The answer goes through the app's own filter chain (the one
// interview60.answers.mjs runs on the offline twins), loaded from MAIN's built dist.
//   node et-extract.mjs runs/et10-low.json   -> runs/et10-low.answers.json
import fs from 'node:fs';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require = createRequire(`${MAIN}/package.json`);
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences } =
    require(`${MAIN}/dist-electron/electron/llm/verbalStreamFilter.js`);
const file = process.argv[2];
const R = JSON.parse(fs.readFileSync(file, 'utf8'));
const ANSWER_WORDS = R.answerWords;
if (typeof ANSWER_WORDS !== 'number') throw new Error(`${file}: no answerWords — a run from before amendment 1`);
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const isError = (s) => /system error/i.test(s);

async function appFilter(chunks) {
    async function* gen() { for (const c of chunks) yield c; }
    let spoken = '';
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(gen())), () => {}))) spoken += p;
    return spoken.trim();
}

const out = {};
for (const id of R.pairs.flat()) {
    const ev = R.events.filter((e) => e.item === id);
    if (!ev.some((e) => e.kind === 'clipEnd')) { out[id] = { played: false }; continue; }
    // Turns in arrival order, closed by turnComplete / interrupted.
    const turns = [];
    let cur = null;
    for (const e of ev) {
        if (e.kind === 'outputTx') {
            if (!cur) cur = { atMs: e.sinceClipEnd, premature: e.sinceClipEnd == null, chunks: [], endMs: null };
            cur.chunks.push(e.text); cur.endMs = e.sinceClipEnd;
        }
        if ((e.kind === 'turnComplete' || e.kind === 'interrupted') && cur) { cur.how = e.kind; turns.push(cur); cur = null; }
    }
    if (cur) { cur.how = 'open'; turns.push(cur); }
    for (const t of turns) { t.text = t.chunks.join(''); t.words = words(t.text); }
    const after = turns.filter((t) => !t.premature);
    let first = after.findIndex((t) => t.words >= ANSWER_WORDS || isError(t.text));
    if (first < 0) first = after.length - 1; // no answer-length turn: the last turn is the answer (-1 if none)
    const holding = first < 0 ? [] : after.slice(0, first);
    const answerTurns = first < 0 ? [] : after.slice(first);
    // Join turns with a space: a turn boundary carries no whitespace of its own.
    const chunks = answerTurns.flatMap((t, i) => (i === 0 ? t.chunks : [' ', ...t.chunks]));
    const raw = chunks.join('').trim();
    const usage = ev.filter((e) => e.kind === 'usage');
    out[id] = {
        played: true,
        heard: ev.filter((e) => e.kind === 'inputTx').map((e) => e.text).join('').trim(),
        premature: turns.filter((t) => t.premature).map((t) => t.text),
        holding: holding.map((t) => ({ atMs: t.atMs, text: t.text.trim() })),
        ttftMs: answerTurns[0]?.atMs ?? null,
        lastWordMs: answerTurns.length ? answerTurns[answerTurns.length - 1].endMs : null,
        systemError: answerTurns.some((t) => isError(t.text)),
        empty: !raw,
        cap: ev.some((e) => e.kind === 'cap'),
        thoughts: usage.reduce((s, u) => s + (u.thoughts ?? 0), 0),
        rawAnswer: raw,
        answer: await appFilter(chunks),
        turns: turns.map((t) => ({ atMs: t.atMs, endMs: t.endMs, words: t.words, how: t.how, premature: t.premature, text: t.text.trim().slice(0, 80) })),
    };
    out[id].words = words(out[id].answer);
}
const dest = file.replace(/\.json$/, '.answers.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
for (const [id, a] of Object.entries(out)) {
    if (!a.played) { console.log(`${id.padEnd(7)} NOT PLAYED`); continue; }
    const hold = a.holding.length ? `hold ${(a.holding[0].atMs / 1000).toFixed(1)}s "${a.holding.map((h) => h.text).join(' | ').slice(0, 40)}"` : 'no hold';
    console.log(`${id.padEnd(7)} ttft ${a.ttftMs == null ? '   -  ' : (a.ttftMs / 1000).toFixed(1).padStart(5) + 's'}  last ${a.lastWordMs == null ? '  -  ' : (a.lastWordMs / 1000).toFixed(1).padStart(5) + 's'}  words ${String(a.words).padStart(3)}  thoughts ${String(a.thoughts).padStart(5)}${a.systemError ? '  SYSTEM-ERROR' : ''}${a.empty ? '  EMPTY' : ''}${a.cap ? '  CAP' : ''}${a.premature.length ? `  premature ${JSON.stringify(a.premature)}` : ''}  ${hold}`);
}
console.log(`wrote ${dest}`);
