// Throwaway (2026-09-29): do 3.5-flash-lite HIGH answers exist for all 20 L20 items (items.json) in the two
// scenario50 hours that flew 3.5-lite HIGH as primary (s50l, s50m)? Checks the in-app pairs file and the three
// captured-high twins per run: present + non-empty answer, and word count. Read-only on MAIN.
//   node check-35-sources.mjs
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const HERE = new URL('./', import.meta.url);
const IDS = JSON.parse(fs.readFileSync(new URL('items.json', HERE), 'utf8')).pairs.flat();
const runs = { s50l: '2026-09-21T08-22-34-s50l', s50m: '2026-09-22T08-22-50-s50m' };
const arms = { inapp: '', 'cap-high': '.gemini-3.5-flash-lite_captured-high', 'cap-high-r2': '.gemini-3.5-flash-lite_captured-high-r2', 'cap-high-r3': '.gemini-3.5-flash-lite_captured-high-r3' };
const words = (s) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
for (const [name, dir] of Object.entries(runs)) {
    for (const [arm, suffix] of Object.entries(arms)) {
        const f = `${RUNS}/${dir}/interview60.judge.pairs${suffix}.json`;
        if (!fs.existsSync(f)) { console.log(`${name} ${arm}: FILE MISSING`); continue; }
        const items = JSON.parse(fs.readFileSync(f, 'utf8')).items;
        const missing = [], empty = [], w = [];
        for (const id of IDS) {
            const p = items.find((x) => x.key === id);
            if (!p) { missing.push(id); continue; }
            if (!p.answer?.trim()) { empty.push(id); continue; }
            w.push(words(p.answer));
        }
        w.sort((a, b) => a - b);
        console.log(`${name} ${arm.padEnd(11)} present ${IDS.length - missing.length}/20, non-empty ${w.length}/20, words p50 ${w[Math.floor(w.length / 2)] ?? '-'}${missing.length ? `  MISSING ${missing.join(' ')}` : ''}${empty.length ? `  EMPTY ${empty.join(' ')}` : ''}`);
    }
}
