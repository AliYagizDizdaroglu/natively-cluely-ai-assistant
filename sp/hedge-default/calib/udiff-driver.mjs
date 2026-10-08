// Throwaway (scratchpad only): drive hedge-tool's unifiedDiff on two arbitrary files, to calibrate it against `diff -u`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { unifiedDiff } = await import(pathToFileURL(path.join(HERE, '..', 'hedge-tool.mjs')).href);
const [a, b] = process.argv.slice(2);
process.stdout.write(unifiedDiff(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'), 'a', 'b'));
