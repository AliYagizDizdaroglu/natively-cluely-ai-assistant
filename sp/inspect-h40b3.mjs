import { readFileSync, readdirSync } from 'node:fs';

const RUN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b';

const files = readdirSync(RUN).filter((f) => f.startsWith('interview60.answers.') && f.endsWith('.json'));
for (const f of files) {
  const j = JSON.parse(readFileSync(`${RUN}\\${f}`, 'utf8'));
  const keys = Object.keys(j);
  console.log(f.padEnd(70), 'entries=', keys.length);
}
