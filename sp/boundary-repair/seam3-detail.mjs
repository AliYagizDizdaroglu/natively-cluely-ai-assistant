// Throwaway (2026-09-29): every repair a module makes on a seam recording under the v4 wiring, with the
// interim, the cut final and the next final around it, checked word-sequence-wise against the script
// (does "<restored> <first 2 words of F2>" occur in the scripted question?); plus the finals of chosen plays.
//   node seam3-detail.mjs <stamp> <module> [playId#n ...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [stamp, modPath, ...show] = process.argv.slice(2);
const DIR = ['seam-probe-v4', 'seam-probe'].find((d) => fs.existsSync(path.join(HERE, d, `events-${stamp}.jsonl`)));
const plan = JSON.parse(fs.readFileSync(path.join(HERE, DIR, `plan-${stamp}.json`), 'utf8'));
const events = fs.readFileSync(path.join(HERE, DIR, `events-${stamp}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const mod = modPath.endsWith('.mjs') ? await import(new URL(`file:///${path.resolve(modPath).replace(/\\/g, '/')}`).href) : createRequire(import.meta.url)(path.resolve(modPath));
const factory = mod.createBoundaryRepair ?? mod.createRepair;
const tok = (s) => String(s).toLowerCase().replace(/(\d),(\d)/g, '$1$2').match(/[a-z0-9']+/g) ?? [];
const playOf = (e) => { const end = e.start + e.duration; return plan.plan.find((p, i) => end >= p.startS && end < (plan.plan[i + 1]?.startS ?? Infinity)); };
const hasSeq = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true; return false; };
const r = factory();
let lastInterim = null, lastFinal = null, prevInterim = null, n = 0, trueN = 0;
for (const e of events) {
    if (e.kind === 'utterance-end') { r.clear(); continue; }
    if (e.kind !== 'transcript') continue;
    if (!e.text) { if (e.isFinal) r.clear(); continue; }
    const out = r.onTranscript(e.text, e.isFinal, e.at, e.speechFinal === true);
    if (!e.isFinal) { lastInterim = e; continue; }
    if (out.restored) {
        n++;
        const p = playOf(e);
        const script = tok(plan.script[p?.id] ?? '');
        const ok = hasSeq(script, [...tok(out.restored.join(' ')), ...tok(e.text).slice(0, 2)]);
        if (ok) trueN++;
        console.log(`REPAIR ${p ? `${p.id}#${p.play}` : '?'} restored "${out.restored.join(' ')}" -> ${ok ? 'TRUE (the script holds it before F2)' : 'NOT in the script there'}`);
        console.log(`   interim before the cut: "${prevInterim?.text}"`);
        console.log(`   cut final (speech_final ${lastFinal?.speechFinal === true}): "${lastFinal?.text}"`);
        console.log(`   next final +${e.at - (lastFinal?.at ?? e.at)} ms: "${e.text}"`);
    }
    prevInterim = lastInterim; lastFinal = e; lastInterim = null;
}
console.log(`repairs ${n}, true against the script ${trueN}`);
for (const key of show) {
    const [id, play] = key.split('#');
    console.log(`\n${key} script: ${plan.script[id]}`);
    for (const e of events.filter((x) => x.kind === 'transcript' && x.text && playOf(x)?.id === id && String(playOf(x)?.play) === play)) {
        console.log(`   ${e.isFinal ? 'FINAL  ' : 'interim'}${e.speechFinal ? ' sf' : '   '} ${e.text}`);
    }
}
