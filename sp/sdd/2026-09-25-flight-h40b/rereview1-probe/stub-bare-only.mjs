// Broken predicate: the phrase test dropped.
export function r09Missing(text) {
    if (/["']salary["']\s*,/.test(text)) return 'still lists bare "salary" as a negotiation term';
    return null;
}
