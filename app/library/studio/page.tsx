"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@/contexts/UserContext";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface Book {
    id: string;
    title: string;
    coverUrl: string | null;
    description: string | null;
    status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
    viewCount: number;
    likeCount: number;
    createdAt: string;
    _count: {
        chapters: number;
    };
}

export default function StudioDashboard() {
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBookTitle, setNewBookTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const res = await fetch("/api/books/my");
            const data = await res.json();
            if (data.success) {
                setBooks(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch books", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBookTitle.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch("/api/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newBookTitle, description: t.studio.no_books }),
            });
            const data = await res.json();
            if (data.success) {
                setBooks([data.data, ...books]);
                setIsModalOpen(false);
                setNewBookTitle("");
            }
        } catch (error) {
            console.error("Failed to create book", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111111] text-gray-200 p-8 font-sans selection:bg-purple-500/30">
            <header className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/" className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-white transition-colors uppercase tracking-widest">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {t.studio.back_to_station}
                        </Link>
                        <span className="text-gray-700">|</span>
                        <h1 className="text-3xl font-black text-white tracking-tight">{t.studio.title}</h1>
                    </div>
                    <p className="text-gray-500 font-mono text-sm ml-1">{t.studio.slogan}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-lg shadow-white/5 active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t.studio.new_book}
                </button>
            </header>

            {/* Book List Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                        <h3 className="text-xl font-bold text-white mb-4">{t.studio.start_writing}</h3>
                        <form onSubmit={handleCreateBook}>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.studio.book_title}</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newBookTitle}
                                    onChange={e => setNewBookTitle(e.target.value)}
                                    placeholder={t.studio.book_title_placeholder}
                                    className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                >
                                    {t.common.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newBookTitle.trim()}
                                    className="flex-1 px-4 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? t.common.loading : t.studio.create_now}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-[3/4] bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : books.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.map((book) => (
                        <Link
                            href={`/library/studio/${book.id}`}
                            key={book.id}
                            className="group relative bg-[#1a1c1e] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 block"
                        >
                            <div className="aspect-[3/4] bg-gray-800 relative overflow-hidden">
                                {book.coverUrl ? (
                                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-700 p-6 text-center">
                                        <div className="w-12 h-12 mb-3 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <span className="font-mono text-xs uppercase tracking-widest">{t.editor.preview}</span>
                                    </div>
                                )}

                                {/* Status Badge */}
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md shadow-lg
                    ${book.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                        book.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                    }
                `}>
                                    {book.status === 'PUBLISHED' ? t.studio.published :
                                        book.status === 'PENDING' ? t.studio.pending : t.studio.draft}
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-400 transition-colors">{book.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">{book.description || t.editor.description}</p>

                                <div className="flex items-center justify-between text-xs font-mono text-gray-600 pt-4 border-t border-white/5">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        {book._count.chapters} {t.studio.chapters}
                                    </span>
                                    <span>{new Date(book.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-2xl section-bg">
                    <h3 className="text-xl font-bold text-gray-300 mb-2">{t.studio.no_books}</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">{t.studio.slogan}</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-2 bg-white text-black font-semibold rounded hover:bg-gray-200"
                    >
                        {t.studio.new_book}
                    </button>
                </div>
            )}
        </div>
    );
}
