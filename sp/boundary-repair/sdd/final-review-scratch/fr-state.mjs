// Final review (read-only): MAIN's branch/HEAD, and whether the 10 files still match the package's hashes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const git = (...a) => execFileSync('git', ['--no-optional-locks', '-C', MAIN, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const PKG = {
    'electron/audio/deepgramBoundaryRepair.ts': 'd5ba4da0650e7531',
    'electron/audio/deepgramBoundaryRepair.test.ts': '6956aea35dfef746',
    'electron/audio/deepgramBoundaryRepair.fixtures.json': 'e65c6e746f821642',
    'electron/audio/DeepgramStreamingSTT.ts': '57292516fc495df1',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts': '2f3eb860c6142415',
    'electron/audio/deepgramKeyterms.ts': 'b4431b9138d9688f',
    'electron/audio/deepgramKeyterms.test.ts': 'bfdd8a5d91f48da7',
    'electron/test/golden/interview60.turns-finals.mjs': '365cca381954a2e0',
    'electron/test/golden/interview60.turns-finals.test.ts': 'd40c6c235cb69281',
    'electron/test/golden/interview60.turns-fixture.mjs': 'cfd7c87666393bb8',
};
console.log('branch', git('rev-parse', '--abbrev-ref', 'HEAD').trim(), 'HEAD', git('rev-parse', 'HEAD').trim());
for (const [f, h] of Object.entries(PKG)) {
    const p = path.join(MAIN, f);
    const b = fs.readFileSync(p);
    const st = fs.statSync(p);
    console.log(sha(b).slice(0, 16) === h ? 'SAME   ' : 'CHANGED', f, b.length, 'B', st.mtime.toISOString());
}
console.log('--- git status (porcelain, all) ---');
console.log(git('status', '--porcelain=v1', '--untracked-files=all'));
