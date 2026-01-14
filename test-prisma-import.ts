import { prisma } from './lib/db'

console.log('Prisma imported:', Boolean(prisma))
console.log('Prisma type:', typeof prisma)

if (prisma && prisma.admins) {
  console.log('Has admin model:', !!prisma.admins)
  console.log('Has findUnique:', typeof prisma.admins.findUnique)
} else {
  console.error('Prisma admins is undefined')
}

process.exit(0)
