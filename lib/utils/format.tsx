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
            // 检查是否为图片链接
            const lowerUrl = part.toLowerCase()
            const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?)/) ||
                lowerUrl.includes('img.') ||
                lowerUrl.includes('images.') ||
                lowerUrl.includes('/images/') ||
                lowerUrl.includes('/img/') ||
                lowerUrl.startsWith('data:image/') ||
                lowerUrl.includes('placeholder')

            if (isImage) {
                // 如果是图片链接，在文本中隐藏（由组件提取并显示）
                return null
            }

            // 非图片链接：直接显示 URL 文本，不再显示“查看链接”按钮
            // 截取过长的 URL
            const displayUrl = part.length > 50 ? part.substring(0, 47) + '...' : part

            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500 hover:text-cyan-400 hover:underline transition-all mx-0.5 break-all inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-[10px]">🔗</span>
                    <span className="text-[11px] font-mono opacity-80">{displayUrl}</span>
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
            lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?)/) ||
            lowerUrl.includes('img.') ||
            lowerUrl.includes('images.') ||
            lowerUrl.includes('/images/') ||
            lowerUrl.includes('/img/') ||
            lowerUrl.startsWith('data:image/') ||
            lowerUrl.includes('placeholder')
        )
    })
}

/**
 * 检查是否为图片链接
 */
export const isImageUrl = (url: string): boolean => {
    if (!url) return false
    const lowerUrl = url.toLowerCase()
    return (
        !!lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?)/) ||
        lowerUrl.includes('img.') ||
        lowerUrl.includes('images.') ||
        lowerUrl.includes('/images/') ||
        lowerUrl.includes('/img/') ||
        lowerUrl.startsWith('data:image/') ||
        lowerUrl.includes('placeholder')
    )
}

/**
 * 统一格式化工位 ID 显示
 * @param workstationId 工位 ID (string or number)
 * @returns 格式化后的 3 位 ID 字符串
 */
export const formatWorkstationId = (workstationId: string | number | null | undefined): string => {
    if (workstationId === null || workstationId === undefined) return ''
    const idStr = String(workstationId)
    return idStr.length > 3 ? idStr.substring(0, 3) : idStr
}
