// electron/services/OllamaManager.ts
import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';

export class OllamaManager {
    private static instance: OllamaManager;
    private ollamaProcess: ChildProcess | null = null;
    private isAppManaged: boolean = false;
    private pollTimer: NodeJS.Timeout | null = null;
    // Fast phase: 20 ticks @ 250ms = first 5s. Slow phase: 23 ticks @ 5s = up to ~120s total.
    private static readonly FAST_TICKS = 20;
    private static readonly FAST_INTERVAL_MS = 250;
    private static readonly SLOW_INTERVAL_MS = 5000;
    private static readonly MAX_ATTEMPTS = OllamaManager.FAST_TICKS + 23;
    private attempts = 0;
    private onReadyCallback: (() => void) | null = null;

    private constructor() {}

    public static getInstance(): OllamaManager {
        if (!OllamaManager.instance) {
            OllamaManager.instance = new OllamaManager();
        }
        return OllamaManager.instance;
    }

    /** Register a callback to fire once Ollama is confirmed reachable. */
    public setOnReady(cb: () => void): void {
        this.onReadyCallback = cb;
    }

    /**
     * Initialize the manager. Checks if Ollama is running, starts it if not.
     */
    public async init(): Promise<void> {
        console.log('[OllamaManager] Checking if Ollama is already running...');
        const isRunning = await this.checkIsRunning();

        if (isRunning) {
            console.log('[OllamaManager] Ollama is already running. App will not manage its lifecycle.');
            this.isAppManaged = false;
            this.onReadyCallback?.();
            return;
        }

        console.log('[OllamaManager] Ollama not detected. Attempting to start in background...');
        this.startOllama();
        this.pollUntilReady();
    }

    /**
     * Ping the local Ollama server to see if it responds.
     */
    private async checkIsRunning(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout
            
            const response = await fetch('http://127.0.0.1:11434/api/tags', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            // ECONNREFUSED or timeout means it's not running
            return false;
        }
    }

    /**
     * Spawns the 'ollama serve' command invisibly.
     */
    private startOllama(): void {
        try {
            this.isAppManaged = true;
            
            // Spawn detached and hidden
            this.ollamaProcess = spawn('ollama', ['serve'], {
                detached: false, // Keep attached to app lifecycle
                windowsHide: true, // Hide terminal on Windows
                stdio: 'ignore' // We don't care about its logs
            });

            this.ollamaProcess.on('error', (err) => {
                console.error('[OllamaManager] Failed to start Ollama. Is it installed?', err.message);
                this.isAppManaged = false;
                this.ollamaProcess = null;
                this.clearPollTimer();
            });

            this.ollamaProcess.on('close', (code) => {
                console.log(`[OllamaManager] Process exited with code ${code}`);
                this.ollamaProcess = null;
            });

        } catch (err) {
            console.error('[OllamaManager] Exception while spawning Ollama:', err);
            this.isAppManaged = false;
        }
    }

    /**
     * Polls aggressively for the first ~5s (250ms ticks), then backs off to 5s
     * ticks. `ollama serve` typically binds 11434 in well under a second on a
     * warm box, but the previous fixed 5s cadence meant we wouldn't notice
     * until the next tick — adding ~5s of dead time to cold startup.
     */
    private pollUntilReady(): void {
        this.attempts = 0;

        const tick = async () => {
            this.pollTimer = null;
            this.attempts++;
            if (await this.checkIsRunning()) {
                const fast = Math.min(this.attempts, OllamaManager.FAST_TICKS);
                const slow = Math.max(0, this.attempts - OllamaManager.FAST_TICKS);
                const elapsedMs = fast * OllamaManager.FAST_INTERVAL_MS + slow * OllamaManager.SLOW_INTERVAL_MS;
                console.log(`[OllamaManager] Successfully connected to Ollama after ~${(elapsedMs / 1000).toFixed(1)}s (${this.attempts} polls)!`);
                this.onReadyCallback?.();
                return;
            }

            if (this.attempts >= OllamaManager.MAX_ATTEMPTS) {
                console.log('[OllamaManager] Timeout: Failed to connect to Ollama after 2 minutes. Please check if it is installed properly.');
                return;
            }

            // Only log on slow-phase ticks — fast-phase ticks would spam 20 lines in 5s.
            if (this.attempts >= OllamaManager.FAST_TICKS) {
                const slowAttempt = this.attempts - OllamaManager.FAST_TICKS + 1;
                const slowTotal = OllamaManager.MAX_ATTEMPTS - OllamaManager.FAST_TICKS;
                console.log(`[OllamaManager] Waiting for Ollama... (Attempt ${slowAttempt}/${slowTotal})`);
            }

            const nextInterval = this.attempts < OllamaManager.FAST_TICKS
                ? OllamaManager.FAST_INTERVAL_MS
                : OllamaManager.SLOW_INTERVAL_MS;
            this.pollTimer = setTimeout(tick, nextInterval);
        };

        this.pollTimer = setTimeout(tick, OllamaManager.FAST_INTERVAL_MS);
    }

    private clearPollTimer(): void {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Kills the Ollama process ONLY if this app started it.
     * Called when Electron is quitting.
     */
    public stop(): void {
        this.clearPollTimer();

        if (this.isAppManaged && this.ollamaProcess && this.ollamaProcess.pid) {
            console.log('[OllamaManager] App is quitting. Terminating managed Ollama process tree...');
            try {
                // Use tree-kill to ensure Ollama and all its nested runner processes die
                treeKill(this.ollamaProcess.pid, 'SIGTERM', (err) => {
                    if (err) {
                        console.error('[OllamaManager] Failed to tree-kill Ollama process:', err);
                    } else {
                        console.log('[OllamaManager] Successfully killed Ollama process tree.');
                    }
                });
            } catch (e) {
                console.error('[OllamaManager] Exception during kill:', e);
            }
        }
    }
}
