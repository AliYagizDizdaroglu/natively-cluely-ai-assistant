// STUB of dist-proof.mjs for launcher calibration: the nth call exits with the nth code of STUB_PROOF_SEQ (the last repeats).
import fs from 'node:fs';
const seq = (process.env.STUB_PROOF_SEQ ?? '0').split(',').map(Number);
let n = 0;
try { n = Number(fs.readFileSync(process.env.STUB_PROOF_STATE, 'utf8')); } catch { /* first call */ }
n++;
fs.writeFileSync(process.env.STUB_PROOF_STATE, String(n));
const code = seq[Math.min(n - 1, seq.length - 1)];
fs.appendFileSync(process.env.STUB_TRACE, 'proof ' + n + ' -> ' + code + '\n');
console.log('DIST PROOF: STUB call ' + n + ' -> exit ' + code);
process.exit(code);
