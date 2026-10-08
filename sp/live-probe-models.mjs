// Throwaway: the harness's own Live probe (the app's exact session config, the 34 s probe clip) on each model,
// sequentially. No Electron app; the key is read by node --env-file from MAIN's .env, never printed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['gemini-3.1-flash-live-preview', 'gemini-3.8-live', 'gemini-3.8-live-extended-thinking'];
const out = [];
for (const model of models) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['--env-file=.env', 'electron/test/golden/interview60.live-probe.cjs'], { cwd: MAIN, env: { ...process.env, NATIVELY_LIVE_MODEL: model }, encoding: 'utf8', timeout: 180000 });
    const text = `${r.stdout}${r.stderr}`;
    fs.writeFileSync(`${SP}/live-probe-${model}.log`, text);
    const tools = text.split('\n').filter((l) => /TOOLCALL|LIVE-PROBE|FATAL|close|error/i.test(l)).map((l) => l.slice(0, 230));
    out.push(`=== ${model}: exit ${r.status} in ${((Date.now() - t0) / 1000).toFixed(0)} s`, ...tools);
}
console.log(out.join('\n'));
