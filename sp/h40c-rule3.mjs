// Rule 3 of PREREGISTER-h40c.md, read from the MERGED judge files (never from raw verdicts), plus the
// per-item twin reading the pre-registration asks to be reported (never gating).
//   node h40c-rule3.mjs <run-dir> [<id>=<winner model> ...]
// Winners default to gemini-3.5-flash-lite; the by-hand join from the hour's won-by lines passes the
// exceptions (h40c: R20=gemini-3.1-flash-lite, the one window 3.1-lite won, 11:17:13Z).
// Counting rulings (h40c-grader-dispatch.txt, written before any verdict): acceptable counts roster
// ITEMS (per-item best answer; unanswered = not acceptable); the zero-wrong clause counts EVERY
// delivered answer on the 40 non-excluded items, a double's second answer included.
import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2];
const winners = Object.fromEntries(process.argv.slice(3).map((a) => a.split('=')));
const EXCLUDED = ['R02F', 'R04F', 'R09F', 'R11F', 'R13F'];
const RANK = { acceptable: 2, weak: 1, wrong: 0 };
const read = (f) => JSON.parse(fs.readFileSync(path.join(run, f), 'utf8'));

const timeline = read('interview60.timeline.json');
const roster = timeline.items.filter((i) => (i.kind ?? 'spoken') === 'spoken').map((i) => i.id);
const inApp = read('interview60.judge.json');
console.log(`in-app judge: grader ${inApp.graderModel}, stamp ${inApp.graderPrompt}, ${Object.keys(inApp.items).length} graded answers`);

const byId = new Map();
for (const [key, v] of Object.entries(inApp.items)) {
    const id = v.id ?? key.replace(/#\d+$/, '');
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push({ key, verdict: v.verdict, c: v.correctness, t: v.on_topic, d: v.delivery, reason: v.reason });
}
const best = (id) => (byId.get(id) ?? []).map((a) => a.verdict).sort((a, b) => RANK[b] - RANK[a])[0] ?? 'unanswered';
const isFollow = (id) => /F\d*$/.test(id);

const perItem = roster.map((id) => ({ id, best: best(id) }));
const acc = perItem.filter((x) => x.best === 'acceptable').length;
const mains = perItem.filter((x) => !isFollow(x.id));
const fups = perItem.filter((x) => isFollow(x.id));
const cnt = (arr, v) => arr.filter((x) => x.best === v).length;
console.log(`roster ${roster.length} items (${mains.length} mains, ${fups.length} follow-ups)`);
console.log(`ACCEPTABLE (items) ${acc} of ${roster.length}  | mains ${cnt(mains, 'acceptable')}/${mains.length}, follow-ups ${cnt(fups, 'acceptable')}/${fups.length}`);
console.log(`per-item best: ${JSON.stringify(perItem.reduce((a, x) => ((a[x.best] = (a[x.best] ?? 0) + 1), a), {}))}`);

const wrongAnswers = [...byId.entries()].flatMap(([id, as]) => as.filter((a) => a.verdict === 'wrong').map((a) => ({ id, ...a })));
const gated = wrongAnswers.filter((w) => !EXCLUDED.includes(w.id));
const excl = wrongAnswers.filter((w) => EXCLUDED.includes(w.id));
console.log(`WRONG answers on the 40 gated items: ${gated.length}${gated.length ? ' -> ' + gated.map((w) => `${w.key} (${w.reason})`).join(' | ') : ''}`);
console.log(`wrong answers on the 5 excluded follow-ups (reported, not gated): ${excl.length}${excl.length ? ' -> ' + excl.map((w) => w.key).join(', ') : ''}`);
console.log(`RULE 3: ${acc >= 35 && gated.length === 0 ? 'PASS' : 'FAIL'} (needs >= 35 of 45 acceptable AND 0 wrong on the 40)`);

console.log('\nnot acceptable (per answer):');
for (const [id, as] of byId) for (const a of as) if (a.verdict !== 'acceptable') console.log(`  ${a.key.padEnd(7)} ${a.verdict.padEnd(10)} c${a.c} t${a.t} d${a.d}  ${a.reason}`);
for (const id of roster) if (!byId.has(id)) console.log(`  ${id.padEnd(7)} unanswered  (no in-app answer)`);

// Twin reading (reported, never gating): each item against the captured twins of the model that won it.
const TWINS = {
    'gemini-3.1-flash-lite': ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3'],
    'gemini-3.5-flash-lite': ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3'],
};
const arms = {};
for (const list of Object.values(TWINS)) for (const tag of list) {
    const f = `interview60.judge.${tag}.json`;
    arms[tag] = fs.existsSync(path.join(run, f)) ? read(f) : null;
}
console.log('\ntwin arms (acceptable / graded, grader):');
for (const [tag, j] of Object.entries(arms)) {
    if (!j) { console.log(`  ${tag}: NOT MERGED`); continue; }
    const vs = Object.values(j.items).map((v) => v.verdict);
    console.log(`  ${tag}: ${vs.filter((v) => v === 'acceptable').length} / ${vs.length}, wrong ${vs.filter((v) => v === 'wrong').length}, grader ${j.graderModel}, stamp ${j.graderPrompt}`);
}
console.log('\nper item: in-app best | winner | its twins r1 r2 r3 | the other model\'s twins  (* = in-app below all three of its twins, + = above all three)');
const abbr = { acceptable: 'A', weak: 'w', wrong: 'X', unanswered: '-' };
for (const id of roster) {
    const win = winners[id] ?? 'gemini-3.5-flash-lite';
    const other = win === 'gemini-3.5-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite';
    const tw = (m) => TWINS[m].map((t) => abbr[arms[t]?.items?.[id]?.verdict ?? 'unanswered']);
    const mine = tw(win);
    const b = best(id);
    const r = RANK[b] ?? -1;
    const ranks = TWINS[win].map((t) => RANK[arms[t]?.items?.[id]?.verdict] ?? -1);
    const flag = ranks.every((x) => x > r) ? '*' : ranks.every((x) => x < r && x >= 0) ? '+' : ' ';
    console.log(`  ${id.padEnd(6)} ${abbr[b]} ${flag} ${win === 'gemini-3.5-flash-lite' ? '3.5H' : '3.1L'} | ${mine.join(' ')} | ${tw(other).join(' ')}`);
}
