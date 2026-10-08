// r2 THROWAWAY: the r1 quote score (overlap with the 4-content-word floor) for scripts that need it without the machine.
const cw = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
export function quoteScoreLike(evidence, spoken) {
  const A = cw(evidence), B = cw(spoken);
  if (A.size < 4) return { scorable: false, score: 0 };
  let h = 0; for (const w of A) if (B.has(w)) h++;
  return { scorable: true, score: h / A.size };
}
