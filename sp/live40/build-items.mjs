// live40 step 1a: items.json from router40's frozen-order files. Prints ids and counts only (never question text).
//   node build-items.mjs
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/live40`;
const turns = JSON.parse(fs.readFileSync(`${SP}/router40/turns-for-classifiers.json`, 'utf8')).turns;
const key = JSON.parse(fs.readFileSync(`${SP}/router40/keyhold/key.json`, 'utf8'));

// SET-draft sections 3/4: the sources named for reused clips (folder:clipId).
const SOURCE = {
    RE06: 'interview60:W02', RE08: 'interview60:W07', RE13: 'interview60:W08', RE09: 'interview60:M09',
    RH03: 'interview60:M01', RH04: 'interview60:W05', RH09: 'interview60:L01', RH10: 'interview60:L01F1', RH11: 'interview60:L01F2',
    RH17: 'interview60:H01', RH18: 'interview60:M08',
    RH05: 'scenario50:S4Q01', RH06: 'scenario50:S4Q01F', RH07: 'scenario50:S3Q01', RH08: 'scenario50:S3Q01F',
    RH12: 'l38m:H05', RH13: 'l38m:H05F', RH15: 'l38m:H20', RH16: 'l38m:H20F',
};
// SET-draft section 5, verbatim chain order; used to cross-check the key's chain grouping.
const S5 = 'C01 RE01→RH01 · C02 RE02→EF01 · C03 RH03 · C04 RE03→EF02 · C05 RE08 · C06 RE04→EF03 · C07 RE05 · C08 RH04 · C09 RE06 · C10 RH07→RH08 · C11 RE07→EF04 · C12 RH05→RH06 · C13 RH09→RH10→RH11 · C14 RE09 · C15 RH19 · C16 RE10 · C17 RE11→EF05 · C18 RH12→RH13→RH14 · C19 RE12 · C20 RE13 · C21 RH17 · C22 RE14→RH02 · C23 RE15 · C24 RH15→RH16 · C25 RE16→EF06 · C26 RE17→EF07 · C27 RH18 · C28 RE18 · C29 RH20 · C30 RE19 · C31 RE20';
const chains5 = S5.split(' · ').map((s) => { const [c, rest] = s.split(' '); return { chain: c, items: rest.split('→') }; });

const items = [];
for (const t of turns) {
    const k = key[t.id];
    if (!k) throw new Error(`${t.id}: not in key`);
    const parent = k.parent ?? null;
    items.push({
        id: k.item, tid: t.id, text: t.text, route: k.class === 'E' ? 'EASY' : 'HARD', class: k.class,
        parent, chain: k.chain, sourceClip: SOURCE[k.item] ?? null,
    });
}
const ids = new Set(items.map((i) => i.id));
if (ids.size !== 47) throw new Error(`expected 47 distinct ids, got ${ids.size}`);
// chain grouping in turn order must equal section 5
const chains = [];
for (const it of items) { let c = chains.find((x) => x.chain === it.chain); if (!c) chains.push(c = { chain: it.chain, items: [] }); c.items.push(it.id); }
if (JSON.stringify(chains) !== JSON.stringify(chains5)) throw new Error('chains from key differ from SET-draft section 5');
for (const it of items) if (it.parent && !ids.has(it.parent)) throw new Error(`${it.id}: unknown parent`);
for (const it of items) if (it.parent && !chains.find((c) => c.chain === it.chain).items.includes(it.parent)) throw new Error(`${it.id}: parent not in its chain`);
const e = items.filter((i) => i.route === 'EASY').length, h = items.length - e;
const cls = {}; for (const i of items) cls[i.class] = (cls[i.class] || 0) + 1;
if (e !== 20 || h !== 27) throw new Error(`route counts ${e}/${h}`);
fs.writeFileSync(`${HERE}/items.json`, JSON.stringify({ note: 'live40: 47 turns, 31 chains (SET-draft section 5 order); route EASY|HARD from router40 key', chains, items }, null, 1));
console.log(`items ${items.length} (EASY ${e}, HARD ${h}), chains ${chains.length}, classes ${JSON.stringify(cls)}, with sourceClip ${items.filter((i) => i.sourceClip).length}, with parent ${items.filter((i) => i.parent).length}`);
