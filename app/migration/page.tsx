'use client'

import { useState, useEffect } from 'react'
import { DataMigration } from '@/lib/dataMigration'
import { databaseStatusHistoryManager } from '@/lib/databaseStatusHistory'

export default function DataMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [migrationResults, setMigrationResults] = useState<any>(null)
  const [localData, setLocalData] = useState<any>(null)
  const [dbStats, setDbStats] = useState<any>(null)

  // 检查本地数据
  const checkLocalData = () => {
    if (typeof window !== 'undefined') {
      const data = DataMigration.readFromLocalStorage()
      setLocalData(data)
    }
  }

  // 检查数据库统计
  const checkDatabaseStats = async () => {
    try {
      const stats = await DataMigration.validateMigration()
      setDbStats(stats)
    } catch (error) {
      console.error('Error checking database stats:', error)
    }
  }

  // 执行迁移
  const executeMigration = async () => {
    if (migrationStatus === 'running') return

    setMigrationStatus('running')
    try {
      const results = await DataMigration.executeMigration()
      setMigrationResults(results)
      setMigrationStatus('completed')
      
      // 重新检查数据库统计
      await checkDatabaseStats()
    } catch (error) {
      console.error('Migration failed:', error)
      setMigrationStatus('error')
    }
  }

  // 清除本地数据
  const clearLocalData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pixelDeskUser')
      localStorage.removeItem('pixelDesk_statusHistory')
      localStorage.removeItem('pixelDesk_workstations')
      localStorage.removeItem('pixelDesk_userWorkstations')
      
      // 重新检查本地数据
      checkLocalData()
    }
  }

  useEffect(() => {
    checkLocalData()
    checkDatabaseStats()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">数据迁移工具</h1>
        
        {/* 本地数据状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">本地数据状态</h2>
          {localData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{localData.users.length}</div>
                <div className="text-sm text-gray-600">用户</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{localData.statusHistory.length}</div>
                <div className="text-sm text-gray-600">状态历史</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-2xl font-bold text-purple-600">{localData.workstations.length}</div>
                <div className="text-sm text-gray-600">工位</div>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <div className="text-2xl font-bold text-orange-600">{localData.userWorkstations.length}</div>
                <div className="text-sm text-gray-600">工位绑定</div>
              </div>
            </div>
          )}
        </div>

        {/* 数据库状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">数据库状态</h2>
          {dbStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{dbStats.user_count}</div>
                <div className="text-sm text-gray-600">用户</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{dbStats.status_count}</div>
                <div className="text-sm text-gray-600">状态历史</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-2xl font-bold text-purple-600">{dbStats.workstation_count}</div>
                <div className="text-sm text-gray-600">工位</div>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <div className="text-2xl font-bold text-orange-600">{dbStats.binding_count}</div>
                <div className="text-sm text-gray-600">工位绑定</div>
              </div>
            </div>
          )}
        </div>

        {/* 迁移控制 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">迁移控制</h2>
          <div className="flex gap-4">
            <button
              onClick={executeMigration}
              disabled={migrationStatus === 'running'}
              className={`px-6 py-2 rounded font-medium ${
                migrationStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {migrationStatus === 'running' ? '迁移中...' : '开始迁移'}
            </button>
            
            <button
              onClick={clearLocalData}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
            >
              清除本地数据
            </button>
            
            <button
              onClick={() => {
                checkLocalData()
                checkDatabaseStats()
              }}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
            >
              刷新状态
            </button>
          </div>
        </div>

        {/* 迁移结果 */}
        {migrationResults && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">迁移结果</h2>
            <div className="space-y-4">
              {Object.entries(migrationResults).map(([type, result]: [string, any]) => (
                <div key={type} className="border rounded p-4">
                  <h3 className="font-medium capitalize mb-2">{type}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-green-600">成功: {result.success}</div>
                    <div className="text-red-600">失败: {result.failed}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 状态指示器 */}
        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${
            migrationStatus === 'idle' ? 'bg-gray-100 text-gray-800' :
            migrationStatus === 'running' ? 'bg-blue-100 text-blue-800' :
            migrationStatus === 'completed' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              migrationStatus === 'idle' ? 'bg-gray-400' :
              migrationStatus === 'running' ? 'bg-blue-400 animate-pulse' :
              migrationStatus === 'completed' ? 'bg-green-400' :
              'bg-red-400'
            }`}></div>
            {migrationStatus === 'idle' ? '就绪' :
             migrationStatus === 'running' ? '迁移中...' :
             migrationStatus === 'completed' ? '迁移完成' :
             '迁移失败'}
          </div>
        </div>
      </div>
    </div>
  )
}