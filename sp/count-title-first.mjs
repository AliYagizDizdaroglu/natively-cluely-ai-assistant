// THROWAWAY: the calibration gate heard only the TITLE of S2Q01 and S2Q02 —
// "Explain your RAG pipeline precisely." and "Defend the improvements reported on
// your CV." Both are complete, well-formed questions on their own, so Live fires on
// them before the body arrives. How much of the roster has that shape?
import { pathToFileURL } from 'node:url';

const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const { SCENARIO50, wordsOf } = await import(pathToFileURL(G + 'scenario50.questions.mjs').href);
const { INTERVIEW } = await import(pathToFileURL(G + 'interview60.questions.mjs').href);

// A leading sentence that could stand alone as a question: it ends in . or ? and is
// followed by more text. An imperative ("Explain X.") counts — the detector treats it
// as an instruction-shaped ask, which is exactly what fired.
function leadIn(q) {
    const m = q.match(/^(.{10,90}?[.?])\s+(\S.*)$/s);
    if (!m) return null;
    return { head: m[1], headWords: wordsOf(m[1]), tailWords: wordsOf(m[2]) };
}

for (const [label, items] of [['scenario50', SCENARIO50], ['interview60', INTERVIEW]]) {
    const mains = items.filter((x) => x.level !== 'followup' && x.kind !== 'screenshot');
    const rows = mains.map((x) => ({ id: x.id, ...leadIn(x.q) })).filter((r) => r.head);
    console.log(`\n${label}: ${rows.length}/${mains.length} main questions open with a standalone sentence`);
    const q = rows.filter((r) => r.head.endsWith('?'));
    console.log(`   of those, ${q.length} end in '?' (a literal question the detector should fire on)`);
    console.log(`             ${rows.length - q.length} are imperative ("Explain ...", "Implement ...")`);
    for (const r of rows.slice(0, 6)) console.log(`   ${r.id.padEnd(7)} head ${String(r.headWords).padStart(2)}w + tail ${String(r.tailWords).padStart(2)}w   ${JSON.stringify(r.head)}`);
}
