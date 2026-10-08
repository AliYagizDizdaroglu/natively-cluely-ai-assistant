// Rebuilds the r1 router CONTEXT text from the user's own profile exports, with the SAME algorithm as KnowledgeOrchestrator.getRouterProfileSummary / getCompactJDHeader
// (bundle worktree electron/knowledge/KnowledgeOrchestrator.ts:527-548). The text is written ONLY if it hashes to the registered sha12 b2a43a2159a2 and is 266 chars; otherwise nothing is written and
// the run stays stopped (spec 11: a different context is never substituted). Prints sha12 and char counts only, never the text. NO network, NO model.
//   node context-from-profile.mjs --resume <structured_data.json> [--jd <structured_data.json>] [--out routing/context.txt]
// The exports are the active resume's / JD's `structured_data` objects (the user can copy them out of the app's profile store); this script never opens the app's database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTING, CTX_SHA12, CTX_CHARS, sha12 } from './common.mjs';

/** getCompactJDHeader, verbatim logic. */
export function compactJdHeader(jd) {
    if (!jd) return null;
    const levelStr = jd.level ? jd.level.charAt(0).toUpperCase() + jd.level.slice(1) : 'Mid-level';
    const techFocus = jd.technologies?.slice(0, 4).join(', ') || '';
    const keyThemes = jd.keywords?.slice(0, 3).join(', ') || '';
    return `${levelStr} ${jd.title} at ${jd.company}${jd.location ? ` (${jd.location})` : ''}. Tech: ${techFocus}. Themes: ${keyThemes}.`;
}
/** getRouterProfileSummary, verbatim logic (knowledge mode on and a resume active are the caller's facts). */
export function routerProfileSummary(resume, jd) {
    const lines = [];
    const who = [resume?.identity?.name?.trim(), resume?.experience?.[0]?.role?.trim()].filter(Boolean);
    if (who.length) lines.push(`Candidate: ${who.join(', ')}.`);
    const skills = (resume?.skills ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 15);
    if (skills.length) lines.push(`Skills: ${skills.join(', ')}.`);
    const header = compactJdHeader(jd);
    if (header) lines.push(`Target role: ${header}`);
    return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
    if (!arg('--resume')) refuse('usage: --resume <structured_data.json> [--jd <structured_data.json>] [--out <file>]');
    const resume = JSON.parse(fs.readFileSync(arg('--resume'), 'utf8')), jd = arg('--jd') ? JSON.parse(fs.readFileSync(arg('--jd'), 'utf8')) : null;
    const text = routerProfileSummary(resume, jd);
    const ok = sha12(text) === CTX_SHA12 && text.length === CTX_CHARS;
    console.log(`context rebuilt: sha12 ${sha12(text)} chars ${text.length}; registered ${CTX_SHA12} / ${CTX_CHARS}: ${ok ? 'MATCH' : 'NO MATCH'}`);
    if (!ok) refuse('the rebuilt context is not the registered one: nothing written; the run stays stopped and the user is asked');
    const out = arg('--out') ?? path.join(ROUTING, 'context.txt');
    if (fs.existsSync(out)) refuse(`${out} exists`);
    fs.writeFileSync(out, text);
    console.log(`wrote ${out} (the file is the only copy of the text; it is the user's profile data: keep it out of any commit)`);
}
