import { AdminRole } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

/**
 * 权限矩阵
 */
export const PERMISSIONS = {
  SUPER_ADMIN: ['*'], // 所有权限
  ADMIN: [
    'players.view',
    'players.edit',
    'players.delete',
    'users.view',
    'users.edit',
    'users.delete',
    'characters.view',
    'characters.create',
    'characters.edit',
    'characters.delete',
    'workstations.view',
    'workstations.edit',
    'dashboard.view',
    'ai_npcs.edit',
  ],
  VIEWER: [
    'players.view',
    'users.view',
    'characters.view',
    'workstations.view',
    'dashboard.view',
  ],
} as const

/**
 * 检查管理员是否有特定权限
 */
export function hasPermission(role: AdminRole, permission: string): boolean {
  const userPermissions = PERMISSIONS[role] || []

  // SUPER_ADMIN 有所有权限
  if ((userPermissions as readonly string[]).includes('*')) {
    return true
  }

  return (userPermissions as readonly string[]).includes(permission)
}

/**
 * 从 cookie 中获取当前管理员信息
 */
async function getCurrentAdmin(): Promise<{ id: string; role: AdminRole } | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('admin-token')

    if (!token) {
      return null
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'default-secret'
    )

    const { payload } = await jwtVerify(token.value, secret)
    return {
      id: payload.adminId as string,
      role: payload.role as AdminRole,
    }
  } catch (error) {
    return null
  }
}

/**
 * 检查当前登录的管理员是否有特定权限
 */
export async function checkPermission(permission: string): Promise<boolean> {
  const admin = await getCurrentAdmin()

  if (!admin) {
    return false
  }

  return hasPermission(admin.role, permission)
}

/**
 * 要求管理员权限（用于 API 路由）
 */
export async function requireAdmin() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }

  return admin
}

/**
 * 要求特定权限（用于 API 路由）
 */
export async function requirePermission(permission: string) {
  const admin = await requireAdmin()

  if (!hasPermission(admin.role, permission)) {
    throw new Error(`Insufficient permissions: ${permission} required`)
  }

  return admin
}
