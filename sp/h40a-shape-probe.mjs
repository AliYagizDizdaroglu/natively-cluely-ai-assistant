// Throwaway: print the field names of one item in each h40a file the TTFT table needs. Reads only.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const show = (label, f) => {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const items = Array.isArray(j) ? j : j.items ?? j;
    const first = Array.isArray(items) ? items[0] : Object.entries(items)[0];
    console.log(`${label}: top=${Array.isArray(j) ? 'array' : Object.keys(j).slice(0, 8).join(',')}`);
    console.log(`   first=${JSON.stringify(first, (k, v) => typeof v === 'string' && v.length > 60 ? v.slice(0, 60) + '…' : v).slice(0, 700)}`);
};
show('captured-low', `${RD}/interview60.answers.gemini-3.1-flash-lite_captured-low.json`);
show('gemma min', `${SP}/gemma-h40a/interview60.answers.gemma-4-26b-a4b-it_min.json`);
show('judge.pairs', `${RD}/interview60.judge.pairs.json`);
