import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { admins, AdminRole } from '@prisma/client'

/**
 * 验证管理员密码
 */
export async function verifyAdminPassword(
  username: string,
  password: string
): Promise<admins | null> {
  const admin = await prisma.admins.findUnique({
    where: { username },
  })

  if (!admin || !admin.isActive) {
    return null
  }

  const isValid = await bcrypt.compare(password, admin.password)
  if (!isValid) {
    return null
  }

  // 更新最后登录时间
  await prisma.admins.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  })

  return admin
}

/**
 * 创建管理员（密码自动加密）
 */
export async function createAdmin(data: {
  username: string
  email: string
  password: string
  role?: AdminRole
}): Promise<admins> {
  const hashedPassword = await bcrypt.hash(data.password, 10)

  return prisma.admins.create({
    data: {
      id: crypto.randomUUID(),
      username: data.username,
      email: data.email,
      password: hashedPassword,
      role: data.role || 'ADMIN',
      updatedAt: new Date()
    },
  })
}

/**
 * 修改管理员密码
 */
export async function changeAdminPassword(
  adminId: string,
  newPassword: string
): Promise<admins> {
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  return prisma.admins.update({
    where: { id: adminId },
    data: { password: hashedPassword },
  })
}

/**
 * 获取管理员信息（不包含密码）
 */
export async function getAdminById(id: string) {
  return prisma.admins.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      isActive: true,
    },
  })
}
