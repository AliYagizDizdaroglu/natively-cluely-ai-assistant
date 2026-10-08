import { INTERVIEW } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs';
import { CODING } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/problems.coding.mjs';

// exact copy of electron/services/screenReference.ts
const SCREEN = /\b(on|at|to) (the |my |your |this )?screen\b|\bshared? (my |the |your )?screen\b|\bscreen ?shar(e|ing)\b/i;
const mentionsScreen = (q) => SCREEN.test(q);

const hits = INTERVIEW.filter((i) => mentionsScreen(i.q));
console.log('items:', INTERVIEW.length, ' mentionsScreen hits:', hits.length);
for (const h of hits) console.log('  ', h.id, h.kind ?? 'spoken', JSON.stringify(h.q));
const missedCues = INTERVIEW.filter((i) => i.kind === 'screenshot' && !mentionsScreen(i.q));
console.log('screenshot cues NOT matched:', missedCues.map((m) => m.id));
const cuesNoProblem = INTERVIEW.filter((i) => i.kind === 'screenshot' && !i.problem);
console.log('screenshot cues without a problem:', cuesNoProblem.map((m) => m.id));

// page height as renderProblemPage computes it
const lh = 30, gap = 26;
for (const id of ['PY4', 'PY5', 'PY2']) {
    const p = CODING.find((c) => c.id === id);
    let y = 40;
    for (const s of p.shots) { if (s.title) { y += 30 + 14; } y += s.lines.length * lh; y += gap; }
    console.log(`${id} ${p.name}: page 1100 x ${y + 30}px, ${p.shots.length} shots`);
    const scale1080 = (1080 - 40) / (y + 30);
    console.log(`   scaled to a 1040px-tall work area: x${scale1080.toFixed(2)} -> body text ${(20 * scale1080).toFixed(1)}px`);
}
