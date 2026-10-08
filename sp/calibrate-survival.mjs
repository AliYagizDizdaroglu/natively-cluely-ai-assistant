// Does a NON-detached child outlive `run.mjs app:start`? libuv puts non-detached children in a
// job object that kills on close, but that job allows silent breakaway, so cmd's own children
// may escape it. Measure: run spawn-and-exit.mjs to completion, wait 10 s, read what the
// grandchild printed after its parent was gone.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const out = `${process.env.TEMP}\\survive.log`;
if (existsSync(out)) unlinkSync(out);

process.stdout.write(execFileSync(process.execPath, [`${SP}/spawn-and-exit.mjs`, out], { encoding: 'utf8' }));
await new Promise((r) => setTimeout(r, 10_000));
const got = existsSync(out) ? readFileSync(out, 'utf8') : '';
console.log(JSON.stringify(got));
const survived = got.includes('t8 still alive');
console.log(survived ? 'SURVIVED — non-detached grandchild outlived the parent, output captured throughout'
                     : 'DIED — the job object took the grandchild with the parent; detached:false is not usable');
