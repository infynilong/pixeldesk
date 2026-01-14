import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default-secret')

// 工位清理相关变量
let lastCleanupTime = 0
const CLEANUP_INTERVAL = 2 * 60 * 60 * 1000 // 2小时（减少频率）
let isCleanupRunning = false // 防止并发执行

// Define protected routes that require authentication
const protectedRoutes = [
  '/api/auth/settings',
  '/api/auth/avatar',
  '/api/auth/logout',
  // Add more protected routes as needed
]

// Define public routes that should be accessible without authentication (currently unused but kept for future use)
// const publicRoutes = [
//   '/api/auth/login',
//   '/api/auth/register',
//   '/api/users', // Keep this public for now as it might be used by the game
//   // Add more public routes as needed
// ]

async function verifyAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// 清理过期工位绑定的异步函数
async function cleanupExpiredWorkstations() {
  if (isCleanupRunning) {
    console.log('🔄 清理任务已在运行中，跳过')
    return
  }

  isCleanupRunning = true

  try {
    console.log('🧹 开始清理过期工位绑定...')

    // 构建完整的URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const cleanupUrl = `${baseUrl}/api/workstations/cleanup-expired`

    const response = await fetch(cleanupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (result.success && result.cleanedCount > 0) {
      console.log(`✅ 成功清理了 ${result.cleanedCount} 个过期工位绑定`)
    } else if (result.success) {
      console.log('ℹ️ 没有找到过期的工位绑定')
    } else {
      console.error('❌ 工位清理失败:', result.error)
    }

    lastCleanupTime = Date.now()
  } catch (error) {
    console.error('❌ 工位清理过程中出错:', error)
    lastCleanupTime = Date.now() // 即使失败也更新时间，避免过度重试
  } finally {
    isCleanupRunning = false
  }
}

// 检查是否需要执行清理
function shouldRunCleanup(): boolean {
  const now = Date.now()
  return now - lastCleanupTime > CLEANUP_INTERVAL
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/webhooks') // Skip webhooks
  ) {
    return NextResponse.next()
  }

  // 保护 /admin 路径（除了登录页）
  if (pathname.startsWith('/admin')) {
    // 允许访问登录页
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    // 检查 admin-token cookie
    const token = request.cookies.get('admin-token')

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      // 使用 jose 验证 token（Edge Runtime 兼容）
      await jwtVerify(token.value, ADMIN_JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      // Token 无效，重定向到登录页
      console.error('Admin token verification failed:', error)
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // 定期清理过期工位（异步执行，不阻塞请求）
  if (shouldRunCleanup()) {
    // 使用 setTimeout 异步执行清理，避免阻塞当前请求
    setTimeout(() => {
      cleanupExpiredWorkstations().catch(error => {
        console.error('异步工位清理失败:', error)
      })
    }, 0)
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // If it's a protected route, verify authentication
  if (isProtectedRoute) {
    const user = await verifyAuth(request)

    if (!user) {
      // Return 401 Unauthorized for API routes
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // For non-API routes, redirect to login (if we had login pages)
      // For now, just return 401
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Add user info to headers for downstream handlers
    const response = NextResponse.next()
    response.headers.set('x-user-id', user.userId as string)
    response.headers.set('x-user-email', user.email as string || '')
    return response
  }

  // For all other routes, continue without authentication check
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}