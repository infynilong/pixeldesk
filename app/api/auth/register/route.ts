import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateToken, hashPassword, isValidEmail, isValidPassword, isValidUsername } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // 输入验证
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required'
      }, { status: 400 })
    }

    // 邮箱格式验证
    if (!isValidEmail(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // 密码强度验证
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({
        success: false,
        error: passwordValidation.message
      }, { status: 400 })
    }

    // 用户名验证
    const usernameValidation = isValidUsername(name)
    if (!usernameValidation.valid) {
      return NextResponse.json({
        success: false,
        error: usernameValidation.message
      }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Email already registered'
      }, { status: 409 })
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password)

    // 生成用户 ID
    const cuid = (await import('cuid')).default
    const userId = cuid()

    // 创建用户
    const user = await prisma.users.create({
      data: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        points: 100,  // 初始积分
        emailVerified: false,
        isActive: true,
        updatedAt: new Date()
      }
    })

    // 发送欢迎邮件 (异步)
    if (user.email) {
      sendWelcomeEmail(user.email, user.name).catch(console.error)
    }

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email!,
      name: user.name
    })

    // 创建会话记录
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7天后过期

    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'Unknown'

    await prisma.user_sessions.create({
      data: {
        id: cuid(),
        userId: user.id,
        token,
        userAgent,
        ipAddress,
        expiresAt,
        isActive: true,
        updatedAt: new Date()
      }
    })

    // 返回成功响应，不包含密码
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      points: user.points,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    }

    // 设置HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: userResponse,
      message: 'Registration successful'
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    })

    return response

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}