// Broken predicate: the two tests in the wrong order (phrase first).
export function r09Missing(text) {
    if (!text.includes('salary expectations')) return 'lacks the R09 phrase terms';
    if (/["']salary["']\s*,/.test(text)) return 'still lists bare "salary" as a negotiation term';
    return null;
}
