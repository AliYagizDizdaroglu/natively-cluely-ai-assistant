#!/usr/bin/env node
/**
 * Fast electron build using esbuild (transpile-only, no type checking).
 * ~10-50x faster than `tsc` for dev builds.
 * Run `npm run typecheck:electron` separately for type safety.
 */

const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist-electron');

const entryPoints = [];

// Function to recursively find all .ts files in a directory
const findTs = (dir) => {
  const results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...findTs(full));
    else if (f.name.endsWith('.ts') && !f.name.endsWith('.d.ts')) results.push(full);
  }
  return results;
};

const electronDir = path.resolve(rootDir, 'electron');
if (fs.existsSync(electronDir)) {
  entryPoints.push(...findTs(electronDir).map(f => path.relative(rootDir, f)));
}

// Also include premium electron files if they exist
const premiumDir = path.resolve(rootDir, 'premium/electron');
if (fs.existsSync(premiumDir)) {
  entryPoints.push(...findTs(premiumDir).map(f => path.relative(rootDir, f)));
}

// Incremental skip: if no source file is newer than the oldest output, nothing changed.
const force = process.argv.includes('--force');
if (!force) {
  const allSrc = entryPoints.map(f => path.resolve(rootDir, f));
  const newestSrc = Math.max(...allSrc.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }));
  const allOut = allSrc.map(f => {
    const rel = path.relative(path.join(rootDir, 'electron'), f).replace(/\.ts$/, '.js');
    return path.join(outDir, 'electron', rel);
  });
  const oldestOut = Math.min(...allOut.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }));
  if (newestSrc <= oldestOut) {
    console.log('[build-electron] Up to date, skipping build (use --force to override)');
    process.exit(0);
  }
}

const start = Date.now();

build({
  entryPoints,
  absWorkingDir: rootDir, // resolve the relative entryPoints against rootDir, not process.cwd()
  bundle: false,          // match tsc behaviour: no bundling, just transpile
  outdir: outDir,
  outbase: rootDir,       // preserve directory structure (electron/main.ts → dist-electron/electron/main.js)
  platform: 'node',
  target: 'node20',
  format: 'cjs',          // CommonJS to match tsc "module": "CommonJS"
  sourcemap: true,
  jsx: 'automatic',
  loader: {
    '.ts': 'ts',
    '.js': 'js',
  },
  logLevel: 'warning',
}).then(() => {
  console.log(`[build-electron] Done in ${Date.now() - start}ms`);
}).catch((err) => {
  console.error('[build-electron] Build failed:', err.message);
  process.exit(1);
});
