import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, Loader2, Wifi, WifiOff } from 'lucide-react';
import { STANDARD_CLOUD_MODELS, prettifyModelId } from '../utils/modelUtils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

// Define Model Types
interface ModelOption {
    id: string;
    name: string;
    type: 'cloud' | 'local' | 'custom' | 'ollama';
    provider?: string;
}



const ModelSelectorWindow = () => {
    const isLight = useResolvedTheme() === 'light';
    const [currentModel, setCurrentModel] = useState<string>(() => localStorage.getItem('cached-current-model') || '');
    const [availableModels, setAvailableModels] = useState<ModelOption[]>(() => {
        try {
            const cached = localStorage.getItem('cached-models');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [isLoading, setIsLoading] = useState<boolean>(() => availableModels.length === 0);
    const [warmUpStatus, setWarmUpStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [warmUpModel, setWarmUpModel] = useState<string | null>(null);





    // Load Data
    useEffect(() => {
        const loadModels = async () => {
            try {
                // If we already have models, don't show loading to avoid flicker
                if (availableModels.length === 0) {
                    setIsLoading(true);
                }
                
                // 1. Get Stored Credentials (to know which Cloud providers are active)
                const creds = await window.electronAPI?.getStoredCredentials?.();

                // 2. Custom Providers
                const customProviders = await window.electronAPI?.getCustomProviders?.() || [];

                // 3. Ollama
                let ollamaModels: string[] = [];
                try {
                    let oModels = await window.electronAPI?.getAvailableOllamaModels?.();

                    // If no models found, try to fix/restart Ollama (server might be down)
                    if (!oModels || oModels.length === 0) {
                        try {
                            // @ts-ignore
                            if (window.electronAPI?.forceRestartOllama) {
                                // @ts-ignore
                                await window.electronAPI.forceRestartOllama();
                                // Wait a moment for server to come up
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                // Retry fetch
                                oModels = await window.electronAPI?.getAvailableOllamaModels?.();
                            }
                        } catch (e) {
                            console.warn("Retrying Ollama failed", e);
                        }
                    }

                    if (oModels) ollamaModels = oModels;
                } catch (e) {
                    // Ignore ollama errors here
                }

                // Build the list
                const models: ModelOption[] = [];

                if (creds?.hasNativelyKey) {
                    models.push({ id: 'natively', name: 'Natively API', type: 'cloud', provider: 'natively' });
                }

                // Cloud Models — standard models + unique preferred models
                for (const [prov, cfg] of Object.entries(STANDARD_CLOUD_MODELS)) {
                    if (!cfg.hasKeyCheck(creds)) continue;
                    cfg.ids.forEach((id, i) => {
                        models.push({ id, name: cfg.names[i], type: 'cloud', provider: prov });
                    });
                    const pm = creds?.[cfg.pmKey];
                    if (pm && !cfg.ids.includes(pm)) {
                        models.push({ id: pm, name: prettifyModelId(pm), type: 'cloud', provider: prov });
                    }
                }

                // Dynamically fetch Gemma models from the real Gemini API
                if (creds?.hasGeminiKey) {
                    try {
                        const result = await window.electronAPI?.fetchProviderModels?.('gemini');
                        if (result?.success && result.models) {
                            const gemmaModels = result.models.filter(m => m.id.startsWith('gemma-'));
                            gemmaModels.forEach(m => {
                                if (!models.some(existing => existing.id === m.id)) {
                                    models.push({ id: m.id, name: m.label, type: 'cloud', provider: 'gemini' });
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to fetch Gemma models dynamically:', e);
                    }
                }

                // Custom Providers
                customProviders.forEach((p: any) => {
                    models.push({ id: p.id, name: p.name, type: 'custom' });
                });

                // Ollama
                ollamaModels.forEach((m: string) => {
                    models.push({ id: `ollama-${m}`, name: `${m} (Local)`, type: 'ollama' });
                });

                localStorage.setItem('cached-models', JSON.stringify(models));
                setAvailableModels(models);

                // 4. Get Current Active Model
                const config = await window.electronAPI?.getCurrentLlmConfig?.(); // Get runtime model
                if (config && config.model) {
                    setCurrentModel(config.model);
                    localStorage.setItem('cached-current-model', config.model);
                }

            } catch (err) {
                console.error("Failed to load models:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadModels();
        window.addEventListener('focus', loadModels);

        // Listen for model changes
        const unsubscribe = window.electronAPI?.onModelChanged?.((modelId: string) => {
            setCurrentModel(modelId);
            if (!modelId.startsWith('ollama-')) {
                setWarmUpStatus('idle');
                setWarmUpModel(null);
            }
        });

        // Listen for Ollama warm-up status
        const unsubscribeWarmUp = window.electronAPI?.onOllamaWarmUpStatus?.((data) => {
            setWarmUpModel(data.model);
            setWarmUpStatus(data.status);
        });

        return () => {
            unsubscribe?.();
            unsubscribeWarmUp?.();
            window.removeEventListener('focus', loadModels);
        };
    }, []);

    const handleSelectFn = (modelId: string) => {
        setCurrentModel(modelId);
        localStorage.setItem('cached-current-model', modelId);

        if (modelId.startsWith('ollama-')) {
            setWarmUpStatus('loading');
            setWarmUpModel(modelId.replace('ollama-', ''));
        } else {
            setWarmUpStatus('idle');
            setWarmUpModel(null);
        }

        window.electronAPI?.setModel(modelId)
            .catch((err: any) => console.error("Failed to set model:", err));
    };

    const panelClass = isLight
        ? 'bg-[#F3F4F6]/92 border-black/10 shadow-black/10'
        : 'bg-[#1E1E1E]/80 border-white/10 shadow-black/40';

    return (
        <div className="w-fit h-fit bg-transparent flex flex-col">
            <div className={`w-[140px] h-[200px] backdrop-blur-md border rounded-[16px] overflow-hidden shadow-2xl p-2 flex flex-col animate-scale-in origin-top-left ${panelClass}`}>

                {isLoading ? (
                    <div className={`flex items-center justify-center py-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs">Loading models...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
                        {availableModels.length === 0 ? (
                            <div className={`px-4 py-3 text-center text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                No models connected.<br />Check Settings.
                            </div>
                        ) : (
                            availableModels.map((model) => {
                                const isSelected = currentModel === model.id;
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => handleSelectFn(model.id)}
                                        className={`
                                            w-full text-left px-3 py-2 flex items-center justify-between group transition-colors duration-200 rounded-lg
                                            ${isSelected
                                                ? (isLight ? 'bg-black/[0.07] text-slate-900' : 'bg-white/10 text-white')
                                                : (isLight ? 'text-slate-500 hover:bg-black/[0.04] hover:text-slate-800' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200')
                                            }
                                        `}
                                    >
                                        <span className="text-[12px] font-medium truncate flex-1 min-w-0">{model.name}</span>
                                        {isSelected && model.type === 'ollama' && warmUpModel === model.id.replace('ollama-', '') && (
                                            warmUpStatus === 'loading'
                                                ? <Loader2 className="w-3 h-3 shrink-0 ml-1.5 animate-spin text-amber-400" />
                                                : warmUpStatus === 'ready'
                                                    ? <span className="w-2 h-2 shrink-0 ml-1.5 rounded-full bg-emerald-400" title="Model loaded and ready" />
                                                    : warmUpStatus === 'error'
                                                        ? <span className="w-2 h-2 shrink-0 ml-1.5 rounded-full bg-red-400" title="Failed to load model" />
                                                        : null
                                        )}
                                        {isSelected && <Check className={`w-3.5 h-3.5 shrink-0 ml-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default ModelSelectorWindow;
