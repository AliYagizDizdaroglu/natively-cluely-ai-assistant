/**
 * GOLDEN SET RUNNER.
 *
 *   node --env-file=.env electron/test/golden/calibrate.mjs   # gate — run first
 *   node --env-file=.env electron/test/golden/run.mjs         # both suites
 *   node --env-file=.env electron/test/golden/run.mjs coding
 *   node --env-file=.env electron/test/golden/run.mjs verbal
 *
 * Requires a built dist-electron (npm run build:electron) because it imports the
 * REAL shipped prompts and the REAL stream filter rather than copies of them.
 *
 * Results are cached in results.json and skipped on re-run, so a rate-limit or a
 * transient 500 mid-suite does not cost the work already done. Delete the file
 * to force a clean run.
 */
import fs from 'fs';
import path from 'path';
import { CODING } from './problems.coding.mjs';
import { VERBAL_TECHNICAL, BEHAVIORAL, VERBAL_CHECKS } from './problems.verbal.mjs';
import {
  HERE, renderShot, runPython, extractPython, callTurn, userTurn,
  prompts, verbalFilter, sleep, words,
} from './harness.mjs';

// ── routes under test, as the app wires them ───────────────────────────────
export const ROUTES = {
  // chat + screenshots -> ipcHandlers forces gemma regardless of the dropdown
  screenshot: { model: 'gemma-4-31b-it', thinkingLevel: 'MINIMAL', temperature: 0.3 },

  // verbal-technical runs on the user's SELECTED model, whose default is
  // LLMHelper.ts:343  currentModelId = GEMINI_FLASH_MODEL = 'gemini-3.1-flash-lite',
  // corroborated by CredentialsManager.getDefaultModel()'s same fallback.
  //
  // DO NOT take this from .env's DEFAULT_MODEL. That variable is DEAD CONFIG —
  // nothing in electron/ reads it. An earlier version of this file used its value
  // ('gemini-3-flash-preview') and so measured a model the app never selects.
  verbalTechnical: { model: 'gemini-3.1-flash-lite', temperature: 0.4 },

  // behavioral is force-routed to Flash Lite for speed, independent of selection.
  behavioral: { model: 'gemini-3.1-flash-lite', temperature: 0.4 },
};

const SHOT_DIR = path.join(HERE, 'shots');
const RESULTS = path.join(HERE, 'results.json');

// ── stdlib-offer detection ─────────────────────────────────────────────────
// INTERVIEW_COPILOT_PROMPT requires the literal sentence
//   "Python has <tool> for this, but let me implement the mechanism directly."
// NOTE: must allow '.' between "has" and the tool — the prompt's own example is
// "collections.OrderedDict". An earlier version used [^.] and failed calibration.
export const OFFER_RE =
  /python\s+has\s+[^\n]{0,80}?\b(OrderedDict|deque|heapq|Counter|defaultdict|bisect)\b[^\n]{0,100}?\bbut\b/i;

/** True when the PROSE offers the stdlib option (code blocks are ignored). */
export function detectsOffer(text) {
  return OFFER_RE.test((text || '').replace(/```[\s\S]*?```/g, ' '));
}

// ── screenshot legibility control ──────────────────────────────────────────
export const CONTROL = {
  expect: ['QUARTZ-7734', 'MERIDIAN-2291'],
  build: () => renderShot(SHOT_DIR, 'control', {
    title: 'Calibration Sheet',
    lines: ['Read the two codes below exactly as written.', '',
      '**CODE ONE: QUARTZ-7734', '**CODE TWO: MERIDIAN-2291'],
  }),
};

export async function buildShots(problem) {
  return Promise.all(
    problem.shots.map((s, i) => renderShot(SHOT_DIR, `${problem.id}_${i + 1}`, s))
  );
}

