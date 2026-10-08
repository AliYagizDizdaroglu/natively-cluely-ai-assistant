// Throwaway (scratchpad only): the real module, the real process.env, a real separate process — the same no-argument
// call main.ts makes at startup. Prints names and results only; it reads no key.
import { describeVerbalHedgeAtStartup, verbalHedgeEnabled } from 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/llm/verbalHedge';

const shown = (name: string) => `${name}=${process.env[name] === undefined ? '(unset)' : JSON.stringify(process.env[name])}`;
let result: string;
try { result = describeVerbalHedgeAtStartup(); } catch (e) { result = `THREW: ${(e as Error).message}`; }
let enabled: string;
try { enabled = String(verbalHedgeEnabled()); } catch (e) { enabled = 'THREW'; }
console.log(`${shown('NATIVELY_VERBAL_HEDGE')} ${shown('NATIVELY_VERBAL_HEDGE_TRIGGER_MS')} -> verbalHedgeEnabled()=${enabled}; describeVerbalHedgeAtStartup(): ${result}`);
