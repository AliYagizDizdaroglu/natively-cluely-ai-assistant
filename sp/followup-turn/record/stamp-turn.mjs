// Throwaway (text only, no model calls): pins the reference and the recorded material by sha256, checks that every
// recorded arm B is exactly arm A + the block at the marker (ARMS), re-derives every parity-fixture entry with the
// reference from its recorded inputs (PARITY), proves the fixture check fails on corrupted inputs (rule 8), proves the
// ledger rebuild refuses a corrupted replaces= (m5), and checks the gated files and fixtures equal a fresh rebuild from
// the captured logs. Derived from followup-context/stamp.mjs. Prints ids, counts and hashes only.
//   node stamp-turn.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABEL, buildEarlierQuestion, insertBlock } from './earlierQuestion.ref.mjs';
import { HOURS, R_DIR, reportHour, selfTestReplaces, sha256, rebuildLedger } from './gate-report-turn.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const bytesOf = (f) => fs.readFileSync(f);
const show = (label, f) => console.log(`${label}\t${sha256(bytesOf(f))}\t${fs.statSync(f).size} bytes`);

const OLD_REF = path.join(SP, 'followup-context', 'earlierQuestions.ref.mjs');
const OLD_REF_SHA = '0459f578e47706424df0c41684a46c041fa52109923c1eb25df1c484d0dda256';
console.log('--- hashes (section 2) ---');
show('followup-turn/earlierQuestion.ref.mjs', path.join(HERE, 'earlierQuestion.ref.mjs'));
show('followup-turn/earlierQuestion.ref.test.mjs', path.join(HERE, 'earlierQuestion.ref.test.mjs'));
show('followup-turn/gate-report-turn.mjs', path.join(HERE, 'gate-report-turn.mjs'));
show('followup-turn/stamp-turn.mjs', path.join(HERE, 'stamp-turn.mjs'));
for (const h of Object.keys(HOURS)) show(`R/${h}-gated-turn.json`, path.join(R_DIR, `${h}-gated-turn.json`));
for (const h of Object.keys(HOURS)) show(`R/turn-parity-${h}.json`, path.join(R_DIR, `turn-parity-${h}.json`));
const oldOk = sha256(bytesOf(OLD_REF)) === OLD_REF_SHA;
console.log(`design-2 reference imported for the gate: sha256 ${sha256(bytesOf(OLD_REF)).slice(0, 8)}... ${oldOk ? 'equals the hashed 0459f578...' : 'DIFFERS FROM 0459f578... (STOP)'}`);
console.log(`label chars: ${LABEL.length} (registered 125)`);
let ok = oldOk && LABEL.length === 125;

const corruptions = {
    'parent text': (e) => ({ ...e, ledger: e.ledger.map((x, i, a) => (i === a.length - 1 ? { ...x, text: `${x.text} REPLAY_BREAK` } : x)) }),
    'turnId null': (e) => ({ ...e, turnId: null }),
    'supersede true': (e) => ({ ...e, supersede: true }),
    'parent added to promptLines': (e) => ({ ...e, promptLines: [...e.promptLines, e.ledger[e.ledger.length - 1].text] }),
};
const derive = (e) => buildEarlierQuestion({ question: e.question, turnId: e.turnId, supersede: e.supersede, ledger: e.ledger, promptLines: e.promptLines });
let armsRoster = 0, armsD = 0, corruptOk = true;

