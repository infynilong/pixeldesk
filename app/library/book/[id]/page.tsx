"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from 'react-markdown';

interface Chapter {
    id: string;
    title: string;
    type: "TEXT" | "LINK" | "POST";
    content: string | null;
    linkUrl: string | null;
    order: number;
}

interface Book {
    id: string;
    title: string;
    description: string;
    user: {
        name: string;
    };
    chapters: Chapter[];
}

export default function BookReader() {
    const { id } = useParams();
    const [book, setBook] = useState<Book | null>(null);
    const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) fetchBook();
    }, [id]);

    const fetchBook = async () => {
        try {
            const res = await fetch(`/api/books/${id}`);
            const data = await res.json();
            if (data.success) {
                setBook(data.data);
                if (data.data.chapters.length > 0) {
                    setActiveChapter(data.data.chapters[0]);
                }
            }
        } catch (error) {
            console.error("Failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (!book && !isLoading) return <div>未找到书籍</div>;

    return (
        <div className="flex bg-[#fcfbf9] min-h-screen text-gray-900 font-serif">
            {/* ToC Sidebar */}
            <aside className="w-80 bg-[#f5f4f1] border-r border-[#e0deda] h-screen sticky top-0 overflow-y-auto flex flex-col">
                <div className="p-8 border-b border-[#e0deda]">
                    <Link href="/library" className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-6 hover:text-black transition-colors">← 返回图书馆</Link>
                    <h1 className="text-2xl font-black leading-tight mb-2">{book?.title}</h1>
                    <p className="text-sm italic text-gray-500 font-sans">作者 {book?.user.name}</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {book?.chapters.map((chapter, i) => (
                        <button
                            key={chapter.id}
                            onClick={() => setActiveChapter(chapter)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors font-sans
                        ${activeChapter?.id === chapter.id
                                    ? 'bg-white shadow-sm font-bold text-black border border-black/5'
                                    : 'text-gray-600 hover:bg-black/5'
                                }
                     `}
                        >
                            <span className="opacity-40 mr-3 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                            {chapter.title}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Reading Area */}
            <main className="flex-1 overflow-y-auto">
                {activeChapter ? (
                    <div className="max-w-3xl mx-auto py-20 px-10">
                        <header className="mb-12 border-b border-gray-100 pb-8">
                            <h2 className="text-4xl font-bold mb-4">{activeChapter.title}</h2>
                        </header>

                        <div className="prose prose-lg prose-stone max-w-none">
                            {activeChapter.type === 'TEXT' && (
                                <ReactMarkdown>{activeChapter.content || "*暂无内容*"}</ReactMarkdown>
                            )}

                            {activeChapter.type === 'LINK' && (
                                <div className="p-8 bg-gray-100 rounded-xl text-center border border-gray-200">
                                    <p className="font-sans text-gray-500 mb-4 text-sm uppercase tracking-wide">外部资源链接</p>
                                    <a href={activeChapter.linkUrl || "#"} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 bg-black text-white font-sans font-bold rounded-lg hover:scale-105 transition-transform shadow-xl">
                                        访问链接 ↗
                                    </a>
                                    <p className="mt-4 text-xs font-sans text-gray-400 truncate">{activeChapter.linkUrl}</p>
                                </div>
                            )}

                            {/* Future: POST type rendering */}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 font-sans">
                        请选择左侧章节开始阅读
                    </div>
                )}
            </main>
        </div>
    );
}
