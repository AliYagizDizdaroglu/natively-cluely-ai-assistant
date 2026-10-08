// Throwaway: what does the app's context buy that the bare prompt cannot? The bare arm answers a
// SCRIPTED question with no résumé, no transcript, no prior turns. Count how often each arm's
// answer grounds itself in the candidate's own history (first person plus concrete figures/names
// from the CV) versus answering in the generic second person, and show one pair side by side.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');
const pairs = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.pairs.json'), 'utf8')).items.map((p) => [p.id, p.answer ?? '']));
const bare = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_low.json'), 'utf8'));
const capl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_captured-low.json'), 'utf8'));

// "grounded" = speaks as the candidate about their own work, not as an adviser to a third party
const FIRST = /\b(I|I'd|I’d|I've|I’ve|my|our|we|we're|we’re)\b/i;
const ADVISORY = /\b(you should|you'd|you’d|you can|you could|your team|one would|the candidate)\b/i;
const FIG = /\b\d[\d,.]*\s?(%|percent|million|thousand|k\b|ms\b|seconds?|days?)|\b\d{2,}\b/;

const ids = Object.keys(bare).filter((id) => bare[id]?.spoken && pairs[id]);
const score = (txt) => ({ first: FIRST.test(txt), advisory: ADVISORY.test(txt), fig: FIG.test(txt) });
const tally = (name, get) => {
    let f = 0, a = 0, g = 0;
    for (const id of ids) { const s = score(get(id)); if (s.first) f++; if (s.advisory) a++; if (s.fig) g++; }
    console.log(`${name.padEnd(28)} first-person ${String(f).padStart(2)}/${ids.length}   advisory-voice ${String(a).padStart(2)}/${ids.length}   carries figures ${String(g).padStart(2)}/${ids.length}`);
};
console.log(`over the ${ids.length} mains all three answered:\n`);
tally('in-app (app context, live)', (id) => pairs[id]);
tally('offline twin (app context)', (id) => capl[id]?.spoken ?? '');
tally('bare (scripted q, no context)', (id) => bare[id]?.spoken ?? '');

const show = process.argv[2] || 'S1Q01';
const trim = (t, n = 430) => String(t).replace(/\s+/g, ' ').slice(0, n) + (String(t).length > n ? ' …' : '');
console.log(`\n── ${show} ───────────────────────────────────────────`);
console.log(`\nIN-APP (heard the question, had the résumé + transcript):\n  ${trim(pairs[show])}`);
console.log(`\nBARE (scripted question text, no context):\n  ${trim(bare[show]?.spoken)}`);
