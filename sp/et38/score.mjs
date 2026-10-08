// ET38: unblind the eight graders' verdicts (two per packet, packets A-D) and apply PREREGISTER-et38.md verbatim.
// Grade slot 1 = A-D g1, slot 2 = A-D g2, so every graded answer has exactly two grades. Refuses on any missing,
// extra or malformed verdict. Writes RESULT-et38.md (or RESULT.md beside calibration verdicts).
//   node score.mjs [--dir <folder with items.json and runs/>] [--keydir <folder>] [--verdicts <folder>]
import fs from 'node:fs';
import { repMechanics, pct } from './mechanics-et38.mjs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HERE = arg('--dir', `${SP}/et38`), KEYDIR = arg('--keydir', `${SP}/et38-key`), VDIR = arg('--verdicts', `${HERE}/blind`);
const OUT = process.argv.includes('--verdicts') ? `${VDIR}/RESULT.md` : `${HERE}/RESULT-et38.md`;
// The registered numbers (PREREGISTER-et38.md): L20c's app samples, br1's L20c rate, br1's first token after the question ends.
const L20C = { appMean: 0.752, appWorst: 0.658, br1: 0.770 };
const BAR = { quality: 0.702, band: 0.658, anchorTol: 0.05, margin: 0.05, consWrong: 1, answered: 110, p50: 6600, p90: 14600 };

const { key, packets, holes = [], arms } = JSON.parse(fs.readFileSync(`${KEYDIR}/key.json`, 'utf8'));
const items = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const IDS = items.pairs.flat(), HARD = items.hard.flat(), NORMAL = IDS.filter((id) => !HARD.includes(id));

// ---- verdicts -> two grade slots --------------------------------------------------------------------------
const slots = [{}, {}];
for (const p of Object.keys(packets)) {
    const want = Object.keys(key).filter((k) => packets[p].includes(k.split('#')[0]));
    for (const [i, g] of ['g1', 'g2'].entries()) {
        const v = JSON.parse(fs.readFileSync(`${VDIR}/verdicts-${p}-${g}.json`, 'utf8'));
        const missing = want.filter((k) => !v[k]), extra = Object.keys(v).filter((k) => !want.includes(k));
        if (missing.length || extra.length) throw new Error(`${p}-${g}: missing ${missing.join(',') || '-'} extra ${extra.join(',') || '-'}`);
        for (const [k, x] of Object.entries(v)) {
            for (const f of ['correctness', 'on_topic', 'delivery']) if (![0, 1, 2].includes(x[f])) throw new Error(`${p}-${g} ${k}: ${f}=${x[f]}`);
            slots[i][k] = x;
        }
    }
}
const acc = (x) => x.correctness === 2 && x.on_topic === 2 && x.delivery >= 1;
const isHole = (arm, id) => holes.includes(`${arm} ${id}`);
const keyOf = (arm, id) => { const k = Object.keys(key).find((x) => key[x] === arm && x.startsWith(`${id}#`)); if (!k && !isHole(arm, id)) throw new Error(`no key and no hole for ${arm} ${id}`); return k; };
const accN = (arm, id) => (isHole(arm, id) ? 0 : slots.filter((s) => acc(s[keyOf(arm, id)])).length);
const answered = (arm, ids) => ids.filter((id) => !isHole(arm, id));
const count = (arm, ids) => ids.reduce((n, id) => n + accN(arm, id), 0) / 2;                               // holes as not acceptable
const rate = (arm, ids) => { const a = answered(arm, ids); return a.length ? count(arm, a) / a.length : NaN; };   // answered only
const consWrong = (arm) => answered(arm, IDS).filter((id) => slots.every((s) => s[keyOf(arm, id)].correctness === 0)).length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const agree = Object.keys(key).filter((k) => acc(slots[0][k]) === acc(slots[1][k])).length;
const S = Object.fromEntries(arms.map((a) => [a, { rate: rate(a, IDS), count: count(a, IDS), hard: rate(a, HARD), normal: rate(a, NORMAL), cw: consWrong(a), holes: IDS.length - answered(a, IDS).length }]));

// ---- the anchor ---------------------------------------------------------------------------------------------
const br1New = S['br1-inapp'].rate;
const anchor = Math.abs(br1New - L20C.br1) <= BAR.anchorTol + 1e-9;

