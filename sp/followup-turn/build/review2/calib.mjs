// Calibration of diff.mjs / lines-diff.mjs: each mutant of the bundled app must show diffs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'app-eq.mjs'), 'utf8');
const M = [
    ['turnId-falsy', 'if (turnId == null) return silent("no-turn", cue);', 'if (!turnId) return silent("no-turn", cue);', 'diff.mjs'],
    ['clip-tail-300', 'var CLIP_TAIL = 299;', 'var CLIP_TAIL = 300;', 'diff.mjs'],
    ['lines-empty-kept', 'if (m && m[1]) texts.push(m[1]);', 'if (m) texts.push(m[1]);', 'lines-diff.mjs'],
    ['no-pinned-check', 'if (np.length >= 3 && nq.includes(np))', 'if (false)', 'diff.mjs'],
];
for (const [name, a, b, script] of M) {
    if (!src.includes(a)) { console.log(`${name}: ANCHOR MISSING`); continue; }
    const f = `mutant-${name}.mjs`;
    fs.writeFileSync(path.join(HERE, f), src.replace(a, b));
    const out = execFileSync(process.execPath, [path.join(HERE, script)], { env: { ...process.env, EQ_APP: f, N: '20000' }, cwd: HERE }).toString().trim().split('\n').pop();
    console.log(`${name}: ${out}`);
}
