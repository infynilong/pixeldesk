import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/logger'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const configSchema = z.object({
  totalWorkstations: z.number().int().positive(),
  bindingCost: z.number().int().min(0),
  renewalCost: z.number().int().min(0),
  unbindingRefund: z.number().int().min(0),
  teleportCost: z.number().int().min(0),
  defaultDuration: z.number().int().positive(),
  maxBindingsPerUser: z.number().int().positive(),
})

export async function GET() {
  try {
    await requirePermission('workstations.view')

    const config = await prisma.workstationConfig.findFirst()

    if (!config) {
      return NextResponse.json(
        { error: '未找到工位配置' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: config,
    })
  } catch (error) {
    console.error('Failed to get workstation config:', error)
    return NextResponse.json(
      { error: '获取工位配置失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requirePermission('workstations.edit')
    const body = await request.json()

    // 验证输入
    const validation = configSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || '输入验证失败' },
        { status: 400 }
      )
    }

    const data = validation.data

    // 更新配置
    const config = await prisma.workstationConfig.findFirst()

    if (!config) {
      return NextResponse.json(
        { error: '未找到工位配置' },
        { status: 404 }
      )
    }

    const updated = await prisma.workstationConfig.update({
      where: { id: config.id },
      data: {
        ...data,
        updatedBy: admin.id,
      },
    })

    // 记录操作日志
    await logAdminAction({
      adminId: admin.id,
      action: 'UPDATE',
      resource: 'WorkstationConfig',
      resourceId: config.id,
      details: {
        old: config,
        new: updated,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Failed to update workstation config:', error)
    return NextResponse.json(
      { error: '更新工位配置失败' },
      { status: 500 }
    )
  }
}
