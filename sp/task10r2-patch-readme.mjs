import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\README.md";
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\r\n/g, '\n');

function applyOnce(label, old, neu) {
    const count = text.split(old).length - 1;
    if (count !== 1) { console.error(`${label}: expected 1 occurrence, found ${count}`); process.exit(1); }
    text = text.replace(old, neu);
    console.log(`${label}: OK`);
}

// Nit: backtick the bare "answers.mjs" mention on line 161.
applyOnce('Nit-backtick-answersmjs',
`answers.mjs still supports a Groq id for a manual pass, though the flight itself no longer schedules one)`,
`\`answers.mjs\` still supports a Groq id for a manual pass, though the flight itself no longer schedules one)`);

// M4: line 166 -- drop the hard-coded "three" answer arms.
applyOnce('M4-line166',
`\`auto <label>\` → the three answer arms + chains into the run folder → judge exports;`,
`\`auto <label>\` → the answer arms + chains into the run folder → judge exports;`);

// M4: lines 247-249 -- describe what done.json's toGrade array actually lists, instead of hard-coded counts.
applyOnce('M4-lines247-249',
`When it is done, \`interview60.flight.done.json\` in the run folder lists the four pairs files to grade
(the hour's own answers and the three arms). Grading is the no-key judge route above; the gate reads
the hour's \`interview60.judge.json\`, and the three \`interview60.judge.<model>.json\` files are the comparison.`,
`When it is done, \`interview60.flight.done.json\` in the run folder lists the pairs files still to grade
in its \`toGrade\` array — the hour's own answers, plus one per answer and paired arm that ran. Grading
is the no-key judge route above; the gate reads the hour's \`interview60.judge.json\`, and one
\`interview60.judge.<model>.json\` per arm in that list is the comparison.`);

fs.writeFileSync(path, text, 'utf8');
console.log('WROTE ' + path + '  length=' + text.length);
