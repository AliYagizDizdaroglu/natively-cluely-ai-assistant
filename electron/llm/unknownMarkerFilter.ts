/**
 * Spec 7.1: strip unknown __WORD__ markers from the displayed stream; __MORE__, __CUES__ and __model_source:…__ are left alone.
 * WORD is UPPERCASE only (controller ruling, Task 9 review): every leak seen is uppercase (__S1Q05__, __ANS__,
 * __PROMPT_RESPONSE__), while Python dunders (__init__, __name__) and __emphasis__ must reach the answer unchanged.
 * A held partial that turns out lowercase is released unchanged: the hold pattern only keeps uppercase partials, `__` and `_`.
 */
const KNOWN = new Set(['MORE', 'CUES']);
const UNKNOWN = /__([A-Z][A-Z0-9_]*)__/g;
const PARTIAL_TAIL = /(?:__[A-Z][A-Z0-9_]*_?|__|_)$/;

export function createUnknownMarkerStripper(): { push(s: string): string; flush(): string } {
    let buf = '';
    const strip = (s: string) => s.replace(UNKNOWN, (m, w: string) => (KNOWN.has(w) ? m : ''));
    return {
        push(s: string): string {
            buf = strip(buf + s);
            const m = PARTIAL_TAIL.exec(buf);
            if (!m) { const out = buf; buf = ''; return out; }
            const out = buf.slice(0, m.index); buf = buf.slice(m.index); return out;
        },
        flush(): string { const out = strip(buf); buf = ''; return out; },
    };
}

export async function* stripUnknownMarkers(src: AsyncGenerator<string>): AsyncGenerator<string> {
    const s = createUnknownMarkerStripper();
    for await (const t of src) { const out = s.push(t); if (out) yield out; }
    const tail = s.flush(); if (tail) yield tail;
}
