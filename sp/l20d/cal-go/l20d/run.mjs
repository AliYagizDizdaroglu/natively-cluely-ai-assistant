import fs from 'node:fs'; const H = "C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go/l20d"; const cfg = () => JSON.parse(fs.readFileSync(`${H}/stub.json`, 'utf8')); const log = (s) => fs.appendFileSync(`${H}/calls.log`, `${Date.now()} ${s}\n`);

const rep = process.argv[process.argv.indexOf('--rep') + 1]; const c = cfg();
log('run ' + process.argv.slice(2).join(' ') + ' cwd=' + process.cwd().replace(/\\/g, '/') + ' START');
if (c.runNoFile?.[rep]) { log('run ' + rep + ' END'); process.exit(c.runExit?.[rep] ?? 0); }
fs.mkdirSync(H + '/runs', { recursive: true }); fs.writeFileSync(H + '/runs/l20d-r' + rep + '.json', JSON.stringify({ rep: Number(rep) }));
if (c.hang?.[rep]) await new Promise((r) => setTimeout(r, 15000));
await new Promise((r) => setTimeout(r, 300));
log('run ' + rep + ' END'); process.exit(c.runExit?.[rep] ?? 0);
