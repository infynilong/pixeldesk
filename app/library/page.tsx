"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Book {
    id: string;
    title: string;
    coverUrl: string | null;
    description: string | null;
    user: {
        id: string;
        name: string;
        avatar: string | null;
    };
    _count: {
        chapters: number;
    };
    publishedAt: string;
}

export default function LibraryHall() {
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const res = await fetch("/api/books"); // fetches public books
            const data = await res.json();
            if (data.success) {
                setBooks(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch library books");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-purple-500/30">

            {/* Hero Header */}
            <header className="relative h-[40vh] overflow-hidden flex items-center justify-center border-b border-white/5">
                <div className="absolute inset-0 bg-[url('/assets/library-bg.jpg')] bg-cover bg-center opacity-20 blur-sm scale-105"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]"></div>

                <div className="relative z-10 text-center max-w-2xl px-6">
                    <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <span className="text-[10px] uppercase tracking-widest font-black text-purple-300">PixelDesk 图书馆</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                        发现新思潮
                    </h1>
                    <p className="text-lg text-gray-400 font-medium leading-relaxed">
                        探索社区发布的精选书籍、深度文章与收藏集。
                    </p>

                    <div className="mt-8 flex items-center justify-center gap-4">
                        <Link href="/" className="px-6 py-3 bg-white/5 text-white font-bold uppercase tracking-wide text-sm rounded-full hover:bg-white/10 transition-all border border-white/10">
                            返回首页
                        </Link>
                        <Link href="/library/studio" className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide text-sm rounded-full hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                            进入创作工作室
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-6 py-16">

                <div className="flex items-end justify-between mb-12 border-b border-white/5 pb-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="w-1 h-8 bg-purple-500 rounded-full block"></span>
                        最新上架
                    </h2>
                    {/* Filter Tabs Mockup */}
                    <div className="flex gap-6 text-sm font-medium text-gray-500">
                        <button className="text-white border-b-2 border-purple-500 pb-2 -mb-2.5 transition-colors">最新发布</button>
                        <button className="hover:text-gray-300 transition-colors">热门排行</button>
                        <button className="hover:text-gray-300 transition-colors">编辑精选</button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="space-y-4">
                                <div className="aspect-[2/3] bg-white/5 rounded-lg animate-pulse" />
                                <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12">
                        {books.map(book => (
                            <Link href={`/library/book/${book.id}`} key={book.id} className="group block perspective-1000">
                                {/* Book Cover 3D Effect */}
                                <div className="relative aspect-[2/3] mb-5 bg-gray-800 rounded-r-lg shadow-2xl transition-transform duration-500 group-hover:-translate-y-4 group-hover:rotate-y-[-10deg] transform-style-3d">
                                    {book.coverUrl ? (
                                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover rounded-r-lg" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 border-l-4 border-white/10 p-4 text-center">
                                            <div className="w-12 h-12 mb-2 opacity-20 bg-white rounded-full"></div>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-600">Pixel Press</span>
                                            <h3 className="mt-4 text-sm font-black text-gray-500 line-clamp-3">{book.title}</h3>
                                        </div>
                                    )}

                                    {/* Spine Shadow Effect */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/40 to-transparent z-10"></div>
                                    {/* Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-r-lg"></div>
                                </div>

                                {/* Book Info */}
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-white leading-tight line-clamp-2 group-hover:text-purple-400 transition-colors">{book.title}</h3>
                                    <div className="flex items-center gap-2">
                                        {book.user.avatar ? (
                                            <img src={book.user.avatar} className="w-4 h-4 rounded-full" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full bg-gray-700"></div>
                                        )}
                                        <span className="text-xs text-gray-500 hover:text-gray-300 transition-colors truncate">{book.user.name}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
