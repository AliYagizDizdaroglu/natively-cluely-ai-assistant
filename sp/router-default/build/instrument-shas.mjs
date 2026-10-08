// Writes LAB\build\instrument-shas.md: full sha256 of every registered instrument (missing files are listed as MISSING).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const SP = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-lab\\sp';
const LAB = `${SP}\\router-default`;
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const G = `${MAIN}\\electron\\test\\golden`;
const items = [
  ['hour reader', `${LAB}\\router-hour-read.mjs`], ['hour reader calibration output', `${LAB}\\router-hour-read.cal.current.txt`],
  ['blind export', `${LAB}\\build-blind-rd.mjs`], ['blind export calibration output', `${LAB}\\cal-build-blind-rd.txt`],
  ['scorer', `${LAB}\\grade\\score-rd.mjs`], ['scorer calibration output', `${LAB}\\grade\\cal-score-rd.txt`],
  ['grader launcher', `${LAB}\\grade\\launch-grader-rd.mjs`], ['grader dispatch text', `${LAB}\\grade\\rd-grader-dispatch.txt`],
  ['grader launcher calibration output', `${LAB}\\grade\\cal-launch-grader-rd.txt`],
  ['live probe', `${LAB}\\live-probe.mjs`], ['smoke launcher', `${LAB}\\launch-router-smoke.cmd`],
  ['flight launcher source', `${LAB}\\flight\\launch-rd-src.txt`], ['launcher generator', `${LAB}\\flight\\gen-launchers-rd.mjs`],
  ['guard', `${LAB}\\flight\\guard-rd.mjs`], ['guard git helper', `${LAB}\\flight\\guard-rd-git.mjs`],
  ['precheck', `${LAB}\\flight\\rd-precheck.ps1`], ['register', `${LAB}\\flight\\register-rd.ps1`],
  ['write-arming', `${LAB}\\flight\\write-arming-rd.mjs`], ['proofs', `${LAB}\\flight\\rd-proofs.mjs`],
  ['sha-lines', `${LAB}\\flight\\rd-sha-lines.mjs`], ['night gates', `${SP}\\flight-eq\\night-gates.ps1`],
  ['quota ledger', `${SP}\\quota-ledger-today.mjs`], ['gap check', `${LAB}\\build\\gap-check.mjs`],
  ['live40.wav', `${G}\\live40.wav`], ['roster live40.questions.mjs', `${G}\\live40.questions.mjs`],
  ['live40 items.json', `${SP}\\live40\\items.json`],
  ['dist LiveRouterSession.js', `${MAIN}\\dist-electron\\electron\\audio\\LiveRouterSession.js`],
  ['dist routerArbiter.js', `${MAIN}\\dist-electron\\electron\\services\\routerArbiter.js`],
  ['dist routeReader.js', `${MAIN}\\dist-electron\\electron\\services\\routeReader.js`],
  ['dist main.js', `${MAIN}\\dist-electron\\electron\\main.js`],
  ['SMOKE-READ.txt', `${LAB}\\SMOKE-READ.txt`], ['RESULT-smoke.md', `${LAB}\\RESULT-smoke.md`],
];
const out = ['# Instrument sha256 (computed ' + new Date().toISOString() + ')', '', '| instrument | path | sha256 |', '|--|--|--|'];
for (const [name, p] of items) {
  const s = fs.existsSync(p) ? createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'MISSING';
  out.push(`| ${name} | ${p.replace(SP, 'SP').replace(MAIN, 'MAIN')} | ${s} |`);
}
fs.writeFileSync(path.join(LAB, 'build', 'instrument-shas.md'), out.join('\n') + '\n');
console.log(out.filter((l) => l.includes('MISSING')).join('\n') || 'all present');
