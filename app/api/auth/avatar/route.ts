import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
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
    
    // 解析FormData
    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 })
    }
    
    // 验证文件大小 (5MB限制)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 })
    }
    
    // 创建唯一文件名
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${payload.userId}_${timestamp}.${fileExtension}`
    
    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'public', 'avatars')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    
    // 保存文件
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // 构建avatar URL
    const avatarUrl = `/avatars/${fileName}`

    // 更新用户customAvatar字段（自定义头像优先级高于角色形象）
    const updatedUser = await prisma.users.update({
      where: { id: payload.userId },
      data: {
        customAvatar: avatarUrl,
        updatedAt: new Date()
      }
    })
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        avatarUrl: avatarUrl,
        users: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          points: updatedUser.points
        }
      },
      message: 'Avatar uploaded successfully'
    })
    
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload avatar'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    // 删除用户customAvatar字段（设为null），恢复使用角色形象
    const updatedUser = await prisma.users.update({
      where: { id: payload.userId },
      data: {
        customAvatar: null,
        updatedAt: new Date()
      }
    })
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        users: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          points: updatedUser.points
        }
      },
      message: 'Avatar removed successfully'
    })
    
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to remove avatar'
    }, { status: 500 })
  }
}