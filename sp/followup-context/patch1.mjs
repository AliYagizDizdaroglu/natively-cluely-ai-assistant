// Throwaway: applies the calibration fixes to the reference gate and the replay list construction.
import fs from 'node:fs';
let s = fs.readFileSync('earlierQuestions.ref.mjs', 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 60)); s = s.replace(a, b); };
rep(`const REFERENCE = /\\b(your|that|the same|the previous|the earlier|the last|the first|the original) (answer|`, `const REFERENCE = /\\b(your|that|the previous|the earlier|the last|the first|the original) (answer|`);
rep(`|manifests|response|choice|decision|strategy|recommendation|estimate|configuration|policy|migration|rollout|contract|budget|index|table|tables|job|test|tests|version|number|numbers|figure|figures|calculation|assumption|assumptions|logic|setup|design task)\\b/i;`, `|manifests|response|strategy|recommendation|estimate|configuration|policy|migration|rollout|contract|budget|index|table|tables|job|test|tests|version|number|numbers|figure|figures|calculation|logic|setup|design task)\\b/i;`);
rep(`const CONSTRAINT = /\\b(preserv|keep|maintain|retain|respect|honou?r|satisfy|meet)\\w*\\s+(the|that|those|its|their|our|my)\\b`, `const CONSTRAINT = /\\b(while|still|and still|but still|yet still|without (losing|breaking|violating))\\s+(preserv|keep|maintain|retain|respect|honou?r|satisfy|meet)\\w*\\s+(the|that|those|its|their|our|my)\\b`);
rep(`const SHORT_WORDS = 6;`, `const SHORT_WORDS = 3;\nconst CONSTRAINT_MAX_WORDS = 25; // a long question that keeps a constraint states it itself (S2Q06, S4Q07)`);
rep(`    if (CONSTRAINT.test(q)) return { fires: true, cue: 'constraint' };`, `    if (wordsOf(q) <= CONSTRAINT_MAX_WORDS && CONSTRAINT.test(q)) return { fires: true, cue: 'constraint' };`);
rep(`    if (THAT_PRE.test(segThat) || THAT_POST.test(segThat)) return { fires: true, cue: 'pronoun' };`, `    // "that" after a noun is a relative clause ("a batch that fails"): only after an auxiliary,\n    // preposition or verb (THAT_PRE), or as the segment's first word, is it a pronoun.\n    if (THAT_PRE.test(segThat) || /^that\\b/i.test(segThat)) return { fires: true, cue: 'pronoun' };`);
rep(`const THAT_POST = /\\bthat (is|was|would|could|should|will|can|does|did|has|have|might|may|mean|means|work|works|hold|holds|change|changes|apply|applies|matter|matters|scale|scales|differ|differs|help|helps|break|breaks|fail|fails|look|looks|still)\\b/i;\n`, ``);
fs.writeFileSync('earlierQuestions.ref.mjs', s);

let g = fs.readFileSync('gate-report.mjs', 'utf8');
const rep2 = (a, b) => { if (!g.includes(a)) throw new Error('missing: ' + a.slice(0, 60)); g = g.replace(a, b); };
rep2(`    // The pinned questions the app had answered BEFORE this dispatch (its own dispatch excluded).
    const answered = dispatches.filter((d) => d.at < at - 500).map((d) => ({ text: d.text, timestamp: d.at }));`,
`    // The pinned questions the app had answered BEFORE this id's own dispatch: the capture is
    // written after the knowledge lookup, up to seconds after its dispatch line, so the cut is
    // the dispatch whose question text is this capture's pinned line, not a time margin.
    let own = -1;
    for (let i = dispatches.length - 1; i >= 0; i--) if (dispatches[i].at <= at && dispatches[i].text === current) { own = i; break; }
    if (own < 0) throw new Error(\`\${id}: no dispatch line carries its pinned question\`);
    const answered = dispatches.slice(0, own).map((d) => ({ text: d.text, timestamp: d.at }));`);
rep2(`    const at = Date.parse(p.at);
    const answered = dispatches.filter((d) => d.at < at - 500).map((d) => ({ text: d.text, timestamp: d.at }));
    const g = gate(c.q);`,
`    const at = Date.parse(p.at);
    const slotCurrent = lines.slice(start).map((l) => INTERVIEWER_LINE.exec(l)?.[1]).filter(Boolean).pop();
    let own = -1;
    for (let i = dispatches.length - 1; i >= 0; i--) if (dispatches[i].at <= at && dispatches[i].text === slotCurrent) { own = i; break; }
    if (own < 0) throw new Error(\`\${c.slot}: no dispatch line carries its pinned question\`);
    const answered = dispatches.slice(0, own).map((d) => ({ text: d.text, timestamp: d.at }));
    const g = gate(c.q);`);
fs.writeFileSync('gate-report.mjs', g);
console.log('patched');
