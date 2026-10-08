import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.mjs';
const text = fs.readFileSync(file, 'utf8');

const newStr = `    out.push(t.verbalHedge?.startsWith('on') ? \`- Verbal hedge: \${t.verbalHedge} (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)\` : \`- Verbal hedge: \${t.verbalHedge}\`);   // MUTATION for rule-8 calibration (task 11) — restore the null guard`;
const oldStr = `    if (t.verbalHedge != null) out.push(t.verbalHedge.startsWith('on') ? \`- Verbal hedge: \${t.verbalHedge} (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)\` : \`- Verbal hedge: \${t.verbalHedge}\`);`;

const count = text.split(newStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(newStr).join(oldStr), 'utf8');
console.log('OK: mutation restored — the null guard is back');
