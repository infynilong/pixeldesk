'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/hooks/useTranslation';
import PostcardDesignerModal from './PostcardDesignerModal';

interface Postcard {
    id: string;
    ownerName: string;
    name: string;
    content: string;
    logoUrl: string | null;
    bgUrl: string | null;
    createdAt: string;
}

const BluebirdCollection: React.FC = () => {
    const { t } = useTranslation();
    const [collection, setCollection] = useState<Postcard[]>([]);
    const [myDesign, setMyDesign] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [collRes, designRes] = await Promise.all([
                fetch('/api/postcards/collection'),
                fetch('/api/postcards/design')
            ]);

            const collData = await collRes.json();
            const designData = await designRes.json();

            if (collData.success) setCollection(collData.data);
            if (designData.success) setMyDesign(designData.data);
        } catch (error) {
            console.error('Failed to fetch collection data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFlip = (id: string) => {
        setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const PostcardCard = ({ card, isMine = false }: { card: any, isMine?: boolean }) => {
        const isFlipped = flippedCards[card.id] || false;

        return (
            <div className="perspective-1000 w-full aspect-[3/2] cursor-pointer group" onClick={() => toggleFlip(card.id)}>
                <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="relative w-full h-full preserve-3d transition-shadow hover:shadow-2xl rounded-sm"
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 backface-hidden bg-white border-[8px] border-white shadow-lg overflow-hidden flex flex-col justify-end p-4 bg-cover bg-center"
                        style={{ backgroundImage: card.bgUrl ? `url(${card.bgUrl})` : 'none' }}
                    >
                        {!card.bgUrl && <div className="absolute inset-0 bg-amber-50 flex items-center justify-center text-amber-900/10 italic">No BG</div>}

                        {card.logoUrl && (
                            <div className="absolute top-2 left-2 w-8 h-8 bg-white/80 p-1 rounded-md shadow-sm backdrop-blur-sm border border-black/5">
                                <img src={card.logoUrl} className="w-full h-full object-contain" />
                            </div>
                        )}

                        <div className="relative z-10 text-right bg-white/40 backdrop-blur-md p-2 rounded-sm inline-self-end">
                            <span className="block text-[8px] uppercase tracking-widest font-black text-amber-900/60 leading-none mb-1">Pixel World Post</span>
                            <h3 className="text-lg font-black italic tracking-tighter text-amber-950 leading-tight">
                                {card.name || (isMine ? 'My Postcard' : card.ownerName)}
                            </h3>
                        </div>

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 backface-hidden bg-[#fffdfa] border-2 border-amber-900/10 shadow-lg p-4 flex flex-col rotate-y-180"
                        style={{ backgroundImage: 'radial-gradient(#d1d1d1 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}
                    >
                        <div className="flex justify-between border-b border-amber-900/10 pb-2 mb-2">
                            <div className="flex-1">
                                <p className="text-[10px] font-serif italic text-amber-900/70 leading-relaxed max-h-[80px] overflow-y-auto pr-2 scrollbar-hide mb-2">
                                    {card.content || '...'}
                                </p>
                                <div className="mt-auto">
                                    <span className="text-[8px] font-bold text-amber-950/40 uppercase tracking-widest">
                                        From: {card.ownerName || 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-16 border border-dashed border-amber-900/20 flex flex-col items-center justify-center p-1 text-center text-[6px] font-bold text-amber-900/20 ml-2">
                                <span className="text-lg">🕊️</span>
                                AZURE
                            </div>
                        </div>
                        <div className="mt-auto flex justify-between items-end opacity-20">
                            <div className="text-[8px] font-mono">{new Date(card.createdAt).toLocaleDateString()}</div>
                            <div className="w-16 h-0.5 bg-amber-950"></div>
                        </div>
                    </div>
                </motion.div>

                {isMine && (
                    <div className="absolute -top-3 -right-3 bg-amber-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-20 uppercase tracking-widest border-2 border-white">
                        My Card
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-8 h-8 border-4 border-amber-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-amber-900/10 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-amber-900 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-900/20 transform -rotate-3">
                        <span className="text-3xl text-white">🕊️</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-amber-950 tracking-tighter uppercase italic">{t.postcard.collection_title}</h1>
                        <p className="text-amber-900/60 font-bold tracking-widest text-xs uppercase mt-1">Archived Memories • Spring 2026 Edition</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsDesignerOpen(true)}
                        className="bg-white text-amber-900 border-2 border-amber-900/10 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-50 hover:border-amber-900/30 transition-all shadow-sm active:scale-95"
                    >
                        {t.postcard.edit_my_design}
                    </button>
                </div>
            </div>

            {/* My Design Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                    <h2 className="text-lg font-black text-amber-900 tracking-tight uppercase">My Current Design</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myDesign ? (
                        <PostcardCard card={{ ...myDesign, ownerName: 'Me', id: 'my-card' }} isMine />
                    ) : (
                        <div className="aspect-[3/2] bg-amber-50 border-2 border-dashed border-amber-900/10 rounded-xl flex flex-col items-center justify-center p-8 text-center group hover:bg-amber-100/50 transition-colors cursor-pointer" onClick={() => setIsDesignerOpen(true)}>
                            <span className="text-4xl opacity-20 group-hover:scale-110 transition-transform mb-2">🎨</span>
                            <span className="text-xs font-bold text-amber-900/40 uppercase tracking-widest">No Design Found<br />Click to Create</span>
                        </div>
                    )}

                    <div className="md:col-span-2 bg-[#e8e4da] rounded-2xl p-8 border border-amber-900/5 shadow-inner flex flex-col justify-center">
                        <div className="max-w-md space-y-4">
                            <h3 className="text-xl font-black text-amber-950 tracking-tight italic">关于我的明信片</h3>
                            <p className="text-sm text-amber-900/70 font-medium leading-relaxed">
                                这是你在像素世界中的专属名片。当你与其他玩家交换明信片时，他们将收到你当前设计的精美快照。
                                你还可以通过工位获取或在商店购买独特的模板来丰富你的设计。
                            </p>
                            <div className="flex gap-4 pt-2">
                                <div className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-bold text-amber-900/60 uppercase border border-amber-900/10">3:2 Format</div>
                                <div className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-bold text-amber-900/60 uppercase border border-amber-900/10">Shareable</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Collection Section */}
            <section className="space-y-8">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <h2 className="text-lg font-black text-amber-900 tracking-tight uppercase">Collected Cards ({collection.length})</h2>
                    </div>
                </div>

                {collection.length === 0 ? (
                    <div className="py-20 text-center bg-white/40 rounded-3xl border border-amber-900/5">
                        <div className="text-5xl mb-4 opacity-10">📭</div>
                        <p className="text-sm font-bold text-amber-900/30 uppercase tracking-widest">Your collection is empty<br />Try swapping with other players!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {collection.map(card => (
                            <PostcardCard key={card.id} card={card} />
                        ))}
                    </div>
                )}
            </section>

            {/* Footer Tip */}
            <div className="pt-12 text-center">
                <div className="inline-block px-4 py-2 bg-amber-900/5 rounded-full border border-amber-900/10">
                    <span className="text-[10px] font-bold text-amber-900/40 uppercase tracking-[0.2em] italic">
                        Azure Bluebird • Connecting the Pixel World
                    </span>
                </div>
            </div>

            {/* Modal */}
            <PostcardDesignerModal
                isOpen={isDesignerOpen}
                onClose={() => setIsDesignerOpen(false)}
                onSaveSuccess={() => {
                    fetchData();
                }}
            />

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
};

export default BluebirdCollection;