// ── system-prompt pre-flight ───────────────────────────────────────────────
// A dropped systemInstruction yields a plausible run whose every "the prompt was
// ignored" verdict really means "the prompt was never sent". Prove it is applied.
async function preflight(systemPrompt, route) {
  const r = await callTurn({
    model: route.model, systemPrompt,
    contents: [{ role: 'user', parts: [{ text: 'Reverse a linked list.' }] }],
    temperature: 0.3, maxOutputTokens: 512,
    ...(route.thinkingLevel ? { thinkingLevel: route.thinkingLevel } : {}),
  });
  const opener = (r.text.trim().split('\n')[0] || '');
  const firstPerson = /\b(I|I'll|I'd|my|let me)\b/.test(opener);
  const lecturing = /^(to solve|the standard approach|this problem|we need to)/i.test(opener.trim());
  return { ok: firstPerson && !lecturing, opener };
}

// ── coding suite ───────────────────────────────────────────────────────────
async function runCoding(store) {
  const P = prompts();
  const SYSTEM = P.resolveGemmaSystemPrompt(undefined, undefined); // INTERVIEW_COPILOT_PROMPT
  const route = ROUTES.screenshot;

  console.log('='.repeat(76));
  console.log(`CODING — ${CODING.length} medium LeetCode problems on ${route.model}`);
  console.log('='.repeat(76));

  const pf = await preflight(SYSTEM, route);
  console.log(`system-prompt pre-flight: ${pf.ok ? 'IN EFFECT' : 'NOT APPLIED'}  "${pf.opener.slice(0, 80)}"`);
  if (!pf.ok) { console.log('aborting coding suite — results would be meaningless.'); return; }

  for (const p of CODING) {
    const key = `coding::${p.id}`;
    if (store[key]) { console.log(`\n(cached) ${p.id}`); continue; }
    const imgs = await buildShots(p);
    console.log(`\n${'-'.repeat(76)}\n${p.id} ${p.name} (LC${p.leetcode}, ${p.difficulty}) — ${imgs.length} screenshots`);
    console.log(`  tool: ${p.tool}   template expected: ${p.templateExpected ? 'YES' : 'NO (tool is merely useful)'}`);

    const rec = { id: p.id, name: p.name, leetcode: p.leetcode, shots: imgs.length, tool: p.tool, templateExpected: p.templateExpected };
    try {
      // turn 1 — standard solution
      let contents = [userTurn(imgs, 'Here is the problem on my screen. Solve it.')];
      const t1 = await callTurn({ model: route.model, systemPrompt: SYSTEM, contents, temperature: route.temperature, maxOutputTokens: 4096, thinkingLevel: route.thinkingLevel });
      contents = t1.contents;
      const c1 = extractPython(t1.text);
      const r1 = runPython(c1, p.tests, `${p.id}_t1`);
      const offered = detectsOffer(t1.text);
      rec.standard = {
        ms: t1.ms, finish: t1.finish, executable: r1.pass, err: r1.err?.slice(0, 110) || null,
        read_all: new RegExp(`\\b${p.entry}\\b`).test(c1),
        offered, offerCorrect: offered === p.templateExpected,
        opener: (t1.text.trim().split('\n')[0] || '').slice(0, 120),
      };
      console.log(`  STANDARD  exec=${r1.pass ? 'PASS' : 'FAIL'}  read_all=${rec.standard.read_all ? 'PASS' : 'FAIL'}  offer=${offered ? 'yes' : 'no'} (${rec.standard.offerCorrect ? 'correct' : 'WRONG'})  ${t1.ms}ms`);
      if (r1.err) console.log(`            ${r1.err.slice(0, 90)}`);

      await sleep(2500);

      // turn 2 — pythonic
      contents = [...contents, { role: 'user', parts: [{ text: 'Now give me the pythonic version using the standard library.' }] }];
      const t2 = await callTurn({ model: route.model, systemPrompt: SYSTEM, contents, temperature: route.temperature, maxOutputTokens: 4096, thinkingLevel: route.thinkingLevel });
      const c2 = extractPython(t2.text);
      const r2 = runPython(c2, p.tests, `${p.id}_t2`);
      rec.pythonic = {
        ms: t2.ms, finish: t2.finish, executable: r2.pass, err: r2.err?.slice(0, 110) || null,
        usedTool: p.toolRe.test(c2), empty: t2.text.length === 0,
        shorter: c2.length > 0 && c2.length < (c1.length || Infinity),
      };
      console.log(`  PYTHONIC  exec=${r2.pass ? 'PASS' : 'FAIL'}  usesTool=${rec.pythonic.usedTool ? 'yes' : 'no'}  finish=${t2.finish}${rec.pythonic.empty ? '  <-- EMPTY RESPONSE' : ''}  ${t2.ms}ms`);
      if (r2.err) console.log(`            ${r2.err.slice(0, 90)}`);
    } catch (e) {
      // Transient infra failures are recorded, never scored as model failures.
      rec.error = e.message.slice(0, 160);
      rec.transient = !!e.transient;
      console.log(`  ${rec.transient ? 'TRANSIENT ERROR (not scored)' : 'ERROR'}: ${rec.error}`);
    }
    store[key] = rec;
    fs.writeFileSync(RESULTS, JSON.stringify(store, null, 1));
    await sleep(2500);
  }
}

