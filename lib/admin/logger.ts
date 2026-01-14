import prisma from '@/lib/db'
import { headers } from 'next/headers'

/**
 * 记录管理员操作日志
 */
export async function logAdminAction(params: {
  adminId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
  resource: string
  resourceId?: string
  details?: Record<string, any>
}) {
  const headersList = headers()
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
  const userAgent = headersList.get('user-agent')

  await prisma.admin_logs.create({
    data: {
      id: crypto.randomUUID(),
      adminId: params.adminId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    },
  })
}

/**
 * 获取管理员操作日志
 */
export async function getAdminLogs(params?: {
  adminId?: string
  resource?: string
  action?: string
  page?: number
  pageSize?: number
}) {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 50

  const where: any = {}
  if (params?.adminId) where.adminId = params.adminId
  if (params?.resource) where.resource = params.resource
  if (params?.action) where.action = params.action

  const [logs, total] = await Promise.all([
    prisma.admin_logs.findMany({
      where,
      include: {
        admins: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.admin_logs.count({ where }),
  ])

  return {
    data: logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
