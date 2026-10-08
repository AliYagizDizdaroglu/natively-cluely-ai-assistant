// Review probe: where does the "first non-blank char is {" rule decide differently in cutAtWordBudget
// than in stripSpokenNotation, and what happens to a long spoken answer then. Uses the implementer's builds.
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sidefix3/build';
const OLD = require(B + '/old/verbalStreamFilter.cjs');
const NEW = require(B + '/new/verbalStreamFilter.cjs');
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();
const cut = (t, n) => { const o = []; for (let i = 0; i < t.length; i += n) o.push(t.slice(i, i + n)); return o; };
const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const LONG = [1, 2, 3, 4, 5, 6].map((i) => sentence(46, i)).join(' ');
async function chain(F, chunks) {
    let done = null, out = '';
    const w = console.warn; console.warn = () => {};
    const g = F.cutAtWordBudget(F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(chunks), () => {}))), () => {})), { ...F.SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } });
    for await (const c of g) out += c;
    console.warn = w;
    return { words: (out.match(/\S+/g) ?? []).length, done: JSON.stringify(done), head: JSON.stringify(out.slice(0, 40)) };
}
const cases = {
    'calib: plain long answer': 'So the answer is simple. ' + LONG,
    'calib: { first': '{x} is the set. ' + LONG,
    'backtick {}': '`{}` is the empty dict literal in Python. ' + LONG,
    'bold {': '**{a, b}** is a set literal. ' + LONG,
    'cue block then {': '__CUES__\n1| one\n2| two\n{} is empty. ' + LONG,
    'sentinel-like chunk first': null,
};
for (const [k, t] of Object.entries(cases)) {
    if (t === null) continue;
    for (const size of [1, 3, 1e6]) {
        const o = await chain(OLD, cut(t, size)), n = await chain(NEW, cut(t, size));
        console.log(`${k} @${size === 1e6 ? 'whole' : size}: OLD words ${o.words} ${o.done} | NEW words ${n.words} ${n.done} head ${n.head}`);
    }
}
// Sentinel then payload, as withVerbalFallback / nameStallSwitch inject them inside the chain.
const card = JSON.stringify({ __negotiationCoaching: { exactScript: LONG } });
for (const head of ['__model_source:gemini-3.1-flash-lite (fallback)__', '__model_source:gemini-3.5-flash-lite (hedge)__']) {
    let out = '', done = null;
    for await (const c of NEW.cutAtWordBudget(agen([head, card]), { ...NEW.SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
    console.log(`sentinel ${JSON.stringify(head)} then card: parses ${(() => { try { JSON.parse(out.slice(head.length)); return true; } catch { return false; } })()} ${JSON.stringify(done)}`);
}
// How many saved replies start with a backtick, '*', or '$' then '{' (the cleanNotation-exposed case)?
const CG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/cue-group';
let n = 0, lead = 0, braceAfterClean = 0;
if (fs.existsSync(CG)) for (const f of fs.readdirSync(CG).filter((f) => /^(spike\d*|repro-blockonly)-.*\.json$/.test(f))) {
    const d = JSON.parse(fs.readFileSync(path.join(CG, f), 'utf8'));
    for (const x of (Array.isArray(d) ? d : Object.values(d))) if (typeof x?.raw === 'string' && x.raw.trim()) {
        n++;
        if (/^[`*$\\]/.test(x.raw.trimStart())) lead++;
    }
}
console.log(`saved replies ${n}; starting with a backtick/star/dollar/backslash: ${lead}`);
