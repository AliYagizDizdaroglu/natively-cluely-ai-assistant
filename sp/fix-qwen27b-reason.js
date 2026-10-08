const fs = require('fs');
const p = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-15T08-22-29-s50f/interview60.judge.verdicts.qwen_qwen3.8-27b.json';
const v = JSON.parse(fs.readFileSync(p, 'utf8'));
v.S1Q02.reason = "All arithmetic right (2,850 true positives, 57 percent precision, 30 percent recall); wrapped in an 'I would say' quote and 109 words.";
fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
console.log('patched, reason words:', v.S1Q02.reason.split(/\s+/).length);
