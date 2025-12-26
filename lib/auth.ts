import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: string;
  email?: string;
  name?: string;
  scope?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d' // 7天，与Cookie和Session过期时间保持一致
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Generate WebSocket authentication token for user
 */
export function generateWebSocketToken(userId: string, additionalData?: Record<string, any>): string {
  return generateToken({
    userId,
    ...additionalData,
    // Add WebSocket-specific claims
    scope: 'websocket'
  });
}

/**
 * Extract user ID from token
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = verifyToken(token);
  return payload?.userId || null;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 100) {
    return { valid: false, message: 'Password is too long' };
  }
  
  return { valid: true };
}

/**
 * Validate username
 */
export function isValidUsername(username: string): { valid: boolean; message?: string } {
  if (!username || username.trim().length < 2) {
    return { valid: false, message: 'Username must be at least 2 characters long' };
  }
  
  if (username.trim().length > 50) {
    return { valid: false, message: 'Username must be less than 50 characters' };
  }
  
  // 检查是否包含无效字符
  const validUsernameRegex = /^[a-zA-Z0-9\u4e00-\u9fff_-]+$/;
  if (!validUsernameRegex.test(username.trim())) {
    return { valid: false, message: 'Username can only contain letters, numbers, Chinese characters, underscores, and hyphens' };
  }
  
  return { valid: true };
}