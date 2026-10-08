// Rule-8 calibration of make-grader-prompts.mjs and check-grader-prompts.mjs (PREREGISTER-l20d.md: "L20c's dispatch
// prompt verbatim except the packet path"). Known cases:
//   - the eight L20d prompts are L20c's eight dispatch texts with exactly two paths changed in each (the make script
//     proves it by putting the paths back; here it is run and then cross-checked against ET38's prompts, which were
//     built from the same L20c texts: L20d's = ET38's with `et38` replaced by `l20d`, byte for byte);
//   - each has the same length as its L20c text (the folder names l20c and l20d have the same length);
//   - none names l20c; every packet and verdicts path names l20d\blind and its own packet/grader;
//   - the checker answers differently when the effect is absent: a copy with one word changed in one prompt, a copy whose
//     A-g1 prompt names packet B, a copy missing a verdicts path -> each must be reported as NOT one text.
//   node cal-grader-prompts.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const L = `${SP}/l20d`, D = `${L}/cal-grader-prompts`;
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(D, { recursive: true });
let ok = true;
const check = (name, cond, extra = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : `  ${String(extra).slice(0, 300)}`}`); };
const run = (script, args = []) => { const r = spawnSync(process.execPath, [`${L}/${script}`, ...args], { encoding: 'utf8' }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };
const SEATS = ['A-g1', 'A-g2', 'B-g1', 'B-g2', 'C-g1', 'C-g2', 'D-g1', 'D-g2'];

let r = run('make-grader-prompts.mjs');
check('make-grader-prompts: exit 0, eight prompts written', r.code === 0 && /^8 grader prompts written/m.test(r.out), r.out);
r = run('check-grader-prompts.mjs');
check('check-grader-prompts on the real folder: ONE TEXT, exit 0', r.code === 0 && /^ONE TEXT/.test(r.out), r.out);
let same = 0, sameLen = 0, bad = [];
SEATS.forEach((seat, i) => {
    const mine = fs.readFileSync(`${L}/grader-prompts/${seat}.txt`, 'utf8');
    const et = fs.readFileSync(`${SP}/et38/grader-prompts/${seat}.txt`, 'utf8');
    const l20c = fs.readFileSync(`${L}/l20c-grader-prompts/${String(i + 1).padStart(2, '0')}.txt`, 'utf8');
    if (et.split('scratchpad\\et38\\blind').join('scratchpad\\l20d\\blind') === mine) same++; else bad.push(`${seat}: not ET38's`);
    if (mine.length === l20c.length) sameLen++; else bad.push(`${seat}: length ${mine.length} vs L20c ${l20c.length}`);
    const [p, g] = seat.split('-');
    if (/l20c/i.test(mine) || /et38/i.test(mine)) bad.push(`${seat}: names l20c or et38`);
    if (!mine.includes(`scratchpad\\l20d\\blind\\packet-${p}.json`) || !mine.includes(`scratchpad\\l20d\\blind\\verdicts-${p}-${g}.json`)) bad.push(`${seat}: its own paths are not there`);
    if ((mine.match(/packet-[A-D]\.json/g) ?? []).length !== 1 || (mine.match(/verdicts-[A-D]-g[12]\.json/g) ?? []).length !== 1) bad.push(`${seat}: more than one packet or verdicts path`);
});
check('L20d prompts = ET38\'s prompts with the folder name changed, byte for byte, for all eight seats', same === 8, bad.join('; '));
check('each L20d prompt has the length of its L20c text (nothing but the same-length folder name changed)', sameLen === 8, bad.join('; '));
check('no prompt names l20c or et38; each names exactly its own packet and its own verdicts file under l20d\\blind', bad.length === 0, bad.join('; '));

// the checker must notice
const copy = (name) => { const d = `${D}/${name}`; fs.cpSync(`${L}/grader-prompts`, d, { recursive: true }); return d; };
let d = copy('word');
fs.writeFileSync(`${d}/D-g2.txt`, fs.readFileSync(`${d}/D-g2.txt`, 'utf8').replace('Follow that rubric literally', 'Follow that rubric loosely'));
r = run('check-grader-prompts.mjs', [d]);
check('one word changed in D-g2 -> "DIFFER: 2 distinct texts", exit 1', r.code === 1 && /^DIFFER: 2 distinct texts/m.test(r.out), r.out);
d = copy('wrong-packet');
fs.writeFileSync(`${d}/A-g1.txt`, fs.readFileSync(`${d}/A-g1.txt`, 'utf8').replace('packet-A.json', 'packet-B.json'));
r = run('check-grader-prompts.mjs', [d]);
check('A-g1 pointing at packet B -> "MISSING its own packet or verdicts path", exit 1', r.code === 1 && /A-g1: MISSING its own packet/.test(r.out), r.out);
d = copy('no-verdicts');
fs.writeFileSync(`${d}/C-g2.txt`, fs.readFileSync(`${d}/C-g2.txt`, 'utf8').replace('verdicts-C-g2.json', 'verdicts-C-g1.json'));
r = run('check-grader-prompts.mjs', [d]);
check('C-g2 told to write C-g1\'s file -> MISSING, exit 1', r.code === 1 && /C-g2: MISSING/.test(r.out), r.out);
d = copy('one-missing');
fs.rmSync(`${d}/B-g1.txt`);
r = run('check-grader-prompts.mjs', [d]);
check('a prompt file missing -> the checker fails (nonzero exit)', r.code !== 0, r.out);
console.log(ok ? 'GRADER PROMPTS CALIBRATION OK' : 'GRADER PROMPTS CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
