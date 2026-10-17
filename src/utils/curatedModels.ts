// The curated model dropdown (all Gemini-API models); the first entry is the default (CredentialsManager.getDefaultModel).
export const CURATED_GEMINI_MODELS: ReadonlyArray<{ id: string; name: string }> = [
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B' },
    { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B' },
];

/** Display name of a curated model; the 3.1 preview alias shares the 3.1 name; an unknown id is returned as is. */
export function curatedModelLabel(id: string): string {
    if (id === 'gemini-3.1-flash-lite-preview') return 'Gemini 3.1 Flash Lite';
    return CURATED_GEMINI_MODELS.find((m) => m.id === id)?.name ?? id;
}
