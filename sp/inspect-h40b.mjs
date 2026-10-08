import { readFileSync, readdirSync } from 'node:fs';

const RUN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b';

function show(name, limit = 1200) {
  const p = `${RUN}\\${name}`;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  console.log(`--- ${name} ---`);
  if (Array.isArray(j)) {
    console.log('array len=', j.length);
    console.log(JSON.stringify(j[0], null, 2).slice(0, limit));
  } else {
    console.log('keys=', Object.keys(j));
    const k0 = Object.keys(j)[0];
    console.log('sample under', k0, '=', JSON.stringify(j[k0], null, 2).slice(0, limit));
  }
}

show('interview60.answers.json');
show('interview60.chains.json');
