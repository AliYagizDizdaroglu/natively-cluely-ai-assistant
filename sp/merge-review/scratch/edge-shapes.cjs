// Throwaway, read-only: what the cue build's chain SHOWS for block shapes the parser does not
// recognise (synthetic text, no model call). Prints the shown text and the cues per shape.
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const N = require(MAIN + '/.claude/worktrees/whole-turn/dist-electron/electron/llm/verbalStreamFilter.js');
const cut = (t, size) => { const o = []; for (let i = 0; i < t.length; i += size) o.push(t.slice(i, i + size)); return o; };
async function* src(chunks) { for (const c of chunks) yield c; }
async function chain(text, size) {
    let cues = null, offers = null, out = '';
    for await (const p of N.stripSpokenNotation(N.stripSuggestionBlock(N.filterVerbalLines(N.filterCodeFences(N.stripCueBlock(src(cut(text, size)), (c) => { cues = c; }))), (o) => { offers = o; }))) out += p;
    return { out: out.trim(), cues, offers };
}
(async () => {
    console.warn = () => {};
    const shapes = [
        ['shipped shape', '__CUES__\n1| Spaces\nSpaces, because the formatter enforces it.'],
        ['offers BEFORE the cue block', '__MORE__\n1| an offer\n__CUES__\n1| Spaces\nSpaces, because the formatter enforces it.'],
        ['one preamble line before the sentinel', 'Sure.\n__CUES__\n1| Spaces\nSpaces, because the formatter enforces it.'],
        ['bold sentinel', '**__CUES__**\n1| Spaces\nSpaces, because the formatter enforces it.'],
        ['sentinel with a colon', '__CUES__:\n1| Spaces\nSpaces, because the formatter enforces it.'],
        ['bare bar line (M7 of the final review)', '__CUES__\n1|\n2| Consistency\nSpaces, because the formatter enforces it.'],
        ['dot-numbered cues', '__CUES__\n1. Spaces\nSpaces, because the formatter enforces it.'],
        ['block only', '__CUES__\n1| Spaces\n'],
    ];
    for (const [name, t] of shapes) {
        const a = await chain(t, 1), b = await chain(t, 1000);
        const same = a.out === b.out && JSON.stringify(a.cues) === JSON.stringify(b.cues);
        console.log(`${name}: cues=${JSON.stringify(b.cues)} shown=${JSON.stringify(b.out)}${same ? '' : '  (differs by chunking!)'}`);
    }
})();
