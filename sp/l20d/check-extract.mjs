// Is the extraction chain (et10/et-extract.mjs, unchanged, loading MAIN's built verbalStreamFilter.js) still the one
// that produced L20c's stored answers? It runs et-extract.mjs on copies of the six stored L20b/L20c run files and
// compares every item's answer text with the stored answers file. Today's filter file begins sha256 42d9bc42dbd17870
// (Opus review M7); go.mjs runs this check when the file's hash differs. Prints counts and item ids only.
//   node check-extract.mjs [--tamper]    (--tamper: calibration, changes one stored answer so the check MUST report a difference)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = `${SP}/l20d/check-extract`;
const TAMPER = process.argv.includes('--tamper');
const FILTER = `${MAIN}/dist-electron/electron/llm/verbalStreamFilter.js`;
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(D, { recursive: true });
console.log(`filter file sha256 ${crypto.createHash('sha256').update(fs.readFileSync(FILTER)).digest('hex').slice(0, 16)}`);
let same = 0, differ = [], played = 0;
for (const d of ['l20b', 'l20c']) for (const r of [1, 2, 3]) {
    const name = `${d}-r${r}`;
    fs.copyFileSync(`${SP}/${d}/runs/live38-r${r}.json`, `${D}/${name}.json`);
    const x = spawnSync(process.execPath, [`${SP}/et10/et-extract.mjs`, `${D}/${name}.json`], { encoding: 'utf8' });
    if (x.status !== 0) { console.log(`${name}: et-extract exit ${x.status}`); process.exit(2); }
    const fresh = JSON.parse(fs.readFileSync(`${D}/${name}.answers.json`, 'utf8'));
    const stored = JSON.parse(fs.readFileSync(`${SP}/${d}/runs/live38-r${r}.answers.json`, 'utf8'));
    if (TAMPER && name === 'l20c-r2') { const id = Object.keys(stored).find((i) => stored[i].played && stored[i].answer); stored[id] = { ...stored[id], answer: `${stored[id].answer} x` }; }
    for (const id of new Set([...Object.keys(fresh), ...Object.keys(stored)])) {
        const a = fresh[id], b = stored[id];
        if (a?.played) played++;
        if (!!a?.played === !!b?.played && (a?.answer ?? '') === (b?.answer ?? '')) same++; else differ.push(`${name} ${id}`);
    }
}
console.log(`${same} same, ${differ.length} differ${differ.length ? `: ${differ.join(', ')}` : ''} (played items ${played})`);
process.exit(differ.length ? 1 : 0);
