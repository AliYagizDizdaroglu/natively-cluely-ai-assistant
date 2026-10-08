function contentWords(text) {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter((w) => w.length > 3));
}
function check(a, b, label) {
  const A = contentWords(a), B = contentWords(b);
  const [S, L] = A.size <= B.size ? [A, B] : [B, A];
  let hit = 0;
  for (const w of S) if (L.has(w)) hit++;
  const frac = S.size ? hit / S.size : 0;
  console.log(`${label}\n  A=${[...A].join(',')} (${A.size})\n  B=${[...B].join(',')} (${B.size})\n  S.size=${S.size} hit=${hit} frac=${frac.toFixed(3)} floor4=${S.size>=4} similar(>=0.6)=${S.size>=4 && frac>=0.6}\n`);
}

// R45's actual W10 pair (real log text, whisper vs the coordinator's Live wording with "organise")
check(
  "How would you organize an S3 bucket layout for a trail?",
  "How would you organise an S3 bucket layout for a training dataset that gets versioned weekly?",
  "W10 pair (coordinator wording)"
);

// The coordinator's literal "must not match" example, natural full reading
check(
  "What is the difference between a pod and a deployment?",
  "What is the difference between data drift and concept drift?",
  "pod/deployment vs drift, literal shared-template reading"
);

// My chosen alternative for the "must not match" test (avoids the shared template)
check(
  "What is the difference between a pod and a deployment?",
  "What causes concept drift in a production model?",
  "pod/deployment vs drift, my chosen wording"
);

// 3-content-word text should never match regardless of overlap (floor test)
check(
  "Explain how container orchestration works.",
  "Explain how container orchestration schedules workloads across a cluster.",
  "3-content-word floor test (should fail floor even at high overlap)"
);

// Corrected 3-content-word floor test: S has EXACTLY 3 content words, 100% overlap, must still fail.
check(
  "Explain container orchestration.",
  "Explain how container orchestration schedules workloads across a cluster.",
  "3-content-word floor test v2 (100% overlap but must fail the floor)"
);
