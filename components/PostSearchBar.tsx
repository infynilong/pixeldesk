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
}

export default function PostSearchBar({ onSearch, onNodeChange, isMobile = false }: PostSearchBarProps) {
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
        <div className={`flex items-center gap-2 p-3 ${isMobile ? 'flex-col' : ''}`}>
            {/* Node Selector */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs font-mono text-gray-300 hover:bg-gray-700/70 hover:text-white transition-all min-w-[100px]"
                >
                    <span className="truncate">{selectedNodeName}</span>
                    <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-[60] py-1 backdrop-blur-md">
                        <button
                            onClick={() => handleNodeSelect('all')}
                            className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${selectedNodeId === 'all' ? 'bg-retro-blue/20 text-retro-blue' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        >
                            # {t.social.all_nodes}
                        </button>
                        {nodes.map((node) => (
                            <button
                                key={node.id}
                                onClick={() => handleNodeSelect(node.id)}
                                className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${selectedNodeId === node.id ? 'bg-retro-blue/20 text-retro-blue' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                            >
                                # {node.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500 group-focus-within:text-retro-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.social.search_placeholder}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800/40 border border-gray-700/50 rounded-lg text-xs font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-retro-blue/50 focus:border-retro-blue/50 transition-all backdrop-blur-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white transition-colors"
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
