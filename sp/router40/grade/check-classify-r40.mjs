// P1's calibration reader: checks ONE classifier output (c3 / c4, registration 6.2 and Appendix B) for validity and scores its 22 calibration turns against cal-key.json
// (12 `simple` must be EASY, 10 `hard` must be HARD: a classifier that is not 22/22 makes the l38base axis UNCALIBRATED). Also writes the consensus label map when given both.
//   node check-classify-r40.mjs --out <verdicts.c3.json> [--out2 <verdicts.c4.json> --consensus <labels.json>]
// Prints counts and ids only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { R40, SP, readJson, argOf, words } from '../r40-common.mjs';

/** { valid, problems[], calCorrect, calN, misses: [key] } for one output object. */
export function scoreClassifier(out, { turnIds, calKey }) {
    const problems = [];
    const want = [...turnIds, ...Object.keys(calKey)];
    for (const k of want) {
        const v = out?.[k];
        if (!v || !['EASY', 'HARD'].includes(v.route)) problems.push(`${k}: route missing or not EASY|HARD`);
        else if (typeof v.reason !== 'string' || words(v.reason) > 12) problems.push(`${k}: reason missing or longer than 12 words`);
    }
    const extra = Object.keys(out ?? {}).filter((k) => !want.includes(k));
    if (extra.length) problems.push(`${extra.length} keys that were not asked for`);
    let calCorrect = 0; const misses = [];
    for (const [k, m] of Object.entries(calKey)) {
        const ok = out?.[k]?.route === (m.cls === 'simple' ? 'EASY' : 'HARD');
        if (ok) calCorrect++; else misses.push(k);
    }
    return { valid: problems.length === 0, problems, calCorrect, calN: Object.keys(calKey).length, misses };
}
export const loadRefs = () => ({ turnIds: readJson(`${R40}/turns-for-classifiers.json`).turns.map((t) => t.id), calKey: readJson(`${SP}/l38base/keyhold/cal-key.json`), tMap: readJson(`${R40}/keyhold/key.json`) });
/** consensus label per live40 item id: EASY / HARD when both classifiers agree, else 'split'. */
export function consensus(o1, o2, tMap) {
    const out = {};
    for (const [t, m] of Object.entries(tMap)) { if (t === 'note') continue; out[m.item] = o1[t]?.route === o2[t]?.route ? o1[t].route : 'split'; }
    return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const refs = loadRefs();
    const outs = [argOf(argv, '--out'), argOf(argv, '--out2')].filter(Boolean);
    if (!outs.length) { console.log('usage: node check-classify-r40.mjs --out <file> [--out2 <file> --consensus <labels.json>]'); process.exit(2); }
    const O = outs.map((f) => readJson(f));
    let allGood = true;
    O.forEach((o, i) => {
      const r = scoreClassifier(o, refs);
      console.log(`${path.basename(outs[i])}: ${r.valid ? 'valid on 69 keys' : `INVALID (${r.problems.slice(0, 3).join('; ')}${r.problems.length > 3 ? ` +${r.problems.length - 3} more` : ''})`}; calibration ${r.calCorrect}/${r.calN}${r.misses.length ? ` misses [${r.misses.join(',')}]` : ''} -> ${r.valid && r.calCorrect === r.calN ? 'CALIBRATED' : 'UNCALIBRATED (the l38base axis is reported, not read)'}`);
      allGood &&= r.valid && r.calCorrect === r.calN;
    });
    if (O.length === 2 && argOf(argv, '--consensus')) {
        const L = consensus(O[0], O[1], refs.tMap);
        fs.writeFileSync(argOf(argv, '--consensus'), JSON.stringify(L, null, 1));
        const c = Object.values(L).reduce((a, v) => { a[v] = (a[v] ?? 0) + 1; return a; }, {});
        console.log(`consensus labels written: ${JSON.stringify(c)}`);
    }
    process.exit(allGood ? 0 : 1);
}
