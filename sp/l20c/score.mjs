// L20c: unblind the eight graders' verdicts (two per packet, packets A-D) and apply PREREGISTER-l20c.md verbatim.
// Grade slot 1 = A-D g1, slot 2 = A-D g2, so every graded answer has exactly two grades. Refuses on any missing,
// extra or malformed verdict. Writes RESULT-l20c.md (or RESULT.md in a calibration verdicts dir).
//   node score.mjs            (L20C_VERDICTS_DIR=<dir> points it at calibration verdicts)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gateStatus } from './gate.mjs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/l20c`;
const VDIR = process.env.L20C_VERDICTS_DIR ?? `${HERE}/blind`;
const OUT = process.env.L20C_VERDICTS_DIR ? `${VDIR}/RESULT.md` : `${HERE}/RESULT-l20c.md`;
const { key, packets, holes = [], arms } = JSON.parse(fs.readFileSync(`${SP}/l20c-key/key.json`, 'utf8'));
const oldItems = JSON.parse(fs.readFileSync(`${SP}/l20b/items.json`, 'utf8'));
const newItems = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const IDS = [...oldItems.pairs, ...newItems.pairs].flat();
const HARD = oldItems.hard.flat(), NORMAL = IDS.filter((id) => !HARD.includes(id)), NEW = newItems.pairs.flat();
const REPS = ['live38-r1', 'live38-r2', 'live38-r3'];
const APPS = ['app35-inapp', 'app35-twin1', 'app35-twin2', 'app35-twin3'];
const EXTRA = arms.filter((a) => !REPS.includes(a) && !APPS.includes(a));
const ARMS = [...APPS, ...REPS, ...EXTRA];

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
const keyOf = (arm, id) => {
    const k = Object.keys(key).find((x) => key[x] === arm && x.startsWith(`${id}#`));
    if (!k && !isHole(arm, id)) throw new Error(`no key and no hole for ${arm} ${id}`);
    return k;
};
const accN = (arm, id) => (isHole(arm, id) ? 0 : slots.filter((s) => acc(s[keyOf(arm, id)])).length);
const answered = (arm, ids) => ids.filter((id) => !isHole(arm, id));
const count = (arm, ids) => ids.reduce((n, id) => n + accN(arm, id), 0) / 2;               // holes as not acceptable
const rate = (arm, ids) => { const a = answered(arm, ids); return a.length ? count(arm, a) / a.length : NaN; }; // the racer read
const consWrong = (arm) => answered(arm, IDS).filter((id) => slots.every((s) => s[keyOf(arm, id)].correctness === 0)).length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const agree = Object.keys(key).filter((k) => acc(slots[0][k]) === acc(slots[1][k])).length;

// ---- condition 4: L20c's own runs (the same predicate as mechanics-l20c.mjs) -----------------------------
const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
const liveOf = (r, id) => JSON.parse(fs.readFileSync(`${SP}/${NEW.includes(id) ? 'l20c' : 'l20b'}/runs/live38-r${r}.answers.json`, 'utf8'))[id];
const newAnswered = [1, 2, 3].reduce((n, r) => n + NEW.filter((id) => isAnswered(liveOf(r, id))).length, 0);

// ---- the rule ----------------------------------------------------------------------------------------------
const S = Object.fromEntries(ARMS.map((a) => [a, { rate: rate(a, IDS), count: count(a, IDS), hard: rate(a, HARD), normal: rate(a, NORMAL), cw: consWrong(a), holes: IDS.length - answered(a, IDS).length }]));
const liveMean = mean(REPS.map((r) => S[r].rate)), appMean = mean(APPS.map((a) => S[a].rate));
const liveWorst = Math.min(...REPS.map((r) => S[r].rate)), appWorst = Math.min(...APPS.map((a) => S[a].rate));
const liveCW = REPS.reduce((n, r) => n + S[r].cw, 0), appCW = APPS.reduce((n, a) => n + S[a].cw, 0);
const cwBar = 1 + Math.floor(appCW * 0.75);
const gate = gateStatus();
const c = { q: liveMean >= appMean - 0.05, band: liveWorst >= appWorst, safety: liveCW <= cwBar, rel: newAnswered >= 52, gate: gate.status };
const verdict = !(c.q && c.band && c.safety) ? 'STOP — Live answers are not good enough to be shown first; no racer'
    : c.gate === 'PENDING' ? `PROVISIONAL — quality conditions 1-3 pass; reliability tonight ${c.rel ? 'PASS' : 'FAIL'}; the 3-day gate is PENDING (final verdict after Thu 1 Oct 20:00)`
        : c.rel && c.gate === 'PASS' ? 'PROCEED — start the racer path (spikes, spec, review, flag-off build, smoke, own flight, holdout validation)'
            : 'WAIT — quality holds, reliability unproven; no build; a later reliability re-test needs its own registration';

