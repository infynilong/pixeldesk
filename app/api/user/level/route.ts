
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { LevelingService } from '@/lib/services/leveling'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 })
        }

        const progress = await LevelingService.getUserLevelProgress(userId)

        if (!progress) {
            // Handle guest or non-existent users by returning a default LV 0 state
            return NextResponse.json({
                success: true,
                data: {
                    current: {
                        level: 0,
                        bits: 0,
                        name: '初生像素 (Raw Pixel)',
                        config: {}
                    },
                    next: {
                        level: 1,
                        requiredBits: 10,
                        requiredDays: 0,
                        currentDays: 0,
                        progress: 0,
                        isDayLimited: false
                    }
                }
            })
        }

        return NextResponse.json({ success: true, data: progress })
    } catch (error) {
        console.error('Error fetching user level:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
