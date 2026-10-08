// Calibration for chain-diff.cjs: the same comparison must report a DIFFERENCE on the two shapes
// the cue build changes on purpose (a cue block at the head; an offers block before the answer),
// and none on a plain answer. Read-only, no network.
const path = require('path');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const O = require(path.join(MAIN, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const N = require(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const cut = (t, size) => { const o = []; for (let i = 0; i < t.length; i += size) o.push(t.slice(i, i + size)); return o; };
async function* src(chunks) { for (const c of chunks) yield c; }
async function oldChain(chunks) { let offers = null, out = ''; for await (const p of O.stripSpokenNotation(O.stripSuggestionBlock(O.filterVerbalLines(O.filterCodeFences(src(chunks))), (o) => { offers = o; }))) out += p; return { out, offers }; }
async function newChain(chunks) { let offers = null, cues = null, out = ''; for await (const p of N.stripSpokenNotation(N.stripSuggestionBlock(N.filterVerbalLines(N.filterCodeFences(N.stripCueBlock(src(chunks), (c) => { cues = c; }))), (o) => { offers = o; }))) out += p; return { out, offers, cues }; }
(async () => {
    console.warn = () => {};
    const cases = [
        ['plain answer (expect same)', 'Ten million vectors take about thirty gigabytes.\n__MORE__\n1| GPU pools\n'],
        ['cue block at the head (expect DIFF)', '__CUES__\n1| thirty gigabytes\nTen million vectors take about thirty gigabytes.'],
        ['offers before the answer (expect DIFF)', '__MORE__\n1| GPU pools\n\nTen million vectors take about thirty gigabytes.'],
        ['only prose dropped by the line filter before the offers (expect DIFF: now shown)', 'Time: O(n)\n__MORE__\n1| GPU pools\nMore text after it.'],
        ['a second __CUES__ line closing the block (known edge: shown)', '__CUES__\n1| a\n__CUES__\nTen million.'],
    ];
    for (const [name, t] of cases) {
        const res = [];
        for (const size of [1, 4, 1000]) {
            const a = await oldChain(cut(t, size)), b = await newChain(cut(t, size));
            const same = a.out === b.out && JSON.stringify(a.offers) === JSON.stringify(b.offers);
            res.push(`${size}:${same ? 'same' : 'DIFF'} new=${JSON.stringify(b.out.trim()).slice(0, 60)} cues=${JSON.stringify(b.cues)}`);
        }
        console.log(`${name}\n   ${res.join('\n   ')}`);
    }
})();
