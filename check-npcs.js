const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const npcs = await prisma.ai_npcs.findMany();
    console.log(JSON.stringify(npcs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
