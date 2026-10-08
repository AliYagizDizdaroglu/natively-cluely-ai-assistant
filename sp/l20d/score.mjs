// L20d: unblind the eight graders' verdicts (two per packet, packets A-D) and apply PREREGISTER-l20d.md verbatim.
// Grade slot 1 = A-D g1, slot 2 = A-D g2, so every graded answer has exactly two grades. Refuses on any missing,
// extra or malformed verdict, on a key whose arms are not the ten registered ones, on fewer than three reps, and on a
// clause 4 that cannot be read (a pair retried more than once). Writes RESULT-l20d.md (or RESULT.md beside calibration
// verdicts). Every rate comes from THIS batch; no L20c number is a bar. Counts, ids and rates only: no answer text.
//   node score.mjs [--dir <folder with items.json and runs/>] [--keydir <folder>] [--verdicts <folder>]
import fs from 'node:fs';
import { loadReps, repMechanics, clause4, clause5, pct, NEED, P50_MS, P90_MS, PREFIX_MS, QUOTA_CLOSE_IS_HOLE } from './mechanics-l20d.mjs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HERE = arg('--dir', `${SP}/l20d`), KEYDIR = arg('--keydir', `${SP}/l20d-key`), VDIR = arg('--verdicts', `${HERE}/blind`);
const OUT = process.argv.includes('--verdicts') ? `${VDIR}/RESULT.md` : `${HERE}/RESULT-l20d.md`;
const MARGIN = 0.05, CW_RATIO = 0.75, EPS = 1e-9;
// The registered verdict sentences (PREREGISTER-l20d.md, "Decision rule"), verbatim; cal-score.mjs checks each is in that file.
export const VERDICT_TEXT = {
    PROCEED: 'earns the prototype: a design spec for the fast starter (Fable; Opus review) in which Live\'s lines are shown first, about 2 s after the question, and the pipeline\'s answer replaces them in place; answer-based follow-ups stay on the pipeline (L38F); then throwaway spikes (manual turns, a 60-minute session, two Live sessions on one key), a build with the flag off, a smoke, its own pre-registered flight, and a holdout40 validation. Nothing ships on this result.',
    STOP: 'this instruction did not close the gap; the answerer is closed again, and reopening is the user\'s decision with a new registration.',
    WAIT: 'the answers are good enough, but a starter without reliability or speed has no point; nothing is built; a re-test needs its own registration.',
};
export const ge = (a, b) => a >= b - EPS;   // a >= b with a float tolerance (rates are fractions of counts of halves)

const NEW = ['l20d-r1', 'l20d-r2', 'l20d-r3'], APPS = ['app35-inapp', 'app35-twin1', 'app35-twin2', 'app35-twin3'], OLD = ['live38-r1', 'live38-r2', 'live38-r3'];
const { key, packets, holes = [], arms } = JSON.parse(fs.readFileSync(`${KEYDIR}/key.json`, 'utf8'));
if (JSON.stringify([...arms].sort()) !== JSON.stringify([...NEW, ...APPS, ...OLD].sort())) throw new Error(`the key's arms are not the ten registered ones: ${arms.join(', ')}`);
const items = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const IDS = items.pairs.flat(), HARD = items.hard.flat(), NORMAL = IDS.filter((id) => !HARD.includes(id));
const reps = loadReps(HERE);
if (reps.length !== 3) throw new Error(`${reps.length} l20d rep(s) with answers files in ${HERE}/runs: the rule reads three`);
const mech = reps.map((x) => repMechanics(IDS, x.A, x.R));
const c4 = clause4(mech, IDS.length), c5 = clause5(mech);
if (c4.state === 'INVALID') throw new Error(`clause 4 cannot be read: pairs retried more than once: ${c4.over.join(' ')}`);

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
const graded = (arm, ids) => ids.filter((id) => !isHole(arm, id));                                  // items GRADED (an apology is graded)
const count = (arm, ids) => ids.reduce((n, id) => n + accN(arm, id), 0) / 2;                           // acceptable items; holes count 0
const rate = (arm, ids) => { const a = graded(arm, ids); return a.length ? count(arm, a) / a.length : NaN; };   // the rule's read: graded items only
const rateH = (arm, ids) => count(arm, ids) / ids.length;                                              // reported beside it: holes = not acceptable
const consWrong = (arm) => graded(arm, IDS).filter((id) => slots.every((s) => s[keyOf(arm, id)].correctness === 0)).length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const agree = Object.keys(key).filter((k) => acc(slots[0][k]) === acc(slots[1][k])).length;
const S = Object.fromEntries(arms.map((a) => [a, { rate: rate(a, IDS), rateH: rateH(a, IDS), count: count(a, IDS), hard: rate(a, HARD), normal: rate(a, NORMAL), cw: consWrong(a), holes: IDS.length - graded(a, IDS).length, graded: graded(a, IDS).length }]));
for (const a of [...NEW, ...APPS]) if (Number.isNaN(S[a].rate)) throw new Error(`${a}: nothing graded, no rate`);

