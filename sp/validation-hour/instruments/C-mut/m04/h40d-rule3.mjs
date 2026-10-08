// Rule 3 of PREREGISTER-h40d.r4.md, read from the MERGED judge files in the run folder (never from raw verdicts): 3a and 3b (gated),
// rule 3a's NOISE reading, and the per-item twin reading of 3d (reported). h40c-rule3.mjs re-pointed to the h40d files, its per-item
// table extended by the three no-cue twins for context. 3c (the cue twins against the no-cue twins) is h40d-twins.mjs's and 3e is
// mains-band's; neither is computed here.
//
//   node h40d-rule3.mjs <run-dir> [<id>=<winner model> ...] [options]
//     <id>=<winner model>  the join of items to the model that WON them, from the hour's won-by lines (3d); every item not named is
//                          read as gemini-3.5-flash-lite (h40c passed R20=gemini-3.1-flash-lite, its one 3.1-lite win)
//     --cue <stem>         the 3.5-lite HIGH cue twin family  (default gemini-3.5-flash-lite_captured-high; reps add -r2, -r3)
//     --low <stem>         the 3.1-lite LOW cue twin family   (default gemini-3.1-flash-lite_captured-low)
//     --nocue <stem>       the no-cue twin family             (default gemini-3.5-flash-lite_captured-no-cues-high)
//     --floor <n>          3a's floor (default 35, h40c's own count; section 6's re-pin option (i) replaces it with a re-graded one)
//     --reasons            also print the graders' reason text (default: ids, counts and verdict classes only; reasons quote the
//                          user's profile, so they are opt-in)
//     --demote <n>         CALIBRATION ONLY: set the first n acceptable in-app items to weak IN MEMORY before any reading
//
// A family's file is interview60.judge.<stem><rep>.json in the run folder; a family with no judge file and no answers file reads
// "absent" (h40a-h40c have no no-cue twins), one with answers but no judge file reads "NOT MERGED".
// Counting rulings (h40c's, kept by r4): 3a counts roster ITEMS (best answer per item, unanswered = not acceptable); 3b counts EVERY
// delivered answer on the 40 items that are not R02F R04F R09F R11F R13F, a double's second answer included.
//
// exit 0  3a and 3b both hold    exit 1  3a missed or 3b failed    exit 2  usage / not a holdout40 run folder / unreadable file
// exit 3  INCOMPLETE: the merged in-app judge file is missing (r4 section 5 item 4: a verdicts file missing for 3a or 3b)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // VH: the grading agents' verdicts files (h40d-verdicts-<tag>.json) live here
const M35 = 'gemini-3.5-flash-lite';
const M31 = 'gemini-3.1-flash-lite';
const EXCLUDED = ['R02F', 'R04F', 'R09F', 'R11F', 'R13F']; // r4 rule 3b: the five follow-ups that arrive without their parent
const RANK = { acceptable: 2, weak: 1, wrong: 0 };
const GRADER_PIN = { model: 'claude-opus-5-5', stamp: '8564ba96369a' }; // r4 section 2
const REPS = ['', '-r2', '-r3'];
const abbr = { acceptable: 'A', weak: 'w', wrong: 'X', unanswered: '-' };

const die = (msg, code = 2) => {
    console.error(`h40d-rule3: ${msg}`);
    process.exit(code);
};

const opts = { floor: 35, cue: `${M35}_captured-high`, low: `${M31}_captured-low`, nocue: `${M35}_captured-no-cues-high`, reasons: false, demote: 0 };
const positional = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reasons') opts.reasons = true;
    else if (['--floor', '--demote', '--cue', '--low', '--nocue'].includes(a)) {
        const v = argv[++i];
        if (v === undefined) die(`${a} needs a value`);
        if (a === '--floor' || a === '--demote') {
            const n = Number(v);
            if (!Number.isInteger(n) || n < 0) die(`${a} needs a whole number, got ${v}`);
            opts[a.slice(2)] = n;
        } else opts[a.slice(2)] = v;
    } else if (a.startsWith('--')) die(`unknown option ${a}`);
    else positional.push(a);
}
const run = positional[0];
if (!run) die('usage: node h40d-rule3.mjs <run-dir> [<id>=<winner model> ...] [--floor n] [--cue stem] [--low stem] [--nocue stem] [--reasons] [--demote n]');
if (!fs.existsSync(run)) die(`run folder not found: ${run}`);

