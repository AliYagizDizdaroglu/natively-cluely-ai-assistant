// Fix round 1: MAIN's CURRENT finalsFrom over every run log, the smoke logs and the real adapter's log (t5-seam):
// throw count, and equality with the round-0 module (pt/cur, 52e2cd63). Holdout logs: throw count only.
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = path.join(MAIN, 'electron/test/golden/interview60.runs');
const cur = (await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.turns-finals.mjs')).href)).finalsFrom;
const r0 = (await import(pathToFileURL(path.join(HERE, 'pt/cur/interview60.turns-finals.mjs')).href)).finalsFrom;
const groups = { 'non-holdout': [], holdout: [], smoke: [], adapter: [path.join(HERE, '..', 't5-seam', 'adapter-natively_debug.log')] };
for (const e of fs.readdirSync(RUNS, { withFileTypes: true })) {
    if (e.isDirectory() && fs.existsSync(path.join(RUNS, e.name, 'natively_debug.log'))) groups[e.name.includes('h40') ? 'holdout' : 'non-holdout'].push(path.join(RUNS, e.name, 'natively_debug.log'));
    else if (e.isFile() && /natively_debug\.log$/.test(e.name)) groups.smoke.push(path.join(RUNS, e.name));
}
for (const [g, files] of Object.entries(groups)) {
    let thrown = 0, finals = 0, repairs = 0, differ = 0;
    for (const f of files) {
        const dbg = fs.readFileSync(f, 'utf8');
        repairs += dbg.split('\n').filter((l) => l.includes('boundary repair: restored')).length;
        try { const a = cur(dbg, 0); finals += a.length; if (g !== 'holdout' && !util.isDeepStrictEqual(a, r0(dbg, 0))) differ++; } catch (e) { thrown++; console.log(`  THROW ${path.basename(path.dirname(f))}: ${e.message}`); }
    }
    console.log(`${g}: ${files.length} logs, ${repairs} repair lines, throws ${thrown}${g === 'holdout' ? '' : `, ${finals} finals, differs from round 0 in ${differ}`}`);
}
