import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword } from '@/lib/admin/auth'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || '输入验证失败' },
        { status: 400 }
      )
    }

    const { username, password } = validation.data

    // 验证管理员
    const admin = await verifyAdminPassword(username, password)
    if (!admin) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 生成 JWT token (使用 jose 库，兼容 Edge Runtime)
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'default-secret'
    )

    const token = await new SignJWT({
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    // 设置 cookie
    cookies().set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}
