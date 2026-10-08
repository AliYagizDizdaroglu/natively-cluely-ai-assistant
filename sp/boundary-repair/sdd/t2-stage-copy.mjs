// Throwaway (Task 2): copy MAIN's DeepgramStreamingSTT.ts into the staging folder byte for byte
// (refuses to overwrite an existing staged copy, so a half-edited stage is never clobbered).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair/stage';
const rel = 'electron/audio/DeepgramStreamingSTT.ts';
const dst = `${STAGE}/${rel}`;
if (fs.existsSync(dst)) { console.log(`REFUSED: ${dst} already exists`); process.exit(4); }
fs.copyFileSync(`${MAIN}/${rel}`, dst);
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
console.log(`copied ${rel}: MAIN ${fs.statSync(`${MAIN}/${rel}`).size} bytes sha256 ${sha(`${MAIN}/${rel}`)}`);
console.log(`           stage ${fs.statSync(dst).size} bytes sha256 ${sha(dst)}`);
