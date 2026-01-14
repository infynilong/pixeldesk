import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * POST /api/postcards/upload
 * 用户上传名信片素材 (logo 或 background)
 */
export async function POST(request: NextRequest) {
    try {
        // 1. 获取并验证 token
        let token = request.cookies.get('auth-token')?.value || null
        if (!token) {
            const authHeader = request.headers.get('Authorization')
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.substring(7)
            }
        }

        if (!token) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload?.userId) {
            return NextResponse.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
        }

        // 2. 解析 FormData
        const formData = await request.formData()
        const file = formData.get('file') as File
        const type = formData.get('type') as 'logo' | 'background'

        if (!file) {
            return NextResponse.json({ success: false, error: '请上传图片文件' }, { status: 400 })
        }

        if (!['logo', 'background'].includes(type)) {
            return NextResponse.json({ success: false, error: '无效的素材类型' }, { status: 400 })
        }

        // 3. 验证文件
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: '只支持 PNG, JPG, JPEG, WEBP 格式' }, { status: 400 })
        }

        // 设置不同类型的大小限制 (Logo: 200KB, Background: 800KB)
        const maxSize = type === 'logo' ? 200 * 1024 : 800 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({
                success: false,
                error: `图片过大，${type === 'logo' ? 'Logo' : '背景图'}最大支持 ${type === 'logo' ? '200KB' : '800KB'}`
            }, { status: 400 })
        }

        // 4. 保存文件
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'
        const fileName = `${type}_${payload.userId}_${timestamp}.${fileExtension}`

        // 存储目录: /public/assets/postcards/user-generated/
        const uploadDir = join(process.cwd(), 'public', 'assets', 'postcards', 'user-generated')
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filePath = join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        const imageUrl = `/assets/postcards/user-generated/${fileName}`

        return NextResponse.json({
            success: true,
            data: {
                url: imageUrl,
                type: type
            }
        })

    } catch (error: any) {
        console.error('Postcard upload error:', error)
        return NextResponse.json({
            success: false,
            error: '上传失败，请重试',
            details: error.message
        }, { status: 500 })
    }
}
