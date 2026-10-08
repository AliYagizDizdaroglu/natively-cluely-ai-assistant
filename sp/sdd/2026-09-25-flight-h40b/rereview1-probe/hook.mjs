let stub = null;
export async function initialize(data) { stub = data?.stub ?? null; }
export async function resolve(specifier, context, next) {
    if (stub && specifier === './guard-r09.mjs' && (context.parentURL ?? '').endsWith('/guard-r09-cal.mjs')) {
        return { url: new URL(stub, import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
}
