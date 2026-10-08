// Throwaway: print the NAMES of the variables in MAIN's .env, never a value, so a launcher that hands
// the whole file to node through --env-file knows which settings ride along with the key.
import fs from 'node:fs';
const text = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const names = [...text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((m) => m[1]);
console.log(names.sort().join('\n'));
console.log(`${names.length} names`);
