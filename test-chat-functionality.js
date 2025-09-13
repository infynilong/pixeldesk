const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key';

// Test with real user IDs
const userId1 = '1754869526878';  // guest
const userId2 = '1755013917436';  // housesig

console.log('🧪 Testing chat functionality between users:');
console.log(`👤 User 1: ${userId1}`);
console.log(`👤 User 2: ${userId2}`);

// Generate tokens for both users
const token1 = jwt.sign({ userId: userId1, scope: 'websocket' }, JWT_SECRET, { expiresIn: '1h' });
const token2 = jwt.sign({ userId: userId2, scope: 'websocket' }, JWT_SECRET, { expiresIn: '1h' });

console.log('\n📡 Connecting WebSocket clients...');

// Create WebSocket connections for both users
const ws1 = new WebSocket(`ws://localhost:3000/api/chat/ws?token=${encodeURIComponent(token1)}`);
const ws2 = new WebSocket(`ws://localhost:3000/api/chat/ws?token=${encodeURIComponent(token2)}`);

let connections = 0;
let testConversationId = null;

function checkIfBothConnected() {
  connections++;
  if (connections === 2) {
    console.log('✅ Both users connected to WebSocket');
    startTest();
  }
}

ws1.on('open', function open() {
  console.log(`🟢 User 1 (${userId1}) connected`);
  checkIfBothConnected();
});

ws2.on('open', function open() {
  console.log(`🟢 User 2 (${userId2}) connected`);
  checkIfBothConnected();
});

ws1.on('message', function message(data) {
  const msg = JSON.parse(data.toString());
  console.log(`📨 User 1 received:`, msg.type, msg.data ? JSON.stringify(msg.data, null, 2) : '');
  
  if (msg.type === 'message_received' && msg.data?.message?.senderId === userId2) {
    console.log('✅ User 1 successfully received message from User 2!');
    console.log(`📝 Message content: "${msg.data.message.content}"`);
  }
});

ws2.on('message', function message(data) {
  const msg = JSON.parse(data.toString());
  console.log(`📨 User 2 received:`, msg.type, msg.data ? JSON.stringify(msg.data, null, 2) : '');
  
  if (msg.type === 'message_received' && msg.data?.message?.senderId === userId1) {
    console.log('✅ User 2 successfully received message from User 1!');
    console.log(`📝 Message content: "${msg.data.message.content}"`);
  }
  
  if (msg.type === 'room_joined') {
    testConversationId = msg.data.conversationId;
    console.log(`🏠 User 2 joined room: ${testConversationId}`);
    
    // Send a test message from User 2 to User 1
    setTimeout(() => {
      console.log('\n💌 User 2 sending test message...');
      ws2.send(JSON.stringify({
        type: 'send_message',
        conversationId: testConversationId,
        content: 'Hello from User 2! This is a test message.',
        type: 'text'
      }));
    }, 1000);
  }
});

ws1.on('error', function error(err) {
  console.error('❌ User 1 WebSocket error:', err.message);
});

ws2.on('error', function error(err) {
  console.error('❌ User 2 WebSocket error:', err.message);
});

ws1.on('close', function close(code, reason) {
  console.log(`🔴 User 1 WebSocket closed: ${code} ${reason.toString()}`);
});

ws2.on('close', function close(code, reason) {
  console.log(`🔴 User 2 WebSocket closed: ${code} ${reason.toString()}`);
});

async function startTest() {
  console.log('\n🚀 Starting chat functionality test...');
  
  try {
    // First, create or find a conversation between the two users
    console.log('📋 Creating/finding conversation...');
    const response = await fetch(`http://localhost:3000/api/chat/conversations?userId=${userId1}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantIds: [userId2, userId1],
        type: 'direct'
      })
    });
    
    const data = await response.json();
    console.log('💬 Conversation response:', data);
    
    if (data.success) {
      testConversationId = data.data.id;
      console.log(`✅ Using conversation: ${testConversationId}`);
      
      // Join the room with both users
      console.log('🏠 Joining room...');
      ws1.send(JSON.stringify({
        type: 'join_room',
        conversationId: testConversationId
      }));
      
      ws2.send(JSON.stringify({
        type: 'join_room',
        conversationId: testConversationId
      }));
      
      // Send a test message from User 1 to User 2
      setTimeout(() => {
        console.log('\n💌 User 1 sending test message...');
        ws1.send(JSON.stringify({
          type: 'send_message',
          conversationId: testConversationId,
          content: 'Hello from User 1! This is a test message.',
          type: 'text'
        }));
      }, 2000);
      
    } else {
      console.error('❌ Failed to create conversation:', data);
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Clean up after 10 seconds
setTimeout(() => {
  console.log('\n🧹 Cleaning up test...');
  ws1.close();
  ws2.close();
  process.exit(0);
}, 10000);