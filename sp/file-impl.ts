
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
            });
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
                        if (!transcript) return;
                        this.emit('transcript', {
                            text: transcript,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });

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
