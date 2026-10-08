import fs from 'node:fs'; const H = "C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go/l20d"; const cfg = () => JSON.parse(fs.readFileSync(`${H}/stub.json`, 'utf8')); const log = (s) => fs.appendFileSync(`${H}/calls.log`, `${Date.now()} ${s}\n`);

const f = process.argv[2]; const c = cfg(); log('extract ' + f.replace(/\\/g, '/').split('/').pop());
if (c.extractFail) process.exit(1); fs.writeFileSync(f.replace(/\.json$/, '.answers.json'), '{}'); process.exit(0);
