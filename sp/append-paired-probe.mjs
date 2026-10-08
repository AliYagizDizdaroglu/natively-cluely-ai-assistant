// append-paired-probe.mjs — record the paired latency probe in memory. It CORRECTS the
// standing inference behind the s50m verdict, so it belongs next to that verdict in the
// flights file AND in the index line a future session actually reads first.
import { readFileSync, writeFileSync } from 'node:fs';
const D = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory';

const BODY = ' ; PAIRED LATENCY PROBE 2026-09-22 21:34 UTC — THE s50m STALL INFERENCE IS FALSIFIED. Every recorded latency comparison between the two Flash Lites was confounded: PAIRED_ARMS runs all five 3.1 arms before all four 3.5 arms, so batch position tracked model. This probe removes that — s50m\'s own 39 captured prompts, BOTH models issued back to back on each one, strictly sequential, order alternating per id, measuring the PRIMARY\'s own first token with NO fallback (script scratchpad/paired-latency-probe.mjs, keys via --env-file only). RESULT: 3.5-lite HIGH p50 3944 p90 4549 max 5638, ZERO over the 10 s budget, zero errors; 3.1-lite LOW p50 6484 p90 8047 max 11658, ONE over the budget (S1Q05F 11658 ms) and one HTTP 503 (S1Q09F). Paired: 3.5-lite faster on 34 of 38 pairs, median −2426 ms, sign test p = 3e-7. Order control: median first-in-pair 4549 ms vs second-in-pair 4160 ms, so the alternation did not manufacture the gap. READ IT AS: in one clean window 3.5-lite HIGH is roughly 2.4 s faster per answer and was the model that did NOT trip the stall budget — 3.1-lite\'s p90 of 8.0 s sits much closer to the 10 s budget than 3.5-lite\'s 4.5 s, so on this evidence 3.1-lite is the stall risk, not 3.5-lite. s50m\'s four fallbacks were a bad hour, not a property of the model. LIMITS: one ~10-minute window, so it does not prove 3.5-lite never stalls, and it says nothing about quality (that comparison already replicated in 3.5-lite\'s favour). It does NOT itself swap the model — the s50m verdict was pre-registered and is not renegotiated after the fact. What it licenses is RE-OPENING the question with a newly pre-registered proof flight whose condition 4 measures the PRIMARY\'s first token (or exempts fallback-served answers), which is the wording lesson already recorded above. That is the user\'s call, not mine.';

const flights = `${D}/project_thinking_flights.md`;
let s = readFileSync(flights, 'utf8');
if (s.includes('PAIRED LATENCY PROBE 2026-09-22')) { console.log('body: already present'); }
else { writeFileSync(flights, s.trimEnd() + BODY + '\n', 'utf8'); console.log('body: appended'); }

// The index line is the hook a future session reads before opening anything. Its tail
// currently states the s50m verdict as settled; that sentence is the one now qualified.
const OLD = 'so 3.1-lite LOW stays PERMANENTLY;';
const NEW = 'so 3.1-lite LOW stays for now — but the PAIRED PROBE 09-22 falsified the reason: same window, alternating order, no fallback, 3.5-lite HIGH had ZERO answers over the budget and was faster on 34 of 38 pairs (median −2426 ms) while 3.1-lite had the one breach, so re-opening with a correctly worded condition 4 is live;';
const idxPath = `${D}/MEMORY.md`;
let idx = readFileSync(idxPath, 'utf8');
if (idx.includes('PAIRED PROBE 09-22')) console.log('index: already present');
else if (!idx.includes(OLD)) console.log('index: ANCHOR NOT FOUND — left untouched, fix by hand');
else { writeFileSync(idxPath, idx.replace(OLD, NEW), 'utf8'); console.log('index: updated'); }
console.log('MEMORY.md bytes now:', Buffer.byteLength(readFileSync(idxPath, 'utf8')));
