'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

// 动态导入编辑器以避免 SSR 问题
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
)

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 500,
  placeholder: propPlaceholder
}: MarkdownEditorProps) {
  const { t } = useTranslation()
  const placeholder = propPlaceholder || t.editor.placeholder
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 禁用游戏键盘输入
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
      (window as any).disableGameKeyboard()
    }
    return () => {
      if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
        (window as any).enableGameKeyboard()
      }
    }
  }, [])

  if (!mounted) {
    return (
      <div
        className="w-full bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400"
        style={{ height: `${height}px` }}
      >
        {t.editor.loading}
      </div>
    )
  }

  return (
    <div data-color-mode="dark" className="markdown-editor-wrapper">
      <style jsx global>{`
        .markdown-editor-wrapper .w-md-editor {
          background-color: transparent !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: none !important;
        }
        .markdown-editor-wrapper .w-md-editor-toolbar {
          background-color: rgba(17, 24, 39, 0.4) !important;
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .markdown-editor-wrapper .w-md-editor-content {
          background-color: transparent !important;
        }
        .markdown-editor-wrapper .w-md-editor-text-pre, 
        .markdown-editor-wrapper .w-md-editor-text-input {
          background-color: transparent !important;
          font-family: var(--font-mono), monospace !important;
        }
        .markdown-editor-wrapper .w-md-editor-preview {
          background-color: rgba(0, 0, 0, 0.1) !important;
          border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .markdown-editor-wrapper .wmde-markdown {
          background-color: transparent !important;
          color: #d1d5db !important;
        }
      `}</style>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        height={height}
        preview="live"
        visibleDragbar={false}
        textareaProps={{
          placeholder: placeholder
        }}
        previewOptions={{
          rehypePlugins: [],
        }}
      />
    </div>
  )
}
