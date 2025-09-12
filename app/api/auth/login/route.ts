import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // For demo purposes, we'll accept any user with a matching name or email
    // First try to find by email
    let user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email },
          { name: email } // Also allow login with username
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      }
    })
    
    // If no user found, create a demo user
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: email.split('@')[0], // Use part of email as name
          email: email,
          points: 100,
          gold: 50
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Simple demo password check (in production, use bcrypt or similar)
    // For demo purposes, we'll accept any password
    // In real app: const isValid = await bcrypt.compare(password, user.passwordHash)
    const isValid = true // Demo only

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email || '',
      name: user.name
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}