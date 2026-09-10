/**
 * Energy-based VAD over the interviewer's desktop-audio channel.
 * Pure — no timers, no I/O; free of Node-only imports other than Buffer so it
 * can also run inside the replay fixture extractor. main.ts (Task 8) pushes
 * 20 ms PCM chunks as they are captured and feeds speaking()/changed events
 * to the interviewer turn tracker (electron/services/interviewerTurn.ts).
 */

export interface EnergyVadOptions {
    sampleRate: number;
    frameMs?: number;
    hangoverMs?: number;
    marginDb?: number;
    floorDbfs?: number;
    historySec?: number;
}

export interface VadUpdate {
    speaking: boolean;
    changed: boolean;
    at: number;
}

export interface EnergyVad {
    push(pcm16: Buffer, at: number): VadUpdate;
    speaking(): boolean;
    thresholdDbfs(): number;
}

/** RMS level of `samples` little-endian int16 samples starting at byte `offset`, as dBFS relative to full scale. True silence (rms 0) reads as −100. */
export function frameDbfs(pcm16: Buffer, offset: number, samples: number): number {
    let sumSquares = 0;
    for (let i = 0; i < samples; i++) {
        const sample = pcm16.readInt16LE(offset + i * 2);
        sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / samples);
    if (rms === 0) return -100;
    return 20 * Math.log10(rms / 32768);
}

export function createEnergyVad(opts: EnergyVadOptions): EnergyVad {
    const frameMs = opts.frameMs ?? 20;
    const hangoverMs = opts.hangoverMs ?? 250; // measured TTS pauses are >= 0.42 s; a gap must clear this to read as a pause, not articulation
    const marginDb = opts.marginDb ?? 10;
    const floorDbfs = opts.floorDbfs ?? -45; // -45 dBFS = 185 RMS is the native module's own speech-start threshold
    const historySec = opts.historySec ?? 30; // noise floor = 15th percentile over the trailing 30 s

    const frameSamples = Math.round((opts.sampleRate * frameMs) / 1000);
    const frameBytes = frameSamples * 2;
    const historyCapacity = Math.round((historySec * 1000) / frameMs);

    const history: number[] = []; // ring buffer of frame dBFS levels, oldest first, capped at historyCapacity
    let leftover = Buffer.alloc(0); // a partial frame carried over from the previous push
    let isSpeaking = false;
    let lastLoudEnd = -Infinity; // end time of the most recent loud frame; only read while isSpeaking, which is only ever set alongside it

    /** 15th percentile of the frame-level history; −100 before any frame has been seen. */
    function noiseFloor(): number {
        const n = history.length;
        if (n === 0) return -100;
        const sorted = [...history].sort((a, b) => a - b);
        return sorted[Math.floor(0.15 * n)];
    }

    function threshold(): number {
        return Math.max(noiseFloor() + marginDb, floorDbfs);
    }

    function recordLevel(level: number): void {
        history.push(level);
        if (history.length > historyCapacity) history.shift();
    }

    function push(pcm16: Buffer, at: number): VadUpdate {
        const working = leftover.length > 0 ? Buffer.concat([leftover, pcm16]) : pcm16;
        const n = Math.floor(working.length / frameBytes);
        leftover = Buffer.from(working.subarray(n * frameBytes)); // own the bytes; the caller's buffer may be reused after this call returns

        let lastTransition: VadUpdate | null = null;

        for (let k = 0; k < n; k++) {
            const frameEnd = at - (n - 1 - k) * frameMs;
            const level = frameDbfs(working, k * frameBytes, frameSamples);
            const loud = level >= threshold(); // against history so far — the frame being judged is not yet in it
            if (!loud) recordLevel(level); // the noise floor tracks background only — speech must never raise its own detection threshold

            if (loud) {
                lastLoudEnd = frameEnd;
                if (!isSpeaking) {
                    isSpeaking = true;
                    lastTransition = { speaking: true, changed: true, at: frameEnd };
                }
            } else if (isSpeaking && frameEnd - lastLoudEnd >= hangoverMs) {
                isSpeaking = false;
                lastTransition = { speaking: false, changed: true, at: lastLoudEnd }; // stamped when the voice actually stopped, not when the hangover expired
            }
        }

        return lastTransition ?? { speaking: isSpeaking, changed: false, at };
    }

    return {
        push,
        speaking: () => isSpeaking,
        thresholdDbfs: () => threshold(),
    };
}
