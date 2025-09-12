import { NextRequest, NextResponse } from 'next/server';
import { generateWebSocketToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('WebSocket authentication request received');
    const body = await request.json();
    const { userId, userData } = body;
    console.log('Authenticating user:', userId);

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
          retryable: false
        },
        { status: 400 }
      );
    }

    // Validate user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          retryable: false
        },
        { status: 404 }
      );
    }

    // Generate WebSocket authentication token
    const token = generateWebSocketToken(userId, userData);
    console.log('Generated WebSocket token:', token.substring(0, 50) + (token.length > 50 ? '...' : ''));
    console.log('Token length:', token.length);

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Error generating WebSocket token:', error);
    
    // Handle specific errors
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    let retryable = true;

    if (error instanceof Error) {
      if (error.message.includes('prisma') || error.message.includes('database')) {
        errorCode = 'DATABASE_ERROR';
        errorMessage = 'Database connection error';
        retryable = true;
      } else if (error.message.includes('jwt') || error.message.includes('token')) {
        errorCode = 'TOKEN_GENERATION_FAILED';
        errorMessage = 'Failed to generate authentication token';
        retryable = true;
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        code: errorCode,
        retryable
      },
      { status: statusCode }
    );
  }
}