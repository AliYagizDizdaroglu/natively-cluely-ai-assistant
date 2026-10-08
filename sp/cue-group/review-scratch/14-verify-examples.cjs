// Final check of the facts the review quotes. Read-only.
// (1) The I1 example: chunks ['__CUES__\n1| a\n', '1|\r1'] through today's built parser and through the plan's.
// (2) The code points on lines 22 and 36 of the controller's fable-revision-1.md (are the line separators literal?).
// (3) The first-token numbers of the afternoon run (diag lines inside the debug log's window): median and p90, counts only.
const fs = require('node:fs');
const path = require('node:path');
const { built, stripCueBlockNew } = require('./model.cjs');
const CR = String.fromCharCode(13);

async function run(impl, chunks, opts) {
    let cues = null, calls = 0; const out = [];
    async function* source() { for (const c of chunks) yield c; }
    for await (const p of impl(source(), (x) => { cues = x; calls++; }, opts)) out.push(p);
    return { out, cues, calls };
}
const vis = (s) => JSON.stringify(s);

(async () => {
    const chunks = ['__CUES__\n1| a\n', '1|' + CR + '1'];
    const SPEC = /^\d+\s*(\|.*)?$/, WIDE = /^\d+\s*(\|\s*.*)?$/;
    console.log('(1) chunks ' + vis(chunks));
    console.log('    today (built):          ' + vis(await run(built.stripCueBlock, chunks)));
    console.log('    the plan (spec regex):  ' + vis(await run(stripCueBlockNew, chunks, { prefix: SPEC })));
    console.log('    the wide regex:         ' + vis(await run(stripCueBlockNew, chunks, { prefix: WIDE })));
    console.log('    extractCues (whole):    ' + vis(built.extractCues(chunks.join(''))));

    const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
    const rev = fs.readFileSync(path.join(WT, '.superpowers/sdd/2026-09-30-cue-early-close/fable-revision-1.md'), 'utf8').split('\n');
    console.log('(2) fable-revision-1.md: ' + rev.length + ' lines by LF');
    rev.forEach((line, i) => {
        const odd = [...line].filter((ch) => { const c = ch.codePointAt(0); return c === 0x2028 || c === 0x2029 || c === 0x0b || c === 0x0c || c === 0x85; });
        if (odd.length) console.log('    line ' + (i + 1) + ': ' + odd.map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
    });
    // The Read tool splits on these characters too, so its line numbers can differ from an LF count: report both.
    const all = fs.readFileSync(path.join(WT, '.superpowers/sdd/2026-09-30-cue-early-close/fable-revision-1.md'), 'utf8');
    const n2028 = (all.match(new RegExp(String.fromCharCode(0x2028), 'g')) || []).length;
    const n2029 = (all.match(new RegExp(String.fromCharCode(0x2029), 'g')) || []).length;
    console.log('    whole file: U+2028 x ' + n2028 + ', U+2029 x ' + n2029);
})();
