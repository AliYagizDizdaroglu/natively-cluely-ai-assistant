// STUB of interview60.run.mjs for launcher calibration. Never the real harness.
import fs from 'node:fs';
const cmd = process.argv[2];
fs.appendFileSync(process.env.STUB_TRACE, 'run ' + cmd + '\n');
const code = Number(process.env['STUB_' + cmd.replace(':', '_').toUpperCase()] ?? 0);
console.log('STUB run.mjs ' + cmd + ' -> exit ' + code);
process.exit(code);
