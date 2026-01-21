'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useNodes } from '@/lib/hooks/useNodes'

interface PostNode {
    id: string
    name: string
    slug: string
}

interface PostSearchBarProps {
    onSearch: (query: string) => void
    onNodeChange: (nodeId: string) => void
    isMobile?: boolean
    className?: string
}

export default function PostSearchBar({ onSearch, onNodeChange, isMobile = false, className = '' }: PostSearchBarProps) {
    const { t } = useTranslation()
    const [searchQuery, setSearchQuery] = useState('')
    const { nodes } = useNodes() // Use cached hook
    const [selectedNodeId, setSelectedNodeId] = useState('all')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Removed local fetchNodes useEffect

    // Handle search input with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(searchQuery)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, onSearch])

    // Handle outside click for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleNodeSelect = (nodeId: string) => {
        setSelectedNodeId(nodeId)
        onNodeChange(nodeId)
        setIsDropdownOpen(false)
    }

    const selectedNodeName = selectedNodeId === 'all'
        ? t.social.all_nodes
        : nodes.find(n => n.id === selectedNodeId)?.name || t.social.all_nodes

    return (
        <div className={`flex items-center gap-2 ${className} ${!className && isMobile ? 'flex-col p-3' : (!className ? 'p-3' : '')}`}>
            {/* Node Selector */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700/50 rounded-lg text-xs font-mono text-slate-500 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700/70 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm min-w-[100px]"
                >
                    <span className={`truncate ${isMobile ? 'max-w-[70px]' : ''}`}>{selectedNodeName}</span>
                    <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xl z-[60] py-1 backdrop-blur-md">
                        <button
                            onClick={() => handleNodeSelect('all')}
                            className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${selectedNodeId === 'all' ? 'bg-indigo-500/10 text-indigo-600 dark:text-retro-blue' : 'text-slate-400 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 dark:hover:text-white'}`}
                        >
                            # {t.social.all_nodes}
                        </button>
                        {nodes.map((node) => (
                            <button
                                key={node.id}
                                onClick={() => handleNodeSelect(node.id)}
                                className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${selectedNodeId === node.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-retro-blue' : 'text-slate-400 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 dark:hover:text-white'}`}
                            >
                                # {node.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 group w-full">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-retro-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isMobile ? t.social.search_tip : t.social.search_placeholder}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800/40 border border-slate-200 dark:border-gray-700/50 rounded-lg text-xs font-mono text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:focus:ring-retro-blue/50 focus:border-indigo-500/30 dark:focus:border-retro-blue/50 transition-all backdrop-blur-sm shadow-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}
