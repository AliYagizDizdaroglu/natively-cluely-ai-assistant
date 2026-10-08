import { readFileSync } from 'node:fs';
const RUN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b';
const chains = JSON.parse(readFileSync(`${RUN}\\interview60.chains.json`, 'utf8'));
let totalTurns = 0, totalContextual = 0, totalStandalone = 0;
for (const [id, chain] of Object.entries(chains)) {
  for (const turn of chain.turns) {
    totalTurns++;
    console.log(id, Object.keys(turn));
    if (turn.contextual !== undefined) totalContextual++;
    if (turn.standalone !== undefined) totalStandalone++;
  }
}
console.log('chains:', Object.keys(chains).length, 'totalTurns:', totalTurns, 'contextual:', totalContextual, 'standalone:', totalStandalone);
