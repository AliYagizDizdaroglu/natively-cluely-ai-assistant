// Throwaway (2026-09-29): L20c's tail — every item whose first word came after 10 s or that is a hole, with
// what the model said (the extracted answer's first words, any holding/premature turns, the session close).
//   node tail.mjs
import fs from 'node:fs';
const HERE = new URL('./', import.meta.url);
const IDS = JSON.parse(fs.readFileSync(new URL('items.json', HERE), 'utf8')).pairs.flat();
for (const r of [1, 2, 3]) {
    const A = JSON.parse(fs.readFileSync(new URL(`runs/live38-r${r}.answers.json`, HERE), 'utf8'));
    const R = JSON.parse(fs.readFileSync(new URL(`runs/live38-r${r}.json`, HERE), 'utf8'));
    for (const id of IDS) {
        const a = A[id];
        const hole = !(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
        if (!hole && !(a.ttftMs > 10000)) continue;
        const sess = R.sessions.filter((s) => s.pair.includes(id)).map((s) => `attempt ${s.attempt}: close ${JSON.stringify(s.closed)} abnormal ${s.abnormal} complete ${s.complete}`);
        console.log(`r${r} ${id}: ${hole ? 'HOLE' : `first word ${(a.ttftMs / 1000).toFixed(1)} s`}; played ${a?.played}; words ${(a?.answer ?? '').split(/\s+/).filter(Boolean).length}`);
        console.log(`   answer: ${(a?.answer ?? '').slice(0, 160)}`);
        for (const k of ['dropped', 'holding', 'premature', 'turns']) if (a?.[k]?.length) console.log(`   ${k}: ${JSON.stringify(a[k]).slice(0, 220)}`);
        for (const s of sess) console.log(`   ${s}`);
    }
}
