import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\LLMHelper.ts';
const text = fs.readFileSync(file, 'utf8');
const oldStr = "      return;   // both empty: nothing to say, as today\n";
const newStr = "      throw new Error('h40c task11 calibration: both empty');   // MUTATION for rule-8 calibration — restore to `return;`\n";
const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence of the both-empty return, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: mutation 1 (both-empty return -> throw) applied');
