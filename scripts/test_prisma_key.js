
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Keys on prisma:', Object.keys(prisma));
    if (prisma.user_postcard_collection) {
        console.log('✅ prisma.user_postcard_collection exists!');
    } else {
        console.log('❌ prisma.user_postcard_collection does NOT exist.');
        // Try camelCase just in case
        if (prisma.userPostcardCollection) {
            console.log('⚠️ But prisma.userPostcardCollection does exist!');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
