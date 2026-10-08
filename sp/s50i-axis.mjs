// Throwaway: WHY each answer is weak, per arm — which axis lost the point. Verdict rule is the
// flight's own. A weak answer is either a correctness miss (substance) or a delivery miss (length
// or unspeakable text); the split says whether an arm's ceiling is knowledge or shape.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { verdictOf } = await import(`file:///${path.join(PROJ, 'electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);
const TAGS = process.argv.slice(2);

for (const tag of TAGS) {
    const f = path.join(HERE, `s50i-verdicts-${tag}.json`);
    if (!fs.existsSync(f)) { console.log(`${tag}: not graded`); continue; }
    const v = JSON.parse(fs.readFileSync(f, 'utf8'));
    const n = Object.keys(v).length;
    let right = 0, wrong = 0;
    const weakCorrect = [], weakDeliv = [], weakTopic = [], d0 = [], d2 = [];
    for (const [id, s] of Object.entries(v)) {
        const verdict = verdictOf(s);
        if (s.delivery === 0) d0.push(id);
        if (s.delivery === 2) d2.push(id);
        if (verdict === 'acceptable') { right++; continue; }
        if (verdict === 'wrong') { wrong.push?.(id); wrong++; continue; }
        if (s.correctness < 2) weakCorrect.push(id);
        else if (s.on_topic < 2) weakTopic.push(id);
        else weakDeliv.push(id);
    }
    console.log(`\n== ${tag}  (${n} answers)`);
    console.log(`   right ${right}   weak ${weakCorrect.length + weakTopic.length + weakDeliv.length}   wrong ${wrong}`);
    console.log(`   weak because SUBSTANCE (correctness 1): ${weakCorrect.length}${weakCorrect.length ? '  ' + weakCorrect.join(' ') : ''}`);
    if (weakTopic.length) console.log(`   weak because OFF-PART (on_topic 1):     ${weakTopic.length}  ${weakTopic.join(' ')}`);
    console.log(`   weak because DELIVERY only:             ${weakDeliv.length}${weakDeliv.length ? '  ' + weakDeliv.join(' ') : ''}`);
    console.log(`   delivery 2 (spoken length, clean): ${d2.length} of ${n}${d0.length ? `;  delivery 0 (unspeakable): ${d0.join(' ')}` : ''}`);
}
