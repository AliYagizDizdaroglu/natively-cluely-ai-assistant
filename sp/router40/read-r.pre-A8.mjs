// P3 read-r.mjs: R's reader (registration 3.3, A1.5, A2.5, A4): the route class of each item, computed from the run's events + answers, no judgement.
// l38r/read.mjs's classes extended: first matching row wins, in this order:
//   missing, silent, hard, apology, malformed, cut, early, too-long (> 80 under B, > 150 under A), answer.
// Prints ids, classes, counts only (never a text). A class other than `answer` shows L's text in R.
//   node read-r.mjs --name router40-R [--dir <runs dir>] [--variant B] [--l38base <labels.json>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { R40, L40, words, normWords, BLOCKS, REGISTERED, loadInstruction, readJson, loadItems, argOf } from './r40-common.mjs';

export const CLASSES = ['answer', 'hard', 'silent', 'missing', 'apology', 'malformed', 'cut', 'early', 'too-long']; // the nine classes
const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'it', 'and', 'of', 'to', 'in', 'for', 'you', 'i', 'that', 'this', 'with', 'on']);
const letters = (w) => String(w).toLowerCase().replace(/[^a-z]/g, '');
const grams = (arr, n = 8) => { const s = new Set(); for (let i = 0; i + n <= arr.length; i++) s.add(arr.slice(i, i + n).join(' ')); return s; };
const sharedCache = {};
function sourceGrams(variant) {
    return (sharedCache[variant] ??= new Set([...grams(normWords(loadInstruction())), ...grams(normWords(BLOCKS[variant]))]));
}

/**
 * rec: { played, abnormalCloseAfterClip, turns: [{ text, endKind }], lastTurnTerminated, earlyWords }
 *   endKind: 'turnComplete' | 'interrupted' | 'open'; lastTurnTerminated: a turnComplete or generationComplete follows the last output.
 * Returns { cls, w, hardTail, why }.
 */
