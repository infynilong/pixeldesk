import './globals.css'
import { Inter } from 'next/font/google'
import { Press_Start_2P, VT323 } from 'next/font/google'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })
const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel'
})
const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-retro'
})

import { Metadata } from 'next'
import { prisma } from '@/lib/db'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const configs = await prisma.brand_config.findMany({
      where: {
        key: { in: ['app_name', 'app_slogan', 'app_description'] }
      }
    })

    // Helper to get value for a key, preferring zh-CN, then en-US, then first found
    const getValue = (key: string) => {
      const items = configs.filter(c => c.key === key)
      const zh = items.find(c => c.locale === 'zh-CN')
      if (zh) return zh.value
      const en = items.find(c => c.locale === 'en-US')
      if (en) return en.value
      return items[0]?.value || ''
    }

    const appName = getValue('app_name') || 'Tembo PX Workshop'
    const appSlogan = getValue('app_slogan') || '社交办公游戏'
    const appDescription = getValue('app_description') || '一个有趣的社交办公游戏平台'

    return {
      title: `${appName} - ${appSlogan}`,
      description: appDescription,
      icons: {
        icon: '/assets/icon.png',
        shortcut: '/assets/icon.png',
        apple: '/assets/icon.png',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Tembo PX Workshop - 社交办公游戏',
      description: '一个有趣的社交办公游戏平台',
      icons: {
        icon: '/assets/icon.png',
        shortcut: '/assets/icon.png',
        apple: '/assets/icon.png',
      },
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className={`${pressStart2P.variable} ${vt323.variable}`}>
      <body className={`${inter.className} font-pixel`}>
        <div id="app-root">
          <ClientLayout>
            {children}
          </ClientLayout>
        </div>
      </body>
    </html>
  )
}