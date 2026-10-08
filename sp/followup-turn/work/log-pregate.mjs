import fs from 'node:fs';
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R/run.log';
const stamp = new Date().toLocaleString('sv-SE', { hour12: false });
const msg = process.argv.slice(2).join(' ');
fs.appendFileSync(LOG, `\n[${stamp}] ${msg}\n`);
console.log(`logged at ${stamp}: ${msg.slice(0, 100)}`);
