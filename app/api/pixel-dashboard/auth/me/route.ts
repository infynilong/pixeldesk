import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getAdminById } from '@/lib/pixel-dashboard/auth'

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('admin-token')

    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 验证 token (使用 jose 库)
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || ''
    )

    const { payload } = await jwtVerify(token.value, secret)
    const decoded = payload as { adminId: string }

    // 获取管理员信息
    const admin = await getAdminById(decoded.adminId)
    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: '管理员不存在或已被禁用' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      admin,
    })
  } catch (error) {
    console.error('Get admin info error:', error)
    return NextResponse.json(
      { error: '获取管理员信息失败' },
      { status: 401 }
    )
  }
}
