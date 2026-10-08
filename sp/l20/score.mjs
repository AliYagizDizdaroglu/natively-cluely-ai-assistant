// L20: unblind the four graders' verdicts (two per packet) and apply PREREGISTER-l20.md verbatim.
// Grade slot 1 = packet A g1 + packet B g1, slot 2 = A g2 + B g2, so every answer has exactly two grades.
// Refuses on any missing, extra or malformed verdict. Writes RESULT.md.
//   node score.mjs            (L20_VERDICTS_DIR=<dir> points it at calibration verdicts; RESULT.md goes there)
import fs from 'node:fs';

const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const APP_P50_MS = 6812, APP_P90_MS = 9441; // pre-registered: s50k in-app first token after the question, 20 items
const VDIR = process.env.L20_VERDICTS_DIR ?? `${HERE}/blind`;
const OUT = process.env.L20_VERDICTS_DIR ? `${VDIR}/RESULT.md` : `${HERE}/RESULT.md`;
// holes: live38 items with no answer (blind.mjs did not send them to the graders) — not acceptable, a safety failure.
const { key, packets, holes = [] } = JSON.parse(fs.readFileSync(`${HERE}-key/key.json`, 'utf8'));
const items = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const app = JSON.parse(fs.readFileSync(`${HERE}/app-baseline.json`, 'utf8'));
const REPS = ['live38-r1', 'live38-r2', 'live38-r3'];
const APPS = ['app-inapp', 'app-twin1', 'app-twin2', 'app-twin3'];
const ARMS = [...APPS, ...REPS];
const live = Object.fromEntries(REPS.map((r, i) => [r, JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${i + 1}.answers.json`, 'utf8'))]));
const runs = REPS.map((r, i) => JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${i + 1}.json`, 'utf8')));

