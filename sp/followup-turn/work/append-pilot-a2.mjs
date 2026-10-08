import fs from 'node:fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/R';
const stamp = new Date().toLocaleString('sv-SE', { hour12: false });
const pilotLine = fs.readFileSync(`${R}/pilot-a2.console.txt`, 'utf8').split('\n').find((l) => l.startsWith('pilot a2'));
const audit = fs.readFileSync(`${R}/pilot-a2.audit.out.txt`, 'utf8').trim();
const out = [
    '', `== pilot attempt 2 (controller, ${stamp}) ==`,
    'command: node launch-grader.mjs pilot --pilot <F>/pilot-blind --attempt 2',
    pilotLine,
    'command: node audit-graders.mjs --blind-dir <F>/pilot-blind --projects C:/Users/sotka/.claude/projects blind-1.g1=session:fde64205-5ecf-4ccf-ae04-7ec369464ddf   (default mode, no --allow-validation-bash)',
    audit,
    'command: node check-grader-memory.mjs --projects C:/Users/sotka/.claude/projects pilot=session:fde64205-5ecf-4ccf-ae04-7ec369464ddf -> pilot: ABSENT projectMemory=0 claudeMem=0',
    'command: node h40d-grader-models.mjs --projects C:/Users/sotka/.claude/projects pilot=session:fde64205-5ecf-4ccf-ae04-7ec369464ddf -> pilot: {"claude-opus-5-5":7} PINNED', '',
].join('\n');
fs.appendFileSync(`${R}/audit-graders.point15.out.txt`, out);
console.log(out);
