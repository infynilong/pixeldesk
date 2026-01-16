'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'

import { useTranslation } from '@/lib/hooks/useTranslation'

interface ClassicMarkdownEditorProps {
    value: string
    onChange: (value: string) => void
    onImageUpload?: (url: string) => void
    placeholder?: string
    height?: number
}

export default function ClassicMarkdownEditor({
    value,
    onChange,
    onImageUpload,
    placeholder = "开始创作...",
    height = 500
}: ClassicMarkdownEditorProps) {
    const { t } = useTranslation()
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('split')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 插入特定文字到光标位置
    const insertText = (before: string, after: string = '', defaultText: string = '') => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end) || defaultText
        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)

        onChange(newText)

        // 重新设置焦点和光标位置
        setTimeout(() => {
            textarea.focus()
            const newCursorPos = start + before.length + selectedText.length + after.length
            textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
    }

    // 处理文件上传
    const uploadFile = async (file: File) => {
        // 限制 500KB
        const maxSize = 500 * 1024
        if (file.size > maxSize) {
            const sizeKB = Math.round(file.size / 1024)
            const maxMB = (maxSize / (1024 * 1024)).toFixed(1)
            setUploadError(
                (t.common.upload as any).err_size_limit
                    .replace('{size}', sizeKB.toString())
                    .replace('{max}', maxMB)
            )
            return
        }

        setIsUploading(true)
        setUploadError('')

        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'blog')

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (data.success) {
                insertText(`\n![${file.name}](${data.url})\n`, '')
                onImageUpload?.(data.url)
            } else {
                setUploadError(data.error || (t.common.upload as any).err_failed)
            }
        } catch (err) {
            setUploadError((t.common.upload as any).err_failed)
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadFile(file)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // 拖拽上传
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) {
            uploadFile(file)
        }
    }

    // 粘贴上传
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    e.preventDefault()
                    uploadFile(file)
                }
            }
        }
    }

    // 快捷键支持
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
                e.preventDefault()
                insertText('**', '**', '粗体文字')
            } else if (e.key === 'i') {
                e.preventDefault()
                insertText('_', '_', '斜体文字')
            } else if (e.key === 'k') {
                e.preventDefault()
                insertText('[', '](url)', '链接文字')
            } else if (e.key === 'q') {
                e.preventDefault()
                insertText('> ', '', '引用文字')
            }
        }
    }

    // 禁用游戏键盘
    useEffect(() => {
        const handleFocus = () => {
            if ((window as any).disableGameKeyboard) (window as any).disableGameKeyboard()
        }
        const handleBlur = () => {
            if ((window as any).enableGameKeyboard) (window as any).enableGameKeyboard()
        }

        const textarea = textareaRef.current
        if (textarea) {
            textarea.addEventListener('focus', handleFocus)
            textarea.addEventListener('blur', handleBlur)
        }

        return () => {
            if (textarea) {
                textarea.removeEventListener('focus', handleFocus)
                textarea.removeEventListener('blur', handleBlur)
            }
        }
    }, [])

    return (
        <div className="flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
            {/* 工具栏 */}
            <div className="flex flex-wrap items-center justify-between px-2 py-1.5 bg-white/5 border-b border-white/5 gap-1">
                <div className="flex flex-wrap items-center gap-0.5">
                    <ToolbarButton icon={<BoldIcon />} onClick={() => insertText('**', '**', '加粗')} title="加粗 (Cmd+B)" />
                    <ToolbarButton icon={<ItalicIcon />} onClick={() => insertText('_', '_', '斜体')} title="斜体 (Cmd+I)" />
                    <ToolbarButton icon={<StrikeIcon />} onClick={() => insertText('~~', '~~', '删除线')} title="删除线" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon="H1" onClick={() => insertText('# ', '', '标题')} title="一级标题" />
                    <ToolbarButton icon="H2" onClick={() => insertText('## ', '', '标题')} title="二级标题" />
                    <ToolbarButton icon="H3" onClick={() => insertText('### ', '', '标题')} title="三级标题" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<QuoteIcon />} onClick={() => insertText('> ', '', '引用')} title="引用 (Cmd+Q)" />
                    <ToolbarButton icon={<CodeIcon />} onClick={() => insertText('`', '`', '代码')} title="行内代码" />
                    <ToolbarButton icon={<CodeBlockIcon />} onClick={() => insertText('```\n', '\n```', '代码块')} title="代码块" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<ListUnorderedIcon />} onClick={() => insertText('- ', '', '列表项')} title="无序列表" />
                    <ToolbarButton icon={<ListOrderedIcon />} onClick={() => insertText('1. ', '', '列表项')} title="有序列表" />
                    <ToolbarButton icon={<TableIcon />} onClick={() => insertText('| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |', '')} title="插入表格" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<LinkIcon />} onClick={() => insertText('[', '](url)', '链接')} title="链接 (Cmd+K)" />
                    <ToolbarButton
                        icon={isUploading ? <LoadingIcon /> : <ImageIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        title="上传图片 (最大 500KB，支持拖拽和粘贴)"
                        disabled={isUploading}
                        className={isUploading ? "animate-pulse" : ""}
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <ToolbarButton icon={<HRIcon />} onClick={() => insertText('\n---\n', '')} title="分割线" />
                </div>

                <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 ml-auto">
                    <ViewButton active={viewMode === 'editor'} onClick={() => setViewMode('editor')}>编辑</ViewButton>
                    <ViewButton active={viewMode === 'split'} onClick={() => setViewMode('split')}>分屏</ViewButton>
                    <ViewButton active={viewMode === 'preview'} onClick={() => setViewMode('preview')}>预览</ViewButton>
                </div>
            </div>

            {uploadError && (
                <div className="px-4 py-1.5 bg-red-500/20 text-red-400 text-[10px] font-pixel border-b border-red-500/20 flex items-center justify-between">
                    <span>⚠️ {uploadError}</span>
                    <button onClick={() => setUploadError('')} className="hover:text-white">✕</button>
                </div>
            )}

            {/* 内容区 */}
            <div
                className="flex overflow-hidden"
                style={{ height: `${height}px` }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                {/* 编辑器 */}
                {(viewMode === 'editor' || viewMode === 'split') && (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        className={`flex-1 bg-transparent text-white/90 p-8 focus:outline-none resize-none font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-white/10 ${viewMode === 'split' ? 'border-r border-white/5' : ''}`}
                    />
                )}

                {/* 预览 */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className="flex-1 bg-black/20 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 preview-container">
                        <div className="prose prose-invert prose-sm max-w-none 
                            [&_p]:my-6 [&_p]:leading-7 
                            [&_h1]:mt-8 [&_h1]:mb-4 
                            [&_h2]:mt-6 [&_h2]:mb-4 
                            [&_h3]:mt-6 [&_h3]:mb-2 
                            [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 
                            [&_img]:rounded-xl [&_img]:my-4
                            prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeRaw, rehypeHighlight]}
                            >
                                {value || '*预览区域*'}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function ToolbarButton({ icon, onClick, title, disabled = false, className = "" }: { icon: React.ReactNode, onClick: () => void, title: string, disabled?: boolean, className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 text-xs font-bold disabled:opacity-30 active:scale-95 ${className}`}
        >
            {typeof icon === 'string' ? icon : icon}
        </button>
    )
}

function ViewButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1 text-[10px] font-pixel rounded-md transition-all duration-300 ${active
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
        >
            {children}
        </button>
    )
}

// 图标组件
const BoldIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
const ItalicIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 5l4 14 M7 19h6 M11 5h6" /></svg>
const StrikeIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14 M7 9l10 6" /></svg>
const QuoteIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v7c0 1.25.75 2 2 2h4c0 3-2 5-5 6zM13 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v7c0 1.25.75 2 2 2h4c0 3-2 5-5 6z" /></svg>
const CodeIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
const CodeBlockIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
const ListUnorderedIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M2 6h.01M2 12h.01M2 18h.01" /></svg>
const ListOrderedIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 5v3M3 11v3M3 17v3" /></svg>
const TableIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-8v8m14-8v8M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
const LinkIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
const ImageIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
const HRIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" /></svg>
const LoadingIcon = () => <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v2m0 8v2M6 12H4m16 0h-2M4.929 4.929l1.414 1.414m11.314 11.314l1.414 1.414M4.929 19.071l1.414-1.414m11.314-11.314l1.414-1.414" /></svg>
