// Counts only: replay rows through the pre-budget chain; how often the first chunk reaching cutAtWordBudget is blank or "{"
// (that is the exposure of the hold: tapFirstToken's first-token time moves to the first non-blank chunk), and OLD vs NEW equality.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/review-sf3b';
const CG = path.join(HERE, '..', 'cue-group');
const req = createRequire(import.meta.url);
const OLD = req(HERE + '/old/vsf.cjs'), NEW = req(HERE + '/new/vsf.cjs');
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();
const split = (t, n) => { const o = []; for (let i = 0; i < t.length; i += n) o.push(t.slice(i, i + n)); return o; };
const pre = (F, chunks) => F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(chunks), () => {}))), () => {}));
const rows = [];
for (const f of fs.readdirSync(CG).filter((f) => /^(spike\d*|repro-blockonly)-.*\.json$/.test(f))) {
    const d = JSON.parse(fs.readFileSync(path.join(CG, f), 'utf8'));
    for (const x of (Array.isArray(d) ? d : Object.values(d))) if (typeof x?.raw === 'string' && x.raw.trim()) rows.push(x.raw);
}
const w = console.warn; console.warn = () => {};
const res = { rows: rows.length };
for (const s of [1, 3, 1e6]) {
    let firstBlank = 0, firstBrace = 0, diff = 0, startsBraceQuote = 0;
    for (const raw of rows) {
        const chunks = []; for await (const c of pre(NEW, split(raw, s))) chunks.push(c);
        const firstNonEmpty = chunks.find((c) => c.length > 0) ?? '';
        if (firstNonEmpty.trim() === '') firstBlank++;
        if (firstNonEmpty.trim() === '{') firstBrace++;
        if (chunks.join('').trimStart().startsWith('{"')) startsBraceQuote++;
        const run = async (F) => { let o = '', d = null; for await (const c of F.cutAtWordBudget(agen(chunks), { ...F.SPOKEN_WORD_GUARD, onDone: (r) => { d = r; } })) o += c; return o + JSON.stringify(d); };
        if ((await run(OLD)) !== (await run(NEW))) diff++;
    }
    res[`@${s === 1e6 ? 'whole' : s}`] = { firstChunkBlank: firstBlank, firstChunkLoneBrace: firstBrace, outputStartsWithBraceQuote: startsBraceQuote, oldNewDiffer: diff };
}
console.warn = w;
// what a blank-led raw stream looks like after the chain
const c2 = []; for await (const c of pre(NEW, ['\n', '\n', ' ', 'Hello there.', ' More.'])) c2.push(c);
res.blankLedRawAfterChain = c2.map((c) => JSON.stringify(c)).join(',');
const c3 = []; for await (const c of pre(NEW, split('{"a": 1} is a dict literal. More words.', 3))) c3.push(c);
res.braceQuoteSpokenAfterChain_startsWith = JSON.stringify(c3.join('').slice(0, 4));
console.log(JSON.stringify(res, null, 1));
