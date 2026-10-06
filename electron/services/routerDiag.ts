import * as fs from 'fs';
import * as path from 'path';

const DIAG_LOG = path.join(process.cwd(), 'verbal-diag.log');

/** Router lines: the debug log (console) and, from the Electron main process only, verbal-diag.log (same guard as WhatToAnswerLLM.diagLog, ce4e730). */
export function routerDiag(line: string): void {
  console.log(line);
  if (process.type !== 'browser') return;
  try { fs.appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${line}\n`); } catch { /* never break the stream */ }
}
