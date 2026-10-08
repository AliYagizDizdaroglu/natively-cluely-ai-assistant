// Throwaway in-run sampler for the LIVE-ONLY hour. Prints one compact sample
// of the app's log since the given ISO time (default: whole file), plus a
// stall flag when the log has not grown for 3 minutes.
import fs from 'node:fs';

const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const DIAG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/verbal-diag.log';
const since = process.argv[2] ? Date.parse(process.argv[2]) : 0;
const now = new Date();

const stat = fs.statSync(LOG);
const dbg = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => {
  const t = Date.parse(l.slice(0, 24));
  return Number.isFinite(t) ? t >= since : false;
});
const c = (re) => dbg.filter((l) => re.test(l)).length;
const last = (re) => { for (let i = dbg.length - 1; i >= 0; i--) if (re.test(dbg[i])) return dbg[i].slice(0, 160); return '(none)'; };
const lastTs = dbg.length ? dbg[dbg.length - 1].slice(0, 24) : '?';
const stalledMs = now - stat.mtimeMs;

console.log(`=== LIVE-ONLY sample ${now.toISOString().slice(11, 19)}Z  log ${(stat.size / 1024).toFixed(0)} KB, last write ${Math.round(stalledMs / 1000)}s ago${stalledMs > 180_000 ? '  *** STALL ***' : ''}`);
console.log(`captions: fragments ${c(/\[LiveCaption\] fragment/)}  finals ${c(/\[LiveCaption\] final/)}   live questions ${c(/\[Main\] Live question/)}`);
console.log(`dispatch: answer ${c(/dispatch: answer/)}  chip ${c(/dispatch: chip/)}  drop ${c(/dispatch: drop/)}   verdicts: match ${c(/dispatch: (answer|chip) .*verdict=match/)} paraphrase ${c(/dispatch: (answer|chip) .*verdict=paraphrase/)} replaced ${c(/dispatch: (answer|chip) .*verdict=replaced/)} unverifiable ${c(/dispatch: (answer|chip) .*verdict=unverifiable/)}  fragment-drops ${c(/verdict=fragment/)}`);
console.log(`live: reconnecting ${c(/\[LiveRouter\] reconnecting/)}  ws-closed ${c(/\[LiveRouter\] ws closed/)}  goAway ${c(/\[LiveRouter\] goAway/)}  replays ${c(/replaying \d+ buffered/)}  resumption-updates ${c(/sessionResumptionUpdate/)}  failed ${c(/quick attempts failed/)}  ws-errors ${c(/\[LiveRouter\] ws error/)}`);
console.log(`groq: detect-issued ${c(/GroqDetectionClient\] detect issued/)}  stt-transcripts ${c(/\[RestSTT\] Transcript|\[DeepgramStreaming\] Transcript/)}   answers: stream-failed ${c(/Stream failed/)}  429s ${c(/(HTTP|status|code)[ =:]*429|RESOURCE_EXHAUSTED|Too Many Requests/i)}  errors ${c(/\[ERROR\]/)}`);
console.log(`last usage: ${last(/\[LiveRouter\] usage/)}`);
console.log(`last final:  ${last(/\[LiveCaption\] final/)}`);
console.log(`last dispatch: ${last(/\[Main\] dispatch:/)}`);
try {
  const diag = fs.readFileSync(DIAG, 'utf8').split('\n').filter((l) => { const t = Date.parse(l.slice(1, 25)); return Number.isFinite(t) && t >= since; });
  console.log(`diag: streams started ${diag.filter((l) => /filterVerbalLines started/.test(l)).length}  first-token lines ${diag.filter((l) => /first token/.test(l)).length}`);
} catch { /* diag optional */ }
console.log(`(log lines since window start: ${dbg.length}, last ${lastTs})`);
