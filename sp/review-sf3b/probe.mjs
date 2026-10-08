// Re-review probe: OLD (HEAD) vs NEW (working tree) cutAtWordBudget, through the app chain's order.
// Builds to this folder only; MAIN untouched. Prints counts/records, never captured reply text.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/review-sf3b';
const M = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
fs.mkdirSync(HERE + '/old', { recursive: true }); fs.mkdirSync(HERE + '/new', { recursive: true });
fs.writeFileSync(HERE + '/old/verbalStreamFilter.ts', execFileSync('git', ['-C', M, 'show', 'HEAD:electron/llm/verbalStreamFilter.ts']));
fs.copyFileSync(M + '/electron/llm/verbalStreamFilter.ts', HERE + '/new/verbalStreamFilter.ts');
const { build } = createRequire(M + '/package.json')('esbuild');
for (const v of ['old', 'new']) await build({ entryPoints: [`${HERE}/${v}/verbalStreamFilter.ts`], outfile: `${HERE}/${v}/vsf.cjs`, bundle: false, platform: 'node', target: 'node20', format: 'cjs', absWorkingDir: HERE });
const req = createRequire(import.meta.url);
const OLD = req(HERE + '/old/vsf.cjs'), NEW = req(HERE + '/new/vsf.cjs');
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();
const split = (t, n) => { const o = []; for (let i = 0; i < t.length; i += n) o.push(t.slice(i, i + n)); return o; };
const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const LONG = [1, 2, 3, 4, 5, 6].map((i) => sentence(46, i)).join(' ');
const J = JSON.stringify;
const quiet = async (f) => { const w = console.warn; console.warn = () => {}; try { return await f(); } finally { console.warn = w; } };
// full chain (as WhatToAnswerLLM minus the private sentinel strip / fallback / naming wrappers)
async function chain(F, chunks) {
    return quiet(async () => {
        let out = '', done = null, n = 0; const seen = [];
        const g = F.cutAtWordBudget(F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(chunks), () => {}))), () => {})), { ...F.SPOKEN_WORD_GUARD, onDone: (r) => { done = r; n++; } });
        for await (const c of g) { out += c; seen.push(c); }
        return { out, done, n, seen };
    });
}
// stage alone (cutAtWordBudget over the given chunks)
async function stage(F, chunks) {
    let out = '', done = null, n = 0; const seen = [];
    for await (const c of F.cutAtWordBudget(agen(chunks), { ...F.SPOKEN_WORD_GUARD, onDone: (r) => { done = r; n++; } })) { out += c; seen.push(c); }
    return { out, done, n, seen };
}
const wc = (s) => (s.match(/\S+/g) ?? []).length;
const parses = (s) => { try { JSON.parse(s); return true; } catch { return false; } };
const SIZES = [1, 2, 3, 9, 1e6];
const lbl = (s) => (s === 1e6 ? 'whole' : s);

console.log('== (1a) spoken openers through the full chain (stripSpokenNotation first)');
for (const lead of ['{} is the empty dict. ', '{x} is a set. ', '`{}` is the empty dict. ', '**{a, b}** is a set. ']) {
    // what does the chain turn the opener into?
    const head = (await chain(NEW, [lead])).out;
    for (const s of SIZES) {
        const o = await chain(OLD, split(lead + LONG, s)), n = await chain(NEW, split(lead + LONG, s));
        console.log(`${J(lead.slice(0, 10))} -> chain head ${J(head.slice(0, 8))} @${lbl(s)}: OLD ${J(o.done)} | NEW ${J(n.done)} wc(out)=${wc(n.out)} n=${n.n} sameAsOld=${o.out === n.out}`);
    }
}
console.log('\n== (1b) >200-word card through the full chain');
const card = J({ __negotiationCoaching: { tacticalNote: 'x', exactScript: LONG, n: '$135,000 "base"\nok', isNegotiationCoaching: true } });
console.log(`card words ${wc(card)}, starts ${J(card.slice(0, 3))}`);
for (const s of SIZES) {
    const o = await chain(OLD, split(card, s)), n = await chain(NEW, split(card, s));
    console.log(`card @${lbl(s)}: OLD parses ${parses(o.out)} ${J(o.done)} | NEW parses ${parses(n.out)} identical ${n.out === card} ${J(n.done)} n=${n.n}`);
}
console.log('\n== (1c) stage-level edge cases (NEW; OLD for contrast)');
const cases = {
    'blank-led card': [' ', '\n', ...split(card, 7)],
    'sentinel then card': ['__model_source:gemini-3.5-flash-lite (hedge)__', ...split(card, 5)],
    'blank, sentinel, then speech': [' ', '__model_source:x (fallback)__', 'So the answer is yes. ' + LONG],
    'lone {': ['{'],
    'blank then lone {': ['  ', '{', '\n'],
    '{ then " split': ['{', '"', ...split(card.slice(2), 11)],
    '{ then blank then "': ['{', ' ', '"a":1}'],
    '{ " (space after brace) + long speech-like': ['{ "', 'a" ' + LONG],
    'empty stream': [],
    'only empty strings': ['', '', ''],
    '{} then long speech @1': split('{} is empty. ' + LONG, 1),
    '{" spoken (the residual)': split('{"a": 1} is a dict. ' + LONG, 4),
};
for (const [k, ch] of Object.entries(cases)) {
    const o = await stage(OLD, ch), n = await stage(NEW, ch);
    console.log(`${k}: NEW out=${n.out.length}ch sameAsInput=${n.out === ch.join('')} sameAsOld=${o.out === n.out} parses=${parses(n.out.replace(/__model_source:[^_]*__/g, ''))} done=${J(n.done)} n=${n.n} chunks=${n.seen.length} first=${J((n.seen[0] ?? '').slice(0, 14))} | OLD done=${J(o.done)}`);
}
console.log('\nJSON.stringify object prefixes:', [{}, { a: 1 }, { __negotiationCoaching: null }].map((x) => J(J(x).slice(0, 2))).join(' '));

console.log('\n== (2) early consumer stop: onDone must NOT fire');
for (const [k, ch] of Object.entries({ speech: split('Hello there. ' + LONG, 3), card: split(card, 3), heldOnly: [' ', '{'] })) {
    let n = 0; const g = NEW.cutAtWordBudget(agen(ch), { ...NEW.SPOKEN_WORD_GUARD, onDone: () => { n++; } });
    let got = 0; for await (const _ of g) { if (++got === 2) break; }
    console.log(`${k}: consumed ${got}, onDone fired ${n} (expect 0)`);
}
console.log('\n== (2b) source throws after a held chunk');
for (const [k, pre] of Object.entries({ blank: [' '], brace: ['{'], speech: ['Hi.'] })) {
    for (const F of [OLD, NEW]) {
        const src = (async function* () { for (const c of pre) yield c; throw new Error('boom'); })();
        let out = '', n = 0, err = null;
        try { for await (const c of F.cutAtWordBudget(src, { ...F.SPOKEN_WORD_GUARD, onDone: () => { n++; } })) out += c; } catch (e) { err = e.message; }
        console.log(`${k} ${F === OLD ? 'OLD' : 'NEW'}: out ${J(out)} err ${err} onDone ${n}`);
    }
}
