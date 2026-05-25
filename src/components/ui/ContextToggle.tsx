import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, FileText, Briefcase, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useContextToggle } from '../../hooks/useContextToggle';

interface ContextToggleProps {
    appearance: OverlayAppearance;
}

export const ContextToggle: React.FC<ContextToggleProps> = ({ appearance }) => {
    const {
        enabled,
        available,
        hasResume,
        hasJobDescription,
        resumeName,
        resumeRole,
        toggle,
        openSettings,
    } = useContextToggle();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

    // Close on click outside (account for portal-rendered popover too)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const insideTrigger = containerRef.current?.contains(target);
            const insidePopover = popoverRef.current?.contains(target);
            if (!insideTrigger && !insidePopover) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Position the portal popover under the trigger
    useLayoutEffect(() => {
        if (!isOpen || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverPos({ top: rect.bottom + 8, left: rect.left });
    }, [isOpen]);

    const label = !available ? 'Context: —' : enabled ? 'Context: ON' : 'Context: OFF';
    const ariaLabel = !available
        ? 'Profile context unavailable — open menu to upload resume or job description'
        : enabled
            ? 'Profile context is ON. Open menu to manage.'
            : 'Profile context is OFF. Open menu to manage.';

    const stateClasses = !available
        ? 'opacity-50'
        : enabled
            ? 'opacity-100'
            : 'opacity-80';

    const handleToggleClick = async () => {
        if (!available) return;
        await toggle();
    };

    const handleManageClick = async () => {
        setIsOpen(false);
        await openSettings();
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                className={`
                    flex items-center gap-1.5
                    px-3 py-1.5
                    rounded-full
                    backdrop-blur-md
                    overlay-chip-surface
                    overlay-text-interactive
                    text-[11px]
                    font-medium
                    border
                    interaction-base interaction-hover interaction-press
                    ${stateClasses}
                `}
                style={appearance.chipStyle}
            >
                <Sparkles className="w-3 h-3" />
                <span className="tracking-wide">{label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && popoverPos && createPortal(
                <div
                    ref={popoverRef}
                    className="
                        fixed
                        w-72
                        rounded-xl
                        border border-white/10
                        shadow-2xl
                        overflow-hidden
                        animated fadeIn
                    "
                    style={{
                        ...appearance.chipStyle,
                        top: popoverPos.top,
                        left: popoverPos.left,
                        backgroundColor: 'rgba(20, 20, 22, 0.97)',
                        backdropFilter: 'blur(16px)',
                        zIndex: 999999,
                    }}
                    role="dialog"
                >
                    {/* Resume row */}
                    <div className="flex items-start gap-2.5 px-3.5 py-3 border-b border-white/5">
                        <FileText className="w-4 h-4 mt-0.5 text-white/60 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Resume</div>
                            {hasResume ? (
                                <>
                                    <div className="text-[13px] font-medium text-white truncate">
                                        {resumeName || 'Resume loaded'}
                                    </div>
                                    {resumeRole && (
                                        <div className="text-[11px] text-white/60 truncate">{resumeRole}</div>
                                    )}
                                </>
                            ) : (
                                <div className="text-[12px] text-white/50">Not uploaded</div>
                            )}
                        </div>
                    </div>

                    {/* JD row */}
                    <div className="flex items-start gap-2.5 px-3.5 py-3 border-b border-white/5">
                        <Briefcase className="w-4 h-4 mt-0.5 text-white/60 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Job Description</div>
                            <div className="text-[12px] text-white/80">
                                {hasJobDescription ? 'Loaded' : 'Not uploaded'}
                            </div>
                        </div>
                    </div>

                    {/* Toggle row */}
                    <button
                        type="button"
                        onClick={handleToggleClick}
                        disabled={!available}
                        aria-pressed={available ? enabled : undefined}
                        className={`
                            w-full flex items-center justify-between
                            px-3.5 py-3
                            border-b border-white/5
                            focus:outline-none focus-visible:outline-none
                            transition-colors
                            ${available ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                        `}
                        style={{ outline: 'none' }}
                    >
                        <span className="flex items-center gap-2 text-[12px] font-medium text-white">
                            <Sparkles className="w-3.5 h-3.5 text-white/60" />
                            Inject context into answers
                        </span>
                        <span
                            className={`
                                relative w-9 h-5 rounded-full transition-colors flex-shrink-0
                                ${enabled && available ? 'bg-emerald-500' : 'bg-white/15'}
                            `}
                        >
                            <span
                                className={`
                                    absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all
                                    ${enabled && available ? 'left-[18px]' : 'left-0.5'}
                                `}
                            />
                        </span>
                    </button>

                    {/* Manage link */}
                    <button
                        type="button"
                        onClick={handleManageClick}
                        className="
                            w-full flex items-center gap-2
                            px-3.5 py-3
                            text-[12px] text-white/70 hover:text-white
                            hover:bg-white/5
                            transition-colors
                            focus:outline-none
                        "
                        style={{ outline: 'none' }}
                    >
                        <SettingsIcon className="w-3.5 h-3.5" />
                        <span>Manage in Settings →</span>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ContextToggle;
