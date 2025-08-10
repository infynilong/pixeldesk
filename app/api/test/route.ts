import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
    
    const tests = [
      {
        name: 'Status History API',
        url: `${baseUrl}/api/status-history?userId=test-user-1`,
        method: 'GET'
      },
      {
        name: 'Create User API',
        url: `${baseUrl}/api/users`,
        method: 'POST',
        body: {
          id: 'test-user-1',
          name: 'Test User',
          email: 'test@example.com',
          points: 100,
          gold: 100
        }
      },
      {
        name: 'Get User API',
        url: `${baseUrl}/api/users?userId=test-user-1`,
        method: 'GET'
      },
      {
        name: 'Workstations API',
        url: `${baseUrl}/api/workstations`,
        method: 'GET'
      },
      {
        name: 'Create Workstation API',
        url: `${baseUrl}/api/workstations`,
        method: 'POST',
        body: {
          id: 'ws-001',
          name: 'Test Workstation',
          type: 'desk',
          x: 100,
          y: 200,
          cost: 50
        }
      }
    ]

    const results = []
    
    for (const test of tests) {
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
        
        results.push({
          name: test.name,
          status: response.ok ? '✅ PASS' : '❌ FAIL',
          url: test.url,
          status_code: response.status,
          response: data
        })
      } catch (error) {
        results.push({
          name: test.name,
          status: '❌ ERROR',
          url: test.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({ success: true, tests: results })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}