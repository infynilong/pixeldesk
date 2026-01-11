import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, hashPassword, isValidPassword, isValidUsername } from '@/lib/auth'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

export async function PUT(request: NextRequest) {
  try {
    // 获取并验证token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 })
    }

    // 验证会话是否仍然活跃
    const activeSession = await prisma.user_sessions.findFirst({
      where: {
        userId: payload.userId,
        token: token,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    })

    if (!activeSession) {
      return NextResponse.json({
        success: false,
        error: 'Session expired or invalid'
      }, { status: 401 })
    }

    const { name, currentPassword, newPassword } = await request.json()

    // 获取当前用户信息
    const currentUser = await prisma.users.findUnique({
      where: { id: payload.userId }
    })

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    const updateData: any = {}

    // 验证并更新用户名
    if (name !== undefined && name !== currentUser.name) {
      const usernameValidation = isValidUsername(name)
      if (!usernameValidation.valid) {
        return NextResponse.json({
          success: false,
          error: usernameValidation.message
        }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    // 如果要更新密码，需要验证当前密码
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({
          success: false,
          error: 'Current password is required to change password'
        }, { status: 400 })
      }

      // 验证当前密码
      if (!currentUser.password) {
        return NextResponse.json({
          success: false,
          error: 'No password set for this account'
        }, { status: 400 })
      }

      const bcrypt = require('bcryptjs')
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)
      if (!isCurrentPasswordValid) {
        return NextResponse.json({
          success: false,
          error: 'Current password is incorrect'
        }, { status: 400 })
      }

      // 验证新密码强度
      const passwordValidation = isValidPassword(newPassword)
      if (!passwordValidation.valid) {
        return NextResponse.json({
          success: false,
          error: passwordValidation.message
        }, { status: 400 })
      }

      // 哈希新密码
      updateData.password = await hashPassword(newPassword)
    }

    // 如果没有要更新的数据
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No changes to update'
      }, { status: 400 })
    }

    // 更新用户信息
    updateData.updatedAt = new Date()
    const updatedUser = await prisma.users.update({
      where: { id: payload.userId },
      data: updateData
    })

    // 返回更新后的用户信息（不包含密码）
    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      points: updatedUser.points,
      emailVerified: updatedUser.emailVerified,
      updatedAt: updatedUser.updatedAt,
      inviteCode: updatedUser.inviteCode
    }

    return NextResponse.json({
      success: true,
      data: userResponse,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // 使用简化的用户验证方法，避免会话验证导致的连接池超时
    const authResult = await getBasicUserFromRequest(request)

    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Authentication failed'
      }, { status: 401 })
    }

    // 返回用户信息
    const userResponse = {
      id: authResult.user.id,
      name: authResult.user.name,
      email: authResult.user.email,
      avatar: authResult.user.avatar,
      points: authResult.user.points,
      emailVerified: authResult.user.emailVerified,
      inviteCode: authResult.user.inviteCode
    }

    return NextResponse.json({
      success: true,
      data: userResponse
    })

  } catch (error) {
    console.error('Get user settings error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}