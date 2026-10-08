import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\LLMHelper.ts';
const text = fs.readFileSync(file, 'utf8');
const oldStr = "    console.log(`[LLMHelper] verbal hedge: back started at ${since()}ms reason=${reason}`);\n    const back = start(BACK);\n";
const newStr = "    console.log(`[LLMHelper] verbal hedge: back started at ${since()}ms reason=${reason}`);\n    if (reason === 'front-empty') return;   // MUTATION for rule-8 calibration — remove this line to restore\n    const back = start(BACK);\n";
const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence of the back-start block, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: mutation 2 (empty front no longer starts the back leg) applied');
