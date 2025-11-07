import { NextRequest, NextResponse } from 'next/server'
import { generateToken, verifyPassword, isValidEmail } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // 输入验证
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 })
    }

    // 邮箱格式验证
    if (!isValidEmail(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // 查找用户（包含密码字段用于验证）
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase().trim(),
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // 检查用户是否完成了注册（有密码）
    if (!user.password) {
      return NextResponse.json({
        success: false,
        error: 'Account setup incomplete. Please register again.'
      }, { status: 401 })
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email!,
      name: user.name
    })

    // 清理过期会话
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() }
      },
      data: { isActive: false }
    })

    // 创建新会话
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'Unknown'

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        userAgent,
        ipAddress,
        expiresAt,
        isActive: true
      }
    })

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLogin: new Date(),
        updatedAt: new Date()
      }
    })

    // 用户响应数据（不包含密码）
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      points: user.points,
      emailVerified: user.emailVerified,
      lastLogin: new Date()
    }

    // 设置安全cookie
    const response = NextResponse.json({
      success: true,
      data: userResponse,
      message: 'Login successful'
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}