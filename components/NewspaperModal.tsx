'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface NewsItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
}

interface NewspaperModalProps {
    isOpen: boolean
    onClose: () => void
    newsData: {
        date: string
        news: NewsItem[]
        lang: string
        link?: string
        image?: string
    } | null
}

export default function NewspaperModal({ isOpen, onClose, newsData }: NewspaperModalProps) {
    const { t } = useTranslation()
    const [currentTime, setCurrentTime] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentTime(new Date().toLocaleTimeString())
        }
    }, [])

    if (!newsData) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />

                    {/* Newspaper Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotateX: 45, y: 100 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, rotateX: -20, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-5xl max-h-[90vh] bg-[#f4f1ea] text-[#2c2a27] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col font-serif"
                    >
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                        <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-tr from-[#3a2f23]/20 via-transparent to-white/10"></div>

                        {/* Master Header */}
                        <div className={`px-8 pt-8 pb-4 border-b-4 border-double flex flex-col items-center ${newsData.lang === 'en' ? 'border-blue-900' : 'border-[#2c2a27]'
                            }`}>
                            <div className={`w-full flex justify-between items-end text-sm font-bold uppercase tracking-widest border-b mb-4 pb-1 ${newsData.lang === 'en' ? 'border-blue-900/30' : 'border-[#2c2a27]'
                                }`}>
                                <span>Vol. CCXXVI ... No. 13</span>
                                <span>{newsData.lang === 'en' ? 'The Pixel Post • Global' : '象素晨报 Daily Gazette'}</span>
                                <span>Established 2024</span>
                            </div>

                            <h1 className={`text-6xl md:text-8xl font-black tracking-tighter text-center uppercase mb-2 leading-none ${newsData.lang === 'en' ? 'text-blue-900' : 'text-[#2c2a27]'
                                }`}
                                style={{ fontFamily: '"Old Standard TT", serif', letterSpacing: '-0.05em' }}>
                                {newsData.lang === 'en' ? 'The Pixel Post' : '象素晨报'}
                            </h1>

                            {newsData.link && (
                                <a
                                    href={newsData.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-[10px] font-bold underline mb-2 transition-colors ${newsData.lang === 'en' ? 'text-blue-700 hover:text-blue-900' : 'text-amber-800 hover:text-amber-900'
                                        }`}
                                >
                                    {newsData.lang === 'en' ? 'READ FULL WORLD EDITION ↗' : '阅读完整版网页版 ↗'}
                                </a>
                            )}

                            <div className={`w-full border-y-2 py-2 flex justify-between items-center text-lg font-bold ${newsData.lang === 'en' ? 'border-blue-900/50' : 'border-[#2c2a27]'
                                }`}>
                                <span className="flex-1">{newsData.date}</span>
                                <span className="flex-1 text-center italic">
                                    {newsData.lang === 'en' ? '"Your Window to the World"' : '"记录象素世界的每一秒"'}
                                </span>
                                <span className="flex-1 text-right">Price: 5 pts</span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 relative custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">

                                {/* Left Column: Featured News */}
                                <div className="md:col-span-8 flex flex-col gap-6">
                                    {newsData.news.slice(0, 5).map((item, idx) => (
                                        <a
                                            key={idx}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group block cursor-pointer hover:bg-[#2c2a27]/5 -mx-2 px-2 py-1 rounded transition-colors"
                                        >
                                            <article>
                                                <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-2 group-hover:text-[#5d4a37] transition-colors">
                                                    {item.title}
                                                </h2>
                                                <p className="text-lg leading-relaxed text-justify first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:float-left line-clamp-4">
                                                    {item.description}
                                                </p>
                                                <div className="mt-4 border-b border-dotted border-[#2c2a27]/30"></div>
                                            </article>
                                        </a>
                                    ))}
                                </div>

                                {/* Vertical Divider */}
                                <div className="hidden md:block w-px bg-[#2c2a27]/20"></div>

                                {/* Right Column: Snippets & Sidebars */}
                                <div className="md:col-span-3 flex flex-col gap-6">
                                    <div className={`${newsData.lang === 'en' ? 'bg-blue-50 border-blue-900/20 shadow-none' : 'bg-[#e8e4da] border-[#2c2a27]/20 shadow-inner'
                                        } p-4 border font-serif`}>
                                        <h3 className={`font-bold border-b-2 mb-3 text-sm flex justify-between items-center ${newsData.lang === 'en' ? 'border-blue-900 text-blue-900' : 'border-[#2c2a27]'
                                            }`}>
                                            <span>{newsData.lang === 'en' ? 'EDITORIAL' : '社论'}</span>
                                            <span className="text-[10px]">{newsData.lang === 'en' ? "EDITOR'S NOTE" : '编者按'}</span>
                                        </h3>
                                        <p className="text-sm italic leading-relaxed">
                                            {newsData.lang === 'en'
                                                ? "Global connectivity starts with local understanding. Read the latest world news."
                                                : "网络延迟不过是一种心境，只要脚步不停，像素就会跳动。"}
                                        </p>
                                    </div>

                                    {newsData.news.slice(5, 12).map((item, idx) => (
                                        <a
                                            key={idx}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group block hover:underline underline-offset-4 decoration-1 decoration-amber-800"
                                        >
                                            <div className="py-1">
                                                <h4 className="font-bold text-sm mb-1 leading-snug group-hover:text-amber-900 transition-colors">
                                                    • {item.title}
                                                </h4>
                                                <p className="text-xs leading-normal opacity-80 line-clamp-2">
                                                    {item.description}
                                                </p>
                                                <div className="mt-4 border-b border-[#2c2a27]/10"></div>
                                            </div>
                                        </a>
                                    ))}

                                    <div className="mt-auto pt-8 flex flex-col items-center">
                                        <div className="w-16 h-16 opacity-30 invert grayscale grayscale-fade">
                                            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-[10px] font-bold mt-2 opacity-50 italic">象素快印中心</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Close Button */}
                        <div className={`px-8 py-4 border-t-2 flex justify-between items-center z-10 ${newsData.lang === 'en' ? 'bg-blue-50 border-blue-900/30' : 'bg-[#e8e4da] border-[#2c2a27]'
                            }`}>
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-widest ${newsData.lang === 'en' ? 'text-blue-900/60' : 'opacity-60'
                                    }`}>
                                    {newsData.lang === 'en' ? 'Pixel Post Media Group' : '象素晨报 媒体集团'}
                                </span>
                                {newsData.link && (
                                    <a
                                        href={newsData.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`text-[10px] underline mt-1 ${newsData.lang === 'en' ? 'text-blue-700 hover:text-blue-900' : 'text-amber-800 hover:text-amber-900'
                                            }`}
                                    >
                                        {newsData.lang === 'en' ? 'ORIGINAL SOURCE ↗' : '查看原文链接 ↗'}
                                    </a>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className={`px-6 py-2 font-bold uppercase tracking-tight hover:scale-105 transition-transform ${newsData.lang === 'en' ? 'bg-blue-900 text-white' : 'bg-[#2c2a27] text-[#f4f1ea]'
                                    }`}
                                style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.2)' }}
                            >
                                {newsData.lang === 'en' ? 'CLOSE NEWSPAPER' : '收起报纸'}
                            </button>
                        </div>
                    </motion.div>

                    {/* Styles for scrollbar */}
                    <style jsx>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 8px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(44, 42, 39, 0.2);
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(44, 42, 39, 0.4);
                        }
                        .grayscale-fade {
                          filter: sepia(0.5) contrast(0.8);
                        }
                    `}</style>
                </div>
            )}
        </AnimatePresence>
    )
}
