/**
 * DeepgramStreamingSTT - SDK-based streaming Speech-to-Text using Deepgram Nova-3
 *
 * Uses @deepgram/sdk v3 (listen.live) instead of raw WebSocket.
 * Implements the same EventEmitter interface as GoogleSTT:
 *   Events: 'transcript' ({ text, isFinal, confidence }), 'error' (Error),
 *     'speech-started' ({ at }), 'utterance-end' ({ at })
 *   Methods: start(), stop(), write(chunk), setSampleRate(), setAudioChannelCount()
 */

import { EventEmitter } from 'events';
import { RECOGNITION_LANGUAGES } from '../config/languages';
import { keytermsFor, isEnglishLanguage } from './deepgramKeyterms';
import { createBoundaryRepair } from './deepgramBoundaryRepair';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;
const KEEPALIVE_INTERVAL_MS = 8000;

export class DeepgramStreamingSTT extends EventEmitter {
    private apiKey: string;
    private live: any = null;
    private isActive = false;
    private shouldReconnect = false;
    private isOpen = false; // tracks whether SDK connection is in OPEN state

    private sampleRate = 16000;
    private numChannels = 1;
    private languageCode = 'en';

    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private keepAliveInterval: NodeJS.Timeout | null = null;
    private buffer: Buffer[] = [];
    private isConnecting = false;

    // Per-socket accounting for the close summary. The 2026-09-02 flight test
    // showed the server closing every socket ~10 s after open as idle even
    // while it was transcribing; this line is what says whether our audio and
    // keepalives actually reached send().
    private sockSeq = 0;
    private sockOpenedAt = 0;
    private sockChunks = 0;
    private sockBytes = 0;
    private sockKeepAlives = 0;
    private sockLastSendAt = 0;
    private sockLastReadyState: number | string = 'n/a';
    private sockNotOpenWrites = 0;

    constructor(apiKey: string) {
        super();
        this.apiKey = apiKey;
    }

    public setSampleRate(rate: number): void {
        if (this.sampleRate === rate) return;
        this.sampleRate = rate;
        console.log(`[DeepgramStreaming] Sample rate set to ${rate}`);
        if (this.isActive) this.restartStream();
    }

    public setAudioChannelCount(count: number): void {
        if (this.numChannels === count) return;
        this.numChannels = count;
        console.log(`[DeepgramStreaming] Channel count set to ${count}`);
        if (this.isActive) this.restartStream();
    }

    public setRecognitionLanguage(key: string): void {
        if (key === 'auto') {
            if (this.languageCode === 'multi') return;
            this.languageCode = 'multi';
            console.log('[DeepgramStreaming] Language set to multilingual (multi)');
            if (this.isActive) this.restartStream();
            return;
        }
        const config = RECOGNITION_LANGUAGES[key];
        if (config && this.languageCode !== config.iso639) {
            this.languageCode = config.iso639;
            console.log(`[DeepgramStreaming] Language set to ${this.languageCode}`);
            if (this.isActive) this.restartStream();
        }
    }

    public setCredentials(_path: string): void { }

    private restartStream(): void {
        console.log('[DeepgramStreaming] Restarting due to config change...');
        this.stop();
        this.start();
    }

    public start(): void {
        if (this.isActive) return;
        this.isActive = true;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.connect();
    }

    public stop(): void {
        this.shouldReconnect = false;
        this.clearTimers();

        if (this.live) {
            try {
                this.live.requestClose();
            } catch {
                // ignore errors during shutdown
            }
            this.live = null;
        }

        this.isActive = false;
        this.isConnecting = false;
        this.isOpen = false;
        // The replaced socket's Close is ignored (stale), so its accounting must
        // not leak into the next socket's summary line.
        this.sockOpenedAt = 0;
        this.buffer = [];
        console.log('[DeepgramStreaming] Stopped');
    }

    public finalize(): void {
        if (!this.isActive || !this.isOpen || !this.live) return;
        try {
            this.live.finalize();
            console.log('[DeepgramStreaming] Sent Finalize to flush server buffer');
        } catch (err: any) {
            console.error('[DeepgramStreaming] Finalize failed:', err?.message);
        }
    }

