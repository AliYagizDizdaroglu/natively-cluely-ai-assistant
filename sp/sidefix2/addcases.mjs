import fs from 'node:fs';
const M = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/llm/verbalStreamFilter.test.ts';
const t = fs.readFileSync(M, 'utf8');
if (t !== fs.readFileSync('verbalStreamFilter.test.ts', 'utf8')) throw new Error('MAIN test file differs from the SP copy');
const anchor = "            ['$x^2$', 'x^2'],\n";
if (t.split(anchor).length !== 2) throw new Error('anchor');
const add = "            // A full stop after a pair (review of 2026-10-03, Low 2): mid-stream and at the end of the stream.\n" +
"            ['That is $100,000$. Next.', 'That is 100,000. Next.'],\n" +
"            ['That is $100,000$.', 'That is 100,000.'],\n";
fs.writeFileSync('verbalStreamFilter.test.ts', t.replace(anchor, () => anchor + add));
