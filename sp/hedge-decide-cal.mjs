// Throwaway: hedge-live.decide.mjs on synthetic windows whose verdict is known by hand.
//   case A: today waits [2000, 3000, null, 4000], hedge [1000, 2500, 3000, null]
//           sorted with cap: today [2000,3000,4000,45000] -> median idx 2 = 4.0 s, p90 idx 3 = cap, none 1
//                            hedge [1000,2500,3000,45000] -> median 3.0 s, p90 cap, none 1  => PROCEED
//   case B: hedge [1000, null, null, 3000] -> none 2 > 1                                    => DO NOT BUILD
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const M = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hedge-cal-'));
const row = (policy, wait, by) => ({ id: 'X', policy, wait, by, extra: false, legs: [{ model: by === 'none' ? 'gemini-3.1-flash-lite' : by, startedAt: 0, ttft: wait, error: wait == null ? 'HTTP 503' : undefined }] });
const today = [2000, 3000, null, 4000].map((w) => row('today', w, w == null ? 'none' : 'gemini-3.1-flash-lite'));
const cases = {
    A: { hedge: [1000, 2500, 3000, null], expect: [/today\s+n=  4  median 4\.0 s   p90 cap     none  1/, /hedge\s+n=  4  median 3\.0 s   p90 cap     none  1/, /VERDICT: PROCEED/] },
    B: { hedge: [1000, null, null, 3000], expect: [/none  2/, /VERDICT: DO NOT BUILD/] },
};
let failed = 0;
for (const [name, c] of Object.entries(cases)) {
    const f = path.join(dir, `${name}.json`);
    fs.writeFileSync(f, JSON.stringify([...today, ...c.hedge.map((w) => row('hedge', w, w == null ? 'none' : 'gemini-3.5-flash-lite'))]));
    const out = execFileSync(process.execPath, [`${M}/electron/test/golden/hedge-live.decide.mjs`, f], { encoding: 'utf8' });
    const bad = c.expect.filter((re) => !re.test(out));
    console.log(`case ${name}: ${bad.length ? 'FAIL' : 'ok'}`); if (bad.length) { failed++; console.log(out); }
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? 'CALIBRATION FAILED' : 'CALIBRATION OK'); process.exit(failed ? 1 : 0);