// ---- the rule -----------------------------------------------------------------------------------------------
const newMean = mean(NEW.map((a) => S[a].rate)), appMean = mean(APPS.map((a) => S[a].rate));
const newWorst = Math.min(...NEW.map((a) => S[a].rate)), appWorst = Math.min(...APPS.map((a) => S[a].rate));
const newCW = NEW.reduce((n, a) => n + S[a].cw, 0), appCW = APPS.reduce((n, a) => n + S[a].cw, 0);
const cwBar = 1 + Math.floor(appCW * CW_RATIO);
const c = { q: ge(newMean, appMean - MARGIN), band: ge(newWorst, appWorst), safety: newCW <= cwBar, rel: c4.state === 'PASS', speed: c5.state === 'PASS' };
const verdictKey = !(c.q && c.band && c.safety) ? 'STOP' : !(c.rel && c.speed) ? 'WAIT' : 'PROCEED';
const failed = [c.q, c.band, c.safety, c.rel, c.speed].map((b, i) => (b ? null : i + 1)).filter(Boolean);
const verdict = verdictKey === 'PROCEED' ? 'PROCEED (clauses 1-5 all pass)' : `${verdictKey} (clause${failed.length > 1 ? 's' : ''} ${failed.join(', ')} fail${failed.length > 1 ? '' : 's'})`;
// the holes-as-not-acceptable read, beside the rule's (reported only: no verdict comes from it)
const nmH = mean(NEW.map((a) => S[a].rateH)), amH = mean(APPS.map((a) => S[a].rateH)), nwH = Math.min(...NEW.map((a) => S[a].rateH)), awH = Math.min(...APPS.map((a) => S[a].rateH));
// the anchor (reported only)
const oldMean = mean(OLD.map((a) => S[a].rate));

// ---- the app answers served by the 3.1-lite stall fallback in s50m (reported) ---------------------------------
function fallbackServed() {
    const dir = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
    const tl = JSON.parse(fs.readFileSync(`${dir}/interview60.timeline.json`, 'utf8'));
    const off = tl.clock === 'playsync' ? 0 : 1150;
    const played = (tl.items ?? []).filter((i) => i.playedAt != null).sort((x, y) => x.playedAt - y.playedAt);
    const out = [];
    for (const line of fs.readFileSync(`${dir}/natively_debug.log`, 'utf8').split('\n')) {
        if (!line.includes('stalled after') || !line.includes('falling back')) continue;
        const t = Date.parse(line.slice(0, 24)), it = [...played].reverse().find((i) => i.playedAt + off <= t);
        out.push(`${it ? it.id : '?'}${it && IDS.includes(it.id) ? '' : ' (not one of the 38)'}`);
    }
    return out;
}

