// STUB of guard-h40d.mjs for launcher calibration. Never the real guard.
import fs from 'node:fs';
fs.appendFileSync(process.env.STUB_TRACE, 'guard\n');
const code = Number(process.env.STUB_GUARD ?? 0);
console.log(code ? 'GUARD FAILED: stub' : 'GUARD OK: stub');
process.exit(code);
