'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Post } from '@/types/social'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'
import UserAvatar from '@/components/UserAvatar'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'

function SearchResults() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const query = searchParams.get('q') || ''
    const { config: brandConfig, isLoading: isBrandLoading } = useBrandConfig('zh-CN')
    const { t } = useTranslation()

    const [results, setResults] = useState<Post[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [searchInput, setSearchInput] = useState(query)

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('pixeldesk-blog-theme') as 'light' | 'dark'
        if (savedTheme) {
            setTheme(savedTheme)
            document.documentElement.classList.toggle('light', savedTheme === 'light')
        }
    }, [])

    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/posts?search=${encodeURIComponent(query)}&type=MARKDOWN&limit=20`)
                const data = await res.json()
                if (data.success) {
                    setResults(data.data.posts)
                }
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (query) {
            fetchResults()
        } else {
            setResults([])
            setIsLoading(false)
        }
    }, [query])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchInput.trim()) {
            router.push(`/posts/search?q=${encodeURIComponent(searchInput.trim())}`)
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return '刚刚'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
        return date.toLocaleDateString('zh-CN')
    }

    return (
        <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-950' : 'bg-slate-50'} relative`}>
            {/* Dynamic background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-20 -left-20 w-96 h-96 ${theme === 'dark' ? 'bg-purple-600/10' : 'bg-purple-600/5'} rounded-full blur-3xl`} />
                <div className={`absolute top-40 right-20 w-80 h-80 ${theme === 'dark' ? 'bg-cyan-600/10' : 'bg-cyan-600/5'} rounded-full blur-3xl`} />
                <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)]' : 'bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)]'} bg-[size:32px_32px]`} />
            </div>

            {/* Header */}
            <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
                <div className="max-w-7xl mx-auto px-4 py-2">
                    <div className="flex items-center justify-between gap-4">
                        <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer shrink-0">
                            {isBrandLoading ? <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse"></div> : <img src={brandConfig.app_logo} alt={brandConfig.app_name} className="w-8 h-8 rounded-lg object-cover" />}
                            <span className={`font-bold text-base transition-colors hidden sm:block ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{isBrandLoading ? '加载中...' : brandConfig.app_name}</span>
                        </button>

                        {/* Header Search Bar */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={t.social.blog_search_placeholder}
                                className={`w-full h-10 pl-10 pr-4 rounded-xl border transition-all text-sm outline-none ${theme === 'dark'
                                    ? 'bg-gray-800/50 border-gray-700 text-white focus:bg-gray-800 focus:border-cyan-500/50'
                                    : 'bg-slate-100 border-slate-200 text-slate-900 focus:bg-white focus:border-cyan-300'
                                    }`}
                            />
                            <svg
                                className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-slate-400 group-focus-within:text-cyan-500'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </form>

                        <div className="flex items-center space-x-2 shrink-0 text-white font-pixel">
                            {/* 占位，保持布局对齐 */}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-4xl mx-auto px-4 py-12">
                <header className="mb-12">
                    <h1 className={`text-4xl font-black mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {query ? t.social.results_for.replace('{query}', query) : t.social.search_tip}
                    </h1>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                        {t.social.total_results.replace('{count}', results.length.toString())}
                    </p>
                </header>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-cyan-500 font-pixel animate-pulse">{t.social.searching}</p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid gap-6">
                        {results.map((post) => (
                            <Link key={post.id} href={`/posts/${post.id}`}>
                                <article className={`group p-6 rounded-3xl border transition-all duration-300 transform hover:-translate-y-1 ${theme === 'dark'
                                    ? 'bg-gray-900/40 border-white/5 hover:bg-gray-900/60 hover:border-cyan-500/30'
                                    : 'bg-white border-slate-200 hover:shadow-xl hover:border-cyan-200'
                                    }`}>
                                    <div className="flex gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <UserAvatar userId={post.author.id} userName={post.author.name} userAvatar={post.author.avatar} size="xs" />
                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                                                    {post.author.name} · {formatTimeAgo(post.createdAt)}
                                                </span>
                                            </div>
                                            <h2 className={`text-xl font-bold mb-3 transition-colors group-hover:text-cyan-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {post.title || '无标题'}
                                            </h2>
                                            {post.summary && (
                                                <p className={`text-sm line-clamp-2 mb-4 leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                                                    {post.summary}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    {post.viewCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                    {post.likeCount}
                                                </span>
                                            </div>
                                        </div>
                                        {(post.coverImage || post.imageUrls?.[0]) && (
                                            <div className="hidden sm:block w-32 h-32 rounded-2xl overflow-hidden shrink-0 border border-white/5">
                                                <img
                                                    src={post.coverImage || post.imageUrls?.[0]}
                                                    alt=""
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className={`text-center py-20 rounded-3xl border border-dashed ${theme === 'dark' ? 'bg-gray-900/20 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="mb-6 text-6xl">🔍</div>
                        <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.social.search_empty_title}</h3>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>{t.social.search_empty_desc}</p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchResults />
        </Suspense>
    )
}
