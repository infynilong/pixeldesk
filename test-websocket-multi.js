const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Test WebSocket connection for multi-participant conversation
const testMultiParticipantConversation = async () => {
  console.log('Testing WebSocket connections for multi-participant conversation...');
  
  // Use the same JWT secret as the server (from other test files)
  const JWT_SECRET = '1645c13cd162003cc036c3bd76798574d9fdc4c71074d7ad2dfe0ff5edb53c0d710c0a1d541962fdc97842a5a64285102638763b56450a348f0ac0475466d55f';
  
  // Conversation ID with multiple participants: cmfeq2vvb0000c9xf5tx9ti4v
  const conversationId = 'cmfeq2vvb0000c9xf5tx9ti4v';
  
  // Test users: guest (1754869526878) and test 1 (1754870881518)
  const users = [
    { 
      id: '1754869526878', 
      name: 'guest', 
      token: jwt.sign({ userId: '1754869526878', scope: 'websocket' }, JWT_SECRET, { expiresIn: '1h' })
    },
    { 
      id: '1754870881518', 
      name: 'test 1', 
      token: jwt.sign({ userId: '1754870881518', scope: 'websocket' }, JWT_SECRET, { expiresIn: '1h' })
    }
  ];
  
  const connections = [];
  
  try {
    // Create WebSocket connections for both users
    for (const user of users) {
      const ws = new WebSocket(`ws://localhost:3000/api/chat/ws?token=${user.token}`);
      
      ws.on('open', () => {
        console.log(`✅ ${user.name} WebSocket connected`);
        
        // Send join room message
        const joinMessage = {
          type: 'join_room',
          conversationId: conversationId
        };
        ws.send(JSON.stringify(joinMessage));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`📨 ${user.name} received:`, message.type);
        
        if (message.type === 'room_joined') {
          console.log(`✅ ${user.name} successfully joined conversation`);
        }
        
        if (message.type === 'message_received') {
          console.log(`💬 ${user.name} received message:`, message.data.message.content);
        }
      });
      
      ws.on('error', (error) => {
        console.error(`❌ ${user.name} WebSocket error:`, error.message);
      });
      
      ws.on('close', () => {
        console.log(`🔌 ${user.name} WebSocket closed`);
      });
      
      connections.push({ ws, user });
    }
    
    // Wait for connections to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test sending a message from guest to test 1
    const guestConnection = connections.find(c => c.user.name === 'guest');
    if (guestConnection && guestConnection.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'send_message',
        conversationId: conversationId,
        content: 'Hello from guest user!',
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending test message from guest...');
      guestConnection.ws.send(JSON.stringify(message));
    }
    
    // Wait for message delivery
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🎯 Test completed! Check if messages were delivered between participants.');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Close all connections
    connections.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  }
};

testMultiParticipantConversation();