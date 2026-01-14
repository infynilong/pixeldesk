'use client'

import { useState, useEffect } from 'react'

interface Book {
    id: string
    title: string
    author: string
    description?: string
    content?: string
    bookcaseId?: string
    coverUrl?: string
    createdAt: string
}

export default function LibraryManagementPage() {
    const [books, setBooks] = useState<Book[]>([])
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedBook, setSelectedBook] = useState<Book | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        content: '',
        bookcaseId: '',
        coverUrl: ''
    })

    useEffect(() => {
        fetchBooks()
    }, [])

    useEffect(() => {
        // Filter books based on search query
        if (searchQuery.trim() === '') {
            setFilteredBooks(books)
        } else {
            const query = searchQuery.toLowerCase()
            setFilteredBooks(books.filter(book =>
                book.title.toLowerCase().includes(query) ||
                book.author.toLowerCase().includes(query) ||
                book.bookcaseId?.toLowerCase().includes(query)
            ))
        }
    }, [searchQuery, books])

    const fetchBooks = async () => {
        try {
            const res = await fetch('/api/library/books')
            const data = await res.json()
            if (data.success) {
                setBooks(data.data)
                setFilteredBooks(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch books:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = selectedBook
                ? `/api/library/books/${selectedBook.id}`
                : '/api/library/books'

            const res = await fetch(url, {
                method: selectedBook ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setIsModalOpen(false)
                setSelectedBook(null)
                setFormData({ title: '', author: '', description: '', content: '', bookcaseId: '', coverUrl: '' })
                fetchBooks()
            }
        } catch (error) {
            console.error('Failed to save book:', error)
        }
    }

    const handleEdit = (book: Book) => {
        setSelectedBook(book)
        setFormData({
            title: book.title,
            author: book.author,
            description: book.description || '',
            content: book.content || '',
            bookcaseId: book.bookcaseId || '',
            coverUrl: book.coverUrl || ''
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这本书吗？')) return

        try {
            const res = await fetch(`/api/library/books/${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                fetchBooks()
            }
        } catch (error) {
            console.error('Failed to delete book:', error)
        }
    }

    const handleViewDetail = (book: Book) => {
        setSelectedBook(book)
        setIsDetailModalOpen(true)
    }

    const handleAddNew = () => {
        setSelectedBook(null)
        setFormData({ title: '', author: '', description: '', content: '', bookcaseId: '', coverUrl: '' })
        setIsModalOpen(true)
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">图书馆管理</h1>
                <button
                    onClick={handleAddNew}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    添加书籍
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="搜索书名、作者或书架编号..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
            </div>

            {loading ? (
                <div className="text-white">加载中...</div>
            ) : (
                <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">标题</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">作者</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">书架ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">创建时间</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredBooks.map((book) => (
                                <tr key={book.id} className="hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{book.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.author}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.bookcaseId || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                        {new Date(book.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => handleViewDetail(book)}
                                            className="text-blue-400 hover:text-blue-300 mr-3"
                                        >
                                            查看
                                        </button>
                                        <button
                                            onClick={() => handleEdit(book)}
                                            className="text-green-400 hover:text-green-300 mr-3"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDelete(book.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredBooks.length === 0 && (
                        <div className="p-6 text-center text-gray-400">
                            {searchQuery ? '没有找到匹配的书籍' : '暂无书籍数据'}
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Book Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-white">
                            {selectedBook ? '编辑书籍' : '添加新书'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">书名 *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">作者 *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.author}
                                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">关联书架ID</label>
                                <input
                                    type="text"
                                    value={formData.bookcaseId}
                                    onChange={e => setFormData({ ...formData, bookcaseId: e.target.value })}
                                    placeholder="留空则所有书架都可见"
                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">封面图片URL</label>
                                <input
                                    type="text"
                                    value={formData.coverUrl}
                                    onChange={e => setFormData({ ...formData, coverUrl: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">简介</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">内容全文</label>
                                <textarea
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                                    rows={8}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false)
                                        setSelectedBook(null)
                                    }}
                                    className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Book Detail Modal */}
            {isDetailModalOpen && selectedBook && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-white">{selectedBook.title}</h2>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 text-gray-300">
                            <div>
                                <span className="font-semibold text-gray-400">作者：</span>
                                <span>{selectedBook.author}</span>
                            </div>

                            {selectedBook.bookcaseId && (
                                <div>
                                    <span className="font-semibold text-gray-400">书架编号：</span>
                                    <span>{selectedBook.bookcaseId}</span>
                                </div>
                            )}

                            {selectedBook.coverUrl && (
                                <div>
                                    <span className="font-semibold text-gray-400 block mb-2">封面：</span>
                                    <img
                                        src={selectedBook.coverUrl}
                                        alt={selectedBook.title}
                                        className="w-48 h-64 object-cover rounded shadow-lg"
                                    />
                                </div>
                            )}

                            {selectedBook.description && (
                                <div>
                                    <span className="font-semibold text-gray-400 block mb-2">简介：</span>
                                    <p className="bg-gray-700 p-3 rounded">{selectedBook.description}</p>
                                </div>
                            )}

                            {selectedBook.content && (
                                <div>
                                    <span className="font-semibold text-gray-400 block mb-2">内容：</span>
                                    <div className="bg-gray-700 p-4 rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
                                        {selectedBook.content}
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-gray-500">
                                创建时间：{new Date(selectedBook.createdAt).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    handleEdit(selectedBook)
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                编辑
                            </button>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
