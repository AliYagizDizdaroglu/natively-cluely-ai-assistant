// Throwaway (2026-09-29, v4 authoring): print every fixture of fixtures-v3.json with its class and expected output.
import fs from 'node:fs';
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures-v3.json', import.meta.url), 'utf8'));
const show = (label, f) => console.log(`${label} [${f.cls}] ${f.run}\n  I : ${JSON.stringify(f.events[0].text)} @${f.events[0].atMs}\n  F1: ${JSON.stringify(f.events[1].text)} @${f.events[1].atMs}\n  F2: ${JSON.stringify(f.events[2].text)} @${f.events[2].atMs}\n  => ${JSON.stringify(f.expectedF2)}`);
show('symptom', fx.symptom); show('seam', fx.seam);
fx.positives.forEach((f, i) => show(`pos#${i + 1}`, f));
fx.negatives.forEach((f, i) => show(`neg#${i + 1}`, f));