    public write(chunk: Buffer): void {
        if (!this.isActive) return;

        if (!this.isOpen) {
            this.buffer.push(chunk);
            if (this.buffer.length > 500) this.buffer.shift();

            if (!this.isConnecting && this.shouldReconnect && !this.reconnectTimer) {
                this.connect();
            }
            return;
        }

        try {
            const rs = typeof this.live?.getReadyState === 'function' ? this.live.getReadyState() : 'n/a';
            this.sockLastReadyState = rs;
            if (rs !== 'n/a' && rs !== 1) this.sockNotOpenWrites++;
            this.live.send(chunk);
            this.sockChunks++;
            this.sockBytes += chunk.length;
            this.sockLastSendAt = Date.now();
        } catch (err: any) {
            console.error('[DeepgramStreaming] Send error:', err?.message);
        }
    }

    private connect(): void {
        if (this.isConnecting) return;
        this.isConnecting = true;

        console.log(`[DeepgramStreaming] Connecting (rate=${this.sampleRate}, ch=${this.numChannels}, lang=${this.languageCode})...`);

        try {
            const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

            const deepgram = createClient(this.apiKey);

            // Roster terms Deepgram measurably loses — "the tie rule" became "the Thai rule"
            // and produced the only wrong answer of flight s50j. English-only; see
            // deepgramKeyterms.ts for each term's provenance.
            const keyterm = keytermsFor(this.languageCode);
            const live = deepgram.listen.live({
                model: 'nova-3',
                language: this.languageCode,
                smart_format: true,
                interim_results: true,
                encoding: 'linear16',
                sample_rate: this.sampleRate,
                channels: this.numChannels,
                endpointing: 300,
                utterance_end_ms: 1000,
                vad_events: true,
                ...(keyterm ? { keyterm: [...keyterm] } : {}),
            });
            if (keyterm) console.log(`[DeepgramStreaming] keyterm prompting: ${keyterm.length} terms`);
            this.live = live;
            // Every handler below belongs to THIS socket. stop() and restartStream()
            // replace `this.live` but cannot detach handlers already attached, so a
            // replaced socket's Open/Close/Error must not touch the instance. Measured
            // 2026-09-05 (after6): the first sample-rate restart left socket A's
            // handlers live; A's close marked the live socket B closed, cleared B's
            // keepalive and reconnected, orphaning B — which the server closed 12 s
            // later with 1011, and that close orphaned C: one 1011 every 12.1 s for
            // the whole hour (308 closes), each dropping the audio the orphan held.
            const stale = (): boolean => this.live !== live;
            // The boundary repair belongs to THIS socket, like the handlers: a restart's new socket
            // starts with no remembered cut, so nothing is ever repaired across a reconnect. English
            // sockets only (the test keytermsFor uses): the rule compares ASCII tokens and mangled
            // Spanish and Turkish text in the 2026-09-29 spec review; any other language, and
            // 'multi', passes through untouched.
            const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;

            live.on(LiveTranscriptionEvents.Open, () => {
                if (stale()) {
                    console.log('[DeepgramStreaming] Stale socket opened after a restart — closing it');
                    try { live.requestClose(); } catch { }
                    return;
                }
                this.isConnecting = false;
                this.isOpen = true;
                console.log('[DeepgramStreaming] Connected');
                this.sockSeq++;
                this.sockOpenedAt = Date.now();
                this.sockChunks = 0; this.sockBytes = 0; this.sockKeepAlives = 0;
                this.sockLastSendAt = this.sockOpenedAt; this.sockLastReadyState = 'n/a'; this.sockNotOpenWrites = 0;

                // Register Transcript inside Open per SDK README pattern
                live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                    try {
                        const alt = data.channel?.alternatives?.[0];
                        const transcript = alt?.transcript;
                        const isFinal = data.is_final ?? false;
                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`);
                        if (!transcript) {
                            // An empty FINAL is a pause (median 187 per flight hour): a cut remembered
                            // before it must not be glued onto the next utterance. Empty interims are
                            // not (they precede the words of every segment).
                            if (isFinal) boundaryRepair?.clear();
                            return;
                        }
                        // Deepgram sometimes finalizes short of its own interim and resumes one word
                        // later; the word is in no final. Measured 2026-09-29: 25 repaired losses in
                        // the non-holdout logs, all 25 true to the script (the measured precision; 25
                        // is a floor on the losses), 6 of 20 seam plays; the rule lives in
                        // deepgramBoundaryRepair. speech_final = Deepgram heard the utterance end at
                        // this final, so it leaves no cut (never logged: its in-app effect is unmeasured).
                        const repaired = boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true);
                        if (repaired?.restored) {
                            console.log(`[DeepgramStreaming] boundary repair: restored "${repaired.restored.join(' ')}" before "${transcript.slice(0, 40)}"`);
                        }
                        this.emit('transcript', {
                            text: repaired?.text ?? transcript,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });

                // vad_events / utterance_end_ms are requested in the connect options
                // above; until 2026-09-09 nobody listened. The interviewer turn logs
                // them beside its own VAD (a calibration signal, not a decision input).
                live.on(LiveTranscriptionEvents.SpeechStarted, () => { if (!stale()) this.emit('speech-started', { at: Date.now() }); });
                // An UtteranceEnd is a pause for the boundary repair too (its state is this socket's own).
                live.on(LiveTranscriptionEvents.UtteranceEnd, () => { boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end', { at: Date.now() }); });

                // Flush buffered audio
                const buffered = this.buffer.splice(0);
                for (const chunk of buffered) {
                    try { live.send(chunk); } catch { }
                }
                if (buffered.length > 0) {
                    console.log(`[DeepgramStreaming] Flushed ${buffered.length} buffered chunks`);
                }

                // SDK keepAlive() every 8s prevents idle timeout (per Deepgram docs)
                this.keepAliveInterval = setInterval(() => {
                    if (this.isOpen) {
                        try { this.live?.keepAlive(); } catch { }
                        this.sockKeepAlives++;
                    }
                }, KEEPALIVE_INTERVAL_MS);

                // Reset backoff only after 5s of stable connection
                setTimeout(() => {
                    if (this.isOpen) this.reconnectAttempts = 0;
                }, 5000);
            });

            live.on(LiveTranscriptionEvents.Error, (err: any) => {
                if (stale()) return;
                console.error('[DeepgramStreaming] Error:', err);
                this.emit('error', err instanceof Error ? err : new Error(String(err)));
            });

            live.on(LiveTranscriptionEvents.Close, (event: any) => {
                const code = event?.code ?? 'unknown';
                const reason = event?.reason || '(empty)';
                if (stale()) {
                    console.log(`[DeepgramStreaming] Stale socket closed (code=${code}) — ignored`);
                    return;
                }
                console.log(`[DeepgramStreaming] Closed (code=${code}, reason=${reason})`);
                if (this.sockOpenedAt) {
                    const now = Date.now();
                    console.log(`[DeepgramStreaming] socket #${this.sockSeq} lived ${((now - this.sockOpenedAt) / 1000).toFixed(1)}s — ${this.sockChunks} chunks / ${this.sockBytes} bytes to send() after the flush, ${this.sockKeepAlives} keepalive ticks, last send ${((now - this.sockLastSendAt) / 1000).toFixed(1)}s before close, readyState at last write=${this.sockLastReadyState}, writes while not open=${this.sockNotOpenWrites}`);
                    this.sockOpenedAt = 0;
                }

                this.isOpen = false;
                this.isConnecting = false;
                this.clearTimers();

                if (this.shouldReconnect && code !== 1000) {
                    this.scheduleReconnect();
                }
            });

        } catch (err: any) {
            console.error('[DeepgramStreaming] Initialization error:', err?.message);
            this.isConnecting = false;
            if (this.shouldReconnect) this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (!this.shouldReconnect) return;

        // Discard stale buffered audio — replaying seconds-old audio on reconnect
        // overwhelms Deepgram's real-time endpoint and causes EPIPE storms.
        this.buffer = [];

        if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
            console.error(`[DeepgramStreaming] Max reconnect attempts reached — giving up`);
            this.emit('error', new Error('DeepgramStreamingSTT: max reconnect attempts exceeded'));
            return;
        }

        const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
            RECONNECT_MAX_DELAY_MS
        );
        this.reconnectAttempts++;

        console.log(`[DeepgramStreaming] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS})...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.shouldReconnect) this.connect();
        }, delay);
    }

    private clearTimers(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }
}
