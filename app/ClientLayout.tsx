'use client'

import { UserProvider } from '../contexts/UserContext'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}