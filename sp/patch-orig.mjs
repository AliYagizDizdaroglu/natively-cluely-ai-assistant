import fs from 'node:fs';

const SCRATCH = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
let src = fs.readFileSync(`${SCRATCH}/orig-report-html.mjs`, 'utf8');
// This copy lives outside the golden dir; redirect its relative import and its
// output path to the real locations so it still reads/writes the right files.
src = src.replace(
    "import { INTERVIEW } from './interview60.questions.mjs';",
    "import { INTERVIEW } from 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs';",
);
src = src.replace(
    "const HERE = path.dirname(fileURLToPath(import.meta.url));",
    "const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';",
);
fs.writeFileSync(`${SCRATCH}/orig-report-html-patched.mjs`, src);
console.log('written', `${SCRATCH}/orig-report-html-patched.mjs`);
