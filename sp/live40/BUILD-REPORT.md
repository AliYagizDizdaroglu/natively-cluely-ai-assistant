# live40 build report (2026-10-03)

Status: built; dry self-test ALL PASS (16 checks, 2 negative controls fail as they must); ONE live smoke (C02) ran clean. The full 31 chains were NOT run.
No Gemini lite/Flash call was made; the only model call was the C02 smoke on gemini-3.8-live. MAIN untouched (read only). No text printed.

## Files (SP\live40\)
- items.json (build-items.mjs): 47 items {id, tid, text, route, class, parent, chain, sourceClip}; EASY 20, HARD 27; classes E 20 / H 11 / QF 9 / AF 7; 16 with a parent; 19 with a sourceClip; `chains` = 31 chains. build-items.mjs asserts the key's chain grouping equals SET-draft section 5 verbatim.
- clips/ + clips/manifest.json (make-clips.mjs): id -> path, seconds, sampleRate, sha12, origin reused|rendered, source, textSha12. **Reused 19 (interview60 11, scenario50 4, l38m 4), rendered 28** (SAPI, Microsoft David Desktop, rate 0, 24 kHz mono 16-bit, same script as interview60.build-audio-local.mjs, written only into SP\live40\clips). All 19 reused files exist and their stamped text equals the item text (0 rejected). Reused clips are copied into clips/ (provenance in the manifest). Rate guard flagged RE11 (1.57 w/s) and EF06 (1.58 w/s): 3-word clips, benign.
- run.mjs: the runner. mock-session.mjs: fake session + virtual clock for --dry. dry-check.mjs: the self-test checker. runs/: outputs.

## Differences from L20d (everything else unchanged)
- Unit = chain (31, section 5 order) instead of pair. Within a chain the next turn is played GAP_MS = 10 s after the previous turn's answer window ended (itemDone), silence streamed meanwhile (`--gap-ms`).
- l20d/instruction.txt read from L20d's folder (not copied), sha256 e29bf381... verified before any run. CONTEXT appended with L20d's exact formula (`INSTRUCTION + "\n\n" + CONTEXT block`, CONTEXT block = text from the captured s50k prompt between `CONTEXT:` and `USER QUESTION:`). **The new turns have no captured prompt of their own**, so ONE fixed block is used for every chain: the one of S1Q02 (`--context-from`, default S1Q02; recorded as systemSha12 in the run file). The 39 captured contexts are the same candidate profile with minor section differences (no question-specific content found), so this is a profile-only context.
- End-of-answer detection, retry rule (abnormal close before every played turn has a generationComplete -> chain re-run once, failed attempt kept as `<id>~a1`), model, modalities, transcription, sliding window: as L20d. Added: a failed `connect()` also takes the retry instead of crashing; SIGINT saves; 1.5 s pause after each session (`--chain-pause-ms`). Dropped: `--retry-pair`.
- Events file carries NO text (outputTx/inputTx events keep `chars` only); transcripts + what Live heard + early text go to `<name>.answers.json`. Console prints ids and numbers only. Every saved/logged string is scrubbed of the API key (leak scan over all 17 SP\live40 text files: 0 key hits).
- Clip PCM is hash-checked against the manifest before any network call.

## Metrics (per turn, `metrics` in the run file; ms are SINCE clipEnd unless named)
clipStartMs/clipEndMs (run clock), firstOutputTextMs (first outputTranscription after clipEnd), firstAudioMs, lastOutputTextMs, generationCompleteMs (first after clipEnd), turnCompleteMs (first), lastTurnCompleteMs, words, turnWords [{words, firstMs, lastMs, endKind, endMs}], earlyOutputTx / earlyAudio (output during the question itself), outputTxEvents, generationCompletes, turnCompletes, interrupted, endReason (quietAfterAnswer | quietAfterShort | noOutput | cap | closed), errors, closes. clipStart events carry tailSilenceMs.
**Caveat for reading timings:** every clip ends in ~0.69 s of digital silence (measured 0.69 s on RE02 and EF01; SAPI trailing silence), and clipEnd is after that tail, so true time after the last speech sample is about 0.7 s longer than the number shown if Live endpoints inside the tail. L20d had the same property; nothing was trimmed to stay comparable.

