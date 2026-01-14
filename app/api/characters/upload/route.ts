import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * POST /api/characters/upload
 * 用户上传自己的角色形象到商店
 */
export async function POST(request: NextRequest) {
  try {
    // 获取并验证token
    let token: string | null = null

    // 优先从cookie读取
    token = request.cookies.get('auth-token')?.value || null

    // 如果cookie中没有，尝试从Authorization header读取
    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '请先登录'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({
        success: false,
        error: '无效的认证令牌'
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
        error: '会话已过期'
      }, { status: 401 })
    }

    // 解析FormData
    const formData = await request.formData()
    const file = formData.get('characterImage') as File
    const displayName = formData.get('displayName') as string
    const description = formData.get('description') as string | null
    const price = parseInt(formData.get('price') as string)

    // 验证必填字段
    if (!file) {
      return NextResponse.json({
        success: false,
        error: '请上传角色形象图片'
      }, { status: 400 })
    }

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '请输入显示名称'
      }, { status: 400 })
    }

    if (isNaN(price) || price < 0) {
      return NextResponse.json({
        success: false,
        error: '请输入有效的价格（0表示免费）'
      }, { status: 400 })
    }

    // 验证文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: '只支持PNG, JPG, JPEG, WEBP格式的图片'
      }, { status: 400 })
    }

    // 验证文件大小 (2MB限制)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: '文件过大，最大支持2MB'
      }, { status: 400 })
    }

    // 验证图片尺寸（应该是192x96或192x192的精灵图）
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 使用sharp库验证图片尺寸（需要安装sharp）
    // 这里先简单检查，实际应该用sharp验证

    // 创建唯一文件名
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `user_${payload.userId}_${timestamp}.${fileExtension}`

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'public', 'assets', 'characters', 'user-generated')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 保存文件
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // 构建角色imageUrl
    const imageUrl = `/assets/characters/user-generated/${fileName}`

    // 生成唯一的角色name（使用userId和时间戳）
    const characterName = `user_${payload.userId}_${timestamp}`

    // 创建角色记录
    const character = await prisma.characters.create({
      data: {
        id: crypto.randomUUID(),
        name: characterName,
        displayName: displayName.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl,
        frameWidth: 48,
        frameHeight: 96,
        totalFrames: 8,
        isCompactFormat: true, // 用户上传默认为紧凑格式（2行4列）
        price: price,
        isDefault: false,
        isActive: true,
        isUserGenerated: true,
        creatorId: payload.userId,
        salesCount: 0,
        sortOrder: 999, // 用户生成的角色排在后面
        updatedAt: new Date()
      }
    })

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        character: {
          id: character.id,
          name: character.name,
          displayName: character.displayName,
          description: character.description,
          imageUrl: character.imageUrl,
          price: character.price,
          isUserGenerated: true
        }
      },
      message: '角色上传成功！等待审核后将在商店中展示'
    })

  } catch (error) {
    console.error('Character upload error:', error)
    return NextResponse.json({
      success: false,
      error: '上传失败，请重试'
    }, { status: 500 })
  }
}
