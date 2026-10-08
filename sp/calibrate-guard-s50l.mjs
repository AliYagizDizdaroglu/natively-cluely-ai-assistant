// Would the guard's notation check have FAILED on the build s50k flew? Apply its exact
// predicate to the text that build actually produced. If this passes, the check is inert.
import { readFileSync } from 'node:fs';

const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k';
const old = JSON.parse(readFileSync(`${R}/interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json`, 'utf8'))['S1Q02'].spoken;

const trips = /[$\\]/.test(old) || old.includes('frac') || !old.includes('population of 100,000');
console.log('old build spoken text :', JSON.stringify(old.slice(0, 120)));
console.log('guard predicate trips :', trips);
process.exit(trips ? 0 : 1);
