"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface Chapter {
    id: string;
    title: string;
    type: "TEXT" | "LINK" | "POST";
    order: number;
}

interface Book {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    status: string;
    category: string;
    chapters: Chapter[];
}

export default function BookEditor() {
    const { id } = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useTranslation();

    // Form states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [coverUrl, setCoverUrl] = useState("");

    const { userId } = useCurrentUser();
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [myPosts, setMyPosts] = useState<any[]>([]);
    const [isFetchingPosts, setIsFetchingPosts] = useState(false);

    useEffect(() => {
        if (id) fetchBook();
    }, [id]);

    const fetchBook = async () => {
        try {
            const res = await fetch(`/api/books/${id}`);
            const data = await res.json();
            if (data.success) {
                setBook(data.data);
                setTitle(data.data.title);
                setDescription(data.data.description || "");
                setCategory(data.data.category || "");
                setCoverUrl(data.data.coverUrl || "");
            }
        } catch (error) {
            console.error("Failed to fetch book");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMeta = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/books/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, category, coverUrl }),
            });
            // Refresh
            fetchBook();
        } catch (error) {
            console.error("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddChapter = async (type: "TEXT" | "LINK" | "POST") => {
        if (type === "POST") {
            handleOpenPostModal();
            return;
        }
        const chapterTitle = prompt("Chapter Title:");
        if (!chapterTitle) return;

        let content = "";
        let linkUrl = "";

        if (type === "LINK") {
            linkUrl = prompt("External Link URL:") || "";
        } else if (type === "TEXT") {
            content = "Write your content here...";
        }

        try {
            await fetch(`/api/books/${id}/chapters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: chapterTitle, type, content, linkUrl }),
            });
            fetchBook();
        } catch (error) {
            console.error("Failed to add chapter");
        }
    };

    const handleDeleteChapter = async (chapterId: string) => {
        if (!confirm("Delete this chapter?")) return;
        try {
            await fetch(`/api/books/${id}/chapters/${chapterId}`, {
                method: "DELETE"
            });
            fetchBook();
        } catch (e) { console.error(e) }
    }

    const handlePublishToggle = async () => {
        if (!confirm(`Are you sure you want to ${book?.status === 'PUBLISHED' ? 'unpublish' : 'publish'} this book?`)) return;
        try {
            await fetch(`/api/books/${id}/publish`, { method: "POST" });
            fetchBook();
        } catch (e) { console.error(e) }
    }

    const handleOpenPostModal = async () => {
        if (!userId) {
            alert(t.social.login_required);
            return;
        }
        setIsPostModalOpen(true);
        setIsFetchingPosts(true);
        try {
            const res = await fetch(`/api/posts?authorId=${userId}&type=MARKDOWN&limit=50`);
            const data = await res.json();
            if (data.success) {
                setMyPosts(data.data.posts);
            }
        } catch (e) {
            console.error("Failed to fetch my posts", e);
        } finally {
            setIsFetchingPosts(false);
        }
    };

    const handleSelectPost = async (post: any) => {
        try {
            const chapterTitle = post.title || post.content.slice(0, 30) + (post.content.length > 30 ? "..." : "");
            await fetch(`/api/books/${id}/chapters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: chapterTitle,
                    type: "POST",
                    postId: post.id
                }),
            });
            setIsPostModalOpen(false);
            fetchBook();
        } catch (error) {
            console.error("Failed to add post chapter");
        }
    };

    if (isLoading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Loading Studio...</div>;
    if (!book) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Book not found</div>;

    return (
        <div className="min-h-screen bg-[#111] text-gray-200 flex">
            {/* Sidebar: Navigation & Settings */}
            <aside className="w-80 bg-[#161616] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-10 scrollbar-hide">
                <div className="p-6 border-b border-white/5">
                    <Link href="/library/studio" className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-white transition-colors uppercase tracking-widest mb-6 group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        {t.editor.back_to_studio}
                    </Link>
                    <h1 className="text-xl font-bold text-white mb-2 truncate" title={book.title}>{book.title}</h1>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${book.status === 'PUBLISHED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></span>
                        <span className="text-xs uppercase tracking-wider text-gray-500 font-mono">
                            {book.status === 'PUBLISHED' ? t.common.published : book.status === 'PENDING' ? t.common.pending_review : t.common.draft}
                        </span>
                    </div>
                </div>

                <div className="p-6 space-y-6 flex-1">
                    {/* Meta Edit Section */}
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.editor.metadata}</label>
                            {isSaving && <span className="text-xs text-purple-400 animate-pulse">{t.common.saving}</span>}
                        </div>

                        <div>
                            <span className="text-xs text-gray-500 mb-1.5 block">{t.studio.book_title} Title</span>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[#222] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:bg-[#2a2a2a] transition-all"
                            />
                        </div>

                        <div>
                            <span className="text-xs text-gray-500 mb-1.5 block">{t.editor.description} Description</span>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-[#222] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:bg-[#2a2a2a] transition-all resize-none"
                            />
                        </div>

                        <div>
                            <span className="text-xs text-gray-500 mb-1.5 block">{t.editor.cover_url} URL</span>
                            <input
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-[#222] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:bg-[#2a2a2a] transition-all"
                            />
                            {/* Cover Preview */}
                            <div className="mt-3 relative aspect-[2/1] bg-black/40 rounded-lg border border-white/5 overflow-hidden group">
                                {coverUrl ? (
                                    <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] font-mono uppercase tracking-tighter">
                                        {t.editor.preview}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveMeta}
                            disabled={isSaving}
                            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] border border-white/5 text-gray-300 hover:text-white"
                        >
                            {isSaving ? t.common.saving : t.editor.save_changes}
                        </button>
                    </div>

                    <div className="border-t border-white/5 my-2"></div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handlePublishToggle}
                            className={`w-full py-3 font-bold text-sm uppercase tracking-wide rounded-lg transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${book.status === 'PUBLISHED'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                                }`}
                        >
                            {book.status === 'PUBLISHED' ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    {t.editor.unpublish}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    {t.editor.publish}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content: Chapter Management */}
            <main className="ml-80 flex-1 p-10 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{t.editor.toc}</h2>
                        <p className="text-gray-500 mt-1 text-sm">{t.editor.toc_desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                        <button onClick={() => handleAddChapter("TEXT")} className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:border-white/30 text-gray-300">
                            + {t.editor.add_text}
                        </button>
                        <button onClick={() => handleAddChapter("LINK")} className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:border-white/30 text-gray-300">
                            + {t.editor.add_link}
                        </button>
                        <button onClick={() => handleAddChapter("POST")} className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:border-white/30 text-gray-300">
                            + {t.editor.add_post}
                        </button>
                    </div>
                </div>

                {/* Chapter List */}
                <div className="space-y-3">
                    {book.chapters.length > 0 ? book.chapters.map((chapter, index) => (
                        <div key={chapter.id} className="group bg-[#1a1c1e] border border-white/5 p-4 rounded-xl flex items-center gap-5 hover:border-white/10 transition-all hover:bg-[#222]">
                            <div className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-lg text-gray-600 font-mono text-sm font-bold border border-white/5">
                                {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-200 truncate pr-4">{chapter.title}</h3>
                                <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-1.5 uppercase tracking-wider font-mono">
                                    <span className={`px-1.5 py-0.5 rounded border ${chapter.type === 'LINK' ? 'bg-blue-500/5 text-blue-400 border-blue-500/10' :
                                        chapter.type === 'POST' ? 'bg-purple-500/5 text-purple-400 border-purple-500/10' :
                                            'bg-gray-500/5 text-gray-400 border-gray-500/10'
                                        }`}>{chapter.type}</span>
                                    <span>ID: {chapter.id.slice(-6)}</span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                <button className="p-2.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/5" title={t.editor.edit_content}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteChapter(chapter.id)} className="p-2.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/10" title={t.editor.delete_chapter}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </div>
                            <p className="text-gray-400 font-medium">{t.editor.no_chapters}</p>
                            <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">{t.editor.start_editing}</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Post Selection Modal */}
            {isPostModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsPostModalOpen(false)}></div>
                    <div className="relative bg-[#161616] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                                {t.editor.select_blog}
                            </h3>
                            <button onClick={() => setIsPostModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {isFetchingPosts ? (
                                <div className="py-20 text-center text-gray-500 animate-pulse font-mono tracking-widest text-xs uppercase">{t.editor.fetching_blogs}</div>
                            ) : myPosts.length > 0 ? (
                                myPosts.map(post => (
                                    <div
                                        key={post.id}
                                        onClick={() => handleSelectPost(post)}
                                        className="group bg-[#222] border border-white/5 p-4 rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-[#2a2a2a] transition-all flex items-start gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold mb-1 truncate group-hover:text-purple-400 transition-colors">
                                                {post.title || t.editor.no_blogs}
                                            </h4>
                                            <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                                                {post.content}
                                            </p>
                                            <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-700 font-mono">
                                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
                                                <span className="uppercase text-purple-400">BLOG</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-gray-600 group-hover:bg-purple-500/10 group-hover:text-purple-400 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center bg-black/20 rounded-xl border border-dashed border-white/5">
                                    <p className="text-gray-500 text-sm">{t.editor.no_blogs}</p>
                                    <Link href="/" className="text-[10px] text-purple-400 hover:underline mt-2 inline-block uppercase font-bold tracking-widest">{t.editor.go_post_blog}</Link>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-black/20 border-t border-white/5 text-center">
                            <p className="text-[10px] text-gray-600 font-mono tracking-tight grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                                {t.editor.select_instruction}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
