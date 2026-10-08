/**
 * THROWAWAY BENCH — unblind every graded comparison between two arms and score it.
 *
 *   node bench-score.mjs --a control --b coverage
 *
 * Reads bench/pairs.<a>r*-vs-<b>r*.h*.key.json and the grader's verdicts file beside each
 * (bench/verdicts.<tag>.json). Per rep: acceptable count per arm, per-question flips in each
 * direction, and the axis that moved. Pooled over reps. Also words and time-to-first-spoken
 * per arm from the rep files, and the roster split (mains vs follow-ups).
 */
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const OUT = path.join(HERE, 'bench');
const { verdictOf } = await import(`file:///${path.join(PROJ, '.claude/worktrees/whole-turn/electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const A = arg('--a'), B = arg('--b');
if (!A || !B) { console.error('usage: --a <arm> --b <arm>'); process.exit(2); }

const keyFiles = fs.readdirSync(OUT).filter((f) => f.startsWith(`pairs.${A}r`) && f.includes(`-vs-${B}r`) && f.endsWith('.key.json')).sort();
if (!keyFiles.length) { console.error(`no key files for ${A} vs ${B}`); process.exit(2); }

// tag -> { rep: 'r1-vs-r1', per question: {A: scores, B: scores} }
const byRep = {};
let graded = 0, missing = [];
for (const kf of keyFiles) {
    const tag = kf.slice('pairs.'.length, -'.key.json'.length);
    const vf = path.join(OUT, `verdicts.${tag}.json`);
    if (!fs.existsSync(vf)) { missing.push(tag); continue; }
    const key = JSON.parse(fs.readFileSync(path.join(OUT, kf), 'utf8'));
    const verdicts = JSON.parse(fs.readFileSync(vf, 'utf8'));
    const rep = tag.replace(/\.h\d$/, '');
    byRep[rep] ??= {};
    for (const [k, meta] of Object.entries(key)) {
        const v = verdicts[k];
        if (!v) { console.error(`  ${tag}: grader left ${k} unscored`); continue; }
        // tag starts with `${A}r<rep>` by construction (keyFiles filter); arm names may contain hyphens.
        const aRep = rep.slice(A.length).match(/^r(\d+)/)[1];
        const side = meta.arm === A && String(meta.rep) === aRep ? 'A' : 'B';
        byRep[rep][meta.id] ??= {};
        byRep[rep][meta.id][side] = { ...v, verdict: verdictOf(v), words: meta.words };
        graded++;
    }
}
if (missing.length) console.log(`(not yet graded: ${missing.join(', ')})\n`);

const isMain = (id) => !id.endsWith('F');
const acc = (x) => x?.verdict === 'acceptable';
const pooled = { A: 0, B: 0, n: 0, up: 0, down: 0, mainsA: 0, mainsB: 0, mains: 0 };
console.log(`${A} (A)  vs  ${B} (B)   — paired, one grader per pair, blinded\n`);
console.log('rep         n   A ok   B ok   net   A->B up   A->B down   axis of the flips');
for (const [rep, qs] of Object.entries(byRep).sort()) {
    const ids = Object.keys(qs).filter((id) => qs[id].A && qs[id].B).sort();
    let a = 0, b = 0, up = 0, down = 0; const axes = [];
    for (const id of ids) {
        const x = qs[id];
        if (acc(x.A)) a++;
        if (acc(x.B)) b++;
        if (!acc(x.A) && acc(x.B)) { up++; axes.push(`${id}↑`); }
        if (acc(x.A) && !acc(x.B)) {
            down++;
            const ax = x.B.correctness < x.A.correctness ? 'c' : x.B.on_topic < x.A.on_topic ? 't' : 'd';
            axes.push(`${id}↓${ax}`);
        }
        pooled.n++; if (acc(x.A)) pooled.A++; if (acc(x.B)) pooled.B++;
        if (isMain(id)) { pooled.mains++; if (acc(x.A)) pooled.mainsA++; if (acc(x.B)) pooled.mainsB++; }
    }
    pooled.up += up; pooled.down += down;
    console.log(`${rep.padEnd(10)} ${String(ids.length).padStart(3)}   ${String(a).padStart(3)}    ${String(b).padStart(3)}   ${String(b - a).padStart(3)}      ${String(up).padStart(2)}          ${String(down).padStart(2)}      ${axes.join(' ')}`);
}
console.log(`\nPOOLED  n=${pooled.n}  A ${pooled.A}  B ${pooled.B}  net ${pooled.B - pooled.A >= 0 ? '+' : ''}${pooled.B - pooled.A}   up ${pooled.up}  down ${pooled.down}`);
console.log(`  mains only  n=${pooled.mains}  A ${pooled.mainsA}  B ${pooled.mainsB}  net ${pooled.mainsB - pooled.mainsA >= 0 ? '+' : ''}${pooled.mainsB - pooled.mainsA}`);
console.log(`  follow-ups  n=${pooled.n - pooled.mains}  A ${pooled.A - pooled.mainsA}  B ${pooled.B - pooled.mainsB}`);

// Words and time-to-first-spoken from the rep files, all reps that exist for each arm.
const pct = (arr, q) => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
console.log('\narm        answers  words p50/p90/max   ttfs p50/p90 ms   >200w');
for (const arm of [A, B]) {
    const rows = [];
    for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith(`${arm}.rep`) && f.endsWith('.json'))) {
        for (const v of Object.values(JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')))) if (v.spoken) rows.push(v);
    }
    const ws = rows.map((r) => r.words), ts = rows.map((r) => r.ttfs);
    console.log(`${arm.padEnd(10)} ${String(rows.length).padStart(5)}    ${pct(ws, .5)}/${pct(ws, .9)}/${Math.max(...ws)}           ${pct(ts, .5)}/${pct(ts, .9)}          ${ws.filter((w) => w > 200).length}`);
}