export function classify(rec, { variant = 'B' } = {}) {
    if (!rec.played) return { cls: 'missing', w: 0, why: 'not played to clipEnd' };
    const T = rec.turns.map((t) => t.text).join(' ').trim();
    const w = words(T);
    if (w === 0) return rec.abnormalCloseAfterClip ? { cls: 'missing', w: 0, why: 'abnormal close before any post-clip output' } : { cls: 'silent', w: 0 };
    const toks = T.split(/\s+/).map(letters);
    const first = toks[0];
    if (first === 'hard') return { cls: 'hard', w, hardTail: w > 1 };
    if (/system error/i.test(T)) return { cls: 'apology', w };
    // malformed (registration + A1.5)
    let why = null;
    if (/[<>[]/.test(T)) why = 'has < > or [';
    else if (toks.slice(0, 12).includes('hard')) why = 'hard among the first 12 words, not first';
    else if (toks.slice(-3).includes('hard')) why = 'hard among the last 3 words';
    else if (rec.turns.filter((t) => t.endKind !== 'open').length > 1 && rec.turns.some((t, i) => i > 0 && letters(t.text.trim().split(/\s+/)[0] ?? '') === 'hard')) why = 'a later completed turn starts with hard';
    else {
        const nw = normWords(T);
        if (nw.length >= 8) { const sg = sourceGrams(variant); for (const g of grams(nw)) if (sg.has(g)) { why = 'recital: 8 consecutive words shared with INSTRUCTION/BLOCK'; break; } }
        if (!why && w >= 8 && !toks.some((t) => STOP.has(t))) why = 'no common English function word in >= 8 words';
    }
    if (why) return { cls: 'malformed', w, why };
    if (!rec.lastTurnTerminated) return { cls: 'cut', w, why: 'the last output turn has no turnComplete/generationComplete' };
    if (rec.earlyWords >= 1) return { cls: 'early', w, why: `${rec.earlyWords} words before clipEnd` };
    if (w > REGISTERED[variant].tooLong) return { cls: 'too-long', w };
    return { cls: 'answer', w };
}

/** A normalized record for item `id` from a run's events (+ the answers entry when the events carry no text). */
export function recordFromEvents(events, id, ans) {
    const mine = events.filter((e) => e.item === id); // `<id>~a1` labels are the failed attempt: not read
    const ci = mine.findIndex((e) => e.kind === 'clipEnd');
    const played = ci >= 0;
    const rec = { played, abnormalCloseAfterClip: false, turns: [], lastTurnTerminated: true, earlyWords: 0 };
    if (!played) return rec;
    const before = mine.slice(0, ci), after = mine.slice(ci + 1);
    const hasText = mine.some((e) => e.kind === 'outputTx' && e._text !== undefined);
    rec.earlyWords = hasText ? words(before.filter((e) => e.kind === 'outputTx').map((e) => e._text ?? '').join('')) : words(ans?.textBeforeClipEnd ?? '');
    rec.abnormalCloseAfterClip = after.some((e) => e.kind === 'close' && e.code !== 1000 && e.code != null);
    // turn segments from the events
    const segs = []; let cur = null, lastOut = -1;
    after.forEach((e, i) => {
        if (e.kind === 'outputTx') { cur ??= { text: '', endKind: 'open' }; cur.text += e._text ?? ''; lastOut = i; }
        else if ((e.kind === 'turnComplete' || e.kind === 'interrupted') && cur) { cur.endKind = e.kind; segs.push(cur); cur = null; }
    });
    if (cur) segs.push(cur);
    rec.lastTurnTerminated = lastOut < 0 ? true : after.slice(lastOut + 1).some((e) => e.kind === 'turnComplete' || e.kind === 'generationComplete');
    if (!hasText) {
        if (ans?.turns && ans.turns.length === segs.length) segs.forEach((s, i) => { s.text = ans.turns[i].text; });
        else if (segs.length <= 1) { if (segs.length === 1) segs[0].text = ans?.text ?? ''; }
        else throw new Error(`${id}: ${segs.length} turns but no per-turn text in the answers file`);
    }
    rec.turns = segs.map((s) => ({ text: s.text.trim(), endKind: s.endKind }));
    return rec;
}

export function readRun(run, answersFile, { variant = 'B' } = {}) {
    const { items, chains } = loadItems();
    const A = answersFile.answers ?? answersFile;
    const rows = items.map((it) => {
        const rec = recordFromEvents(run.events, it.id, A[it.id]);
        const c = classify(rec, { variant });
        return { id: it.id, route: it.route, cls: it.class, chain: it.chain, rc: c.cls, w: c.w, hardTail: !!c.hardTail, why: c.why, T: rec.turns.map((t) => t.text).join(' ').trim(), earlyWords: rec.earlyWords };
    });
    return { rows, items, chains };
}

const groupOf = (r) => (r.cls === 'E' ? 'EASY' : r.cls === 'H' ? 'HARD standalone' : 'HARD follow-up');
export function confusion(rows, keyOf, order) {
    const t = {};
    for (const k of order) t[k] = Object.fromEntries(CLASSES.map((c) => [c, 0]));
    for (const r of rows) { const k = keyOf(r); if (k in t) t[k][r.rc]++; }
    return t;
}
export const printConfusion = (title, t, say = console.log) => {
    say(`${title}\n  ${'row'.padEnd(18)}${CLASSES.map((c) => c.padStart(10)).join('')}   n`);
    for (const [k, v] of Object.entries(t)) say(`  ${k.padEnd(18)}${CLASSES.map((c) => String(v[c]).padStart(10)).join('')}  ${String(Object.values(v).reduce((a, b) => a + b, 0)).padStart(2)}`);
};

function main() {
    const argv = process.argv.slice(2);
    const name = argOf(argv, '--name') ?? 'router40-R', dir = argOf(argv, '--dir') ?? `${R40}/runs`, variant = argOf(argv, '--variant') ?? 'B';
    const run = readJson(`${dir}/${name}.json`), ans = readJson(`${dir}/${name}.answers.json`);
    const { rows } = readRun(run, ans, { variant });
    const say = console.log;
    say(`${name}: ${rows.length} items, variant ${variant} (too-long > ${REGISTERED[variant].tooLong}); run complete ${run.complete}`);
    for (const r of rows) say(`  ${r.id.padEnd(5)} ${r.cls.padEnd(2)} ${r.rc.padEnd(9)} w=${String(r.w).padStart(3)}${r.hardTail ? ' hard+tail' : ''}${r.earlyWords ? ` early=${r.earlyWords}` : ''}${r.why ? `  (${r.why})` : ''}`);
    printConfusion('by live40 class', confusion(rows, (r) => r.cls, ['E', 'H', 'QF', 'AF']), say);
    printConfusion('by live40 group', confusion(rows, groupOf, ['EASY', 'HARD standalone', 'HARD follow-up']), say);
    const l38 = argOf(argv, '--l38base');
    if (l38) { const L = readJson(l38); printConfusion('by l38base consensus label', confusion(rows, (r) => L[r.id] ?? 'split', ['EASY', 'HARD', 'split']), say); }
    const M = rows.filter((r) => r.rc === 'missing');
    say(`EASY caught ${rows.filter((r) => r.cls === 'E' && r.rc === 'answer').length}/20; AF answered ${rows.filter((r) => r.cls === 'AF' && r.rc === 'answer').length}/7; QF answered ${rows.filter((r) => r.cls === 'QF' && r.rc === 'answer').length}/9; H answered ${rows.filter((r) => r.cls === 'H' && r.rc === 'answer').length}/11; M ${M.length} [${M.map((r) => r.id).join(',')}]; max words ${Math.max(...rows.map((r) => r.w))}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
