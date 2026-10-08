// Rule-8 calibration of l20d/blind.mjs on a SYNTHETIC folder (cal-blind/): the new-Live reps are L20's real Live runs
// (L20b rN + L20c rN merged to 38 items) standing in, with three edits whose consequence is known:
//   rep 2 S2Q10 turned into a spoken system-error apology  -> it must be SENT (not a hole);
//   rep 3 S1Q03 not played and S1Q04 an empty answer       -> two holes.
// The app's four samples and the anchor are the REAL ones, whose holes are registered: app35-twin2 S2Q06 and
// live38-r1 S1Q02, S1Q02F, S1Q09F. Writes only inside cal-blind/ (packets, keys); the real l20d/blind and l20d-key
// are never touched. Prints counts and ids, never an answer.
//   node cal-blind.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = `${SP}/l20d/cal-blind`;
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(`${D}/runs`, { recursive: true });
fs.copyFileSync(`${SP}/l20d/items.json`, `${D}/items.json`);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const merged = (r) => ({ ...J(`${SP}/l20b/runs/live38-r${r}.answers.json`), ...J(`${SP}/l20c/runs/live38-r${r}.answers.json`) });
const r1 = merged(1), r2 = merged(2), r3 = merged(3);
r2.S2Q10 = { ...r2.S2Q10, answer: 'I am sorry, I ran into a system error and cannot answer that.' };
r3.S1Q03 = { played: false };
r3.S1Q04 = { ...r3.S1Q04, answer: '  ' };
const put = (r, a) => fs.writeFileSync(`${D}/runs/l20d-r${r}.answers.json`, JSON.stringify(a));
put(1, r1); put(2, r2); put(3, r3);
let ok = true;
const check = (name, cond, extra = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : `  ${String(extra).slice(0, 400)}`}`); };
const blind = (args, script = `${SP}/l20d/blind.mjs`) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// ---- dry run ------------------------------------------------------------------------------------------------
let r = blind(['--dry', '--dir', D, '--keydir', `${D}/key-dry`]);
const holes = (r.out.match(/^holes \(not graded\): (.*)$/m)?.[1] ?? '').split(', ').sort();
const wantHoles = ['app35-twin2 S2Q06', 'l20d-r1 S1Q02', 'l20d-r1 S1Q02F', 'l20d-r1 S1Q09F', 'l20d-r3 S1Q03', 'l20d-r3 S1Q04', 'live38-r1 S1Q02', 'live38-r1 S1Q02F', 'live38-r1 S1Q09F'].sort();
check('dry run: exit 0, writes nothing (no key folder, no packets)', r.code === 0 && /dry run: nothing written/.test(r.out) && !fs.existsSync(`${D}/key-dry`) && !fs.existsSync(`${D}/blind`), r.out);
check(`dry run: holes are exactly the registered four (app captured-high-r2 S2Q06; old Live r1 S1Q02, S1Q02F, S1Q09F) + the three planted (new r1's stand-in three, r3 S1Q03 not played, r3 S1Q04 empty); the r2 apology is NOT a hole (got: ${holes.join(', ')})`, JSON.stringify(holes) === JSON.stringify(wantHoles));
check('dry run: per arm 35 36 38 | apps 38 38 37 38 | old 35 38 38; answers 371', /l20d-r1 35, l20d-r2 38, l20d-r3 36, app35-inapp 38, app35-twin1 38, app35-twin2 37, app35-twin3 38, live38-r1 35, live38-r2 38, live38-r3 38/.test(r.out) && /answers 371;/.test(r.out), r.out);
const sizes = [...r.out.matchAll(/^packet ([A-D]): (\d+) answers \(([^)]*)\)/gm)].map((m) => [Number(m[2]), m[3].split(' ').length]);
check(`four packets of 10, 10, 10 and 8 items (5, 5, 5, 4 pairs), answers summing to 371 (got ${JSON.stringify(sizes)})`, JSON.stringify(sizes.map((x) => x[1])) === '[10,10,10,8]' && sizes.reduce((n, x) => n + x[0], 0) === 371);

