const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConversationParticipants() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        participants: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    console.log('Conversation participants:');
    conversations.forEach(conv => {
      console.log(`Conversation ${conv.id} (${conv.type}):`);
      conv.participants.forEach(p => {
        console.log(`  - ${p.user.name} (${p.userId})`);
      });
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConversationParticipants();