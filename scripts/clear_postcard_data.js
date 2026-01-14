const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearPostcardData() {
    console.log('🧹 Starting cleanup of postcard data...');

    try {
        // 1. Clear Collection
        const deletedCollection = await prisma.user_postcard_collection.deleteMany({});
        console.log(`✅ Deleted ${deletedCollection.count} items from Collection.`);

        // 2. Clear Exchanges
        const deletedExchanges = await prisma.postcard_exchanges.deleteMany({});
        console.log(`✅ Deleted ${deletedExchanges.count} exchange records.`);

        // 3. Clear Notifications
        const deletedNotifications = await prisma.notifications.deleteMany({
            where: {
                type: {
                    in: [
                        'POSTCARD_EXCHANGE_REQUEST',
                        'POSTCARD_EXCHANGE_ACCEPT',
                        'POSTCARD_EXCHANGE_REJECT'
                    ]
                }
            }
        });
        console.log(`✅ Deleted ${deletedNotifications.count} related notifications.`);

        console.log('✨ Cleanup complete! You can now start fresh.');

    } catch (error) {
        console.error('❌ Error clearing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearPostcardData();
