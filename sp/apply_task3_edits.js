const fs = require('fs');
const path = process.argv[2];
let src = fs.readFileSync(path, 'utf8');

function replaceOnce(label, oldStr, newStr) {
    const count = src.split(oldStr).length - 1;
    if (count !== 1) {
        throw new Error(`Edit "${label}" expected exactly 1 match, found ${count}`);
    }
    src = src.replace(oldStr, newStr);
}

// 1. Fields after `private isConnecting = false;`
replaceOnce(
    'fields',
    `    private isConnecting = false;\n`,
    `    private isConnecting = false;\n\n` +
    `    // Per-socket accounting for the close summary. The 2026-09-02 flight test\n` +
    `    // showed the server closing every socket ~10 s after open as idle even\n` +
    `    // while it was transcribing; this line is what says whether our audio and\n` +
    `    // keepalives actually reached send().\n` +
    `    private sockSeq = 0;\n` +
    `    private sockOpenedAt = 0;\n` +
    `    private sockChunks = 0;\n` +
    `    private sockBytes = 0;\n` +
    `    private sockKeepAlives = 0;\n` +
    `    private sockLastSendAt = 0;\n` +
    `    private sockLastReadyState: number | string = 'n/a';\n` +
    `    private sockNotOpenWrites = 0;\n`
);

// 2. write() try/catch block
replaceOnce(
    'write() send block',
    `        try {\n` +
    `            this.live.send(chunk);\n` +
    `        } catch (err: any) {\n` +
    `            console.error('[DeepgramStreaming] Send error:', err?.message);\n` +
    `        }\n`,
    `        try {\n` +
    `            const rs = typeof this.live?.getReadyState === 'function' ? this.live.getReadyState() : 'n/a';\n` +
    `            this.sockLastReadyState = rs;\n` +
    `            if (rs !== 'n/a' && rs !== 1) this.sockNotOpenWrites++;\n` +
    `            this.live.send(chunk);\n` +
    `            this.sockChunks++;\n` +
    `            this.sockBytes += chunk.length;\n` +
    `            this.sockLastSendAt = Date.now();\n` +
    `        } catch (err: any) {\n` +
    `            console.error('[DeepgramStreaming] Send error:', err?.message);\n` +
    `        }\n`
);

// 3. Open handler — reset counters right after the Connected log
replaceOnce(
    'Open handler reset',
    `                console.log('[DeepgramStreaming] Connected');\n`,
    `                console.log('[DeepgramStreaming] Connected');\n` +
    `                this.sockSeq++;\n` +
    `                this.sockOpenedAt = Date.now();\n` +
    `                this.sockChunks = 0; this.sockBytes = 0; this.sockKeepAlives = 0;\n` +
    `                this.sockLastSendAt = this.sockOpenedAt; this.sockLastReadyState = 'n/a'; this.sockNotOpenWrites = 0;\n`
);

// 4. keepalive tick counter
replaceOnce(
    'keepalive tick counter',
    `                    if (this.isOpen) {\n` +
    `                        try { this.live?.keepAlive(); } catch { }\n` +
    `                    }\n`,
    `                    if (this.isOpen) {\n` +
    `                        try { this.live?.keepAlive(); } catch { }\n` +
    `                        this.sockKeepAlives++;\n` +
    `                    }\n`
);

// 5. Close handler — summary line
replaceOnce(
    'Close handler summary',
    `                console.log(\`[DeepgramStreaming] Closed (code=\${code}, reason=\${reason})\`);\n`,
    `                console.log(\`[DeepgramStreaming] Closed (code=\${code}, reason=\${reason})\`);\n` +
    `                if (this.sockOpenedAt) {\n` +
    `                    const now = Date.now();\n` +
    `                    console.log(\`[DeepgramStreaming] socket #\${this.sockSeq} lived \${((now - this.sockOpenedAt) / 1000).toFixed(1)}s — \${this.sockChunks} chunks / \${this.sockBytes} bytes to send() after the flush, \${this.sockKeepAlives} keepalive ticks, last send \${((now - this.sockLastSendAt) / 1000).toFixed(1)}s before close, readyState at last write=\${this.sockLastReadyState}, writes while not open=\${this.sockNotOpenWrites}\`);\n` +
    `                    this.sockOpenedAt = 0;\n` +
    `                }\n`
);

fs.writeFileSync(path, src, 'utf8');
console.log('OK: applied 5 edits to', path);
