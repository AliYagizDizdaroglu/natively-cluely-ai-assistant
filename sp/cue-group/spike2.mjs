// Throwaway spike 2 (2026-09-30): the user chose cue blocks of AT MOST 3 LINES of AT MOST 5 WORDS, grouped into
// themes when a question names more parts, enforced in code. Which wording makes the model itself stay inside
// 3x5 while still covering every part (so the code cap rarely has to cut)? Same captured calls as spike.mjs
// (this morning's cue smoke, whole-turn fd57512); ONE change per arm: the cue rule's line-limit sentence and
// the per-line word limit. Models: 3.1-flash-lite LOW and 3.5-flash-lite HIGH. Key in-process, never printed.
//   node spike2.mjs [--reps 4] [--only S1Q09] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const RUN = `${WT}/electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke`;
const require = createRequire(`${WT}/package.json`);
const { extractCues } = require(`${WT}/dist-electron/electron/llm/verbalStreamFilter.js`);
const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.log('no GEMINI_API_KEY in MAIN/.env'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const REPS = Number(arg('--reps', '4'));
const ONLY = arg('--only', null)?.split(',');
const DRY = process.argv.includes('--dry');

const OLD_LINE1 = '1| <key phrase for the first part the question names, at most 8 words>';
const NEW_LINE1 = '1| <key phrase for the first part the question names, at most 5 words>';
const OLD_RULE = '- One line per part the question names. A one-part question gets exactly one line. Never more than 5.';
const WORDINGS = {
    // A: the cap first, then how to fill it.
    cap3: '- At most 3 lines, each at most 5 words. One line per part the question names; when it names more than 3 parts, group related parts into themes so every part is still covered in 3 lines. A one-part question gets exactly one line.',
    // B: an explicit procedure by part count.
    themes3: '- Never more than 3 lines. Up to 3 parts: one line each. More than 3 parts: merge them into 3 themes that together cover every part. A one-part question gets exactly one line. Each line at most 5 words.',
};
const ARMS = Object.fromEntries(Object.entries(WORDINGS).map(([k, rule]) => [k, (s) => s.replace(OLD_LINE1, NEW_LINE1).replace(OLD_RULE, rule)]));
const MODELS = [
    { name: '3.1-lite LOW', model: 'gemini-3.1-flash-lite', config: { thinkingConfig: { thinkingLevel: 'LOW' } } },
    { name: '3.5-lite HIGH', model: 'gemini-3.5-flash-lite', config: { thinkingConfig: { thinkingLevel: 'HIGH' } } },
];
const PARTS = {
    S1Q09: { storage: /blob|storage|data lake|adls/i, training: /azure ml|\baml\b|training|train/i, artifacts: /registry|artifact/i, images: /\bacr\b|container registry|image|container/i, inference: /\baks\b|endpoint|inference|container apps|serving/i, scheduling: /data factory|\badf\b|schedul|orchestrat|logic apps|functions/i, identity: /entra|identity|managed ident|rbac|\bad\b/i, monitoring: /monitor|insights|log analytics|observab/i },
    S1Q07: { ingestion: /ingest/i, features: /feature/i, training: /train/i, registration: /regist/i, serving: /serv|inference|endpoint/i, storage: /stor|prediction/i, monitoring: /monitor|drift/i },
};
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const coverage = (id, cues) => {
    const p = PARTS[id]; if (!p) return null;
    const text = cues.join(' | ');
    const hit = Object.entries(p).filter(([, re]) => re.test(text)).map(([k]) => k);
    return { hit: hit.length, of: Object.keys(p).length, missing: Object.keys(p).filter((k) => !hit.includes(k)) };
};
const PROMPTS = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
const IDS = (ONLY ?? ['S1Q09', 'S1Q07', 'S1Q02', 'S1Q08', 'S1Q04F', 'S1Q08F']).filter((id) => PROMPTS[id]);
for (const id of IDS) for (const needle of [OLD_LINE1, OLD_RULE]) if (!PROMPTS[id].system.includes(needle)) { console.log(`REFUSED: ${id}'s captured prompt lacks "${needle.slice(0, 40)}…"`); process.exit(3); }

async function ask(system, user, m) {
    const body = { contents: [{ role: 'user', parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig: { temperature: 0.4, maxOutputTokens: 65536, ...m.config } };
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${m.model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
        if (res.ok) { const j = await res.json(); return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join(''); }
        if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 6000 * (attempt + 1))); continue; }
        throw new Error(`HTTP ${res.status}`);
    }
    return null;
}
const out = [];
const file = path.join(HERE, `spike2-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
for (const id of IDS) for (const m of MODELS) for (const [arm, apply] of Object.entries(ARMS)) {
    const system = apply(PROMPTS[id].system);
    if (system === PROMPTS[id].system || system.includes(OLD_RULE) || !system.includes(NEW_LINE1)) throw new Error(`arm ${arm} did not apply on ${id}`);
    if (DRY) { console.log(`DRY ${id} ${m.name} ${arm}: system ${system.length} chars (captured ${PROMPTS[id].system.length})`); continue; }
    for (let rep = 1; rep <= REPS; rep++) {
        const raw = await ask(system, PROMPTS[id].user, m);
        if (raw == null) { console.log(`${id} ${m.name} ${arm} rep${rep}: no answer (429/5xx x3)`); continue; }
        const { cues, prose } = extractCues(raw);
        const cov = coverage(id, cues);
        const long = cues.filter((c) => words(c) > 5).length;
        out.push({ id, model: m.name, arm, rep, n: cues.length, long, cues, cov, proseWords: words(prose), raw });
        fs.writeFileSync(file, JSON.stringify(out, null, 1));
        console.log(`${id.padEnd(6)} ${m.name.padEnd(13)} ${arm.padEnd(7)} rep${rep}: ${cues.length} lines, ${long} over 5 words${cov ? `, covers ${cov.hit}/${cov.of}${cov.missing.length ? ` (missing ${cov.missing.join(',')})` : ''}` : ''} | ${JSON.stringify(cues).slice(0, 140)}`);
        await new Promise((r) => setTimeout(r, 500));
    }
}
if (DRY) process.exit(0);
console.log('\nSUMMARY per cell: over-3-lines / answers; lines; lines over 5 words / all lines; mean coverage; prose words p50');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const id of IDS) for (const m of MODELS) for (const arm of Object.keys(ARMS)) {
    const rows = out.filter((r) => r.id === id && r.model === m.name && r.arm === arm);
    const cov = rows.filter((r) => r.cov).map((r) => r.cov.hit / r.cov.of);
    console.log(`${id.padEnd(6)} ${m.name.padEnd(13)} ${arm.padEnd(7)} over-3 ${rows.filter((r) => r.n > 3).length}/${rows.length}  empty ${rows.filter((r) => r.n === 0).length}  lines ${rows.map((r) => r.n).join(',')}  long-lines ${rows.reduce((a, r) => a + r.long, 0)}/${rows.reduce((a, r) => a + r.n, 0)}${cov.length ? `  coverage ${(cov.reduce((a, b) => a + b, 0) / cov.length * 100).toFixed(0)}%` : ''}  prose p50 ${med(rows.map((r) => r.proseWords))}`);
}
for (const arm of Object.keys(ARMS)) for (const m of MODELS) {
    const rows = out.filter((r) => r.arm === arm && r.model === m.name);
    console.log(`TOTAL ${arm.padEnd(7)} ${m.name.padEnd(13)} over-3 ${rows.filter((r) => r.n > 3).length}/${rows.length}  long-lines ${rows.reduce((a, r) => a + r.long, 0)}/${rows.reduce((a, r) => a + r.n, 0)}  empty ${rows.filter((r) => r.n === 0).length}`);
}
console.log(`wrote ${file}`);
