// Runs MAIN's modified extractor end to end (output into this scratch folder, cwd = OS temp) and compares
// every key but extractedAt with the committed fixture; calibrated by single-value mutations.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import util from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const X = path.join(G, 'interview60.turns-fixture.mjs');
const differing = (fresh, committed) => Object.keys({ ...fresh, ...committed }).filter((k) => k !== 'extractedAt' && !util.isDeepStrictEqual(fresh[k], committed[k]));

for (const [run, tts] of [['2026-09-09T15-00-55-s50a', 'scenario50-tts-local'], ['2026-09-08T08-44-56-after9', 'interview60-tts-local']]) {
    const out = path.join(HERE, `x-${run.slice(-5)}.json`);
    const r = spawnSync(process.execPath, [X, path.join(G, 'interview60.runs', run), path.join(G, tts), '--offset-ms', '1150', '--out', out], { cwd: os.tmpdir(), encoding: 'utf8' });
    console.log(`${run}: exit ${r.status}; ${(r.stdout + r.stderr).trim().replace(out, '<scratch out>')}`);
    if (r.status !== 0) continue;
    const fresh = JSON.parse(fs.readFileSync(out, 'utf8'));
    const committed = JSON.parse(fs.readFileSync(path.join(G, 'fixtures', `${run}-turns.json`), 'utf8'));
    const d = differing(fresh, committed);
    console.log(`  keys ${Object.keys(fresh).join(',')}; finals ${fresh.finals.length}/${committed.finals.length}; differing keys except extractedAt: ${d.length ? d.join(',') : 'none'}`);
    // calibration: each mutation must be reported under exactly its own key
    const muts = [
        ['finals', (f) => { f.finals[5].text += ' x'; }],
        ['finals', (f) => { f.finals.splice(7, 1); }],
        ['finals', (f) => { f.finals[9].at += 1; }],
        ['items', (f) => { f.items[3].voice[0][0] += 20; }],
        ['actual', (f) => { f.actual[2].question += '?'; }],
    ];
    const ok = muts.filter(([key, mut]) => { const c = structuredClone(fresh); mut(c); const dd = differing(c, committed); return dd.length === 1 && dd[0] === key; }).length;
    console.log(`  calibration: ${ok}/${muts.length} mutations detected under exactly their own key`);
    fs.unlinkSync(out);
    console.log(`  output deleted: ${!fs.existsSync(out)}`);
}
