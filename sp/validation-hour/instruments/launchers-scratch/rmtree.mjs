// Scratch (launcher builder D): removes ONE folder tree that lies inside launchers-scratch (never anywhere else, never a
// junction or symlink). node rmtree.mjs <folder-name-inside-launchers-scratch>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name || /[\\/]/.test(name) || name.startsWith('.')) { console.log('REFUSED: give one plain folder name'); process.exit(2); }
const target = path.join(HERE, name);
if (!fs.existsSync(target)) { console.log(`nothing to remove: ${name}`); process.exit(0); }
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isSymbolicLink()) { console.log(`REFUSED: ${p} is a link`); process.exit(2); } if (e.isDirectory()) walk(p); } };
walk(target);
fs.rmSync(target, { recursive: true, force: true });
console.log(`removed ${name}: ${fs.existsSync(target) ? 'STILL THERE' : 'gone'}`);
