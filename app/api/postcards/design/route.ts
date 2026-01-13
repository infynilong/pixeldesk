import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * GET/POST /api/postcards/design
 * 获取或更新用户的名信片设计
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || null
        if (!token) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload?.userId) {
            return NextResponse.json({ success: false, error: '无效令牌' }, { status: 401 })
        }

        // 如果提供了 userId 参数，则查询该用户的 design（例如用于预览交换）
        const targetUserId = request.nextUrl.searchParams.get('userId') || payload.userId

        const design = await prisma.user_postcards.findUnique({
            where: { userId: targetUserId },
            include: { template: true }
        })

        return NextResponse.json({
            success: true,
            data: design
        })

    } catch (error: any) {
        console.error('Fetch design error:', error)
        return NextResponse.json({ success: false, error: '获取设计失败' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || null
        if (!token) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload?.userId) {
            return NextResponse.json({ success: false, error: '无效令牌' }, { status: 401 })
        }

        const body = await request.json()
        const { name, content, logoUrl, bgUrl, templateId } = body

        // 验证名称长度
        if (name && name.length > 50) {
            return NextResponse.json({ success: false, error: '名称过长' }, { status: 400 })
        }

        // 更新或创建设计
        const design = await prisma.user_postcards.upsert({
            where: { userId: payload.userId },
            update: {
                name,
                content,
                logoUrl,
                bgUrl,
                templateId,
                updatedAt: new Date()
            },
            create: {
                userId: payload.userId,
                name,
                content,
                logoUrl,
                bgUrl,
                templateId
            }
        })

        return NextResponse.json({
            success: true,
            data: design,
            message: '名信片设计已保存'
        })

    } catch (error: any) {
        console.error('Save design error:', error)
        return NextResponse.json({ success: false, error: '保存失败' }, { status: 500 })
    }
}
