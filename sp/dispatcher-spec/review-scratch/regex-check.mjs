// REVIEW THROWAWAY: the two golden-harness regexes (copied verbatim from interview60.metrics.mjs:67 and
// interview60.turns-fixture.mjs:56) on today's mark line and on the spec's proposed one (outcome= before question=).
const metricsRe = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend|hold|mark|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: extends="(?:[^"\\]|\\.)*")?(?: replaces="(?:[^"\\]|\\.)*")?(?: reason=\w+)?(?: question="((?:[^"\\]|\\.)*)")?/gm;
const builderRe = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend|hold|mark|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*? question="((?:[^"\\]|\\.)*)")?/gm;
const lines = {
  today: '2026-10-02T10:00:00.000Z [LOG] [Main] dispatch: mark source=live anchor="Which of those stages" verdict=paraphrase question="Of the RAG pipeline stages, which can cause it?"',
  proposed: '2026-10-02T10:00:00.000Z [LOG] [Main] dispatch: mark source=live anchor="Which of those stages" verdict=paraphrase outcome=marked question="Of the RAG pipeline stages, which can cause it?"',
  proposedRevive: '2026-10-02T10:00:00.000Z [LOG] [Main] dispatch: mark source=whisper anchor="Now add delayed outcomes" verdict=match outcome=revived score=1.00 question="Now add delayed outcomes and experimentation"',
  outcomeLast: '2026-10-02T10:00:00.000Z [LOG] [Main] dispatch: mark source=live anchor="Which of those stages" verdict=paraphrase question="Of the RAG pipeline stages, which can cause it?" outcome=marked',
};
for (const [n, l] of Object.entries(lines)) {
  const m = [...l.matchAll(metricsRe)][0]; const b = [...l.matchAll(builderRe)][0];
  console.log(`${n.padEnd(15)} metrics.mjs question=${JSON.stringify(m?.[8] ?? null)} | turns-fixture.mjs question=${JSON.stringify(b?.[6] ?? null)}`);
}
