// Mutation check: if lastIndexWhere (search from the END) were mutated to a
// first-match search, would the EXISTING test suite for applyAnswerToken /
// applyFinalAnswer still pass? If yes, that specific "last, not first" axis
// is untested for those two helpers (unlike applyLiveQuestion, which has an
// explicit two-bubble test guarding it).

function firstIndexWhere(items, predicate) {
    for (let i = 0; i < items.length; i++) {
        if (predicate(items[i])) return i;
    }
    return -1;
}

// --- Mutated applyAnswerToken: first-match instead of last-match ---
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
            updated[i] = { ...prev[i], text: token, isStreaming: true, metrics: undefined };
            return updated;
        }
    }
    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true }];
}

// --- Mutated applyFinalAnswer: first-match instead of last-match ---
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
function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) { console.log(`FAIL ${name}: got ${a}, want ${e}`); failures++; }
    else console.log(`pass (still) ${name}`);
}

// Re-run every EXISTING test from answerMessages.test.ts that exercises the
// `replace` + target-search branch, verbatim, against the mutated functions.

// applyAnswerToken: "replace restarts the last what_to_answer message in place..."
{
    const question = { id: 'q1', role: 'user', text: '🎙 what is your greatest weakness' };
    const finishedAnswer = { id: 'a1', role: 'system', text: 'Old answer.', intent: 'what_to_answer', isStreaming: false, metrics: { totalMs: 900 } };
    const prev = [question, finishedAnswer];
    const result = applyAnswerTokenMutated(prev, 'New ', true, () => 'id-0');
    check('applyAnswerToken/single-target (existing test)', result[1].text, 'New ');
}

// applyFinalAnswer: "replace finalizes the last what_to_answer message in place even when it is not the last message..."
{
    const question = { id: 'q1', role: 'user', text: '🎙 old question' };
    const answer = { id: 'a1', role: 'system', text: 'Old answer.', intent: 'what_to_answer', isStreaming: false };
    const followUp = { id: 'q2', role: 'user', text: '🎙 old question, continued' };
    const prev = [question, answer, followUp];
    let calledWith;
    const finalize = (msg) => { calledWith = msg; return { ...msg, text: 'New answer.', isStreaming: false }; };
    const result = applyFinalAnswerMutated(prev, true, finalize);
    check('applyFinalAnswer/single-target (existing test)', calledWith, answer);
}

// --- NEW scenario: TWO what_to_answer messages (turn 1 finished, turn 2 in progress) ---
// This scenario is realistic (two separate answered questions in history) but
// has NO corresponding test in answerMessages.test.ts today.
{
    const turn1Answer = { id: 'a1', role: 'system', text: 'Turn 1 answer.', intent: 'what_to_answer', isStreaming: false };
    const turn2Answer = { id: 'a2', role: 'system', text: 'Turn 2 answer.', intent: 'what_to_answer', isStreaming: false };
    const prev = [turn1Answer, turn2Answer];
    const result = applyAnswerTokenMutated(prev, 'Superseding ', true, () => 'id-x');
    console.log('UNTESTED scenario (applyAnswerToken, 2 targets): mutated-code result[0].text =', JSON.stringify(result[0].text), '(correct code would leave turn1Answer untouched and restart turn2Answer)');
}

console.log(failures === 0
    ? `\n=> ${failures} of the EXISTING tests failed against the last->first mutation: the mutation survives undetected by today's suite for applyAnswerToken/applyFinalAnswer.`
    : `\n=> ${failures} existing test(s) caught the mutation.`);