for (const hour of Object.keys(HOURS)) {
    console.log(`\n=== ${hour} ===`);
    const gated = JSON.parse(bytesOf(path.join(R_DIR, `${hour}-gated-turn.json`)).toString('utf8'));
    const fx = JSON.parse(bytesOf(path.join(R_DIR, `turn-parity-${hour}.json`)).toString('utf8'));

    // ARMS: userB = userA + block + "\n\n" at the marker, nothing else
    let armsOk = true, added = 0, r = 0, d = 0;
    for (const [key, o] of Object.entries(gated)) {
        const rebuilt = insertBlock(o.userA, o.block);
        const stripped = o.userB.replace(`${o.block}\n\n`, '');
        const good = rebuilt === o.userB && stripped === o.userA && o.userB.length - o.userA.length === o.block.length + 2 && sha256(o.block) === o.blockSha256 && o.blockSha256.startsWith(o.blockSha) && o.block.startsWith(`${LABEL}\n- `);
        if (!good) { armsOk = false; console.log(`ARMS MISMATCH ${key}`); }
        added += o.userB.length - o.userA.length; if (o.kind === 'roster') r++; else d++;
        console.log(`${key}\t${o.kind}\t${o.cue}\tblock ${o.block.length}\tadded ${o.userB.length - o.userA.length}\tuserA ${o.userA.length}\tuserB ${o.userB.length}\tsha12 ${o.blockSha}\tsha256 ${o.blockSha256}\t${good ? 'OK' : 'MISMATCH'}`);
    }
    console.log(armsOk ? `ARMS OK (${hour}): ${r} roster + ${d} D; every userB = userA + block + "\\n\\n" at the marker, nothing else` : `ARMS MISMATCH (${hour})`);
    console.log(`items: ${Object.keys(gated).length}; mean added chars: ${(added / Object.keys(gated).length).toFixed(0)}; max block: ${Math.max(...Object.values(gated).map((o) => o.block.length))}`);
    ok &&= armsOk; if (hour !== 's50k') { armsRoster += r; armsD += d; }

    // PARITY: re-derive every entry from its recorded inputs
    let fxOk = true, nBlock = 0, nRosterBlock = 0, nDBlock = 0;
    for (const [key, e] of Object.entries(fx)) {
        const res = derive(e);
        if (res.block) { nBlock++; e.kind === 'dropped' ? nDBlock++ : nRosterBlock++; }
        if (res.block !== e.expectedBlock || res.cue !== e.expectedCue || sha256(res.block).slice(0, 12) !== e.expectedSha || sha256(res.block) !== e.expectedSha256) { fxOk = false; console.log(`PARITY FIXTURE MISMATCH ${key}`); }
        if (e.kind === 'roster' && !!e.expectedBlock !== !!gated[key]) { fxOk = false; console.log(`PARITY/GATED DISAGREE ${key}`); }
    }
    const n = Object.keys(fx).length;
    console.log(fxOk ? `${hour}: PARITY FIXTURE OK: ${n} entries re-derived (${nBlock} with a block = ${nRosterBlock} roster + ${nDBlock} D, ${n - nBlock} empty)` : `${hour}: PARITY FIXTURE FAILED`);
    ok &&= fxOk;
    for (const id of ['S2Q09F', 'S1Q08', 'S2Q08', 'S2Q01F']) {
        const e = fx[`${hour}:${id}`];
        const res = derive(e);
        const printed = res.block === '' && e.expectedBlock === '' ;
        console.log(`${hour}:${id} -> ${printed ? "'' (empty)" : 'NOT EMPTY (FAIL)'}  cue ${e.expectedCue}, why ${res.why}`);
        ok &&= printed;
    }

    // rule 8: the fixture check must fail on each corrupted input (a block-bearing entry for parent/promptLines/turnId/supersede)
    const src = fx[Object.keys(fx).find((k) => fx[k].expectedBlock && fx[k].kind === 'roster')];
    for (const [name, f] of Object.entries(corruptions)) {
        const broken = f(src);
        const bb = derive(broken);
        const detects = bb.block !== src.expectedBlock;
        console.log(`  corrupted ${name}: ${detects ? 'detected' : 'NOT DETECTED (bad)'}`);
        corruptOk &&= detects;
    }
    // ... and a silent entry corrupted into a block must also be detected (the check is two-sided)
    const silent = fx[`${hour}:S2Q09F`];
    const flipped = derive({ ...silent, promptLines: [] });
    const flippedDetects = flipped.block !== silent.expectedBlock;
    console.log(`  silent entry S2Q09F with its prompt lines emptied: ${flippedDetects ? 'now a block (detected)' : 'still empty (CHECK CANNOT FAIL, bad)'}`);
    corruptOk &&= flippedDetects;

    // the files equal a fresh rebuild from the captured logs
    const fresh = await reportHour(hour);
    const sameGated = JSON.stringify(fresh.gated, null, 1) === bytesOf(path.join(R_DIR, `${hour}-gated-turn.json`)).toString('utf8');
    const sameFx = JSON.stringify(fresh.parity, null, 1) === bytesOf(path.join(R_DIR, `turn-parity-${hour}.json`)).toString('utf8');
    console.log(`${hour}: gated file ${sameGated ? 'equals' : 'DIFFERS FROM'} a fresh rebuild from the logs; parity fixture ${sameFx ? 'equals' : 'DIFFERS FROM'} a fresh rebuild`);
    ok &&= sameGated && sameFx;
}
console.log(`\nARMS OK (primary run, s50m + s50l): ${armsRoster} roster + ${armsD} D`);
console.log(corruptOk ? 'fixture check fails on a corrupted input: OK' : 'fixture check CANNOT FAIL on a corrupted input: BAD');
ok &&= corruptOk;

// m5: a corrupted replaces= is refused
const st = selfTestReplaces();
for (const [name, good] of st) { console.log(`${good ? 'OK  ' : 'BAD '} ${name}`); ok &&= good; }
const sRes = await reportHour('s50l');
const si = sRes.dispatches.findIndex((x) => x.kind === 'supersede');
let refusedReal = false;
try { rebuildLedger(sRes.dispatches.map((x, j) => (j === si ? { ...x, replaces: `${x.replaces} CORRUPTED` } : x)), sRes.dispatches.length); } catch { refusedReal = true; }
ok &&= refusedReal && st.every(([, g]) => g);
console.log(refusedReal && st.every(([, g]) => g) ? 'corrupted replaces= refused: OK' : 'corrupted replaces= NOT refused: BAD');
console.log(ok ? '\nSTAMP OK' : '\nSTAMP FAILED');
process.exitCode = ok ? 0 : 1;