const inRun = (f) => path.join(run, f);
// never echo e.message: a JSON.parse error quotes a snippet of the file, and these files carry the user's profile
const readJson = (f) => {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return die(`${f}: ${e instanceof SyntaxError ? 'is not valid JSON' : (e?.code ?? e?.name ?? 'unreadable')}`); }
};

const timeline = readJson(inRun('interview60.timeline.json'));
const roster = timeline.items.filter((i) => (i.kind ?? 'spoken') === 'spoken').map((i) => i.id);
if (roster.length !== 45 || EXCLUDED.some((id) => !roster.includes(id))) {
    die(`${run} is not a holdout40 run folder: its roster has ${roster.length} spoken items (45 expected) and ${EXCLUDED.filter((id) => !roster.includes(id)).length} of the 5 excluded follow-ups missing from it`);
}

const winners = {};
for (const a of positional.slice(1)) {
    const m = /^([A-Za-z0-9]+)=(.+)$/.exec(a);
    if (!m || !roster.includes(m[1]) || ![M35, M31].includes(m[2])) die(`"${a}" is not <rosterId>=${M35} or <rosterId>=${M31}`);
    winners[m[1]] = m[2];
}

console.log(`h40d-rule3: run ${path.basename(run)}  (3a floor ${opts.floor}; cue family ${opts.cue}; low family ${opts.low}; no-cue family ${opts.nocue})`);
if (opts.demote > 0) console.log(`*** IN-MEMORY MUTATION (--demote ${opts.demote}): acceptable in-app items are set to weak before any reading below. CALIBRATION, NOT A READING. ***`);

const inAppFile = 'interview60.judge.json';
if (!fs.existsSync(inRun(inAppFile))) {
    const raw = path.join(HERE, 'h40d-verdicts-inapp.json');
    console.log(`RULE 3a / 3b: INCOMPLETE - ${inAppFile} is missing from the run folder; ${fs.existsSync(raw) ? 'h40d-verdicts-inapp.json exists beside this script: graded, not merged (run h40d-merge.cmd)' : 'h40d-verdicts-inapp.json is missing: the in-app arm is not graded'}`);
    process.exitCode = 3;
} else report();

