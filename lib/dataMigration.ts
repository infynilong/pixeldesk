import { prisma } from '../lib/db'

export interface MigrationData {
  users: any[]
  statusHistory: any[]
  workstations: any[]
  userWorkstations: any[]
}

export class DataMigration {
  /**
   * 从localStorage读取数据
   */
  static readFromLocalStorage(): MigrationData {
    if (typeof window === 'undefined') {
      return { users: [], statusHistory: [], workstations: [], userWorkstations: [] }
    }

    const data: MigrationData = {
      users: [],
      statusHistory: [],
      workstations: [],
      userWorkstations: []
    }

    try {
      // 读取用户数据
      const userData = localStorage.getItem('pixelDeskUser')
      if (userData) {
        const user = JSON.parse(userData)
        data.users.push(user)
      }

      // 读取状态历史
      const statusData = localStorage.getItem('pixelDesk_statusHistory')
      if (statusData) {
        data.statusHistory = JSON.parse(statusData)
      }

      // 读取工位数据
      const workstationsData = localStorage.getItem('pixelDesk_workstations')
      if (workstationsData) {
        data.workstations = JSON.parse(workstationsData)
      }

      // 读取用户工位绑定
      const bindingsData = localStorage.getItem('pixelDesk_userWorkstations')
      if (bindingsData) {
        data.userWorkstations = JSON.parse(bindingsData)
      }

    } catch (error) {
      console.error('Error reading from localStorage:', error)
    }

    return data
  }

  /**
   * 迁移数据到数据库
   */
  static async migrateToDatabase(data: MigrationData) {
    const results = {
      users: { success: 0, failed: 0 },
      statusHistory: { success: 0, failed: 0 },
      workstations: { success: 0, failed: 0 },
      userWorkstations: { success: 0, failed: 0 }
    }

    try {
      // 迁移用户数据
      for (const user of data.users) {
        try {
          await prisma.users.upsert({
            where: { id: user.id },
            update: {
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              points: user.points || 0,
              updatedAt: new Date()
            },
            create: {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              points: user.points || 0,
              updatedAt: new Date()
            }
          })
          results.users.success++
        } catch (error) {
          console.error('Error migrating user:', user.id, error)
          results.users.failed++
        }
      }

      // 迁移工位数据
      for (const ws of data.workstations) {
        try {
          await prisma.workstations.upsert({
            where: { id: ws.id },
            update: {
              name: ws.name,
              xPosition: ws.x,
              yPosition: ws.y
            },
            create: {
              id: ws.id,
              name: ws.name,
              xPosition: ws.x,
              yPosition: ws.y
            }
          })
          results.workstations.success++
        } catch (error) {
          console.error('Error migrating workstation:', ws.id, error)
          results.workstations.failed++
        }
      }

      // 迁移状态历史
      for (const status of data.statusHistory) {
        try {
          await prisma.status_history.create({
            data: {
              id: status.id,
              userId: status.userId,
              type: status.type,
              status: status.status,
              emoji: status.emoji,
              message: status.message,
              timestamp: new Date(status.timestamp)
            }
          })
          results.statusHistory.success++
        } catch (error) {
          console.error('Error migrating status history:', status.id, error)
          results.statusHistory.failed++
        }
      }

      // 迁移用户工位绑定
      for (const binding of data.userWorkstations) {
        try {
          await prisma.user_workstations.create({
            data: {
              userId: binding.userId,
              workstationId: binding.workstationId,
              cost: binding.cost || 0,
              boundAt: new Date(binding.boundAt || Date.now())
            }
          })
          results.userWorkstations.success++
        } catch (error) {
          console.error('Error migrating user workstation:', binding.userId, error)
          results.userWorkstations.failed++
        }
      }

    } catch (error) {
      console.error('Migration error:', error)
    }

    return results
  }

  /**
   * 执行完整迁移
   */
  static async executeMigration() {
    console.log('Starting data migration...')

    // 读取本地数据
    const localData = this.readFromLocalStorage()
    console.log('Found local data:', {
      users: localData.users.length,
      statusHistory: localData.statusHistory.length,
      workstations: localData.workstations.length,
      userWorkstations: localData.userWorkstations.length
    })

    // 迁移到数据库
    const results = await this.migrateToDatabase(localData)

    console.log('Migration completed:', results)

    // 迁移完成后，可选择是否清除本地数据
    if (results.users.success > 0 || results.statusHistory.success > 0) {
      console.log('Migration successful! Consider backing up and clearing localStorage data.')
    }

    return results
  }

  /**
   * 验证迁移结果
   */
  static async validateMigration() {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM users) as user_count,
          (SELECT COUNT(*) FROM status_history) as status_count,
          (SELECT COUNT(*) FROM workstations) as workstation_count,
          (SELECT COUNT(*) FROM user_workstations) as binding_count
      ` as any[]

      console.log('Database statistics:', stats[0])
      return stats[0]
    } catch (error) {
      console.error('Error validating migration:', error)
      return null
    }
  }
}

// 如果直接运行此文件，执行迁移
if (typeof window !== 'undefined') {
  // 在浏览器环境中提供手动迁移功能
  ; (window as any).DataMigration = DataMigration
}