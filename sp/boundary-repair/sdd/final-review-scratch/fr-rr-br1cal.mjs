// Scoped re-review (throwaway): do br1-read.mjs's two NEW checks answer differently when their effect is present?
// Copies of the calibration's "pass" run folder (cal/br1v4-pass), edited here; br1-read.mjs is only run, never edited.
//   control  the pass copy as is                                  -> exit 0
//   stray    one line inserted between a final and its repair line -> only the extractor check can fail: exit 1 + REFUSED
//   pause    an empty final inserted between the first repair's cut and its F2 -> PAUSE RULE lists 1 repair
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.join(HERE, '..', '..');
const PASS = path.join(BR, 'cal', 'br1v4-pass');
const REPAIR = /\[DeepgramStreaming\] boundary repair: restored /;
const make = (name, edit) => {
    const d = path.join(HERE, `br1cal-${name}`);
    fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(path.join(PASS, 'interview60.timeline.json'), path.join(d, 'interview60.timeline.json'));
    const L = fs.readFileSync(path.join(PASS, 'natively_debug.log'), 'utf8').split('\n');
    if (edit) edit(L);
    fs.writeFileSync(path.join(d, 'natively_debug.log'), L.join('\n'));
    return d;
};
const firstRepair = (L) => L.findIndex((l) => REPAIR.test(l));
const cases = [
    ['control', null],
    ['stray', (L) => { const k = firstRepair(L); L.splice(k, 0, `${L[k].slice(0, 24)} [LOG] [Main] a stray line`); }],
    ['pause', (L) => { const k = firstRepair(L); L.splice(k - 1, 0, `${L[k - 1].slice(0, 24)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""`); }],
];
for (const [name, edit] of cases) {
    const d = make(name, edit);
    const r = spawnSync(process.execPath, [path.join(BR, 'br1-read.mjs'), d], { encoding: 'utf8', timeout: 120000 });
    const out = `${r.stdout}${r.stderr}`.split('\n');
    const pick = out.filter((l) => /^(SUMMARY|EXTRACTOR|PAUSE RULE|APP-ONLY|REF-ONLY)|^   ".*the last pause/.test(l));
    console.log(`${name.padEnd(8)} exit ${r.status}\n  ${pick.join('\n  ')}`);
    fs.rmSync(d, { recursive: true, force: true });
}
