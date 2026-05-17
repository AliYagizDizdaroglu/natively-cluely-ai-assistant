/**
 * Jaccard similarity over lowercased word tokens.
 * Returns intersection / union size, in [0, 1]. Returns 0 if both sets are empty.
 *
 * Chosen for question-dedup: O(n+m), word-level semantics fit short question text
 * better than character-level Levenshtein.
 */
export function jaccardSimilarity(a: string, b: string): number {
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);

    if (tokensA.size === 0 && tokensB.size === 0) return 0;

    let intersectionSize = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) intersectionSize++;
    }

    const unionSize = tokensA.size + tokensB.size - intersectionSize;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function tokenize(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .split(/\W+/)
            .filter(t => t.length > 0)
    );
}
