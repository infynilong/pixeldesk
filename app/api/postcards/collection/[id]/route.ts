
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Auth check
        const token = request.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload?.userId) {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
        }

        const collectionId = params.id;

        // 2. Verify ownership and existence
        // 验证归属权
        const item = await (prisma as any).user_postcard_collection.findUnique({
            where: { id: params.id }
        })

        if (!item || item.userId !== payload.userId) {
            return NextResponse.json({ success: false, error: '找不到该名信片或无权删除' }, { status: 404 })
        }

        // 3. Delete
        // 删除
        await (prisma as any).user_postcard_collection.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true, message: 'Deleted successfully' });

    } catch (error) {
        console.error('Delete postcard error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
