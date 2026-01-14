'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
// Don't import CSS here if it conflicts, but usually github-dark is okay as a baseline
// We will rely on Tailwind Typography for most text colors
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // 自定义组件样式
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mb-6 mt-8 pb-3 border-b border-gray-200 dark:border-gray-700" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mb-4 mt-6" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mb-3 mt-5" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="leading-relaxed mb-4" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-retro-blue hover:text-retro-cyan underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-slate-100 dark:bg-gray-800 text-retro-cyan px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ node, ...props }) => (
            <pre className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto mb-4" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-retro-purple pl-4 py-2 my-4 bg-slate-100/50 dark:bg-gray-800/30 italic"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-slate-200 dark:border-gray-700 rounded-lg" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="bg-slate-50 dark:bg-gray-800 px-4 py-2 border border-slate-200 dark:border-gray-700 font-bold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="bg-white dark:bg-gray-900/50 px-4 py-2 border border-slate-200 dark:border-gray-700" {...props} />
          ),
          img: ({ node, ...props }) => (
            <img className="rounded-lg my-4 max-w-full h-auto" {...props} alt={props.alt || ''} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-slate-200 dark:border-gray-700 my-8" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
