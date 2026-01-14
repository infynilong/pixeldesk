'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useUser } from '@/contexts/UserContext';

interface PostcardDesignerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess?: () => void;
}

const PostcardDesignerModal: React.FC<PostcardDesignerModalProps> = ({ isOpen, onClose, onSaveSuccess }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const [cardName, setCardName] = useState('');
    const [message, setMessage] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [bgUrl, setBgUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');

    const logoInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing design
    useEffect(() => {
        if (isOpen && user) {
            fetchDesign();
        }
    }, [isOpen, user]);

    const fetchDesign = async () => {
        try {
            const res = await fetch('/api/postcards/design');
            const data = await res.json();
            if (data.success && data.data) {
                setCardName(data.data.name || '');
                setMessage(data.data.content || '');
                setLogoUrl(data.data.logoUrl || null);
                setBgUrl(data.data.bgUrl || null);
            }
        } catch (error) {
            console.error('Failed to fetch design:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size limits: Logo 200KB, Bg 800KB
        const limit = type === 'logo' ? 200 * 1024 : 800 * 1024;
        if (file.size > limit) {
            alert(t.postcard.upload_limit_tip);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        setIsUploading(true);
        try {
            const res = await fetch('/api/postcards/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                if (type === 'logo') setLogoUrl(data.data.url);
                else setBgUrl(data.data.url);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/postcards/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: cardName,
                    content: message,
                    logoUrl,
                    bgUrl
                })
            });
            const data = await res.json();
            if (data.success) {
                onSaveSuccess?.();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublishToShop = async () => {
        if (!window.confirm('确认要将此设计作为模板发布至商店吗？发布后无法撤回。')) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/postcards/templates/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: 10 })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Publish failed');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[#f4f1ea] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-900/10 flex flex-col md:flex-row h-[90vh] md:h-auto"
                >
                    {/* Left: Preview (Postcard Card) */}
                    <div className="flex-1 p-8 bg-[#e8e4da] flex flex-col items-center justify-center space-y-6 relative border-r border-amber-900/10">
                        <div className="flex gap-4 mb-2">
                            <button
                                onClick={() => setActiveTab('front')}
                                className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'front' ? 'bg-amber-800 text-white shadow-md' : 'bg-amber-200/50 text-amber-900 hover:bg-amber-200'}`}
                            >
                                Front
                            </button>
                            <button
                                onClick={() => setActiveTab('back')}
                                className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'back' ? 'bg-amber-800 text-white shadow-md' : 'bg-amber-200/50 text-amber-900 hover:bg-amber-200'}`}
                            >
                                Back
                            </button>
                        </div>

                        {/* 3:2 Card Preview */}
                        <motion.div
                            layout
                            className="relative w-full aspect-[3/2] max-w-[500px] bg-white shadow-2xl rounded-sm overflow-hidden border-[12px] border-white group"
                            style={{
                                backgroundImage: activeTab === 'front' && bgUrl ? `url(${bgUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {activeTab === 'front' ? (
                                <>
                                    {!bgUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center text-amber-900/20 italic font-serif">
                                            No Background
                                        </div>
                                    )}
                                    {/* Logo Overlay */}
                                    {logoUrl && (
                                        <div className="absolute top-4 left-4 w-12 h-12 bg-white/80 p-1 rounded-md shadow-sm border border-amber-900/5 backdrop-blur-sm">
                                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    {/* Name Overlay */}
                                    <div className="absolute bottom-6 right-8 text-right">
                                        <span className="block text-xs uppercase tracking-[0.2em] font-bold text-amber-900/60 mb-1">Pixel World Post</span>
                                        <h2 className="text-2xl font-black italic tracking-tighter text-amber-950 px-2 bg-white/40 backdrop-blur-md rounded">
                                            {cardName || 'YOUR NAME HERE'}
                                        </h2>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-[#fffdfa] p-6 flex flex-col border-2 border-amber-900/5">
                                    <div className="flex justify-between border-b border-amber-900/10 pb-4 mb-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="h-px w-full bg-amber-900/10"></div>
                                            <div className="h-px w-full bg-amber-900/10"></div>
                                            <div className="h-px w-2/3 bg-amber-900/10"></div>
                                            <p className="text-sm font-serif italic text-amber-900/80 leading-relaxed whitespace-pre-wrap mt-4">
                                                {message || 'Type your message on the right...'}
                                            </p>
                                        </div>
                                        {/* Stamp Placeholder */}
                                        <div className="w-20 h-24 border-2 border-dashed border-amber-900/30 flex flex-col items-center justify-center p-2 text-center text-[10px] font-bold text-amber-900/20 ml-6 shrink-0">
                                            <span className="text-2xl mb-1">🕊️</span>
                                            AZURE BLUEBIRD
                                        </div>
                                    </div>
                                    <div className="mt-auto self-end flex flex-col items-end opacity-20">
                                        <div className="text-[10px] font-mono tracking-widest">AZUREBLUEBIRD-2026-PC</div>
                                        <div className="w-48 h-1 bg-amber-950 mt-1"></div>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        <p className="text-[10px] text-amber-900/40 uppercase font-black tracking-widest italic pt-4">
                            3:2 Ratio Standard Postcard Format
                        </p>
                    </div>

                    {/* Right: Controls */}
                    <div className="w-full md:w-[380px] p-8 flex flex-col bg-white overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-amber-950 tracking-tighter uppercase italic">{t.postcard.designer}</h2>
                            <button onClick={onClose} className="p-2 hover:bg-amber-50 rounded-full transition-colors">
                                <span className="text-2xl">✕</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Name Input */}
                            <div>
                                <label className="block text-xs font-bold text-amber-900/60 uppercase tracking-widest mb-2">{t.postcard.edit_name}</label>
                                <input
                                    type="text"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                    placeholder="Enter your card name..."
                                    className="w-full bg-amber-50/50 border-2 border-amber-900/5 px-4 py-3 rounded-xl focus:outline-none focus:border-amber-900/20 text-amber-900 font-bold transition-all"
                                />
                            </div>

                            {/* Message Input */}
                            <div>
                                <label className="block text-xs font-bold text-amber-900/60 uppercase tracking-widest mb-2">{t.postcard.edit_content}</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Share a message on the back..."
                                    className="w-full bg-amber-50/50 border-2 border-amber-900/5 px-4 py-3 rounded-xl focus:outline-none focus:border-amber-900/20 text-amber-900 font-medium h-32 resize-none transition-all"
                                />
                            </div>

                            {/* Upload Buttons */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => logoInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center p-4 bg-amber-50/80 rounded-2xl border-2 border-dashed border-amber-900/10 hover:border-amber-900/30 hover:bg-amber-100/50 transition-all group"
                                >
                                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏷️</span>
                                    <span className="text-[10px] font-bold text-amber-900/60 uppercase">{t.postcard.upload_logo}</span>
                                </button>
                                <button
                                    onClick={() => bgInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center p-4 bg-amber-50/80 rounded-2xl border-2 border-dashed border-amber-900/10 hover:border-amber-900/30 hover:bg-amber-100/50 transition-all group"
                                >
                                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                                    <span className="text-[10px] font-bold text-amber-900/60 uppercase">{t.postcard.upload_bg}</span>
                                </button>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                                <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                            </div>

                            <p className="text-[10px] text-amber-900/40 text-center leading-relaxed">
                                {t.postcard.upload_limit_tip}
                            </p>

                            <div className="pt-6 space-y-3">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isUploading}
                                    className={`w-full bg-amber-900 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-900/20 hover:bg-amber-950 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving ? 'Saving...' : (
                                        <>
                                            <span>💾</span> {t.postcard.save_design}
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handlePublishToShop}
                                    disabled={isSaving || isUploading}
                                    className="w-full bg-white text-amber-900 border-2 border-amber-900/10 font-black py-4 rounded-2xl hover:bg-amber-50 active:scale-95 transition-all text-sm uppercase tracking-widest flex flex-col items-center justify-center gap-0.5"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🏪</span> {t.postcard.upload_to_shop}
                                    </div>
                                    <span className="text-[8px] opacity-60 normal-case font-bold">{t.postcard.upload_reward_tip.replace('{points}', '50')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 text-[9px] font-bold text-center text-amber-900/30 uppercase tracking-[0.2em]">
                            Azure Bluebird Design System v1.0
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PostcardDesignerModal;
