// Throwaway (2026-09-29): calibrate guard-br1.mjs post against fake project trees — v3 (must pass),
// v2 (must fail: the |T| == 1 branch), no module (must fail), v3 with an unwired adapter (must fail).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const WIRED = "const deepgramBoundaryRepair_1 = require('./deepgramBoundaryRepair');\nconsole.log(`[DeepgramStreaming] boundary repair: restored \"x\" before \"y\"`);\n";
const cases = [
    { name: 'v3', module: 'rule-v3.cjs', adapter: WIRED, want: 0 },
    { name: 'v2', module: 'rule-v2.cjs', adapter: WIRED, want: 1 },
    { name: 'none', module: null, adapter: WIRED, want: 1 },
    { name: 'unwired', module: 'rule-v3.cjs', adapter: '// no repair here\n', want: 1 },
];
let bad = 0;
for (const c of cases) {
    const proj = path.join(here, 'cal', `proj-${c.name}`);
    const audio = path.join(proj, 'dist-electron', 'electron', 'audio');
    fs.rmSync(proj, { recursive: true, force: true });
    fs.mkdirSync(audio, { recursive: true });
    if (c.module) fs.copyFileSync(path.join(here, 'cal', c.module), path.join(audio, 'deepgramBoundaryRepair.js'));
    fs.writeFileSync(path.join(audio, 'DeepgramStreamingSTT.js'), c.adapter);
    let code = 0, out = '';
    try { out = execFileSync(process.execPath, [path.join(here, 'guard-br1.mjs'), 'post'], { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status; out = String(e.stderr || e.stdout); }
    const ok = code === c.want;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${c.name.padEnd(8)} exit ${code} (want ${c.want}): ${out.trim().split('\n').pop()}`);
}
process.exit(bad ? 1 : 0);
