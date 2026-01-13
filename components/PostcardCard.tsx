'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export interface PostcardData {
    id?: string;
    ownerId?: string;
    ownerName?: string;
    name?: string;
    content?: string;
    logoUrl?: string | null;
    bgUrl?: string | null;
    createdAt?: string;
}

interface PostcardCardProps extends React.HTMLAttributes<HTMLDivElement> {
    card: PostcardData;
    isMine?: boolean;
    isFlipped?: boolean;
    onFlip?: () => void;
    onDelete?: () => void;
    // className and style are included in HTMLAttributes, but we can keep explicit overrides if we want specific docs
    className?: string;
    style?: React.CSSProperties;
}

const PostcardCard: React.FC<PostcardCardProps> = ({
    card,
    isMine = false,
    isFlipped = false,
    onFlip,
    onDelete,
    className = '',
    style,
    ...props
}) => {
    // If external flip control is not provided, we could handle it internally, 
    // but for now we follow the pattern where the parent controls state or we use a local state wrapper if needed.
    // However, to keep it simple and stateless for the preview modal, we rely on props.
    // If onFlip is provided, it's interactive.

    return (
        <div
            className={`perspective-1000 w-full aspect-[3/2] group ${className}`}
            style={style}
            {...props}
        >
            <motion.div
                className="w-full h-full relative preserve-3d cursor-pointer transition-shadow hover:shadow-2xl rounded-xl"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.4, type: 'tween', ease: 'easeInOut' }}
                onClick={onFlip}
            >
                {/* Front of card */}
                <div
                    className="absolute inset-0 backface-hidden bg-white border-[8px] border-white shadow-lg overflow-hidden flex flex-col justify-end p-4 bg-cover bg-center rounded-xl"
                    style={{ backgroundImage: card.bgUrl ? `url(${card.bgUrl})` : 'none' }}
                >
                    {!card.bgUrl && <div className="absolute inset-0 bg-amber-50 flex items-center justify-center text-amber-900/10 italic">No BG</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    {onDelete && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-sm text-red-500 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all z-50 opacity-0 group-hover:opacity-100"
                            title="Remove from collection"
                        >
                            🗑️
                        </div>
                    )}

                    {card.logoUrl ? (
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/80 p-1 rounded-md shadow-sm backdrop-blur-sm border border-black/5">
                            <img
                                src={card.logoUrl}
                                className="w-full h-full object-contain"
                                alt="logo"
                                onError={(e) => {
                                    // Default icon fallback
                                    e.currentTarget.src = '/assets/icon.png';
                                    e.currentTarget.onerror = null; // Prevent infinite loop
                                }}
                            />
                        </div>
                    ) : (
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/80 p-1 rounded-md shadow-sm backdrop-blur-sm border border-black/5">
                            <img src="/assets/icon.png" className="w-full h-full object-contain" alt="PixelDesk" />
                        </div>
                    )}

                    <div className="flex-1 flex items-center justify-center p-4 w-full overflow-hidden">
                        <h3 className="text-xl font-black text-center text-cyan-950 uppercase tracking-tighter leading-tight line-clamp-3 break-words relative z-10 drop-shadow-sm">
                            {card.name || 'Untitled Card'}
                        </h3>
                    </div>

                    <div className="w-full border-t border-amber-900/10 pt-2 flex justify-between items-center px-2 relative z-10">
                        <div className="text-[10px] font-bold text-cyan-900/30 uppercase tracking-[0.2em] scale-75 origin-left">
                            PixelDesk
                        </div>
                        <div className="text-[8px] font-mono text-amber-900/30">
                            NO. {card.id?.slice(-4).toUpperCase() || '0000'}
                        </div>
                    </div>
                </div>

                {/* Back of card (Message side) */}
                <div
                    className="absolute inset-0 backface-hidden bg-[#fffdfa] border-2 border-amber-900/5 shadow-lg p-6 flex flex-col rotate-y-180 rounded-xl"
                    style={{ backgroundImage: 'radial-gradient(#d1d1d1 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}
                >
                    <div className="flex justify-between border-b border-amber-900/10 pb-4 mb-4 flex-1">
                        <div className="flex-1 space-y-3 relative">
                            {/* Decorative Address Lines */}
                            <div className="h-px w-full bg-amber-900/10"></div>
                            <div className="h-px w-full bg-amber-900/10"></div>
                            <div className="h-px w-2/3 bg-amber-900/10"></div>

                            <p className="text-xs font-serif italic text-amber-900/80 leading-relaxed whitespace-pre-wrap mt-6 pr-2 max-h-[80px] overflow-y-auto scrollbar-hide">
                                {card.content || '...'}
                            </p>

                            <div className="mt-4 pt-2">
                                <span className="text-[10px] font-bold text-amber-950/40 uppercase tracking-widest flex items-center gap-1">
                                    From: <span className="underline decoration-dotted hover:text-amber-600 transition-colors">{card.ownerName || 'Unknown'}</span>
                                </span>
                            </div>
                        </div>

                        {/* Stamp Placeholder */}
                        <div className="w-16 h-20 border-2 border-dashed border-amber-900/30 flex flex-col items-center justify-center p-2 text-center text-[8px] font-bold text-amber-900/20 ml-6 shrink-0 transform rotate-2">
                            <span className="text-xl mb-1">🕊️</span>
                            AZURE BLUEBIRD
                        </div>
                    </div>

                    <div className="mt-auto flex justify-between items-end opacity-20">
                        {/* Left generic code or date */}
                        <div className="text-[8px] font-mono tracking-widest">{card.createdAt ? new Date(card.createdAt).toLocaleDateString() : '2026.05.20'}</div>

                        {/* Right footer style */}
                        <div className="flex flex-col items-end">
                            <div className="text-[8px] font-mono tracking-widest">AZUREBLUEBIRD-2026-PC</div>
                            <div className="w-32 h-1 bg-amber-950 mt-1"></div>
                        </div>
                    </div>
                </div>
            </motion.div>
            {isMine && (
                <div className="absolute -top-3 -right-3 bg-amber-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-20 uppercase tracking-widest border-2 border-white">
                    My Card
                </div>
            )}
            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div >
    );
};

export default PostcardCard;
