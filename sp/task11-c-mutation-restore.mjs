import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\llm\\followUpParent.ts';
const text = fs.readFileSync(file, 'utf8');

const newStr = `export function describeFollowUpParentAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    try { return followUpParentEnabled(env) ? 'follow-up parent: on' : 'follow-up parent: off'; } catch { return 'follow-up parent: off'; }   // MUTATION for rule-8 calibration (task 11) — remove the try/catch to restore
}
`;
const oldStr = `export function describeFollowUpParentAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    return followUpParentEnabled(env) ? 'follow-up parent: on' : 'follow-up parent: off';
}
`;

const count = text.split(newStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(newStr).join(oldStr), 'utf8');
console.log('OK: mutation restored');
