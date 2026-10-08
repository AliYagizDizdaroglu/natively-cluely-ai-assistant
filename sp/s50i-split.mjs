// Throwaway: right / weak / wrong per arm, split mains vs follow-ups, from the s50i verdict files.
// Verdict rule is the flight's own (interview60.judge.mjs verdictOf).
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { verdictOf } = await import(`file:///${path.join(PROJ, 'electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);
const TAGS = process.argv.slice(2).length ? process.argv.slice(2)
    : ['inapp', 'captured-minimal', 'captured-low', 'low', 'captured-high', 'high', 'bare31', 'bare35'];
const isMain = (id) => !id.endsWith('F');
console.log('arm                 mains right/weak/wrong   follow-ups right/weak/wrong');
for (const tag of TAGS) {
    const f = path.join(HERE, `s50i-verdicts-${tag}.json`);
    if (!fs.existsSync(f)) { console.log(`${tag.padEnd(18)} (not graded yet)`); continue; }
    const v = JSON.parse(fs.readFileSync(f, 'utf8'));
    const m = { acceptable: 0, weak: 0, wrong: 0 }, fu = { acceptable: 0, weak: 0, wrong: 0 };
    for (const [id, s] of Object.entries(v)) (isMain(id) ? m : fu)[verdictOf(s)]++;
    const mn = m.acceptable + m.weak + m.wrong, fn = fu.acceptable + fu.weak + fu.wrong;
    console.log(`${tag.padEnd(18)} ${`${m.acceptable}/${m.weak}/${m.wrong} of ${mn}`.padEnd(24)} ${fn ? `${fu.acceptable}/${fu.weak}/${fu.wrong} of ${fn}` : '(mains-only arm)'}`);
}
