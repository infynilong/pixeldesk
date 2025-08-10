'use client'

import { useState } from 'react'

export default function ApiTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    setTestResults([])
    
    try {
      const response = await fetch('/api/test')
      const data = await response.json()
      setTestResults(data.tests || [])
    } catch (error) {
      setTestResults([{
        name: 'Test Suite',
        status: '❌ ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      }])
    } finally {
      setLoading(false)
    }
  }

  const runIndividualTest = async (test: any) => {
    try {
      const options: RequestInit = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        }
      }
      
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(test.url, options)
      const data = await response.json()
      
      return {
        ...test,
        status: response.ok ? '✅ PASS' : '❌ FAIL',
        status_code: response.status,
        response: data
      }
    } catch (error) {
      return {
        ...test,
        status: '❌ ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API 测试工具</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={runTests}
              disabled={loading}
              className={`px-6 py-2 rounded font-medium ${
                loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? '测试中...' : '运行所有测试'}
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>
            <div className="space-y-4">
              {testResults.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{test.name}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      test.status.includes('✅') ? 'bg-green-100 text-green-800' :
                      test.status.includes('❌') ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <div><strong>URL:</strong> {test.url}</div>
                    <div><strong>Method:</strong> {test.method}</div>
                    {test.status_code && (
                      <div><strong>Status Code:</strong> {test.status_code}</div>
                    )}
                  </div>
                  
                  {test.body && (
                    <div className="bg-gray-50 p-2 rounded mb-2">
                      <div className="text-xs text-gray-500 mb-1">Request Body:</div>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(test.body, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {test.response && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-500 mb-1">Response:</div>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(test.response, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {test.error && (
                    <div className="bg-red-50 p-2 rounded">
                      <div className="text-xs text-red-500 mb-1">Error:</div>
                      <div className="text-xs">{test.error}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}