// Two grade slots, each the union of one grader per packet; each packet's file must cover exactly its keys.
const slots = [{}, {}];
for (const p of ['A', 'B']) {
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
const IDS = items.pairs.flat(), HARD = items.hard.flat(), NORMAL = items.normal.flat();
const acc = (x) => x.correctness === 2 && x.on_topic === 2 && x.delivery >= 1;
const isHole = (arm, id) => holes.includes(`${arm} ${id}`);
const keyOf = (arm, id) => {
    const k = Object.keys(key).find((x) => key[x] === arm && x.startsWith(`${id}#`));
    if (!k && !isHole(arm, id)) throw new Error(`no key and no hole for ${arm} ${id}`);
    return k;
};
const accN = (arm, id) => (isHole(arm, id) ? 0 : slots.filter((s) => acc(s[keyOf(arm, id)])).length);
const score = (arm, ids) => ids.reduce((n, id) => n + accN(arm, id), 0) / 2;
const consWrong = (arm) => IDS.filter((id) => !isHole(arm, id) && slots.every((s) => s[keyOf(arm, id)].correctness === 0)).length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const agree = Object.keys(key).filter((k) => acc(slots[0][k]) === acc(slots[1][k])).length;

const S = Object.fromEntries(ARMS.map((a) => [a, { all: score(a, IDS), hard: score(a, HARD), normal: score(a, NORMAL), cw: consWrong(a) }]));
const liveAll = mean(REPS.map((r) => S[r].all)), appAll = mean(APPS.map((a) => S[a].all));
const liveNormal = mean(REPS.map((r) => S[r].normal)), appNormal = mean(APPS.map((a) => S[a].normal));
const liveWorst = Math.min(...REPS.map((r) => S[r].all)), appWorst = Math.min(...APPS.map((a) => S[a].all));
const failures = REPS.flatMap((r) => IDS.filter((id) => { const a = live[r][id]; return !a?.played || a.systemError || a.empty || a.ttftMs == null; }).map((id) => `${r} ${id}`));
const appCW = APPS.reduce((n, a) => n + S[a].cw, 0), liveCW = REPS.reduce((n, r) => n + S[r].cw, 0);
const cwBar = 1 + Math.floor(appCW * 60 / 80);
const tt = REPS.flatMap((r) => IDS.map((id) => live[r][id]?.ttftMs ?? Infinity)).sort((a, b) => a - b);
const lw = REPS.flatMap((r) => IDS.map((id) => live[r][id]?.lastWordMs)).filter((x) => x != null).sort((a, b) => a - b);
const c = {
    q1: liveAll >= appAll - 1.0, q2: liveNormal >= appNormal - 1.0, band: liveWorst >= appWorst,
    safety: failures.length === 0 && liveCW <= cwBar, speed: pct(tt, 0.5) <= APP_P50_MS && pct(tt, 0.9) <= APP_P90_MS,
};
const verdict = Object.values(c).every(Boolean);
const premature = REPS.flatMap((r) => IDS.filter((id) => live[r][id]?.premature?.length).map((id) => `${r} ${id}`));
const drops = runs.flatMap((R, i) => R.sessions.filter((x) => x.abnormal).map((x) => `r${i + 1} ${x.pair[0]} attempt ${x.attempt} (code ${x.closed?.code}, answers ${x.complete ? 'complete' : 'INCOMPLETE'})`));
const retries = runs.reduce((n, R) => n + R.events.filter((e) => e.kind === 'retryPair').length, 0);
const s1 = (x) => (x === Infinity || x == null ? '—' : `${(x / 1000).toFixed(1)} s`);
const f1 = (x) => x.toFixed(1);
const PF = (b) => (b ? 'PASS' : 'FAIL');

const L = [];
L.push('# L20 result — gemini-3.8-live bare as the answerer, 20 scenario50 items × 3 runs, vs the app', '');
L.push(`Rule: PREREGISTER-l20.md (written before the runs). Graders: four independent claude-opus-5-5 agents (two per packet), blind, frozen rubric; agreement on acceptable ${agree}/${Object.keys(key).length}.`, '');
L.push('| sample | all 20 | hard 10 | normal 10 | consensus-wrong |', '|---|---|---|---|---|');
for (const a of ARMS) L.push(`| ${a} | ${f1(S[a].all)} | ${f1(S[a].hard)} | ${f1(S[a].normal)} | ${S[a].cw} |`);
L.push('', `Means — live38 ${f1(liveAll)} (hard ${f1(mean(REPS.map((r) => S[r].hard)))}, normal ${f1(liveNormal)}); app ${f1(appAll)} (hard ${f1(mean(APPS.map((a) => S[a].hard)))}, normal ${f1(appNormal)}).`, '');
L.push('## Timing (after the question ends)', '');
const appE = IDS.map((id) => app.items[id].e2eMs).filter((x) => x != null).sort((a, b) => a - b);
const appW = IDS.map((id) => app.items[id].wholeMs).filter((x) => x != null).sort((a, b) => a - b);
L.push(`- app (s50k in-app): first word p50 ${s1(pct(appE, .5))}, p90 ${s1(pct(appE, .9))}; whole answer p50 ${s1(pct(appW, .5))}, p90 ${s1(pct(appW, .9))}`);
L.push(`- live38 (60 answers): first word p50 ${s1(pct(tt, .5))}, p90 ${s1(pct(tt, .9))}; whole answer p50 ${s1(pct(lw, .5))}, p90 ${s1(pct(lw, .9))}`);
L.push('', '## Decision (pre-registered, all five)', '');
L.push(`1. quality, all 20: live38 ${f1(liveAll)} ≥ app ${f1(appAll)} − 1.0 → ${PF(c.q1)}`);
L.push(`2. quality, normal 10: live38 ${f1(liveNormal)} ≥ app ${f1(appNormal)} − 1.0 → ${PF(c.q2)}`);
L.push(`3. band: live38 worst run ${f1(liveWorst)} ≥ app worst sample ${f1(appWorst)} → ${PF(c.band)}`);
L.push(`4. safety: failures ${failures.length ? failures.join(', ') : 'none'}; consensus-wrong live38 ${liveCW} ≤ ${cwBar} (app ${appCW} of 80) → ${PF(c.safety)}`);
L.push(`5. speed: p50 ${s1(pct(tt, .5))} ≤ 6.8 s and p90 ${s1(pct(tt, .9))} ≤ 9.4 s → ${PF(c.speed)}`);
L.push('', `**Verdict: ${verdict ? 'REPLICATED — plan the in-app prototype (build after h40c, own pre-registered hour)' : 'NOT REPLICATED — no prototype; 3.8 Live stays a candidate ear only'}.**`, '');
L.push('## Outside the rule', '');
L.push(`- no-answer items (not graded, scored not acceptable): ${holes.length ? holes.join(', ') : 'none'}`);
L.push(`- premature starts (speech before the question ended): ${premature.length ? premature.join(', ') : 'none'}`);
L.push(`- abnormal disconnects: ${drops.length ? drops.join('; ') : 'none'}; pair retries: ${retries}`);
L.push('', '## Per question (acceptable grades of 2 per sample)', '', `| id | group | ${ARMS.join(' | ')} |`, `|---|---|${ARMS.map(() => '---').join('|')}|`);
for (const id of IDS) L.push(`| ${id} | ${HARD.includes(id) ? 'hard' : 'normal'} | ${ARMS.map((a) => (isHole(a, id) ? 'no answer' : accN(a, id))).join(' | ')} |`);
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log(L.join('\n'));
