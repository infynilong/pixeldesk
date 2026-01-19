import React from 'react';
import { getAssetUrl } from '@/lib/utils/assets';

interface LevelBadgeProps {
    level: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    customColor?: string;
    customIcon?: string | null;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
    level,
    size = 'sm',
    showLabel = false,
    customColor,
    customIcon
}) => {
    // Pixel style color map and theme specific elements
    const configs: Record<number, {
        color: string;
        border: string;
        glow: string;
        name: string;
        bgPattern?: string;
        decorations?: React.ReactNode;
        isMaster?: boolean;
    }> = {
        0: { color: '#94a3b8', border: '#475569', glow: '#64748b', name: '故障' },
        1: { // Bronze with Gears
            color: '#b45309',
            border: '#78350f',
            glow: '#f59e0b',
            name: '青铜',
            decorations: (
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 4h2v2H4zM18 4h2v2h-2zM4 18h2v2H4zM18 18h2v2h-2z" /> {/* Corners */}
                        <circle cx="5" cy="5" r="2" />
                        <circle cx="19" cy="5" r="2" />
                        <circle cx="5" cy="19" r="2" />
                        <circle cx="19" cy="19" r="2" />
                    </svg>
                </div>
            )
        },
        2: { // Silver with Bolts
            color: '#64748b',
            border: '#334155',
            glow: '#94a3b8',
            name: '白银',
            decorations: (
                <div className="absolute inset-0 opacity-60 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="2" height="2" />
                        <rect x="19" y="3" width="2" height="2" />
                        <rect x="3" y="19" width="2" height="2" />
                        <rect x="19" y="19" width="2" height="2" />
                    </svg>
                </div>
            )
        },
        3: { // Gold with Sparkles
            color: '#fbbf24',
            border: '#b45309',
            glow: '#fef3c7',
            name: '黄金',
            decorations: (
                <div className="absolute inset-0 opacity-80 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" transform="scale(0.5) translate(4, 4)" />
                        <path d="M12 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" transform="scale(0.3) translate(60, 20)" />
                        <path d="M12 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" transform="scale(0.3) translate(10, 60)" />
                    </svg>
                </div>
            )
        },
        4: { // Crystal with Gems
            color: '#22d3ee',
            border: '#0891b2',
            glow: '#a5f3fc',
            name: '铂金',
            decorations: (
                <div className="absolute inset-0 opacity-70 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="white">
                        <path d="M3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM17 17h4v4h-4z" opacity="0.5" />
                        <path d="M4 4h2v2H4zM18 4h2v2h-2zM4 18h2v2H4zM18 18h2v2h-2z" />
                    </svg>
                </div>
            )
        },
        5: { // Master with Rainbow
            color: '#4c1d95',
            border: '#2e1065',
            glow: '#d8b4fe',
            name: '大师',
            isMaster: true,
            bgPattern: 'repeating-linear-gradient(45deg, #4c1d95 0px, #4c1d95 4px, #5b21b6 4px, #5b21b6 8px)',
            decorations: (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20" />
                    <svg className="w-full h-full opacity-30" viewBox="0 0 24 24" fill="url(#rainbow-grad-badge)">
                        <defs>
                            <linearGradient id="rainbow-grad-badge" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#f472b6" />
                                <stop offset="50%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#60a5fa" />
                            </linearGradient>
                        </defs>
                        <path d="M0 0h24v24H0z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                    </svg>
                </div>
            )
        },
    };

    const defaultConfig = configs[level] || configs[5];
    const displayColor = customColor || defaultConfig.color;
    const displayGlow = customColor || defaultConfig.glow;

    const sizeMetrics = {
        sm: { box: 24, font: 10, borderSize: 2 },
        md: { box: 36, font: 14, borderSize: 3 },
        lg: { box: 48, font: 20, borderSize: 4 },
    };

    const { box, font, borderSize } = sizeMetrics[size];

    return (
        <div className="relative inline-flex flex-col items-center select-none">
            {showLabel && (
                <span className="text-[10px] font-black italic uppercase tracking-widest mb-1 text-slate-500 pixel-font">
                    {defaultConfig.name}
                </span>
            )}

            <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                    width: box,
                    height: box,
                    backgroundColor: displayColor,
                    backgroundImage: defaultConfig.bgPattern,
                    boxShadow: `
                        -${borderSize}px 0 0 0 #000,
                        ${borderSize}px 0 0 0 #000,
                        0 -${borderSize}px 0 0 #000,
                        0 ${borderSize}px 0 0 #000,
                        inset -${borderSize}px -${borderSize}px 0 0 rgba(0,0,0,0.3),
                        inset ${borderSize}px ${borderSize}px 0 0 rgba(255,255,255,0.3),
                        0 0 10px ${displayGlow}88
                    `,
                    imageRendering: 'pixelated',
                    border: defaultConfig.isMaster ? '2px solid transparent' : 'none',
                    borderRadius: '2px', // Slight rounding for pixel look
                }}
            >
                {/* Background Decorations (Only if no custom icon) */}
                {!customIcon && defaultConfig.decorations}

                {/* CRT Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05))',
                        backgroundSize: '100% 2px, 3px 100%'
                    }}
                />

                {/* Level Content: Image or Number */}
                {customIcon ? (
                    <img src={getAssetUrl(customIcon)} alt={`Level ${level}`} className="w-full h-full object-contain pixelated relative z-10" />
                ) : (
                    <span
                        className="relative font-bold text-white z-10 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
                        style={{ fontSize: font, fontFamily: 'var(--font-pixel, "Press Start 2P")' }}
                    >
                        {level}
                    </span>
                )}

                {/* Master Badge "MASTER" Label */}
                {defaultConfig.isMaster && size !== 'sm' && !customIcon && (
                    <div className="absolute -bottom-0.5 left-0 right-0 bg-black/60 py-0.5 text-center">
                        <span className="text-[6px] text-white font-bold tracking-tighter uppercase whitespace-nowrap">MASTER</span>
                    </div>
                )}
            </div>
        </div>
    );
};
