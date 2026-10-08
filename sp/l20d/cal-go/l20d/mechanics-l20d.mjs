import fs from 'node:fs'; const H = "C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go/l20d"; const cfg = () => JSON.parse(fs.readFileSync(`${H}/stub.json`, 'utf8')); const log = (s) => fs.appendFileSync(`${H}/calls.log`, `${Date.now()} ${s}\n`);

const c = cfg(); const reps = [1, 2, 3].filter((r) => fs.existsSync(H + '/runs/l20d-r' + r + '.answers.json')); log('mechanics reps=' + reps.length);
if (c.noArm) { console.log('nothing useful'); process.exit(0); }
const answered = reps.reduce((n, _, i) => n + c.answered[i], 0);
console.log('ARM l20d: reps ' + reps.length + ', answered ' + answered + '/' + 38 * reps.length + ', holes ' + (38 * reps.length - answered) + ', last run answered ' + (reps.length ? c.answered[reps.length - 1] : 0) + ' -> ' + (reps.length >= 3 ? 'DONE' : 'CONTINUE'));
