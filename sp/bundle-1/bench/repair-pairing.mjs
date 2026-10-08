// bench step 1 (SPEC 8 "Captures", primary method). Copies r1's verbal-prompts.log, natively_debug.log and timeline into bench/r1-repaired/, runs the bundle
// worktree's interview60.prompts.mjs (dcefca0's text-match pairing) on the COPY, then --check on it (must exit 0). r1's committed prompts.json is never written:
// its sha is read before and after. NO network, NO model. Prints counts only.
//   node repair-pairing.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { R1_DIR, REPAIRED, GOLDEN_BUNDLE, sha256, expectedIds, loadLive40, BENCH } from './common.mjs';

const FILES = ['verbal-prompts.log', 'natively_debug.log', 'interview60.timeline.json'];
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
if (path.resolve(REPAIRED) === path.resolve(R1_DIR)) refuse('the repaired folder is r1 itself');
const r1Prompts = path.join(R1_DIR, 'interview60.prompts.json');
const before = fs.existsSync(r1Prompts) ? sha256(fs.readFileSync(r1Prompts)) : null;
fs.mkdirSync(REPAIRED, { recursive: true });
for (const f of FILES) {
    const src = path.join(R1_DIR, f), dst = path.join(REPAIRED, f);
    if (!fs.existsSync(src)) refuse(`r1 lacks ${f}`);
    if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
    if (sha256(fs.readFileSync(src)) !== sha256(fs.readFileSync(dst))) refuse(`${f} in the copy differs from r1`);
}
const tool = `${GOLDEN_BUNDLE}/interview60.prompts.mjs`;
const run = (args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
const a = run([REPAIRED]);
const c = run(['--check', REPAIRED]);
const m = /PROMPTS\s+(\d+) of (\d+) dispatched answers captured/.exec(a.stdout);
const un = /PROMPTS\s+(\d+) dispatched ids have no capture: (.*)/.exec(a.stdout);
const ids = Object.keys(JSON.parse(fs.readFileSync(path.join(REPAIRED, 'interview60.prompts.json'), 'utf8')));
const want = expectedIds(await loadLive40());
const same = ids.length === want.length && want.every((i) => ids.includes(i));
const after = fs.existsSync(r1Prompts) ? sha256(fs.readFileSync(r1Prompts)) : null;
console.log(`repair: tool exit ${a.status}, check exit ${c.status} (${c.stdout.trim().split('\n').pop()}); captured ${m?.[1]} of ${m?.[2]}; uncaptured ${un?.[1] ?? 0} (${un?.[2] ?? '-'})`);
console.log(`repair: id set equals the frozen 42: ${same}; r1's own prompts.json untouched: ${before === after}`);
fs.writeFileSync(path.join(BENCH, 'repair.out.txt'), `tool exit ${a.status} check exit ${c.status} ids ${ids.length} frozen42 ${same} r1untouched ${before === after}\n`);
process.exit(a.status === 0 && c.status === 0 && same && before === after ? 0 : 1);