// ── verbal suite ───────────────────────────────────────────────────────────
function adversarialChunks(text, sentinel) {
  const out = [];
  const i = text.indexOf(sentinel);
  if (i >= 0) {
    const half = i + Math.floor(sentinel.length / 2);
    out.push(text.slice(0, i + 2), text.slice(i + 2, half), text.slice(half));
  } else {
    out.push(text.slice(0, 7), text.slice(7, 40), text.slice(40));
  }
  const first = out.shift() || '';
  return [...first.split(''), ...out.filter(Boolean)];
}

async function runVerbal(store) {
  const P = prompts();
  const { filterVerbalLines, stripSuggestionBlock } = verbalFilter();
  const SENTINEL = P.SUGGESTIONS_SENTINEL;
  const BUDGET = P.SPOKEN_WORD_BUDGET;

  console.log(`\n${'='.repeat(76)}`);
  console.log(`VERBAL — budget ${BUDGET} words, sentinel ${SENTINEL}`);
  console.log('='.repeat(76));

  const suites = [
    { name: 'verbal-technical', route: ROUTES.verbalTechnical, qs: VERBAL_TECHNICAL },
    { name: 'behavioral', route: ROUTES.behavioral, qs: BEHAVIORAL },
  ];

  for (const s of suites) {
    console.log(`\n${'-'.repeat(76)}\n${s.name} (${s.route.model})`);
    for (let i = 0; i < s.qs.length; i++) {
      const key = `verbal::${s.name}::${i}`;
      if (store[key]) { console.log(`  (cached) Q${i + 1}`); continue; }
      const rec = { suite: s.name, model: s.route.model, q: s.qs[i] };
      try {
        const r = await callTurn({
          model: s.route.model, systemPrompt: P.VERBAL_WHAT_TO_ANSWER_PROMPT,
          contents: [{ role: 'user', parts: [{ text: `The interviewer just asked: "${s.qs[i]}"\n\nWhat should I say?` }] }],
          // Must match production: LLMHelper uses MAX_OUTPUT_TOKENS (65536) for
          // non-Gemma models. An earlier version of this file capped at 2048,
          // which a thinking model can exhaust before finishing a 70-word answer —
          // that produced a mid-clause `ends_cleanly` failure which was the
          // harness truncating the model, not the model writing badly.
          temperature: s.route.temperature, maxOutputTokens: 65536,
        });

        // pipe through the REAL shipped filter, in adversarial chunks
        let spoken = '', offers = null;
        async function* chunks() { for (const c of adversarialChunks(r.text, SENTINEL)) yield c; }
        for await (const piece of stripSuggestionBlock(filterVerbalLines(chunks()), (o) => { offers = o; })) spoken += piece;

        const ctx = { spoken: spoken.trim(), offers, sentinel: SENTINEL, budget: BUDGET, wordCount: words(spoken) };
        // finish + rawLen are recorded so a truncation can be diagnosed from the
        // stored result instead of needing a live re-probe.
        rec.ms = r.ms; rec.finish = r.finish; rec.rawLen = r.text.length;
        rec.words = ctx.wordCount; rec.offers = offers;
        rec.checks = Object.fromEntries(Object.entries(VERBAL_CHECKS).map(([n, f]) => [n, f(ctx)]));
        const failed = Object.entries(rec.checks).filter(([, v]) => !v.ok);
        console.log(`  Q${i + 1} ${ctx.wordCount}w ${r.ms}ms  ${failed.length ? 'FAIL: ' + failed.map(([n, v]) => `${n}(${v.detail})`).join(', ') : 'all checks ok'}`);
      } catch (e) {
        rec.error = e.message.slice(0, 140); rec.transient = !!e.transient;
        console.log(`  Q${i + 1} ${rec.transient ? 'TRANSIENT (not scored)' : 'ERROR'}: ${rec.error}`);
      }
      store[key] = rec;
      fs.writeFileSync(RESULTS, JSON.stringify(store, null, 1));
      await sleep(2000);
    }
  }
}

