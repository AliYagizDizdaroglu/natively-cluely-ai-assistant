import fs from 'node:fs';
const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/guard-h40c-cal/electron/test/golden/interview60.flight.mjs';
let t = fs.readFileSync(p, 'utf8');
t = t.replace(/export const ANSWER_MODELS = \[[^\]]*\];/, "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'openai/gpt-oss-120b'];");
fs.writeFileSync(p, t);
console.log('injected');
