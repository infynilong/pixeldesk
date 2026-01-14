import { NextRequest } from 'next/server'
import { verifyToken } from './auth'
import prisma from './db'

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  avatar?: string
  points?: number
  emailVerified?: boolean
  inviteCode?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
}

/**
 * Verify authentication from request cookies and return user information
 */
export async function verifyAuthFromRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return { success: false, error: 'No authentication token provided' }
    }

    // Verify JWT token
    const payload = verifyToken(token)
    if (!payload?.userId) {
      return { success: false, error: 'Invalid authentication token' }
    }

    // Check if session is still active in database
    const activeSession = await prisma.user_sessions.findFirst({
      where: {
        userId: payload.userId,
        token: token,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    })

    if (!activeSession) {
      return { success: false, error: 'Session expired or invalid' }
    }

    // Get user information
    const user = await prisma.users.findUnique({
      where: {
        id: payload.userId,
        isActive: true
      }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Return user info without password
    const userData: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email!,
      avatar: user.avatar || undefined,
      points: user.points,
      emailVerified: user.emailVerified,
      inviteCode: user.inviteCode || undefined
    }

    return { success: true, user: userData }
  } catch (error) {
    console.error('Authentication verification failed:', error)
    return { success: false, error: 'Authentication verification failed' }
  }
}

/**
 * Simplified user verification for basic info retrieval (like avatar display)
 * Skips session validation to avoid connection pool timeout issues
 */
export async function getBasicUserFromRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return { success: false, error: 'No authentication token provided' }
    }

    // Verify JWT token only
    const payload = verifyToken(token)
    if (!payload?.userId) {
      return { success: false, error: 'Invalid authentication token' }
    }

    // Get user information directly without session validation
    const user = await prisma.users.findUnique({
      where: {
        id: payload.userId,
        isActive: true
      }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Return user info without password
    const userData: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email!,
      avatar: user.avatar || undefined,
      points: user.points,
      emailVerified: user.emailVerified,
      inviteCode: user.inviteCode || undefined
    }

    return { success: true, user: userData }
  } catch (error) {
    // console.error('Basic user verification failed:', error) // Removed as per instruction
    return { success: false, error: 'User verification failed' }
  }
}

/**
 * Get user information from request headers (set by middleware)
 */
export function getUserFromHeaders(request: NextRequest): { userId?: string; email?: string } {
  return {
    userId: request.headers.get('x-user-id') || undefined,
    email: request.headers.get('x-user-email') || undefined
  }
}

/**
 * Higher-order function to wrap API routes with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await verifyAuthFromRequest(request)

    if (!authResult.success || !authResult.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authResult.error || 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return handler(request, authResult.user, ...args)
  }
}

/**
 * Cleanup expired sessions for a user
 */
export async function cleanupExpiredSessions(userId: string): Promise<void> {
  try {
    await prisma.user_sessions.updateMany({
      where: {
        userId: userId,
        expiresAt: { lt: new Date() }
      },
      data: { isActive: false }
    })
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error)
  }
}

/**
 * Invalidate all sessions for a user (useful for logout all devices)
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    await prisma.user_sessions.updateMany({
      where: {
        userId: userId,
        isActive: true
      },
      data: { isActive: false }
    })
  } catch (error) {
    console.error('Failed to invalidate user sessions:', error)
  }
}