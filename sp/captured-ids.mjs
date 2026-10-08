// Throwaway: print the --only list the flight would hand the captured paired arm for a given
// prompts file, using MAIN's flight.mjs (NATIVELY_ROSTER must be set the way the launcher sets it).
import fs from 'node:fs';
const flight = await import('file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.flight.mjs');
const cap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ids = flight.capturedOnly(cap);
console.log(`${ids.length} of ${Object.keys(cap).length} captured entries are replayable spoken items`);
console.log(ids.join(','));
