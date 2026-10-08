// STUB of interview60.flight.mjs for launcher calibration. Never the real flight.
import fs from 'node:fs';
fs.appendFileSync(process.env.STUB_TRACE, 'flight ' + process.argv.slice(2).join(' ') + '\n');
const code = Number(process.env.STUB_FLIGHT ?? 0);
console.log('STUB flight.mjs ' + process.argv.slice(2).join(' ') + ' -> exit ' + code);
process.exit(code);
