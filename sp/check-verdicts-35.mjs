// Throwaway: every think35 verdict file parses, its key set equals its pairs file's item keys,
// and its reasons are distinct (a grader that copied one verdict across items would show up).
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'bench');
let bad = 0;
for (const vf of fs.readdirSync(OUT).filter((f) => f.startsWith('verdicts.') && f.includes('think35')).sort()) {
    const tag = vf.slice('verdicts.'.length, -'.json'.length);
    const pf = path.join(OUT, `pairs.${tag}.json`);
    let v;
    try { v = JSON.parse(fs.readFileSync(path.join(OUT, vf), 'utf8')); } catch (e) { console.log(`BAD JSON  ${tag}: ${e.message}`); bad++; continue; }
    const items = JSON.parse(fs.readFileSync(pf, 'utf8')).items.map((i) => i.key);
    const missing = items.filter((k) => !(k in v));
    const extra = Object.keys(v).filter((k) => !items.includes(k));
    const reasons = new Set(Object.values(v).map((x) => x.reason));
    const shape = Object.values(v).filter((x) => ![x.correctness, x.on_topic, x.delivery].every((n) => Number.isInteger(n) && n >= 0 && n <= 2));
    const ok = !missing.length && !extra.length && !shape.length && reasons.size > items.length * 0.8;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${tag.padEnd(42)} keys ${Object.keys(v).length}/${items.length}  distinct reasons ${reasons.size}` +
        `${missing.length ? `  MISSING ${missing.slice(0, 3).join(',')}` : ''}${extra.length ? `  EXTRA ${extra.slice(0, 3).join(',')}` : ''}${shape.length ? `  ${shape.length} BAD SCORES` : ''}`);
}
console.log(bad ? `\n${bad} file(s) need attention` : '\nall verdict files sound');
