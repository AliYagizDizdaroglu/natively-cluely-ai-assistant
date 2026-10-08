// Throwaway spike (2026-09-30): does a GROUPING sentence keep the cue block at <= 5 lines and still cover every
// part a many-part question names? Replays the app's EXACT captured calls from this morning's cue smoke
// (2026-09-30T02-38-22-cuesmoke, whole-turn build fd57512) with ONE change per arm: the cue rule's line-count
// sentence. Models: 3.1-flash-lite at LOW (whole-turn's shipped answerer) and 3.5-flash-lite at HIGH (MAIN's
// hedge primary since f745d7e). Items: S1Q09 (names 8 parts; the smoke's 8-line block), S1Q07 (names 7),
// and two short follow-ups as one-part controls. Key read in-process from MAIN's .env, never printed.
//   node spike.mjs [--reps 3] [--only S1Q09] [--dry]
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
const REPS = Number(arg('--reps', '3'));
const ONLY = arg('--only', null)?.split(',');
const DRY = process.argv.includes('--dry');

const OLD = '- One line per part the question names. A one-part question gets exactly one line. Never more than 5.';
const NEW = '- One line per part the question names. A one-part question gets exactly one line. Never more than 5: when the question names more than 5 parts, group related parts on one line so every part is still covered.';
const ARMS = { current: (s) => s, group: (s) => s.replace(OLD, NEW) };
const MODELS = [
    { name: '3.1-lite LOW', model: 'gemini-3.1-flash-lite', config: { thinkingConfig: { thinkingLevel: 'LOW' } } },
    { name: '3.5-lite HIGH', model: 'gemini-3.5-flash-lite', config: { thinkingConfig: { thinkingLevel: 'HIGH' } } },
];
// Parts each item names, as keyword probes on the cue block (calibrated below on known blocks).
const PARTS = {
    S1Q09: { storage: /blob|storage|data lake|adls/i, training: /azure ml|\baml\b|training|train/i, artifacts: /registry|artifact/i, images: /\bacr\b|container registry|image/i, inference: /\baks\b|endpoint|inference|container apps|serving/i, scheduling: /data factory|\badf\b|schedul|orchestrat|logic apps|functions/i, identity: /entra|identity|managed ident|rbac|\bad\b/i, monitoring: /monitor|insights|log analytics|observab/i },
    S1Q07: { ingestion: /ingest/i, features: /feature/i, training: /train/i, registration: /regist/i, serving: /serv|inference|endpoint/i, storage: /stor|prediction/i, monitoring: /monitor|drift/i },
};
const coverage = (id, cues) => {
    const p = PARTS[id]; if (!p) return null;
    const text = cues.join(' | ');
    const hit = Object.entries(p).filter(([, re]) => re.test(text)).map(([k]) => k);
    return { hit: hit.length, of: Object.keys(p).length, missing: Object.keys(p).filter((k) => !hit.includes(k)) };
};
// Calibration of the coverage probe on this morning's real 8-line S1Q09 block and its first 5 lines.
{
    const smoke = ['Blob Storage for data', 'Azure ML for training', 'Model Registry for versioning', 'ACR for images', 'AKS for inference', 'Data Factory for orchestration', 'Entra ID for security', 'Azure Monitor for observability'];
    const a = coverage('S1Q09', smoke), b = coverage('S1Q09', smoke.slice(0, 5));
    const ok = a.hit === 8 && b.hit === 5 && b.missing.join() === 'scheduling,identity,monitoring';
    console.log(`probe calibration: full smoke block ${a.hit}/8, first 5 lines ${b.hit}/8 missing ${b.missing.join(',')} -> ${ok ? 'OK' : 'BAD'}`);
    if (!ok) process.exit(1);
}
const PROMPTS = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
const IDS = (ONLY ?? ['S1Q09', 'S1Q07', 'S1Q04F', 'S1Q08F']).filter((id) => PROMPTS[id]);
for (const id of IDS) if (!PROMPTS[id].system.includes(OLD)) { console.log(`REFUSED: ${id}'s captured system prompt does not hold the rule sentence verbatim`); process.exit(3); }

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
const file = path.join(HERE, `spike-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
for (const id of IDS) for (const m of MODELS) for (const [arm, apply] of Object.entries(ARMS)) {
    const system = apply(PROMPTS[id].system);
    if (arm === 'group' && system === PROMPTS[id].system) throw new Error('the group arm changed nothing');
    if (DRY) { console.log(`DRY ${id} ${m.name} ${arm}: system ${system.length} chars, user ${PROMPTS[id].user.length}`); continue; }
    for (let rep = 1; rep <= REPS; rep++) {
        const raw = await ask(system, PROMPTS[id].user, m);
        if (raw == null) { console.log(`${id} ${m.name} ${arm} rep${rep}: no answer (429/5xx x3)`); continue; }
        const { cues } = extractCues(raw);
        const cov = coverage(id, cues);
        out.push({ id, model: m.name, arm, rep, n: cues.length, cues, cov, raw });
        fs.writeFileSync(file, JSON.stringify(out, null, 1));
        console.log(`${id.padEnd(6)} ${m.name.padEnd(13)} ${arm.padEnd(7)} rep${rep}: ${cues.length} lines${cov ? `, covers ${cov.hit}/${cov.of}${cov.missing.length ? ` (missing ${cov.missing.join(',')})` : ''}` : ''} | ${JSON.stringify(cues).slice(0, 150)}`);
        await new Promise((r) => setTimeout(r, 500));
    }
}
if (DRY) process.exit(0);
console.log('\nSUMMARY (lines > 5 / answers; mean coverage where probed)');
for (const id of IDS) for (const m of MODELS) for (const arm of Object.keys(ARMS)) {
    const rows = out.filter((r) => r.id === id && r.model === m.name && r.arm === arm);
    const over = rows.filter((r) => r.n > 5).length, empty = rows.filter((r) => r.n === 0).length;
    const cov = rows.filter((r) => r.cov).map((r) => r.cov.hit / r.cov.of);
    console.log(`${id.padEnd(6)} ${m.name.padEnd(13)} ${arm.padEnd(7)} over-5 ${over}/${rows.length}  empty ${empty}  lines ${rows.map((r) => r.n).join(',')}${cov.length ? `  coverage ${(cov.reduce((a, b) => a + b, 0) / cov.length * 100).toFixed(0)}%` : ''}`);
}
console.log(`wrote ${file}`);