// ---- timing, reported: Live first word vs the app's first token after the question ends (e2e-35.mjs method) --
const { computeRun } = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const s50mDir = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const m = computeRun(s50mDir);
const tl = JSON.parse(fs.readFileSync(`${s50mDir}/interview60.timeline.json`, 'utf8'));
const off = tl.clock === 'playsync' ? 0 : 1150;
const firstTokens = [...fs.readFileSync(`${s50mDir}/verbal-diag.log`, 'utf8').matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((x) => Date.parse(x[1]));
const appE2E = IDS.map((id) => { const it = m.items.find((i) => i.id === id); const ft = it?.answeredAt == null ? null : firstTokens.find((t) => t >= it.answeredAt && t <= it.answeredAt + 60000); return ft ? ft - (it.spokeEnd + off) : null; }).filter((x) => x != null).sort((a, b) => a - b);
const liveTT = REPS.flatMap((r, i) => IDS.map((id) => { const a = liveOf(i + 1, id); return isAnswered(a) ? a.ttftMs : Infinity; })).sort((a, b) => a - b);
const s1 = (x) => (x === Infinity || x == null ? '—' : `${(x / 1000).toFixed(1)} s`);
const f2 = (x) => (Number.isNaN(x) ? '—' : x.toFixed(3));
const PF = (b) => (b ? 'PASS' : 'FAIL');

const L = [];
L.push('# L20c result — 3.8 Live (bare) vs the app with 3.5-flash-lite HIGH first, 38 scenario50 items', '');
L.push(`Rule: PREREGISTER-l20c.md (written before any L20c audio and before any grading). Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable ${agree}/${Object.keys(key).length}.`, '');
L.push('| sample | rate, answered only | acceptable of 38 (holes = not) | hard 10 | normal 28 | consensus-wrong | holes |', '|---|---|---|---|---|---|---|');
for (const a of ARMS) L.push(`| ${a}${EXTRA.includes(a) ? ' (reported only)' : ''} | ${f2(S[a].rate)} | ${S[a].count.toFixed(1)} | ${f2(S[a].hard)} | ${f2(S[a].normal)} | ${S[a].cw} | ${S[a].holes} |`);
L.push('', `Means (answered-only rate): Live ${f2(liveMean)}; app ${f2(appMean)}.`, '');
L.push('## Decision (pre-registered)', '');
L.push(`1. quality: Live mean rate ${f2(liveMean)} ≥ app mean rate ${f2(appMean)} − 0.05 → ${PF(c.q)}`);
L.push(`2. band: Live worst rep ${f2(liveWorst)} ≥ app worst sample ${f2(appWorst)} → ${PF(c.band)}`);
L.push(`3. safety: Live consensus-wrong ${liveCW} ≤ 1 + ⌊${appCW} × 0.75⌋ = ${cwBar} → ${PF(c.safety)}`);
L.push(`4. reliability tonight: L20c answered ${newAnswered}/54, need ≥ 52 → ${PF(c.rel)}`);
L.push(`5. the scheduled 3-day gate: ${c.gate}`);
for (const sl of gate.slots) L.push(`   - ${sl.label} ${sl.state} ${sl.why}`);
L.push('', `**Verdict: ${verdict}.**`, '');
L.push('## Timing (reported, not a condition; after the question ends)', '');
L.push(`- app, s50m in-app (3.5-lite HIGH first), first token on the 38 items: p50 ${s1(pct(appE2E, 0.5))}, p90 ${s1(pct(appE2E, 0.9))} (n=${appE2E.length})`);
L.push(`- Live, first word over ${liveTT.length} (a hole = no first word): p50 ${s1(pct(liveTT, 0.5))}, p90 ${s1(pct(liveTT, 0.9))}`);
L.push('', '## Outside the rule', '');
L.push(`- holes (not graded): ${holes.length ? holes.join(', ') : 'none'}`);
L.push('', '## Per question (acceptable grades of 2 per sample)', '', `| id | group | ${ARMS.join(' | ')} |`, `|---|---|${ARMS.map(() => '---').join('|')}|`);
for (const id of IDS) L.push(`| ${id} | ${HARD.includes(id) ? 'hard' : 'normal'} | ${ARMS.map((a) => (isHole(a, id) ? 'hole' : accN(a, id))).join(' | ')} |`);
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log(L.join('\n'));
