import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.mjs";
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\r\n/g, '\n');

const old = ` *      and the paired arms (PAIRED_ARMS) (the hour's captured prompts at the
 *      pre-bench level, the bare prompt at the shipped LOW level), plus the`;
const neu = ` *      and the paired arms (PAIRED_ARMS below: the hour's captured prompts
 *      and the bare prompt, on both Flash Lites, at the levels and
 *      repetitions listed there), plus the`;

const count = text.split(old).length - 1;
if (count !== 1) { console.error(`expected 1 occurrence, found ${count}`); process.exit(1); }
text = text.replace(old, neu);

fs.writeFileSync(path, text, 'utf8');
console.log('OK length=' + text.length);
