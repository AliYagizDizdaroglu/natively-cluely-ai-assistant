// Throwaway: prove the roster import and id filter resolve from the MAIN checkout's cwd,
// with no app and no audio — the bug that wasted the first pass20 run.
import path from 'path';
import { pathToFileURL } from 'url';

const HERE = path.join(process.cwd(), 'electron', 'test', 'golden');
const { SCENARIO50 } = await import(pathToFileURL(path.join(HERE, 'scenario50.questions.mjs')).href);
const mains = SCENARIO50.filter((i) => /^S[12]Q[0-9][0-9]$/.test(i.id));
console.log(`cwd ${process.cwd()}`);
console.log(`mains ${mains.length}: ${mains[0].id} … ${mains[mains.length - 1].id}`);
