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

export const metadata = {
  title: '象素工坊 - 社交办公游戏',
  description: '一个有趣的社交办公游戏平台',
  icons: {
    icon: '/assets/icon.png',
    shortcut: '/assets/icon.png',
    apple: '/assets/icon.png',
  },
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