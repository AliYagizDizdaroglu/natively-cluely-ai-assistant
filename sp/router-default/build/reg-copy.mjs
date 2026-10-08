// Copies the registration and its instrument copies into MAIN's passes folder; writes build\reg-paths.txt (repo-relative, for commit-main-paths).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const SP = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-lab\\sp';
const LAB = `${SP}\\router-default`;
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const P = 'electron/test/golden/passes';
const map = [
  [`${LAB}\\PREREGISTER-router-default.md`, `${P}/PREREGISTER-router-default.md`],
  [`${LAB}\\RESULT-smoke.md`, `${P}/router-default/RESULT-smoke.md`],
  [`${LAB}\\router-hour-read.mjs`, `${P}/router-default/router-hour-read.mjs`],
  [`${LAB}\\build-blind-rd.mjs`, `${P}/router-default/build-blind-rd.mjs`],
  [`${LAB}\\grade\\score-rd.mjs`, `${P}/router-default/score-rd.mjs`],
  [`${LAB}\\grade\\launch-grader-rd.mjs`, `${P}/router-default/launch-grader-rd.mjs`],
  [`${LAB}\\grade\\rd-grader-dispatch.txt`, `${P}/router-default/rd-grader-dispatch.txt`],
  [`${LAB}\\flight\\launch-rd-src.txt`, `${P}/router-default/launch-rd-src.txt`],
  [`${LAB}\\flight\\guard-rd.mjs`, `${P}/router-default/guard-rd.mjs`],
  [`${LAB}\\flight\\rd-precheck.ps1`, `${P}/router-default/rd-precheck.ps1`],
  [`${SP}\\quota-ledger-today.mjs`, `${P}/router-default/quota-ledger-today.mjs`],
];
const sha = (b) => createHash('sha256').update(b).digest('hex');
const rel = [];
for (const [src, dst] of map) {
  const b = fs.readFileSync(src);
  if (b.includes(13)) { console.log(`REFUSED: CR in ${src} (commit-main-paths refuses CR blobs)`); process.exit(2); }
  const d = path.join(MAIN, dst);
  if (fs.existsSync(d) && sha(fs.readFileSync(d)) !== sha(b)) { console.log(`REFUSED: ${dst} exists with different bytes`); process.exit(2); }
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(src, d);
  console.log(`${dst} ${sha(b).slice(0, 12)} back ${sha(fs.readFileSync(d)).slice(0, 12)}`);
  rel.push(dst);
}
fs.writeFileSync(path.join(LAB, 'build', 'reg-paths.txt'), rel.join('\n') + '\n');
