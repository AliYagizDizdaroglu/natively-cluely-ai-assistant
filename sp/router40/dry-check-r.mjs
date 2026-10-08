// P2 dry self-test checker (live40's dry-check.mjs adapted): reads <dir>/<name>.json + .answers.json written by `run-r.mjs --dry --variant B --dry-fail C05` and checks
// chain order (SET-draft section 5, parsed here independently of items.json), the 16 follow-up gaps, the scripted replies' known timing ('hard' ends 6 s after its turn,
// silent items at 30 s), the retry, and that the events file holds no text. Prints check names and PASS/FAIL only.
//   node dry-check-r.mjs --dir <out dir> --name <name> [--expect-fail C05] [--scramble]   (--scramble swaps two items' labels first: a negative control)
import fs from 'node:fs';
import { MOCK, defaultKind } from './mock-session-r.mjs';
import { R40, loadItems } from './r40-common.mjs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = arg('--dir', `${R40}/runs`), NAME = arg('--name', 'router40-R-dry'), EXPECT_FAIL = arg('--expect-fail', null);
const rawEvents = fs.readFileSync(`${DIR}/${NAME}.json`, 'utf8');
const run = JSON.parse(rawEvents);
const answers = JSON.parse(fs.readFileSync(`${DIR}/${NAME}.answers.json`, 'utf8')).answers;
let events = run.events;
if (process.argv.includes('--scramble')) { const swap = { RE08: 'RE04', RE04: 'RE08' }; events = events.map((e) => (swap[e.item] && !String(e.item).includes('~') ? { ...e, item: swap[e.item] } : e)); }
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`); };
const ITEM = Object.fromEntries(loadItems().items.map((i) => [i.id, i]));

const mdLines = fs.readFileSync(`${R40}/SET-draft.md`, 'utf8').split('\n');
const i0 = mdLines.findIndex((l) => l.startsWith('C01 RE01')); let j0 = i0; while (/^C\d\d /.test(mdLines[j0])) j0++;
const line = mdLines.slice(i0, j0).join(' ').replace(/ +/g, ' ').trim();
const order5 = line.split(' · ').flatMap((s) => s.trim().replace(/\.$/, '').split(' ')[1].split('→'));
const chains5 = line.split(' · ').map((s) => s.trim().split(' ')[0]);

const starts = events.filter((e) => e.kind === 'clipStart' && !String(e.item).includes('~'));
check('47 turns played, no duplicates', starts.length === 47 && new Set(starts.map((e) => e.item)).size === 47, `got ${starts.length}`);
check('play order == SET-draft section 5 order', JSON.stringify(starts.map((e) => e.item)) === JSON.stringify(order5));
check('31 chainStart events in section 5 chain order', events.filter((e) => e.kind === 'chainStart').map((e) => e.chain).join() === chains5.join());
const finalSessions = run.sessions.filter((s) => !run.sessions.some((o) => o.chain === s.chain && o.attempt > s.attempt));
check('31 chains, the last attempt of each closed normally (1000)', finalSessions.length === 31 && finalSessions.every((s) => !s.abnormal && s.closed?.code === 1000), `${finalSessions.filter((s) => s.abnormal).length} abnormal`);
check('run recorded complete, variant B, R_SYSTEM sha12 4571f563321f', run.complete === true && run.variant === 'B' && run.rSystemSha12 === '4571f563321f', `${run.complete} ${run.variant} ${run.rSystemSha12}`);

const firstT = (c) => events.find((e) => e.kind === 'chainStart' && e.chain === c).t;
let seq = true; for (let i = 1; i < chains5.length; i++) { const prevClose = Math.max(...events.filter((e) => e.kind === 'close').map((e) => e.t).filter((t) => t < firstT(chains5[i]))); if (!(prevClose >= firstT(chains5[i - 1]))) seq = false; }
check('chains run one at a time (increasing starts, a close between)', seq && chains5.every((c, i) => i === 0 || firstT(c) > firstT(chains5[i - 1])));

let gapOk = true, gapMin = Infinity, gapMax = -Infinity, gaps = 0;
for (const c of run.chains) for (let n = 1; n < c.items.length; n++) {
    const done = events.find((e) => e.kind === 'itemDone' && e.item === c.items[n - 1]);
    const cs = events.find((e) => e.kind === 'clipStart' && e.item === c.items[n]);
    if (!done || !cs) { gapOk = false; continue; }
    gaps++; const g = cs.t - done.t; gapMin = Math.min(gapMin, g); gapMax = Math.max(gapMax, g);
    if (g < 10000 || g > 10200) gapOk = false;
}
check(`16 follow-ups gapped, each starting 10000 ms after the previous answer window ended (n ${gaps}, min ${gapMin}, max ${gapMax})`, gaps === 16 && gapOk);

// the scripted replies' known timing
let bad = [];
const kinds = { hard: 0, words40: 0, silent: 0 };
for (const id of order5) {
    const m = run.metrics[id], a = answers[id], kind = defaultKind(ITEM[id]);
    kinds[kind]++;
    let ok = !!m && !!a && m.earlyOutputTx === 0 && m.closes.every((c) => c.code === 1000);
    if (kind === 'silent') ok = ok && m.words === 0 && m.endReason === 'noOutput' && a.text === '' && m.turnWords.length === 0 && (() => { const d = events.find((e) => e.kind === 'itemDone' && e.item === id); return d.waitedMs >= 30000 && d.waitedMs < 30060; })();
    else {
        const d = events.find((e) => e.kind === 'itemDone' && e.item === id);
        const sixAfterTurn = d.waitedMs - m.lastTurnCompleteMs;
        ok = ok && m.endReason === 'quietAfterTurn' && m.turnWords.length === 1 && m.turnWords[0].endKind === 'turnComplete' && sixAfterTurn >= 6000 && sixAfterTurn < 6070
            && m.generationCompleteMs - m.lastOutputTextMs === MOCK.GEN_MS && m.turnCompleteMs - m.generationCompleteMs === MOCK.TURN_MS
            && m.words === (kind === 'hard' ? 1 : MOCK.PIECES * MOCK.PIECE_WORDS) && a.text.trim().split(/\s+/).length === m.words && a.turns.length === 1 && a.turns[0].endKind === 'turnComplete'
            && (kind === 'hard' ? /^hard\W*$/i.test(a.text) : true);
    }
    if (!ok) bad.push(id);
}
check(`47 turns match their scripted replies (${kinds.words40} words40, ${kinds.hard} 'hard', ${kinds.silent} silent): hard/words40 end 6 s after their turnComplete, silent at 30 s`, bad.length === 0 && kinds.silent === 1, bad.join(','));
if (EXPECT_FAIL) {
    const c = run.sessions.filter((s) => s.chain === EXPECT_FAIL);
    check(`${EXPECT_FAIL}: attempt 1 abnormal (1011) and incomplete, attempt 2 closed normally`, c.length === 2 && c[0].abnormal && c[0].closed.code === 1011 && !c[0].complete && !c[1].abnormal && c[1].closed.code === 1000);
    const failedItems = run.chains.find((x) => x.chain === EXPECT_FAIL).items;
    check(`${EXPECT_FAIL}: the failed attempt is kept as <id>~a1, the final answer present`, failedItems.some((id) => !!run.metrics[`${id}~a1`]) && failedItems.every((id) => Number.isFinite(run.metrics[id].clipEndMs)));
    check(`only ${EXPECT_FAIL} retried`, run.sessions.filter((s) => s.attempt === 2).length === 1);
    check('guardLog holds a guard line before the retry', run.guardLog.some((g) => g.before === `${EXPECT_FAIL}#2 (retry)`));
}
check('guard ran before every chain attempt (start + one per attempt)', run.guardLog.length === 1 + run.sessions.length, `${run.guardLog.length} vs ${1 + run.sessions.length}`);
check('events file holds no transcript text', !rawEvents.includes('mock answer') && !events.some((e) => 'text' in e || '_text' in e));
check('answers file holds the transcripts', order5.every((id) => defaultKind(ITEM[id]) === 'silent' || answers[id].text.length > 0));
check('no audio written: audio events carry byte counts only', events.filter((e) => e.kind === 'audio').every((e) => Number.isFinite(e.bytes) && !('data' in e)));
console.log(results.every(Boolean) ? 'DRY CHECK: ALL PASS' : `DRY CHECK: ${results.filter((r) => !r).length} FAILED`);
process.exit(results.every(Boolean) ? 0 : 1);
