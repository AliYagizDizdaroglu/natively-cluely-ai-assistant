// live40 dry self-test checker: reads runs/<name>.json + .answers.json written by `run.mjs --dry --dry-fail C05` and checks chain order (against
// SET-draft section 5, parsed here independently of items.json), follow-up gaps, metric fields (known values from mock-session.mjs), the retry, and that the events file holds no text.
//   node dry-check.mjs --name live40-dry [--expect-gap 10000] [--scramble]   (--scramble swaps two chains in the run file first: a negative control)
// Prints check names and PASS/FAIL only.
import fs from 'node:fs';
import { MOCK } from './mock-session.mjs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NAME = arg('--name', 'live40-dry'), EXPECT_GAP = Number(arg('--expect-gap', 10000));
const run = JSON.parse(fs.readFileSync(`${SP}/live40/runs/${NAME}.json`, 'utf8'));
const answers = JSON.parse(fs.readFileSync(`${SP}/live40/runs/${NAME}.answers.json`, 'utf8')).answers;
const rawEvents = fs.readFileSync(`${SP}/live40/runs/${NAME}.json`, 'utf8');
let events = run.events;
if (process.argv.includes('--scramble')) { // negative control: relabel two chains' items so the played order differs from section 5
    const swap = { RE08: 'RE04', RE04: 'RE08', EF03: 'EF03' };
    events = events.map((e) => (swap[e.item] && !String(e.item).includes('~') ? { ...e, item: swap[e.item] } : e));
}
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`); };

// section 5 order, parsed from the markdown
const md = fs.readFileSync(`${SP}/router40/SET-draft.md`, 'utf8');
const mdLines = md.split('\n'); const i0 = mdLines.findIndex((l) => l.startsWith('C01 RE01')); let j0 = i0; while (/^C\d\d /.test(mdLines[j0])) j0++; // the chain lines; the prose after them starts with a digit
const line = mdLines.slice(i0, j0).join(' ').replace(/ +/g, ' ').trim();
const order5 = line.split(' · ').flatMap((s) => s.trim().replace(/\.$/, '').split(' ')[1].split('→'));
const chains5 = line.split(' · ').map((s) => s.trim().split(' ')[0]);

const starts = events.filter((e) => e.kind === 'clipStart' && !String(e.item).includes('~'));
check('47 turns played, no duplicates', starts.length === 47 && new Set(starts.map((e) => e.item)).size === 47, `got ${starts.length}`);
check('play order == SET-draft section 5 order', JSON.stringify(starts.map((e) => e.item)) === JSON.stringify(order5));
const chainStarts = events.filter((e) => e.kind === 'chainStart').map((e) => e.chain ?? e.items?.join('')); // chainStart carries chain
check('31 chainStart events in section 5 chain order', events.filter((e) => e.kind === 'chainStart').map((e) => e.chain).join() === chains5.join());
const finalSessions = run.sessions.filter((s) => !run.sessions.some((o) => o.chain === s.chain && o.attempt > s.attempt));
check('31 chains, last attempt of each complete', finalSessions.length === 31 && finalSessions.every((s) => s.complete), `${finalSessions.filter((s) => !s.complete).length} incomplete`);

// sessions one at a time: each chain's first event is after the previous chain's close
const firstT = (c) => events.find((e) => e.kind === 'chainStart' && e.chain === c).t;
let seq = true; for (let i = 1; i < chains5.length; i++) { const prevClose = Math.max(...events.filter((e) => e.kind === 'close').map((e) => e.t).filter((t) => t < firstT(chains5[i]))); if (!(prevClose >= firstT(chains5[i - 1]))) seq = false; }
check('chains run one at a time (increasing starts, a close between)', seq && chains5.every((c, i) => i === 0 || firstT(c) > firstT(chains5[i - 1])));

// follow-up gaps: next clipStart - previous itemDone >= GAP (and not much more) inside every chain
const chainsDef = run.chains;
let gapOk = true, gapMin = Infinity, gapMax = -Infinity;
for (const c of chainsDef) for (let n = 1; n < c.items.length; n++) {
    const done = events.find((e) => e.kind === 'itemDone' && e.item === c.items[n - 1]);
    const cs = events.find((e) => e.kind === 'clipStart' && e.item === c.items[n]);
    if (!done || !cs) { gapOk = false; continue; }
    const g = cs.t - done.t; gapMin = Math.min(gapMin, g); gapMax = Math.max(gapMax, g);
    if (g < EXPECT_GAP || g > EXPECT_GAP + 200) gapOk = false;
}
check(`follow-up starts ${EXPECT_GAP} ms after the previous answer window ended (min ${gapMin}, max ${gapMax})`, gapOk);
check('16 follow-ups gapped', chainsDef.reduce((a, c) => a + c.items.length - 1, 0) === 16);

// metric fields, against the mock's known script
let fieldsOk = true, bad = [];
for (const id of order5) {
    const m = run.metrics[id], a = answers[id];
    const req = ['clipEndMs', 'firstOutputTextMs', 'firstAudioMs', 'lastOutputTextMs', 'generationCompleteMs', 'turnCompleteMs'];
    const short = m.words === MOCK.SHORT_WORDS;
    const ok = m && req.every((k) => Number.isFinite(m[k])) && m.firstAudioMs < m.firstOutputTextMs
        && m.firstOutputTextMs - m.firstAudioMs === MOCK.TEXT_MS - MOCK.AUDIO_MS
        && m.lastOutputTextMs - m.firstOutputTextMs === (short ? 0 : (MOCK.PIECES - 1) * MOCK.PIECE_MS)
        && m.generationCompleteMs - m.lastOutputTextMs === MOCK.GEN_MS && m.turnCompleteMs - m.generationCompleteMs === MOCK.TURN_MS
        && (short ? m.words === MOCK.SHORT_WORDS : m.words === MOCK.PIECES * MOCK.PIECE_WORDS) && m.earlyOutputTx === 0 && m.earlyAudio === 0
        && a && a.words === m.words && a.text.trim().split(/\s+/).length === m.words && m.turnWords.length === 1;
    if (!ok) { fieldsOk = false; bad.push(id); }
}
check('all 47 turns: firstOutputText/firstAudio/lastOutputText/generationComplete/turnComplete/words match the mock script', fieldsOk, bad.join(','));
const shorts = order5.filter((id) => run.metrics[id].words === MOCK.SHORT_WORDS);
check(`short answers (${shorts.length}) wait the 30 s quiet path, long ones the 6 s path`, shorts.length > 0 && shorts.every((id) => run.metrics[id].endReason === 'quietAfterShort') && order5.filter((i) => !shorts.includes(i)).every((id) => run.metrics[id].endReason === 'quietAfterAnswer'));

// retry (C05 = RE08 failed on attempt 1)
const c5 = run.sessions.filter((s) => s.chain === 'C05');
check('C05: attempt 1 abnormal (1011) and incomplete, attempt 2 complete', c5.length === 2 && c5[0].abnormal && c5[0].closed.code === 1011 && !c5[0].complete && c5[1].complete && c5[1].closed.code === 1000);
check('C05: failed attempt kept as RE08~a1, final RE08 answered', !!run.metrics['RE08~a1'] && Number.isFinite(run.metrics.RE08.generationCompleteMs));
check('only C05 retried', run.sessions.filter((s) => s.attempt === 2).length === 1);

// no transcript text in the events file; transcripts present in the answers file
check('events file holds no transcript text', !rawEvents.includes('mock mock') && !events.some((e) => 'text' in e || '_text' in e));
check('answers file holds the transcripts', order5.every((id) => answers[id].text.includes('mock')));
check('instruction hash recorded', run.instruction.startsWith('e29bf381'));
check('every metric key present in the schema', ['clipEndMs', 'firstOutputTextMs', 'firstAudioMs', 'lastOutputTextMs', 'generationCompleteMs', 'turnCompleteMs', 'words', 'earlyOutputTx', 'errors', 'closes', 'endReason'].every((k) => k in run.metrics.RE01));
console.log(results.every(Boolean) ? 'DRY CHECK: ALL PASS' : `DRY CHECK: ${results.filter((r) => !r).length} FAILED`);
process.exit(results.every(Boolean) ? 0 : 1);
