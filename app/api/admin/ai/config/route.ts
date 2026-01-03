import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const config = await prisma.ai_global_config.findFirst({
            where: { isActive: true }
        })

        return NextResponse.json({ success: true, data: config })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}