function report() {
    const inApp = readJson(inRun(inAppFile));
    console.log(`in-app judge: grader ${inApp.graderModel}, stamp ${inApp.graderPrompt}, ${Object.keys(inApp.items).length} graded answers`);
    console.log(`grader pin (r4 section 2): ${GRADER_PIN.model} stamp ${GRADER_PIN.stamp} -> model ${inApp.graderModel === GRADER_PIN.model ? 'MATCH' : 'DIFFERS'}, stamp ${inApp.graderPrompt === GRADER_PIN.stamp ? 'MATCH' : 'DIFFERS'}`);

    // ---- the in-app answers, per roster item (a double's second answer is keyed "R18#2" and carries id R18)
    const byId = new Map();
    for (const [key, v] of Object.entries(inApp.items)) {
        if (!(v.verdict in RANK)) die(`in-app judge item ${key} has verdict ${JSON.stringify(v.verdict)}; expected acceptable, weak or wrong`);
        const id = v.id ?? key.replace(/#\d+$/, '');
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push({ key, verdict: v.verdict, c: v.correctness, t: v.on_topic, d: v.delivery, reason: v.reason });
    }
    const off = [...byId.keys()].filter((id) => !roster.includes(id));
    if (off.length) console.log(`WARNING in-app judge ids not on the roster (counted in 3b only): ${off.join(' ')}`);
    const best = (id) => (byId.get(id) ?? []).map((a) => a.verdict).sort((a, b) => RANK[b] - RANK[a])[0] ?? 'unanswered';
    if (opts.demote > 0) {
        const hit = roster.filter((id) => best(id) === 'acceptable').slice(0, opts.demote);
        for (const id of hit) for (const a of byId.get(id)) a.verdict = 'weak';
        console.log(`--demote: set to weak in memory: ${hit.join(' ') || '(none)'}`);
    }
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
    const why = (w) => (opts.reasons ? ` (${w.reason})` : '');
    console.log(`WRONG answers on the 40 gated items: ${gated.length}${gated.length ? ' -> ' + gated.map((w) => `${w.key}${why(w)}`).join(' | ') : ''}`);
    console.log(`wrong answers on the 5 excluded follow-ups (reported, not gated): ${excl.length}${excl.length ? ' -> ' + excl.map((w) => w.key).join(', ') : ''}`);
    console.log(`the 5 excluded follow-ups' best in-app grades (r4: reported beside 3b, never inside it): ${EXCLUDED.map((id) => `${id} ${best(id)}`).join(', ')}`);
    const ok3a = acc >= opts.floor;
    const ok3b = gated.length === 0;
    console.log(`3a: in-app acceptable ${acc} of ${roster.length}, floor ${opts.floor} -> ${ok3a ? 'PASS' : 'MISS'}`);
    console.log(`3b: wrong live in-app answers on the 40 gated items ${gated.length} -> ${ok3b ? 'PASS' : 'FAIL'}`);
    const failed = [!ok3a && '3a MISS', !ok3b && '3b FAIL'].filter(Boolean);
    console.log(`RULE 3 (3a and 3b only; 3c is h40d-twins.mjs's): ${failed.length ? failed.join(' and ') : 'PASS'}${ok3a ? '' : ' - a 3a miss reads as noise only with the noise reading below MET and 3c PASS (r4 rule 3a)'}`);

    console.log('\nnot acceptable (per answer):');
    for (const [, as] of byId) for (const a of as) if (a.verdict !== 'acceptable') console.log(`  ${a.key.padEnd(7)} ${a.verdict.padEnd(10)} c${a.c} t${a.t} d${a.d}${opts.reasons ? '  ' + a.reason : ''}`);
    for (const id of roster) if (!byId.has(id)) console.log(`  ${id.padEnd(7)} unanswered  (no in-app answer)`);

    // ---- the twin families: cue (3.5-lite HIGH), low (3.1-lite LOW), no-cue (3.5-lite HIGH, the control)
    const load = (stem) => REPS.map((s) => {
        const tag = `${stem}${s}`;
        const jp = inRun(`interview60.judge.${tag}.json`);
        if (fs.existsSync(jp)) return { tag, state: 'merged', j: readJson(jp) };
        return { tag, state: fs.existsSync(inRun(`interview60.answers.${tag}.json`)) ? 'NOT MERGED' : 'absent', j: null };
    });
    const fam = { cue: load(opts.cue), low: load(opts.low), nocue: load(opts.nocue) };
    const verdictIn = (r, id) => r.j?.items?.[id]?.verdict;
    const verdicts = (r) => (r.j ? Object.values(r.j.items).map((v) => v.verdict) : []);

    console.log('\ntwin arms (acceptable / graded, grader):');
    const graders = new Map([[`${inApp.graderModel} ${inApp.graderPrompt}`, 1]]);
    for (const reps of Object.values(fam)) {
        for (const r of reps) {
            if (r.state === 'absent') { console.log(`  ${r.tag}: absent (no judge file and no answers file in the run folder)`); continue; }
            if (r.state === 'NOT MERGED') { console.log(`  ${r.tag}: NOT MERGED (answers file present, no merged judge file)`); continue; }
            const vs = verdicts(r);
            console.log(`  ${r.tag}: ${vs.filter((v) => v === 'acceptable').length} / ${vs.length}, wrong ${vs.filter((v) => v === 'wrong').length}, grader ${r.j.graderModel}, stamp ${r.j.graderPrompt}`);
            const g = `${r.j.graderModel} ${r.j.graderPrompt}`;
            graders.set(g, (graders.get(g) ?? 0) + 1);
        }
    }
    console.log(`graders across the merged files (in-app + twins): ${[...graders].map(([g, n]) => `${g} x${n}`).join(', ')}${graders.size > 1 ? '   *** MORE THAN ONE GRADER MODEL OR PROMPT STAMP ***' : ''}`);

    // the combined band of the six cue twins (h40c's "36 to 38"): each rep's acceptable count on its own graded ids
    const six = [...fam.cue, ...fam.low].filter((r) => r.state === 'merged').map((r) => verdicts(r).filter((v) => v === 'acceptable').length);
    if (six.length) {
        const lo = Math.min(...six); const hi = Math.max(...six);
        console.log(`combined band of the cue twins (3.5-lite HIGH and 3.1-lite LOW reps, each on its own graded ids): ${lo} to ${hi} (${six.length} of 6 reps merged); in-app ${acc} is ${acc < lo ? `${lo - acc} below` : acc > hi ? `${acc - hi} above` : 'inside'} it`);
    } else console.log('combined band of the cue twins: none merged');

    // ---- rule 3a's NOISE reading: the in-app count on the ids the three cue twin reps share, against each rep's count there
    console.log("\n3a NOISE READING (r4 rule 3a): the in-app count on the ids the three cue twin reps share, against each rep's count on the same ids");
    const missingReps = fam.cue.filter((r) => r.state !== 'merged');
    if (missingReps.length) {
        // r4 names the grading agents' output VH\h40d-verdicts-<tag>.json, <tag> = the family tag without its model prefix
        const verdictsFile = (r) => `h40d-verdicts-${r.tag.replace(/^gemini-[0-9.]+-flash-lite_/, '')}.json`;
        const state = (r) => `${r.tag}: ${r.state}${fs.existsSync(path.join(HERE, verdictsFile(r))) ? ` (${verdictsFile(r)} exists beside this script: graded, not merged)` : ''}`;
        console.log(`  UNDECIDED - cue twin rep(s) not merged: ${missingReps.map(state).join('; ')}`);
    } else {
        const bestOf = (r) => {
            const m = new Map();
            for (const [k, v] of Object.entries(r.j.items)) {
                const id = v.id ?? k.replace(/#\d+$/, '');
                if (!m.has(id) || RANK[v.verdict] > RANK[m.get(id)]) m.set(id, v.verdict);
            }
            return m;
        };
        const maps = fam.cue.map(bestOf);
        const shared = roster.filter((id) => maps.some((m) => m.has(id)));
        const accOn = (m, ids) => ids.filter((id) => m.get(id) === 'acceptable').length;
        const inMap = new Map(roster.map((id) => [id, best(id)]));
        const inShared = accOn(inMap, shared);
        const twin = maps.map((m) => accOn(m, shared));
        const lowest = Math.min(...twin);
        const gap = lowest - inShared;
        const notShared = roster.filter((id) => !shared.includes(id));
        console.log(`  graded ids per cue twin rep: ${maps.map((m) => m.size).join(' / ')}; shared by all three and on the roster: ${shared.length}; not shared: ${notShared.join(' ') || '-'}`);
        console.log(`  in-app acceptable on the shared ids: ${inShared} of ${shared.length}`);
        console.log(`  cue twin reps' acceptable on the same ids: ${twin.join(' / ')}; lowest ${lowest}`);
        const reading = gap < 0 ? 'in-app ABOVE the lowest cue twin' : gap === 0 ? 'in-app EQUAL to the lowest cue twin' : gap === 1 ? 'in-app 1 below the lowest cue twin: WITHIN 1' : `in-app ${gap} below the lowest cue twin: NOT WITHIN 1`;
        console.log(`  gap = lowest - in-app = ${gap} -> ${reading}`);
        console.log(`  noise condition (in-app at most 1 below the lowest cue twin): ${gap <= 1 ? 'MET' : 'NOT MET'}${ok3a ? '  (3a holds, so this is informational)' : '  (3a MISSED: it reads as noise only with 3c PASS too, decided by h40d-twins.mjs; else an other FAIL, r4 section 5)'}`);
    }

    // ---- 3d, the per-item table: each item against the twins of the model that won it
    console.log("\nper item: in-app best | winner | its twins r1 r2 r3 | the other model's twins | no-cue twins  (* = in-app below all three of its own twins, + = above all three)");
    const noCueAbsent = fam.nocue.every((r) => r.state === 'absent');
    const below = []; const above = [];
    for (const id of roster) {
        const win = winners[id] ?? M35;
        const own = win === M35 ? fam.cue : fam.low;
        const other = win === M35 ? fam.low : fam.cue;
        const tw = (reps) => reps.map((r) => abbr[verdictIn(r, id) ?? 'unanswered']);
        const b = best(id);
        const rk = RANK[b] ?? -1;
        const ranks = own.map((r) => RANK[verdictIn(r, id)] ?? -1);
        const allBelow = ranks.every((x) => x > rk);
        const allAbove = ranks.every((x) => x < rk && x >= 0);
        if (allBelow) below.push(id);
        if (allAbove) above.push(id);
        console.log(`  ${id.padEnd(6)} ${abbr[b]} ${allBelow ? '*' : allAbove ? '+' : ' '} ${win === M35 ? '3.5H' : '3.1L'} | ${tw(own).join(' ')} | ${tw(other).join(' ')} | ${noCueAbsent ? 'absent' : tw(fam.nocue).join(' ')}`);
    }
    console.log(`in-app below all three of its own twins (*): ${below.join(' ') || 'none'}`);
    console.log(`in-app above all three of its own twins (+): ${above.join(' ') || 'none'}`);
    if (noCueAbsent) console.log(`no-cue twins: absent (${fam.nocue.map((r) => r.tag).join(', ')} have no judge file and no answers file in this run folder)`);

    process.exitCode = ok3a && ok3b ? 0 : 1;
}
