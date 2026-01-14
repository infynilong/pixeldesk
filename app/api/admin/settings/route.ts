import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import { z } from 'zod'

const settingSchema = z.object({
    key: z.string(),
    value: z.string(),
    description: z.string().optional(),
    category: z.string().optional()
})

const settingsSchema = z.array(settingSchema)

// GET - 获取所有设置
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // 这里可以根据分类筛选
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        const where = category ? { category } : {}
        const settings = await prisma.system_config.findMany({
            where,
            orderBy: { key: 'asc' }
        })

        return NextResponse.json({
            success: true,
            data: settings
        })
    } catch (error) {
        console.error('Fetch settings error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// POST - 更新或创建多个设置
export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = settingsSchema.parse(body)

        // 使用事务批量更新
        const results = await prisma.$transaction(
            validatedData.map((setting) =>
                prisma.system_config.upsert({
                    where: { key: setting.key },
                    update: {
                        value: setting.value,
                        description: setting.description,
                        category: setting.category || 'general',
                        updatedAt: new Date()
                    },
                    create: {
                        id: crypto.randomUUID(),
                        key: setting.key,
                        value: setting.value,
                        description: setting.description,
                        category: setting.category || 'general',
                        updatedAt: new Date()
                    }
                })
            )
        )

        return NextResponse.json({
            success: true,
            data: results
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Invalid input', details: error.issues }, { status: 400 })
        }
        console.error('Update settings error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
