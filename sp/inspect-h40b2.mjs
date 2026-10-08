import { readFileSync } from 'node:fs';

const RUN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b';

const answers = JSON.parse(readFileSync(`${RUN}\\interview60.answers.json`, 'utf8'));
console.log('--- full R01 answers entry ---');
console.log(JSON.stringify(answers.R01, null, 2));

const chains = JSON.parse(readFileSync(`${RUN}\\interview60.chains.json`, 'utf8'));
console.log('--- full docker chain entry ---');
console.log(JSON.stringify(chains.docker, null, 2).slice(0, 4000));

// counts
for (const f of ['interview60.answers.json', 'interview60.answers.gemini-3.1-flash-lite_captured-low.json', 'interview60.answers.gemini-3.5-flash-lite.json']) {
  const j = JSON.parse(readFileSync(`${RUN}\\${f}`, 'utf8'));
  const keys = Object.keys(j);
  const models = {};
  for (const k of keys) { const m = j[k].model || 'MISSING'; models[m] = (models[m]||0)+1; }
  console.log(f, 'entries=', keys.length, 'models=', models);
}
