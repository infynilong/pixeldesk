import React from 'react'

/**
 * 渲染带链接的内容，将 URL 替换为 stylized link 文本
 * @param text 原始内容
 * @param viewLinkText 链接显示的文字 (e.g., t.social.view_link)
 * @param className 链接的额外样式
 */
export const renderContentWithUrls = (
    text: string,
    viewLinkText: string = '查看链接',
    className: string = "text-cyan-500 hover:text-cyan-400 transition-colors inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20 mx-0.5"
) => {
    if (!text) return null

    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            // 检查是否为图片链接，如果是图片则不显示为“查看链接”，因为会有专门的预览图
            const lowerUrl = part.toLowerCase()
            const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/) ||
                lowerUrl.includes('img.') ||
                lowerUrl.includes('images.') ||
                lowerUrl.includes('/images/') ||
                lowerUrl.includes('/img/')

            if (isImage) {
                return <span key={index} className="opacity-60 text-[11px] italic break-all">{part}</span>
            }

            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-[10px]">🔗</span>
                    <span className="text-[11px] font-pixel">{viewLinkText}</span>
                </a>
            )
        }
        return part
    })
}

/**
 * 从文本中提取图片链接
 */
export const extractImageUrls = (text: string): string[] => {
    if (!text) return []
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = text.match(urlRegex) || []

    return matches.filter(url => {
        const lowerUrl = url.toLowerCase()
        return (
            lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/) ||
            lowerUrl.includes('img.') ||
            lowerUrl.includes('images.') ||
            lowerUrl.includes('/images/') ||
            lowerUrl.includes('/img/')
        )
    })
}
