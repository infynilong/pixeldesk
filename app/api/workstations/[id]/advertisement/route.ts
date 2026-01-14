import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'

// 更新工位广告
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.user.id
    const workstationId = parseInt(params.id)

    if (isNaN(workstationId)) {
      return NextResponse.json({ error: 'Invalid workstation ID' }, { status: 400 })
    }

    // 解析请求体
    const body = await request.json()
    const { adText, adImage, adUrl } = body

    // 验证输入
    if (adText && adText.length > 200) {
      return NextResponse.json({ error: '广告文案不能超过200个字符' }, { status: 400 })
    }

    if (adImage && adImage.length > 500) {
      return NextResponse.json({ error: '图片URL过长' }, { status: 400 })
    }

    if (adUrl && adUrl.length > 500) {
      return NextResponse.json({ error: '链接URL过长' }, { status: 400 })
    }

    // 检查用户是否拥有这个工位
    const binding = await prisma.user_workstations.findFirst({
      where: {
        userId,
        workstationId,
        expiresAt: {
          gt: new Date() // 未过期
        }
      }
    })

    if (!binding) {
      return NextResponse.json({
        error: '您没有权限编辑此工位的广告,或工位绑定已过期'
      }, { status: 403 })
    }

    // 更新广告
    const updated = await prisma.user_workstations.update({
      where: {
        id: binding.id
      },
      data: {
        adText: adText || null,
        adImage: adImage || null,
        adUrl: adUrl || null,
        adUpdatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        adText: updated.adText,
        adImage: updated.adImage,
        adUrl: updated.adUrl,
        adUpdatedAt: updated.adUpdatedAt
      }
    })

  } catch (error) {
    console.error('Error updating workstation advertisement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 获取工位广告
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workstationId = parseInt(params.id)

    if (isNaN(workstationId)) {
      return NextResponse.json({ error: 'Invalid workstation ID' }, { status: 400 })
    }

    // 查找当前有效的工位绑定和广告
    const binding = await prisma.user_workstations.findFirst({
      where: {
        workstationId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        boundAt: 'desc'
      }
    })

    if (!binding) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        adText: binding.adText,
        adImage: binding.adImage,
        adUrl: binding.adUrl,
        adUpdatedAt: binding.adUpdatedAt,
        owner: binding.users,
        boundAt: binding.boundAt,
        expiresAt: binding.expiresAt
      }
    })

  } catch (error) {
    console.error('Error fetching workstation advertisement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
