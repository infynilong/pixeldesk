'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  className?: string
}

/**
 * 通用 Modal 组件
 *
 * 功能：
 * 1. ✅ 阻止点击穿透到底层 Phaser 游戏
 * 2. ✅ 支持点击遮罩层关闭
 * 3. ✅ 支持 ESC 键关闭
 * 4. ✅ 自动管理 body 滚动锁定
 *
 * 使用示例：
 * ```tsx
 * <Modal isOpen={isOpen} onClose={handleClose}>
 *   <div className="bg-white p-6 rounded">
 *     你的内容
 *   </div>
 * </Modal>
 * ```
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = ''
}: ModalProps) {
  // 处理 ESC 键关闭
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`relative ${className}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 bg-retro-bg-darker border border-retro-border rounded-full w-8 h-8 flex items-center justify-center text-retro-textMuted hover:text-white hover:bg-retro-border/30"
            aria-label="关闭"
          >
            ×
          </button>
        )}

        {children}
      </div>
    </div>
  )
}
