// Independent re-verification of T-R2 ("replace targets the LAST
// what_to_answer message, not an earlier one"), run against a first-match
// mutation of lastIndexWhere — mirrors the fix1 report's manual exercise,
// done independently here rather than just trusting the report's narrative.
// lastIndexWhere itself is UNCHANGED by the R23 fix (only the restart
// object's shape changed), so this checks the exact function as shipped.

function firstIndexWhere(items, predicate) {
    for (let i = 0; i < items.length; i++) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

// applyAnswerToken as shipped after the R23 fix, with lastIndexWhere mutated
// to first-match.
function applyAnswerTokenMutated(prev, token, replace, newId) {
    const lastMsg = prev[prev.length - 1];
    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, text: lastMsg.text + token };
        return updated;
    }
    if (replace) {
        const i = firstIndexWhere(prev, (m) => m.intent === 'what_to_answer'); // MUTATED
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = { id: prev[i].id, role: prev[i].role, intent: 'what_to_answer', text: token, isStreaming: true };
            return updated;
        }
    }
    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true }];
}

function applyFinalAnswerMutated(prev, replace, finalize) {
    const lastMsg = prev[prev.length - 1];
    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = finalize(lastMsg);
        return updated;
    }
    if (replace) {
        const i = firstIndexWhere(prev, (m) => m.intent === 'what_to_answer'); // MUTATED
        if (i !== -1) {
            const updated = [...prev];
            updated[i] = finalize(prev[i]);
            return updated;
        }
    }
    return [...prev, finalize(null)];
}

let failures = 0;
function assertRefEqual(name, a, b) {
    if (a !== b) { console.log(`FAIL(caught) ${name}`); failures++; } else console.log(`pass(missed) ${name}`);
}
function assertDeepEqual(name, a, b) {
    const x = JSON.stringify(a), y = JSON.stringify(b);
    if (x !== y) { console.log(`FAIL(caught) ${name}: got ${x} want ${y}`); failures++; } else console.log(`pass(missed) ${name}`);
}

// --- T-R2, sub-test 1, verbatim from the diff ---
{
    const answerA = { id: 'a1', role: 'system', intent: 'what_to_answer', text: 'Answer A.', isStreaming: false };
    const question = { id: 'q1', role: 'user', text: '🎙 second question' };
    const answerB = { id: 'a2', role: 'system', intent: 'what_to_answer', text: 'Answer B.', isStreaming: false };
    const prev = [answerA, question, answerB];

    const result = applyAnswerTokenMutated(prev, 'x', true, () => 'id-0');

    assertRefEqual('T-R2/applyAnswerToken: result[0] toBe(answerA)', result[0], answerA);
    // toMatchObject check on result[2]
    const ok = result[2].id === 'a2' && result[2].text === 'x' && result[2].isStreaming === true;
    if (!ok) { console.log('FAIL(caught) T-R2/applyAnswerToken: result[2] toMatchObject'); failures++; }
    else console.log('pass(missed) T-R2/applyAnswerToken: result[2] toMatchObject');
}

// --- T-R2, sub-test 2, verbatim from the diff ---
{
    const answerA = { id: 'a1', role: 'system', intent: 'what_to_answer', text: 'Answer A.', isStreaming: false };
    const question = { id: 'q1', role: 'user', text: '🎙 second question' };
    const answerB = { id: 'a2', role: 'system', intent: 'what_to_answer', text: 'Answer B.', isStreaming: false };
    const prev = [answerA, question, answerB];
    let calledWith;
    const finalize = (msg) => { calledWith = msg; return { ...msg, text: 'New B.', isStreaming: false }; };

    const result = applyFinalAnswerMutated(prev, true, finalize);

    assertDeepEqual('T-R2/applyFinalAnswer: finalize called with answerB', calledWith, answerB);
}

console.log(`\n=> ${failures} of 3 T-R2 assertions caught the last->first mutation (3 expected if the tests genuinely bite).`);