// ---- per arm ------------------------------------------------------------------------------------------------
const f3 = (x) => (x == null || Number.isNaN(x) ? '-' : x.toFixed(3));
const sec = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '-');
const PF = (b) => (b == null ? 'not read' : b ? 'PASS' : 'FAIL');
const srt = (a) => [...a].sort((x, y) => x - y);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const levels = {};
for (const level of ['low', 'medium']) {
    const reps = arms.filter((a) => a.startsWith(`et-${level}-r`));
    if (!reps.length) continue;
    const mech = reps.map((a) => { const r = a.slice(-1); return repMechanics(IDS, J(`${HERE}/runs/et-${level}-r${r}.answers.json`), J(`${HERE}/runs/et-${level}-r${r}.json`)); });
    const ans = mech.reduce((n, m) => n + m.answered.length, 0), hol = mech.reduce((n, m) => n + m.holes.length, 0);
    const first = srt(mech.flatMap((m) => m.first)), last = srt(mech.flatMap((m) => m.last));
    const m = mean(reps.map((a) => S[a].rate)), worst = Math.min(...reps.map((a) => S[a].rate)), cw = reps.reduce((n, a) => n + S[a].cw, 0);
    const c = {
        qBr1: m >= br1New - BAR.margin, qL20c: anchor ? m >= BAR.quality : null, band: anchor ? worst >= BAR.band : null,
        safety: cw <= BAR.consWrong, rel: reps.length === 3 ? ans >= BAR.answered : null,
        speed: first.length ? pct(first, 0.5) <= BAR.p50 && pct(first, 0.9) <= BAR.p90 : false,
    };
    let verdict;
    if (reps.length < 3 && level === 'low') verdict = `NOT SCORABLE YET: ET-low has ${reps.length} run(s), and the rule reads it after three`;
    else if (reps.length < 3) verdict = `STOP on reliability (stopped early: ${hol} holes after ${reps.length} run(s), so 110 of 114 is out of reach); its ${reps.length} run(s) are reported below`;
    else if (!c.qBr1 || !c.safety || (anchor && (!c.qL20c || !c.band))) verdict = 'STOP: its answers are not good enough to replace or race the app\'s';
    else if (!anchor) verdict = 'NO VERDICT ON QUALITY: the anchor does not hold, so L20c\'s bars cannot be used; the app\'s samples must be graded together with these answers first';
    else if (!c.rel || !c.speed) verdict = 'WAIT: quality holds; too unreliable or too slow as measured; nothing is built';
    else verdict = 'PROCEED: worth its own build path (spikes, spec, review, flag-off build, smoke, its own hour, a holdout validation)';
    levels[level] = { reps, mech, ans, hol, first, last, m, worst, cw, c, verdict };
}

// ---- the result ---------------------------------------------------------------------------------------------
const L = [];
L.push('# ET38 result: 3.8 Live Extended Thinking, low and medium, against the app\'s 3.5-flash-lite HIGH (br1), 38 scenario50 items', '');
L.push(`Rule: PREREGISTER-et38.md (written before any ET38 audio). Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable ${agree}/${Object.keys(key).length}.`, '');
L.push('| sample | rate, answered only | acceptable of 38 (holes = not) | hard 10 | normal 28 | consensus-wrong | holes |', '|---|---|---|---|---|---|---|');
for (const a of arms) L.push(`| ${a} | ${f3(S[a].rate)} | ${S[a].count.toFixed(1)} | ${f3(S[a].hard)} | ${f3(S[a].normal)} | ${S[a].cw} | ${S[a].holes} |`);
L.push('', `**The anchor:** br1 graded again reads ${f3(br1New)}; L20c read it ${f3(L20C.br1)}; the anchor ${anchor ? 'HOLDS' : 'DOES NOT HOLD'} (within ${BAR.anchorTol}). L20c's app samples: mean ${f3(L20C.appMean)}, worst ${f3(L20C.appWorst)} (not graded again). br1's consensus-wrong now: ${S['br1-inapp'].cw}.`, '');
for (const [level, x] of Object.entries(levels)) {
    L.push(`## ET-${level}`, '');
    L.push(`1. quality: mean rate ${f3(x.m)} >= br1 ${f3(br1New)} - ${BAR.margin} = ${f3(br1New - BAR.margin)} -> ${PF(x.c.qBr1)}; >= ${BAR.quality} (L20c's app mean - 0.05) -> ${PF(x.c.qL20c)}`);
    L.push(`2. band: worst run ${f3(x.worst)} >= ${BAR.band} (the app's worst sample in L20c) -> ${PF(x.c.band)}`);
    L.push(`3. safety: consensus-wrong ${x.cw} <= ${BAR.consWrong} -> ${PF(x.c.safety)}`);
    L.push(`4. reliability: answered ${x.ans}/${IDS.length * x.reps.length}${x.reps.length === 3 ? `, need >= ${BAR.answered}` : ` after ${x.reps.length} run(s)`} -> ${PF(x.c.rel)}`);
    L.push(`5. speed: first word of the real answer p50 ${sec(pct(x.first, 0.5))} <= ${sec(BAR.p50)} and p90 ${sec(pct(x.first, 0.9))} <= ${sec(BAR.p90)} (answered items with a normal feed: ${x.first.length}) -> ${PF(x.c.speed)}`);
    L.push('', `**Verdict, ET-${level}: ${x.verdict}.**`, '');
    L.push(`Reported: last word of the answer p50 ${sec(pct(x.last, 0.5))}, p90 ${sec(pct(x.last, 0.9))} (the app's text is complete within about a second of its first token; br1's first token: p50 6.6 s, p90 14.6 s).`);
    x.mech.forEach((m, i) => L.push(`- ${x.reps[i]}: answered ${m.answered.length}/${IDS.length}; holes ${m.holes.join(' ') || 'none'}${m.apologies.length ? ` (system-error apologies: ${m.apologies.join(' ')})` : ''}; abnormal sessions ${m.abnormal} of ${m.sessions}; first word p50 ${sec(pct(srt(m.first), 0.5))}; a holding line on ${m.holding}/${m.answered.length}; slow feed ${m.slow.join(' ') || 'none'}; started ${m.t0}`));
    L.push('');
}
L.push('## Outside the rule', '', `- holes (not graded): ${holes.length ? holes.join(', ') : 'none'}`, '');
L.push('## Per question (acceptable grades of 2 per sample)', '', `| id | group | ${arms.join(' | ')} |`, `|---|---|${arms.map(() => '---').join('|')}|`);
for (const id of IDS) L.push(`| ${id} | ${HARD.includes(id) ? 'hard' : 'normal'} | ${arms.map((a) => (isHole(a, id) ? 'hole' : accN(a, id))).join(' | ')} |`);
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log(L.join('\n'));
