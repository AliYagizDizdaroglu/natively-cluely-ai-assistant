import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const esbuild = require('esbuild');
const SP = process.argv[2];
const out = await esbuild.transform(fs.readFileSync(SP + '/head_vsf.ts', 'utf8'), { loader: 'ts', format: 'esm' });
fs.writeFileSync(SP + '/vsf.mjs', out.code);
console.log('transpiled bytes:', out.code.length);
