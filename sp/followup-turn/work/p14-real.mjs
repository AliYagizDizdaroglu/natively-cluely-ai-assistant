// Throwaway: audit the 8 real s50l transcripts and the pilot with the audit module given as argv[2] (default: the live R/audit-graders.mjs). Prints the audit lines.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FT = path.dirname(HERE), SP = path.dirname(FT).replace(/\\/g, '/');
const mod = path.resolve(process.argv[2] ?? path.join(FT, 'R', 'audit-graders.mjs'));
const RUBRIC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.grader-prompt.md';
const real = ['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c'];
const run = (args) => { const r = spawnSync(process.execPath, [mod, '--allow-validation-bash', '--no-dispatch-check', '--rubric', RUBRIC, ...args], { encoding: 'utf8' }); return `${r.stdout}${r.stderr}`.split('\n').filter((l) => /^(blind-|AUDIT)/.test(l)); };
for (const l of run(['--blind-dir', `${SP}/followup-questions-s50l/blind`, '--session', '9c5886c7-cdbd-48af-b8bc-e9275012ec64', ...real])) console.log(l.slice(0, 420));
for (const l of run(['--blind-dir', `${SP}/followup-turn/pilot-blind`, '--projects', 'C:/Users/sotka/.claude/projects', 'blind-1.g1=session:6441d4bf-d00c-4007-871e-b7dc480b2cab'])) console.log(l.slice(0, 420));
