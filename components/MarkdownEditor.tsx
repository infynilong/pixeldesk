'use client'

import { useState, useEffect } from 'react'
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
  placeholder = '开始写作...'
}: MarkdownEditorProps) {
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
        加载编辑器中...
      </div>
    )
  }

  return (
    <div data-color-mode="dark" className="markdown-editor-wrapper">
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
