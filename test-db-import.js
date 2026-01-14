console.log('Testing prisma import...');

try {
  const { prisma } = require('./lib/db');
  console.log('Prisma imported successfully:', !!prisma);
  console.log('Prisma type:', typeof prisma);
  console.log('Has findUnique:', !!(prisma && prisma.admin));
} catch (error) {
  console.error('Import failed:', error.message);
  console.error('Stack:', error.stack);
}
