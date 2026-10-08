// Records the h40d arming (2026-10-01 21:26) in memory: a new memory file on system-audio contamination, an appended
// section in project_agenda.md, and MEMORY.md's Agenda line + one new index line. Exact-match anchors; refuses otherwise.
import fs from 'node:fs';
const D = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';
const M = D + 'MEMORY.md';
let s = fs.readFileSync(M, 'utf8');
const anchor = 'small-talk-vs-question concern parked after Fri';
if (s.split(anchor).length !== 2) throw new Error('agenda anchor not found once');
if (s.includes('h40d ARMED')) throw new Error('already recorded');
s = s.replace(anchor, anchor + '; **h40d ARMED 2026-10-01 21:26**: registered HEAD 2b0906f (passes/PREREGISTER-h40d.md, A1-A14), task Natively-flight-h40d Fri 2 Oct 13:30 (dry twin GUARD OK 21:24), precheck 13:24 + ledger 10:45 + flight-end 14:45 background sleepers (recreate after a restart), NO MAIN commit before the hour (guard 10b); the Live ROUTER is parked (its easy class occurs 1/176 on the rosters, SP l38base), next: the user\'s short-question set -> gated follow-up retention -> the text-call spike');
const idxLine = '- [System audio hears everything](project_system_audio_contamination.md) — 2026-10-01 21:00 prestart: a voice chat on the machine was answered by the app (6 answers instead of the probe\'s 2, `cues: []` on non-questions, check-smoke-cues NOT CLEAN); any flight or smoke needs a quiet machine, and that log is never committed\n';
const before = '- [Coaching card chain]';
if (!s.includes(before)) throw new Error('index insertion point not found');
s = s.replace(before, idxLine + before);
fs.writeFileSync(M, s);
fs.writeFileSync(D + 'project_system_audio_contamination.md', `---
name: system-audio-contamination
description: "2026-10-01: the app answers ANY audio on the machine (system-audio capture): a voice chat during the 21:00 h40d prestart produced 6 answers instead of the probe's 2 and two empty cue blocks on non-questions, so check-smoke-cues read NOT CLEAN on a healthy build; flights and smokes need a quiet machine, and such logs carry third-party speech"
metadata:
  type: project
---

# System audio hears everything: a quiet machine is a flight precondition

On 2026-10-01 at 21:00 the h40d pre-flight start (run 5, PROBE READY) ran while a voice chat was playing on the
machine. The app captures system audio, so the Live ear and Deepgram heard the chat: \`[LiveCaption]\` fragments of
other people's speech, \`dispatch: answer source=whisper\` anchors that were chat sentences, 6 real answers + 6
superseded instead of the probe clip's 2, and two \`[Answer] cues: []\` lines on answers to non-questions (the model
writes no cue block when nothing was asked). \`check-smoke-cues\` therefore read NOT CLEAN (malformed 2) on a build
that was fine: the probe's own questions carried well-formed cues, block-only 0, clocks whole-log 0 charged.

**Why:** the pipeline has no notion of "not the interview"; every utterance on the machine is a candidate question
(the parked small-talk concern, now with evidence: statements and chat were answered).

**How to apply:**
- Before any scheduled app run (smoke, prestart, flight): no other audio source on the machine for the whole window
  (voice chat, video, music, games). Tell the user the window. The precheck's audio-state line does not detect a chat.
- Reading a log with unrelated speech: judge the build on the probe's or roster's own items; name the contamination
  and the affected items in the result note; do not renegotiate the rule after the data (h40d: dated amendment A14,
  written before the hour's data, reads the prestart's lines across the five starts of the same dist).
- Such a log carries third-party speech: it stays in the scratchpad and is never committed to MAIN.
- h40d: [[agenda]], \`SP\\validation-hour\\2026-10-01-prestart-h40d\\natively_debug.run5.log\` (local only).
`);
const A = D + 'project_agenda.md';
let a = fs.readFileSync(A, 'utf8');
if (a.includes('## h40d armed')) throw new Error('agenda section exists');
a = a.trimEnd() + `

## h40d armed (2026-10-01, 21:26 local)

- Registered HEAD **2b0906f4d8ba023bfdc1b492ff6ed8664d1aa19e** = MAIN \`electron/test/golden/passes/PREREGISTER-h40d.md\`
  (r4, section 11 filled, amendments A1–A14; parent bb41ad3). No MAIN commit before the hour: guard 10b pins it.
- Prestart: five starts on 2026-10-01 (16:49, 16:59, 17:15, 19:37 NOT READY on Google; 21:00 READY). Run 5 heard a
  voice chat on the machine (see [[system-audio-contamination]]) → A14: the required lines are read across the five
  starts of one dist (main.js 2026-10-01T13:37:38.588Z, filter 42d9bc42dbd17870).
- Dry twin \`Natively-flight-h40d-dry\` 21:24: GUARD OK, every marker as expected, HEAD pinned 2b0906f, knowledge ON.
- Task \`Natively-flight-h40d\`: Ready, StartWhenAvailable False, next run 2026-10-02 13:30:00, limit 5 h, launcher
  \`SP\\validation-hour\\launch-h40d.cmd\`, workdir MAIN. Playback expected ~13:36.
- Armed in the session: \`h40d-precheck.ps1 -At 13:24\` (background PowerShell → \`VH\\precheck-h40d.out.txt\`), a
  ledger wake-up ~10:45 (section 8, \`quota-ledger-today.mjs\`), a flight-end wake-up ~14:45. A Claude restart drops
  them: recreate from \`SP\\AGENDA.md\` (the 21:26 entry).
- Friday preconditions on the user's side: logged on, awake, Context ON untouched, no app started by hand, and NO
  OTHER AUDIO on the machine 13:25–14:45.
- After the hour (AGENDA's post-flight runbook): knowledge-lines → clocks → thoughts-noise → 10 Opus graders
  (\`h40d-grader-dispatch.txt\`, alias probed first) → \`h40d-merge.cmd\` → twins \`--dist MAIN\` + rule3 (no --reasons)
  → result note + INDEX → the first commit after 2b0906f.
- Router line after the base-rate count (SP \`l38base\`, 1 of 176 easy): parked; next in order: the user's
  short-question set, gated follow-up retention (full last answer, follow-ups only; the ungated 6c50ec3 failed),
  the text-call spike, the mic deviation measurement (user in the loop), the 3.8 Live ear hour.
`;
fs.writeFileSync(A, a);
console.log('memory: MEMORY.md agenda line + index line, project_system_audio_contamination.md, project_agenda.md section');
