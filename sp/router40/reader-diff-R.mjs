// A8.4 step 3 (M-2): per-item class and word-count difference between the pre-A8 reader (read-r.pre-A8.mjs) and the fixed reader (read-r.mjs) on router40-R.
// Read, not acted on. Prints ids, classes and counts only: never an answer text or a grade. Writes reader-diff-R.txt.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { R40, readJson } from './r40-common.mjs';
import * as OLD from './read-r.pre-A8.mjs';
import * as NEW from './read-r.mjs';

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(`${R40}/${f}`)).digest('hex');
const run = readJson(`${R40}/runs/router40-R.json`), ans = readJson(`${R40}/runs/router40-R.answers.json`);
const lines = [];
const say = (s) => { console.log(s); lines.push(s); };
const o = OLD.readRun(run, ans, { variant: 'B' }).rows, n = NEW.readRun(run, ans, { variant: 'B' }).rows;
say(`reader diff on router40-R (${o.length} items, variant B). Classes and word counts only.`);
say(`old reader: read-r.pre-A8.mjs sha256 ${sha('read-r.pre-A8.mjs')}`);
say(`fixed reader: read-r.mjs sha256 ${sha('read-r.mjs')}`);
say(`run file: router40-R.json sha256 ${sha('runs/router40-R.json')}; answers: ${sha('runs/router40-R.answers.json')}`);
say('id    live40-class  old-class  new-class  old-w  new-w  changed');
let classChanged = 0, wChanged = 0, textChanged = 0;
for (let i = 0; i < o.length; i++) {
    const a = o[i], b = n[i];
    if (a.id !== b.id) throw new Error('row order differs');
    const cc = a.rc !== b.rc, wc = a.w !== b.w, tc = a.T !== b.T;
    if (cc) classChanged++; if (wc) wChanged++; if (tc) textChanged++;
    say(`${a.id.padEnd(5)} ${a.cls.padEnd(13)} ${a.rc.padEnd(10)} ${b.rc.padEnd(10)} ${String(a.w).padStart(5)}  ${String(b.w).padStart(5)}  ${cc ? 'CLASS' : wc || tc ? 'T' : '-'}`);
}
say(`summary: ${classChanged} items change class; ${wChanged} change word count; ${textChanged} change T (text not shown).`);
const tab = {};
for (let i = 0; i < o.length; i++) { const k = `${o[i].rc} -> ${n[i].rc}`; tab[k] = (tab[k] ?? 0) + 1; }
say(`transitions: ${Object.entries(tab).map(([k, v]) => `${k} x${v}`).join('; ')}`);
fs.writeFileSync(`${R40}/reader-diff-R.txt`, `${lines.join('\n')}\n`, 'utf8');