// ---- fewer than three reps ----------------------------------------------------------------------------------
const D2 = `${SP}/l20d/cal-blind-2reps`;
fs.rmSync(D2, { recursive: true, force: true });
fs.mkdirSync(`${D2}/runs`, { recursive: true });
fs.copyFileSync(`${SP}/l20d/items.json`, `${D2}/items.json`);
fs.copyFileSync(`${D}/runs/l20d-r1.answers.json`, `${D2}/runs/l20d-r1.answers.json`);
fs.copyFileSync(`${D}/runs/l20d-r2.answers.json`, `${D2}/runs/l20d-r2.answers.json`);
r = blind(['--dry', '--dir', D2, '--keydir', `${D2}/key`]);
check('two reps, --dry: allowed, says which rep is missing', r.code === 0 && /missing reps: l20d-r3/.test(r.out), r.out);
r = blind(['--dir', D2, '--keydir', `${D2}/key`]);
check('two reps, real build: REFUSED (exit 2), no key, no packets', r.code === 2 && /REFUSED: no answers file for l20d r3/.test(r.out) && !fs.existsSync(`${D2}/key`) && !fs.existsSync(`${D2}/blind`), r.out);

// ---- the real build -----------------------------------------------------------------------------------------
r = blind(['--dir', D, '--keydir', `${D}/key`]);
check('three reps, real build: exit 0, key written', r.code === 0 && fs.existsSync(`${D}/key/key.json`), r.out);
const K = J(`${D}/key/key.json`);
const packet = Object.fromEntries(['A', 'B', 'C', 'D'].map((p) => [p, J(`${D}/blind/packet-${p}.json`)]));
check('key.json: seed 20261003, ten arms, 371 keys, the registered rubric travels in every packet', K.seed === 20261003 && K.arms.length === 10 && Object.keys(K.key).length === 371 && ['A', 'B', 'C', 'D'].every((p) => JSON.stringify(packet[p].rubric) === JSON.stringify(J(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`).rubric)));
check('every arm in the key is one of the ten; every arm has keys', Object.values(K.key).every((a) => K.arms.includes(a)) && K.arms.every((a) => Object.values(K.key).includes(a)));
const pairs = J(`${D}/items.json`).pairs;
check('every pair sits in ONE packet (a question and its follow-up go to the same two graders), 5/5/5/4 pairs', pairs.every(([a, b]) => Object.values(K.packets).filter((ids) => ids.includes(a) || ids.includes(b)).length === 1 && Object.values(K.packets).some((ids) => ids.includes(a) && ids.includes(b))) && JSON.stringify(Object.values(K.packets).map((ids) => ids.length / 2)) === '[5,5,5,4]');
check('every packet entry sits in the packet its item belongs to, and the packet holds exactly its keys', ['A', 'B', 'C', 'D'].every((p) => { const want = Object.keys(K.key).filter((k) => K.packets[p].includes(k.split('#')[0])).sort(); return JSON.stringify(packet[p].items.map((x) => x.key).sort()) === JSON.stringify(want); }));
// the key is correct: each entry's answer is the text of the arm the key names
const src = {
    'l20d-r1': r1, 'l20d-r2': r2, 'l20d-r3': r3,
    'live38-r1': merged(1), 'live38-r2': merged(2), 'live38-r3': merged(3),
};
const s50m = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const appFiles = { 'app35-inapp': 'interview60.judge.pairs.json', 'app35-twin1': 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', 'app35-twin2': 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json', 'app35-twin3': 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json' };
for (const [arm, f] of Object.entries(appFiles)) src[arm] = Object.fromEntries(J(`${s50m}/${f}`).items.map((x) => [x.key, x]));
const wrong = [];
for (const p of ['A', 'B', 'C', 'D']) for (const e of packet[p].items) { const arm = K.key[e.key]; if (src[arm][e.id]?.answer !== e.answer) wrong.push(`${e.key}:${arm}`); }
check('the key maps every one of the 371 packet answers to the arm whose text it is (no mismatch)', wrong.length === 0, wrong.slice(0, 5).join(' '));
check('the spoken apology (rep 2 S2Q10) is sent and graded, not a hole', Object.keys(K.key).some((k) => k.startsWith('S2Q10#') && K.key[k] === 'l20d-r2') && !K.holes.includes('l20d-r2 S2Q10'));
// blinding
const text = ['A', 'B', 'C', 'D'].map((p) => fs.readFileSync(`${D}/blind/packet-${p}.json`, 'utf8')).join('\n');
check('blinding: no arm name, no "twin", no "inapp" anywhere in the packets', !/l20d|app35|live38|twin|inapp/i.test(text.replace(/"rubric":[\s\S]*?"items"/g, '"items"')), (text.match(/l20d|app35|live38|twin|inapp/i) ?? [])[0]);
const fields = new Set(['A', 'B', 'C', 'D'].flatMap((p) => packet[p].items.flatMap((x) => Object.keys(x))));
check(`blinding: entries carry only key, id, kind, level, topic, question, heard, answer (got ${[...fields].join(',')})`, JSON.stringify([...fields].sort()) === JSON.stringify(['answer', 'heard', 'id', 'key', 'kind', 'level', 'question', 'topic']));
const pos = new Set(Object.entries(K.key).filter(([, a]) => a === 'l20d-r1').map(([k]) => k.split('#')[1]));
check(`the shuffle moves an arm around (new r1 takes ${pos.size} different positions over its 35 items)`, pos.size >= 5);

// ---- rebuild refusal ----------------------------------------------------------------------------------------
const before = [sha(`${D}/key/key.json`), ...['A', 'B', 'C', 'D'].map((p) => sha(`${D}/blind/packet-${p}.json`))].join(' ');
r = blind(['--dir', D, '--keydir', `${D}/key`]);
const after = [sha(`${D}/key/key.json`), ...['A', 'B', 'C', 'D'].map((p) => sha(`${D}/blind/packet-${p}.json`))].join(' ');
check('a second build into the same key folder -> REFUSED (exit 3); key.json and the four packets are byte-identical afterwards', r.code === 3 && /REFUSED: .*key\.json exists/.test(r.out) && before === after, r.out);
// determinism: same inputs, another key folder, another packet folder -> the same key
const D3 = `${SP}/l20d/cal-blind-again`;
fs.rmSync(D3, { recursive: true, force: true });
fs.cpSync(`${D}/runs`, `${D3}/runs`, { recursive: true });
fs.copyFileSync(`${D}/items.json`, `${D3}/items.json`);
r = blind(['--dir', D3, '--keydir', `${D3}/key`]);
check('determinism: the same inputs in another folder give a byte-identical key.json (the seed is fixed)', r.code === 0 && sha(`${D3}/key/key.json`) === sha(`${D}/key/key.json`));

// ---- the registered-holes assertion and the items check on mutated copies ---------------------------------------
const bl = fs.readFileSync(`${SP}/l20d/blind.mjs`, 'utf8');
const anchor = "const REGISTERED_HOLES = ['app35-twin2 S2Q06',";
if (bl.split(anchor).length !== 2) check('cal setup: REGISTERED_HOLES anchor present once', false);
else {
    fs.writeFileSync(`${D}/blind-bogus-holes.mjs`, bl.replace(anchor, () => "const REGISTERED_HOLES = ['app35-twin1 S1Q01', 'app35-twin2 S2Q06',"));
    r = blind(['--dry', '--dir', D, '--keydir', `${D}/key-x`], `${D}/blind-bogus-holes.mjs`);
    check('a registered hole the data does not have -> the batch is refused (nonzero exit, "not the registered ones")', r.code !== 0 && /holes are not the registered ones/.test(r.out), r.out.slice(0, 300));
}
const items = J(`${SP}/l20d/items.json`);
const D4 = `${SP}/l20d/cal-blind-37`;
fs.rmSync(D4, { recursive: true, force: true });
fs.cpSync(`${D}/runs`, `${D4}/runs`, { recursive: true });
fs.writeFileSync(`${D4}/items.json`, JSON.stringify({ ...items, pairs: [[items.pairs[0][0]], ...items.pairs.slice(1)] }));
r = blind(['--dry', '--dir', D4, '--keydir', `${D4}/key`]);
check('items.json with 37 ids -> refused (nonzero exit)', r.code !== 0 && /expected 38 distinct items/.test(r.out), r.out.slice(0, 200));
console.log(ok ? 'L20D BLIND CALIBRATION OK' : 'L20D BLIND CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
