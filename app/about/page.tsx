import { prisma } from '@/lib/db'
import { Metadata } from 'next'
import Link from 'next/link'

// Force dynamic rendering to ensure we get the latest config
export const dynamic = 'force-dynamic'

async function getBrandConfig() {
    // Fetch Chinese config by default for SEO, but we could make this smarter
    // We'll fetch both important fields to display
    const configs = await prisma.brand_config.findMany({
        where: {
            key: {
                in: ['app_name', 'app_slogan', 'app_logo', 'about_title', 'about_content', 'about_image', 'app_description']
            },
            locale: 'zh-CN'
        }
    })

    // Convert to object
    return configs.reduce((acc, config) => {
        acc[config.key] = config.value
        return acc
    }, {} as Record<string, string>)
}

export async function generateMetadata(): Promise<Metadata> {
    const config = await getBrandConfig()

    return {
        title: `${config.about_title || '关于我们'} - ${config.app_name || '象素工坊'}`,
        description: config.about_content || config.app_description || '关于象素工坊的介绍',
        openGraph: {
            title: config.about_title || '关于我们',
            description: config.about_content || config.app_description,
            images: config.about_image ? [config.about_image] : [],
        }
    }
}

export default async function AboutPage() {
    const config = await getBrandConfig()

    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-purple-500/30 overflow-x-hidden relative">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[10%] right-[-10%] w-[35%] h-[35%] bg-blue-900/20 blur-[120px] rounded-full"></div>
                <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-pink-900/10 blur-[100px] rounded-full"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-800 group-hover:ring-2 group-hover:ring-purple-500 transition-all duration-300">
                            {config.app_logo && (
                                <img src={config.app_logo} alt="Logo" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {config.app_name || '象素工坊'}
                        </span>
                    </Link>

                    <Link
                        href="/"
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all text-sm font-medium border border-gray-700 hover:border-gray-600"
                    >
                        返回首页
                    </Link>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-3xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-16 animate-fadeIn">
                        <div className="relative inline-block mb-6 group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative w-24 h-24 rounded-2xl bg-gray-800 overflow-hidden shadow-2xl">
                                {config.app_logo && (
                                    <img
                                        src={config.app_logo}
                                        alt={config.app_name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                            {config.about_title || '关于我们'}
                        </h1>
                        <p className="text-xl text-gray-400 font-light flex items-center justify-center gap-2">
                            <span className="w-8 h-[1px] bg-gray-700"></span>
                            {config.app_slogan || '社交办公游戏'}
                            <span className="w-8 h-[1px] bg-gray-700"></span>
                        </p>
                    </div>

                    {/* Content Card */}
                    <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8 md:p-12 shadow-xl mb-12">
                        <article className="prose prose-invert prose-lg max-w-none">
                            <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">
                                {config.about_content || config.app_description || '暂无介绍'}
                            </div>
                        </article>

                        {/* Donation / Image Section */}
                        {config.about_image && config.about_image.trim() !== '' && (
                            <div className="mt-12 pt-12 border-t border-gray-800 flex flex-col items-center">
                                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-6 font-semibold">Support Us</h3>
                                <div className="bg-white p-3 rounded-2xl shadow-2xl max-w-[220px] transform hover:scale-105 transition-transform duration-300">
                                    <img
                                        src={config.about_image}
                                        alt="Scan Code"
                                        className="w-full h-auto rounded-xl"
                                    />
                                </div>
                                <p className="text-gray-500 text-sm mt-4 font-mono">Tap to scan or save</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <footer className="text-center text-gray-600 text-sm font-mono border-t border-gray-900 pt-8">
                        <p>&copy; {new Date().getFullYear()} {config.app_name || 'PixelDesk'}. All rights reserved.</p>
                    </footer>
                </div>
            </main>
        </div>
    )
}
