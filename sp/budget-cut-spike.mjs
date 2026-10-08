// Throwaway: would the app's word-budget cut have truncated the bare arm's answers? Applies the
// shipped spokenWordBudget + cutAtWordBudget (main checkout dist) to the s50c 3.1-lite arm
// answers and shows what the cut removes on the questions the app failed.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(MAIN, 'electron/test/golden/interview60.runs/2026-09-12T08-22-49-s50c');
const require = createRequire(path.join(MAIN, 'package.json'));
const { cutAtWordBudget, spokenWordBudget } = require(path.join(MAIN, 'dist-electron/electron/llm/verbalStreamFilter.js'));

const arm = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.gemini-3.1-flash-lite.json'), 'utf8')).items;
const app = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.json'), 'utf8')).items;
const words = (s) => (s.trim().match(/\S+/g) || []).length;
const ids = Object.keys(arm).filter((k) => /^S[12]Q\d\d$/.test(k)).sort();

let cutCount = 0;
for (const id of ids) {
    const q = arm[id].question, a = arm[id].answer;
    const b = spokenWordBudget(words(q));
    let out = '', r = null;
    async function* gen() { for (let i = 0; i < a.length; i += 9) yield a.slice(i, i + 9); }
    for await (const p of cutAtWordBudget(gen(), { ...b, onDone: (x) => { r = x; } })) out += p;
    const cut = r?.cut;
    if (cut) cutCount++;
    const appV = app[id];
    const dropped = a.slice(out.length).trim();
    console.log(`${id}  q ${words(q)}w  limit ${b.limit} ceil ${b.ceiling ?? '-'}  arm ${words(a)}w -> ${words(out)}w ${cut ? 'CUT' : 'kept'}   arm verdict ${arm[id].verdict}  in-app ${appV.verdict}${cut ? `\n      dropped: "${dropped.slice(0, 160)}${dropped.length > 160 ? '…' : ''}"` : ''}`);
}
console.log(`\n${cutCount}/${ids.length} bare-arm answers would be cut by the app's budget`);
