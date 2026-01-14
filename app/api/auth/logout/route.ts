import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 获取token从cookie
    const token = request.cookies.get('auth-token')?.value
    
    if (token) {
      // 验证token并获取用户信息
      const payload = verifyToken(token)
      
      if (payload?.userId) {
        // 将该用户的所有活跃会话标记为非活跃
        await prisma.user_sessions.updateMany({
          where: {
            userId: payload.userId,
            token: token,
            isActive: true
          },
          data: {
            isActive: false
          }
        })
      }
    }
    
    // 创建响应并清除cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    })
    
    // 清除auth-token cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/' // 确保清除所有路径下的cookie
    })
    
    return response
    
  } catch (error) {
    console.error('Logout error:', error)
    
    // 即使出错也要清除cookie
    const response = NextResponse.json({
      success: true, // 对用户来说logout总是成功的
      message: 'Logout completed'
    })
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    return response
  }
}