const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })
    
    console.log('Users in database:', users)
    
    if (users.length === 0) {
      console.log('No users found. Creating a test user...')
      
      const testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          points: 100,
          gold: 50
        }
      })
      
      console.log('Test user created:', testUser)
    }
    
  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()