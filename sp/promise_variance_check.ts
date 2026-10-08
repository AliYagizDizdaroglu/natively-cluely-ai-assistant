// Throwaway check: under this project's electron/tsconfig.json settings
// (no `strict`, no `strictFunctionTypes` — only noImplicitAny), is
// Promise<boolean> assignable to a `Promise<void> | null` field the way
// QuestionDetector.inflightDetection was typed before task 5?
let inflightDetection: Promise<void> | null = null;

async function runDetection(): Promise<boolean> {
    return true;
}

function triggerDetection(): void {
    inflightDetection = runDetection().finally(() => {
        inflightDetection = null;
    });
}

// detectNow's own chain
async function detectNow(): Promise<'question' | 'not-a-question'> {
    let produced = false;
    inflightDetection = runDetection().then((p) => { produced = p; }).finally(() => { inflightDetection = null; });
    await inflightDetection;
    return produced ? 'question' : 'not-a-question';
}

console.log(typeof triggerDetection, typeof detectNow);
