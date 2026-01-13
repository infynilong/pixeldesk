'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import NewspaperModal from './NewspaperModal'

interface LibraryModalProps {
    onClose: () => void
}

interface Book {
    id: string
    title: string
    author: string
    description?: string
    coverUrl?: string
    content?: string
    status?: string
}

interface NewsItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
}

interface NewsData {
    date: string
    news: NewsItem[]
    lang: string
    link: string
}

export default function LibraryModal({ onClose }: LibraryModalProps) {
    const { t } = useTranslation()
    const [bookcaseId, setBookcaseId] = useState<string | null>(null)
    const [books, setBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedBook, setSelectedBook] = useState<Book | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    // News State
    const [newsDataZh, setNewsDataZh] = useState<NewsData | null>(null)
    const [newsDataEn, setNewsDataEn] = useState<NewsData | null>(null)
    const [activeNewsData, setActiveNewsData] = useState<NewsData | null>(null)
    const [isNewspaperOpen, setIsNewspaperOpen] = useState(false)
    const [loadingNews, setLoadingNews] = useState(false)

    // Add Book State
    const [isAddingBook, setIsAddingBook] = useState(false)
    const [myBooks, setMyBooks] = useState<Book[]>([])
    const [loadingMyBooks, setLoadingMyBooks] = useState(false)

    // Listen for 'open-library' event
    useEffect(() => {
        const handleOpenLibrary = (event: CustomEvent) => {
            const id = event.detail.bookcaseId
            setBookcaseId(id)
            setIsVisible(true)
            setSelectedBook(null)
            setIsAddingBook(false) // Reset state
            fetchBooks(id)
            fetchNews() // Always fetch news when bookshelf opens
        }

        window.addEventListener('open-library' as any, handleOpenLibrary)

        return () => {
            window.removeEventListener('open-library' as any, handleOpenLibrary)
        }
    }, [])

    const fetchNews = async () => {
        if ((newsDataZh && newsDataEn) || loadingNews) return
        setLoadingNews(true)
        try {
            const [resZh, resEn] = await Promise.all([
                fetch('/api/news?lang=zh'),
                fetch('/api/news?lang=en')
            ])
            const [dataZh, dataEn] = await Promise.all([
                resZh.json(),
                resEn.json()
            ])

            if (dataZh.success) setNewsDataZh(dataZh.data)
            if (dataEn.success) setNewsDataEn(dataEn.data)
        } catch (error) {
            console.error('Error fetching news:', error)
        } finally {
            setLoadingNews(false)
        }
    }

    // ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                handleClose()
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isVisible])

    // Disable game input when modal is open
    useEffect(() => {
        if (typeof window !== 'undefined' && window.disableGameInput && window.enableGameInput) {
            if (isVisible) {
                window.disableGameInput()
            } else {
                window.enableGameInput()
            }
        }

        return () => {
            if (typeof window !== 'undefined' && window.enableGameInput) {
                window.enableGameInput()
            }
        }
    }, [isVisible])

    const fetchBooks = async (id: string) => {
        setLoading(true)
        try {
            let url = '/api/library/books'
            if (id) {
                url += `?bookcaseId=${id}`
            }
            const res = await fetch(url)
            const data = await res.json()
            if (data.success) {
                setBooks(data.data)
            }
        } catch (error) {
            console.error('Error fetching books:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMyBooks = async () => {
        setLoadingMyBooks(true)
        try {
            // Re-use logic: we can just fetch my books from the studio API
            // Or use the library endpoint if we add a filter
            const res = await fetch('/api/books/my') // This returns all my books
            const data = await res.json()
            if (data.success) {
                // Filter only PUBLISHED books
                const published = data.data.filter((b: any) => b.status === 'PUBLISHED')
                setMyBooks(published)
            }
        } catch (error) {
            console.error('Error fetching my books:', error)
        } finally {
            setLoadingMyBooks(false)
        }
    }

    const handlePlaceBook = async (bookId: string) => {
        if (!bookcaseId) return

        try {
            const res = await fetch('/api/library/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    bookcaseId
                })
            })

            const data = await res.json()
            if (data.success) {
                setIsAddingBook(false)
                fetchBooks(bookcaseId) // Refresh shelf
            } else {
                alert(data.error || 'Failed to place book')
            }
        } catch (error) {
            console.error('Error placing book:', error)
        }
    }

    const handleClose = () => {
        setIsVisible(false)
        setSelectedBook(null)
        setIsAddingBook(false)
        onClose && onClose()
    }

    const startReading = (book: Book) => {
        // Open the modern full-page reader
        window.open(`/library/book/${book.id}`, '_blank')
    }

    if (!isVisible) return null

    // Book Detail View
    if (selectedBook) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            >
                <div
                    className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border-8 border-amber-900"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-amber-900 text-amber-50 px-6 py-4 flex justify-between items-center">
                        <button
                            onClick={() => setSelectedBook(null)}
                            className="text-amber-200 hover:text-white flex items-center gap-2"
                        >
                            ← {t.library.backToShelf}
                        </button>
                        <button
                            onClick={handleClose}
                            className="bg-amber-800 hover:bg-amber-700 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative">
                        {/* Book Cover and Info */}
                        <div className="flex flex-col md:flex-row gap-8 mb-8">
                            <div className="flex-shrink-0 mx-auto md:mx-0">
                                <div className="relative w-48 h-64 shadow-2xl rounded-lg overflow-hidden border-2 border-amber-900/10 bg-amber-200 flex flex-col">
                                    {selectedBook.coverUrl ? (
                                        <>
                                            <img
                                                src={selectedBook.coverUrl}
                                                alt={selectedBook.title}
                                                className="absolute inset-0 w-full h-full object-cover z-10"
                                            />
                                            {/* Spine Effect */}
                                            <div className="absolute top-0 left-0 bottom-0 w-3 bg-black/30 z-20 backdrop-blur-[1px]"></div>
                                            {/* Gloss */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 z-20 pointer-events-none"></div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
                                            <span className="text-6xl">📖</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-4xl font-bold text-amber-900 mb-3">{selectedBook.title}</h1>
                                <p className="text-xl text-amber-800 mb-6">{t.library.author}: {selectedBook.author}</p>

                                {selectedBook.description && (
                                    <div className="bg-amber-100 p-4 rounded-lg border-2 border-amber-200 mb-6 text-left">
                                        <h3 className="font-bold text-amber-900 mb-2">{t.library.description}</h3>
                                        <p className="text-amber-800 leading-relaxed">{selectedBook.description}</p>
                                    </div>
                                )}

                                <button
                                    onClick={() => startReading(selectedBook)}
                                    className="bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex items-center gap-2 mx-auto md:mx-0"
                                >
                                    <span>📖</span>
                                    {t.library.startReading}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Add Book View
    if (isAddingBook) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            >
                <div
                    className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border-8 border-amber-900"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-amber-900 text-amber-50 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsAddingBook(false)}
                                className="text-amber-200 hover:text-white flex items-center gap-2"
                            >
                                ← {t.library.cancel}
                            </button>
                            <h2 className="text-xl font-bold text-white">{t.library.selectBook}</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="bg-amber-800 hover:bg-amber-700 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* My Books List */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {loadingMyBooks ? (
                            <div className="flex justify-center py-20">
                                <span className="animate-spin text-4xl">⏳</span>
                            </div>
                        ) : myBooks.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-amber-800 text-xl font-medium mb-4">{t.library.noPublishedBooks}</p>
                                <button
                                    onClick={() => window.open('/library/studio', '_blank')}
                                    className="text-amber-900 underline hover:text-amber-600"
                                >
                                    {t.library.go_studio}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {myBooks.map(book => (
                                    <div
                                        key={book.id}
                                        onClick={() => handlePlaceBook(book.id)}
                                        className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                                    >
                                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-lg border-2 border-amber-900/10 bg-amber-100 group-hover:scale-105 transition-all duration-300">
                                            {/* Book Cover */}
                                            {book.coverUrl ? (
                                                <>
                                                    <img
                                                        src={book.coverUrl}
                                                        alt={book.title}
                                                        className="absolute inset-0 w-full h-full object-cover z-10"
                                                    />
                                                    {/* Spine Overlay */}
                                                    <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-black/20 z-20"></div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-amber-500 transition-all flex items-center justify-center">
                                                    <span className="text-4xl">📖</span>
                                                </div>
                                            )}

                                            {/* Selection Overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-amber-900/30 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded shadow-lg font-bold text-sm">
                                                    {t.library.confirmPlace}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-center">
                                            <h3 className="font-bold text-amber-900 text-sm line-clamp-1">{book.title}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Bookshelf View
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border-8 border-amber-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-amber-900 text-amber-50 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            📚 {t.library.title}
                        </h2>
                        {bookcaseId && (
                            <div className="text-sm text-amber-200 mt-1 font-mono">
                                {t.library.bookcaseId}: {bookcaseId}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setIsAddingBook(true)
                                fetchMyBooks()
                            }}
                            className="bg-amber-100 hover:bg-white text-amber-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all hover:scale-105"
                        >
                            <span>➕</span> {t.library.addToShelf}
                        </button>

                        <div className="w-px h-6 bg-amber-700/50"></div>

                        <span className="text-sm bg-amber-800 px-3 py-1 rounded-full border border-amber-700/50">
                            {books.length} {t.library.books}
                        </span>
                        <button
                            onClick={handleClose}
                            className="bg-amber-800 hover:bg-amber-700 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer z-10 text-2xl font-bold ml-2"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Bookshelf Content */}
                <div className="flex-1 overflow-y-auto p-8 relative bg-amber-50 custom-scrollbar">
                    {/* Upper Tier: Books */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6 border-b-2 border-amber-900/10 pb-2">
                            <span className="text-2xl">📚</span>
                            <h3 className="text-xl font-bold text-amber-900 uppercase tracking-tight">{t.library.bookshelf}</h3>
                            <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold ml-auto uppercase">
                                Upper Tier
                            </span>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-amber-700 animate-pulse flex flex-col items-center">
                                <span className="text-3xl mb-2">📚</span>
                                {t.library.organizing}
                            </div>
                        ) : books.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center justify-center opacity-40">
                                <p className="text-amber-800 italic">{t.library.emptyShelf}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
                                {books.map(book => (
                                    <div
                                        key={book.id}
                                        onClick={() => setSelectedBook(book)}
                                        className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 flex flex-col"
                                    >
                                        <div className="relative aspect-[3/4] w-full flex flex-col">
                                            <div className="absolute top-1.5 right-[-3px] bottom-1.5 left-3 bg-white shadow-sm rounded-r-sm z-0 transform rotate-2 border-y border-r border-gray-200/30"></div>
                                            <div className="relative flex-1 z-10 rounded-sm overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-amber-900">
                                                {book.coverUrl ? (
                                                    <img
                                                        src={book.coverUrl}
                                                        alt={book.title}
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-700 to-amber-900 p-4 flex flex-col items-center justify-center">
                                                        <span className="text-amber-100 font-serif font-bold text-center leading-tight line-clamp-3">
                                                            {book.title}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="absolute top-0 left-0 bottom-0 w-[12%] bg-black/30 z-20"></div>
                                                <div className="absolute inset-0 z-30 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-center px-1">
                                            <h3 className="font-bold text-amber-900 text-sm line-clamp-1 group-hover:text-amber-700 font-serif">
                                                {book.title}
                                            </h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lower Tier: Newspaper */}
                    <div>
                        <div className="flex items-center gap-3 mb-6 border-b-2 border-amber-900/10 pb-2">
                            <span className="text-2xl">📰</span>
                            <h3 className="text-xl font-bold text-amber-900 uppercase tracking-tight">{t.library.dailyNews || '每日报纸'}</h3>
                            <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold ml-auto uppercase">
                                Lower Tier
                            </span>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-8 px-4">
                            {loadingNews ? (
                                <div className="py-10 text-amber-600 animate-pulse italic">
                                    Fetching today's headlines...
                                </div>
                            ) : (
                                <>
                                    {/* Chinese Newspaper */}
                                    {newsDataZh ? (
                                        <div
                                            onClick={() => {
                                                setActiveNewsData(newsDataZh)
                                                setIsNewspaperOpen(true)
                                            }}
                                            className="group cursor-pointer relative w-64 h-40 transform transition-all duration-500 hover:scale-110 hover:-rotate-1 active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-[#e8e4da] shadow-lg border border-gray-300 z-10 transform rotate-2 translate-x-1 translate-y-1"></div>
                                            <div className="absolute inset-0 bg-[#f4f1ea] shadow-xl border border-gray-300 z-20 flex flex-col overflow-hidden group-hover:shadow-2xl transition-shadow">
                                                <div className="p-3 border-b-2 border-[#2c2a27] bg-[#edeae1]">
                                                    <h4 className="text-[10px] font-bold text-[#2c2a27] font-serif border-b border-[#2c2a27] mb-1 pb-0.5">象素晨报 象素报社</h4>
                                                    <h5 className="text-lg font-black leading-none text-[#2c2a27] tracking-tighter uppercase" style={{ fontFamily: '"Old Standard TT", serif' }}>
                                                        象素晨报
                                                    </h5>
                                                </div>
                                                <div className="flex-1 p-3 flex gap-2">
                                                    <div className="w-12 h-12 bg-amber-900/10 border border-amber-200 flex items-center justify-center text-xs opacity-50 font-serif">ZH</div>
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <div className="h-1.5 w-full bg-[#2c2a27]/30"></div>
                                                        <div className="h-1.5 w-4/5 bg-[#2c2a27]/20"></div>
                                                        <p className="text-[8px] font-bold text-[#2c2a27] mt-1 leading-tight line-clamp-2">
                                                            {newsDataZh.news[0]?.title.substring(0, 40)}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 bg-[#2c2a27]/5 text-[7px] font-bold flex justify-between items-center border-t border-[#2c2a27]/10 italic">
                                                    <span>中文版 • Chinese Edition</span>
                                                    <span>{newsDataZh.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-amber-600/50 italic text-sm">No Chinese news delivered.</div>
                                    )}

                                    {/* English Newspaper */}
                                    {newsDataEn ? (
                                        <div
                                            onClick={() => {
                                                setActiveNewsData(newsDataEn)
                                                setIsNewspaperOpen(true)
                                            }}
                                            className="group cursor-pointer relative w-64 h-40 transform transition-all duration-500 hover:scale-110 hover:rotate-1 active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-[#e8e4da] shadow-lg border border-gray-300 z-10 transform -rotate-1 -translate-x-1 translate-y-1"></div>
                                            <div className="absolute inset-0 bg-white shadow-xl border border-gray-300 z-20 flex flex-col overflow-hidden group-hover:shadow-2xl transition-shadow">
                                                <div className="p-3 border-b-2 border-blue-900 bg-gray-50">
                                                    <h4 className="text-[10px] font-bold text-blue-900 font-serif border-b border-blue-900 mb-1 pb-0.5">THE PIXEL POST • WORLD</h4>
                                                    <h5 className="text-lg font-black leading-none text-blue-900 tracking-tighter uppercase" style={{ fontFamily: '"Old Standard TT", serif' }}>
                                                        Pixel Daily
                                                    </h5>
                                                </div>
                                                <div className="flex-1 p-3 flex gap-2">
                                                    <div className="w-12 h-12 bg-blue-900/10 border border-blue-200 flex items-center justify-center text-xs opacity-50 font-serif">EN</div>
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <div className="h-1.5 w-full bg-blue-900/30"></div>
                                                        <div className="h-1.5 w-4/5 bg-blue-900/20"></div>
                                                        <p className="text-[8px] font-bold text-blue-900 mt-1 leading-tight line-clamp-2">
                                                            {newsDataEn.news[0]?.title.substring(0, 50)}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 bg-blue-900/5 text-[7px] font-bold flex justify-between items-center border-t border-blue-900/10 italic">
                                                    <span>English Edition • BBC World</span>
                                                    <span>{newsDataEn.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-amber-600/50 italic text-sm">No English news delivered.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* News Modal Integration */}
                <NewspaperModal
                    isOpen={isNewspaperOpen}
                    onClose={() => setIsNewspaperOpen(false)}
                    newsData={activeNewsData}
                />

                <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(120, 53, 15, 0.05); /* Very light amber */
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(120, 53, 15, 0.2); /* Soft amber */
                        border-radius: 10px;
                        border: 2px solid transparent;
                        background-clip: content-box;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(120, 53, 15, 0.4);
                    }
                `}</style>
            </div>
        </div>
    )
}
