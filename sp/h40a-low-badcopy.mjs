// Throwaway: make a known-bad copy of the verdicts to calibrate the verifier.
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst] = process.argv.slice(2);
const v = JSON.parse(readFileSync(src, 'utf8'));
delete v.R05;              // missing key
v.R99 = v.R01;             // extra key
v.R02 = { ...v.R02, delivery: 3 }; // out of range
writeFileSync(dst, JSON.stringify(v, null, 1));
