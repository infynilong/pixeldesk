import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'

export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthFromRequest(request)

        if (!authResult.success || !authResult.user) {
            return NextResponse.json({
                success: false,
                error: authResult.error || 'Unauthorized'
            }, { status: 401 })
        }

        const userId = authResult.user.id

        // Check if user already has an invite code (double check)
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { inviteCode: true }
        })

        if (user?.inviteCode) {
            return NextResponse.json({
                success: true,
                inviteCode: user.inviteCode,
                message: 'User already has an invite code'
            })
        }

        // Generate a new invite code
        const newInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

        // Update user
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: {
                inviteCode: newInviteCode,
                updatedAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            inviteCode: updatedUser.inviteCode,
            message: 'Invite code generated successfully'
        })

    } catch (error) {
        console.error('Error generating invite code:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}
