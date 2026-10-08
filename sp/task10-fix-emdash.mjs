import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.mjs";
let text = fs.readFileSync(path, 'utf8');

const old = "the user's request on 2026-09-26 -- answers.mjs still runs a Groq id by hand";
const neu = "the user's request on 2026-09-26 \u2014 answers.mjs still runs a Groq id by hand";

const count = text.split(old).length - 1;
if (count !== 1) { console.error(`expected 1 occurrence, found ${count}`); process.exit(1); }
text = text.replace(old, neu);
fs.writeFileSync(path, text, 'utf8');
console.log('OK');
