import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { jwtVerify } from 'jose'
import { LevelingService } from '@/lib/services/leveling'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '')
const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || '')

async function getUserIdFromRequest(request: NextRequest) {
    // 尝试获取用户 token
    const userToken = request.cookies.get('auth-token')?.value
    if (userToken) {
        try {
            const { payload } = await jwtVerify(userToken, JWT_SECRET)
            return payload.userId as string
        } catch (e) {
            console.error('User token verify failed')
        }
    }

    // 尝试获取管理员 token
    const adminToken = request.cookies.get('admin-token')?.value
    if (adminToken) {
        try {
            const { payload } = await jwtVerify(adminToken, ADMIN_JWT_SECRET)
            return payload.adminId as string
        } catch (e) {
            console.error('Admin token verify failed')
        }
    }

    return null
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const folder = (formData.get('folder') as string) || 'blog'

        // 如果是社交帖子图片上传，检查权限
        if (folder === 'posts') {
            const hasPermission = await LevelingService.checkPermission(userId, 'social_image_upload')
            if (!hasPermission) {
                return NextResponse.json({
                    success: false,
                    error: '等级不足，无法在帖子中上传图片。请继续提升等级以解锁此特权。'
                }, { status: 403 })
            }
        }

        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
        }

        // 验证文件大小 (500KB) - 用户明确要求限制为 500KB
        const MAX_SIZE = 500 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: `图片太大 (最大 500KB)，当前大小: ${Math.round(file.size / 1024)}KB` },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // 生成唯一文件名: 用户ID-时间戳-随机数.后缀
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 100000)
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
        // 只允许基本的后缀名
        const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'png'
        const fileName = `${userId}-${timestamp}-${random}.${safeExt}`

        // 确保目录存在
        // User specific upload directory: uploads/{userId}/{folder}
        const uploadDir = join(process.cwd(), 'public', 'uploads', userId, folder)
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filePath = join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        return NextResponse.json({
            success: true,
            url: `/uploads/${userId}/${folder}/${fileName}`
        })

    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        )
    }
}
