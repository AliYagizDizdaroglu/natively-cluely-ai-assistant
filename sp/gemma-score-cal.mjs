// Throwaway: calibrates gemma-score-blind.mjs on synthetic verdicts whose counts are known in advance.
// Copies the REAL key files into gemma-arms/blind-cal/ and writes verdicts from a fixed rule per arm:
//   3.5-lite HIGH      every answer acceptable            (2/2/2)
//   3.1-lite LOW       every answer weak                  (1/2/1)
//   Gemma 31B HIGH     mains acceptable, follow-ups wrong (on_topic 0)
//   Gemma 26B HIGH     every answer wrong                 (correctness 0)
//   Gemma 31B MINIMAL  every answer weak via delivery 0   (2/2/0)
//   Gemma 26B MINIMAL  struggle ids acceptable, the rest weak
//   node gemma-score-cal.mjs [--half N]   --half N: drop one key from verdicts.blind-N (refusal test)
//                            [--pending N] --pending N: omit verdicts.blind-N entirely
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const SRC = `${SP}/gemma-arms/blind`, CAL = `${SP}/gemma-arms/blind-cal`;
const STRUGGLE = new Set('S2Q02,S2Q06F,S2Q07F,S1Q02,S1Q04F,S2Q02F,S2Q10F,S1Q04,S1Q06,S1Q06F,S1Q10,S2Q08F'.split(','));
const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const half = arg('--half'), pending = arg('--pending');

const rule = (arm, id) => {
    const A = { correctness: 2, on_topic: 2, delivery: 2 }, W = { correctness: 1, on_topic: 2, delivery: 1 };
    switch (arm) {
        case '3.5-lite HIGH': return A;
        case '3.1-lite LOW': return W;
        case 'Gemma 31B HIGH': return id.endsWith('F') ? { correctness: 2, on_topic: 0, delivery: 2 } : A;
        case 'Gemma 26B HIGH': return { correctness: 0, on_topic: 2, delivery: 2 };
        case 'Gemma 31B MINIMAL': return { correctness: 2, on_topic: 2, delivery: 0 };
        case 'Gemma 26B MINIMAL': return STRUGGLE.has(id) ? A : W;
        default: throw new Error(`no rule for arm ${arm}`);
    }
};

fs.rmSync(CAL, { recursive: true, force: true });
fs.mkdirSync(CAL);
for (const f of fs.readdirSync(SRC).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0];
    fs.copyFileSync(`${SRC}/${f}`, `${CAL}/${f}`);
    if (n === pending) continue;
    const key = JSON.parse(fs.readFileSync(`${SRC}/${f}`, 'utf8'));
    const V = Object.fromEntries(Object.entries(key).map(([k, { arm, id }]) => [k, { ...rule(arm, id), reason: 'synthetic' }]));
    if (n === half) delete V[Object.keys(V)[0]];
    fs.writeFileSync(`${CAL}/verdicts.blind-${n}.json`, JSON.stringify(V));
}
console.log(`calibration verdicts written to ${CAL}${half ? ` (half-graded: ${half})` : ''}${pending ? ` (pending: ${pending})` : ''}`);