## Dry self-test (no network; `node run.mjs --dry --dry-fail C05 --name live40-dry` then `node dry-check.mjs --name live40-dry`)
Fake session on a virtual clock hears an endpoint after 14 all-zero chunks and answers on a fixed script (audio +500 ms, text +700 ms, 5 pieces of 8 words every 400 ms, generationComplete +200, turnComplete +300; every 7th answer is 3 words; C05 attempt 1 closes with code 1011). 16/16 PASS: 47 turns played in section 5 order (parsed independently from SET-draft.md); 31 chainStart events in order; sessions one at a time; every follow-up starts 10000 ms (measured 10020 for all 16) after the previous itemDone; all 47 turns' firstOutputText/firstAudio/lastOutputText/generationComplete/turnComplete/words equal the script's values, earlyOutputTx 0; 6 short answers took the 30 s path, others the 6 s path; C05 retried exactly once (RE08~a1 kept, RE08 complete); events file has no transcript text; answers file has them.
Negative controls (rule 8): `--gap-ms 2000` -> the gap check FAILS (min 2040); scrambled item labels -> order and gap checks FAIL.
Found on the way: a first mock endpoint (8 zero chunks) fired inside long clips (SAPI pauses/tails of up to 12 zero chunks); fixed to 14, which also explained why earlier checks failed. Not covered by the dry test: the real SDK's message shapes beyond L20d's (unchanged code path), real VAD behaviour, the retry on a real abnormal close.

## Live smoke: `node run.mjs --only C02 --name live40-smoke` (C02 = RE02 -> EF01), 1 session, closed 1000, complete, no errors, no retry
| turn | firstOutputText | firstAudio | lastOutputText | generationComplete | turnComplete | words | endReason |
|---|---|---|---|---|---|---|---|
| RE02 | 984 ms | 984 ms | 3277 ms | 3584 ms | 12652 ms | 27 | quietAfterAnswer (waited 18.7 s) |
| EF01 | 777 ms | 777 ms | 3619 ms | 3952 ms | 14263 ms | 40 | quietAfterAnswer (waited 20.3 s) |
Follow-up EF01 clipStart 10.04 s after RE02's itemDone. Clip tails 695 / 689 ms. earlyOutputTx 0. Files: runs/live40-smoke.json, live40-smoke.answers.json, smoke.console.txt.
Observations: text and first audio arrive in the same message (equal ms); turnComplete comes ~9-10 s after generationComplete (audio playback length), so `generationCompleteMs`/`lastOutputTextMs` are the text-timing metrics, turnCompleteMs is the audio-length one. Wall time ~56 s for the chain.

## Exact command for the full test
`cd "C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\live40"; node run.mjs --name live40-r1`
(outputs runs\live40-r1.json and runs\live40-r1.answers.json; saved after every chain; estimated wall time ~35-45 min = 47 turns x ~(clip + 20 s answer window) + 16 x 10 s gaps; Live quota unknown, free-tier Live limits not measured here.)

## Concerns
1. CONTEXT choice (S1Q02's profile block for all chains) is my assumption; change with `--context-from <S...>` if the controller wants another.
2. SET-draft section 5 says "60 s for hard parents, 20 s for easy ones" as well as "~10 s after the parent's answer window". I read the 10 s as the gap and kept L20d's answer-window detection (6 s quiet after a >= 25-word turn); if 60/20 s were meant as fixed gaps, `--gap-ms` is global, not per parent type.
3. The EASY answers here are 27-40 words in the smoke, so quiet-after-answer (>= 25 words) applied; an easy answer under 25 words would wait 30 s before itemDone (L20d behaviour, adds wall time, no effect on metrics).
4. Clips end in ~0.7 s digital silence (see Metrics caveat).
5. The smoke is one chain; it exercised connect, setup, real-time streaming, transcription, metrics and the gap, not retry, noOutput, cap, interrupted or 3-turn chains (C13, C18) against the real service.
6. Untouched scratch files: _probe.mjs, _leakcheck.mjs, runs/live40-dry*.json, runs/live40-dry-neg*.json.
