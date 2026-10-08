function contentWords(text) {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter((w) => w.length > 3));
}
function check(a, b, label) {
  const A = contentWords(a), B = contentWords(b);
  const [S, L] = A.size <= B.size ? [A, B] : [B, A];
  let hit = 0;
  for (const w of S) if (L.has(w)) hit++;
  console.log(`${label}: hit=${hit}/${S.size} = ${(hit/S.size).toFixed(2)}`);
}
// Real field pair, both American spelling (per the actual run-2 log line)
check(
  "How would you organize an S3 bucket layout for a trail?",
  "How would you organize an S3 bucket layout for a training dataset that gets versioned weekly?",
  "Field pair (both organize)"
);
// Test fixture pair, Live side uses British "organise" (per round-3's original coordinator wording, reused since)
check(
  "How would you organize an S3 bucket layout for a trail?",
  "How would you organise an S3 bucket layout for a training dataset that gets versioned weekly?",
  "Fixture pair (organize/organise)"
);
