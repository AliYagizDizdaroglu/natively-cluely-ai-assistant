import fs from 'node:fs'; const H = "C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go/l20d"; const cfg = () => JSON.parse(fs.readFileSync(`${H}/stub.json`, 'utf8')); const log = (s) => fs.appendFileSync(`${H}/calls.log`, `${Date.now()} ${s}\n`);

const c = cfg(); log('probe cwd=' + process.cwd().replace(/\\/g, '/'));
console.log('answered ' + (c.probeAnswered ?? 5) + '/5; abnormal closes ' + (c.probeAbnormal ?? 0) + '; wrote health/stub.json');