// ---- output ---------------------------------------------------------------------------------------------------
const f3 = (x) => (x == null || Number.isNaN(x) ? '-' : x.toFixed(3));
const sec = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '-');
const PF = (b) => (b ? 'PASS' : 'FAIL');
const srt = (a) => [...a].sort((x, y) => x - y);
const med = (a) => (a.length ? pct(srt(a), 0.5) : null);
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const answerText = {};
for (const p of Object.keys(packets)) for (const it of JSON.parse(fs.readFileSync(`${HERE}/blind/packet-${p}.json`, 'utf8')).items) answerText[it.key] = it.answer;
const wordsOf = (arm) => srt(Object.keys(key).filter((k) => key[k] === arm).map((k) => words(answerText[k])));
const L = [];
L.push('# L20d result: 3.8 Live with a short instruction, against the app (s50m: in-app and captured-high r1-r3), 38 scenario50 items', '');
L.push(`Rule: PREREGISTER-l20d.md. Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable ${agree}/${Object.keys(key).length}. Every rate is from this one batch.`, '');
L.push('| sample | rate, graded items | acceptable of 38 (holes = not) | rate, holes = not (/38) | hard 10 | normal 28 | consensus-wrong | graded | holes |', '|---|---|---|---|---|---|---|---|---|');
for (const a of arms) L.push(`| ${a}${OLD.includes(a) ? ' (anchor, reported only)' : ''} | ${f3(S[a].rate)} | ${S[a].count.toFixed(1)} | ${f3(S[a].rateH)} | ${f3(S[a].hard)} | ${f3(S[a].normal)} | ${S[a].cw} | ${S[a].graded} | ${S[a].holes} |`);
L.push('', `Means (graded-items rate): new Live ${f3(newMean)}; app ${f3(appMean)}; anchor (29 Sep's Live, long prompt) ${f3(oldMean)}.`, '');
L.push('## Decision (pre-registered)', '');
L.push(`1. quality: new Live mean rate ${f3(newMean)} >= app mean rate ${f3(appMean)} - ${MARGIN} = ${f3(appMean - MARGIN)} -> ${PF(c.q)}`);
L.push(`2. band: new Live worst rep ${f3(newWorst)} >= app worst sample ${f3(appWorst)} -> ${PF(c.band)}`);
L.push(`3. safety: new Live consensus-wrong ${newCW} (${NEW.reduce((n, a) => n + S[a].graded, 0)} graded answers) <= 1 + floor(${appCW} x ${CW_RATIO}) = ${cwBar} (app: ${APPS.reduce((n, a) => n + S[a].graded, 0)} graded answers of ${APPS.length * IDS.length} slots) -> ${PF(c.safety)}`);
L.push(`4. reliability: answered ${c4.answered}/${c4.of}, need >= ${NEED} -> ${c4.state}`);
L.push(`5. speed: first word p50 ${sec(c5.p50)} <= ${sec(P50_MS)} and p90 ${sec(c5.p90)} <= ${sec(P90_MS)} over ${c5.n} slots (${c5.noFirstWord} without a first word; ${c5.slow} slow-feed answered items left out) -> ${c5.state}`);
L.push('', `**Verdict: ${verdict}: ${VERDICT_TEXT[verdictKey]}**`, '');
L.push('## Reported outside the rule', '');
L.push(`- holes-as-not-acceptable read (no verdict comes from it): new Live mean ${f3(nmH)}, app mean ${f3(amH)}; clause 1 would read ${PF(ge(nmH, amH - MARGIN))}; worst rep ${f3(nwH)} vs app worst ${f3(awH)}: clause 2 would read ${PF(ge(nwH, awH))}.`);
L.push(`- the anchor: new Live - old Live = ${f3(newMean - oldMean)} (tonight's short instruction vs 29 Sep's long prompt, graded in one session); old Live - app = ${f3(oldMean - appMean)}. L20c's old Live holes: ${holes.filter((h) => h.startsWith('live38-')).join(', ') || 'none'}.`);
L.push(`- holes (not graded): ${holes.length ? holes.join(', ') : 'none'}`);
L.push(`- app in-app answers served by the 3.1-lite stall fallback in s50m: ${fallbackServed().join(', ') || 'none'} (kept, as the app ran).`);
mech.forEach((m, i) => L.push(`- rep l20d-r${i + 1}: window ${m.t0}; answered ${m.answered.length}/${IDS.length}; holes ${m.holes.join(' ') || 'none'}${m.apologies.length ? ` (system-error apologies: ${m.apologies.join(' ')})` : ''}; abnormal sessions ${m.abnormal} of ${m.sessions}; retried pairs ${m.retried.join(' ') || 'none'}; quota closes ${m.quota.length}${m.quota.length ? ` (${QUOTA_CLOSE_IS_HOLE ? 'holes' : 'not holes'}: ${m.quotaHoles.join(' ') || 'none'})` : ''}; slow feed ${m.slow.join(' ') || 'none'}`));
const ww = srt(mech.flatMap((m) => m.wordsBy)), lw = srt(mech.flatMap((m) => m.last)), wd = mech.flatMap((m) => m.words), th = mech.flatMap((m) => m.thoughts);
L.push(`- starter reads (event timestamps, no grader): words of each answer arrived by ${sec(PREFIX_MS)} after the question: p50 ${med(ww) ?? '-'} (n ${ww.length}); last word p50 ${lw.length ? sec(pct(lw, 0.5)) : '-'}, p90 ${lw.length ? sec(pct(lw, 0.9)) : '-'}; words per answer p50 ${med(wd) ?? '-'} (L20c: 63-67 Live, 74-82 app); thought tokens per answer p50 ${med(th) ?? '-'} (L20c: 91-952; the one-sentence probe 310); holding lines on ${mech.reduce((n, m) => n + m.holding, 0)} answers; premature output on ${mech.reduce((n, m) => n + m.premature, 0)} answers.`);
L.push(`- words per graded answer, by arm (median): ${arms.map((a) => `${a} ${med(wordsOf(a)) ?? '-'}`).join('; ')}.`);
L.push(`- grader agreement on acceptable, per packet: ${Object.keys(packets).map((p) => { const ks = Object.keys(key).filter((k) => packets[p].includes(k.split('#')[0])); const dis = ks.filter((k) => acc(slots[0][k]) !== acc(slots[1][k])); return `${p} ${ks.length - dis.length}/${ks.length}${dis.length ? ` (disagree: ${dis.map((k) => `${k.split('#')[0]} ${key[k]}`).join(', ')})` : ''}`; }).join('; ')}.`);
L.push('', '## Per question (acceptable grades of 2 per sample)', '', `| id | group | ${arms.join(' | ')} |`, `|---|---|${arms.map(() => '---').join('|')}|`);
for (const id of IDS) L.push(`| ${id} | ${HARD.includes(id) ? 'hard' : 'normal'} | ${arms.map((a) => (isHole(a, id) ? 'hole' : accN(a, id))).join(' | ')} |`);
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log(L.join('\n'));
