import fs from 'node:fs'; const H = "C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go/l20d"; const cfg = () => JSON.parse(fs.readFileSync(`${H}/stub.json`, 'utf8')); const log = (s) => fs.appendFileSync(`${H}/calls.log`, `${Date.now()} ${s}\n`);

const c = cfg(); log('check-extract'); process.exit(c.recheckFail ? 1 : 0);
