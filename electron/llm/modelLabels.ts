/** Bubble label for the model picked in the dropdown (the id itself when it has no curated name). */
export function selectedModelLabel(id: string): string {
    if (id === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Flash Lite';
    if (id === 'gemini-3.8-flash') return 'Gemini 3.8 Flash';
    if (id === 'gemini-3.1-flash-lite' || id === 'gemini-3.1-flash-lite-preview') return 'Gemini 3.1 Flash Lite';
    if (id === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
    if (id === 'gemma-4-31b-it') return 'Gemma 4 31B';
    if (id === 'gemma-4-26b-a4b-it') return 'Gemma 4 26B';
    return id;
}