// ── summary ────────────────────────────────────────────────────────────────
function summarize(store) {
  const coding = Object.values(store).filter((r) => r.id && !r.transient && !r.error);
  const verbal = Object.values(store).filter((r) => r.suite && !r.transient && !r.error);
  const n = coding.length;
  const c = (f) => coding.filter(f).length;

  console.log(`\n${'='.repeat(76)}\nGOLDEN SET SUMMARY\n${'='.repeat(76)}`);
  if (n) {
    console.log(`\nCODING (${n} problems, ${coding[0]?.shots} screenshots each)`);
    console.log(`  standard: correct                 ${c((r) => r.standard?.executable)}/${n}`);
    console.log(`  standard: read every screenshot   ${c((r) => r.standard?.read_all)}/${n}`);
    console.log(`  standard: stdlib offer CORRECT    ${c((r) => r.standard?.offerCorrect)}/${n}   (fires when required, silent when not)`);
    console.log(`     of which fired when required   ${c((r) => r.templateExpected && r.standard?.offered)}/${coding.filter((r) => r.templateExpected).length}`);
    console.log(`     of which stayed silent when not ${c((r) => !r.templateExpected && !r.standard?.offered)}/${coding.filter((r) => !r.templateExpected).length}`);
    console.log(`  pythonic: correct                 ${c((r) => r.pythonic?.executable)}/${n}`);
    console.log(`  pythonic: used the stdlib tool    ${c((r) => r.pythonic?.usedTool)}/${n}`);
    const empties = coding.filter((r) => r.pythonic?.empty);
    console.log(`  pythonic: model returned EMPTY    ${empties.length}/${n}${empties.length ? `   [${empties.map((r) => r.id).join(', ')}]` : ''}`);
    console.log(`     PY1 empty is EXPECTED (Gemini recitation filter blocks the canonical`);
    console.log(`     OrderedDict LRU snippet). The app falls back to Flash — that behaviour`);
    console.log(`     is covered by electron/LLMHelper.emptyStream.test.ts, not by this suite.`);
    console.log(`     Watch for a NEW id appearing here: that means a new snippet got blocked.`);
  }
  for (const suite of ['verbal-technical', 'behavioral']) {
    const rows = verbal.filter((r) => r.suite === suite);
    if (!rows.length) continue;
    console.log(`\nVERBAL — ${suite} (${rows.length} questions)`);
    for (const check of Object.keys(VERBAL_CHECKS)) {
      const okN = rows.filter((r) => r.checks?.[check]?.ok).length;
      console.log(`  ${check.padEnd(18)} ${okN}/${rows.length}`);
    }
    const w = rows.filter((r) => r.words).map((r) => r.words).sort((a, b) => a - b);
    if (w.length) console.log(`  words median ${w[Math.floor(w.length / 2)]}  max ${w[w.length - 1]}`);
  }
  const transient = Object.values(store).filter((r) => r.transient).length;
  if (transient) console.log(`\n  (${transient} transient infrastructure error(s) recorded, not scored)`);
  console.log('='.repeat(76));
}

// ── main ───────────────────────────────────────────────────────────────────
const which = process.argv[2];
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('run.mjs')) {
  const store = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, 'utf8')) : {};
  if (!which || which === 'coding') await runCoding(store);
  if (!which || which === 'verbal') await runVerbal(store);
  summarize(store);
}
