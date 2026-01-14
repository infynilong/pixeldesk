'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/hooks/useTranslation';
import PostcardDesignerModal from './PostcardDesignerModal';
import PostcardCard, { PostcardData } from './PostcardCard';

interface Postcard extends PostcardData {
    id: string;
    ownerName: string;
    createdAt: string;
    postcardOwnerId: string;
}

const BluebirdCollection: React.FC = () => {
    const { t } = useTranslation();
    const router = useRouter();
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

    const handleDelete = async (id: string) => {
        if (!confirm(t.postcard?.confirm_delete || 'Are you sure you want to remove this postcard from your collection?')) return;

        try {
            const res = await fetch(`/api/postcards/collection/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                // Optimistic update
                setCollection(prev => prev.filter(c => c.id !== id));
            } else {
                alert(data.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete');
        }
    };



    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-8 h-8 border-4 border-cyan-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-cyan-900/10 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-cyan-800 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-900/20 transform -rotate-3">
                        <span className="text-3xl text-white">🕊️</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-cyan-950 tracking-tighter uppercase italic">{t.postcard.collection_title}</h1>
                        <p className="text-cyan-900/60 font-bold tracking-widest text-xs uppercase mt-1">Archived Memories • Spring 2026 Edition</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsDesignerOpen(true)}
                        className="bg-white text-cyan-900 border-2 border-cyan-900/10 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-cyan-50 hover:border-cyan-900/30 transition-all shadow-sm active:scale-95"
                    >
                        {t.postcard.edit_my_design}
                    </button>
                </div>
            </div>

            {/* My Design Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-cyan-600 rounded-full animate-pulse"></div>
                    <h2 className="text-lg font-black text-cyan-900 tracking-tight uppercase">{t.postcard?.current_design || 'My Current Design'}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myDesign ? (
                        <PostcardCard
                            card={{ ...myDesign, ownerName: 'Me', id: 'my-card' }}
                            isMine
                            isFlipped={flippedCards['my-card'] || false}
                            onFlip={() => toggleFlip('my-card')}
                            onMouseEnter={() => setFlippedCards(prev => ({ ...prev, 'my-card': true }))}
                            onMouseLeave={() => setFlippedCards(prev => ({ ...prev, 'my-card': false }))}
                        />
                    ) : (
                        <div className="aspect-[3/2] bg-cyan-50 border-2 border-dashed border-cyan-900/10 rounded-xl flex flex-col items-center justify-center p-8 text-center group hover:bg-cyan-100/50 transition-colors cursor-pointer" onClick={() => setIsDesignerOpen(true)}>
                            <span className="text-4xl opacity-20 group-hover:scale-110 transition-transform mb-2">🎨</span>
                            <span className="text-xs font-bold text-cyan-900/40 uppercase tracking-widest">{t.postcard?.no_design_found || 'No Design Found'}<br />{t.postcard?.click_to_create || 'Click to Create'}</span>
                        </div>
                    )}

                    <div className="md:col-span-2 bg-[#d7e9f7] rounded-2xl p-8 border border-cyan-900/5 shadow-inner flex flex-col justify-center">
                        <div className="max-w-md space-y-4">
                            <h3 className="text-xl font-black text-cyan-950 tracking-tight italic">{t.postcard?.about_intro_title || 'About My Postcard'}</h3>
                            <p className="text-sm text-cyan-900/70 font-medium leading-relaxed">
                                {t.postcard?.about_intro_desc || 'This is your exclusive business card in the pixel world.'}
                            </p>
                            <div className="flex gap-4 pt-2">
                                <div className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-bold text-cyan-900/60 uppercase border border-cyan-900/10">3:2 Format</div>
                                <div className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-bold text-cyan-900/60 uppercase border border-cyan-900/10">Shareable</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Collection Section */}
            <section className="space-y-8">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        <h2 className="text-lg font-black text-cyan-900 tracking-tight uppercase">{(t.postcard?.collected_cards_title || 'Collected Cards ({count})').replace('{count}', collection.length.toString())}</h2>
                    </div>
                </div>

                {collection.length === 0 ? (
                    <div className="py-20 text-center bg-white/40 rounded-3xl border border-cyan-900/5">
                        <div className="text-5xl mb-4 opacity-10">📭</div>
                        <p className="text-sm font-bold text-cyan-900/30 uppercase tracking-widest">{t.postcard?.empty_collection_title || 'Collection Empty'}<br />{t.postcard?.empty_collection_desc || 'Try swapping with other players!'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {collection.map(card => (
                            <PostcardCard
                                key={card.id}
                                card={{
                                    ...card,
                                    ownerId: card.postcardOwnerId
                                }}
                                isFlipped={flippedCards[card.id] || false}
                                onFlip={() => window.open(`/profile/${card.postcardOwnerId}`, '_blank')}
                                onDelete={() => handleDelete(card.id)}
                                onMouseEnter={() => setFlippedCards(prev => ({ ...prev, [card.id]: true }))}
                                onMouseLeave={() => setFlippedCards(prev => ({ ...prev, [card.id]: false }))}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Footer Tip */}
            <div className="pt-12 text-center">
                <div className="inline-block px-4 py-2 bg-cyan-900/5 rounded-full border border-cyan-900/10">
                    <span className="text-[10px] font-bold text-cyan-900/40 uppercase tracking-[0.2em] italic">
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
                /* Removed duplicate styles now handled in PostcardCard.tsx */
            `}</style>
        </div>
    );
};

export default BluebirdCollection;
