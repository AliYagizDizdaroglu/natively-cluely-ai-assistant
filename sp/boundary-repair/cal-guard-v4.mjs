// Throwaway (2026-09-29): calibrate guard-br1.mjs post (v4 checks) against fake project trees. Each broken
// case breaks exactly ONE premise and must fail with THAT check's message; the full v4 case must pass.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const cjsRule = (v) => fs.readFileSync(path.join(here, `rule-${v}.mjs`), 'utf8')
    .replace(/^export const /gm, 'const ').replace(/^export function /gm, 'function ');
// obj: the body of the object createBoundaryRepair returns, over `r = createRepair()`.
const moduleSrc = (v, obj) => `${cjsRule(v)}
function createBoundaryRepair() { const r = createRepair(); return { ${obj} }; }
module.exports = { createBoundaryRepair };
`;
const OT = 'onTranscript(t, f, a, sf) { const o = r.onTranscript(t, f, a, sf); return { text: o.text, restored: o.restored ?? null }; }';
const OT_NO_SF = 'onTranscript(t, f, a) { const o = r.onTranscript(t, f, a, false); return { text: o.text, restored: o.restored ?? null }; }';
const MODULES = {
    v4: moduleSrc('v4', `clear() { r.clear(); }, ${OT}`),
    'v4-noclear': moduleSrc('v4', OT),
    'v4-clearnoop': moduleSrc('v4', `clear() { }, ${OT}`),
    'v4-sfignored': moduleSrc('v4', `clear() { r.clear(); }, ${OT_NO_SF}`),
    'v3-shape': moduleSrc('v3', `clear() { }, ${OT}`),
    'v2-shape': moduleSrc('v2', `clear() { }, ${OT}`),
};
const ADAPTER = [
    "const deepgramBoundaryRepair_1 = require('./deepgramBoundaryRepair');",
    "const deepgramKeyterms_1 = require('./deepgramKeyterms');",
    'this.boundaryRepair = (0, deepgramKeyterms_1.isEnglishLanguage)(this.languageCode) ? (0, deepgramBoundaryRepair_1.createBoundaryRepair)() : null;',
    'const repaired = this.boundaryRepair ? this.boundaryRepair.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true) : null;',
    'this.boundaryRepair?.clear();',
    'console.log(`[DeepgramStreaming] boundary repair: restored "x" before "y"`);',
].join('\n');
const HEDGE_ON = "exports.describeVerbalHedgeAtStartup = () => '[Main] verbal hedge: on trigger=5000ms';\n";
const HEDGE_OFF = "exports.describeVerbalHedgeAtStartup = () => '[Main] verbal hedge: off';\n";
const cases = [
    { name: 'v4', module: 'v4', adapter: ADAPTER, hedge: HEDGE_ON, want: 0, msg: 'GUARD br1 post OK' },
    { name: 'none', module: null, adapter: ADAPTER, hedge: HEDGE_ON, want: 1, msg: 'the built module does not load' },
    { name: 'v4-noclear', module: 'v4-noclear', adapter: ADAPTER, hedge: HEDGE_ON, want: 1, msg: 'has no clear()' },
    { name: 'v2-shape', module: 'v2-shape', adapter: ADAPTER, hedge: HEDGE_ON, want: 1, msg: 'the |T| == 1 branch fires' },
    { name: 'v3-shape', module: 'v3-shape', adapter: ADAPTER, hedge: HEDGE_ON, want: 1, msg: 'the digit merge is treated as a cut' },
    { name: 'v4-clearnoop', module: 'v4-clearnoop', adapter: ADAPTER, hedge: HEDGE_ON, want: 1, msg: 'clear() does not forget the cut' },
    { name: 'v4-sfignored', module: 'v4-sfignored', adapter: ADAPTER, hedge: HEDGE_ON, want: 1, msg: 'speech_final on the cut final still leaves a cut' },
    { name: 'unwired', module: 'v4', adapter: '// no repair here\n', hedge: HEDGE_ON, want: 1, msg: 'does not import the repair' },
    { name: 'nolog', module: 'v4', adapter: ADAPTER.replace('boundary repair: restored', 'boundary repair:'), hedge: HEDGE_ON, want: 1, msg: 'does not log the repair line' },
    { name: 'nogate', module: 'v4', adapter: ADAPTER.replace(/isEnglishLanguage/g, 'keytermsFor'), hedge: HEDGE_ON, want: 1, msg: 'does not gate the repair to English' },
    { name: 'nosf', module: 'v4', adapter: ADAPTER.replace('data.speech_final === true', 'false'), hedge: HEDGE_ON, want: 1, msg: 'does not pass speech_final' },
    { name: 'noclearcall', module: 'v4', adapter: ADAPTER.replace('this.boundaryRepair?.clear();', ''), hedge: HEDGE_ON, want: 1, msg: 'never calls clear()' },
    { name: 'hedgeoff', module: 'v4', adapter: ADAPTER, hedge: HEDGE_OFF, want: 1, msg: 'the built default is not the hedge' },
];
let bad = 0;
for (const c of cases) {
    const proj = path.join(here, 'cal', `v4proj-${c.name}`);
    const audio = path.join(proj, 'dist-electron', 'electron', 'audio');
    const llm = path.join(proj, 'dist-electron', 'electron', 'llm');
    fs.rmSync(proj, { recursive: true, force: true });
    fs.mkdirSync(audio, { recursive: true });
    fs.mkdirSync(llm, { recursive: true });
    if (c.module) fs.writeFileSync(path.join(audio, 'deepgramBoundaryRepair.js'), MODULES[c.module]);
    fs.writeFileSync(path.join(audio, 'DeepgramStreamingSTT.js'), c.adapter);
    fs.writeFileSync(path.join(llm, 'verbalHedge.js'), c.hedge);
    let code = 0, out = '';
    try { out = execFileSync(process.execPath, [path.join(here, 'guard-br1.mjs'), 'post'], { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status; out = String(e.stderr || e.stdout); }
    // The guard's line is the first line of its output (a require error appends its stack below it).
    const last = out.trim().split('\n')[0];
    const ok = code === c.want && last.includes(c.msg);
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${c.name.padEnd(13)} exit ${code} (want ${c.want}, "${c.msg}"): ${last}`);
}
console.log(bad ? `CALIBRATION FAILED: ${bad} case(s)` : `CALIBRATION OK: ${cases.length} cases, each check fails on its own premise and the v4 tree passes`);
process.exit(bad ? 1 : 0);
