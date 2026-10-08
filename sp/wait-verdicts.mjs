// wait-verdicts.mjs — block until all 18 s50m verdict files exist, then exit.
import fs from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const count = () => fs.readdirSync(S).filter((f) => /^s50m-verdicts-.*\.json$/.test(f)).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < 80; i++) {
    const n = count();
    if (n >= 18) { console.log(`all 18 present after ${i * 15}s`); process.exit(0); }
    await sleep(15000);
}
console.log(`timed out with ${count()} of 18`);
process.exit(1);
