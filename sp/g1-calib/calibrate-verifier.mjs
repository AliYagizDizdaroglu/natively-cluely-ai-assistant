// Throwaway: prove g1-verify-B.mjs answers differently on known-bad verdict files.
// Broken variants are written HERE (outside l20c/blind) so no glob there can pick them up.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const blind = join(here, '..', 'l20c', 'blind');
const verifier = join(blind, 'g1-verify-B.mjs');
const goodText = readFileSync(join(blind, 'verdicts-B-g1.json'), 'utf8');
const clone = () => JSON.parse(goodText);

const variants = {
  'missing-key': () => { const v = clone(); delete v['S2Q08F#8']; return JSON.stringify(v); },
  'extra-key': () => { const v = clone(); v['S9Q99#1'] = { correctness: 2, on_topic: 2, delivery: 2, reason: 'x' }; return JSON.stringify(v); },
  'score-out-of-range': () => { const v = clone(); v['S1Q10#1'].correctness = 3; return JSON.stringify(v); },
  'non-integer-score': () => { const v = clone(); v['S1Q10#1'].on_topic = 1.5; return JSON.stringify(v); },
  'long-answer-delivery-2': () => { const v = clone(); v['S2Q09#8'].delivery = 2; return JSON.stringify(v); },
  'trailing-comma': () => goodText.replace(/\}\s*\}\s*$/, '},\n}'),
};

let allCaught = true;
for (const [name, make] of Object.entries(variants)) {
  const file = join(here, 'bad-' + name + '.json');
  writeFileSync(file, make());
  const run = spawnSync(process.execPath, [verifier, file], { encoding: 'utf8' });
  const out = (run.stdout || '') + (run.stderr || '');
  const caught = run.status !== 0 || /PROBLEMS:/.test(out);
  if (!caught) allCaught = false;
  const detail = /PROBLEMS:\n\s+(.*)/.exec(out)?.[1] || (/SyntaxError[^\n]*/.exec(out)?.[0] ?? 'no complaint');
  console.log((caught ? 'CAUGHT ' : 'MISSED ') + name.padEnd(24) + '-> ' + detail);
}
const good = spawnSync(process.execPath, [verifier], { encoding: 'utf8' });
console.log('real file -> ' + (/OK: no problems/.test(good.stdout) ? 'OK: no problems' : 'UNEXPECTED: ' + good.stdout + good.stderr));
console.log(allCaught ? 'verifier calibrated: every bad variant caught' : 'VERIFIER NOT TRUSTWORTHY');
