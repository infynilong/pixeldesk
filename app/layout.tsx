import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PixelDesk - 社交办公游戏',
  description: '一个有趣的社交办公游戏平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  )
}